-- V89.7 Simplified Booster Builder
-- Adds safe booster cloning and ready-made starter templates.

create or replace function public.admin_clone_booster_v897(
  requested_source_id text,
  requested_new_id text,
  requested_new_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  src public.booster_types%rowtype;
  old_slot record;
  new_slot_id bigint;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  requested_new_id := lower(trim(requested_new_id));
  requested_new_name := trim(requested_new_name);

  if requested_new_id !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'The new booster ID is invalid.';
  end if;
  if requested_new_name is null or requested_new_name = '' then
    raise exception 'Enter a name for the copied booster.';
  end if;
  if exists(select 1 from public.booster_types where id = requested_new_id) then
    raise exception 'A booster with that ID already exists.';
  end if;

  select * into src from public.booster_types where id = requested_source_id;
  if not found then raise exception 'The source booster could not be found.'; end if;

  insert into public.booster_types(
    id,name,description,star_bits_cost,is_active,sort_order,
    pack_image_url,card_back_url,reward_mode,series_id,card_count,
    bonus_star_bits,archived,created_at,updated_at
  )
  values(
    requested_new_id,requested_new_name,src.description,src.star_bits_cost,false,src.sort_order,
    src.pack_image_url,src.card_back_url,src.reward_mode,src.series_id,src.card_count,
    src.bonus_star_bits,false,now(),now()
  );

  for old_slot in
    select * from public.booster_slots
    where booster_id = requested_source_id
    order by sort_order,id
  loop
    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order,created_at,updated_at)
    values(requested_new_id,old_slot.slot_key,old_slot.name,old_slot.quantity,old_slot.sort_order,now(),now())
    returning id into new_slot_id;

    insert into public.booster_slot_rates(slot_id,rarity,percentage,updated_at)
    select new_slot_id,rarity,percentage,now()
    from public.booster_slot_rates
    where slot_id = old_slot.id;
  end loop;

  insert into public.booster_reward_cards(booster_id,card_id,quantity,weight,guaranteed,sort_order)
  select requested_new_id,card_id,quantity,weight,guaranteed,sort_order
  from public.booster_reward_cards
  where booster_id = requested_source_id;

  return jsonb_build_object('success',true,'id',requested_new_id,'sourceId',requested_source_id);
end;
$$;

revoke all on function public.admin_clone_booster_v897(text,text,text) from public,anon;
grant execute on function public.admin_clone_booster_v897(text,text,text) to authenticated;


create or replace function public.admin_create_booster_from_template_v897(
  requested_template_id text,
  requested_new_id text,
  requested_new_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  slot_id bigint;
  template_id text := lower(trim(requested_template_id));
  reward_mode_value text := 'slots';
  card_count_value integer := 4;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  requested_new_id := lower(trim(requested_new_id));
  requested_new_name := trim(requested_new_name);

  if requested_new_id !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'The new booster ID is invalid.';
  end if;
  if requested_new_name is null or requested_new_name = '' then
    raise exception 'Enter a booster name.';
  end if;
  if exists(select 1 from public.booster_types where id = requested_new_id) then
    raise exception 'A booster with that ID already exists.';
  end if;
  if template_id not in ('standard','series','guaranteed','exact','custom') then
    raise exception 'Unknown booster template.';
  end if;

  if template_id = 'series' then reward_mode_value := 'series'; card_count_value := 4; end if;
  if template_id = 'exact' then reward_mode_value := 'exact'; card_count_value := 1; end if;
  if template_id = 'custom' then reward_mode_value := 'weighted_pool'; card_count_value := 4; end if;

  insert into public.booster_types(
    id,name,description,star_bits_cost,is_active,sort_order,
    pack_image_url,card_back_url,reward_mode,series_id,card_count,
    bonus_star_bits,archived,created_at,updated_at
  )
  values(
    requested_new_id,requested_new_name,
    case template_id
      when 'standard' then 'A standard four-card Starlight booster.'
      when 'series' then 'A four-card booster restricted to one series.'
      when 'guaranteed' then 'A premium booster with a guaranteed Epic-or-Legendary slot.'
      when 'exact' then 'A pack that awards specifically selected cards.'
      else 'A custom weighted booster.'
    end,
    0,false,0,
    'site_assets/series01_rising_star_booster.png',
    'site_assets/StarlightCard_Back_NewLogo.png',
    reward_mode_value,null,card_count_value,0,false,now(),now()
  );

  if template_id = 'standard' then
    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'common','Common Cards',2,10) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',100),(slot_id,'Uncommon',0),(slot_id,'Rare',0),(slot_id,'Epic',0),(slot_id,'Legendary',0);

    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'uncommon','Uncommon Card',1,20) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',0),(slot_id,'Uncommon',100),(slot_id,'Rare',0),(slot_id,'Epic',0),(slot_id,'Legendary',0);

    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'rare_plus','Rare or Better',1,30) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',0),(slot_id,'Uncommon',0),(slot_id,'Rare',70),(slot_id,'Epic',22),(slot_id,'Legendary',8);
  elsif template_id = 'guaranteed' then
    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'regular','Regular Cards',3,10) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',55),(slot_id,'Uncommon',30),(slot_id,'Rare',15),(slot_id,'Epic',0),(slot_id,'Legendary',0);

    insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order)
    values(requested_new_id,'epic_plus','Guaranteed Epic or Legendary',1,20) returning id into slot_id;
    insert into public.booster_slot_rates(slot_id,rarity,percentage) values
      (slot_id,'Common',0),(slot_id,'Uncommon',0),(slot_id,'Rare',0),(slot_id,'Epic',85),(slot_id,'Legendary',15);
  end if;

  return jsonb_build_object('success',true,'id',requested_new_id,'template',template_id);
end;
$$;

revoke all on function public.admin_create_booster_from_template_v897(text,text,text) from public,anon;
grant execute on function public.admin_create_booster_from_template_v897(text,text,text) to authenticated;
