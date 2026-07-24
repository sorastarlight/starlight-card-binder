-- Starlight Missions: daily/weekly/legacy cadence with UTC period progress resets.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.collection_quests
  add column if not exists cadence text not null default 'legacy';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'collection_quests_cadence_check'
  ) then
    alter table public.collection_quests
      add constraint collection_quests_cadence_check
      check (cadence in ('daily', 'weekly', 'legacy'));
  end if;
end $$;

comment on column public.collection_quests.cadence is
  'Mission reset cadence: daily (UTC day), weekly (UTC Monday), or legacy (one-shot).';

create table if not exists public.user_quest_period_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null references public.collection_quests(id) on delete cascade,
  period_key text not null,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id, period_key)
);

create index if not exists user_quest_period_progress_user_idx
  on public.user_quest_period_progress (user_id, quest_id);

alter table public.user_quest_period_progress enable row level security;

drop policy if exists "Users read own quest period progress" on public.user_quest_period_progress;
create policy "Users read own quest period progress"
  on public.user_quest_period_progress for select
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.user_quest_period_progress from public;
grant select on table public.user_quest_period_progress to authenticated;
grant select, insert, update, delete on table public.user_quest_period_progress to service_role;

-- Preserve existing one-shot claims/progress under the legacy period key.
insert into public.user_quest_period_progress (
  user_id, quest_id, period_key, progress, completed_at, claimed_at, updated_at
)
select
  user_id,
  quest_id,
  'legacy',
  progress,
  completed_at,
  claimed_at,
  coalesce(updated_at, now())
from public.user_quest_progress
on conflict (user_id, quest_id, period_key) do nothing;

update public.collection_quests
set cadence = 'legacy'
where cadence is distinct from 'legacy'
  and cadence not in ('daily', 'weekly');

-- ---------------------------------------------------------------------------
-- Period helpers (UTC)
-- ---------------------------------------------------------------------------

create or replace function public.quest_period_bounds(
  requested_cadence text,
  at_ts timestamptz default now()
)
returns table (
  period_key text,
  period_start timestamptz,
  period_end timestamptz,
  resets_at timestamptz
)
language plpgsql
stable
set search_path = public
as $$
declare
  utc_ts timestamptz := coalesce(at_ts, now());
  day_start date;
  week_start date;
begin
  if requested_cadence = 'daily' then
    day_start := (utc_ts at time zone 'utc')::date;
    period_key := to_char(day_start, 'YYYY-MM-DD');
    period_start := day_start::timestamp at time zone 'utc';
    period_end := (day_start + 1)::timestamp at time zone 'utc';
    resets_at := period_end;
    return next;
  elsif requested_cadence = 'weekly' then
    -- ISO week: Monday 00:00 UTC.
    week_start := date_trunc('week', utc_ts at time zone 'utc')::date;
    period_key := to_char(week_start, 'IYYY-"W"IW');
    period_start := week_start::timestamp at time zone 'utc';
    period_end := (week_start + 7)::timestamp at time zone 'utc';
    resets_at := period_end;
    return next;
  else
    period_key := 'legacy';
    period_start := null;
    period_end := null;
    resets_at := null;
    return next;
  end if;
end;
$$;

create or replace function public.quest_current_period_key(
  requested_cadence text,
  at_ts timestamptz default now()
)
returns text
language sql
stable
set search_path = public
as $$
  select period_key from public.quest_period_bounds(requested_cadence, at_ts);
$$;

-- ---------------------------------------------------------------------------
-- Progress evaluation (optional UTC period window for activity requirements)
-- ---------------------------------------------------------------------------

drop function if exists public.evaluate_collection_quest_progress(uuid, public.collection_quests);

create or replace function public.evaluate_collection_quest_progress(
  requested_user_id uuid,
  requested_quest public.collection_quests,
  period_start timestamptz default null,
  period_end timestamptz default null
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  progress integer := 0;
  scoped boolean := period_start is not null and period_end is not null;
begin
  if requested_user_id is null then
    return 0;
  end if;

  case requested_quest.requirement_type
    when 'own_rarity' then
      select count(*)::integer into progress
      from public.user_cards uc
      join public.cards c on c.id = uc.card_id
      where uc.user_id = requested_user_id
        and uc.quantity > 0
        and lower(c.rarity) = lower(coalesce(requested_quest.requirement_target, ''));

    when 'own_series_complete' then
      select case
        when catalog_total > 0 and owned_total >= catalog_total then 1
        else 0
      end into progress
      from (
        select
          count(*) filter (where c.is_collectible and c.is_visible)::integer as catalog_total,
          count(uc.card_id) filter (where uc.quantity > 0)::integer as owned_total
        from public.cards c
        left join public.user_cards uc
          on uc.card_id = c.id and uc.user_id = requested_user_id
        where c.series_id = requested_quest.requirement_target
      ) counts;

    when 'own_unique' then
      select count(*)::integer into progress
      from public.user_cards
      where user_id = requested_user_id and quantity > 0;

    when 'own_category' then
      select count(*)::integer into progress
      from public.user_cards uc
      join public.cards c on c.id = uc.card_id
      where uc.user_id = requested_user_id
        and uc.quantity > 0
        and c.category_id = requested_quest.requirement_target;

    when 'favorite_count' then
      select count(*)::integer into progress
      from public.user_cards
      where user_id = requested_user_id
        and quantity > 0
        and is_favorite = true;

    when 'trade_count' then
      select count(*)::integer into progress
      from public.collector_activity
      where actor_id = requested_user_id
        and activity_type = 'trade'
        and (
          not scoped
          or (created_at >= period_start and created_at < period_end)
        );

    when 'booster_opens' then
      select count(*)::integer into progress
      from public.collector_activity
      where actor_id = requested_user_id
        and activity_type = 'pull'
        and (
          not scoped
          or (created_at >= period_start and created_at < period_end)
        );

    when 'gift_sent' then
      select count(*)::integer into progress
      from public.collector_activity
      where actor_id = requested_user_id
        and activity_type = 'gift_sent'
        and (
          not scoped
          or (created_at >= period_start and created_at < period_end)
        );

    when 'visit_days' then
      select count(distinct (created_at at time zone 'utc')::date)::integer into progress
      from public.collector_activity
      where actor_id = requested_user_id
        and activity_type in ('pull', 'trade', 'gift_sent', 'gift_received', 'redeem', 'series_complete')
        and (
          not scoped
          or (created_at >= period_start and created_at < period_end)
        );

    else
      progress := 0;
  end case;

  return greatest(0, coalesce(progress, 0));
end;
$$;

-- ---------------------------------------------------------------------------
-- Sync / get / claim (current period only)
-- ---------------------------------------------------------------------------

create or replace function public.sync_my_collection_quests()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  quest public.collection_quests%rowtype;
  bounds record;
  current_progress integer;
  newly_completed integer := 0;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  for quest in
    select * from public.collection_quests where is_active = true order by sort_order, id
  loop
    select * into bounds from public.quest_period_bounds(quest.cadence, now());
    current_progress := public.evaluate_collection_quest_progress(
      uid,
      quest,
      bounds.period_start,
      bounds.period_end
    );

    insert into public.user_quest_period_progress as uqp (
      user_id, quest_id, period_key, progress, completed_at, updated_at
    ) values (
      uid,
      quest.id,
      bounds.period_key,
      least(current_progress, quest.requirement_count),
      case when current_progress >= quest.requirement_count then now() else null end,
      now()
    )
    on conflict (user_id, quest_id, period_key) do update set
      progress = least(excluded.progress, quest.requirement_count),
      completed_at = case
        when uqp.claimed_at is not null then uqp.completed_at
        when excluded.progress >= quest.requirement_count then coalesce(uqp.completed_at, now())
        else null
      end,
      updated_at = now();

    if current_progress >= quest.requirement_count
       and not exists (
         select 1 from public.user_quest_period_progress
         where user_id = uid
           and quest_id = quest.id
           and period_key = bounds.period_key
           and claimed_at is not null
       ) then
      newly_completed := newly_completed + 1;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'readyToClaimHint', newly_completed);
end;
$$;

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
      'cadence', q.cadence,
      'periodKey', b.period_key,
      'resetsAt', b.resets_at,
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
    order by
      case q.cadence when 'daily' then 0 when 'weekly' then 1 else 2 end,
      q.sort_order,
      q.id
  ), '[]'::jsonb)
  into result
  from public.collection_quests q
  cross join lateral public.quest_period_bounds(q.cadence, now()) b
  left join public.user_quest_period_progress p
    on p.quest_id = q.id
   and p.user_id = uid
   and p.period_key = b.period_key
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
  bounds record;
  progress_row public.user_quest_period_progress%rowtype;
  current_progress integer;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  select * into quest
  from public.collection_quests
  where id = requested_quest_id and is_active = true;

  if not found then
    raise exception 'That mission was not found.';
  end if;

  select * into bounds from public.quest_period_bounds(quest.cadence, now());
  current_progress := public.evaluate_collection_quest_progress(
    uid,
    quest,
    bounds.period_start,
    bounds.period_end
  );

  insert into public.user_quest_period_progress as uqp (
    user_id, quest_id, period_key, progress, completed_at, updated_at
  ) values (
    uid,
    quest.id,
    bounds.period_key,
    least(current_progress, quest.requirement_count),
    case when current_progress >= quest.requirement_count then now() else null end,
    now()
  )
  on conflict (user_id, quest_id, period_key) do update set
    progress = least(excluded.progress, quest.requirement_count),
    completed_at = case
      when uqp.claimed_at is not null then uqp.completed_at
      when excluded.progress >= quest.requirement_count then coalesce(uqp.completed_at, now())
      else null
    end,
    updated_at = now()
  returning * into progress_row;

  if progress_row.progress < quest.requirement_count then
    raise exception 'This mission is not complete yet.';
  end if;

  if progress_row.claimed_at is not null then
    raise exception 'You already claimed this mission reward for the current period.';
  end if;

  if quest.reward_star_bits > 0 then
    perform public.credit_star_bits_reward(
      uid,
      quest.reward_star_bits,
      'Starlight Mission reward: ' || quest.title,
      jsonb_build_object(
        'questId', quest.id,
        'cadence', quest.cadence,
        'periodKey', bounds.period_key
      )
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

  update public.user_quest_period_progress
  set claimed_at = now(),
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where user_id = uid
    and quest_id = quest.id
    and period_key = bounds.period_key;

  return jsonb_build_object(
    'success', true,
    'questId', quest.id,
    'cadence', quest.cadence,
    'periodKey', bounds.period_key,
    'resetsAt', bounds.resets_at,
    'rewardStarBits', quest.reward_star_bits,
    'rewardTitleId', quest.reward_title_id,
    'rewardFrameId', quest.reward_frame_id
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin list/save cadence support
-- ---------------------------------------------------------------------------

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
        'cadence', q.cadence,
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
      order by
        case q.cadence when 'daily' then 0 when 'weekly' then 1 else 2 end,
        q.sort_order,
        q.id
    )
    from public.collection_quests q
    left join public.collector_titles t on t.id = q.reward_title_id
    left join public.collector_avatar_frames f on f.id = q.reward_frame_id
  ), '[]'::jsonb);
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
  cadence text := coalesce(nullif(trim(coalesce(payload->>'cadence', '')), ''), 'legacy');
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

  if cadence not in ('daily', 'weekly', 'legacy') then
    raise exception 'Invalid cadence. Use daily, weekly, or legacy.';
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
    id, title, description, icon, cadence, requirement_type, requirement_target, requirement_count,
    reward_star_bits, reward_title_id, reward_frame_id, sort_order, is_active
  ) values (
    quest_id,
    trim(payload->>'title'),
    trim(payload->>'description'),
    coalesce(nullif(trim(coalesce(payload->>'icon', '')), ''), '✦'),
    cadence,
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
    cadence = excluded.cadence,
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
      'cadences', jsonb_build_array('daily', 'weekly', 'legacy'),
      'audiences', jsonb_build_array('all', 'twitch_subscribers')
    )
  );
end;
$$;

revoke all on function public.quest_period_bounds(text, timestamptz) from public, anon;
revoke all on function public.quest_current_period_key(text, timestamptz) from public, anon;
revoke all on function public.evaluate_collection_quest_progress(uuid, public.collection_quests, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.sync_my_collection_quests() from public, anon;
revoke all on function public.get_my_collection_quests() from public, anon;
revoke all on function public.claim_collection_quest(text) from public, anon;
revoke all on function public.admin_list_collection_quests() from public, anon;
revoke all on function public.admin_save_collection_quest(jsonb) from public, anon;
revoke all on function public.admin_get_quests_season_admin() from public, anon;

grant execute on function public.quest_period_bounds(text, timestamptz) to authenticated, service_role;
grant execute on function public.quest_current_period_key(text, timestamptz) to authenticated, service_role;
grant execute on function public.evaluate_collection_quest_progress(uuid, public.collection_quests, timestamptz, timestamptz) to service_role;
grant execute on function public.sync_my_collection_quests() to authenticated;
grant execute on function public.get_my_collection_quests() to authenticated;
grant execute on function public.claim_collection_quest(text) to authenticated;
grant execute on function public.admin_list_collection_quests() to authenticated;
grant execute on function public.admin_save_collection_quest(jsonb) to authenticated;
grant execute on function public.admin_get_quests_season_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Seed daily + weekly Starlight Missions
-- ---------------------------------------------------------------------------

insert into public.collection_quests (
  id, title, description, icon, cadence, requirement_type, requirement_target, requirement_count,
  reward_star_bits, reward_title_id, sort_order, is_active
) values
  ('daily_open_booster', 'Open a booster', 'Open any Daily or Shop booster today.', '🌞', 'daily', 'booster_opens', null, 1, 15, null, 5, true),
  ('daily_send_gift', 'Send a gift', 'Send a peer gift to another collector today.', '🎁', 'daily', 'gift_sent', null, 1, 20, null, 6, true),
  ('daily_complete_trade', 'Complete a trade', 'Finish one card trade today.', '🤝', 'daily', 'trade_count', null, 1, 25, null, 7, true),
  ('daily_check_in', 'Daily check-in', 'Make any collector visit activity today.', '✨', 'daily', 'visit_days', null, 1, 10, null, 8, true),
  ('weekly_open_five', 'Open 5 boosters', 'Open five boosters this UTC week.', '📦', 'weekly', 'booster_opens', null, 5, 50, null, 11, true),
  ('weekly_trade_three', 'Trade 3 times', 'Complete three trades this UTC week.', '🌙', 'weekly', 'trade_count', null, 3, 60, null, 12, true),
  ('weekly_send_two_gifts', 'Send 2 gifts', 'Send two peer gifts this UTC week.', '🎀', 'weekly', 'gift_sent', null, 2, 45, null, 13, true),
  ('weekly_visit_five', 'Visit 5 days', 'Be active on five distinct UTC days this week.', '📅', 'weekly', 'visit_days', null, 5, 70, null, 14, true),
  ('weekly_open_ten', 'Open 10 boosters', 'Open ten boosters this UTC week.', '🚀', 'weekly', 'booster_opens', null, 10, 90, null, 15, true)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  cadence = excluded.cadence,
  requirement_type = excluded.requirement_type,
  requirement_target = excluded.requirement_target,
  requirement_count = excluded.requirement_count,
  reward_star_bits = excluded.reward_star_bits,
  reward_title_id = excluded.reward_title_id,
  sort_order = excluded.sort_order,
  is_active = true;

comment on table public.user_quest_period_progress is
  'Per-period Starlight Mission progress. period_key is YYYY-MM-DD (daily), YYYY-Www (weekly), or legacy.';
