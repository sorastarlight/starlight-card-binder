-- Editable public marketing copy for Website Editor.

create or replace function public.get_website_content()
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
  where setting_key = 'website_content'
  limit 1;

  return jsonb_build_object(
    'content', coalesce(stored, '{}'::jsonb),
    'updatedAt', (
      select updated_at
      from public.site_settings
      where setting_key = 'website_content'
      limit 1
    )
  );
end;
$function$;

create or replace function public.admin_save_website_content(requested_content jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor_role text;
  payload jsonb := coalesce(requested_content, '{}'::jsonb);
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'Website content payload must be an object.';
  end if;

  insert into public.site_settings(setting_key, setting_value, updated_at, updated_by)
  values ('website_content', payload, now(), auth.uid())
  on conflict (setting_key) do update
    set setting_value = excluded.setting_value,
        updated_at = now(),
        updated_by = auth.uid();

  insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
  values (
    auth.uid(),
    'website_content_saved',
    'site_settings',
    'website_content',
    jsonb_build_object('version', coalesce(payload->>'version', '1'))
  );

  return jsonb_build_object('success', true, 'content', payload);
end;
$function$;

create or replace function public.admin_reset_website_content()
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

  delete from public.site_settings where setting_key = 'website_content';

  insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
  values (auth.uid(), 'website_content_reset', 'site_settings', 'website_content', '{}'::jsonb);

  return jsonb_build_object('success', true, 'content', '{}'::jsonb);
end;
$function$;

revoke all on function public.get_website_content() from public;
grant execute on function public.get_website_content() to anon, authenticated, service_role;

revoke all on function public.admin_save_website_content(jsonb) from public, anon;
grant execute on function public.admin_save_website_content(jsonb) to authenticated, service_role;

revoke all on function public.admin_reset_website_content() from public, anon;
grant execute on function public.admin_reset_website_content() to authenticated, service_role;
