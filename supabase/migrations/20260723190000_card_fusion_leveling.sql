-- Card Fusion leveling: replace quantity-threshold prestige with active fusion tiers.
-- Fusion consumes duplicate extras (quantity - 1 available). Exchange/trade never demotes fusion level.

-- ---------------------------------------------------------------------------
-- 1. Drop quantity → prestige sync
-- ---------------------------------------------------------------------------

drop trigger if exists trg_user_cards_prestige_tier on public.user_cards;
drop function if exists public.sync_user_card_prestige_tier();
drop function if exists public.prestige_tier_from_quantity(integer);

-- ---------------------------------------------------------------------------
-- 2. New tier values; reset all rows to standard (quantities unchanged)
-- ---------------------------------------------------------------------------

alter table public.user_cards
  drop constraint if exists user_cards_prestige_tier_check;

update public.user_cards
set prestige_tier = 'standard'
where prestige_tier is distinct from 'standard';

alter table public.user_cards
  add constraint user_cards_prestige_tier_check
  check (prestige_tier in ('standard', 'rookie', 'champion', 'ultimate', 'mega'));

comment on column public.user_cards.prestige_tier is
  'Fusion level frame (standard → rookie → champion → ultimate → mega). Raised only via fuse_my_card; never derived from quantity.';

-- ---------------------------------------------------------------------------
-- 3. Fusion helpers
-- ---------------------------------------------------------------------------

create or replace function public.fusion_cost_for_next_tier(current_tier text)
returns integer
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(current_tier), ''), 'standard'))
    when 'standard' then 10
    when 'rookie' then 25
    when 'champion' then 75
    when 'ultimate' then 200
    else null
  end;
$$;

create or replace function public.next_fusion_tier(current_tier text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(current_tier), ''), 'standard'))
    when 'standard' then 'rookie'
    when 'rookie' then 'champion'
    when 'champion' then 'ultimate'
    when 'ultimate' then 'mega'
    else null
  end;
$$;

create or replace function public.fusion_tier_label(tier text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(nullif(trim(tier), ''), 'standard'))
    when 'rookie' then 'Rookie'
    when 'champion' then 'Champion'
    when 'ultimate' then 'Ultimate'
    when 'mega' then 'Mega'
    else 'Standard'
  end;
$$;

-- ---------------------------------------------------------------------------
-- 4. fuse_my_card RPC
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

  locked_tier := lower(coalesce(nullif(trim(locked_tier), ''), 'standard'));
  next_tier := public.next_fusion_tier(locked_tier);
  fuse_cost := public.fusion_cost_for_next_tier(locked_tier);

  if next_tier is null or fuse_cost is null then
    raise exception 'This card is already at Mega fusion.';
  end if;

  extras := greatest(coalesce(locked_qty, 0) - 1, 0);
  if extras < fuse_cost then
    raise exception
      'Not enough duplicates to fuse. Need % extras (have %).',
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
    'label', public.fusion_tier_label(next_tier),
    'cost', fuse_cost,
    'previousTier', locked_tier
  );
end;
$$;

revoke all on function public.fusion_cost_for_next_tier(text) from public, anon;
revoke all on function public.next_fusion_tier(text) from public, anon;
revoke all on function public.fusion_tier_label(text) from public, anon;
revoke all on function public.fuse_my_card(text) from public, anon;

grant execute on function public.fusion_cost_for_next_tier(text) to authenticated, service_role;
grant execute on function public.next_fusion_tier(text) to authenticated, service_role;
grant execute on function public.fusion_tier_label(text) to authenticated, service_role;
grant execute on function public.fuse_my_card(text) to authenticated, service_role;

comment on function public.fuse_my_card(text) is
  'Consumes duplicate extras to raise a card fusion level. Never drops below 1 copy; never demotes on trade/gift.';
