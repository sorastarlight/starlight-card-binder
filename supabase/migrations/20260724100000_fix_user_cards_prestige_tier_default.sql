-- Pack/grant INSERTs into user_cards omit prestige_tier and relied on the column
-- default. Starlight Evolution updated the check constraint to stardust/… but left
-- the default as 'standard', causing:
--   new row for relation "user_cards" violates check constraint
--   "user_cards_prestige_tier_check"

alter table public.user_cards
  alter column prestige_tier set default 'stardust';

-- Remap any legacy tier values that would fail the Starlight Evolution check.
update public.user_cards
set
  prestige_tier = case lower(coalesce(nullif(trim(prestige_tier), ''), 'stardust'))
    when 'stardust' then 'stardust'
    when 'star_bit' then 'star_bit'
    when 'protostar' then 'protostar'
    when 'starlight' then 'starlight'
    when 'super_starlight' then 'super_starlight'
    when 'starlight_burst' then 'starlight_burst'
    else 'stardust'
  end,
  updated_at = now()
where lower(coalesce(nullif(trim(prestige_tier), ''), '')) not in (
  'stardust',
  'star_bit',
  'protostar',
  'starlight',
  'super_starlight',
  'starlight_burst'
);

alter table public.user_cards
  drop constraint if exists user_cards_prestige_tier_check;

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
  'Starlight Evolution tier (stardust → star_bit → protostar → starlight → super_starlight → starlight_burst). Default stardust for newly granted cards.';
