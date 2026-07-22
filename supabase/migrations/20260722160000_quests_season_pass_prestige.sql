-- Collection Quests, Seasonal Collection Pass, and Card Prestige (threshold frames).
-- Prestige is quantity-threshold based (copies are not burned).

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------

create or replace function public.prestige_tier_from_quantity(requested_quantity integer)
returns text
language sql
immutable
as $$
  select case
    when coalesce(requested_quantity, 0) >= 500 then 'celestial'
    when coalesce(requested_quantity, 0) >= 100 then 'prismatic'
    when coalesce(requested_quantity, 0) >= 25 then 'gold'
    when coalesce(requested_quantity, 0) >= 10 then 'silver'
    else 'standard'
  end;
$$;

create or replace function public.credit_star_bits_reward(
  requested_user_id uuid,
  requested_amount integer,
  requested_description text,
  requested_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if requested_user_id is null or coalesce(requested_amount, 0) <= 0 then
    return;
  end if;

  insert into public.user_wallets(user_id, star_bits, lifetime_star_bits_earned)
  values (requested_user_id, requested_amount, requested_amount)
  on conflict (user_id) do update set
    star_bits = public.user_wallets.star_bits + excluded.star_bits,
    lifetime_star_bits_earned = public.user_wallets.lifetime_star_bits_earned + excluded.lifetime_star_bits_earned,
    updated_at = now();

  insert into public.star_bits_transactions(
    user_id, transaction_type, star_bits_change, description, metadata
  ) values (
    requested_user_id,
    'quest_reward',
    requested_amount,
    coalesce(nullif(trim(requested_description), ''), 'Progress reward'),
    coalesce(requested_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.credit_star_bits_reward(uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.credit_star_bits_reward(uuid, integer, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Card Prestige (threshold frames on owned copies)
-- ---------------------------------------------------------------------------

alter table public.user_cards
  add column if not exists prestige_tier text not null default 'standard';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_cards_prestige_tier_check'
  ) then
    alter table public.user_cards
      add constraint user_cards_prestige_tier_check
      check (prestige_tier in ('standard', 'silver', 'gold', 'prismatic', 'celestial'));
  end if;
end $$;

update public.user_cards
set prestige_tier = public.prestige_tier_from_quantity(quantity)
where prestige_tier is distinct from public.prestige_tier_from_quantity(quantity);

create or replace function public.sync_user_card_prestige_tier()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.prestige_tier := public.prestige_tier_from_quantity(new.quantity);
  return new;
end;
$$;

drop trigger if exists trg_user_cards_prestige_tier on public.user_cards;
create trigger trg_user_cards_prestige_tier
before insert or update of quantity
on public.user_cards
for each row
execute function public.sync_user_card_prestige_tier();

-- ---------------------------------------------------------------------------
-- Collection Quests
-- ---------------------------------------------------------------------------

create table if not exists public.collection_quests (
  id text primary key,
  title text not null,
  description text not null,
  icon text not null default '✦',
  requirement_type text not null,
  requirement_target text,
  requirement_count integer not null default 1 check (requirement_count > 0),
  reward_star_bits integer not null default 0 check (reward_star_bits >= 0),
  reward_title_id text references public.collector_titles(id) on delete set null,
  sort_order integer not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint collection_quests_requirement_type_check check (
    requirement_type in (
      'own_rarity',
      'own_series_complete',
      'own_unique',
      'own_category',
      'favorite_count',
      'trade_count',
      'booster_opens',
      'gift_sent',
      'visit_days'
    )
  )
);

create table if not exists public.user_quest_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  quest_id text not null references public.collection_quests(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  completed_at timestamptz,
  claimed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, quest_id)
);

alter table public.collection_quests enable row level security;
alter table public.user_quest_progress enable row level security;

drop policy if exists "Collection quests are readable" on public.collection_quests;
create policy "Collection quests are readable"
  on public.collection_quests for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "Users read own quest progress" on public.user_quest_progress;
create policy "Users read own quest progress"
  on public.user_quest_progress for select
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.collection_quests from public;
revoke all on table public.user_quest_progress from public;
grant select on table public.collection_quests to anon, authenticated;
grant select on table public.user_quest_progress to authenticated;
grant select, insert, update, delete on table public.collection_quests to service_role;
grant select, insert, update, delete on table public.user_quest_progress to service_role;

insert into public.collector_titles (id, name, description, sort_order, is_active)
values
  ('quest_trailblazer', 'Quest Trailblazer', 'Completed a Collection Quest.', 120, true),
  ('quest_rising_star', 'Rising Star Adept', 'Completed the Rising Star series quest.', 121, true),
  ('season_pathfinder', 'Season Pathfinder', 'Claimed a Seasonal Collection Pass reward.', 130, true),
  ('prestige_spark', 'Prestige Spark', 'Reached Silver prestige on a card.', 140, true)
on conflict (id) do nothing;

insert into public.collection_quests (
  id, title, description, icon, requirement_type, requirement_target, requirement_count,
  reward_star_bits, reward_title_id, sort_order
) values
  ('own_one_legendary', 'Own one Legendary', 'Collect any Legendary rarity card.', '👑', 'own_rarity', 'Legendary', 1, 50, 'quest_trailblazer', 10),
  ('complete_rising_star', 'Complete Rising Star', 'Own every collectible card in the Rising Star series.', '⭐', 'own_series_complete', '001', 1, 120, 'quest_rising_star', 20),
  ('favorite_ten', 'Favorite 10 cards', 'Star ten cards in your collection.', '♡', 'favorite_count', null, 10, 40, null, 30),
  ('trade_three', 'Trade 3 times', 'Complete three card trades with other collectors.', '🤝', 'trade_count', null, 3, 75, null, 40),
  ('open_five_boosters', 'Open 5 boosters', 'Open five Daily or Shop boosters.', '📦', 'booster_opens', null, 5, 60, null, 50),
  ('send_one_gift', 'Give someone a gift', 'Send a peer gift to another collector.', '🎁', 'gift_sent', null, 1, 55, null, 60),
  ('visit_seven_days', 'Visit 7 days', 'Claim or pull on seven distinct days.', '📅', 'visit_days', null, 7, 90, null, 70),
  ('own_twelve_uniques', 'Collect 12 unique cards', 'Grow your binder to twelve unique cards.', '🧩', 'own_unique', null, 12, 45, null, 80),
  ('own_five_outfits', 'Collect 5 Outfit cards', 'Own five cards from the Outfit category.', '👗', 'own_category', 'outfit', 5, 50, null, 90)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  icon = excluded.icon,
  requirement_type = excluded.requirement_type,
  requirement_target = excluded.requirement_target,
  requirement_count = excluded.requirement_count,
  reward_star_bits = excluded.reward_star_bits,
  reward_title_id = excluded.reward_title_id,
  sort_order = excluded.sort_order,
  is_active = true;

create or replace function public.evaluate_collection_quest_progress(
  requested_user_id uuid,
  requested_quest public.collection_quests
)
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  progress integer := 0;
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
        and activity_type = 'trade';

    when 'booster_opens' then
      select count(*)::integer into progress
      from public.collector_activity
      where actor_id = requested_user_id
        and activity_type = 'pull';

    when 'gift_sent' then
      select count(*)::integer into progress
      from public.collector_activity
      where actor_id = requested_user_id
        and activity_type = 'gift_sent';

    when 'visit_days' then
      select count(distinct (created_at at time zone 'utc')::date)::integer into progress
      from public.collector_activity
      where actor_id = requested_user_id
        and activity_type in ('pull', 'trade', 'gift_sent', 'gift_received', 'redeem', 'series_complete');

    else
      progress := 0;
  end case;

  return greatest(0, coalesce(progress, 0));
end;
$$;

create or replace function public.sync_my_collection_quests()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  quest public.collection_quests%rowtype;
  current_progress integer;
  newly_completed integer := 0;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  for quest in
    select * from public.collection_quests where is_active = true order by sort_order, id
  loop
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
      updated_at = now();

    if current_progress >= quest.requirement_count
       and not exists (
         select 1 from public.user_quest_progress
         where user_id = uid and quest_id = quest.id and claimed_at is not null
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

  update public.user_quest_progress
  set claimed_at = now(),
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where user_id = uid and quest_id = quest.id;

  return jsonb_build_object(
    'success', true,
    'questId', quest.id,
    'rewardStarBits', quest.reward_star_bits,
    'rewardTitleId', quest.reward_title_id
  );
end;
$$;

revoke all on function public.sync_my_collection_quests() from public, anon;
revoke all on function public.get_my_collection_quests() from public, anon;
revoke all on function public.claim_collection_quest(text) from public, anon;
grant execute on function public.sync_my_collection_quests() to authenticated;
grant execute on function public.get_my_collection_quests() to authenticated;
grant execute on function public.claim_collection_quest(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Seasonal Collection Pass
-- ---------------------------------------------------------------------------

create table if not exists public.season_definitions (
  id text primary key,
  name text not null,
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.season_reward_tiers (
  id text primary key,
  season_id text not null references public.season_definitions(id) on delete cascade,
  tier_index integer not null check (tier_index >= 1),
  points_required integer not null check (points_required >= 0),
  label text not null,
  reward_star_bits integer not null default 0 check (reward_star_bits >= 0),
  reward_title_id text references public.collector_titles(id) on delete set null,
  unique (season_id, tier_index)
);

create table if not exists public.user_season_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null references public.season_definitions(id) on delete cascade,
  points integer not null default 0 check (points >= 0),
  breakdown jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, season_id)
);

create table if not exists public.user_season_tier_claims (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null references public.season_definitions(id) on delete cascade,
  tier_id text not null references public.season_reward_tiers(id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (user_id, tier_id)
);

alter table public.season_definitions enable row level security;
alter table public.season_reward_tiers enable row level security;
alter table public.user_season_progress enable row level security;
alter table public.user_season_tier_claims enable row level security;

drop policy if exists "Seasons are readable" on public.season_definitions;
create policy "Seasons are readable"
  on public.season_definitions for select to anon, authenticated using (true);

drop policy if exists "Season tiers are readable" on public.season_reward_tiers;
create policy "Season tiers are readable"
  on public.season_reward_tiers for select to anon, authenticated using (true);

drop policy if exists "Users read own season progress" on public.user_season_progress;
create policy "Users read own season progress"
  on public.user_season_progress for select to authenticated using (user_id = auth.uid());

drop policy if exists "Users read own season claims" on public.user_season_tier_claims;
create policy "Users read own season claims"
  on public.user_season_tier_claims for select to authenticated using (user_id = auth.uid());

grant select on table public.season_definitions to anon, authenticated;
grant select on table public.season_reward_tiers to anon, authenticated;
grant select on table public.user_season_progress to authenticated;
grant select on table public.user_season_tier_claims to authenticated;

insert into public.season_definitions (id, name, description, starts_at, ends_at, is_active)
values (
  'season_2026_starlight_dawn',
  'Season 1: Starlight Dawn',
  'A free seasonal progression track. Open boosters, trade, gift, favorite cards, and visit across the season.',
  timestamptz '2026-07-01 00:00:00+00',
  timestamptz '2026-09-30 23:59:59+00',
  true
)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  is_active = true;

insert into public.season_reward_tiers (
  id, season_id, tier_index, points_required, label, reward_star_bits, reward_title_id
) values
  ('s1_t1', 'season_2026_starlight_dawn', 1, 25, 'Dawn Spark', 25, null),
  ('s1_t2', 'season_2026_starlight_dawn', 2, 75, 'Binder Ribbon', 50, null),
  ('s1_t3', 'season_2026_starlight_dawn', 3, 150, 'Pathfinder Title', 75, 'season_pathfinder'),
  ('s1_t4', 'season_2026_starlight_dawn', 4, 250, 'Star Bit Cache', 125, null),
  ('s1_t5', 'season_2026_starlight_dawn', 5, 400, 'Season Finale Cache', 200, null)
on conflict (id) do update set
  points_required = excluded.points_required,
  label = excluded.label,
  reward_star_bits = excluded.reward_star_bits,
  reward_title_id = excluded.reward_title_id;

create or replace function public.compute_season_points(requested_user_id uuid, requested_season_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  season public.season_definitions%rowtype;
  pulls integer := 0;
  trades integer := 0;
  gifts integer := 0;
  series_done integer := 0;
  favorites integer := 0;
  visit_days integer := 0;
  points integer := 0;
begin
  select * into season from public.season_definitions where id = requested_season_id;
  if not found then
    return jsonb_build_object('points', 0, 'breakdown', '{}'::jsonb);
  end if;

  select count(*)::integer into pulls
  from public.collector_activity
  where actor_id = requested_user_id
    and activity_type = 'pull'
    and created_at >= season.starts_at and created_at <= season.ends_at;

  select count(*)::integer into trades
  from public.collector_activity
  where actor_id = requested_user_id
    and activity_type = 'trade'
    and created_at >= season.starts_at and created_at <= season.ends_at;

  select count(*)::integer into gifts
  from public.collector_activity
  where actor_id = requested_user_id
    and activity_type = 'gift_sent'
    and created_at >= season.starts_at and created_at <= season.ends_at;

  select count(*)::integer into series_done
  from public.collector_activity
  where actor_id = requested_user_id
    and activity_type = 'series_complete'
    and created_at >= season.starts_at and created_at <= season.ends_at;

  select count(*)::integer into favorites
  from public.user_cards
  where user_id = requested_user_id and is_favorite = true and quantity > 0;

  select count(distinct (created_at at time zone 'utc')::date)::integer into visit_days
  from public.collector_activity
  where actor_id = requested_user_id
    and created_at >= season.starts_at and created_at <= season.ends_at
    and activity_type in ('pull', 'trade', 'gift_sent', 'gift_received', 'redeem', 'series_complete');

  -- Soft caps keep the free pass paced without feeling gated.
  points :=
    least(pulls, 20) * 10
    + least(trades, 10) * 25
    + least(gifts, 10) * 30
    + least(series_done, 5) * 100
    + least(favorites, 20) * 5
    + least(visit_days, 30) * 15;

  return jsonb_build_object(
    'points', points,
    'breakdown', jsonb_build_object(
      'boosterOpens', pulls,
      'trades', trades,
      'giftsSent', gifts,
      'seriesComplete', series_done,
      'favorites', favorites,
      'visitDays', visit_days
    )
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
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  select * into season
  from public.season_definitions
  where is_active = true
    and now() between starts_at and ends_at
  order by starts_at desc
  limit 1;

  if not found then
    select * into season
    from public.season_definitions
    where is_active = true
    order by starts_at desc
    limit 1;
  end if;

  if not found then
    return jsonb_build_object('found', false);
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
  where t.season_id = season.id;

  return jsonb_build_object(
    'found', true,
    'season', jsonb_build_object(
      'id', season.id,
      'name', season.name,
      'description', season.description,
      'startsAt', season.starts_at,
      'endsAt', season.ends_at,
      'isActive', season.is_active and now() between season.starts_at and season.ends_at
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
    'rewardTitleId', tier.reward_title_id
  );
end;
$$;

revoke all on function public.get_my_season_pass() from public, anon;
revoke all on function public.claim_season_pass_tier(text) from public, anon;
grant execute on function public.get_my_season_pass() to authenticated;
grant execute on function public.claim_season_pass_tier(text) to authenticated;

comment on table public.collection_quests is 'NPC-style collection objectives with Star Bits and title rewards.';
comment on table public.season_definitions is 'Free seasonal progression tracks (Collection Pass).';
comment on column public.user_cards.prestige_tier is 'Threshold prestige frame derived from owned quantity; copies are not burned.';
