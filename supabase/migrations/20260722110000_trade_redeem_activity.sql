-- Record pull-feed activity for accepted trades and reward code redemptions.

create or replace function public.respond_to_trade_offer(requested_offer_id uuid, requested_action text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  offer public.trade_offers%rowtype;
  item record;
  available integer;
  recipient_name text;
  proposer_name text;
  proposer_username text;
  recipient_username text;
  highlight jsonb;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into offer from public.trade_offers where id = requested_offer_id for update;
  if not found then raise exception 'Trade offer not found.'; end if;
  if offer.status <> 'pending' then raise exception 'This trade offer is no longer pending.'; end if;

  if requested_action = 'cancel' then
    if offer.proposer_id <> uid then raise exception 'Only the sender can cancel this offer.'; end if;
    update public.trade_offers set status = 'cancelled', updated_at = now(), responded_at = now() where id = offer.id;
    return jsonb_build_object('success', true, 'status', 'cancelled');
  elsif requested_action = 'decline' then
    if offer.recipient_id <> uid then raise exception 'Only the recipient can decline this offer.'; end if;
    update public.trade_offers set status = 'declined', updated_at = now(), responded_at = now() where id = offer.id;
    return jsonb_build_object('success', true, 'status', 'declined');
  elsif requested_action <> 'accept' then
    raise exception 'Invalid trade action.';
  end if;

  if offer.recipient_id <> uid then raise exception 'Only the recipient can accept this offer.'; end if;

  perform 1
  from public.user_cards uc
  where uc.user_id in (offer.proposer_id, offer.recipient_id)
    and uc.card_id in (select card_id from public.trade_offer_items where offer_id = offer.id)
  for update;

  for item in select * from public.trade_offer_items where offer_id = offer.id loop
    if item.side = 'proposer' then
      select greatest(quantity - 1, 0) into available
      from public.user_cards
      where user_id = offer.proposer_id and card_id = item.card_id;
    else
      select greatest(quantity - 1, 0) into available
      from public.user_cards
      where user_id = offer.recipient_id and card_id = item.card_id;
    end if;
    if item.quantity > coalesce(available, 0) then
      raise exception 'A duplicate card is no longer available. The trade was not completed.';
    end if;
  end loop;

  update public.user_cards uc
  set quantity = uc.quantity - i.quantity, updated_at = now(), last_obtained_at = now()
  from public.trade_offer_items i
  where i.offer_id = offer.id and i.side = 'proposer'
    and uc.user_id = offer.proposer_id and uc.card_id = i.card_id;

  update public.user_cards uc
  set quantity = uc.quantity - i.quantity, updated_at = now(), last_obtained_at = now()
  from public.trade_offer_items i
  where i.offer_id = offer.id and i.side = 'recipient'
    and uc.user_id = offer.recipient_id and uc.card_id = i.card_id;

  insert into public.user_cards(user_id, card_id, quantity, is_favorite, first_obtained_at, last_obtained_at, updated_at)
  select offer.recipient_id, i.card_id, i.quantity, false, now(), now(), now()
  from public.trade_offer_items i
  where i.offer_id = offer.id and i.side = 'proposer'
  on conflict (user_id, card_id) do update
    set quantity = public.user_cards.quantity + excluded.quantity,
        last_obtained_at = now(),
        updated_at = now();

  insert into public.user_cards(user_id, card_id, quantity, is_favorite, first_obtained_at, last_obtained_at, updated_at)
  select offer.proposer_id, i.card_id, i.quantity, false, now(), now(), now()
  from public.trade_offer_items i
  where i.offer_id = offer.id and i.side = 'recipient'
  on conflict (user_id, card_id) do update
    set quantity = public.user_cards.quantity + excluded.quantity,
        last_obtained_at = now(),
        updated_at = now();

  update public.user_card_preferences p
  set trade_quantity = greatest(0, p.trade_quantity - i.quantity), updated_at = now()
  from public.trade_offer_items i
  where i.offer_id = offer.id and i.side = 'proposer'
    and p.user_id = offer.proposer_id and p.card_id = i.card_id;

  update public.user_card_preferences p
  set trade_quantity = greatest(0, p.trade_quantity - i.quantity), updated_at = now()
  from public.trade_offer_items i
  where i.offer_id = offer.id and i.side = 'recipient'
    and p.user_id = offer.recipient_id and p.card_id = i.card_id;

  update public.trade_offers
  set status = 'accepted', updated_at = now(), responded_at = now()
  where id = offer.id;

  select coalesce(nullif(trim(display_name), ''), username, 'Collector'), username
    into recipient_name, recipient_username
  from public.profiles where id = offer.recipient_id;

  select coalesce(nullif(trim(display_name), ''), username, 'Collector'), username
    into proposer_name, proposer_username
  from public.profiles where id = offer.proposer_id;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url
  )
  into highlight
  from public.trade_offer_items i
  join public.cards c on c.id = i.card_id
  where i.offer_id = offer.id and i.side = 'proposer'
  order by public.rarity_rank(c.rarity) desc, c.name
  limit 1;

  if highlight is not null then
    perform public.record_collector_activity(
      offer.recipient_id,
      'trade',
      recipient_name || ' traded for ' || (highlight->>'rarity') || ' ' || (highlight->>'name'),
      jsonb_build_object(
        'offerId', offer.id,
        'partnerUsername', proposer_username,
        'highlight', highlight
      )
    );
  else
    perform public.record_collector_activity(
      offer.recipient_id,
      'trade',
      recipient_name || ' completed a trade with @' || coalesce(proposer_username, 'collector'),
      jsonb_build_object('offerId', offer.id, 'partnerUsername', proposer_username)
    );
  end if;

  perform public.record_collector_activity(
    offer.proposer_id,
    'trade',
    proposer_name || ' completed a trade with @' || coalesce(recipient_username, 'collector'),
    jsonb_build_object('offerId', offer.id, 'partnerUsername', recipient_username, 'highlight', highlight)
  );

  return jsonb_build_object('success', true, 'status', 'accepted');
end;
$function$;

create or replace function public.redeem_reward_code(requested_code text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  normalized text;
  generated_hash text;
  c public.reward_codes%rowtype;
  rw public.reward_code_rewards%rowtype;
  redemption_id bigint;
  queued jsonb;
  payload jsonb;
  actor_name text;
begin
  if uid is null then raise exception 'You must be signed in to redeem a code.'; end if;
  normalized := regexp_replace(upper(trim(requested_code)), '[^A-Z0-9]', '', 'g');
  if normalized = '' then raise exception 'Enter a redemption code.'; end if;
  generated_hash := encode(digest(normalized, 'sha256'), 'hex');
  select * into c from public.reward_codes where code_hash = generated_hash for update;
  if not found then
    return jsonb_build_object('success', false, 'message', 'That redemption code is not valid.');
  end if;
  if not c.active
     or (c.starts_at is not null and now() < c.starts_at)
     or (c.expires_at is not null and now() >= c.expires_at)
     or (c.max_uses is not null and c.current_uses >= c.max_uses) then
    return jsonb_build_object('success', false, 'message', 'That redemption code is not currently available.');
  end if;

  insert into public.reward_code_redemptions(code_id, user_id)
  values (c.id, uid)
  on conflict (code_id, user_id) do nothing
  returning id into redemption_id;

  if redemption_id is null then
    return jsonb_build_object('success', false, 'message', 'You have already redeemed this code.');
  end if;

  select * into rw from public.reward_code_rewards where code_id = c.id;
  payload := case rw.reward_type
    when 'star_bits' then jsonb_build_object('amount', rw.star_bits_amount)
    when 'single_card' then jsonb_build_object('cardId', rw.card_id, 'quantity', rw.card_quantity)
    else jsonb_build_object('cardIds', to_jsonb(rw.booster_card_ids))
  end;

  queued := public.queue_received_reward_v892(
    uid,
    'reward_code',
    c.id::text,
    c.label,
    'A reward code was redeemed and is ready to open.',
    case when rw.reward_type = 'booster' then 'card_bundle' else rw.reward_type end,
    payload,
    null,
    jsonb_build_object('redemptionId', redemption_id),
    c.expires_at
  );

  update public.reward_codes
  set current_uses = current_uses + 1, updated_at = now()
  where id = c.id;

  update public.reward_code_redemptions
  set reward_snapshot = jsonb_build_object(
    'pending', true,
    'receivedRewardId', queued->>'id',
    'label', c.label,
    'rewardType', rw.reward_type
  )
  where id = redemption_id;

  select coalesce(nullif(trim(display_name), ''), username, 'Collector')
    into actor_name
  from public.profiles where id = uid;

  perform public.record_collector_activity(
    uid,
    'redeem',
    actor_name || ' redeemed ' || coalesce(nullif(trim(c.label), ''), 'a reward code'),
    jsonb_build_object(
      'codeId', c.id,
      'label', c.label,
      'rewardType', rw.reward_type,
      'receivedRewardId', queued->>'id'
    )
  );

  return jsonb_build_object(
    'success', true,
    'pending', true,
    'receivedRewardId', queued->>'id',
    'label', c.label,
    'rewardType', rw.reward_type,
    'message', 'Reward added to Received Rewards.'
  );
end;
$function$;
