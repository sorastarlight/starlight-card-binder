-- V88.2.1 Trade and notification routing hotfix

create or replace function public.create_trade_offer(
  requested_username text,
  offered_items jsonb,
  requested_items jsonb,
  requested_note text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  target_id uuid;
  new_id uuid;
  offered_entry jsonb;
  requested_entry jsonb;
  cid text;
  qty integer;
  allowed integer;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select p.id into target_id from public.profiles p where lower(p.username)=lower(trim(requested_username)) and p.onboarding_complete=true limit 1;
  if target_id is null then raise exception 'Collector not found.'; end if;
  if target_id=uid then raise exception 'You cannot trade with yourself.'; end if;
  if jsonb_typeof(offered_items)<>'array' or jsonb_typeof(requested_items)<>'array' then raise exception 'Invalid trade items.'; end if;
  if jsonb_array_length(offered_items)=0 or jsonb_array_length(requested_items)=0 then raise exception 'A trade must include cards from both collectors.'; end if;
  if jsonb_array_length(offered_items)>12 or jsonb_array_length(requested_items)>12 then raise exception 'A trade may include at most 12 card types per side.'; end if;

  for offered_entry in select value from jsonb_array_elements(offered_items) as offered(value) loop
    cid:=nullif(trim(offered_entry->>'cardId'),'');
    qty:=coalesce((offered_entry->>'quantity')::integer,0);
    select greatest(uc.quantity-1,0) into allowed from public.user_cards uc where uc.user_id=uid and uc.card_id=cid;
    if cid is null or qty<1 or qty>coalesce(allowed,0) then raise exception 'One of your offered card quantities is no longer available.'; end if;
  end loop;

  for requested_entry in select value from jsonb_array_elements(requested_items) as requested(value) loop
    cid:=nullif(trim(requested_entry->>'cardId'),'');
    qty:=coalesce((requested_entry->>'quantity')::integer,0);
    select greatest(uc.quantity-1,0) into allowed from public.user_cards uc where uc.user_id=target_id and uc.card_id=cid;
    if cid is null or qty<1 or qty>coalesce(allowed,0) then raise exception 'One of the requested card quantities is no longer available.'; end if;
  end loop;

  insert into public.trade_offers(proposer_id,recipient_id,note)
  values(uid,target_id,nullif(trim(requested_note),'')) returning id into new_id;

  insert into public.trade_offer_items(offer_id,side,card_id,quantity)
  select new_id,'proposer',normalized.card_id,sum(normalized.quantity)::integer
  from (select offered.value->>'cardId' as card_id,(offered.value->>'quantity')::integer as quantity from jsonb_array_elements(offered_items) as offered(value)) normalized
  group by normalized.card_id;

  insert into public.trade_offer_items(offer_id,side,card_id,quantity)
  select new_id,'recipient',normalized.card_id,sum(normalized.quantity)::integer
  from (select requested.value->>'cardId' as card_id,(requested.value->>'quantity')::integer as quantity from jsonb_array_elements(requested_items) as requested(value)) normalized
  group by normalized.card_id;

  return jsonb_build_object('success',true,'offerId',new_id);
end;$$;

revoke all on function public.create_trade_offer(text,jsonb,jsonb,text) from public,anon;
grant execute on function public.create_trade_offer(text,jsonb,jsonb,text) to authenticated;

-- Normalize already-created Daily Booster notification destinations.
update public.notifications
set route='daily', route_params='{}'::jsonb, updated_at=now()
where lower(coalesce(route,'')) in ('daily-booster','daily-booster.html','free-daily-booster','binder.html?view=daily')
   or lower(coalesce(source_type,''))='daily_booster';
