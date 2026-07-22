-- Custom staff role labels that map onto existing permission tiers.
-- site_roles.role remains the authorization source of truth.

create table if not exists public.staff_role_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  permission_tier text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_role_labels_tier_check
    check (permission_tier in ('owner', 'admin', 'super_moderator', 'moderator')),
  constraint staff_role_labels_name_len
    check (char_length(trim(name)) between 2 and 40)
);

create unique index if not exists staff_role_labels_name_unique
  on public.staff_role_labels (lower(trim(name)));

alter table public.staff_role_labels enable row level security;

alter table public.site_roles
  add column if not exists label_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'site_roles_label_id_fkey'
  ) then
    alter table public.site_roles
      add constraint site_roles_label_id_fkey
      foreign key (label_id)
      references public.staff_role_labels(id)
      on delete set null;
  end if;
end $$;

create index if not exists site_roles_label_id_idx
  on public.site_roles (label_id);

revoke all on table public.staff_role_labels from public, anon, authenticated;
grant select, insert, update, delete on table public.staff_role_labels to service_role;

create or replace function public.admin_list_staff_role_labels()
returns jsonb
language plpgsql
security definer
set search_path = public
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
      'id', l.id,
      'name', l.name,
      'permissionTier', l.permission_tier,
      'createdAt', l.created_at,
      'updatedAt', l.updated_at
    )
    order by public.staff_role_rank(l.permission_tier) desc, lower(l.name)
  ), '[]'::jsonb)
  into result
  from public.staff_role_labels l;

  return result;
end;
$$;

revoke all on function public.admin_list_staff_role_labels() from public, anon;
grant execute on function public.admin_list_staff_role_labels() to authenticated;

create or replace function public.admin_create_staff_role_label(
  requested_name text,
  requested_permission_tier text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  clean_name text := trim(coalesce(requested_name, ''));
  clean_tier text := lower(trim(coalesce(requested_permission_tier, '')));
  new_row public.staff_role_labels%rowtype;
begin
  select role into actor_role
  from public.site_roles
  where user_id = actor_id;

  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 40 then
    raise exception 'Role label names must be 2–40 characters.';
  end if;

  if clean_tier not in ('owner', 'admin', 'super_moderator', 'moderator') then
    raise exception 'Invalid permission tier.';
  end if;

  if actor_role = 'admin' and clean_tier in ('owner', 'admin') then
    raise exception 'Only an owner may create labels for owner or administrator access.';
  end if;

  insert into public.staff_role_labels (
    name, permission_tier, created_by, created_at, updated_at
  ) values (
    clean_name, clean_tier, actor_id, now(), now()
  )
  returning * into new_row;

  insert into public.staff_audit_log (
    actor_user_id, action, target_resource_type, target_resource_id, details
  ) values (
    actor_id,
    'staff_role_label_created',
    'staff_role_label',
    new_row.id::text,
    jsonb_build_object(
      'labelId', new_row.id,
      'labelName', new_row.name,
      'permissionTier', new_row.permission_tier
    )
  );

  return jsonb_build_object(
    'success', true,
    'id', new_row.id,
    'name', new_row.name,
    'permissionTier', new_row.permission_tier
  );
exception
  when unique_violation then
    raise exception 'A role label with that name already exists.';
end;
$$;

revoke all on function public.admin_create_staff_role_label(text, text) from public, anon;
grant execute on function public.admin_create_staff_role_label(text, text) to authenticated;

create or replace function public.admin_delete_staff_role_label(requested_label_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  target public.staff_role_labels%rowtype;
begin
  select role into actor_role
  from public.site_roles
  where user_id = actor_id;

  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  select * into target
  from public.staff_role_labels
  where id = requested_label_id;

  if not found then
    return jsonb_build_object('success', true, 'deleted', false);
  end if;

  if actor_role = 'admin' and target.permission_tier in ('owner', 'admin') then
    raise exception 'Administrators cannot delete owner or administrator labels.';
  end if;

  -- label_id on site_roles clears via ON DELETE SET NULL; tier stays.
  delete from public.staff_role_labels
  where id = requested_label_id;

  insert into public.staff_audit_log (
    actor_user_id, action, target_resource_type, target_resource_id, details
  ) values (
    actor_id,
    'staff_role_label_deleted',
    'staff_role_label',
    requested_label_id::text,
    jsonb_build_object(
      'labelId', target.id,
      'labelName', target.name,
      'permissionTier', target.permission_tier
    )
  );

  return jsonb_build_object('success', true, 'deleted', true);
end;
$$;

revoke all on function public.admin_delete_staff_role_label(uuid) from public, anon;
grant execute on function public.admin_delete_staff_role_label(uuid) to authenticated;

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
      'labelId', r.label_id,
      'labelName', l.name,
      'assignedAt', r.created_at,
      'updatedAt', r.updated_at
    ) order by
      public.staff_role_rank(coalesce(r.role, '')) desc,
      coalesce(p.display_name, u.email)
  ), '[]'::jsonb)
  into result
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.site_roles r on r.user_id = u.id
  left join public.staff_role_labels l on l.id = r.label_id;

  return result;
end;
$$;

revoke all on function public.admin_list_staff_users() from public, anon;
grant execute on function public.admin_list_staff_users() to authenticated;

drop function if exists public.admin_set_staff_role(uuid, text);

create or replace function public.admin_set_staff_role(
  requested_user_id uuid,
  requested_role text default null,
  requested_label_id uuid default null
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
  target_old_label_id uuid;
  resolved_role text;
  resolved_label_id uuid := null;
  resolved_label_name text := null;
  label_row public.staff_role_labels%rowtype;
begin
  select role into actor_role
  from public.site_roles
  where user_id = actor_id;

  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if requested_label_id is not null then
    select * into label_row
    from public.staff_role_labels
    where id = requested_label_id;

    if not found then
      raise exception 'That role label was not found.';
    end if;

    resolved_role := label_row.permission_tier;
    resolved_label_id := label_row.id;
    resolved_label_name := label_row.name;
  else
    resolved_role := lower(trim(coalesce(requested_role, '')));
    if resolved_role not in ('owner', 'admin', 'super_moderator', 'moderator') then
      raise exception 'Invalid staff role.';
    end if;
  end if;

  select role, label_id
  into target_old_role, target_old_label_id
  from public.site_roles
  where user_id = requested_user_id;

  if actor_role = 'admin' then
    if resolved_role in ('owner', 'admin') then
      raise exception 'Only an owner may assign owner or administrator access.';
    end if;

    if target_old_role in ('owner', 'admin') then
      raise exception 'Administrators cannot modify owners or other administrators.';
    end if;
  end if;

  if requested_user_id = actor_id and resolved_role <> actor_role then
    raise exception 'You cannot change your own role.';
  end if;

  insert into public.site_roles (
    user_id, role, label_id, assigned_by, created_at, updated_at
  ) values (
    requested_user_id, resolved_role, resolved_label_id, actor_id, now(), now()
  )
  on conflict (user_id)
  do update set
    role = excluded.role,
    label_id = excluded.label_id,
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
    jsonb_build_object(
      'oldRole', target_old_role,
      'newRole', resolved_role,
      'oldLabelId', target_old_label_id,
      'labelId', resolved_label_id,
      'labelName', resolved_label_name
    )
  );

  return jsonb_build_object(
    'success', true,
    'userId', requested_user_id,
    'role', resolved_role,
    'labelId', resolved_label_id,
    'labelName', resolved_label_name
  );
end;
$$;

revoke all on function public.admin_set_staff_role(uuid, text, uuid) from public, anon;
grant execute on function public.admin_set_staff_role(uuid, text, uuid) to authenticated;

create or replace function public.get_my_staff_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  staff_role_value text;
  staff_label_value text;
begin
  select site_roles.role, staff_role_labels.name
  into staff_role_value, staff_label_value
  from public.site_roles
  left join public.staff_role_labels
    on staff_role_labels.id = site_roles.label_id
  where site_roles.user_id = auth.uid()
  limit 1;

  return jsonb_build_object(
    'isStaff', staff_role_value is not null,
    'role', staff_role_value,
    'roleLabel', staff_label_value,
    'canManageCodes', staff_role_value in ('owner', 'admin'),
    'canManageRoles', staff_role_value in ('owner', 'admin'),
    'canAssignAdmins', staff_role_value = 'owner',
    'canModerate', staff_role_value in ('owner', 'admin', 'super_moderator', 'moderator'),
    'canViewAuditLog', staff_role_value in ('owner', 'admin')
  );
end;
$$;

revoke all on function public.get_my_staff_access() from public, anon;
grant execute on function public.get_my_staff_access() to authenticated;

comment on table public.staff_role_labels is
  'Reusable display labels for staff that map onto fixed permission tiers on site_roles.role.';

comment on column public.site_roles.label_id is
  'Optional custom label; permission checks always use site_roles.role.';
