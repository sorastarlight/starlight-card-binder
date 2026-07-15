-- ============================================================
-- STARLIGHT CARD BINDER V88.2
-- Notification preferences, reliable dismissal, trade fixes
-- Rerunnable migration
-- ============================================================

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_booster boolean not null default true,
  trade boolean not null default true,
  achievement boolean not null default true,
  reward boolean not null default true,
  event boolean not null default true,
  broadcast boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.notification_dismissals (
  user_id uuid not null references auth.users(id) on delete cascade,
  source_key text not null,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, source_key)
);

alter table public.notification_preferences enable row level security;
alter table public.notification_dismissals enable row level security;

drop policy if exists "Users can view their notification preferences" on public.notification_preferences;
create policy "Users can view their notification preferences"
on public.notification_preferences for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can update their notification preferences" on public.notification_preferences;
create policy "Users can update their notification preferences"
on public.notification_preferences for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can view their notification dismissals" on public.notification_dismissals;
create policy "Users can view their notification dismissals"
on public.notification_dismissals for select to authenticated
using (auth.uid() = user_id);

create or replace function public.notification_type_enabled_v882(
  requested_user_id uuid,
  requested_type text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare p public.notification_preferences%rowtype;
begin
  select * into p from public.notification_preferences where user_id = requested_user_id;
  if not found then return true; end if;
  return case lower(coalesce(requested_type,'general'))
    when 'daily_booster' then p.daily_booster
    when 'trade' then p.trade
    when 'achievement' then p.achievement
    when 'reward' then p.reward
    when 'event' then p.event
    when 'broadcast' then p.broadcast
    else true
  end;
end;$$;

revoke all on function public.notification_type_enabled_v882(uuid,text) from public,anon,authenticated;

create or replace function public.create_user_notification_v881(
  requested_user_id uuid, requested_type text, requested_title text, requested_body text,
  requested_icon text default '✦', requested_route text default null,
  requested_route_params jsonb default '{}'::jsonb, requested_source_key text default null,
  requested_expires_at timestamptz default null
) returns bigint language plpgsql security definer set search_path=public as $$
declare new_id bigint; normalized_source text:=nullif(trim(requested_source_key),'');
begin
  if requested_user_id is null or nullif(trim(requested_title),'') is null then return null; end if;
  if not public.notification_type_enabled_v882(requested_user_id, requested_type) then return null; end if;
  if normalized_source is not null and exists(
    select 1 from public.notification_dismissals d
    where d.user_id=requested_user_id and d.source_key=normalized_source
  ) then return null; end if;
  insert into public.user_notifications(user_id,notification_type,title,body,icon,route,route_params,source_key,expires_at)
  values(requested_user_id,coalesce(nullif(trim(requested_type),''),'general'),trim(requested_title),nullif(trim(requested_body),''),coalesce(nullif(requested_icon,''),'✦'),nullif(trim(requested_route),''),coalesce(requested_route_params,'{}'::jsonb),normalized_source,requested_expires_at)
  on conflict (user_id,source_key) where source_key is not null do nothing returning id into new_id;
  return new_id;
end;$$;

create or replace function public.delete_notification_v881(requested_id bigint)
returns boolean language plpgsql security definer set search_path=public as $$
declare n public.user_notifications%rowtype;
begin
  select * into n from public.user_notifications where id=requested_id and user_id=auth.uid();
  if not found then return false; end if;
  if n.source_key is not null then
    insert into public.notification_dismissals(user_id,source_key,dismissed_at)
    values(n.user_id,n.source_key,now())
    on conflict(user_id,source_key) do update set dismissed_at=excluded.dismissed_at;
  end if;
  delete from public.user_notifications where id=requested_id and user_id=auth.uid();
  return found;
end;$$;

grant execute on function public.delete_notification_v881(bigint) to authenticated;

create or replace function public.get_notification_preferences_v882()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); p public.notification_preferences%rowtype;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  insert into public.notification_preferences(user_id) values(uid) on conflict(user_id) do nothing;
  select * into p from public.notification_preferences where user_id=uid;
  return jsonb_build_object(
    'daily_booster',p.daily_booster,'trade',p.trade,'achievement',p.achievement,
    'reward',p.reward,'event',p.event,'broadcast',p.broadcast
  );
end;$$;

create or replace function public.save_notification_preferences_v882(requested_preferences jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  insert into public.notification_preferences(user_id,daily_booster,trade,achievement,reward,event,broadcast,updated_at)
  values(
    uid,
    coalesce((requested_preferences->>'daily_booster')::boolean,true),
    coalesce((requested_preferences->>'trade')::boolean,true),
    coalesce((requested_preferences->>'achievement')::boolean,true),
    coalesce((requested_preferences->>'reward')::boolean,true),
    coalesce((requested_preferences->>'event')::boolean,true),
    coalesce((requested_preferences->>'broadcast')::boolean,true),
    now()
  )
  on conflict(user_id) do update set
    daily_booster=excluded.daily_booster, trade=excluded.trade,
    achievement=excluded.achievement, reward=excluded.reward,
    event=excluded.event, broadcast=excluded.broadcast, updated_at=now();
  return public.get_notification_preferences_v882();
end;$$;

revoke all on function public.get_notification_preferences_v882() from public,anon;
revoke all on function public.save_notification_preferences_v882(jsonb) from public,anon;
grant execute on function public.get_notification_preferences_v882() to authenticated;
grant execute on function public.save_notification_preferences_v882(jsonb) to authenticated;

-- Normalize any previously-created Daily Booster routes.
update public.user_notifications
set route='daily', route_params='{}'::jsonb
where notification_type='daily_booster' and route is distinct from 'daily';

-- Remove old read notifications after 90 days to keep the inbox light.
delete from public.user_notifications
where is_read=true and created_at < now() - interval '90 days';

-- Trade creation now presents every true duplicate copy. Public trade-list
-- settings still control the public showcase, but do not falsely hide inventory
-- from a direct offer between two named collectors.
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

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,
    'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesName',s.name,
    'available',greatest(uc.quantity-1,0),
    'wantedByOther',coalesce(tp.wishlisted,false)
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into my_cards
  from public.user_cards uc
  join public.cards c on c.id=uc.card_id
  join public.card_series s on s.id=c.series_id
  left join public.user_card_preferences tp on tp.user_id=target.id and tp.card_id=c.id
  where uc.user_id=uid and uc.quantity>1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,
    'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesName',s.name,
    'available',greatest(uc.quantity-1,0),
    'onMyWishlist',coalesce(mp.wishlisted,false)
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into their_cards
  from public.user_cards uc
  join public.cards c on c.id=uc.card_id
  join public.card_series s on s.id=c.series_id
  left join public.user_card_preferences mp on mp.user_id=uid and mp.card_id=c.id
  where uc.user_id=target.id and uc.quantity>1;

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

  for item in select * from jsonb_array_elements(offered_items) loop
    cid:=nullif(trim(item->>'cardId'),''); qty:=coalesce((item->>'quantity')::integer,0);
    select greatest(quantity-1,0) into allowed from public.user_cards where user_id=uid and card_id=cid;
    if cid is null or qty<1 or qty>coalesce(allowed,0) then raise exception 'One of your offered card quantities is no longer available.'; end if;
  end loop;

  for item in select * from jsonb_array_elements(requested_items) loop
    cid:=nullif(trim(item->>'cardId'),''); qty:=coalesce((item->>'quantity')::integer,0);
    select greatest(quantity-1,0) into allowed from public.user_cards where user_id=target_id and card_id=cid;
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

-- Acceptance also validates true duplicate inventory rather than requiring a
-- separate trade-list quantity to remain configured.
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

 perform 1 from public.user_cards uc where uc.user_id in(offer.proposer_id,offer.recipient_id) and uc.card_id in(select card_id from public.trade_offer_items where offer_id=offer.id) for update;
 for item in select * from public.trade_offer_items where offer_id=offer.id loop
   if item.side='proposer' then
     select greatest(quantity-1,0) into available from public.user_cards where user_id=offer.proposer_id and card_id=item.card_id;
   else
     select greatest(quantity-1,0) into available from public.user_cards where user_id=offer.recipient_id and card_id=item.card_id;
   end if;
   if item.quantity>coalesce(available,0) then raise exception 'A duplicate card is no longer available. The trade was not completed.'; end if;
 end loop;

 update public.user_cards uc set quantity=uc.quantity-i.quantity,updated_at=now(),last_obtained_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer' and uc.user_id=offer.proposer_id and uc.card_id=i.card_id;
 update public.user_cards uc set quantity=uc.quantity-i.quantity,updated_at=now(),last_obtained_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient' and uc.user_id=offer.recipient_id and uc.card_id=i.card_id;

 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select offer.recipient_id,i.card_id,i.quantity,false,now(),now(),now() from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer'
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select offer.proposer_id,i.card_id,i.quantity,false,now(),now(),now() from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient'
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();

 update public.user_card_preferences p set trade_quantity=greatest(0,p.trade_quantity-i.quantity),updated_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='proposer' and p.user_id=offer.proposer_id and p.card_id=i.card_id;
 update public.user_card_preferences p set trade_quantity=greatest(0,p.trade_quantity-i.quantity),updated_at=now()
 from public.trade_offer_items i where i.offer_id=offer.id and i.side='recipient' and p.user_id=offer.recipient_id and p.card_id=i.card_id;

 update public.trade_offers set status='accepted',updated_at=now(),responded_at=now() where id=offer.id;
 return jsonb_build_object('success',true,'status','accepted');
end;$$;

revoke all on function public.get_trade_offer_context(text) from public,anon;
revoke all on function public.create_trade_offer(text,jsonb,jsonb,text) from public,anon;
revoke all on function public.respond_to_trade_offer(uuid,text) from public,anon;
grant execute on function public.get_trade_offer_context(text) to authenticated;
grant execute on function public.create_trade_offer(text,jsonb,jsonb,text) to authenticated;
grant execute on function public.respond_to_trade_offer(uuid,text) to authenticated;
