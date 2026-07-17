-- V90.1.4 — Booster Actions Service Alignment
-- Safe to rerun. Reinstalls the known-good save/delete functions used by the site.

create or replace function public.admin_save_booster_v9011(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  result jsonb;
  bid text:=lower(trim(payload->>'id'));
  reward_mode text:=coalesce(nullif(payload->>'rewardMode',''),'slots');
  slot jsonb;
  saved_slot_id bigint;
  keep_slot_keys text[]:=array[]::text[];
  slot_key_value text;
  rarity_name text;
  rarity_value numeric;
  rarity_total numeric;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Booster ID is invalid.';
  end if;

  result:=public.admin_save_booster_v90(payload);

  if reward_mode='slots' then
    if jsonb_typeof(coalesce(payload->'slots','[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(payload->'slots','[]'::jsonb))=0 then
      raise exception 'This booster uses rarity slots, but no slots were provided.';
    end if;

    for slot in select value from jsonb_array_elements(coalesce(payload->'slots','[]'::jsonb)) loop
      slot_key_value:=lower(regexp_replace(
        coalesce(nullif(trim(slot->>'slotKey'),''),'slot_'||(coalesce(array_length(keep_slot_keys,1),0)+1)::text),
        '[^a-z0-9_-]+','_','g'
      ));

      if slot_key_value=any(keep_slot_keys) then
        raise exception using message=format('Duplicate booster slot key: %s',slot_key_value);
      end if;
      keep_slot_keys:=array_append(keep_slot_keys,slot_key_value);

      select coalesce(sum(value::numeric),0)
      into rarity_total
      from jsonb_each_text(coalesce(slot->'rates','{}'::jsonb));

      if abs(rarity_total-100)>0.001 then
        raise exception using message=format(
          'Slot "%s" totals %s%%. Every rarity slot must total exactly 100%%.',
          coalesce(nullif(trim(slot->>'name'),''),slot_key_value),rarity_total
        );
      end if;

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

    delete from public.booster_slots
    where booster_id=bid and not(slot_key=any(keep_slot_keys));
  else
    delete from public.booster_slots where booster_id=bid;
  end if;

  return result||jsonb_build_object('success',true,'id',bid,'savedSlots',coalesce(array_length(keep_slot_keys,1),0));
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
  bid text:=lower(trim(requested_id));
  deleted_rules integer:=0;
  cancelled_gifts integer:=0;
  cleared_purchases integer:=0;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if bid='free_daily' then
    raise exception 'The system Free Daily Booster cannot be deleted. Disable or edit it instead.';
  end if;
  if not exists(select 1 from public.booster_types where id=bid) then
    raise exception using message=format('Booster %s does not exist.',bid);
  end if;

  if to_regclass('public.twitch_reward_rules') is not null then
    delete from public.twitch_reward_rules where booster_id=bid;
    get diagnostics deleted_rules=row_count;
  end if;

  if to_regclass('public.star_bits_booster_purchases') is not null then
    update public.star_bits_booster_purchases set booster_id=null where booster_id=bid;
    get diagnostics cleared_purchases=row_count;
  end if;

  if to_regclass('public.received_rewards') is not null then
    update public.received_rewards
    set status='cancelled',
        message=concat_ws(' ',message,'This booster was removed by an administrator.'),
        metadata=coalesce(metadata,'{}'::jsonb)||jsonb_build_object('deletedBoosterId',bid)
    where status='pending'
      and reward_type='booster'
      and reward_payload->>'boosterId'=bid;
    get diagnostics cancelled_gifts=row_count;
  end if;

  delete from public.booster_types where id=bid;

  return jsonb_build_object(
    'success',true,
    'deletedId',bid,
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
