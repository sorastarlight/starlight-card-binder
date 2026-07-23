-- Unlockable CSS profile avatar frames (quests + season pass), equip via profile extras.

create table if not exists public.collector_avatar_frames (
  id text primary key,
  name text not null,
  description text,
  css_preset text not null,
  effect text not null default 'static',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  overlay_image_url text,
  created_at timestamptz not null default now(),
  constraint collector_avatar_frames_preset_check
    check (css_preset ~ '^[a-z][a-z0-9_-]{0,31}$'),
  constraint collector_avatar_frames_effect_check
    check (effect in ('static', 'shimmer', 'pulse', 'glitter'))
);

comment on table public.collector_avatar_frames is
  'Catalog of CSS-preset profile avatar frames. overlay_image_url reserved for later uploads.';

create table if not exists public.user_avatar_frames (
  user_id uuid not null references auth.users(id) on delete cascade,
  frame_id text not null references public.collector_avatar_frames(id) on delete cascade,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, frame_id)
);

alter table public.profiles
  add column if not exists selected_frame_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_selected_frame_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_selected_frame_id_fkey
      foreign key (selected_frame_id)
      references public.collector_avatar_frames(id)
      on delete set null;
  end if;
end $$;

alter table public.collection_quests
  add column if not exists reward_frame_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'collection_quests_reward_frame_id_fkey'
  ) then
    alter table public.collection_quests
      add constraint collection_quests_reward_frame_id_fkey
      foreign key (reward_frame_id)
      references public.collector_avatar_frames(id)
      on delete set null;
  end if;
end $$;

alter table public.season_reward_tiers
  add column if not exists reward_frame_id text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'season_reward_tiers_reward_frame_id_fkey'
  ) then
    alter table public.season_reward_tiers
      add constraint season_reward_tiers_reward_frame_id_fkey
      foreign key (reward_frame_id)
      references public.collector_avatar_frames(id)
      on delete set null;
  end if;
end $$;

alter table public.collector_avatar_frames enable row level security;
alter table public.user_avatar_frames enable row level security;

drop policy if exists collector_avatar_frames_public_read on public.collector_avatar_frames;
create policy collector_avatar_frames_public_read
  on public.collector_avatar_frames
  for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists user_avatar_frames_owner_read on public.user_avatar_frames;
create policy user_avatar_frames_owner_read
  on public.user_avatar_frames
  for select
  to authenticated
  using (user_id = auth.uid());

grant select on table public.collector_avatar_frames to anon, authenticated, service_role;
grant select on table public.user_avatar_frames to authenticated, service_role;
grant all on table public.collector_avatar_frames to service_role;
grant all on table public.user_avatar_frames to service_role;

insert into public.collector_avatar_frames (
  id, name, description, css_preset, effect, sort_order, is_active
) values
  ('frame_sky', 'Sky Ring', 'A soft blue ring for everyday collectors.', 'sky', 'static', 10, true),
  ('frame_rose', 'Rose Ring', 'Warm pink glow around your avatar.', 'rose', 'static', 20, true),
  ('frame_gold', 'Gold Ring', 'Classic golden collector frame.', 'gold', 'static', 30, true),
  ('frame_violet', 'Violet Ring', 'Soft purple aura.', 'violet', 'static', 40, true),
  ('frame_emerald', 'Emerald Ring', 'Fresh green collector frame.', 'emerald', 'static', 50, true),
  ('frame_crimson', 'Crimson Ring', 'Bold red border energy.', 'crimson', 'static', 60, true),
  ('frame_midnight', 'Midnight Ring', 'Deep indigo night rim.', 'midnight', 'static', 70, true),
  ('frame_rainbow', 'Rainbow Arc', 'Animated rainbow border.', 'rainbow', 'shimmer', 80, true),
  ('frame_aurora', 'Aurora Drift', 'Northern-light gradient pulse.', 'aurora', 'pulse', 90, true),
  ('frame_holofoil', 'Holofoil', 'Iridescent foil shimmer.', 'holofoil', 'shimmer', 100, true),
  ('frame_glitter', 'Starlight Glitter', 'Sparkle dust around the rim.', 'glitter', 'glitter', 110, true),
  ('frame_prism', 'Prism Gate', 'Multi-hue prismatic border.', 'prism', 'shimmer', 120, true),
  ('frame_celestial', 'Celestial Halo', 'Soft celestial glow.', 'celestial', 'pulse', 130, true),
  ('frame_gradient_sunset', 'Sunset Gradient', 'Pink-to-gold sunset fade.', 'sunset', 'static', 140, true),
  ('frame_gradient_ocean', 'Ocean Gradient', 'Blue-to-teal ocean fade.', 'ocean', 'static', 150, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  css_preset = excluded.css_preset,
  effect = excluded.effect,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

update public.collection_quests
set reward_frame_id = 'frame_rose'
where id = 'favorite_twenty'
  and reward_frame_id is null;

update public.collection_quests
set reward_frame_id = 'frame_gold'
where id = 'own_one_epic'
  and reward_frame_id is null;

update public.season_reward_tiers
set reward_frame_id = 'frame_holofoil'
where id in (
  select id from public.season_reward_tiers
  where season_id = 'season_2026_starlight_dawn'
  order by tier_index
  limit 1
)
and reward_frame_id is null;

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
    'selectedFrameId', (select selected_frame_id from public.profiles where id::text = uid::text),
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
    'frames', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'description', f.description,
          'cssPreset', f.css_preset,
          'effect', f.effect,
          'overlayImageUrl', f.overlay_image_url
        )
        order by f.sort_order, f.id
      )
      from public.user_avatar_frames uf
      join public.collector_avatar_frames f on f.id = uf.frame_id
      where uf.user_id = uid
        and f.is_active = true
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

drop function if exists public.set_my_profile_extras(text, text, text);

create or replace function public.set_my_profile_extras(
  requested_avatar_url text default null,
  requested_title_id text default null,
  requested_banner_url text default null,
  requested_frame_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  next_frame text;
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  if nullif(trim(requested_title_id), '') is not null and not exists (
    select 1
    from public.user_titles
    where user_id = uid
      and title_id = requested_title_id
  ) then
    raise exception 'That collector title is not unlocked.';
  end if;

  if requested_frame_id is not null then
    next_frame := nullif(trim(requested_frame_id), '');
    if next_frame is not null and not exists (
      select 1
      from public.user_avatar_frames uf
      join public.collector_avatar_frames f on f.id = uf.frame_id
      where uf.user_id = uid
        and uf.frame_id = next_frame
        and f.is_active = true
    ) then
      raise exception 'That avatar frame is not unlocked.';
    end if;
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
    selected_frame_id = case
      when requested_frame_id is null then selected_frame_id
      else next_frame
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
    'frame', (
      select jsonb_build_object(
        'id', f.id,
        'name', f.name,
        'cssPreset', f.css_preset,
        'effect', f.effect,
        'overlayImageUrl', f.overlay_image_url
      )
      from public.profiles p
      join public.collector_avatar_frames f
        on f.id = p.selected_frame_id
      where p.id::text = target_profile_id
        and f.is_active = true
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

create or replace function public.get_my_collection_quests()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result jsonb;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  perform public.sync_my_collection_quests();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', q.id,
      'title', q.title,
      'description', q.description,
      'icon', q.icon,
      'requirementType', q.requirement_type,
      'requirementTarget', q.requirement_target,
      'requirementCount', q.requirement_count,
      'progress', coalesce(p.progress, 0),
      'completed', coalesce(p.progress, 0) >= q.requirement_count,
      'claimed', p.claimed_at is not null,
      'completedAt', p.completed_at,
      'claimedAt', p.claimed_at,
      'rewardStarBits', q.reward_star_bits,
      'rewardTitleId', q.reward_title_id,
      'rewardTitleName', t.name,
      'rewardFrameId', q.reward_frame_id,
      'rewardFrameName', f.name,
      'sortOrder', q.sort_order
    )
    order by q.sort_order, q.id
  ), '[]'::jsonb)
  into result
  from public.collection_quests q
  left join public.user_quest_progress p
    on p.quest_id = q.id and p.user_id = uid
  left join public.collector_titles t
    on t.id = q.reward_title_id
  left join public.collector_avatar_frames f
    on f.id = q.reward_frame_id
  where q.is_active = true;

  return jsonb_build_object('quests', result);
end;
$$;

create or replace function public.claim_collection_quest(requested_quest_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  quest public.collection_quests%rowtype;
  progress_row public.user_quest_progress%rowtype;
  current_progress integer;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  select * into quest
  from public.collection_quests
  where id = requested_quest_id and is_active = true;

  if not found then
    raise exception 'That quest was not found.';
  end if;

  current_progress := public.evaluate_collection_quest_progress(uid, quest);

  insert into public.user_quest_progress as uqp (
    user_id, quest_id, progress, completed_at, updated_at
  ) values (
    uid,
    quest.id,
    least(current_progress, quest.requirement_count),
    case when current_progress >= quest.requirement_count then now() else null end,
    now()
  )
  on conflict (user_id, quest_id) do update set
    progress = least(excluded.progress, quest.requirement_count),
    completed_at = case
      when uqp.claimed_at is not null then uqp.claimed_at
      when excluded.progress >= quest.requirement_count then coalesce(uqp.completed_at, now())
      else null
    end,
    updated_at = now()
  returning * into progress_row;

  if progress_row.progress < quest.requirement_count then
    raise exception 'This quest is not complete yet.';
  end if;

  if progress_row.claimed_at is not null then
    raise exception 'You already claimed this quest reward.';
  end if;

  if quest.reward_star_bits > 0 then
    perform public.credit_star_bits_reward(
      uid,
      quest.reward_star_bits,
      'Collection quest reward: ' || quest.title,
      jsonb_build_object('questId', quest.id)
    );
  end if;

  if quest.reward_title_id is not null then
    insert into public.user_titles(user_id, title_id, unlocked_at)
    values (uid, quest.reward_title_id, now())
    on conflict (user_id, title_id) do nothing;
  end if;

  if quest.reward_frame_id is not null then
    insert into public.user_avatar_frames(user_id, frame_id, unlocked_at)
    values (uid, quest.reward_frame_id, now())
    on conflict (user_id, frame_id) do nothing;
  end if;

  update public.user_quest_progress
  set claimed_at = now(),
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where user_id = uid and quest_id = quest.id;

  return jsonb_build_object(
    'success', true,
    'questId', quest.id,
    'rewardStarBits', quest.reward_star_bits,
    'rewardTitleId', quest.reward_title_id,
    'rewardFrameId', quest.reward_frame_id
  );
end;
$$;

create or replace function public.get_my_season_pass()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  season public.season_definitions%rowtype;
  score jsonb;
  points integer;
  tiers jsonb;
  twitch_linked boolean := false;
  conn public.twitch_connections%rowtype;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  select * into season
  from public.season_definitions
  where is_active = true
  order by starts_at desc
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  select * into conn from public.twitch_connections where user_id = uid;
  twitch_linked := found;

  if not public.user_has_season_pass_access(uid, season.id) then
    return jsonb_build_object(
      'found', true,
      'hasAccess', false,
      'accessRequired', season.audience,
      'twitchLinked', twitch_linked,
      'twitchLogin', conn.twitch_login,
      'season', jsonb_build_object(
        'id', season.id,
        'name', season.name,
        'description', season.description,
        'startsAt', season.starts_at,
        'endsAt', season.ends_at,
        'isActive', season.is_active and now() between season.starts_at and season.ends_at,
        'audience', season.audience
      ),
      'points', 0,
      'breakdown', '{}'::jsonb,
      'tiers', '[]'::jsonb
    );
  end if;

  score := public.compute_season_points(uid, season.id);
  points := coalesce((score->>'points')::integer, 0);

  insert into public.user_season_progress(user_id, season_id, points, breakdown, updated_at)
  values (uid, season.id, points, coalesce(score->'breakdown', '{}'::jsonb), now())
  on conflict (user_id, season_id) do update set
    points = excluded.points,
    breakdown = excluded.breakdown,
    updated_at = now();

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'tierIndex', t.tier_index,
      'pointsRequired', t.points_required,
      'label', t.label,
      'rewardStarBits', t.reward_star_bits,
      'rewardTitleId', t.reward_title_id,
      'rewardTitleName', ct.name,
      'rewardFrameId', t.reward_frame_id,
      'rewardFrameName', af.name,
      'unlocked', points >= t.points_required,
      'claimed', c.claimed_at is not null,
      'claimedAt', c.claimed_at
    )
    order by t.tier_index
  ), '[]'::jsonb)
  into tiers
  from public.season_reward_tiers t
  left join public.user_season_tier_claims c
    on c.tier_id = t.id and c.user_id = uid
  left join public.collector_titles ct
    on ct.id = t.reward_title_id
  left join public.collector_avatar_frames af
    on af.id = t.reward_frame_id
  where t.season_id = season.id;

  return jsonb_build_object(
    'found', true,
    'hasAccess', true,
    'accessRequired', season.audience,
    'twitchLinked', twitch_linked,
    'twitchLogin', conn.twitch_login,
    'season', jsonb_build_object(
      'id', season.id,
      'name', season.name,
      'description', season.description,
      'startsAt', season.starts_at,
      'endsAt', season.ends_at,
      'isActive', season.is_active and now() between season.starts_at and season.ends_at,
      'audience', season.audience
    ),
    'points', points,
    'breakdown', score->'breakdown',
    'tiers', tiers
  );
end;
$$;

create or replace function public.claim_season_pass_tier(requested_tier_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tier public.season_reward_tiers%rowtype;
  score jsonb;
  points integer;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  select * into tier from public.season_reward_tiers where id = requested_tier_id;
  if not found then
    raise exception 'That season reward was not found.';
  end if;

  if not public.user_has_season_pass_access(uid, tier.season_id) then
    raise exception 'Twitch subscriber access is required to claim Season Pass rewards.';
  end if;

  score := public.compute_season_points(uid, tier.season_id);
  points := coalesce((score->>'points')::integer, 0);

  if points < tier.points_required then
    raise exception 'You need more season points to claim this reward.';
  end if;

  if exists (
    select 1 from public.user_season_tier_claims
    where user_id = uid and tier_id = tier.id
  ) then
    raise exception 'You already claimed this season reward.';
  end if;

  if tier.reward_star_bits > 0 then
    perform public.credit_star_bits_reward(
      uid,
      tier.reward_star_bits,
      'Season pass reward: ' || tier.label,
      jsonb_build_object('seasonId', tier.season_id, 'tierId', tier.id)
    );
  end if;

  if tier.reward_title_id is not null then
    insert into public.user_titles(user_id, title_id, unlocked_at)
    values (uid, tier.reward_title_id, now())
    on conflict (user_id, title_id) do nothing;
  end if;

  if tier.reward_frame_id is not null then
    insert into public.user_avatar_frames(user_id, frame_id, unlocked_at)
    values (uid, tier.reward_frame_id, now())
    on conflict (user_id, frame_id) do nothing;
  end if;

  insert into public.user_season_tier_claims(user_id, season_id, tier_id, claimed_at)
  values (uid, tier.season_id, tier.id, now());

  insert into public.user_season_progress(user_id, season_id, points, breakdown, updated_at)
  values (uid, tier.season_id, points, coalesce(score->'breakdown', '{}'::jsonb), now())
  on conflict (user_id, season_id) do update set
    points = excluded.points,
    breakdown = excluded.breakdown,
    updated_at = now();

  return jsonb_build_object(
    'success', true,
    'tierId', tier.id,
    'rewardStarBits', tier.reward_star_bits,
    'rewardTitleId', tier.reward_title_id,
    'rewardFrameId', tier.reward_frame_id
  );
end;
$$;

create or replace function public.admin_list_avatar_frames()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  return jsonb_build_object(
    'frames', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'description', f.description,
          'cssPreset', f.css_preset,
          'effect', f.effect,
          'sortOrder', f.sort_order,
          'isActive', f.is_active,
          'overlayImageUrl', f.overlay_image_url
        )
        order by f.sort_order, f.id
      )
      from public.collector_avatar_frames f
    ), '[]'::jsonb),
    'quests', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', q.id,
          'title', q.title,
          'rewardFrameId', q.reward_frame_id
        )
        order by q.sort_order, q.id
      )
      from public.collection_quests q
      where q.is_active = true
    ), '[]'::jsonb),
    'seasonTiers', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'seasonId', t.season_id,
          'tierIndex', t.tier_index,
          'label', t.label,
          'rewardFrameId', t.reward_frame_id
        )
        order by t.season_id, t.tier_index
      )
      from public.season_reward_tiers t
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_save_avatar_frame(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  frame_id text := nullif(trim(coalesce(payload->>'id', '')), '');
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if frame_id is null then
    raise exception 'Frame id is required.';
  end if;

  update public.collector_avatar_frames
  set
    name = coalesce(nullif(trim(payload->>'name'), ''), name),
    description = case
      when payload ? 'description' then nullif(trim(payload->>'description'), '')
      else description
    end,
    sort_order = coalesce((payload->>'sortOrder')::integer, sort_order),
    is_active = coalesce((payload->>'isActive')::boolean, is_active)
  where id = frame_id;

  if not found then
    raise exception 'That avatar frame was not found.';
  end if;

  return jsonb_build_object('success', true, 'id', frame_id);
end;
$$;

create or replace function public.admin_set_reward_frame(
  target_kind text,
  target_id text,
  requested_frame_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  frame_id text := nullif(trim(coalesce(requested_frame_id, '')), '');
  kind text := lower(trim(coalesce(target_kind, '')));
  tid text := nullif(trim(coalesce(target_id, '')), '');
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if tid is null then
    raise exception 'Target id is required.';
  end if;

  if frame_id is not null and not exists (
    select 1 from public.collector_avatar_frames where id = frame_id
  ) then
    raise exception 'That avatar frame was not found.';
  end if;

  if kind = 'quest' then
    update public.collection_quests
    set reward_frame_id = frame_id
    where id = tid;
    if not found then
      raise exception 'That quest was not found.';
    end if;
  elsif kind in ('season', 'season_tier', 'tier') then
    update public.season_reward_tiers
    set reward_frame_id = frame_id
    where id = tid;
    if not found then
      raise exception 'That season tier was not found.';
    end if;
  else
    raise exception 'Unsupported reward target kind.';
  end if;

  return jsonb_build_object('success', true, 'kind', kind, 'id', tid, 'frameId', frame_id);
end;
$$;

revoke all on function public.get_my_profile_extras() from public, anon;
revoke all on function public.set_my_profile_extras(text, text, text, text) from public, anon;
revoke all on function public.get_public_profile_extras(text) from public;
revoke all on function public.admin_list_avatar_frames() from public, anon;
revoke all on function public.admin_save_avatar_frame(jsonb) from public, anon;
revoke all on function public.admin_set_reward_frame(text, text, text) from public, anon;

grant execute on function public.get_my_profile_extras() to authenticated, service_role;
grant execute on function public.set_my_profile_extras(text, text, text, text) to authenticated, service_role;
grant execute on function public.get_public_profile_extras(text) to anon, authenticated, service_role;
grant execute on function public.admin_list_avatar_frames() to authenticated;
grant execute on function public.admin_save_avatar_frame(jsonb) to authenticated;
grant execute on function public.admin_set_reward_frame(text, text, text) to authenticated;
