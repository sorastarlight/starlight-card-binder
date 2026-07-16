-- ============================================================
-- STARLIGHT CARD BINDER V89.4
-- Twitch Redeem Operations, history, and master controls
-- ============================================================

alter table public.twitch_integration_config
  add column if not exists redeems_enabled boolean not null default true,
  add column if not exists last_event_received_at timestamptz,
  add column if not exists last_reward_delivery_at timestamptz;

create index if not exists twitch_reward_events_status_received_idx
  on public.twitch_reward_events(status, received_at desc);

create index if not exists twitch_reward_events_viewer_received_idx
  on public.twitch_reward_events(lower(twitch_login), received_at desc);

create or replace function public.get_twitch_public_config_v890()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'workerBaseUrl',coalesce(worker_base_url,''),
    'broadcasterLinked',broadcaster_twitch_user_id is not null,
    'broadcasterLogin',broadcaster_login,
    'broadcasterDisplayName',broadcaster_display_name,
    'broadcasterAvatarUrl',broadcaster_avatar_url,
    'eventSubStatus',eventsub_status,
    'lastEventSubSyncAt',last_eventsub_sync_at,
    'redeemsEnabled',coalesce(redeems_enabled,true),
    'lastEventReceivedAt',last_event_received_at,
    'lastRewardDeliveryAt',last_reward_delivery_at
  )
  from public.twitch_integration_config
  where id=true;
$$;

grant execute on function public.get_twitch_public_config_v890() to anon, authenticated;

create or replace function public.admin_set_twitch_redeems_enabled_v894(requested_enabled boolean)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  update public.twitch_integration_config
  set redeems_enabled=coalesce(requested_enabled,true),
      updated_at=now(),
      updated_by=auth.uid()
  where id=true;

  return public.get_twitch_public_config_v890();
end;
$$;

revoke all on function public.admin_set_twitch_redeems_enabled_v894(boolean) from public, anon;
grant execute on function public.admin_set_twitch_redeems_enabled_v894(boolean) to authenticated;

create or replace function public.admin_get_twitch_dashboard_v890()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  config jsonb;
  rules jsonb;
  connections jsonb;
  grants jsonb;
  events jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select public.get_twitch_public_config_v890() into config;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb)
  into rules
  from public.twitch_reward_rules r;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'userId',c.user_id,
        'twitchUserId',c.twitch_user_id,
        'login',c.twitch_login,
        'displayName',c.twitch_display_name,
        'avatarUrl',c.twitch_avatar_url,
        'linkedAt',c.linked_at,
        'profileName',coalesce(p.display_name,p.username),
        'username',p.username
      ) order by c.linked_at desc
    ),
    '[]'::jsonb
  )
  into connections
  from public.twitch_connections c
  left join public.profiles p on p.id=c.user_id;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.granted_at desc),'[]'::jsonb)
  into grants
  from (
    select * from public.twitch_reward_grants
    order by granted_at desc
    limit 200
  ) g;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.received_at desc),'[]'::jsonb)
  into events
  from (
    select * from public.twitch_reward_events
    order by received_at desc
    limit 500
  ) e;

  return jsonb_build_object(
    'config',config,
    'rules',rules,
    'connections',connections,
    'grants',grants,
    'events',events
  );
end;
$$;

revoke all on function public.admin_get_twitch_dashboard_v890() from public, anon;
grant execute on function public.admin_get_twitch_dashboard_v890() to authenticated;
