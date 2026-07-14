-- ============================================================
-- STARLIGHT CARD BINDER V82.4
-- WISHLIST + FOR-TRADE FOUNDATION
-- ============================================================

create table if not exists public.user_card_preferences (
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  wishlisted boolean not null default false,
  trade_quantity integer not null default 0 check (trade_quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table if not exists public.user_trade_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  public_lists boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.user_card_preferences enable row level security;
alter table public.user_trade_settings enable row level security;

drop policy if exists "Users can view their card preferences" on public.user_card_preferences;
create policy "Users can view their card preferences"
on public.user_card_preferences for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can view their trade settings" on public.user_trade_settings;
create policy "Users can view their trade settings"
on public.user_trade_settings for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.get_my_trade_lists()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  result_cards jsonb;
  public_setting boolean := true;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;

  insert into public.user_trade_settings(user_id)
  values(uid) on conflict(user_id) do nothing;

  select public_lists into public_setting
  from public.user_trade_settings where user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'ownedQuantity', coalesce(uc.quantity,0),
    'duplicateQuantity', greatest(coalesce(uc.quantity,0)-1,0),
    'wishlisted', coalesce(p.wishlisted,false),
    'tradeQuantity', least(coalesce(p.trade_quantity,0), greatest(coalesce(uc.quantity,0)-1,0))
  ) order by s.sort_order, c.sort_order), '[]'::jsonb)
  into result_cards
  from public.cards c
  join public.card_series s on s.id = c.series_id
  left join public.user_cards uc on uc.user_id = uid and uc.card_id = c.id
  left join public.user_card_preferences p on p.user_id = uid and p.card_id = c.id
  where c.is_visible = true and c.is_collectible = true;

  return jsonb_build_object('publicLists', public_setting, 'cards', result_cards);
end;
$$;

create or replace function public.set_card_trade_preference(
  requested_card_id text,
  requested_wishlisted boolean,
  requested_trade_quantity integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  owned_qty integer := 0;
  max_trade integer := 0;
  final_trade integer := 0;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  if not exists(select 1 from public.cards where id = requested_card_id and is_visible = true) then
    raise exception 'Card not found.';
  end if;

  select coalesce(quantity,0) into owned_qty
  from public.user_cards where user_id = uid and card_id = requested_card_id;
  max_trade := greatest(owned_qty - 1, 0);
  final_trade := least(greatest(coalesce(requested_trade_quantity,0),0), max_trade);

  insert into public.user_card_preferences(user_id, card_id, wishlisted, trade_quantity, updated_at)
  values(uid, requested_card_id, coalesce(requested_wishlisted,false), final_trade, now())
  on conflict(user_id, card_id) do update set
    wishlisted = excluded.wishlisted,
    trade_quantity = excluded.trade_quantity,
    updated_at = now();

  return jsonb_build_object('success',true,'cardId',requested_card_id,'wishlisted',coalesce(requested_wishlisted,false),'tradeQuantity',final_trade,'maximumTradeQuantity',max_trade);
end;
$$;

create or replace function public.set_trade_list_visibility(requested_public boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  insert into public.user_trade_settings(user_id, public_lists, updated_at)
  values(uid, coalesce(requested_public,true), now())
  on conflict(user_id) do update set public_lists = excluded.public_lists, updated_at = now();
  return jsonb_build_object('success',true,'publicLists',coalesce(requested_public,true));
end;
$$;

revoke all on function public.get_my_trade_lists() from public, anon;
revoke all on function public.set_card_trade_preference(text,boolean,integer) from public, anon;
revoke all on function public.set_trade_list_visibility(boolean) from public, anon;
grant execute on function public.get_my_trade_lists() to authenticated;
grant execute on function public.set_card_trade_preference(text,boolean,integer) to authenticated;
grant execute on function public.set_trade_list_visibility(boolean) to authenticated;
