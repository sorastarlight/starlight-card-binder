-- Twitch subscriber Season Pass access + new-sub unlock gifts.
-- Audience: season can require active Twitch subscriber access.
-- Delivery: subscription EventSub / manual grants queue a Received Gift unlock
-- and/or grant user_season_access. Unlinked viewers get pending unlock tokens.

-- ---------------------------------------------------------------------------
-- Schema
-- ---------------------------------------------------------------------------

alter table public.season_definitions
  add column if not exists audience text not null default 'all';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'season_definitions_audience_check'
  ) then
    alter table public.season_definitions
      add constraint season_definitions_audience_check
      check (audience in ('all', 'twitch_subscribers'));
  end if;
end $$;

update public.season_definitions
set audience = 'twitch_subscribers'
where id = 'season_2026_starlight_dawn';

alter table public.twitch_reward_rules
  add column if not exists season_id text references public.season_definitions(id) on delete set null;

alter table public.twitch_reward_rules
  drop constraint if exists twitch_reward_rules_reward_type_check;
alter table public.twitch_reward_rules
  add constraint twitch_reward_rules_reward_type_check
  check (reward_type in ('star_bits', 'single_card', 'booster', 'season_pass_unlock'));

alter table public.twitch_reward_rules
  drop constraint if exists twitch_reward_rules_reward_payload_check;
alter table public.twitch_reward_rules
  add constraint twitch_reward_rules_reward_payload_check
  check (
    (reward_type = 'star_bits' and coalesce(star_bits_amount, 0) > 0 and card_id is null and card_quantity is null and booster_id is null and season_id is null)
    or (reward_type = 'single_card' and card_id is not null and coalesce(card_quantity, 0) > 0 and booster_id is null and star_bits_amount is null and season_id is null)
    or (reward_type = 'booster' and booster_id is not null and card_id is null and card_quantity is null and star_bits_amount is null and season_id is null)
    or (reward_type = 'season_pass_unlock' and season_id is not null and card_id is null and card_quantity is null and booster_id is null and star_bits_amount is null)
  );

alter table public.received_rewards
  drop constraint if exists received_rewards_reward_type_check;
alter table public.received_rewards
  add constraint received_rewards_reward_type_check
  check (reward_type in ('star_bits', 'single_card', 'booster', 'card_bundle', 'season_pass_unlock'));

create table if not exists public.user_season_access (
  user_id uuid not null references auth.users(id) on delete cascade,
  season_id text not null references public.season_definitions(id) on delete cascade,
  source text not null default 'manual'
    check (source in ('subscription_eventsub', 'helix_verify', 'manual', 'pending_claim', 'received_gift')),
  twitch_event_id text,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, season_id)
);

create unique index if not exists user_season_access_event_uidx
  on public.user_season_access (twitch_event_id)
  where twitch_event_id is not null;

create table if not exists public.twitch_pending_unlocks (
  id uuid primary key default gen_random_uuid(),
  twitch_user_id text not null,
  twitch_login text,
  unlock_type text not null default 'season_pass'
    check (unlock_type in ('season_pass')),
  season_id text not null references public.season_definitions(id) on delete cascade,
  event_id text not null unique,
  rule_id uuid references public.twitch_reward_rules(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'claimed', 'expired', 'cancelled')),
  created_at timestamptz not null default now(),
  claimed_by uuid references auth.users(id) on delete set null,
  claimed_at timestamptz
);

create unique index if not exists twitch_pending_unlocks_pending_uidx
  on public.twitch_pending_unlocks (twitch_user_id, unlock_type, season_id)
  where status = 'pending';

alter table public.user_season_access enable row level security;
alter table public.twitch_pending_unlocks enable row level security;

drop policy if exists "Users read own season access" on public.user_season_access;
create policy "Users read own season access"
  on public.user_season_access for select to authenticated
  using (user_id = auth.uid());

grant select on table public.user_season_access to authenticated;
grant select, insert, update, delete on table public.user_season_access to service_role;
grant select, insert, update, delete on table public.twitch_pending_unlocks to service_role;

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.user_has_season_pass_access(requested_user_id uuid, requested_season_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  season public.season_definitions%rowtype;
begin
  select * into season from public.season_definitions where id = requested_season_id;
  if not found then
    return false;
  end if;

  if season.audience = 'all' then
    return true;
  end if;

  return exists (
    select 1
    from public.user_season_access a
    where a.user_id = requested_user_id
      and a.season_id = requested_season_id
      and a.revoked_at is null
      and (a.expires_at is null or a.expires_at > now())
  );
end;
$$;

create or replace function public.grant_season_pass_access_v1(
  requested_user_id uuid,
  requested_season_id text,
  requested_source text default 'manual',
  requested_event_id text default null,
  requested_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  season public.season_definitions%rowtype;
  saved public.user_season_access%rowtype;
begin
  if requested_user_id is null then
    raise exception 'A collector account is required.';
  end if;

  select * into season from public.season_definitions where id = requested_season_id;
  if not found then
    raise exception 'That season was not found.';
  end if;

  insert into public.user_season_access as usa (
    user_id, season_id, source, twitch_event_id, granted_at, expires_at, revoked_at, metadata
  ) values (
    requested_user_id,
    season.id,
    coalesce(nullif(requested_source, ''), 'manual'),
    nullif(requested_event_id, ''),
    now(),
    season.ends_at,
    null,
    coalesce(requested_metadata, '{}'::jsonb)
  )
  on conflict (user_id, season_id) do update set
    source = excluded.source,
    twitch_event_id = coalesce(excluded.twitch_event_id, usa.twitch_event_id),
    granted_at = now(),
    expires_at = excluded.expires_at,
    revoked_at = null,
    metadata = usa.metadata || excluded.metadata
  returning * into saved;

  return to_jsonb(saved);
end;
$$;

revoke all on function public.grant_season_pass_access_v1(uuid, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.grant_season_pass_access_v1(uuid, text, text, text, jsonb) to service_role;

create or replace function public.queue_twitch_pending_unlock_v1(
  requested_twitch_user_id text,
  requested_twitch_login text,
  requested_season_id text,
  requested_event_id text,
  requested_rule_id uuid default null,
  requested_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.twitch_pending_unlocks%rowtype;
begin
  if nullif(trim(requested_twitch_user_id), '') is null then
    raise exception 'Twitch user id is required.';
  end if;
  if nullif(trim(requested_event_id), '') is null then
    raise exception 'Event id is required.';
  end if;

  insert into public.twitch_pending_unlocks (
    twitch_user_id, twitch_login, unlock_type, season_id, event_id, rule_id, payload, status
  ) values (
    trim(requested_twitch_user_id),
    nullif(trim(coalesce(requested_twitch_login, '')), ''),
    'season_pass',
    requested_season_id,
    trim(requested_event_id),
    requested_rule_id,
    coalesce(requested_payload, '{}'::jsonb),
    'pending'
  )
  on conflict (event_id) do update set
    payload = public.twitch_pending_unlocks.payload || excluded.payload
  returning * into saved;

  return to_jsonb(saved);
end;
$$;

revoke all on function public.queue_twitch_pending_unlock_v1(text, text, text, text, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.queue_twitch_pending_unlock_v1(text, text, text, text, uuid, jsonb) to service_role;

create or replace function public.claim_pending_twitch_unlocks_v1()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  conn public.twitch_connections%rowtype;
  pending public.twitch_pending_unlocks%rowtype;
  claimed integer := 0;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  select * into conn from public.twitch_connections where user_id = uid;
  if not found then
    return jsonb_build_object('claimed', 0, 'linked', false);
  end if;

  for pending in
    select * from public.twitch_pending_unlocks
    where twitch_user_id = conn.twitch_user_id
      and status = 'pending'
    order by created_at
  loop
    perform public.grant_season_pass_access_v1(
      uid,
      pending.season_id,
      'pending_claim',
      pending.event_id,
      jsonb_build_object('pendingUnlockId', pending.id, 'ruleId', pending.rule_id)
    );

    perform public.queue_received_reward_v892(
      uid,
      'twitch',
      'season-unlock:' || pending.event_id,
      'Season Pass Unlocked',
      'Your Twitch subscription unlocked the Seasonal Collection Pass. Open this gift to confirm your access.',
      'season_pass_unlock',
      jsonb_build_object('seasonId', pending.season_id),
      null,
      jsonb_build_object('eventId', pending.event_id, 'fromPending', true),
      null
    );

    update public.twitch_pending_unlocks
    set status = 'claimed', claimed_by = uid, claimed_at = now()
    where id = pending.id;

    claimed := claimed + 1;
  end loop;

  return jsonb_build_object('claimed', claimed, 'linked', true, 'twitchLogin', conn.twitch_login);
end;
$$;

revoke all on function public.claim_pending_twitch_unlocks_v1() from public, anon;
grant execute on function public.claim_pending_twitch_unlocks_v1() to authenticated;

-- Worker / service: deliver season unlock for a Twitch viewer (linked or pending).
create or replace function public.deliver_twitch_season_unlock_v1(
  requested_twitch_user_id text,
  requested_twitch_login text,
  requested_event_id text,
  requested_rule_id uuid default null,
  requested_season_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rule public.twitch_reward_rules%rowtype;
  season_id text;
  conn public.twitch_connections%rowtype;
  queued jsonb;
  access jsonb;
begin
  if requested_rule_id is not null then
    select * into rule from public.twitch_reward_rules where id = requested_rule_id;
  end if;

  season_id := coalesce(
    nullif(requested_season_id, ''),
    rule.season_id
  );

  if season_id is null then
    raise exception 'A season id is required for Season Pass unlock.';
  end if;

  select * into conn
  from public.twitch_connections
  where twitch_user_id = trim(requested_twitch_user_id)
  limit 1;

  if found then
    access := public.grant_season_pass_access_v1(
      conn.user_id,
      season_id,
      'subscription_eventsub',
      requested_event_id,
      jsonb_build_object('ruleId', requested_rule_id, 'twitchLogin', requested_twitch_login)
    );

    queued := public.queue_received_reward_v892(
      conn.user_id,
      'twitch',
      coalesce(nullif(requested_event_id, ''), 'season-unlock:' || conn.user_id || ':' || season_id),
      'Season Pass Unlocked',
      'Thanks for subscribing! Your Seasonal Collection Pass is ready.',
      'season_pass_unlock',
      jsonb_build_object('seasonId', season_id),
      null,
      jsonb_build_object('ruleId', requested_rule_id, 'eventId', requested_event_id),
      null
    );

    insert into public.twitch_reward_grants(event_id, rule_id, user_id, twitch_user_id, reward_snapshot, source, granted_by)
    values (
      requested_event_id,
      requested_rule_id,
      conn.user_id,
      conn.twitch_user_id,
      jsonb_build_object('rewardType', 'season_pass_unlock', 'seasonId', season_id, 'receivedRewardId', queued->>'id', 'access', access),
      'twitch',
      null
    );

    return jsonb_build_object(
      'success', true,
      'linked', true,
      'userId', conn.user_id,
      'receivedRewardId', queued->>'id',
      'seasonId', season_id
    );
  end if;

  perform public.queue_twitch_pending_unlock_v1(
    requested_twitch_user_id,
    requested_twitch_login,
    season_id,
    requested_event_id,
    requested_rule_id,
    jsonb_build_object('twitchLogin', requested_twitch_login)
  );

  return jsonb_build_object(
    'success', true,
    'linked', false,
    'pending', true,
    'seasonId', season_id
  );
end;
$$;

revoke all on function public.deliver_twitch_season_unlock_v1(text, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.deliver_twitch_season_unlock_v1(text, text, text, uuid, text) to service_role;

-- Helix / worker confirms an active subscription for a linked collector.
create or replace function public.confirm_twitch_subscription_access_v1(
  requested_user_id uuid,
  requested_is_subscribed boolean,
  requested_season_id text default null,
  requested_tier text default null,
  requested_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_season_id text;
  access jsonb := null;
begin
  if requested_user_id is null then
    raise exception 'Collector id is required.';
  end if;

  selected_season_id := coalesce(
    nullif(requested_season_id, ''),
    (
      select id from public.season_definitions
      where is_active = true and audience = 'twitch_subscribers'
        and now() between starts_at and ends_at
      order by starts_at desc
      limit 1
    ),
    (
      select id from public.season_definitions
      where is_active = true and audience = 'twitch_subscribers'
      order by starts_at desc
      limit 1
    )
  );

  if selected_season_id is null then
    return jsonb_build_object('success', true, 'hasAccess', false, 'reason', 'no_subscriber_season');
  end if;

  if requested_is_subscribed then
    access := public.grant_season_pass_access_v1(
      requested_user_id,
      selected_season_id,
      'helix_verify',
      null,
      coalesce(requested_metadata, '{}'::jsonb) || jsonb_build_object('tier', requested_tier)
    );
    return jsonb_build_object('success', true, 'hasAccess', true, 'seasonId', selected_season_id, 'access', access);
  end if;

  -- Do not auto-revoke EventSub grants on a failed Helix poll; only helix_verify rows.
  update public.user_season_access
  set revoked_at = now(),
      metadata = metadata || jsonb_build_object('revokedReason', 'helix_not_subscribed', 'checkedAt', now())
  where user_id = requested_user_id
    and season_id = selected_season_id
    and source = 'helix_verify'
    and revoked_at is null;

  return jsonb_build_object(
    'success', true,
    'hasAccess', public.user_has_season_pass_access(requested_user_id, selected_season_id),
    'seasonId', selected_season_id
  );
end;
$$;

revoke all on function public.confirm_twitch_subscription_access_v1(uuid, boolean, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.confirm_twitch_subscription_access_v1(uuid, boolean, text, text, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- Claim Received Gift: season_pass_unlock
-- ---------------------------------------------------------------------------

create or replace function public.claim_my_received_reward_v892(requested_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r public.received_rewards;
  snapshot jsonb := '{}'::jsonb;
  qty integer;
  card_ids text[];
  cards_json jsonb := '[]'::jsonb;
  season_id text;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into r from public.received_rewards where id = requested_id and user_id = uid for update;
  if not found then raise exception 'Reward was not found.'; end if;
  if r.status <> 'pending' then raise exception 'This reward is no longer available.'; end if;
  if r.available_at > now() then raise exception 'This reward is not available yet.'; end if;
  if r.expires_at is not null and r.expires_at <= now() then
    update public.received_rewards set status = 'expired' where id = r.id;
    raise exception 'This reward has expired.';
  end if;

  if r.reward_type = 'star_bits' then
    qty := greatest(coalesce((r.reward_payload->>'amount')::integer, 0), 0);
    if qty <= 0 then raise exception 'This reward is invalid.'; end if;
    insert into public.user_wallets(user_id, star_bits, lifetime_star_bits_earned)
    values (uid, qty, qty)
    on conflict (user_id) do update set
      star_bits = public.user_wallets.star_bits + excluded.star_bits,
      lifetime_star_bits_earned = public.user_wallets.lifetime_star_bits_earned + excluded.lifetime_star_bits_earned,
      updated_at = now();
    snapshot := jsonb_build_object('type', 'star_bits', 'amount', qty);

  elsif r.reward_type = 'single_card' then
    qty := greatest(coalesce((r.reward_payload->>'quantity')::integer, 1), 1);
    insert into public.user_cards(user_id, card_id, quantity)
    values (uid, r.reward_payload->>'cardId', qty)
    on conflict (user_id, card_id) do update set
      quantity = public.user_cards.quantity + excluded.quantity,
      last_obtained_at = now(),
      updated_at = now();
    select jsonb_build_object(
      'type', 'single_card',
      'cards', jsonb_agg(jsonb_build_object(
        'id', c.id, 'name', c.name, 'cardNumber', c.card_number, 'rarity', c.rarity,
        'imageUrl', c.image_url, 'thumbnailUrl', c.thumbnail_url, 'quantity', qty
      ))
    ) into snapshot
    from public.cards c where c.id = r.reward_payload->>'cardId';

  elsif r.reward_type = 'booster' and nullif(r.reward_payload->>'boosterId', '') is not null then
    snapshot := public.build_and_award_booster(r.reward_payload->>'boosterId', uid);

  elsif r.reward_type in ('booster', 'card_bundle') then
    select array_agg(value::text) into card_ids
    from jsonb_array_elements_text(coalesce(r.reward_payload->'cardIds', '[]'::jsonb));
    if coalesce(cardinality(card_ids), 0) = 0 then raise exception 'This reward has no cards.'; end if;
    insert into public.user_cards(user_id, card_id, quantity)
    select uid, x.card_id, count(*)::integer
    from unnest(card_ids) x(card_id)
    group by x.card_id
    on conflict (user_id, card_id) do update set
      quantity = public.user_cards.quantity + excluded.quantity,
      last_obtained_at = now(),
      updated_at = now();
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'name', c.name, 'cardNumber', c.card_number, 'rarity', c.rarity,
      'imageUrl', c.image_url, 'thumbnailUrl', c.thumbnail_url
    ) order by u.ord), '[]'::jsonb) into cards_json
    from unnest(card_ids) with ordinality u(card_id, ord)
    join public.cards c on c.id = u.card_id;
    snapshot := jsonb_build_object('type', 'booster', 'cards', cards_json);

  elsif r.reward_type = 'season_pass_unlock' then
    season_id := nullif(r.reward_payload->>'seasonId', '');
    if season_id is null then raise exception 'This Season Pass unlock is missing a season.'; end if;
    perform public.grant_season_pass_access_v1(
      uid,
      season_id,
      'received_gift',
      coalesce(r.source_id, r.id::text),
      jsonb_build_object('receivedRewardId', r.id)
    );
    snapshot := jsonb_build_object(
      'type', 'season_pass_unlock',
      'seasonId', season_id,
      'message', 'Seasonal Collection Pass unlocked'
    );

  else
    raise exception 'Unsupported reward type.';
  end if;

  update public.received_rewards
  set status = 'claimed', claimed_snapshot = snapshot, claimed_at = now()
  where id = r.id;

  return jsonb_build_object(
    'success', true,
    'rewardId', r.id,
    'title', r.title,
    'rewardType', r.reward_type,
    'snapshot', snapshot
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Apply Twitch reward: support season_pass_unlock via rule.season_id
-- ---------------------------------------------------------------------------

create or replace function public.apply_twitch_reward_v890(
  requested_user_id uuid,
  requested_reward_type text,
  requested_star_bits bigint default null,
  requested_card_id text default null,
  requested_card_quantity integer default null,
  requested_booster_id text default null,
  requested_event_id text default null,
  requested_rule_id uuid default null,
  requested_twitch_user_id text default null,
  requested_source text default 'twitch',
  requested_granted_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
  queued jsonb;
  rule public.twitch_reward_rules%rowtype;
  season_id text;
  access jsonb;
begin
  if requested_reward_type = 'season_pass_unlock' then
    if requested_rule_id is not null then
      select * into rule from public.twitch_reward_rules where id = requested_rule_id;
      season_id := rule.season_id;
    end if;
    if season_id is null then
      raise exception 'Season Pass unlock requires a season on the Twitch reward rule.';
    end if;

    access := public.grant_season_pass_access_v1(
      requested_user_id,
      season_id,
      case when requested_source = 'manual' then 'manual' else 'subscription_eventsub' end,
      requested_event_id,
      jsonb_build_object('ruleId', requested_rule_id, 'twitchUserId', requested_twitch_user_id)
    );

    payload := jsonb_build_object('seasonId', season_id);
    queued := public.queue_received_reward_v892(
      requested_user_id,
      case when requested_source = 'manual' then 'manual' else 'twitch' end,
      coalesce(requested_event_id, requested_source || ':' || coalesce(requested_twitch_user_id, '') || ':' || extract(epoch from now())::bigint),
      'Season Pass Unlocked',
      case
        when requested_source = 'manual' then 'A Season Pass unlock was sent to you.'
        else 'Your Twitch subscription unlocked the Seasonal Collection Pass.'
      end,
      'season_pass_unlock',
      payload,
      requested_granted_by,
      jsonb_build_object('ruleId', requested_rule_id, 'twitchUserId', requested_twitch_user_id, 'eventId', requested_event_id, 'access', access),
      null
    );

    insert into public.twitch_reward_grants(event_id, rule_id, user_id, twitch_user_id, reward_snapshot, source, granted_by)
    values (
      requested_event_id,
      requested_rule_id,
      requested_user_id,
      requested_twitch_user_id,
      jsonb_build_object('pending', true, 'receivedRewardId', queued->>'id', 'rewardType', requested_reward_type, 'payload', payload, 'access', access),
      coalesce(requested_source, 'twitch'),
      requested_granted_by
    );

    return jsonb_build_object('success', true, 'pending', true, 'receivedRewardId', queued->>'id', 'seasonId', season_id);
  end if;

  payload := case requested_reward_type
    when 'star_bits' then jsonb_build_object('amount', requested_star_bits)
    when 'single_card' then jsonb_build_object('cardId', requested_card_id, 'quantity', greatest(coalesce(requested_card_quantity, 1), 1))
    when 'booster' then jsonb_build_object('boosterId', requested_booster_id)
    else '{}'::jsonb
  end;

  queued := public.queue_received_reward_v892(
    requested_user_id,
    case when requested_source = 'manual' then 'manual' else 'twitch' end,
    coalesce(requested_event_id, requested_source || ':' || coalesce(requested_twitch_user_id, '') || ':' || extract(epoch from now())::bigint),
    'Twitch reward',
    case when requested_source = 'manual' then 'A one-time reward was sent to you.' else 'Your Twitch activity unlocked a Starlight reward.' end,
    requested_reward_type,
    payload,
    requested_granted_by,
    jsonb_build_object('ruleId', requested_rule_id, 'twitchUserId', requested_twitch_user_id, 'eventId', requested_event_id),
    null
  );

  insert into public.twitch_reward_grants(event_id, rule_id, user_id, twitch_user_id, reward_snapshot, source, granted_by)
  values (
    requested_event_id,
    requested_rule_id,
    requested_user_id,
    requested_twitch_user_id,
    jsonb_build_object('pending', true, 'receivedRewardId', queued->>'id', 'rewardType', requested_reward_type, 'payload', payload),
    coalesce(requested_source, 'twitch'),
    requested_granted_by
  );

  return jsonb_build_object('success', true, 'pending', true, 'receivedRewardId', queued->>'id');
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin rule save + manual grant
-- ---------------------------------------------------------------------------

create or replace function public.admin_save_twitch_reward_rule_v890(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rid uuid := nullif(payload->>'id', '')::uuid;
  event_name text := nullif(trim(payload->>'eventType'), '');
  reward_name text := nullif(trim(payload->>'rewardType'), '');
  saved public.twitch_reward_rules;
  clean_twitch_reward_id text;
  clean_bits bigint;
  clean_card_id text;
  clean_card_quantity integer;
  clean_booster_id text;
  clean_season_id text;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if nullif(trim(payload->>'name'), '') is null then raise exception 'Enter a rule name.'; end if;
  if event_name not in ('channel_points', 'subscription', 'follow', 'manual', 'attendance') then
    raise exception 'Choose a supported Twitch event.';
  end if;
  if reward_name not in ('star_bits', 'single_card', 'booster', 'season_pass_unlock') then
    raise exception 'Choose a supported site reward.';
  end if;

  clean_twitch_reward_id := case when event_name = 'channel_points' then nullif(trim(payload->>'twitchRewardId'), '') else null end;
  if event_name = 'channel_points' and clean_twitch_reward_id is null then
    raise exception 'Select a Twitch Channel Points reward.';
  end if;

  clean_bits := case when reward_name = 'star_bits' then nullif(payload->>'starBitsAmount', '')::bigint else null end;
  clean_card_id := case when reward_name = 'single_card' then nullif(payload->>'cardId', '') else null end;
  clean_card_quantity := case when reward_name = 'single_card' then greatest(coalesce(nullif(payload->>'cardQuantity', '')::integer, 1), 1) else null end;
  clean_booster_id := case when reward_name = 'booster' then nullif(payload->>'boosterId', '') else null end;
  clean_season_id := case when reward_name = 'season_pass_unlock' then nullif(trim(payload->>'seasonId'), '') else null end;

  if reward_name = 'star_bits' and coalesce(clean_bits, 0) <= 0 then raise exception 'Enter a positive Star Bits amount.'; end if;
  if reward_name = 'single_card' and clean_card_id is null then raise exception 'Select a card.'; end if;
  if reward_name = 'booster' and clean_booster_id is null then raise exception 'Select a booster pack.'; end if;
  if reward_name = 'season_pass_unlock' and clean_season_id is null then raise exception 'Select a season for the Season Pass unlock.'; end if;

  if rid is null then
    insert into public.twitch_reward_rules(
      name, event_type, twitch_reward_id, reward_type, star_bits_amount, card_id, card_quantity,
      booster_id, season_id, cooldown_minutes, max_claims_per_user, active, created_by
    ) values (
      trim(payload->>'name'), event_name, clean_twitch_reward_id, reward_name, clean_bits, clean_card_id,
      clean_card_quantity, clean_booster_id, clean_season_id,
      coalesce(nullif(payload->>'cooldownMinutes', '')::integer, 0),
      nullif(payload->>'maxClaimsPerUser', '')::integer,
      coalesce((payload->>'active')::boolean, true),
      auth.uid()
    ) returning * into saved;
  else
    update public.twitch_reward_rules set
      name = trim(payload->>'name'),
      event_type = event_name,
      twitch_reward_id = clean_twitch_reward_id,
      reward_type = reward_name,
      star_bits_amount = clean_bits,
      card_id = clean_card_id,
      card_quantity = clean_card_quantity,
      booster_id = clean_booster_id,
      season_id = clean_season_id,
      cooldown_minutes = coalesce(nullif(payload->>'cooldownMinutes', '')::integer, 0),
      max_claims_per_user = nullif(payload->>'maxClaimsPerUser', '')::integer,
      active = coalesce((payload->>'active')::boolean, true),
      updated_at = now()
    where id = rid
    returning * into saved;
    if saved.id is null then raise exception 'Reward rule was not found.'; end if;
  end if;

  return to_jsonb(saved);
end;
$$;

create or replace function public.admin_manual_twitch_reward_v890(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target record;
  result jsonb;
  rule_id uuid;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  select * into target from public.twitch_connections where lower(twitch_login) = lower(trim(payload->>'twitchLogin'));
  if not found then raise exception 'No linked collector was found for that Twitch username.'; end if;

  if payload->>'rewardType' = 'season_pass_unlock' then
    -- Prefer an existing subscription unlock rule for the chosen season; otherwise create ephemeral via grant helper.
    select id into rule_id
    from public.twitch_reward_rules
    where reward_type = 'season_pass_unlock'
      and season_id = nullif(trim(payload->>'seasonId'), '')
      and active = true
    order by updated_at desc
    limit 1;

    if rule_id is null and nullif(trim(payload->>'seasonId'), '') is not null then
      perform public.grant_season_pass_access_v1(
        target.user_id,
        trim(payload->>'seasonId'),
        'manual',
        null,
        jsonb_build_object('adminManual', true)
      );
      result := public.queue_received_reward_v892(
        target.user_id,
        'manual',
        'manual-season:' || target.user_id || ':' || trim(payload->>'seasonId') || ':' || extract(epoch from now())::bigint,
        'Season Pass Unlocked',
        'A Season Pass unlock was sent to you.',
        'season_pass_unlock',
        jsonb_build_object('seasonId', trim(payload->>'seasonId')),
        auth.uid(),
        jsonb_build_object('manual', true),
        null
      );
      return jsonb_build_object('success', true, 'pending', true, 'receivedRewardId', result->>'id', 'collectorUserId', target.user_id, 'twitchLogin', target.twitch_login);
    end if;
  end if;

  result := public.apply_twitch_reward_v890(
    target.user_id,
    payload->>'rewardType',
    nullif(payload->>'starBitsAmount', '')::bigint,
    nullif(payload->>'cardId', ''),
    nullif(payload->>'cardQuantity', '')::integer,
    nullif(payload->>'boosterId', ''),
    null,
    rule_id,
    target.twitch_user_id,
    'manual',
    auth.uid()
  );
  return result || jsonb_build_object('collectorUserId', target.user_id, 'twitchLogin', target.twitch_login);
end;
$$;


-- ---------------------------------------------------------------------------
-- Gate Season Pass RPCs
-- ---------------------------------------------------------------------------

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
  has_access boolean;
  conn public.twitch_connections%rowtype;
  twitch_linked boolean := false;
begin
  if uid is null then
    raise exception 'Sign in required.';
  end if;

  perform public.claim_pending_twitch_unlocks_v1();

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

  has_access := public.user_has_season_pass_access(uid, season.id);
  select * into conn from public.twitch_connections where user_id = uid;
  twitch_linked := found;

  if not has_access then
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

insert into public.twitch_reward_rules (
  name, event_type, twitch_reward_id, reward_type, season_id,
  cooldown_minutes, max_claims_per_user, active
)
select
  'Season Pass Unlock (New Sub)',
  'subscription',
  null,
  'season_pass_unlock',
  'season_2026_starlight_dawn',
  0,
  1,
  true
where not exists (
  select 1 from public.twitch_reward_rules
  where reward_type = 'season_pass_unlock'
    and event_type = 'subscription'
    and season_id = 'season_2026_starlight_dawn'
);

comment on column public.season_definitions.audience is 'all = any signed-in collector; twitch_subscribers = requires user_season_access';
comment on table public.user_season_access is 'Authoritative Season Pass unlock grants for subscriber-gated seasons.';
comment on function public.deliver_twitch_season_unlock_v1(text, text, text, uuid, text) is 'Worker entry point for subscription EventSub season unlock (linked gift or pending token).';
