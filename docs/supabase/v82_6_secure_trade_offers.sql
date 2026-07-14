-- ============================================================
-- STARLIGHT CARD BINDER V82.6
-- SECURE TRADE OFFERS AND ATOMIC CARD TRANSFERS
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','cancelled')),
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  check (proposer_id <> recipient_id)
);

create table if not exists public.trade_offer_items (
  offer_id uuid not null references public.trade_offers(id) on delete cascade,
  side text not null check (side in ('proposer','recipient')),
  card_id text not null references public.cards(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (offer_id, side, card_id)
);

create index if not exists trade_offers_proposer_idx on public.trade_offers(proposer_id, created_at desc);
create index if not exists trade_offers_recipient_idx on public.trade_offers(recipient_id, created_at desc);
create index if not exists trade_offers_status_idx on public.trade_offers(status, created_at desc);

alter table public.trade_offers enable row level security;
alter table public.trade_offer_items enable row level security;

drop policy if exists "Participants can view their trade offers" on public.trade_offers;
create policy "Participants can view their trade offers"
on public.trade_offers for select to authenticated
using ((select auth.uid()) in (proposer_id, recipient_id));

drop policy if exists "Participants can view trade offer items" on public.trade_offer_items;
create policy "Participants can view trade offer items"
on public.trade_offer_items for select to authenticated
using (exists (
  select 1 from public.trade_offers o
  where o.id = offer_id and (select auth.uid()) in (o.proposer_id, o.recipient_id)
));

create or replace function public.get_trade_offer_context(requested_username text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  target public.profiles%rowtype;
  my_cards jsonb := '[]'::jsonb;
  their_cards jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into target from public.profiles
  where lower(username)=lower(trim(requested_username)) and onboarding_complete=true limit 1;
  if not found then raise exception 'Collector not found.'; end if;
  if target.id = uid then raise exception 'You cannot trade with yourself.'; end if;

  if not coalesce((select public_lists from public.user_trade_settings where user_id=target.id),true) then
    raise exception 'This collector has private trade lists.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,
    'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesName',s.name,
    'available',least(p.trade_quantity,greatest(uc.quantity-1,0)),
    'wantedByOther',coalesce(tp.wishlisted,false)
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into my_cards
  from public.user_card_preferences p
  join public.user_cards uc on uc.user_id=uid and uc.card_id=p.card_id
  join public.cards c on c.id=p.card_id
  join public.card_series s on s.id=c.series_id
  left join public.user_card_preferences tp on tp.user_id=target.id and tp.card_id=c.id
  where p.user_id=uid and p.trade_quantity>0 and uc.quantity>1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,
    'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesName',s.name,
    'available',least(p.trade_quantity,greatest(uc.quantity-1,0)),
    'onMyWishlist',coalesce(mp.wishlisted,false)
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into their_cards
  from public.user_card_preferences p
  join public.user_cards uc on uc.user_id=target.id and uc.card_id=p.card_id
  join public.cards c on c.id=p.card_id
  join public.card_series s on s.id=c.series_id
  left join public.user_card_preferences mp on mp.user_id=uid and mp.card_id=c.id
  where p.user_id=target.id and p.trade_quantity>0 and uc.quantity>1;

  return jsonb_build_object(
    'recipient',jsonb_build_object('id',target.id,'username',target.username,'displayName',target.display_name,'avatarUrl',target.avatar_url),
    'myAvailableCards',my_cards,'theirAvailableCards',their_cards
  );
end;$$;

create or replace function public.create_trade_offer(
  requested_username text,
  offered_items jsonb,
  requested_items jsonb,
  requested_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid(); target_id uuid; new_id uuid;
  item jsonb; cid text; qty integer; allowed integer;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select id into target_id from public.profiles where lower(username)=lower(trim(requested_username)) and onboarding_complete=true limit 1;
  if target_id is null then raise exception 'Collector not found.'; end if;
  if target_id=uid then raise exception 'You cannot trade with yourself.'; end if;
  if jsonb_typeof(offered_items)<>'array' or jsonb_typeof(requested_items)<>'array' then raise exception 'Invalid trade items.'; end if;
  if jsonb_array_length(offered_items)=0 or jsonb_array_length(requested_items)=0 then raise exception 'A trade must include cards from both collectors.'; end if;
  if jsonb_array_length(offered_items)>12 or jsonb_array_length(requested_items)>12 then raise exception 'A trade may include at most 12 card types per side.'; end if;

  -- Validate proposer inventory and listed quantities.
  for item in select * from jsonb_array_elements(offered_items) loop
    cid:=nullif(trim(item->>'cardId'),''); qty:=coalesce((item->>'quantity')::integer,0);
    select least(coalesce(p.trade_quantity,0),greatest(coalesce(uc.quantity,0)-1,0)) into allowed
    from public.user_cards uc left join public.user_card_preferences p on p.user_id=uid and p.card_id=uc.card_id
    where uc.user_id=uid and uc.card_id=cid;
    if cid is null or qty<1 or qty>coalesce(allowed,0) then raise exception 'One of your offered card quantities is no longer available.'; end if;
  end loop;

  -- Validate recipient inventory and listed quantities.
  for item in select * from jsonb_array_elements(requested_items) loop
    cid:=nullif(trim(item->>'cardId'),''); qty:=coalesce((item->>'quantity')::integer,0);
    select least(coalesce(p.trade_quantity,0),greatest(coalesce(uc.quantity,0)-1,0)) into allowed
    from public.user_cards uc left join public.user_card_preferences p on p.user_id=target_id and p.card_id=uc.card_id
    where uc.user_id=target_id and uc.card_id=cid;
    if cid is null or qty<1 or qty>coalesce(allowed,0) then raise exception 'One of the requested card quantities is no longer available.'; end if;
  end loop;

  insert into public.trade_offers(proposer_id,recipient_id,note)
  values(uid,target_id,nullif(trim(requested_note),'')) returning id into new_id;

  insert into public.trade_offer_items(offer_id,side,card_id,quantity)
  select new_id,'proposer',x.card_id,sum(x.quantity)::integer
  from (select item->>'cardId' card_id,(item->>'quantity')::integer quantity from jsonb_array_elements(offered_items) item) x
  group by x.card_id;
  insert into public.trade_offer_items(offer_id,side,card_id,quantity)
  select new_id,'recipient',x.card_id,sum(x.quantity)::integer
  from (select item->>'cardId' card_id,(item->>'quantity')::integer quantity from jsonb_array_elements(requested_items) item) x
  group by x.card_id;

  return jsonb_build_object('success',true,'offerId',new_id);
end;$$;

create or replace function public.get_my_trade_offers()
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid:=auth.uid(); incoming jsonb; outgoing jsonb;
begin
 if uid is null then raise exception 'You must be signed in.'; end if;
 with offer_data as (
   select o.*,
     pp.username proposer_username,pp.display_name proposer_name,pp.avatar_url proposer_avatar,
     rp.username recipient_username,rp.display_name recipient_name,rp.avatar_url recipient_avatar,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='proposer'),'[]'::jsonb) proposer_items,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='recipient'),'[]'::jsonb) recipient_items
   from public.trade_offers o join public.profiles pp on pp.id=o.proposer_id join public.profiles rp on rp.id=o.recipient_id
   where uid in(o.proposer_id,o.recipient_id)
 )
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into incoming from offer_data x where x.recipient_id=uid;
 with offer_data as (
   select o.*,
     pp.username proposer_username,pp.display_name proposer_name,pp.avatar_url proposer_avatar,
     rp.username recipient_username,rp.display_name recipient_name,rp.avatar_url recipient_avatar,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='proposer'),'[]'::jsonb) proposer_items,
     coalesce((select jsonb_agg(jsonb_build_object('cardId',i.card_id,'quantity',i.quantity,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'thumbnailUrl',c.thumbnail_url,'imageUrl',c.image_url) order by c.sort_order) from public.trade_offer_items i join public.cards c on c.id=i.card_id where i.offer_id=o.id and i.side='recipient'),'[]'::jsonb) recipient_items
   from public.trade_offers o join public.profiles pp on pp.id=o.proposer_id join public.profiles rp on rp.id=o.recipient_id
   where uid in(o.proposer_id,o.recipient_id)
 )
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc),'[]'::jsonb) into outgoing from offer_data x where x.proposer_id=uid;
 return jsonb_build_object('incoming',incoming,'outgoing',outgoing);
end;$$;

create or replace function public.respond_to_trade_offer(requested_offer_id uuid, requested_action text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
 uid uuid:=auth.uid(); offer public.trade_offers%rowtype; item record; available integer;
begin
 if uid is null then raise exception 'You must be signed in.'; end if;
 select * into offer from public.trade_offers where id=requested_offer_id for update;
 if not found then raise exception 'Trade offer not found.'; end if;
 if offer.status<>'pending' then raise exception 'This trade offer is no longer pending.'; end if;
 if requested_action='cancel' then
   if offer.proposer_id<>uid then raise exception 'Only the sender can cancel this offer.'; end if;
   update public.trade_offers set status='cancelled',updated_at=now(),responded_at=now() where id=offer.id;
   return jsonb_build_object('success',true,'status','cancelled');
 elsif requested_action='decline' then
   if offer.recipient_id<>uid then raise exception 'Only the recipient can decline this offer.'; end if;
   update public.trade_offers set status='declined',updated_at=now(),responded_at=now() where id=offer.id;
   return jsonb_build_object('success',true,'status','declined');
 elsif requested_action<>'accept' then raise exception 'Invalid trade action.'; end if;
 if offer.recipient_id<>uid then raise exception 'Only the recipient can accept this offer.'; end if;

 -- Lock both users' relevant ownership rows and revalidate listed extras.
 perform 1 from public.user_cards uc where uc.user_id in(offer.proposer_id,offer.recipient_id) and uc.card_id in(select card_id from public.trade_offer_items where offer_id=offer.id) for update;
 for item in select * from public.trade_offer_items where offer_id=offer.id loop
   if item.side='proposer' then
     select least(coalesce(p.trade_quantity,0),greatest(coalesce(uc.quantity,0)-1,0)) into available
     from public.user_cards uc left join public.user_card_preferences p on p.user_id=offer.proposer_id and p.card_id=uc.card_id
     where uc.user_id=offer.proposer_id and uc.card_id=item.card_id;
   else
     select least(coalesce(p.trade_quantity,0),greatest(coalesce(uc.quantity,0)-1,0)) into available
     from public.user_cards uc left join public.user_card_preferences p on p.user_id=offer.recipient_id and p.card_id=uc.card_id
     where uc.user_id=offer.recipient_id and uc.card_id=item.card_id;
   end if;
   if item.quantity>coalesce(available,0) then raise exception 'A listed card is no longer available. The trade was not completed.'; end if;
 end loop;

 -- Remove cards from each source while always retaining at least one copy.
 update public.user_cards uc set quantity=uc.quantity-i.quantity,updated_at=now(),last_obtained_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer' and uc.user_id=offer.proposer_id and uc.card_id=i.card_id;
 update public.user_cards uc set quantity=uc.quantity-i.quantity,updated_at=now(),last_obtained_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient' and uc.user_id=offer.recipient_id and uc.card_id=i.card_id;

 -- Add exchanged cards to the other collector.
 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select offer.recipient_id,i.card_id,i.quantity,false,now(),now(),now() from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer'
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select offer.proposer_id,i.card_id,i.quantity,false,now(),now(),now() from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient'
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();

 -- Reduce public trade quantities by what was exchanged.
 update public.user_card_preferences p set trade_quantity=greatest(0,p.trade_quantity-i.quantity),updated_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer' and p.user_id=offer.proposer_id and p.card_id=i.card_id;
 update public.user_card_preferences p set trade_quantity=greatest(0,p.trade_quantity-i.quantity),updated_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient' and p.user_id=offer.recipient_id and p.card_id=i.card_id;

 update public.trade_offers set status='accepted',updated_at=now(),responded_at=now() where id=offer.id;
 return jsonb_build_object('success',true,'status','accepted');
end;$$;

revoke all on function public.get_trade_offer_context(text) from public,anon;
revoke all on function public.create_trade_offer(text,jsonb,jsonb,text) from public,anon;
revoke all on function public.get_my_trade_offers() from public,anon;
revoke all on function public.respond_to_trade_offer(uuid,text) from public,anon;
grant execute on function public.get_trade_offer_context(text) to authenticated;
grant execute on function public.create_trade_offer(text,jsonb,jsonb,text) to authenticated;
grant execute on function public.get_my_trade_offers() to authenticated;
grant execute on function public.respond_to_trade_offer(uuid,text) to authenticated;
