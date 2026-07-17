-- ============================================================
-- STARLIGHT CARD BINDER V90.1
-- Booster Repair & Card Management Polish
-- Run after V90.0
-- ============================================================

create or replace function public.admin_booster_reference_report_v901(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  ref record;
  ref_count bigint;
  refs jsonb := '[]'::jsonb;
  action_name text;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if not exists(select 1 from public.booster_types where id=requested_id) then
    raise exception 'Booster % does not exist.', requested_id;
  end if;

  for ref in
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name,
      c.confdeltype
    from pg_constraint c
    join unnest(c.conkey) with ordinality ck(attnum,ord) on true
    join unnest(c.confkey) with ordinality fk(attnum,ord) using(ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=ck.attnum
    join pg_attribute pa on pa.attrelid=c.confrelid and pa.attnum=fk.attnum
    where c.contype='f'
      and c.confrelid='public.booster_types'::regclass
      and pa.attname='id'
    order by c.conrelid::regclass::text,a.attname
  loop
    execute format('select count(*) from %s where %I=$1',ref.table_name,ref.column_name)
      into ref_count using requested_id;
    action_name := case ref.confdeltype
      when 'c' then 'cascade'
      when 'n' then 'set null'
      when 'd' then 'set default'
      when 'r' then 'restrict'
      else 'no action'
    end;
    refs := refs || jsonb_build_array(jsonb_build_object(
      'table',ref.table_name,
      'column',ref.column_name,
      'count',ref_count,
      'onDelete',action_name
    ));
  end loop;

  return jsonb_build_object(
    'boosterId',requested_id,
    'references',refs,
    'totalReferences',coalesce((select sum((x->>'count')::bigint) from jsonb_array_elements(refs) x),0)
  );
end;
$$;

revoke all on function public.admin_booster_reference_report_v901(text) from public,anon;
grant execute on function public.admin_booster_reference_report_v901(text) to authenticated;


create or replace function public.admin_rename_booster_id_v901(
  requested_old_id text,
  requested_new_id text,
  requested_new_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  old_row public.booster_types;
  new_payload jsonb;
  ref record;
  changed bigint;
  updates jsonb := '[]'::jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  requested_old_id := lower(trim(requested_old_id));
  requested_new_id := lower(trim(requested_new_id));

  if requested_new_id is null or requested_new_id !~ '^[a-z0-9_-]{3,80}$' then
    raise exception 'The new booster ID may only contain lowercase letters, numbers, underscores, and hyphens.';
  end if;
  if requested_old_id=requested_new_id then
    raise exception 'Enter a different booster ID.';
  end if;

  select * into old_row from public.booster_types where id=requested_old_id for update;
  if not found then raise exception 'Booster % does not exist.',requested_old_id; end if;
  if exists(select 1 from public.booster_types where id=requested_new_id) then
    raise exception 'A booster with ID % already exists.',requested_new_id;
  end if;

  new_payload := to_jsonb(old_row) || jsonb_build_object(
    'id',requested_new_id,
    'name',coalesce(nullif(trim(requested_new_name),''),old_row.name),
    'updated_at',now()
  );

  insert into public.booster_types
  select (jsonb_populate_record(null::public.booster_types,new_payload)).*;

  for ref in
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name
    from pg_constraint c
    join unnest(c.conkey) with ordinality ck(attnum,ord) on true
    join unnest(c.confkey) with ordinality fk(attnum,ord) using(ord)
    join pg_attribute a on a.attrelid=c.conrelid and a.attnum=ck.attnum
    join pg_attribute pa on pa.attrelid=c.confrelid and pa.attnum=fk.attnum
    where c.contype='f'
      and c.confrelid='public.booster_types'::regclass
      and pa.attname='id'
  loop
    execute format('update %s set %I=$1 where %I=$2',ref.table_name,ref.column_name,ref.column_name)
      using requested_new_id,requested_old_id;
    get diagnostics changed=row_count;
    updates := updates || jsonb_build_array(jsonb_build_object(
      'table',ref.table_name,'column',ref.column_name,'updated',changed
    ));
  end loop;

  -- Repair known JSON metadata links that are not protected by foreign keys.
  if to_regclass('public.received_rewards') is not null then
    execute $q$
      update public.received_rewards
      set reward_payload=jsonb_set(reward_payload,'{boosterId}',to_jsonb($1::text),true)
      where reward_payload->>'boosterId'=$2
    $q$ using requested_new_id,requested_old_id;
  end if;

  if to_regclass('public.star_bits_transactions') is not null then
    execute $q$
      update public.star_bits_transactions
      set metadata=jsonb_set(metadata,'{boosterId}',to_jsonb($1::text),true)
      where metadata->>'boosterId'=$2
    $q$ using requested_new_id,requested_old_id;
  end if;

  if to_regclass('public.user_notifications') is not null then
    execute $q$
      update public.user_notifications
      set route_params=jsonb_set(coalesce(route_params,'{}'::jsonb),'{boosterId}',to_jsonb($1::text),true)
      where route_params->>'boosterId'=$2
    $q$ using requested_new_id,requested_old_id;
  end if;

  delete from public.booster_types where id=requested_old_id;

  return jsonb_build_object(
    'success',true,
    'oldId',requested_old_id,
    'newId',requested_new_id,
    'referencesUpdated',updates
  );
end;
$$;

revoke all on function public.admin_rename_booster_id_v901(text,text,text) from public,anon;
grant execute on function public.admin_rename_booster_id_v901(text,text,text) to authenticated;


create or replace function public.admin_detach_booster_from_shop_v901(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare saved public.booster_types;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  update public.booster_types
  set star_bits_cost=0,is_active=false,updated_at=now()
  where id=requested_id
  returning * into saved;
  if not found then raise exception 'Booster % does not exist.',requested_id; end if;
  return jsonb_build_object('success',true,'boosterId',saved.id,'starBitsCost',saved.star_bits_cost,'isActive',saved.is_active);
end;
$$;

revoke all on function public.admin_detach_booster_from_shop_v901(text) from public,anon;
grant execute on function public.admin_detach_booster_from_shop_v901(text) to authenticated;


create or replace function public.admin_safe_delete_booster_v901(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  ref record;
  ref_count bigint;
  blockers jsonb := '[]'::jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if not exists(select 1 from public.booster_types where id=requested_id) then
    raise exception 'Booster % does not exist.',requested_id;
  end if;

  for ref in
    select
      c.conrelid::regclass::text as table_name,
      a.attname as column_name,
      c.confdeltype
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
    execute format('select count(*) from %s where %I=$1',ref.table_name,ref.column_name)
      into ref_count using requested_id;
    if ref_count>0 then
      blockers := blockers || jsonb_build_array(jsonb_build_object(
        'table',ref.table_name,'column',ref.column_name,'count',ref_count
      ));
    end if;
  end loop;

  if jsonb_array_length(blockers)>0 then
    raise exception 'This booster still has protected references. Use Inspect References, rename it, detach it, or archive it first. Details: %',blockers::text;
  end if;

  delete from public.booster_types where id=requested_id;
  return jsonb_build_object('success',true,'deletedId',requested_id);
end;
$$;

revoke all on function public.admin_safe_delete_booster_v901(text) from public,anon;
grant execute on function public.admin_safe_delete_booster_v901(text) to authenticated;
