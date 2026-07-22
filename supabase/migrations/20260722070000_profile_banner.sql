-- Profile banner support for collector profiles.

alter table public.profiles
  add column if not exists banner_url text;

comment on column public.profiles.banner_url is
  'Public profile header banner image URL (WebP preferred).';

create or replace function public.get_my_profile_extras()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  perform public.sync_my_achievements();

  return jsonb_build_object(
    'avatarUrl', (select avatar_url from public.profiles where id::text = uid::text),
    'bannerUrl', (select banner_url from public.profiles where id::text = uid::text),
    'selectedTitleId', (select selected_title_id from public.profiles where id::text = uid::text),
    'titles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'description', t.description
        )
        order by t.sort_order
      )
      from public.user_titles ut
      join public.collector_titles t on t.id = ut.title_id
      where ut.user_id = uid
        and t.is_active = true
    ), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'description', a.description,
          'icon', a.icon,
          'unlockedAt', ua.unlocked_at
        )
        order by a.sort_order
      )
      from public.user_achievements ua
      join public.achievement_definitions a on a.id = ua.achievement_id
      where ua.user_id = uid
        and a.is_active = true
    ), '[]'::jsonb)
  );
end;
$function$;

drop function if exists public.set_my_profile_extras(text, text);

create or replace function public.set_my_profile_extras(
  requested_avatar_url text default null,
  requested_title_id text default null,
  requested_banner_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  if requested_title_id is not null and not exists (
    select 1
    from public.user_titles
    where user_id = uid
      and title_id = requested_title_id
  ) then
    raise exception 'That collector title is not unlocked.';
  end if;

  update public.profiles
  set
    avatar_url = case
      when requested_avatar_url is null then avatar_url
      else nullif(trim(requested_avatar_url), '')
    end,
    banner_url = case
      when requested_banner_url is null then banner_url
      else nullif(trim(requested_banner_url), '')
    end,
    selected_title_id = case
      when requested_title_id is null then selected_title_id
      else nullif(trim(requested_title_id), '')
    end,
    updated_at = now()
  where id::text = uid::text;

  return jsonb_build_object('success', true);
end;
$function$;

create or replace function public.get_public_profile_extras(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_profile_id text;
  target_user_id uuid;
begin
  select id::text
  into target_profile_id
  from public.profiles
  where lower(username) = lower(trim(requested_username))
    and onboarding_complete = true
    and profile_visibility in ('public', 'unlisted')
  limit 1;

  if target_profile_id is null then
    return jsonb_build_object('found', false);
  end if;

  begin
    target_user_id := target_profile_id::uuid;
  exception
    when invalid_text_representation then
      return jsonb_build_object('found', false);
  end;

  return jsonb_build_object(
    'found', true,
    'avatarUrl', (
      select avatar_url
      from public.profiles
      where id::text = target_profile_id
    ),
    'bannerUrl', (
      select banner_url
      from public.profiles
      where id::text = target_profile_id
    ),
    'title', (
      select jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description
      )
      from public.profiles p
      join public.collector_titles t
        on t.id::text = p.selected_title_id::text
      where p.id::text = target_profile_id
    ),
    'achievements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'description', a.description,
          'icon', a.icon,
          'unlockedAt', ua.unlocked_at
        )
        order by a.sort_order
      )
      from public.user_achievements ua
      join public.achievement_definitions a
        on a.id = ua.achievement_id
      where ua.user_id = target_user_id
        and a.is_active = true
    ), '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.get_my_profile_extras() from public, anon;
revoke all on function public.set_my_profile_extras(text, text, text) from public, anon;
revoke all on function public.get_public_profile_extras(text) from public;

grant execute on function public.get_my_profile_extras() to authenticated, service_role;
grant execute on function public.set_my_profile_extras(text, text, text) to authenticated, service_role;
grant execute on function public.get_public_profile_extras(text) to anon, authenticated, service_role;
