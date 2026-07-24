-- Starlight Evolution: 6-tier ladder + unfuse with floor(half) refund.
-- Storage column remains prestige_tier; product copy is Starlight Evolution.

-- ---------------------------------------------------------------------------
-- 1. New tier allowlist; reset all rows to stardust (quantities unchanged)
-- ---------------------------------------------------------------------------

alter table public.user_cards
  drop constraint if exists user_cards_prestige_tier_check;

update public.user_cards
set prestige_tier = 'stardust'
where prestige_tier is distinct from 'stardust';

alter table public.user_cards
  add constraint user_cards_prestige_tier_check
  check (prestige_tier in (
    'stardust',
    'star_bit',
    'protostar',
    'starlight',
    'super_starlight',
    'starlight_burst'
  ));

comment on column public.user_cards.prestige_tier is
  'Starlight Evolution tier (stardust → star_bit → protostar → starlight → super_starlight → starlight_burst). Raised via fuse_my_card; lowered via unfuse_my_card; never derived from quantity.';

-- ---------------------------------------------------------------------------
-- 2. Evolution helpers (keep fusion_* names for compatibility)
-- ---------------------------------------------------------------------------

create or replace function public.fusion_cost_for_next_tier(current_tier text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(current_tier), ''), 'stardust'))
    when 'stardust' then 8
    when 'star_bit' then 20
    when 'protostar' then 45
    when 'starlight' then 100
    when 'super_starlight' then 220
    else null
  end;
$$;

create or replace function public.next_fusion_tier(current_tier text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(current_tier), ''), 'stardust'))
    when 'stardust' then 'star_bit'
    when 'star_bit' then 'protostar'
    when 'protostar' then 'starlight'
    when 'starlight' then 'super_starlight'
    when 'super_starlight' then 'starlight_burst'
    else null
  end;
$$;

create or replace function public.previous_fusion_tier(current_tier text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(current_tier), ''), 'stardust'))
    when 'star_bit' then 'stardust'
    when 'protostar' then 'star_bit'
    when 'starlight' then 'protostar'
    when 'super_starlight' then 'starlight'
    when 'starlight_burst' then 'super_starlight'
    else null
  end;
$$;

create or replace function public.fusion_cost_for_previous_step(current_tier text)
returns integer
language sql
immutable
as $$
  -- Cost that was spent to reach current_tier from the previous tier.
  select public.fusion_cost_for_next_tier(public.previous_fusion_tier(current_tier));
$$;

create or replace function public.fusion_tier_label(tier text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(tier), ''), 'stardust'))
    when 'star_bit' then '★ Star Bit'
    when 'protostar' then '★★ Protostar'
    when 'starlight' then '★★★ Starlight'
    when 'super_starlight' then '★★★★ Super Starlight'
    when 'starlight_burst' then '★★★★★ Starlight Burst'
    else '☆ Stardust'
  end;
$$;

-- ---------------------------------------------------------------------------
-- 3. fuse_my_card RPC (evolve one step)
-- ---------------------------------------------------------------------------

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
    raise exception 'This card is already at Starlight Burst.';
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

-- ---------------------------------------------------------------------------
-- 4. unfuse_my_card RPC (step down + floor(half) refund)
-- ---------------------------------------------------------------------------

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
    raise exception 'This card is already at Stardust.';
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

revoke all on function public.fusion_cost_for_next_tier(text) from public, anon;
revoke all on function public.next_fusion_tier(text) from public, anon;
revoke all on function public.previous_fusion_tier(text) from public, anon;
revoke all on function public.fusion_cost_for_previous_step(text) from public, anon;
revoke all on function public.fusion_tier_label(text) from public, anon;
revoke all on function public.fuse_my_card(text) from public, anon;
revoke all on function public.unfuse_my_card(text) from public, anon;

grant execute on function public.fusion_cost_for_next_tier(text) to authenticated, service_role;
grant execute on function public.next_fusion_tier(text) to authenticated, service_role;
grant execute on function public.previous_fusion_tier(text) to authenticated, service_role;
grant execute on function public.fusion_cost_for_previous_step(text) to authenticated, service_role;
grant execute on function public.fusion_tier_label(text) to authenticated, service_role;
grant execute on function public.fuse_my_card(text) to authenticated, service_role;
grant execute on function public.unfuse_my_card(text) to authenticated, service_role;

comment on function public.fuse_my_card(text) is
  'Consumes duplicate extras to raise a Starlight Evolution tier. Never drops below 1 copy.';

comment on function public.unfuse_my_card(text) is
  'Steps a Starlight Evolution tier down one level and refunds floor(half) of that step cost as quantity.';
