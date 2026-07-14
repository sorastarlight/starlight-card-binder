-- ============================================================
-- STARLIGHT CARD BINDER
-- V81.2 PROFILE REPORTS AND MODERATION DASHBOARD
-- Safe to run after V81.1.1.
-- ============================================================

create table if not exists public.profile_reports (
    id bigint generated always as identity primary key,
    reporter_user_id uuid not null references auth.users(id) on delete cascade,
    target_user_id uuid not null references auth.users(id) on delete cascade,
    category text not null check (category in ('impersonation','harassment','inappropriate_profile','spam','other')),
    details text not null check (char_length(details) between 10 and 1000),
    status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
    assigned_to uuid references auth.users(id) on delete set null,
    resolution_note text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    resolved_at timestamptz
);

create index if not exists profile_reports_status_created_index
on public.profile_reports(status, created_at desc);

create index if not exists profile_reports_target_index
on public.profile_reports(target_user_id, created_at desc);

alter table public.profile_reports enable row level security;

create table if not exists public.profile_moderation_state (
    user_id uuid primary key references auth.users(id) on delete cascade,
    profile_hidden boolean not null default false,
    profile_edit_locked boolean not null default false,
    reason text,
    updated_by uuid references auth.users(id) on delete set null,
    updated_at timestamptz not null default now()
);

alter table public.profile_moderation_state enable row level security;

-- Prevent a moderated user from restoring or editing a locked profile.
create or replace function public.enforce_profile_moderation_lock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() = old.id
       and exists (
           select 1
           from public.profile_moderation_state
           where user_id = old.id
             and profile_edit_locked = true
       ) then
        raise exception 'This profile is temporarily locked by the moderation team.';
    end if;

    return new;
end;
$$;

drop trigger if exists profiles_moderation_lock_trigger on public.profiles;
create trigger profiles_moderation_lock_trigger
before update on public.profiles
for each row execute function public.enforce_profile_moderation_lock();

-- Submit a report against a completed collector profile.
create or replace function public.submit_profile_report(
    requested_username text,
    requested_category text,
    requested_details text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    reporter_id uuid := auth.uid();
    target_id uuid;
    normalized_username text := lower(trim(requested_username));
    normalized_details text := trim(requested_details);
    inserted_id bigint;
begin
    if reporter_id is null then
        raise exception 'You must be signed in to submit a report.';
    end if;

    if requested_category not in ('impersonation','harassment','inappropriate_profile','spam','other') then
        raise exception 'Invalid report category.';
    end if;

    if char_length(normalized_details) < 10 or char_length(normalized_details) > 1000 then
        raise exception 'Report details must be between 10 and 1000 characters.';
    end if;

    select id into target_id
    from public.profiles
    where lower(username) = normalized_username
      and onboarding_complete = true;

    if target_id is null then
        raise exception 'Collector profile not found.';
    end if;

    if target_id = reporter_id then
        raise exception 'You cannot report your own profile.';
    end if;

    if exists (
        select 1 from public.profile_reports
        where reporter_user_id = reporter_id
          and target_user_id = target_id
          and status in ('open','reviewing')
    ) then
        raise exception 'You already have an active report for this profile.';
    end if;

    insert into public.profile_reports (
        reporter_user_id, target_user_id, category, details
    ) values (
        reporter_id, target_id, requested_category, normalized_details
    ) returning id into inserted_id;

    return jsonb_build_object('success', true, 'reportId', inserted_id);
end;
$$;

revoke all on function public.submit_profile_report(text,text,text) from public, anon;
grant execute on function public.submit_profile_report(text,text,text) to authenticated;

-- Staff report queue. All moderation roles may read it.
create or replace function public.staff_list_profile_reports(
    requested_status text default null,
    requested_limit integer default 100
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    staff_role text;
    result jsonb;
begin
    select role into staff_role from public.site_roles where user_id = auth.uid();
    if staff_role not in ('owner','admin','super_moderator','moderator') then
        raise exception 'Moderator access is required.';
    end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'id', r.id,
        'status', r.status,
        'category', r.category,
        'details', r.details,
        'createdAt', r.created_at,
        'updatedAt', r.updated_at,
        'resolutionNote', r.resolution_note,
        'targetUserId', r.target_user_id,
        'targetUsername', tp.username,
        'targetDisplayName', tp.display_name,
        'reporterEmail', ru.email,
        'assignedTo', r.assigned_to,
        'profileHidden', coalesce(ms.profile_hidden, false),
        'profileEditLocked', coalesce(ms.profile_edit_locked, false),
        'moderationReason', ms.reason
    ) order by r.created_at desc), '[]'::jsonb)
    into result
    from public.profile_reports r
    join public.profiles tp on tp.id = r.target_user_id
    join auth.users ru on ru.id = r.reporter_user_id
    left join public.profile_moderation_state ms on ms.user_id = r.target_user_id
    where requested_status is null or requested_status = 'all' or r.status = requested_status
    limit greatest(1, least(coalesce(requested_limit,100),250));

    return result;
end;
$$;

revoke all on function public.staff_list_profile_reports(text,integer) from public, anon;
grant execute on function public.staff_list_profile_reports(text,integer) to authenticated;

-- Update report workflow state.
create or replace function public.staff_update_profile_report(
    requested_report_id bigint,
    requested_status text,
    requested_resolution_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_id uuid := auth.uid();
    staff_role text;
    target_id uuid;
begin
    select role into staff_role from public.site_roles where user_id = actor_id;
    if staff_role not in ('owner','admin','super_moderator','moderator') then
        raise exception 'Moderator access is required.';
    end if;

    if requested_status not in ('open','reviewing','resolved','dismissed') then
        raise exception 'Invalid report status.';
    end if;

    update public.profile_reports
    set status = requested_status,
        assigned_to = case when requested_status = 'reviewing' then actor_id else assigned_to end,
        resolution_note = nullif(trim(requested_resolution_note),''),
        resolved_at = case when requested_status in ('resolved','dismissed') then now() else null end,
        updated_at = now()
    where id = requested_report_id
    returning target_user_id into target_id;

    if target_id is null then raise exception 'Report not found.'; end if;

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id, 'profile_report_updated', target_id, 'profile_report', requested_report_id::text,
        jsonb_build_object('status', requested_status, 'note', nullif(trim(requested_resolution_note),''))
    );

    return jsonb_build_object('success',true,'reportId',requested_report_id,'status',requested_status);
end;
$$;

revoke all on function public.staff_update_profile_report(bigint,text,text) from public, anon;
grant execute on function public.staff_update_profile_report(bigint,text,text) to authenticated;

-- Hide and lock a profile. Moderators can act; restoration requires super moderator or higher.
create or replace function public.staff_set_profile_moderation(
    requested_user_id uuid,
    requested_hidden boolean,
    requested_edit_locked boolean,
    requested_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_id uuid := auth.uid();
    staff_role text;
    target_role text;
    reason_text text := nullif(trim(requested_reason),'');
begin
    select role into staff_role from public.site_roles where user_id = actor_id;
    if staff_role not in ('owner','admin','super_moderator','moderator') then
        raise exception 'Moderator access is required.';
    end if;

    select role into target_role from public.site_roles where user_id = requested_user_id;
    if target_role in ('owner','admin') and staff_role <> 'owner' then
        raise exception 'Only an owner may moderate an owner or administrator profile.';
    end if;

    if (not requested_hidden or not requested_edit_locked)
       and staff_role not in ('owner','admin','super_moderator') then
        raise exception 'A super moderator or higher is required to restore profile access.';
    end if;

    if (requested_hidden or requested_edit_locked) and reason_text is null then
        raise exception 'A moderation reason is required.';
    end if;

    insert into public.profile_moderation_state (
        user_id, profile_hidden, profile_edit_locked, reason, updated_by, updated_at
    ) values (
        requested_user_id, requested_hidden, requested_edit_locked, reason_text, actor_id, now()
    ) on conflict (user_id) do update set
        profile_hidden = excluded.profile_hidden,
        profile_edit_locked = excluded.profile_edit_locked,
        reason = excluded.reason,
        updated_by = excluded.updated_by,
        updated_at = now();

    if requested_hidden then
        update public.profiles set profile_visibility = 'private', updated_at = now()
        where id = requested_user_id;
    end if;

    insert into public.staff_audit_log (
        actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
    ) values (
        actor_id, 'profile_moderation_changed', requested_user_id, 'profile', requested_user_id::text,
        jsonb_build_object('hidden',requested_hidden,'editLocked',requested_edit_locked,'reason',reason_text)
    );

    return jsonb_build_object(
        'success',true,'userId',requested_user_id,
        'profileHidden',requested_hidden,'profileEditLocked',requested_edit_locked
    );
end;
$$;

revoke all on function public.staff_set_profile_moderation(uuid,boolean,boolean,text) from public, anon;
grant execute on function public.staff_set_profile_moderation(uuid,boolean,boolean,text) to authenticated;
