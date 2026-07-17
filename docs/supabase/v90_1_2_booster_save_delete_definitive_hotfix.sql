-- V90.1.2 — Definitive Booster Save/Delete Hotfix
-- Safe to rerun.

create or replace function public.admin_save_booster_complete_v9012(
  payload jsonb,
  requested_slots jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bid text := lower(trim(payload->>'id'));
  reward_mode text := coalesce(nullif(payload->>'rewardMode',''),'slots');
  slot_item jsonb;
  slot_id_value bigint;
  slot_key_value text;
  slot_name_value text;
  rate_pair record;
  rate_total numeric;
  kept_keys text[] := array[]::text[];
  result jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Booster ID is invalid.';
  end if;

  -- Save/create the booster before touching child slot rows.
  result := public.admin_save_booster_v90(payload);

  if reward_mode = 'slots' then
    if jsonb_typeof(coalesce(requested_slots,'[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(requested_slots,'[]'::jsonb)) = 0 then
      raise exception 'This booster uses rarity slots, but no slots were provided.';
    end if;

    for slot_item in
      select value from jsonb_array_elements(coalesce(requested_slots,'[]'::jsonb))
    loop
      slot_key_value := lower(regexp_replace(
        coalesce(nullif(trim(slot_item->>'slotKey'),''), 'slot_' || (coalesce(array_length(kept_keys,1),0)+1)::text),
        '[^a-z0-9_-]+', '_', 'g'
      ));
      slot_name_value := coalesce(nullif(trim(slot_item->>'name'),''), initcap(replace(slot_key_value,'_',' ')));
      kept_keys := array_append(kept_keys, slot_key_value);

      select coalesce(sum((value)::numeric),0)
      into rate_total
      from jsonb_each_text(coalesce(slot_item->'rates','{}'::jsonb));

      if abs(rate_total - 100) > 0.001 then
        raise exception 'Slot "%" totals %%. Every rarity slot must total exactly 100%%.', slot_name_value, rate_total;
      end if;

      insert into public.booster_slots(
        booster_id, slot_key, name, quantity, sort_order, updated_at
      ) values (
        bid,
        slot_key_value,
        slot_name_value,
        greatest(coalesce((slot_item->>'quantity')::integer,1),1),
        coalesce((slot_item->>'sortOrder')::integer,0),
        now()
      )
      on conflict (booster_id,slot_key) do update set
        name = excluded.name,
        quantity = excluded.quantity,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id into slot_id_value;

      delete from public.booster_slot_rates where slot_id = slot_id_value;

      for rate_pair in
        select key, value from jsonb_each_text(coalesce(slot_item->'rates','{}'::jsonb))
      loop
        insert into public.booster_slot_rates(slot_id,rarity,percentage)
        values(slot_id_value,rate_pair.key,greatest((rate_pair.value)::numeric,0));
      end loop;
    end loop;

    delete from public.booster_slots
    where booster_id = bid
      and not (slot_key = any(kept_keys));
  end if;

  return result || jsonb_build_object(
    'success', true,
    'id', bid,
    'slotCount', case when reward_mode='slots' then coalesce(array_length(kept_keys,1),0) else 0 end
  );
end;
$$;

revoke all on function public.admin_save_booster_complete_v9012(jsonb,jsonb) from public,anon;
grant execute on function public.admin_save_booster_complete_v9012(jsonb,jsonb) to authenticated;


create or replace function public.admin_safe_delete_booster_v9012(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_id text := lower(trim(requested_id));
  ref record;
  nullable_column boolean;
  affected bigint := 0;
  cleanup jsonb := '[]'::jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if normalized_id = 'free_daily' then
    raise exception 'The system Daily Free Booster cannot be deleted.';
  end if;

  if not exists(select 1 from public.booster_types where id=normalized_id) then
    raise exception 'Booster % does not exist.', normalized_id;
  end if;

  -- Known application references that should not block deletion.
  if to_regclass('public.twitch_reward_rules') is not null then
    delete from public.twitch_reward_rules where booster_id=normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(jsonb_build_object('table','twitch_reward_rules','action','deleted','count',affected));
  end if;

  if to_regclass('public.star_bits_booster_purchases') is not null then
    update public.star_bits_booster_purchases set booster_id=null where booster_id=normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(jsonb_build_object('table','star_bits_booster_purchases','action','detached','count',affected));
  end if;

  -- Handle any remaining restrictive foreign keys safely.
  for ref in
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name,
      c.confdeltype,
      not a.attnotnull as is_nullable
    from pg_constraint c
    join unnest(c.conkey) with ordinality ck(attnum,ord) on true
    join unnest(c.confkey) with ordinality fk(attnum,ord) using(ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=ck.attnum
    join pg_attribute pa on pa.attrelid=c.confrelid and pa.attnum=fk.attnum
    where c.contype='f'
      and c.confrelid='public.booster_types'::regclass
      and pa.attname='id'
      and c.confdeltype in ('a','r')
  loop
    if ref.is_nullable then
      execute format('update %s set %I=null where %I=$1',ref.table_name,ref.column_name,ref.column_name)
      using normalized_id;
      get diagnostics affected = row_count;
      cleanup := cleanup || jsonb_build_array(jsonb_build_object('table',ref.table_name,'action','detached','count',affected));
    else
      execute format('delete from %s where %I=$1',ref.table_name,ref.column_name)
      using normalized_id;
      get diagnostics affected = row_count;
      cleanup := cleanup || jsonb_build_array(jsonb_build_object('table',ref.table_name,'action','deleted dependent rows','count',affected));
    end if;
  end loop;

  delete from public.booster_types where id=normalized_id;

  return jsonb_build_object(
    'success',true,
    'deletedId',normalized_id,
    'cleanup',cleanup
  );
end;
$$;

revoke all on function public.admin_safe_delete_booster_v9012(text) from public,anon;
grant execute on function public.admin_safe_delete_booster_v9012(text) to authenticated;
