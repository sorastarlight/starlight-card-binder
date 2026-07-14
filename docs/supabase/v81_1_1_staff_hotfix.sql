-- ============================================================
-- STARLIGHT CARD BINDER
-- V81.1.1 STAFF ROLE + ADMIN PAGE HOTFIX
-- ============================================================
-- Fixes a PostgreSQL identifier collision where `current_role`
-- was interpreted as PostgreSQL's CURRENT_ROLE value (`postgres`)
-- instead of the staff-role variable.

create or replace function public.get_my_staff_access()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    staff_role_value text;
begin
    select site_roles.role
    into staff_role_value
    from public.site_roles
    where site_roles.user_id = auth.uid()
    limit 1;

    return jsonb_build_object(
        'isStaff', staff_role_value is not null,
        'role', staff_role_value,
        'canManageCodes', staff_role_value in ('owner', 'admin'),
        'canManageRoles', staff_role_value in ('owner', 'admin'),
        'canAssignAdmins', staff_role_value = 'owner',
        'canModerate', staff_role_value in ('owner', 'admin', 'super_moderator', 'moderator'),
        'canViewAuditLog', staff_role_value in ('owner', 'admin')
    );
end;
$$;

revoke all
on function public.get_my_staff_access()
from public, anon;

grant execute
on function public.get_my_staff_access()
to authenticated;
