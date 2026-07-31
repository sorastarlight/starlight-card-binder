-- Record pull-feed activity when card rewards are opened from Received Gifts,
-- Twitch rewards, admin gifts, and redemption bundles. Also fix the daily
-- booster trigger so activity fires after cards_awarded is populated (parity
-- with shop purchases).

-- ---------------------------------------------------------------------------
-- Shared helper: record a pull event from an awarded cards JSON array
-- ---------------------------------------------------------------------------
create or replace function public.record_pull_activity_from_cards(
  requested_actor_id uuid,
  requested_source text,
  requested_cards jsonb,
  requested_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  highlight jsonb;
  actor_name text;
  summary text;
  source_label text := lower(coalesce(nullif(trim(requested_source), ''), 'reward'));
begin
  if requested_actor_id is null then
    return null;
  end if;

  if requested_cards is null
     or jsonb_typeof(requested_cards) <> 'array'
     or jsonb_array_length(requested_cards) = 0 then
    return null;
  end if;

  highlight := public.activity_highlight_from_cards(requested_cards);
  select coalesce(nullif(trim(display_name), ''), username, 'Collector')
    into actor_name
  from public.profiles
  where id = requested_actor_id;

  if highlight is not null then
    summary := actor_name || ' pulled ⭐ ' || (highlight->>'rarity') || ' ' || (highlight->>'name');
  else
    summary := case source_label
      when 'daily' then actor_name || ' opened a Daily Booster'
      when 'shop' then actor_name || ' opened a Shop pack'
      when 'twitch' then actor_name || ' opened a Twitch reward'
      when 'gift' then actor_name || ' opened a gift pack'
      when 'redeem' then actor_name || ' opened a redeemed reward'
      else actor_name || ' opened a reward pack'
    end;
  end if;

  return public.record_collector_activity(
    requested_actor_id,
    'pull',
    summary,
    coalesce(requested_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', source_label,
      'highlight', highlight,
      'cards', requested_cards
    )
  );
end;
$$;

revoke all on function public.record_pull_activity_from_cards(uuid, text, jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Daily booster: fire after cards_awarded is populated (match shop trigger)
-- ---------------------------------------------------------------------------
create or replace function public.trg_record_pull_activity_from_daily()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cards_json jsonb;
  feed_source text := 'daily';
begin
  if new.cards_awarded is null or new.cards_awarded = '[]'::jsonb then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.cards_awarded is not distinct from new.cards_awarded then
    return new;
  end if;

  cards_json := case jsonb_typeof(new.cards_awarded)
    when 'array' then new.cards_awarded
    else coalesce(new.cards_awarded->'cards', '[]'::jsonb)
  end;

  perform public.record_pull_activity_from_cards(
    new.user_id,
    feed_source,
    cards_json,
    jsonb_build_object('claimDate', new.claim_date, 'claimId', new.id)
  );

  return new;
end;
$$;

drop trigger if exists trg_daily_booster_claims_activity on public.daily_booster_claims;
create trigger trg_daily_booster_claims_activity
  after insert or update of cards_awarded on public.daily_booster_claims
  for each row
  when (new.cards_awarded is not null and new.cards_awarded <> '[]'::jsonb)
  execute function public.trg_record_pull_activity_from_daily();

-- ---------------------------------------------------------------------------
-- Shop trigger: reuse shared helper (behavior unchanged)
-- ---------------------------------------------------------------------------
create or replace function public.trg_record_pull_activity_from_shop()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  cards_json jsonb;
begin
  if new.cards_awarded is null or new.cards_awarded = '[]'::jsonb then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.cards_awarded is not distinct from new.cards_awarded then
    return new;
  end if;

  cards_json := case jsonb_typeof(new.cards_awarded)
    when 'array' then new.cards_awarded
    else coalesce(new.cards_awarded->'cards', '[]'::jsonb)
  end;

  perform public.record_pull_activity_from_cards(
    new.user_id,
    'shop',
    cards_json,
    jsonb_build_object(
      'boosterId', new.booster_id,
      'purchaseId', new.id
    )
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Received rewards: record pull activity when card packs are opened
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
  feed_source text;
  awarded_cards jsonb := '[]'::jsonb;
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

  feed_source := case lower(coalesce(r.source_type, ''))
    when 'gift' then 'gift'
    when 'twitch' then 'twitch'
    when 'manual' then 'gift'
    when 'reward_code' then 'redeem'
    else 'reward'
  end;

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
    awarded_cards := coalesce(snapshot->'cards', '[]'::jsonb);

  elsif r.reward_type = 'booster' and nullif(r.reward_payload->>'boosterId', '') is not null then
    snapshot := public.build_and_award_booster(r.reward_payload->>'boosterId', uid);
    awarded_cards := coalesce(snapshot->'cards', '[]'::jsonb);

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
    awarded_cards := cards_json;

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

  if jsonb_array_length(awarded_cards) > 0 then
    perform public.record_pull_activity_from_cards(
      uid,
      feed_source,
      awarded_cards,
      jsonb_build_object(
        'receivedRewardId', r.id,
        'sourceType', r.source_type,
        'rewardType', r.reward_type,
        'title', r.title
      )
    );
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
