-- ============================================================
-- STARLIGHT CARD BINDER V90.0
-- Card Database 2.0 + Guided Booster Builder
-- Run after V89.7.
-- ============================================================

create table if not exists public.card_categories(
  id text primary key,
  name text not null unique,
  description text,
  color text not null default '#7ec8ff',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.card_subcategories(
  id text primary key,
  category_id text not null references public.card_categories(id) on delete cascade,
  name text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  unique(category_id,name)
);
create table if not exists public.card_variants(
  id text primary key,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);
create table if not exists public.card_finishes(
  id text primary key,
  name text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true
);
create table if not exists public.card_tags(
  id bigint generated always as identity primary key,
  name text not null unique,
  slug text not null unique,
  color text not null default '#ff8fc7'
);
create table if not exists public.card_tag_assignments(
  card_id text not null references public.cards(id) on delete cascade,
  tag_id bigint not null references public.card_tags(id) on delete cascade,
  primary key(card_id,tag_id)
);

insert into public.card_categories(id,name,description,color,sort_order) values
 ('character','Character','Core Sora, guest, and character-focused cards.','#77c8ff',10),
 ('style-change','Style Change','Named transformations and alternate modes.','#ff8fc7',20),
 ('outfit','Outfit','Fashion, costumes, and wardrobe cards.','#c59cff',30),
 ('scene','Scene','Locations and illustrated situations.','#8ce4d3',40),
 ('moment','Moment','Memorable stream, story, or celebration moments.','#ffc86b',50),
 ('item','Item','Props, devices, equipment, and collectibles.','#7fa5ff',60),
 ('accessory','Accessory','Wearable and themed accessories.','#ff9fcf',70),
 ('friend-guest','Friend & Guest','Collaborators and recurring guests.','#99d98c',80),
 ('event','Event','Seasonal and limited event cards.','#ff9d6c',90),
 ('collaboration','Collaboration','Cross-creator or brand collaborations.','#9f8cff',100),
 ('promo','Promo','Codes, giveaways, subscriptions, and special distribution.','#ffd35f',110),
 ('special','Special','Cards outside the normal classification system.','#f08cff',120)
on conflict(id) do update set name=excluded.name,description=excluded.description,color=excluded.color,sort_order=excluded.sort_order;

insert into public.card_variants(id,name,sort_order) values
 ('standard-art','Standard Art',10),('alternate-art','Alternate Art',20),('full-art','Full Art',30),
 ('chibi','Chibi',40),('close-up','Close-Up',50),('signed','Signed',60),
 ('event-art','Event Art',70),('anniversary-art','Anniversary Art',80)
on conflict(id) do nothing;
insert into public.card_finishes(id,name,sort_order) values
 ('standard','Standard',10),('holographic','Holographic',20),('reverse-holo','Reverse Holographic',30),
 ('sparkle-foil','Sparkle Foil',40),('starlight-foil','Starlight Foil',50),('prismatic','Prismatic',60),
 ('gold','Gold',70),('special','Special',80)
on conflict(id) do nothing;

alter table public.cards
  add column if not exists category_id text references public.card_categories(id) on delete set null,
  add column if not exists subcategory_id text references public.card_subcategories(id) on delete set null,
  add column if not exists variant_id text references public.card_variants(id) on delete set null,
  add column if not exists finish_id text references public.card_finishes(id) on delete set null,
  add column if not exists collector_number text,
  add column if not exists card_back_url text,
  add column if not exists distribution_type text not null default 'booster_pull',
  add column if not exists is_promo boolean not null default false,
  add column if not exists is_event_exclusive boolean not null default false,
  add column if not exists available_from timestamptz,
  add column if not exists available_until timestamptz,
  add column if not exists publish_status text not null default 'published';

alter table public.cards drop constraint if exists cards_distribution_type_check;
alter table public.cards add constraint cards_distribution_type_check check(distribution_type in ('booster_pull','redeem_code','twitch_reward','event_reward','admin_gift','promo','special'));
alter table public.cards drop constraint if exists cards_publish_status_check;
alter table public.cards add constraint cards_publish_status_check check(publish_status in ('draft','published','archived'));

update public.cards set
  category_id=coalesce(category_id,'character'),
  variant_id=coalesce(variant_id,'standard-art'),
  finish_id=coalesce(finish_id,'standard'),
  collector_number=coalesce(nullif(collector_number,''),card_number),
  publish_status=case when is_visible then 'published' else 'draft' end
where category_id is null or variant_id is null or finish_id is null or collector_number is null;

alter table public.booster_types
  add column if not exists builder_mode text not null default 'guided',
  add column if not exists odds_preset text not null default 'standard',
  add column if not exists category_ids text[] not null default '{}',
  add column if not exists finish_ids text[] not null default '{}',
  add column if not exists exclude_promos boolean not null default true,
  add column if not exists allow_duplicates boolean not null default true;

alter table public.booster_types drop constraint if exists booster_types_builder_mode_check;
alter table public.booster_types add constraint booster_types_builder_mode_check check(builder_mode in ('guided','advanced'));

create or replace function public.admin_get_content_studio()
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  return jsonb_build_object(
    'dailyMode',public.get_free_daily_booster_mode(),
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'description',description,'color',color,'sortOrder',sort_order,'isActive',is_active) order by sort_order,name) from public.card_categories),'[]'::jsonb),
    'subcategories',coalesce((select jsonb_agg(jsonb_build_object('id',id,'categoryId',category_id,'name',name,'description',description,'sortOrder',sort_order,'isActive',is_active) order by category_id,sort_order,name) from public.card_subcategories),'[]'::jsonb),
    'variants',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'sortOrder',sort_order,'isActive',is_active) order by sort_order,name) from public.card_variants),'[]'::jsonb),
    'finishes',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'sortOrder',sort_order,'isActive',is_active) order by sort_order,name) from public.card_finishes),'[]'::jsonb),
    'series',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'name',s.name,'description',s.description,'boosterImageUrl',s.booster_image_url,'sortOrder',s.sort_order,'isVisible',s.is_visible,'cardCount',(select count(*) from public.cards c where c.series_id=s.id)) order by s.sort_order,s.id) from public.card_series s),'[]'::jsonb),
    'cards',coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'seriesId',c.series_id,'cardNumber',c.card_number,'collectorNumber',c.collector_number,'name',c.name,'rarity',c.rarity,
      'categoryId',c.category_id,'subcategoryId',c.subcategory_id,'variantId',c.variant_id,'finishId',c.finish_id,
      'description',c.description,'artist',c.artist,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'cardBackUrl',c.card_back_url,
      'distributionType',c.distribution_type,'isPromo',c.is_promo,'isEventExclusive',c.is_event_exclusive,
      'availableFrom',c.available_from,'availableUntil',c.available_until,'publishStatus',c.publish_status,
      'sortOrder',c.sort_order,'isVisible',c.is_visible,'isCollectible',c.is_collectible,'isPullable',c.is_pullable,'pullWeight',c.pull_weight,
      'tags',coalesce((select jsonb_agg(t.name order by t.name) from public.card_tag_assignments a join public.card_tags t on t.id=a.tag_id where a.card_id=c.id),'[]'::jsonb)
    ) order by c.series_id,c.sort_order,c.id) from public.cards c),'[]'::jsonb),
    'boosters',coalesce((select jsonb_agg(jsonb_build_object(
      'id',b.id,'name',b.name,'description',b.description,'starBitsCost',b.star_bits_cost,'isActive',b.is_active,'sortOrder',b.sort_order,
      'packImageUrl',b.pack_image_url,'cardBackUrl',b.card_back_url,'rewardMode',b.reward_mode,'seriesId',b.series_id,'cardCount',b.card_count,
      'bonusStarBits',b.bonus_star_bits,'archived',b.archived,'builderMode',b.builder_mode,'oddsPreset',b.odds_preset,
      'categoryIds',to_jsonb(b.category_ids),'finishIds',to_jsonb(b.finish_ids),'excludePromos',b.exclude_promos,'allowDuplicates',b.allow_duplicates,
      'rewardCards',coalesce((select jsonb_agg(jsonb_build_object('cardId',rc.card_id,'quantity',rc.quantity,'weight',rc.weight,'guaranteed',rc.guaranteed,'sortOrder',rc.sort_order) order by rc.sort_order,rc.card_id) from public.booster_reward_cards rc where rc.booster_id=b.id),'[]'::jsonb),
      'slots',coalesce((select jsonb_agg(jsonb_build_object('id',sl.id,'slotKey',sl.slot_key,'name',sl.name,'quantity',sl.quantity,'sortOrder',sl.sort_order,'rates',coalesce((select jsonb_object_agg(r.rarity,r.percentage) from public.booster_slot_rates r where r.slot_id=sl.id),'{}'::jsonb)) order by sl.sort_order,sl.id) from public.booster_slots sl where sl.booster_id=b.id),'[]'::jsonb)
    ) order by b.sort_order,b.id) from public.booster_types b),'[]'::jsonb)
  );
end;$$;
revoke all on function public.admin_get_content_studio() from public,anon;
grant execute on function public.admin_get_content_studio() to authenticated;

create or replace function public.admin_save_card_v90(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare cid text:=lower(trim(payload->>'id')); sid text:=payload->>'seriesId'; tag_name text; tag_id_value bigint;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if cid is null or cid !~ '^[a-z0-9_-]{3,60}$' then raise exception 'Card ID is invalid.'; end if;
  if not exists(select 1 from public.card_series where id=sid) then raise exception 'Select a valid series.'; end if;
  insert into public.cards(id,series_id,card_number,collector_number,name,rarity,category_id,subcategory_id,variant_id,finish_id,image_url,thumbnail_url,card_back_url,description,artist,distribution_type,is_promo,is_event_exclusive,available_from,available_until,publish_status,sort_order,is_visible,is_collectible,is_pullable,pull_weight,updated_at)
  values(cid,sid,trim(payload->>'cardNumber'),coalesce(nullif(trim(payload->>'collectorNumber'),''),trim(payload->>'cardNumber')),trim(payload->>'name'),payload->>'rarity',nullif(payload->>'categoryId',''),nullif(payload->>'subcategoryId',''),nullif(payload->>'variantId',''),nullif(payload->>'finishId',''),trim(payload->>'imageUrl'),coalesce(nullif(trim(payload->>'thumbnailUrl'),''),trim(payload->>'imageUrl')),nullif(trim(payload->>'cardBackUrl'),''),nullif(trim(payload->>'description'),''),nullif(trim(payload->>'artist'),''),coalesce(nullif(payload->>'distributionType',''),'booster_pull'),coalesce((payload->>'isPromo')::boolean,false),coalesce((payload->>'isEventExclusive')::boolean,false),nullif(payload->>'availableFrom','')::timestamptz,nullif(payload->>'availableUntil','')::timestamptz,coalesce(nullif(payload->>'publishStatus',''),'published'),coalesce((payload->>'sortOrder')::integer,0),coalesce((payload->>'isVisible')::boolean,true),coalesce((payload->>'isCollectible')::boolean,true),coalesce((payload->>'isPullable')::boolean,true),greatest(coalesce((payload->>'pullWeight')::numeric,1),0),now())
  on conflict(id) do update set series_id=excluded.series_id,card_number=excluded.card_number,collector_number=excluded.collector_number,name=excluded.name,rarity=excluded.rarity,category_id=excluded.category_id,subcategory_id=excluded.subcategory_id,variant_id=excluded.variant_id,finish_id=excluded.finish_id,image_url=excluded.image_url,thumbnail_url=excluded.thumbnail_url,card_back_url=excluded.card_back_url,description=excluded.description,artist=excluded.artist,distribution_type=excluded.distribution_type,is_promo=excluded.is_promo,is_event_exclusive=excluded.is_event_exclusive,available_from=excluded.available_from,available_until=excluded.available_until,publish_status=excluded.publish_status,sort_order=excluded.sort_order,is_visible=excluded.is_visible,is_collectible=excluded.is_collectible,is_pullable=excluded.is_pullable,pull_weight=excluded.pull_weight,updated_at=now();
  delete from public.card_tag_assignments where card_id=cid;
  for tag_name in select trim(value) from jsonb_array_elements_text(coalesce(payload->'tags','[]'::jsonb)) loop
    if tag_name<>'' then
      insert into public.card_tags(name,slug) values(tag_name,lower(regexp_replace(tag_name,'[^a-zA-Z0-9]+','-','g'))) on conflict(name) do update set name=excluded.name returning id into tag_id_value;
      insert into public.card_tag_assignments(card_id,tag_id) values(cid,tag_id_value) on conflict do nothing;
    end if;
  end loop;
  return jsonb_build_object('success',true,'id',cid);
end;$$;
revoke all on function public.admin_save_card_v90(jsonb) from public,anon;
grant execute on function public.admin_save_card_v90(jsonb) to authenticated;

create or replace function public.admin_save_booster_v90(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
  result:=public.admin_save_booster_v84(payload);
  update public.booster_types set
    builder_mode=coalesce(nullif(payload->>'builderMode',''),'guided'),
    odds_preset=coalesce(nullif(payload->>'oddsPreset',''),'standard'),
    category_ids=coalesce(array(select jsonb_array_elements_text(coalesce(payload->'categoryIds','[]'::jsonb))),'{}'),
    finish_ids=coalesce(array(select jsonb_array_elements_text(coalesce(payload->'finishIds','[]'::jsonb))),'{}'),
    exclude_promos=coalesce((payload->>'excludePromos')::boolean,true),
    allow_duplicates=coalesce((payload->>'allowDuplicates')::boolean,true),
    updated_at=now()
  where id=lower(trim(payload->>'id'));
  return result;
end;$$;
revoke all on function public.admin_save_booster_v90(jsonb) from public,anon;
grant execute on function public.admin_save_booster_v90(jsonb) to authenticated;

create or replace function public.card_is_booster_eligible_v90(c public.cards,b public.booster_types)
returns boolean language sql stable as $$
  select c.is_visible and c.is_collectible and c.is_pullable and c.pull_weight>0
    and c.publish_status='published'
    and (c.available_from is null or c.available_from<=now())
    and (c.available_until is null or c.available_until>now())
    and (not b.exclude_promos or not c.is_promo)
    and (cardinality(b.category_ids)=0 or c.category_id=any(b.category_ids))
    and (cardinality(b.finish_ids)=0 or c.finish_id=any(b.finish_ids));
$$;

create or replace function public.draw_configured_booster_cards(requested_booster_id text)
returns text[] language plpgsql security definer set search_path=public as $$
declare b public.booster_types%rowtype; selected_ids text[]:=array[]::text[]; rec record; i integer; chosen text; attempts integer;
begin
  select * into b from public.booster_types where id=requested_booster_id and is_active=true and archived=false;
  if not found then raise exception 'This booster is not active.'; end if;
  if b.reward_mode='slots' then
    for rec in select id,quantity from public.booster_slots where booster_id=b.id order by sort_order,id loop
      for i in 1..rec.quantity loop
        attempts:=0;
        loop
          attempts:=attempts+1;
          with rates as (select rarity,percentage,sum(percentage) over(order by case rarity when 'Common' then 1 when 'Uncommon' then 2 when 'Rare' then 3 when 'Epic' then 4 else 5 end) cumulative from public.booster_slot_rates where slot_id=rec.id and percentage>0), chosen_rarity as (select rarity from rates where random()*100<cumulative order by cumulative limit 1)
          select c.id into chosen from public.cards c,chosen_rarity cr where c.rarity=cr.rarity and public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id) and (b.allow_duplicates or not c.id=any(selected_ids)) order by (-ln(greatest(random(),.0000001))/c.pull_weight) limit 1;
          exit when chosen is not null or attempts>=10;
        end loop;
        if chosen is null then raise exception 'No eligible card is available for a configured slot.'; end if;
        selected_ids:=array_append(selected_ids,chosen);
      end loop;
    end loop;
  elsif b.reward_mode='series' then
    for i in 1..b.card_count loop
      select c.id into chosen from public.cards c where c.series_id=b.series_id and public.card_is_booster_eligible_v90(c,b) and (b.allow_duplicates or not c.id=any(selected_ids)) order by (-ln(greatest(random(),.0000001))/c.pull_weight) limit 1;
      if chosen is null then raise exception 'This series has no eligible cards.'; end if; selected_ids:=array_append(selected_ids,chosen);
    end loop;
  elsif b.reward_mode in ('exact','single','mixed') then
    for rec in select * from public.booster_reward_cards where booster_id=b.id order by sort_order,card_id loop for i in 1..rec.quantity loop selected_ids:=array_append(selected_ids,rec.card_id); end loop; end loop;
  elsif b.reward_mode='weighted_pool' then
    for i in 1..b.card_count loop
      select rc.card_id into chosen from public.booster_reward_cards rc join public.cards c on c.id=rc.card_id where rc.booster_id=b.id and rc.weight>0 and public.card_is_booster_eligible_v90(c,b) and (b.allow_duplicates or not c.id=any(selected_ids)) order by (-ln(greatest(random(),.0000001))/rc.weight) limit 1;
      if chosen is null then raise exception 'This booster custom pool is empty.'; end if; selected_ids:=array_append(selected_ids,chosen);
    end loop;
  end if;
  if cardinality(selected_ids)=0 then raise exception 'This booster has no card rewards configured.'; end if;
  return selected_ids;
end;$$;
revoke all on function public.draw_configured_booster_cards(text) from public,anon,authenticated;

create index if not exists cards_category_lookup_idx on public.cards(category_id,series_id,rarity) where is_visible and is_collectible;
create index if not exists cards_finish_lookup_idx on public.cards(finish_id,publish_status) where is_pullable;

create or replace function public.get_public_card_catalog_v1()
returns jsonb language sql stable security definer set search_path=public as $$
select jsonb_build_object(
 'generatedAt',now(),
 'catalogUpdatedAt',greatest(coalesce((select max(updated_at) from public.cards),'epoch'::timestamptz),coalesce((select max(updated_at) from public.card_series),'epoch'::timestamptz)),
 'cards',coalesce((select jsonb_agg(jsonb_build_object(
   'id',c.id,'number',c.card_number,'collectorNumber',c.collector_number,'name',c.name,
   'seriesId',s.id,'seriesName',s.name,'seriesSort',s.sort_order,'seriesDescription',s.description,'boosterImageUrl',s.booster_image_url,
   'rarity',c.rarity,'categoryId',c.category_id,'categoryName',cat.name,'subcategoryId',c.subcategory_id,
   'variantId',c.variant_id,'finishId',c.finish_id,'distributionType',c.distribution_type,'publishStatus',c.publish_status,
   'tags',coalesce((select jsonb_agg(t.name order by t.name) from public.card_tag_assignments a join public.card_tags t on t.id=a.tag_id where a.card_id=c.id),'[]'::jsonb),
   'imageUrl',c.image_url,'thumbnailUrl',coalesce(c.thumbnail_url,c.image_url),'cardDescription',c.description,'artist',c.artist,
   'sortOrder',c.sort_order,'isVisible',c.is_visible,'isCollectible',c.is_collectible,'isPullable',c.is_pullable,'pullWeight',c.pull_weight,'updatedAt',c.updated_at
 ) order by s.sort_order,c.sort_order,c.card_number,c.id) from public.cards c join public.card_series s on s.id=c.series_id left join public.card_categories cat on cat.id=c.category_id where c.is_visible=true and c.publish_status='published' and s.is_visible=true),'[]'::jsonb)
);
$$;
revoke all on function public.get_public_card_catalog_v1() from public;
grant execute on function public.get_public_card_catalog_v1() to anon,authenticated;
