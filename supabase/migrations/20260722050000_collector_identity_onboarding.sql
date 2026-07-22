-- Collector identity onboarding: signup username/display meta, Twitch username lock.

alter table public.profiles
  add column if not exists username_locked boolean not null default false;

alter table public.profiles
  add column if not exists username_source text not null default 'user';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_username_source_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_username_source_check
      check (username_source in ('user', 'twitch', 'system'));
  end if;
end $$;

-- Prefer signup metadata; otherwise stub collector_* with system source.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  meta_username text;
  meta_display text;
  final_username text;
  final_display text;
  final_source text;
  final_onboarding boolean;
begin
  meta_username := nullif(lower(trim(coalesce(new.raw_user_meta_data->>'username', ''))), '');
  meta_display := nullif(trim(coalesce(new.raw_user_meta_data->>'display_name', '')), '');

  if meta_username is not null
     and meta_username ~ '^[a-z0-9_]{3,24}$'
     and not exists (
       select 1 from public.reserved_usernames where username = meta_username
     )
     and not exists (
       select 1 from public.profiles where lower(username) = meta_username
     )
  then
    final_username := meta_username;
    final_source := 'user';
  else
    final_username := 'collector_' || substr(replace(new.id::text, '-', ''), 1, 10);
    final_source := 'system';
  end if;

  if meta_display is not null
     and char_length(meta_display) between 1 and 40
  then
    final_display := meta_display;
  else
    final_display := 'New Collector';
  end if;

  final_onboarding :=
    final_source = 'user'
    and meta_display is not null
    and char_length(meta_display) between 1 and 40;

  insert into public.profiles (
    id,
    username,
    display_name,
    username_source,
    username_locked,
    onboarding_complete
  )
  values (
    new.id,
    final_username,
    final_display,
    final_source,
    false,
    final_onboarding
  );

  return new;
end;
$function$;

-- Refuse username changes when locked; keep other fields editable.
create or replace function public.update_collector_profile(
  requested_username text,
  requested_display_name text,
  requested_bio text,
  requested_visibility text,
  requested_show_collection_stats boolean,
  requested_show_favorites boolean,
  requested_show_featured_cards boolean
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  current_user_id uuid;
  normalized_username text;
  normalized_display_name text;
  normalized_bio text;
  current_username text;
  current_locked boolean;
  current_source text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be signed in to update your profile.';
  end if;

  select
    username,
    username_locked,
    username_source
  into
    current_username,
    current_locked,
    current_source
  from public.profiles
  where id = current_user_id
  for update;

  if current_username is null then
    raise exception 'Collector profile was not found.';
  end if;

  if coalesce(current_locked, false) then
    normalized_username := lower(trim(current_username));
  else
    normalized_username := lower(trim(requested_username));

    if normalized_username !~ '^[a-z0-9_]{3,24}$' then
      raise exception
        'Username must be 3–24 characters using lowercase letters, numbers, or underscores.';
    end if;

    if exists (
      select 1
      from public.reserved_usernames
      where username = normalized_username
    ) then
      raise exception 'That username is reserved.';
    end if;

    if exists (
      select 1
      from public.profiles
      where lower(username) = normalized_username
        and id <> current_user_id
    ) then
      raise exception 'That username is already taken.';
    end if;
  end if;

  normalized_display_name := nullif(trim(requested_display_name), '');
  normalized_bio := nullif(trim(requested_bio), '');

  if normalized_display_name is null
     or char_length(normalized_display_name) > 40 then
    raise exception 'Display name must be between 1 and 40 characters.';
  end if;

  if normalized_bio is not null
     and char_length(normalized_bio) > 240 then
    raise exception 'Bio must be 240 characters or fewer.';
  end if;

  if requested_visibility not in ('public', 'unlisted', 'private') then
    raise exception 'Invalid profile visibility.';
  end if;

  update public.profiles
  set
    username = normalized_username,
    display_name = normalized_display_name,
    bio = normalized_bio,
    profile_visibility = requested_visibility,
    show_collection_stats = coalesce(requested_show_collection_stats, true),
    show_favorites = coalesce(requested_show_favorites, true),
    show_featured_cards = coalesce(requested_show_featured_cards, true),
    onboarding_complete = true,
    username_source = case
      when coalesce(current_locked, false) then current_source
      when username_source = 'system' then 'user'
      else username_source
    end,
    updated_at = now()
  where id = current_user_id;

  return jsonb_build_object(
    'success', true,
    'username', normalized_username,
    'displayName', normalized_display_name,
    'bio', normalized_bio,
    'visibility', requested_visibility,
    'usernameLocked', coalesce(current_locked, false),
    'usernameSource', case
      when coalesce(current_locked, false) then current_source
      when current_source = 'system' then 'user'
      else current_source
    end
  );
end;
$function$;

create or replace function public.claim_twitch_collector_identity()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  current_user_id uuid;
  identity_row auth.identities%rowtype;
  raw_login text;
  raw_display text;
  raw_avatar text;
  base_username text;
  candidate text;
  suffix integer;
  suffix_text text;
  profile_row public.profiles%rowtype;
  should_claim boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be signed in to claim a Twitch collector identity.';
  end if;

  select *
  into identity_row
  from auth.identities
  where user_id = current_user_id
    and provider = 'twitch'
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1;

  if not found then
    raise exception 'No Twitch identity is linked to this account.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_user_id
  for update;

  if profile_row.id is null then
    raise exception 'Collector profile was not found.';
  end if;

  raw_login := coalesce(
    nullif(trim(identity_row.identity_data->>'preferred_username'), ''),
    nullif(trim(identity_row.identity_data->>'login'), ''),
    nullif(trim(identity_row.identity_data->>'user_name'), ''),
    nullif(trim(identity_row.identity_data->>'nickname'), ''),
    nullif(trim(identity_row.identity_data->>'name'), '')
  );

  raw_display := coalesce(
    nullif(trim(identity_row.identity_data->>'display_name'), ''),
    nullif(trim(identity_row.identity_data->>'full_name'), ''),
    nullif(trim(identity_row.identity_data->>'name'), ''),
    raw_login
  );

  raw_avatar := coalesce(
    nullif(trim(identity_row.identity_data->>'avatar_url'), ''),
    nullif(trim(identity_row.identity_data->>'picture'), '')
  );

  if profile_row.username_locked
     and profile_row.username_source = 'twitch'
  then
    return jsonb_build_object(
      'success', true,
      'noop', true,
      'username', profile_row.username,
      'displayName', profile_row.display_name,
      'onboardingComplete', profile_row.onboarding_complete,
      'usernameLocked', true,
      'usernameSource', 'twitch',
      'twitchLinked', true,
      'twitchLogin', raw_login,
      'twitchDisplayName', raw_display,
      'twitchAvatarUrl', raw_avatar
    );
  end if;

  should_claim :=
    coalesce(profile_row.onboarding_complete, false) = false
    or profile_row.username ~* '^collector_'
    or coalesce(profile_row.username_source, 'system') = 'system';

  -- Custom unlocked username with completed onboarding stays as-is.
  if not should_claim then
    return jsonb_build_object(
      'success', true,
      'noop', true,
      'username', profile_row.username,
      'displayName', profile_row.display_name,
      'onboardingComplete', profile_row.onboarding_complete,
      'usernameLocked', coalesce(profile_row.username_locked, false),
      'usernameSource', profile_row.username_source,
      'twitchLinked', true,
      'twitchLogin', raw_login,
      'twitchDisplayName', raw_display,
      'twitchAvatarUrl', raw_avatar
    );
  end if;

  base_username := lower(coalesce(raw_login, ''));
  base_username := regexp_replace(base_username, '[^a-z0-9_]', '_', 'g');
  base_username := regexp_replace(base_username, '_+', '_', 'g');
  base_username := trim(both '_' from base_username);

  if char_length(base_username) > 24 then
    base_username := left(base_username, 24);
    base_username := rtrim(base_username, '_');
  end if;

  if char_length(base_username) < 3 then
    base_username := left(regexp_replace(coalesce(base_username, '') || 'twitch', '[^a-z0-9_]', '', 'g'), 24);
  end if;

  if char_length(base_username) < 3 then
    base_username := 'twitch';
  end if;

  candidate := base_username;
  suffix := 0;

  while exists (
    select 1 from public.reserved_usernames where username = candidate
  )
  or exists (
    select 1
    from public.profiles
    where lower(username) = candidate
      and id <> current_user_id
  )
  loop
    suffix := suffix + 1;
    suffix_text := suffix::text;
    candidate := left(base_username, greatest(3, 24 - char_length(suffix_text))) || suffix_text;
  end loop;

  update public.profiles
  set
    username = candidate,
    display_name = case
      when display_name is null
        or nullif(trim(display_name), '') is null
        or trim(display_name) = 'New Collector'
      then left(coalesce(nullif(trim(raw_display), ''), candidate), 40)
      else display_name
    end,
    username_locked = true,
    username_source = 'twitch',
    onboarding_complete = true,
    updated_at = now()
  where id = current_user_id
  returning * into profile_row;

  return jsonb_build_object(
    'success', true,
    'noop', false,
    'username', profile_row.username,
    'displayName', profile_row.display_name,
    'onboardingComplete', profile_row.onboarding_complete,
    'usernameLocked', profile_row.username_locked,
    'usernameSource', profile_row.username_source,
    'twitchLinked', true,
    'twitchLogin', raw_login,
    'twitchDisplayName', raw_display,
    'twitchAvatarUrl', raw_avatar
  );
end;
$function$;

create or replace function public.get_my_collector_identity()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  current_user_id uuid;
  profile_row public.profiles%rowtype;
  has_identity boolean := false;
  has_connection boolean := false;
  twitch_login text;
  twitch_display text;
  twitch_avatar text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'You must be signed in to load collector identity.';
  end if;

  select *
  into profile_row
  from public.profiles
  where id = current_user_id;

  if profile_row.id is null then
    raise exception 'Collector profile was not found.';
  end if;

  select exists (
    select 1
    from auth.identities i
    where i.user_id = current_user_id
      and i.provider = 'twitch'
  )
  into has_identity;

  select exists (
    select 1
    from public.twitch_connections c
    where c.user_id = current_user_id
  )
  into has_connection;

  if has_connection then
    select
      c.twitch_login,
      c.twitch_display_name,
      c.twitch_avatar_url
    into
      twitch_login,
      twitch_display,
      twitch_avatar
    from public.twitch_connections c
    where c.user_id = current_user_id;
  elsif has_identity then
    select
      coalesce(
        nullif(trim(i.identity_data->>'preferred_username'), ''),
        nullif(trim(i.identity_data->>'login'), ''),
        nullif(trim(i.identity_data->>'user_name'), '')
      ),
      coalesce(
        nullif(trim(i.identity_data->>'display_name'), ''),
        nullif(trim(i.identity_data->>'full_name'), ''),
        nullif(trim(i.identity_data->>'name'), '')
      ),
      coalesce(
        nullif(trim(i.identity_data->>'avatar_url'), ''),
        nullif(trim(i.identity_data->>'picture'), '')
      )
    into
      twitch_login,
      twitch_display,
      twitch_avatar
    from auth.identities i
    where i.user_id = current_user_id
      and i.provider = 'twitch'
    order by i.updated_at desc nulls last, i.created_at desc nulls last
    limit 1;
  end if;

  return jsonb_build_object(
    'username', profile_row.username,
    'displayName', profile_row.display_name,
    'onboardingComplete', profile_row.onboarding_complete,
    'usernameLocked', coalesce(profile_row.username_locked, false),
    'usernameSource', profile_row.username_source,
    'twitchLinked', has_identity or has_connection,
    'twitchLogin', twitch_login,
    'twitchDisplayName', twitch_display,
    'twitchAvatarUrl', twitch_avatar
  );
end;
$function$;

revoke all on function public.claim_twitch_collector_identity() from public, anon;
revoke all on function public.get_my_collector_identity() from public, anon;

grant execute on function public.claim_twitch_collector_identity() to authenticated, service_role;
grant execute on function public.get_my_collector_identity() to authenticated, service_role;

grant execute on function public.update_collector_profile(
  text, text, text, text, boolean, boolean, boolean
) to authenticated, service_role;
