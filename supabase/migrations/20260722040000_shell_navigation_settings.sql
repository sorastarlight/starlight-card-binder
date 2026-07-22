-- Editable shell navigation / top-bar / page titles for Website User Interface admin.

create or replace function public.get_shell_navigation()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  stored jsonb;
begin
  select setting_value
  into stored
  from public.site_settings
  where setting_key = 'shell_navigation'
  limit 1;

  return jsonb_build_object(
    'navigation', coalesce(stored, '{}'::jsonb),
    'updatedAt', (
      select updated_at
      from public.site_settings
      where setting_key = 'shell_navigation'
      limit 1
    )
  );
end;
$function$;

create or replace function public.admin_save_shell_navigation(requested_navigation jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor_role text;
  payload jsonb := coalesce(requested_navigation, '{}'::jsonb);
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Navigation payload must be an object.';
  end if;

  if coalesce(jsonb_array_length(payload #> '{sidebar,sections}'), 0) < 1 then
    raise exception 'At least one sidebar section is required.';
  end if;

  if coalesce(jsonb_array_length(payload #> '{sidebar,sections}'), 0) > 8 then
    raise exception 'Too many sidebar sections.';
  end if;

  insert into public.site_settings(setting_key, setting_value, updated_at, updated_by)
  values ('shell_navigation', payload, now(), auth.uid())
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by = auth.uid();

  insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
  values (
    auth.uid(),
    'shell_navigation_saved',
    'site_settings',
    'shell_navigation',
    jsonb_build_object(
      'sections', coalesce(jsonb_array_length(payload #> '{sidebar,sections}'), 0),
      'quickLinks', coalesce(jsonb_array_length(payload #> '{topBar,quickLinks}'), 0)
    )
  );

  return jsonb_build_object('success', true, 'navigation', payload);
end;
$function$;

create or replace function public.admin_reset_shell_navigation()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor_role text;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  delete from public.site_settings where setting_key = 'shell_navigation';

  insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
  values (auth.uid(), 'shell_navigation_reset', 'site_settings', 'shell_navigation', '{}'::jsonb);

  return jsonb_build_object('success', true, 'navigation', '{}'::jsonb);
end;
$function$;

revoke all on function public.get_shell_navigation() from public;
grant execute on function public.get_shell_navigation() to anon, authenticated, service_role;

revoke all on function public.admin_save_shell_navigation(jsonb) from public, anon;
grant execute on function public.admin_save_shell_navigation(jsonb) to authenticated, service_role;

revoke all on function public.admin_reset_shell_navigation() from public, anon;
grant execute on function public.admin_reset_shell_navigation() to authenticated, service_role;
