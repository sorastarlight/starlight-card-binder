-- ============================================================
-- STARLIGHT CARD BINDER
-- V81.1 STAFF ROLES, ADMIN HUB, AND AUDIT LOG
-- Safe to run after V81.0.
-- ============================================================

-- 1. Expand the existing role model.
alter table public.site_roles
    drop constraint if exists site_roles_role_check;

alter table public.site_roles
    add constraint site_roles_role_check
    check (role in ('owner', 'admin', 'super_moderator', 'moderator'));

alter table public.site_roles
    add column if not exists assigned_by uuid references auth.users(id) on delete set null,
    add column if not exists updated_at timestamptz not null default now();

-- Promote any existing admin to owner only when no owner exists yet.
update public.site_roles
set role = 'owner', updated_at = now()
where user_id = (
    select user_id
    from public.site_roles
    where role = 'admin'
    order by created_at
    limit 1
)
and not exists (
    select 1 from public.site_roles where role = 'owner'
);

-- 2. Staff audit log.
create table if not exists public.staff_audit_log (
    id bigint generated always as identity primary key,
    actor_user_id uuid references auth.users(id) on delete set null,
    action text not null,
    target_user_id uuid references auth.users(id) on delete set null,
    target_resource_type text,
    target_resource_id text,
    details jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);

create index if not exists staff_audit_log_created_at_index
on public.staff_audit_log(created_at desc);

create index if not exists staff_audit_log_actor_index
on public.staff_audit_log(actor_user_id);

alter table public.staff_audit_log enable row level security;

-- No direct public policies. Staff reads occur through protected RPCs.

-- 3. Role rank helper.
create or replace function public.staff_role_rank(requested_role text)
returns integer
language sql
immutable
set search_path = public
as $$
    select case requested_role
        when 'owner' then 40
        when 'admin' then 30
        when 'super_moderator' then 20
        when 'moderator' then 10
        else 0
    end;
$$;

-- 4. Current user's role.
create or replace function public.get_my_staff_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    current_role text;
begin
    select role into current_role
    from public.site_roles
    where user_id = auth.uid();

    return jsonb_build_object(
        'isStaff', current_role is not null,
        'role', current_role,
        'canManageCodes', current_role in ('owner', 'admin'),
        'canManageRoles', current_role in ('owner', 'admin'),
        'canAssignAdmins', current_role = 'owner',
        'canModerate', current_role in ('owner', 'admin', 'super_moderator', 'moderator'),
        'canViewAuditLog', current_role in ('owner', 'admin')
    );
end;
$$;

revoke all on function public.get_my_staff_access() from public, anon;
grant execute on function public.get_my_staff_access() to authenticated;

-- Preserve compatibility with V81.0 reward-code pages/functions.
create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.site_roles
        where user_id = auth.uid()
          and role in ('owner', 'admin')
    );
$$;

revoke all on function public.is_site_admin() from public, anon;
grant execute on function public.is_site_admin() to authenticated;

-- 5. List staff and eligible users.
create or replace function public.admin_list_staff_users()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    actor_role text;
    result jsonb;
begin
    select role into actor_role
    from public.site_roles
    where user_id = auth.uid();

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    select coalesce(jsonb_agg(
        jsonb_build_object(
            'userId', u.id,
            'email', u.email,
            'username', p.username,
            'displayName', p.display_name,
            'role', r.role,
            'assignedAt', r.created_at,
            'updatedAt', r.updated_at
        ) order by
            public.staff_role_rank(coalesce(r.role, '')) desc,
            coalesce(p.display_name, u.email)
    ), '[]'::jsonb)
    into result
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.site_roles r on r.user_id = u.id;

    return result;
end;
$$;

revoke all on function public.admin_list_staff_users() from public, anon;
grant execute on function public.admin_list_staff_users() to authenticated;

-- 6. Assign or change a role.
create or replace function public.admin_set_staff_role(
    requested_user_id uuid,
    requested_role text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_id uuid := auth.uid();
    actor_role text;
    target_old_role text;
begin
    select role into actor_role
    from public.site_roles
    where user_id = actor_id;

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    if requested_role not in ('owner', 'admin', 'super_moderator', 'moderator') then
        raise exception 'Invalid staff role.';
    end if;

    select role into target_old_role
    from public.site_roles
    where user_id = requested_user_id;

    if actor_role = 'admin' then
        if requested_role in ('owner', 'admin') then
            raise exception 'Only an owner may assign owner or administrator access.';
        end if;

        if target_old_role in ('owner', 'admin') then
            raise exception 'Administrators cannot modify owners or other administrators.';
        end if;
    end if;

    if requested_user_id = actor_id and requested_role <> actor_role then
        raise exception 'You cannot change your own role.';
    end if;

    insert into public.site_roles (
        user_id, role, assigned_by, created_at, updated_at
    ) values (
        requested_user_id, requested_role, actor_id, now(), now()
    )
    on conflict (user_id)
    do update set
        role = excluded.role,
        assigned_by = excluded.assigned_by,
        updated_at = now();

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id,
        'staff_role_set',
        requested_user_id,
        'user',
        requested_user_id::text,
        jsonb_build_object('oldRole', target_old_role, 'newRole', requested_role)
    );

    return jsonb_build_object(
        'success', true,
        'userId', requested_user_id,
        'role', requested_role
    );
end;
$$;

revoke all on function public.admin_set_staff_role(uuid, text) from public, anon;
grant execute on function public.admin_set_staff_role(uuid, text) to authenticated;

-- 7. Remove staff access.
create or replace function public.admin_remove_staff_role(requested_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_id uuid := auth.uid();
    actor_role text;
    target_role text;
    owner_count integer;
begin
    select role into actor_role
    from public.site_roles
    where user_id = actor_id;

    select role into target_role
    from public.site_roles
    where user_id = requested_user_id;

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    if target_role is null then
        return jsonb_build_object('success', true, 'removed', false);
    end if;

    if requested_user_id = actor_id then
        raise exception 'You cannot remove your own staff access.';
    end if;

    if actor_role = 'admin' and target_role in ('owner', 'admin') then
        raise exception 'Administrators cannot remove owners or other administrators.';
    end if;

    if target_role = 'owner' then
        select count(*) into owner_count
        from public.site_roles
        where role = 'owner';

        if owner_count <= 1 then
            raise exception 'The final owner cannot be removed.';
        end if;
    end if;

    delete from public.site_roles
    where user_id = requested_user_id;

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id,
        'staff_role_removed',
        requested_user_id,
        'user',
        requested_user_id::text,
        jsonb_build_object('oldRole', target_role)
    );

    return jsonb_build_object('success', true, 'removed', true);
end;
$$;

revoke all on function public.admin_remove_staff_role(uuid) from public, anon;
grant execute on function public.admin_remove_staff_role(uuid) to authenticated;

-- 8. Read recent audit events.
create or replace function public.admin_list_staff_audit_log(requested_limit integer default 100)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    actor_role text;
    safe_limit integer;
    result jsonb;
begin
    select role into actor_role
    from public.site_roles
    where user_id = auth.uid();

    if actor_role not in ('owner', 'admin') then
        raise exception 'Administrator access is required.';
    end if;

    safe_limit := greatest(1, least(coalesce(requested_limit, 100), 500));

    select coalesce(jsonb_agg(row_data order by created_at desc), '[]'::jsonb)
    into result
    from (
        select
            l.created_at,
            jsonb_build_object(
                'id', l.id,
                'createdAt', l.created_at,
                'action', l.action,
                'actorUserId', l.actor_user_id,
                'actorEmail', actor.email,
                'targetUserId', l.target_user_id,
                'targetEmail', target.email,
                'resourceType', l.target_resource_type,
                'resourceId', l.target_resource_id,
                'details', l.details
            ) as row_data
        from public.staff_audit_log l
        left join auth.users actor on actor.id = l.actor_user_id
        left join auth.users target on target.id = l.target_user_id
        order by l.created_at desc
        limit safe_limit
    ) q;

    return result;
end;
$$;

revoke all on function public.admin_list_staff_audit_log(integer) from public, anon;
grant execute on function public.admin_list_staff_audit_log(integer) to authenticated;

-- 9. Audit reward-code creation and state changes without changing V81.0 RPCs.
create or replace function public.audit_reward_code_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.staff_audit_log (
        actor_user_id,
        action,
        target_resource_type,
        target_resource_id,
        details
    ) values (
        auth.uid(),
        case when tg_op = 'INSERT' then 'reward_code_created' else 'reward_code_updated' end,
        'reward_code',
        coalesce(new.id, old.id)::text,
        jsonb_build_object(
            'label', coalesce(new.label, old.label),
            'active', coalesce(new.active, old.active),
            'operation', tg_op
        )
    );

    return new;
end;
$$;

drop trigger if exists reward_codes_staff_audit on public.reward_codes;
create trigger reward_codes_staff_audit
after insert or update on public.reward_codes
for each row execute function public.audit_reward_code_change();
