-- Starlight Evolution display labels → Radiance I–V (storage keys unchanged).

create or replace function public.fusion_tier_label(tier text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(tier), ''), 'stardust'))
    when 'star_bit' then '⭐ Radiance I'
    when 'protostar' then '⭐⭐ Radiance II'
    when 'starlight' then '⭐⭐⭐ Radiance III'
    when 'super_starlight' then '⭐⭐⭐⭐ Radiance IV'
    when 'starlight_burst' then '⭐⭐⭐⭐⭐ Radiance V'
    else 'Standard'
  end;
$$;

create or replace function public.fuse_my_card(requested_card_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  locked_qty integer;
  locked_tier text;
  next_tier text;
  fuse_cost integer;
  extras integer;
  new_qty integer;
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  if coalesce(nullif(trim(requested_card_id), ''), '') = '' then
    raise exception 'Card id is required.';
  end if;

  select quantity, prestige_tier
  into locked_qty, locked_tier
  from public.user_cards
  where user_id = uid
    and card_id = requested_card_id
  for update;

  if not found then
    raise exception 'You do not own this card.';
  end if;

  locked_tier := lower(coalesce(nullif(trim(locked_tier), ''), 'stardust'));
  next_tier := public.next_fusion_tier(locked_tier);
  fuse_cost := public.fusion_cost_for_next_tier(locked_tier);

  if next_tier is null or fuse_cost is null then
    raise exception 'This card is already at Radiance V.';
  end if;

  extras := greatest(coalesce(locked_qty, 0) - 1, 0);
  if extras < fuse_cost then
    raise exception
      'Not enough duplicates to evolve. Need % extras (have %).',
      fuse_cost,
      extras;
  end if;

  new_qty := locked_qty - fuse_cost;

  update public.user_cards
  set
    quantity = new_qty,
    prestige_tier = next_tier,
    updated_at = now()
  where user_id = uid
    and card_id = requested_card_id;

  return jsonb_build_object(
    'success', true,
    'cardId', requested_card_id,
    'quantity', new_qty,
    'fusionTier', next_tier,
    'prestigeTier', next_tier,
    'evolutionTier', next_tier,
    'label', public.fusion_tier_label(next_tier),
    'cost', fuse_cost,
    'previousTier', locked_tier
  );
end;
$$;

create or replace function public.unfuse_my_card(requested_card_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  locked_qty integer;
  locked_tier text;
  prev_tier text;
  step_cost integer;
  refund integer;
  new_qty integer;
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  if coalesce(nullif(trim(requested_card_id), ''), '') = '' then
    raise exception 'Card id is required.';
  end if;

  select quantity, prestige_tier
  into locked_qty, locked_tier
  from public.user_cards
  where user_id = uid
    and card_id = requested_card_id
  for update;

  if not found then
    raise exception 'You do not own this card.';
  end if;

  locked_tier := lower(coalesce(nullif(trim(locked_tier), ''), 'stardust'));
  prev_tier := public.previous_fusion_tier(locked_tier);
  step_cost := public.fusion_cost_for_previous_step(locked_tier);

  if prev_tier is null or step_cost is null then
    raise exception 'This card has not been evolved yet.';
  end if;

  refund := floor(step_cost / 2.0)::integer;
  new_qty := greatest(coalesce(locked_qty, 1), 1) + refund;

  update public.user_cards
  set
    quantity = new_qty,
    prestige_tier = prev_tier,
    updated_at = now()
  where user_id = uid
    and card_id = requested_card_id;

  return jsonb_build_object(
    'success', true,
    'cardId', requested_card_id,
    'quantity', new_qty,
    'fusionTier', prev_tier,
    'prestigeTier', prev_tier,
    'evolutionTier', prev_tier,
    'label', public.fusion_tier_label(prev_tier),
    'refund', refund,
    'stepCost', step_cost,
    'previousTier', locked_tier
  );
end;
$$;
