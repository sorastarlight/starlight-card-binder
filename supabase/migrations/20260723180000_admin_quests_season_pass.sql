-- Staff admin RPCs for Collection Quests, Season Pass, and collector titles.

create or replace function public.admin_list_collection_quests()
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

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', q.id,
        'title', q.title,
        'description', q.description,
        'icon', q.icon,
        'requirementType', q.requirement_type,
        'requirementTarget', q.requirement_target,
        'requirementCount', q.requirement_count,
        'rewardStarBits', q.reward_star_bits,
        'rewardTitleId', q.reward_title_id,
        'rewardTitleName', t.name,
        'rewardFrameId', q.reward_frame_id,
        'rewardFrameName', f.name,
        'sortOrder', q.sort_order,
        'isActive', q.is_active,
        'createdAt', q.created_at
      )
      order by q.sort_order, q.id
    )
    from public.collection_quests q
    left join public.collector_titles t on t.id = q.reward_title_id
    left join public.collector_avatar_frames f on f.id = q.reward_frame_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_seasons()
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

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'description', s.description,
        'startsAt', s.starts_at,
        'endsAt', s.ends_at,
        'isActive', s.is_active,
        'audience', s.audience,
        'createdAt', s.created_at,
        'tiers', coalesce((
          select jsonb_agg(
            jsonb_build_object(
              'id', t.id,
              'seasonId', t.season_id,
              'tierIndex', t.tier_index,
              'pointsRequired', t.points_required,
              'label', t.label,
              'rewardStarBits', t.reward_star_bits,
              'rewardTitleId', t.reward_title_id,
              'rewardTitleName', ct.name,
              'rewardFrameId', t.reward_frame_id,
              'rewardFrameName', af.name,
              'claimCount', coalesce((
                select count(*)::integer
                from public.user_season_tier_claims c
                where c.tier_id = t.id
              ), 0)
            )
            order by t.tier_index, t.id
          )
          from public.season_reward_tiers t
          left join public.collector_titles ct on ct.id = t.reward_title_id
          left join public.collector_avatar_frames af on af.id = t.reward_frame_id
          where t.season_id = s.id
        ), '[]'::jsonb)
      )
      order by s.starts_at desc, s.id
    )
    from public.season_definitions s
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_list_collector_titles()
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

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'name', t.name,
        'description', t.description,
        'sortOrder', t.sort_order,
        'isActive', t.is_active
      )
      order by t.sort_order, t.id
    )
    from public.collector_titles t
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_get_quests_season_admin()
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
    'quests', public.admin_list_collection_quests(),
    'seasons', public.admin_list_seasons(),
    'titles', public.admin_list_collector_titles(),
    'pickers', jsonb_build_object(
      'frames', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', f.id,
            'name', f.name,
            'isActive', f.is_active,
            'sortOrder', f.sort_order
          )
          order by f.sort_order, f.id
        )
        from public.collector_avatar_frames f
      ), '[]'::jsonb),
      'series', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'sortOrder', s.sort_order,
            'isVisible', s.is_visible
          )
          order by s.sort_order, s.id
        )
        from public.card_series s
      ), '[]'::jsonb),
      'categories', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'id', c.id,
            'name', c.name,
            'sortOrder', c.sort_order,
            'isActive', c.is_active
          )
          order by c.sort_order, c.name
        )
        from public.card_categories c
      ), '[]'::jsonb),
      'rarities', jsonb_build_array(
        'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'
      ),
      'requirementTypes', jsonb_build_array(
        'own_rarity',
        'own_series_complete',
        'own_unique',
        'own_category',
        'favorite_count',
        'trade_count',
        'booster_opens',
        'gift_sent',
        'visit_days'
      ),
      'audiences', jsonb_build_array('all', 'twitch_subscribers')
    )
  );
end;
$$;

create or replace function public.admin_save_collection_quest(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  quest_id text := nullif(trim(coalesce(payload->>'id', '')), '');
  req_type text := nullif(trim(coalesce(payload->>'requirementType', '')), '');
  req_target text := nullif(trim(coalesce(payload->>'requirementTarget', '')), '');
  title_id text := nullif(trim(coalesce(payload->>'rewardTitleId', '')), '');
  frame_id text := nullif(trim(coalesce(payload->>'rewardFrameId', '')), '');
  req_count integer;
  bits integer;
  sort_ord integer;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if quest_id is null then
    raise exception 'Quest id is required.';
  end if;

  if nullif(trim(coalesce(payload->>'title', '')), '') is null then
    raise exception 'Quest title is required.';
  end if;

  if nullif(trim(coalesce(payload->>'description', '')), '') is null then
    raise exception 'Quest description is required.';
  end if;

  if req_type is null or req_type not in (
    'own_rarity',
    'own_series_complete',
    'own_unique',
    'own_category',
    'favorite_count',
    'trade_count',
    'booster_opens',
    'gift_sent',
    'visit_days'
  ) then
    raise exception 'Invalid requirement type.';
  end if;

  if req_type in ('own_rarity', 'own_series_complete', 'own_category') and req_target is null then
    raise exception 'Requirement target is required for % requirements.', req_type;
  end if;

  if req_type = 'own_rarity' and req_target not in ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary') then
    raise exception 'Invalid rarity target.';
  end if;

  if req_type = 'own_series_complete' and not exists (
    select 1 from public.card_series where id = req_target
  ) then
    raise exception 'That series was not found.';
  end if;

  if req_type = 'own_category' and not exists (
    select 1 from public.card_categories where id = req_target
  ) then
    raise exception 'That category was not found.';
  end if;

  if title_id is not null and not exists (
    select 1 from public.collector_titles where id = title_id
  ) then
    raise exception 'That collector title was not found.';
  end if;

  if frame_id is not null and not exists (
    select 1 from public.collector_avatar_frames where id = frame_id
  ) then
    raise exception 'That avatar frame was not found.';
  end if;

  req_count := greatest(coalesce((payload->>'requirementCount')::integer, 1), 1);
  bits := greatest(coalesce((payload->>'rewardStarBits')::integer, 0), 0);
  sort_ord := coalesce((payload->>'sortOrder')::integer, 100);

  insert into public.collection_quests (
    id, title, description, icon, requirement_type, requirement_target, requirement_count,
    reward_star_bits, reward_title_id, reward_frame_id, sort_order, is_active
  ) values (
    quest_id,
    trim(payload->>'title'),
    trim(payload->>'description'),
    coalesce(nullif(trim(coalesce(payload->>'icon', '')), ''), '✦'),
    req_type,
    case when req_type in ('own_rarity', 'own_series_complete', 'own_category') then req_target else null end,
    req_count,
    bits,
    title_id,
    frame_id,
    sort_ord,
    coalesce((payload->>'isActive')::boolean, true)
  )
  on conflict (id) do update set
    title = excluded.title,
    description = excluded.description,
    icon = excluded.icon,
    requirement_type = excluded.requirement_type,
    requirement_target = excluded.requirement_target,
    requirement_count = excluded.requirement_count,
    reward_star_bits = excluded.reward_star_bits,
    reward_title_id = excluded.reward_title_id,
    reward_frame_id = excluded.reward_frame_id,
    sort_order = excluded.sort_order,
    is_active = excluded.is_active;

  return jsonb_build_object('success', true, 'id', quest_id);
end;
$$;

create or replace function public.admin_save_season(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  season_id text := nullif(trim(coalesce(payload->>'id', '')), '');
  audience text := coalesce(nullif(trim(coalesce(payload->>'audience', '')), ''), 'all');
  starts_at timestamptz;
  ends_at timestamptz;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if season_id is null then
    raise exception 'Season id is required.';
  end if;

  if nullif(trim(coalesce(payload->>'name', '')), '') is null then
    raise exception 'Season name is required.';
  end if;

  if audience not in ('all', 'twitch_subscribers') then
    raise exception 'Audience must be all or twitch_subscribers.';
  end if;

  begin
    starts_at := (payload->>'startsAt')::timestamptz;
    ends_at := (payload->>'endsAt')::timestamptz;
  exception when others then
    raise exception 'Valid startsAt and endsAt timestamps are required.';
  end;

  if starts_at is null or ends_at is null then
    raise exception 'Valid startsAt and endsAt timestamps are required.';
  end if;

  if ends_at <= starts_at then
    raise exception 'Season end must be after start.';
  end if;

  insert into public.season_definitions (
    id, name, description, starts_at, ends_at, is_active, audience
  ) values (
    season_id,
    trim(payload->>'name'),
    coalesce(trim(coalesce(payload->>'description', '')), ''),
    starts_at,
    ends_at,
    coalesce((payload->>'isActive')::boolean, true),
    audience
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    starts_at = excluded.starts_at,
    ends_at = excluded.ends_at,
    is_active = excluded.is_active,
    audience = excluded.audience;

  return jsonb_build_object('success', true, 'id', season_id);
end;
$$;

create or replace function public.admin_save_season_tier(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  requested_tier_id text := nullif(trim(coalesce(payload->>'id', '')), '');
  requested_season_id text := nullif(trim(coalesce(payload->>'seasonId', '')), '');
  title_id text := nullif(trim(coalesce(payload->>'rewardTitleId', '')), '');
  frame_id text := nullif(trim(coalesce(payload->>'rewardFrameId', '')), '');
  requested_tier_index integer;
  points integer;
  bits integer;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if requested_season_id is null then
    raise exception 'Season id is required.';
  end if;

  if not exists (select 1 from public.season_definitions where id = requested_season_id) then
    raise exception 'That season was not found.';
  end if;

  requested_tier_index := coalesce((payload->>'tierIndex')::integer, 0);
  if requested_tier_index < 1 then
    raise exception 'Tier index must be at least 1.';
  end if;

  if requested_tier_id is null then
    requested_tier_id := requested_season_id || '_t' || requested_tier_index::text;
  end if;

  if nullif(trim(coalesce(payload->>'label', '')), '') is null then
    raise exception 'Tier label is required.';
  end if;

  if title_id is not null and not exists (
    select 1 from public.collector_titles where id = title_id
  ) then
    raise exception 'That collector title was not found.';
  end if;

  if frame_id is not null and not exists (
    select 1 from public.collector_avatar_frames where id = frame_id
  ) then
    raise exception 'That avatar frame was not found.';
  end if;

  points := greatest(coalesce((payload->>'pointsRequired')::integer, 0), 0);
  bits := greatest(coalesce((payload->>'rewardStarBits')::integer, 0), 0);

  if exists (
    select 1 from public.season_reward_tiers t
    where t.season_id = requested_season_id
      and t.tier_index = requested_tier_index
      and t.id is distinct from requested_tier_id
  ) then
    raise exception 'A tier with that index already exists for this season.';
  end if;

  insert into public.season_reward_tiers (
    id, season_id, tier_index, points_required, label,
    reward_star_bits, reward_title_id, reward_frame_id
  ) values (
    requested_tier_id,
    requested_season_id,
    requested_tier_index,
    points,
    trim(payload->>'label'),
    bits,
    title_id,
    frame_id
  )
  on conflict (id) do update set
    season_id = excluded.season_id,
    tier_index = excluded.tier_index,
    points_required = excluded.points_required,
    label = excluded.label,
    reward_star_bits = excluded.reward_star_bits,
    reward_title_id = excluded.reward_title_id,
    reward_frame_id = excluded.reward_frame_id;

  return jsonb_build_object('success', true, 'id', requested_tier_id, 'seasonId', requested_season_id);
end;
$$;

create or replace function public.admin_save_collector_title(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  title_id text := nullif(trim(coalesce(payload->>'id', '')), '');
  existing boolean := false;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if title_id is null then
    raise exception 'Title id is required.';
  end if;

  if nullif(trim(coalesce(payload->>'name', '')), '') is null then
    raise exception 'Title name is required.';
  end if;

  select exists(select 1 from public.collector_titles where id = title_id) into existing;

  if existing then
    update public.collector_titles
    set
      name = trim(payload->>'name'),
      description = case
        when payload ? 'description' then nullif(trim(coalesce(payload->>'description', '')), '')
        else description
      end,
      sort_order = coalesce((payload->>'sortOrder')::integer, sort_order),
      is_active = coalesce((payload->>'isActive')::boolean, is_active)
    where id = title_id;
  else
    insert into public.collector_titles (id, name, description, sort_order, is_active)
    values (
      title_id,
      trim(payload->>'name'),
      nullif(trim(coalesce(payload->>'description', '')), ''),
      coalesce((payload->>'sortOrder')::integer, 100),
      coalesce((payload->>'isActive')::boolean, true)
    );
  end if;

  return jsonb_build_object('success', true, 'id', title_id, 'created', not existing);
end;
$$;

create or replace function public.admin_delete_season_tier(tier_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  tid text := nullif(trim(coalesce(tier_id, '')), '');
  claim_count integer := 0;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if tid is null then
    raise exception 'Tier id is required.';
  end if;

  if not exists (select 1 from public.season_reward_tiers where id = tid) then
    raise exception 'That season tier was not found.';
  end if;

  select count(*)::integer into claim_count
  from public.user_season_tier_claims
  where user_season_tier_claims.tier_id = tid;

  if claim_count > 0 then
    raise exception 'Cannot delete tier: % collector(s) have already claimed it.', claim_count;
  end if;

  delete from public.season_reward_tiers where id = tid;

  return jsonb_build_object('success', true, 'id', tid);
end;
$$;

revoke all on function public.admin_list_collection_quests() from public, anon;
revoke all on function public.admin_list_seasons() from public, anon;
revoke all on function public.admin_list_collector_titles() from public, anon;
revoke all on function public.admin_get_quests_season_admin() from public, anon;
revoke all on function public.admin_save_collection_quest(jsonb) from public, anon;
revoke all on function public.admin_save_season(jsonb) from public, anon;
revoke all on function public.admin_save_season_tier(jsonb) from public, anon;
revoke all on function public.admin_save_collector_title(jsonb) from public, anon;
revoke all on function public.admin_delete_season_tier(text) from public, anon;

grant execute on function public.admin_list_collection_quests() to authenticated;
grant execute on function public.admin_list_seasons() to authenticated;
grant execute on function public.admin_list_collector_titles() to authenticated;
grant execute on function public.admin_get_quests_season_admin() to authenticated;
grant execute on function public.admin_save_collection_quest(jsonb) to authenticated;
grant execute on function public.admin_save_season(jsonb) to authenticated;
grant execute on function public.admin_save_season_tier(jsonb) to authenticated;
grant execute on function public.admin_save_collector_title(jsonb) to authenticated;
grant execute on function public.admin_delete_season_tier(text) to authenticated;
