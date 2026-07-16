-- V89.6 — Account, Gifts & Bulk Card Management
-- Run in Supabase SQL Editor.

create or replace function public.admin_delete_user_completely_v896(
    requested_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    caller_id uuid := auth.uid();
    caller_role text;
    target_email text;
    fk record;
begin
    if caller_id is null then
        raise exception 'You must be signed in.';
    end if;

    select lower(sr.role::text)
      into caller_role
      from public.site_roles sr
     where sr.user_id = caller_id
     limit 1;

    if caller_role not in ('owner','admin','administrator') then
        raise exception 'Administrator access is required.';
    end if;

    if requested_user_id is null then
        raise exception 'A user ID is required.';
    end if;

    if requested_user_id = caller_id then
        raise exception 'You cannot delete your own account from this screen.';
    end if;

    select email into target_email
      from auth.users
     where id = requested_user_id;

    if target_email is null then
        raise exception 'The requested account does not exist.';
    end if;

    -- Delete rows from every single-column foreign key that directly points
    -- to auth.users(id). This keeps the function resilient as the project grows.
    for fk in
        select
            ns.nspname as schema_name,
            cls.relname as table_name,
            att.attname as column_name
        from pg_constraint con
        join pg_class cls on cls.oid = con.conrelid
        join pg_namespace ns on ns.oid = cls.relnamespace
        join pg_class refcls on refcls.oid = con.confrelid
        join pg_namespace refns on refns.oid = refcls.relnamespace
        join unnest(con.conkey) with ordinality ck(attnum, ord) on true
        join pg_attribute att on att.attrelid = con.conrelid and att.attnum = ck.attnum
        where con.contype = 'f'
          and refns.nspname = 'auth'
          and refcls.relname = 'users'
          and array_length(con.conkey, 1) = 1
          and ns.nspname in ('public','storage')
    loop
        execute format(
            'delete from %I.%I where %I = $1',
            fk.schema_name,
            fk.table_name,
            fk.column_name
        ) using requested_user_id;
    end loop;

    delete from auth.users where id = requested_user_id;

    return jsonb_build_object(
        'deleted', true,
        'userId', requested_user_id,
        'email', target_email
    );
end;
$$;

revoke all on function public.admin_delete_user_completely_v896(uuid) from public;
grant execute on function public.admin_delete_user_completely_v896(uuid) to authenticated;

comment on function public.admin_delete_user_completely_v896(uuid)
is 'Owner/admin-only permanent account deletion for the Starlight Administration Hub.';
