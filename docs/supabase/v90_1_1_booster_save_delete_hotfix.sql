-- ============================================================
-- STARLIGHT CARD BINDER V90.1.1
-- Booster Save/Delete Hotfix
-- Run after V90.1
-- ============================================================

create or replace function public.admin_save_booster_v9011(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  bid text:=lower(trim(payload->>'id'));
  slot jsonb;
  saved_slot_id bigint;
  keep_slot_keys text[]:=array[]::text[];
  slot_key_value text;
  rarity_name text;
  rarity_value numeric;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  -- Save the booster record first. This is important for newly-created packs,
  -- because their slot rows require the booster foreign key to already exist.
  result:=public.admin_save_booster_v84(payload);

  update public.booster_types set
    builder_mode=coalesce(nullif(payload->>'builderMode',''),'guided'),
    odds_preset=coalesce(nullif(payload->>'oddsPreset',''),'standard'),
    category_ids=coalesce(array(select jsonb_array_elements_text(coalesce(payload->'categoryIds','[]'::jsonb))),'{}'),
    finish_ids=coalesce(array(select jsonb_array_elements_text(coalesce(payload->'finishIds','[]'::jsonb))),'{}'),
    exclude_promos=coalesce((payload->>'excludePromos')::boolean,true),
    allow_duplicates=coalesce((payload->>'allowDuplicates')::boolean,true),
    updated_at=now()
  where id=bid;

  -- Save every slot and its rarity rates in the same database operation.
  if payload ? 'slots' then
    for slot in select value from jsonb_array_elements(coalesce(payload->'slots','[]'::jsonb)) loop
      slot_key_value:=lower(trim(coalesce(nullif(slot->>'slotKey',''),'slot_'||(coalesce((slot->>'sortOrder')::integer,0)+1)::text)));
      keep_slot_keys:=array_append(keep_slot_keys,slot_key_value);

      insert into public.booster_slots(booster_id,slot_key,name,quantity,sort_order,updated_at)
      values(
        bid,
        slot_key_value,
        coalesce(nullif(trim(slot->>'name'),''),'Card Slot'),
        greatest(coalesce((slot->>'quantity')::integer,1),1),
        coalesce((slot->>'sortOrder')::integer,0),
        now()
      )
      on conflict(booster_id,slot_key) do update set
        name=excluded.name,
        quantity=excluded.quantity,
        sort_order=excluded.sort_order,
        updated_at=now()
      returning id into saved_slot_id;

      delete from public.booster_slot_rates where slot_id=saved_slot_id;
      foreach rarity_name in array array['Common','Uncommon','Rare','Epic','Legendary'] loop
        rarity_value:=coalesce((slot->'rates'->>rarity_name)::numeric,0);
        insert into public.booster_slot_rates(slot_id,rarity,percentage,updated_at)
        values(saved_slot_id,rarity_name,greatest(least(rarity_value,100),0),now());
      end loop;
    end loop;

    if cardinality(keep_slot_keys)>0 then
      delete from public.booster_slots
      where booster_id=bid and not(slot_key=any(keep_slot_keys));
    else
      delete from public.booster_slots where booster_id=bid;
    end if;
  end if;

  return jsonb_build_object('success',true,'id',bid,'savedSlots',coalesce(jsonb_array_length(payload->'slots'),0));
end;
$$;

revoke all on function public.admin_save_booster_v9011(jsonb) from public,anon;
grant execute on function public.admin_save_booster_v9011(jsonb) to authenticated;


create or replace function public.admin_delete_booster_v9011(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  deleted_rules integer:=0;
  cancelled_gifts integer:=0;
  cleared_purchases integer:=0;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  requested_id:=lower(trim(requested_id));
  if requested_id='free_daily' then
    raise exception 'The system Free Daily Booster cannot be deleted. Disable or edit it instead.';
  end if;
  if not exists(select 1 from public.booster_types where id=requested_id) then
    raise exception 'Booster % does not exist.',requested_id;
  end if;

  -- Remove live Twitch rules that cannot remain valid without this booster.
  if to_regclass('public.twitch_reward_rules') is not null then
    delete from public.twitch_reward_rules where booster_id=requested_id;
    get diagnostics deleted_rules=row_count;
  end if;

  -- Keep purchase history but detach its optional booster reference.
  if to_regclass('public.star_bits_booster_purchases') is not null then
    update public.star_bits_booster_purchases set booster_id=null where booster_id=requested_id;
    get diagnostics cleared_purchases=row_count;
  end if;

  -- Pending gifts for a deleted booster can no longer be claimed safely.
  if to_regclass('public.received_rewards') is not null then
    update public.received_rewards
    set status='cancelled',
        message=concat_ws(' ',message,'This booster was removed by an administrator.'),
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('deletedBoosterId',requested_id)
    where status='pending'
      and reward_type='booster'
      and reward_payload->>'boosterId'=requested_id;
    get diagnostics cancelled_gifts=row_count;
  end if;

  -- Slots and configured reward-card rows cascade automatically.
  delete from public.booster_types where id=requested_id;

  return jsonb_build_object(
    'success',true,
    'deletedId',requested_id,
    'deletedTwitchRules',deleted_rules,
    'detachedPurchases',cleared_purchases,
    'cancelledPendingGifts',cancelled_gifts
  );
exception when foreign_key_violation then
  raise exception 'This booster still has a protected database reference. Use Inspect References and remove the listed dependency, then try again.';
end;
$$;

revoke all on function public.admin_delete_booster_v9011(text) from public,anon;
grant execute on function public.admin_delete_booster_v9011(text) to authenticated;
