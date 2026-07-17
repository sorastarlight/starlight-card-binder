-- V90.2.1 — Subcategories & Franchise / Theme Classification
-- Safe to rerun after V90.0.

alter table public.card_subcategories
  alter column category_id drop not null;

-- Seed the requested franchise/theme subcategories. category_id is a suggested
-- grouping only; cards may pair any Category with any Subcategory.
insert into public.card_subcategories(id,category_id,name,description,sort_order,is_active)
values
  ('sonic-the-hedgehog','collaboration','Sonic The Hedgehog','Sonic franchise or Sonic-inspired card.',10,true),
  ('digimon','collaboration','Digimon','Digimon franchise or Digimon-inspired card.',20,true),
  ('pokemon','collaboration','Pokémon','Pokémon franchise or Pokémon-inspired card.',30,true),
  ('power-rangers','collaboration','Power Rangers','Power Rangers franchise or inspired card.',40,true),
  ('cardcaptor-sakura','collaboration','Cardcaptor Sakura','Cardcaptor Sakura franchise or inspired card.',50,true),
  ('dragon-ball-z','collaboration','Dragon Ball Z','Dragon Ball Z franchise or inspired card.',60,true),
  ('super-mario-bros','collaboration','Super Mario Bros.','Super Mario franchise or inspired card.',70,true),
  ('hatsune-miku','collaboration','Hatsune Miku','Hatsune Miku or Vocaloid-inspired card.',80,true),
  ('sega','special','SEGA','SEGA brand, hardware, games, or inspired card.',90,true),
  ('nintendo','special','Nintendo','Nintendo brand, hardware, games, or inspired card.',100,true),
  ('magical-girls','special','Magical Girls','General magical-girl theme.',110,true),
  ('pop-idol','special','Pop Idol','Idol, concert, singer, or performance theme.',120,true),
  ('anime','special','Anime','General anime theme.',130,true),
  ('video-games','special','Video Games','General video-game theme.',140,true),
  ('pretty-cure','collaboration','Pretty Cure','Pretty Cure franchise or inspired card.',150,true),
  ('sailor-moon','collaboration','Sailor Moon','Sailor Moon franchise or inspired card.',160,true),
  ('other','special','Other','Other franchise or theme.',999,true)
on conflict(id) do update set
  category_id=excluded.category_id,
  name=excluded.name,
  description=excluded.description,
  sort_order=excluded.sort_order,
  is_active=excluded.is_active;

create or replace function public.admin_save_card_subcategory_v9021(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  sid text := lower(trim(payload->>'id'));
  sname text := trim(payload->>'name');
  suggested_category text := nullif(trim(payload->>'categoryId'),'');
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if sid is null or sid !~ '^[a-z0-9][a-z0-9_-]{1,59}$' then
    raise exception 'Subcategory ID must use 2–60 lowercase letters, numbers, hyphens, or underscores.';
  end if;
  if sname is null or length(sname) < 2 then
    raise exception 'Subcategory name is required.';
  end if;
  if suggested_category is not null and not exists(select 1 from public.card_categories where id=suggested_category) then
    raise exception 'The suggested category does not exist.';
  end if;

  insert into public.card_subcategories(id,category_id,name,description,sort_order,is_active)
  values(
    sid,
    suggested_category,
    sname,
    nullif(trim(payload->>'description'),''),
    coalesce((payload->>'sortOrder')::integer,0),
    coalesce((payload->>'isActive')::boolean,true)
  )
  on conflict(id) do update set
    category_id=excluded.category_id,
    name=excluded.name,
    description=excluded.description,
    sort_order=excluded.sort_order,
    is_active=excluded.is_active;

  return jsonb_build_object('success',true,'id',sid);
end;
$$;

create or replace function public.admin_delete_card_subcategory_v9021(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  used_count integer;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  select count(*) into used_count from public.cards where subcategory_id=requested_id;
  if used_count > 0 then
    raise exception 'This subcategory is assigned to % card(s). Reassign those cards or deactivate the subcategory instead.', used_count;
  end if;
  delete from public.card_subcategories where id=requested_id;
  return jsonb_build_object('success',true,'id',requested_id);
end;
$$;

revoke all on function public.admin_save_card_subcategory_v9021(jsonb) from public,anon;
revoke all on function public.admin_delete_card_subcategory_v9021(text) from public,anon;
grant execute on function public.admin_save_card_subcategory_v9021(jsonb) to authenticated;
grant execute on function public.admin_delete_card_subcategory_v9021(text) to authenticated;
