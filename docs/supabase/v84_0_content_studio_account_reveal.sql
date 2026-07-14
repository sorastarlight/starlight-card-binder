-- ============================================================
-- STARLIGHT CARD BINDER V84.0
-- Content Studio, flexible booster rewards, account controls
-- Run after V83.1.
-- ============================================================

alter table public.booster_types
  add column if not exists reward_mode text not null default 'slots',
  add column if not exists series_id text references public.card_series(id) on delete set null,
  add column if not exists card_count integer not null default 4,
  add column if not exists bonus_star_bits integer not null default 0,
  add column if not exists archived boolean not null default false;

alter table public.booster_types drop constraint if exists booster_types_reward_mode_check;
alter table public.booster_types add constraint booster_types_reward_mode_check
check (reward_mode in ('slots','series','exact','weighted_pool','single','mixed'));

create table if not exists public.booster_reward_cards (
  booster_id text not null references public.booster_types(id) on delete cascade,
  card_id text not null references public.cards(id) on delete cascade,
  quantity integer not null default 1 check (quantity between 1 and 50),
  weight numeric(12,4) not null default 1 check (weight >= 0),
  guaranteed boolean not null default false,
  sort_order integer not null default 0,
  primary key (booster_id, card_id)
);

alter table public.booster_reward_cards enable row level security;
drop policy if exists "Active booster reward cards are public" on public.booster_reward_cards;
create policy "Active booster reward cards are public"
on public.booster_reward_cards for select to anon, authenticated
using (exists (select 1 from public.booster_types b where b.id=booster_reward_cards.booster_id and b.is_active=true and b.archived=false));

create or replace function public.is_content_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.site_roles where user_id=auth.uid() and role in ('owner','admin'));
$$;
revoke all on function public.is_content_admin() from public,anon;
grant execute on function public.is_content_admin() to authenticated;

-- Read all content needed by the studio.
create or replace function public.admin_get_content_studio()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  return jsonb_build_object(
    'dailyMode', public.get_free_daily_booster_mode(),
    'series', coalesce((select jsonb_agg(jsonb_build_object(
      'id',s.id,'name',s.name,'description',s.description,'boosterImageUrl',s.booster_image_url,
      'sortOrder',s.sort_order,'isVisible',s.is_visible,
      'cardCount',(select count(*) from public.cards c where c.series_id=s.id)
    ) order by s.sort_order,s.id) from public.card_series s),'[]'::jsonb),
    'cards', coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'seriesId',c.series_id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,
      'description',c.description,'artist',c.artist,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,
      'sortOrder',c.sort_order,'isVisible',c.is_visible,'isCollectible',c.is_collectible,
      'isPullable',c.is_pullable,'pullWeight',c.pull_weight
    ) order by c.series_id,c.sort_order,c.id) from public.cards c),'[]'::jsonb),
    'boosters', coalesce((select jsonb_agg(jsonb_build_object(
      'id',b.id,'name',b.name,'description',b.description,'starBitsCost',b.star_bits_cost,
      'isActive',b.is_active,'sortOrder',b.sort_order,'packImageUrl',b.pack_image_url,
      'cardBackUrl',b.card_back_url,'rewardMode',b.reward_mode,'seriesId',b.series_id,
      'cardCount',b.card_count,'bonusStarBits',b.bonus_star_bits,'archived',b.archived,
      'rewardCards',coalesce((select jsonb_agg(jsonb_build_object(
        'cardId',rc.card_id,'quantity',rc.quantity,'weight',rc.weight,'guaranteed',rc.guaranteed,'sortOrder',rc.sort_order
      ) order by rc.sort_order,rc.card_id) from public.booster_reward_cards rc where rc.booster_id=b.id),'[]'::jsonb),
      'slots',coalesce((select jsonb_agg(jsonb_build_object(
        'id',sl.id,'slotKey',sl.slot_key,'name',sl.name,'quantity',sl.quantity,'sortOrder',sl.sort_order,
        'rates',coalesce((select jsonb_object_agg(r.rarity,r.percentage) from public.booster_slot_rates r where r.slot_id=sl.id),'{}'::jsonb)
      ) order by sl.sort_order,sl.id) from public.booster_slots sl where sl.booster_id=b.id),'[]'::jsonb)
    ) order by b.sort_order,b.id) from public.booster_types b),'[]'::jsonb)
  );
end;$$;
revoke all on function public.admin_get_content_studio() from public,anon;
grant execute on function public.admin_get_content_studio() to authenticated;

create or replace function public.admin_save_series_v84(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare sid text:=trim(payload->>'id');
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if sid is null or sid !~ '^[A-Za-z0-9_-]{1,30}$' then raise exception 'Series ID is invalid.'; end if;
  insert into public.card_series(id,name,description,booster_image_url,sort_order,is_visible,updated_at)
  values(sid,trim(payload->>'name'),nullif(trim(payload->>'description'),''),coalesce(nullif(trim(payload->>'boosterImageUrl'),''),'site_assets/series01_rising_star_booster.png'),coalesce((payload->>'sortOrder')::integer,0),coalesce((payload->>'isVisible')::boolean,true),now())
  on conflict(id) do update set name=excluded.name,description=excluded.description,booster_image_url=excluded.booster_image_url,sort_order=excluded.sort_order,is_visible=excluded.is_visible,updated_at=now();
  return jsonb_build_object('success',true,'id',sid);
end;$$;
revoke all on function public.admin_save_series_v84(jsonb) from public,anon;
grant execute on function public.admin_save_series_v84(jsonb) to authenticated;

create or replace function public.admin_save_card_v84(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare cid text:=lower(trim(payload->>'id')); sid text:=payload->>'seriesId';
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if cid is null or cid !~ '^[a-z0-9_-]{3,60}$' then raise exception 'Card ID is invalid.'; end if;
  if not exists(select 1 from public.card_series where id=sid) then raise exception 'Select a valid series.'; end if;
  insert into public.cards(id,series_id,card_number,name,rarity,image_url,thumbnail_url,description,artist,sort_order,is_visible,is_collectible,is_pullable,pull_weight,updated_at)
  values(cid,sid,trim(payload->>'cardNumber'),trim(payload->>'name'),payload->>'rarity',trim(payload->>'imageUrl'),coalesce(nullif(trim(payload->>'thumbnailUrl'),''),trim(payload->>'imageUrl')),nullif(trim(payload->>'description'),''),nullif(trim(payload->>'artist'),''),coalesce((payload->>'sortOrder')::integer,0),coalesce((payload->>'isVisible')::boolean,true),coalesce((payload->>'isCollectible')::boolean,true),coalesce((payload->>'isPullable')::boolean,true),greatest(coalesce((payload->>'pullWeight')::numeric,1),0),now())
  on conflict(id) do update set series_id=excluded.series_id,card_number=excluded.card_number,name=excluded.name,rarity=excluded.rarity,image_url=excluded.image_url,thumbnail_url=excluded.thumbnail_url,description=excluded.description,artist=excluded.artist,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_collectible=excluded.is_collectible,is_pullable=excluded.is_pullable,pull_weight=excluded.pull_weight,updated_at=now();
  return jsonb_build_object('success',true,'id',cid);
end;$$;
revoke all on function public.admin_save_card_v84(jsonb) from public,anon;
grant execute on function public.admin_save_card_v84(jsonb) to authenticated;

create or replace function public.admin_save_booster_v84(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare bid text:=lower(trim(payload->>'id')); rewards jsonb:=coalesce(payload->'rewardCards','[]'::jsonb); r jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then raise exception 'Booster ID is invalid.'; end if;
  insert into public.booster_types(id,name,description,star_bits_cost,is_active,sort_order,pack_image_url,card_back_url,reward_mode,series_id,card_count,bonus_star_bits,archived,updated_at)
  values(bid,trim(payload->>'name'),nullif(trim(payload->>'description'),''),greatest(coalesce((payload->>'starBitsCost')::integer,0),0),coalesce((payload->>'isActive')::boolean,false),coalesce((payload->>'sortOrder')::integer,0),coalesce(nullif(trim(payload->>'packImageUrl'),''),'site_assets/series01_rising_star_booster.png'),coalesce(nullif(trim(payload->>'cardBackUrl'),''),'site_assets/StarlightCard_Back_NewLogo.png'),coalesce(payload->>'rewardMode','slots'),nullif(payload->>'seriesId',''),greatest(coalesce((payload->>'cardCount')::integer,1),1),greatest(coalesce((payload->>'bonusStarBits')::integer,0),0),coalesce((payload->>'archived')::boolean,false),now())
  on conflict(id) do update set name=excluded.name,description=excluded.description,star_bits_cost=excluded.star_bits_cost,is_active=excluded.is_active,sort_order=excluded.sort_order,pack_image_url=excluded.pack_image_url,card_back_url=excluded.card_back_url,reward_mode=excluded.reward_mode,series_id=excluded.series_id,card_count=excluded.card_count,bonus_star_bits=excluded.bonus_star_bits,archived=excluded.archived,updated_at=now();
  delete from public.booster_reward_cards where booster_id=bid;
  for r in select * from jsonb_array_elements(rewards) loop
    insert into public.booster_reward_cards(booster_id,card_id,quantity,weight,guaranteed,sort_order)
    values(bid,r->>'cardId',greatest(coalesce((r->>'quantity')::integer,1),1),greatest(coalesce((r->>'weight')::numeric,1),0),coalesce((r->>'guaranteed')::boolean,false),coalesce((r->>'sortOrder')::integer,0));
  end loop;
  return jsonb_build_object('success',true,'id',bid);
end;$$;
revoke all on function public.admin_save_booster_v84(jsonb) from public,anon;
grant execute on function public.admin_save_booster_v84(jsonb) to authenticated;

-- Flexible draw helper. Existing slot-based boosters continue to work.
create or replace function public.draw_configured_booster_cards(requested_booster_id text)
returns text[] language plpgsql security definer set search_path=public as $$
declare b public.booster_types%rowtype; selected_ids text[]:=array[]::text[]; rec record; i integer; chosen text;
begin
  select * into b from public.booster_types where id=requested_booster_id and is_active=true and archived=false;
  if not found then raise exception 'This booster is not active.'; end if;
  if b.reward_mode='slots' then
    for rec in select id,quantity from public.booster_slots where booster_id=b.id order by sort_order,id loop
      for i in 1..rec.quantity loop
        with rates as (
          select rarity,percentage,sum(percentage) over(order by case rarity when 'Common' then 1 when 'Uncommon' then 2 when 'Rare' then 3 when 'Epic' then 4 else 5 end) cumulative
          from public.booster_slot_rates where slot_id=rec.id and percentage>0
        ), chosen_rarity as (select rarity from rates where random()*100<cumulative order by cumulative limit 1)
        select c.id into chosen from public.cards c,chosen_rarity cr where c.rarity=cr.rarity and c.is_visible and c.is_collectible and c.is_pullable and c.pull_weight>0 order by (-ln(greatest(random(),.0000001))/c.pull_weight) limit 1;
        if chosen is null then raise exception 'No eligible card is available for a configured slot.'; end if;
        selected_ids:=array_append(selected_ids,chosen);
      end loop;
    end loop;
  elsif b.reward_mode='series' then
    for i in 1..b.card_count loop
      select c.id into chosen from public.cards c where c.series_id=b.series_id and c.is_visible and c.is_collectible and c.is_pullable and c.pull_weight>0 order by (-ln(greatest(random(),.0000001))/c.pull_weight) limit 1;
      if chosen is null then raise exception 'This series has no pullable cards.'; end if; selected_ids:=array_append(selected_ids,chosen);
    end loop;
  elsif b.reward_mode in ('exact','single','mixed') then
    for rec in select * from public.booster_reward_cards where booster_id=b.id order by sort_order,card_id loop
      for i in 1..rec.quantity loop selected_ids:=array_append(selected_ids,rec.card_id); end loop;
    end loop;
  elsif b.reward_mode='weighted_pool' then
    for i in 1..b.card_count loop
      select rc.card_id into chosen from public.booster_reward_cards rc join public.cards c on c.id=rc.card_id where rc.booster_id=b.id and rc.weight>0 and c.is_visible and c.is_collectible order by (-ln(greatest(random(),.0000001))/rc.weight) limit 1;
      if chosen is null then raise exception 'This booster custom pool is empty.'; end if; selected_ids:=array_append(selected_ids,chosen);
    end loop;
  end if;
  if cardinality(selected_ids)=0 then raise exception 'This booster has no card rewards configured.'; end if;
  return selected_ids;
end;$$;
revoke all on function public.draw_configured_booster_cards(text) from public,anon,authenticated;

-- Keep default packs in slot mode.
update public.booster_types set reward_mode='slots' where id in ('free_daily','standard_star_bits');

alter table public.star_bits_booster_purchases add column if not exists booster_id text references public.booster_types(id) on delete set null;

create or replace function public.build_and_award_booster(requested_booster_id text, requested_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare ids text[]; rewards jsonb; bonus integer:=0; new_balance bigint;
begin
  ids:=public.draw_configured_booster_cards(requested_booster_id);
  insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
  select requested_user_id,x.card_id,x.qty,false,now(),now(),now() from (select card_id,count(*)::integer qty from unnest(ids) card_id group by card_id)x
  on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
  select coalesce(bonus_star_bits,0) into bonus from public.booster_types where id=requested_booster_id;
  if bonus>0 then
    insert into public.user_wallets(user_id,star_bits,lifetime_star_bits_earned) values(requested_user_id,bonus,bonus)
    on conflict(user_id) do update set star_bits=public.user_wallets.star_bits+bonus,lifetime_star_bits_earned=public.user_wallets.lifetime_star_bits_earned+bonus,updated_at=now();
    insert into public.star_bits_transactions(user_id,transaction_type,star_bits_change,description,metadata)
    values(requested_user_id,'reward',bonus,'Booster bonus Star Bits.',jsonb_build_object('boosterId',requested_booster_id));
  end if;
  select jsonb_agg(jsonb_build_object('id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesId',c.series_id,'seriesName',s.name,'artist',c.artist,'description',c.description,'quantity',uc.quantity,'isDuplicate',uc.quantity>1) order by p.pos)
  into rewards from unnest(ids) with ordinality p(card_id,pos) join public.cards c on c.id=p.card_id join public.card_series s on s.id=c.series_id join public.user_cards uc on uc.user_id=requested_user_id and uc.card_id=c.id;
  select star_bits into new_balance from public.user_wallets where user_id=requested_user_id;
  return jsonb_build_object('cards',coalesce(rewards,'[]'::jsonb),'bonusStarBits',bonus,'newStarBitsBalance',coalesce(new_balance,0));
end;$$;
revoke all on function public.build_and_award_booster(text,uuid) from public,anon,authenticated;

create or replace function public.open_star_bits_booster_by_id(requested_booster_id text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); cost integer; balance bigint; result jsonb; purchase_id bigint;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select star_bits_cost into cost from public.booster_types where id=requested_booster_id and is_active=true and archived=false;
  if cost is null or cost<=0 then raise exception 'This booster is not available for Star Bits.'; end if;
  insert into public.user_wallets(user_id) values(uid) on conflict(user_id) do nothing;
  select star_bits into balance from public.user_wallets where user_id=uid for update;
  if balance<cost then raise exception 'You do not have enough Star Bits.'; end if;
  update public.user_wallets set star_bits=star_bits-cost,lifetime_star_bits_spent=lifetime_star_bits_spent+cost,updated_at=now() where user_id=uid;
  insert into public.star_bits_booster_purchases(user_id,star_bits_cost,booster_id,cards_awarded) values(uid,cost,requested_booster_id,'[]'::jsonb) returning id into purchase_id;
  begin result:=public.build_and_award_booster(requested_booster_id,uid); exception when others then raise; end;
  update public.star_bits_booster_purchases set cards_awarded=result->'cards' where id=purchase_id;
  insert into public.star_bits_transactions(user_id,transaction_type,star_bits_change,description,metadata) values(uid,'purchase',-cost,'Purchased '||requested_booster_id||' booster.',jsonb_build_object('boosterId',requested_booster_id,'purchaseId',purchase_id));
  return result||jsonb_build_object('success',true,'purchaseId',purchase_id,'boosterId',requested_booster_id);
end;$$;
revoke all on function public.open_star_bits_booster_by_id(text) from public,anon;
grant execute on function public.open_star_bits_booster_by_id(text) to authenticated;

create or replace function public.open_star_bits_booster()
returns jsonb language sql security definer set search_path=public as $$select public.open_star_bits_booster_by_id('standard_star_bits');$$;
revoke all on function public.open_star_bits_booster() from public,anon;
grant execute on function public.open_star_bits_booster() to authenticated;
