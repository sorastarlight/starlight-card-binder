-- ============================================================
-- STARLIGHT CARD BINDER V83.0
-- Administration, booster media, free-booster modes, user directory
-- ============================================================

alter table public.booster_types
  add column if not exists pack_image_url text,
  add column if not exists card_back_url text;

update public.booster_types
set pack_image_url = coalesce(pack_image_url, 'site_assets/series01_rising_star_booster.png'),
    card_back_url = coalesce(card_back_url, 'site_assets/StarlightCard_Back_NewLogo.png');

create table if not exists public.site_settings (
  setting_key text primary key,
  setting_value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

insert into public.site_settings(setting_key, setting_value)
values ('free_daily_booster_mode', '"daily"'::jsonb)
on conflict (setting_key) do nothing;

create or replace function public.get_free_daily_booster_mode()
returns text language sql stable security definer set search_path=public as $$
  select coalesce((select setting_value #>> '{}' from public.site_settings where setting_key='free_daily_booster_mode'),'daily')
$$;
grant execute on function public.get_free_daily_booster_mode() to anon, authenticated;

create or replace function public.admin_set_daily_booster_mode(requested_mode text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor_role text;
begin
  select role into actor_role from public.site_roles where user_id=auth.uid();
  if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
  if requested_mode not in ('daily','unlimited','disabled') then raise exception 'Invalid free booster mode.'; end if;
  insert into public.site_settings(setting_key,setting_value,updated_at,updated_by)
  values('free_daily_booster_mode',to_jsonb(requested_mode),now(),auth.uid())
  on conflict(setting_key) do update set setting_value=excluded.setting_value,updated_at=now(),updated_by=auth.uid();
  return jsonb_build_object('success',true,'mode',requested_mode);
end;$$;
revoke all on function public.admin_set_daily_booster_mode(text) from public,anon;
grant execute on function public.admin_set_daily_booster_mode(text) to authenticated;

create or replace function public.get_daily_booster_status()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); mode text; today date; next_at timestamptz; claim public.daily_booster_claims%rowtype;
begin
  if uid is null then raise exception 'You must be signed in to check your daily booster.'; end if;
  mode:=public.get_free_daily_booster_mode(); today:=timezone('America/New_York',now())::date;
  next_at:=((today+1)::timestamp at time zone 'America/New_York');
  if mode='disabled' then return jsonb_build_object('available',false,'disabled',true,'mode',mode,'nextClaimAt',null,'cardsAwarded','[]'::jsonb); end if;
  if mode='unlimited' then return jsonb_build_object('available',true,'disabled',false,'mode',mode,'nextClaimAt',null,'cardsAwarded','[]'::jsonb); end if;
  select * into claim from public.daily_booster_claims where user_id=uid and claim_date=today limit 1;
  if found then return jsonb_build_object('available',false,'disabled',false,'mode',mode,'claimDate',today,'claimedAt',claim.claimed_at,'nextClaimAt',next_at,'cardsAwarded',claim.cards_awarded); end if;
  return jsonb_build_object('available',true,'disabled',false,'mode',mode,'claimDate',today,'nextClaimAt',next_at,'cardsAwarded','[]'::jsonb);
end;$$;
grant execute on function public.get_daily_booster_status() to authenticated;

create or replace function public.open_daily_booster()
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); mode text; today date; next_at timestamptz; claim_id bigint; selected text[]; rewards jsonb;
begin
 if uid is null then raise exception 'You must be signed in to open a daily booster.'; end if;
 mode:=public.get_free_daily_booster_mode();
 if mode='disabled' then raise exception 'The Free Daily Booster is currently disabled.'; end if;
 today:=timezone('America/New_York',now())::date; next_at:=((today+1)::timestamp at time zone 'America/New_York');
 if mode='daily' then
   insert into public.daily_booster_claims(user_id,claim_date,cards_awarded) values(uid,today,'[]'::jsonb)
   on conflict(user_id,claim_date) do nothing returning id into claim_id;
   if claim_id is null then return jsonb_build_object('success',false,'alreadyClaimed',true,'message','Today''s daily booster has already been opened.','nextClaimAt',next_at); end if;
 end if;
 begin selected:=public.draw_configured_booster_cards('free_daily'); exception when others then if claim_id is not null then delete from public.daily_booster_claims where id=claim_id; end if; raise; end;
 insert into public.user_cards(user_id,card_id,quantity,is_favorite,first_obtained_at,last_obtained_at,updated_at)
 select uid,x.card_id,x.qty,false,now(),now(),now() from (select card_id,count(*)::int qty from unnest(selected) card_id group by card_id)x
 on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
 select jsonb_agg(jsonb_build_object('id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'seriesId',c.series_id,'seriesName',s.name,'artist',c.artist,'description',c.description,'quantity',uc.quantity,'isDuplicate',uc.quantity>1) order by p.pos)
 into rewards from unnest(selected) with ordinality p(card_id,pos) join public.cards c on c.id=p.card_id join public.card_series s on s.id=c.series_id join public.user_cards uc on uc.user_id=uid and uc.card_id=c.id;
 if claim_id is not null then update public.daily_booster_claims set cards_awarded=rewards where id=claim_id; end if;
 return jsonb_build_object('success',true,'alreadyClaimed',false,'mode',mode,'claimDate',today,'claimedAt',now(),'nextClaimAt',case when mode='daily' then next_at else null end,'cards',rewards);
end;$$;
grant execute on function public.open_daily_booster() to authenticated;

create or replace function public.admin_update_booster_v83(requested_booster_id text,requested_name text,requested_description text,requested_star_bits_cost integer,requested_is_active boolean,requested_pack_image_url text,requested_card_back_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor_role text;
begin
 select role into actor_role from public.site_roles where user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 update public.booster_types set name=nullif(trim(requested_name),''),description=nullif(trim(requested_description),''),star_bits_cost=greatest(requested_star_bits_cost,0),is_active=requested_is_active,pack_image_url=coalesce(nullif(trim(requested_pack_image_url),''),'site_assets/series01_rising_star_booster.png'),card_back_url=coalesce(nullif(trim(requested_card_back_url),''),'site_assets/StarlightCard_Back_NewLogo.png'),updated_at=now() where id=requested_booster_id;
 if not found then raise exception 'Booster not found.'; end if; return jsonb_build_object('success',true);
end;$$;
revoke all on function public.admin_update_booster_v83(text,text,text,integer,boolean,text,text) from public,anon;
grant execute on function public.admin_update_booster_v83(text,text,text,integer,boolean,text,text) to authenticated;

create or replace function public.admin_create_booster(requested_id text,requested_name text,requested_clone_from text default null)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor_role text; new_id text:=lower(trim(requested_id)); src public.booster_types%rowtype; new_slot bigint; old_slot record;
begin
 select role into actor_role from public.site_roles where user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 if new_id !~ '^[a-z0-9_]{3,40}$' then raise exception 'Booster ID must use lowercase letters, numbers, and underscores.'; end if;
 if requested_clone_from is not null and requested_clone_from<>'' then select * into src from public.booster_types where id=requested_clone_from; end if;
 insert into public.booster_types(id,name,description,star_bits_cost,is_active,sort_order,pack_image_url,card_back_url)
 values(new_id,coalesce(nullif(trim(requested_name),''),initcap(replace(new_id,'_',' '))),src.description,coalesce(src.star_bits_cost,100),false,100,coalesce(src.pack_image_url,'site_assets/series01_rising_star_booster.png'),coalesce(src.card_back_url,'site_assets/StarlightCard_Back_NewLogo.png'));
 if src.id is not null then
   for old_slot in select * from public.booster_slots where booster_id=src.id order by sort_order loop
     insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order) values(new_id,old_slot.slot_key,old_slot.name,old_slot.quantity,old_slot.sort_order) returning id into new_slot;
     insert into public.booster_slot_rates(slot_id,rarity,percentage) select new_slot,rarity,percentage from public.booster_slot_rates where slot_id=old_slot.id;
   end loop;
 else
   insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order) values(new_id,'rare_plus','Cards',4,10) returning id into new_slot;
   insert into public.booster_slot_rates(slot_id,rarity,percentage) values(new_slot,'Common',50),(new_slot,'Uncommon',25),(new_slot,'Rare',15),(new_slot,'Epic',8),(new_slot,'Legendary',2);
 end if;
 return jsonb_build_object('success',true,'id',new_id);
end;$$;
revoke all on function public.admin_create_booster(text,text,text) from public,anon;
grant execute on function public.admin_create_booster(text,text,text) to authenticated;

create or replace function public.admin_update_card_pull_settings_v83(requested_card_id text,requested_rarity text,requested_pull_weight numeric,requested_is_pullable boolean,requested_image_url text,requested_thumbnail_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor_role text;
begin
 select role into actor_role from public.site_roles where user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 if requested_rarity not in ('Common','Uncommon','Rare','Epic','Legendary') then raise exception 'Invalid rarity.'; end if;
 update public.cards set rarity=requested_rarity,pull_weight=greatest(requested_pull_weight,0),is_pullable=requested_is_pullable,image_url=coalesce(nullif(trim(requested_image_url),''),image_url),thumbnail_url=coalesce(nullif(trim(requested_thumbnail_url),''),thumbnail_url),updated_at=now() where id=requested_card_id;
 if not found then raise exception 'Card not found.'; end if; return jsonb_build_object('success',true);
end;$$;
revoke all on function public.admin_update_card_pull_settings_v83(text,text,numeric,boolean,text,text) from public,anon;
grant execute on function public.admin_update_card_pull_settings_v83(text,text,numeric,boolean,text,text) to authenticated;

create or replace function public.admin_get_booster_configuration()
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor_role text; result jsonb;
begin
 select role into actor_role from public.site_roles where user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 select jsonb_build_object('dailyMode',public.get_free_daily_booster_mode(),'boosters',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'description',b.description,'starBitsCost',b.star_bits_cost,'isActive',b.is_active,'packImageUrl',b.pack_image_url,'cardBackUrl',b.card_back_url,'slots',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'slotKey',s.slot_key,'name',s.name,'quantity',s.quantity,'percentageTotal',t.percentage_total,'isValid',t.is_valid,'rates',coalesce((select jsonb_object_agg(r.rarity,r.percentage) from public.booster_slot_rates r where r.slot_id=s.id),'{}'::jsonb)) order by s.sort_order,s.id) from public.booster_slots s join public.booster_slot_rate_totals t on t.slot_id=s.id where s.booster_id=b.id),'[]'::jsonb)) order by b.sort_order,b.id) from public.booster_types b),'[]'::jsonb),'cards',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'cardNumber',c.card_number,'name',c.name,'rarity',c.rarity,'pullWeight',c.pull_weight,'isPullable',c.is_pullable,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url) order by c.series_id,c.sort_order) from public.cards c),'[]'::jsonb)) into result;
 return result;
end;$$;
grant execute on function public.admin_get_booster_configuration() to authenticated;

-- Recreate directory with explicit schemas and a bounded result.
create or replace function public.admin_list_user_directory(requested_search text default null,requested_limit integer default 500)
returns jsonb language plpgsql security definer set search_path=public as $$
declare actor_role text; result jsonb; q text:=lower(trim(coalesce(requested_search,'')));
begin
 select sr.role into actor_role from public.site_roles sr where sr.user_id=auth.uid(); if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('userId',d.id,'email',d.email,'username',d.username,'displayName',d.display_name,'role',d.role,'profileVisibility',d.profile_visibility,'accountCreatedAt',d.created_at,'lastSignInAt',d.last_sign_in_at) order by d.created_at desc),'[]'::jsonb) into result
 from (select u.id,u.email,p.username,p.display_name,sr.role,p.profile_visibility,u.created_at,u.last_sign_in_at from auth.users u left join public.profiles p on p.id=u.id left join public.site_roles sr on sr.user_id=u.id where q='' or lower(coalesce(u.email,'')) like '%'||q||'%' or lower(coalesce(p.username,'')) like '%'||q||'%' or lower(coalesce(p.display_name,'')) like '%'||q||'%' order by u.created_at desc limit greatest(1,least(coalesce(requested_limit,500),1000))) d;
 return result;
end;$$;
grant execute on function public.admin_list_user_directory(text,integer) to authenticated;
