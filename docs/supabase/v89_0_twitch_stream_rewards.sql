-- ============================================================
-- STARLIGHT CARD BINDER V89.0
-- Twitch account linking, reward rules, and stream reward audit
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.twitch_integration_config (
  id boolean primary key default true check (id = true),
  worker_base_url text,
  broadcaster_twitch_user_id text,
  broadcaster_login text,
  broadcaster_display_name text,
  broadcaster_avatar_url text,
  eventsub_status text not null default 'not_configured',
  last_eventsub_sync_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);
insert into public.twitch_integration_config(id) values(true) on conflict(id) do nothing;
alter table public.twitch_integration_config enable row level security;

drop policy if exists "Public can read Twitch public config" on public.twitch_integration_config;
create policy "Public can read Twitch public config" on public.twitch_integration_config
for select to anon, authenticated using (true);

create table if not exists public.twitch_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  twitch_user_id text not null unique,
  twitch_login text not null,
  twitch_display_name text,
  twitch_avatar_url text,
  twitch_email text,
  scopes text[] not null default '{}',
  linked_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists twitch_connections_login_idx on public.twitch_connections(lower(twitch_login));
alter table public.twitch_connections enable row level security;
drop policy if exists "Users can view their own Twitch connection" on public.twitch_connections;
create policy "Users can view their own Twitch connection" on public.twitch_connections
for select to authenticated using (auth.uid() = user_id);

-- Tokens are intentionally isolated from browser-readable tables.
create table if not exists public.twitch_broadcaster_tokens (
  id boolean primary key default true check (id = true),
  twitch_user_id text not null,
  access_token text not null,
  refresh_token text,
  scopes text[] not null default '{}',
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.twitch_broadcaster_tokens enable row level security;

create table if not exists public.twitch_oauth_states (
  state text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  flow_type text not null check (flow_type in ('collector','broadcaster')),
  return_url text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);
alter table public.twitch_oauth_states enable row level security;

create table if not exists public.twitch_reward_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_type text not null check (event_type in ('channel_points','subscription','follow','manual','attendance')),
  twitch_reward_id text,
  reward_type text not null check (reward_type in ('star_bits','single_card','booster')),
  star_bits_amount bigint,
  card_id text references public.cards(id) on delete restrict,
  card_quantity integer,
  booster_id text references public.booster_types(id) on delete restrict,
  cooldown_minutes integer not null default 0 check (cooldown_minutes >= 0),
  max_claims_per_user integer check (max_claims_per_user is null or max_claims_per_user > 0),
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (reward_type='star_bits' and coalesce(star_bits_amount,0)>0 and card_id is null and booster_id is null)
    or (reward_type='single_card' and card_id is not null and coalesce(card_quantity,0)>0 and booster_id is null and star_bits_amount is null)
    or (reward_type='booster' and booster_id is not null and card_id is null and star_bits_amount is null)
  )
);
create index if not exists twitch_reward_rules_lookup_idx on public.twitch_reward_rules(event_type,twitch_reward_id) where active=true;
alter table public.twitch_reward_rules enable row level security;

create table if not exists public.twitch_reward_events (
  event_id text primary key,
  event_type text not null,
  twitch_user_id text,
  twitch_login text,
  twitch_display_name text,
  twitch_reward_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received' check (status in ('received','delivered','ignored','failed')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
create index if not exists twitch_reward_events_received_idx on public.twitch_reward_events(received_at desc);
alter table public.twitch_reward_events enable row level security;

create table if not exists public.twitch_reward_grants (
  id bigint generated always as identity primary key,
  event_id text references public.twitch_reward_events(event_id) on delete set null,
  rule_id uuid references public.twitch_reward_rules(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  twitch_user_id text,
  reward_snapshot jsonb not null,
  source text not null default 'twitch',
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now()
);
create index if not exists twitch_reward_grants_user_idx on public.twitch_reward_grants(user_id,granted_at desc);
create index if not exists twitch_reward_grants_rule_idx on public.twitch_reward_grants(rule_id,user_id,granted_at desc);
alter table public.twitch_reward_grants enable row level security;
drop policy if exists "Users can view their Twitch reward history" on public.twitch_reward_grants;
create policy "Users can view their Twitch reward history" on public.twitch_reward_grants
for select to authenticated using (auth.uid()=user_id);

create or replace function public.get_twitch_public_config_v890()
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'workerBaseUrl',coalesce(worker_base_url,''),
    'broadcasterLinked',broadcaster_twitch_user_id is not null,
    'broadcasterLogin',broadcaster_login,
    'broadcasterDisplayName',broadcaster_display_name,
    'broadcasterAvatarUrl',broadcaster_avatar_url,
    'eventSubStatus',eventsub_status,
    'lastEventSubSyncAt',last_eventsub_sync_at
  ) from public.twitch_integration_config where id=true;
$$;
grant execute on function public.get_twitch_public_config_v890() to anon,authenticated;

create or replace function public.get_my_twitch_connection_v890()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare uid uuid:=auth.uid(); c record;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into c from public.twitch_connections where user_id=uid;
  if not found then return jsonb_build_object('linked',false); end if;
  return jsonb_build_object('linked',true,'twitchUserId',c.twitch_user_id,'login',c.twitch_login,'displayName',c.twitch_display_name,'avatarUrl',c.twitch_avatar_url,'linkedAt',c.linked_at);
end;$$;
grant execute on function public.get_my_twitch_connection_v890() to authenticated;

create or replace function public.unlink_my_twitch_v890()
returns boolean language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); n integer;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  delete from public.twitch_connections where user_id=uid;
  get diagnostics n=row_count;
  if n>0 and to_regclass('public.user_notifications') is not null then
    perform public.create_user_notification_v881(uid,'twitch','Twitch account unlinked','Your Twitch account is no longer linked to Starlight Cards.','📺','profile','{}'::jsonb,'twitch-unlinked:'||extract(epoch from now())::bigint,null);
  end if;
  return n>0;
end;$$;
grant execute on function public.unlink_my_twitch_v890() to authenticated;

create or replace function public.apply_twitch_reward_v890(
  requested_user_id uuid,
  requested_reward_type text,
  requested_star_bits bigint default null,
  requested_card_id text default null,
  requested_card_quantity integer default null,
  requested_booster_id text default null,
  requested_event_id text default null,
  requested_rule_id uuid default null,
  requested_twitch_user_id text default null,
  requested_source text default 'twitch',
  requested_granted_by uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare result jsonb; reward jsonb; quantity integer:=greatest(coalesce(requested_card_quantity,1),1);
begin
  if requested_user_id is null then raise exception 'A collector account is required.'; end if;
  if requested_reward_type='star_bits' then
    if coalesce(requested_star_bits,0)<=0 then raise exception 'Star Bits amount must be positive.'; end if;
    insert into public.user_wallets(user_id,star_bits,lifetime_star_bits_earned)
    values(requested_user_id,requested_star_bits,requested_star_bits)
    on conflict(user_id) do update set star_bits=public.user_wallets.star_bits+excluded.star_bits,lifetime_star_bits_earned=public.user_wallets.lifetime_star_bits_earned+excluded.lifetime_star_bits_earned,updated_at=now();
    reward=jsonb_build_object('type','star_bits','amount',requested_star_bits);
  elsif requested_reward_type='single_card' then
    if requested_card_id is null then raise exception 'Card is required.'; end if;
    insert into public.user_cards(user_id,card_id,quantity)
    values(requested_user_id,requested_card_id,quantity)
    on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
    reward=jsonb_build_object('type','single_card','cardId',requested_card_id,'quantity',quantity);
  elsif requested_reward_type='booster' then
    if requested_booster_id is null then raise exception 'Booster is required.'; end if;
    result:=public.build_and_award_booster(requested_booster_id,requested_user_id);
    reward=jsonb_build_object('type','booster','boosterId',requested_booster_id,'result',result);
  else
    raise exception 'Unsupported reward type.';
  end if;
  insert into public.twitch_reward_grants(event_id,rule_id,user_id,twitch_user_id,reward_snapshot,source,granted_by)
  values(requested_event_id,requested_rule_id,requested_user_id,requested_twitch_user_id,reward,coalesce(requested_source,'twitch'),requested_granted_by);
  if to_regclass('public.user_notifications') is not null then
    perform public.create_user_notification_v881(requested_user_id,'twitch','Twitch reward received','A new Twitch reward was added to your Starlight collection.','📺','collection','{}'::jsonb,case when requested_event_id is null then null else 'twitch-reward:'||requested_event_id end,null);
  end if;
  return jsonb_build_object('success',true,'reward',reward);
end;$$;
revoke all on function public.apply_twitch_reward_v890(uuid,text,bigint,text,integer,text,text,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.apply_twitch_reward_v890(uuid,text,bigint,text,integer,text,text,uuid,text,text,uuid) to service_role;

create or replace function public.admin_get_twitch_dashboard_v890()
returns jsonb language plpgsql security definer set search_path=public as $$
declare config jsonb; rules jsonb; connections jsonb; grants jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  select public.get_twitch_public_config_v890() into config;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc),'[]'::jsonb) into rules from public.twitch_reward_rules r;
  select coalesce(jsonb_agg(jsonb_build_object('userId',c.user_id,'twitchUserId',c.twitch_user_id,'login',c.twitch_login,'displayName',c.twitch_display_name,'avatarUrl',c.twitch_avatar_url,'linkedAt',c.linked_at,'profileName',coalesce(p.display_name,p.username),'username',p.username) order by c.linked_at desc),'[]'::jsonb) into connections from public.twitch_connections c left join public.profiles p on p.id=c.user_id;
  select coalesce(jsonb_agg(to_jsonb(g) order by g.granted_at desc),'[]'::jsonb) into grants from (select * from public.twitch_reward_grants order by granted_at desc limit 100) g;
  return jsonb_build_object('config',config,'rules',rules,'connections',connections,'grants',grants);
end;$$;
revoke all on function public.admin_get_twitch_dashboard_v890() from public,anon;
grant execute on function public.admin_get_twitch_dashboard_v890() to authenticated;

create or replace function public.admin_save_twitch_config_v890(requested_worker_url text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  insert into public.twitch_integration_config(id,worker_base_url,updated_at,updated_by)
  values(true,nullif(trim(trailing '/' from requested_worker_url),''),now(),auth.uid())
  on conflict(id) do update set worker_base_url=excluded.worker_base_url,updated_at=now(),updated_by=auth.uid();
  return public.get_twitch_public_config_v890();
end;$$;
revoke all on function public.admin_save_twitch_config_v890(text) from public,anon;
grant execute on function public.admin_save_twitch_config_v890(text) to authenticated;

create or replace function public.admin_save_twitch_reward_rule_v890(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare rid uuid:=nullif(payload->>'id','')::uuid; saved public.twitch_reward_rules;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if rid is null then
    insert into public.twitch_reward_rules(name,event_type,twitch_reward_id,reward_type,star_bits_amount,card_id,card_quantity,booster_id,cooldown_minutes,max_claims_per_user,active,created_by)
    values(trim(payload->>'name'),payload->>'eventType',nullif(trim(payload->>'twitchRewardId'),''),payload->>'rewardType',nullif(payload->>'starBitsAmount','')::bigint,nullif(payload->>'cardId',''),nullif(payload->>'cardQuantity','')::integer,nullif(payload->>'boosterId',''),coalesce(nullif(payload->>'cooldownMinutes','')::integer,0),nullif(payload->>'maxClaimsPerUser','')::integer,coalesce((payload->>'active')::boolean,true),auth.uid()) returning * into saved;
  else
    update public.twitch_reward_rules set name=trim(payload->>'name'),event_type=payload->>'eventType',twitch_reward_id=nullif(trim(payload->>'twitchRewardId'),''),reward_type=payload->>'rewardType',star_bits_amount=nullif(payload->>'starBitsAmount','')::bigint,card_id=nullif(payload->>'cardId',''),card_quantity=nullif(payload->>'cardQuantity','')::integer,booster_id=nullif(payload->>'boosterId',''),cooldown_minutes=coalesce(nullif(payload->>'cooldownMinutes','')::integer,0),max_claims_per_user=nullif(payload->>'maxClaimsPerUser','')::integer,active=coalesce((payload->>'active')::boolean,true),updated_at=now() where id=rid returning * into saved;
  end if;
  return to_jsonb(saved);
end;$$;
revoke all on function public.admin_save_twitch_reward_rule_v890(jsonb) from public,anon;
grant execute on function public.admin_save_twitch_reward_rule_v890(jsonb) to authenticated;

create or replace function public.admin_delete_twitch_reward_rule_v890(requested_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$ begin if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if; delete from public.twitch_reward_rules where id=requested_id; return found; end;$$;
revoke all on function public.admin_delete_twitch_reward_rule_v890(uuid) from public,anon;
grant execute on function public.admin_delete_twitch_reward_rule_v890(uuid) to authenticated;

create or replace function public.admin_manual_twitch_reward_v890(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare target record; result jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  select * into target from public.twitch_connections where lower(twitch_login)=lower(trim(payload->>'twitchLogin'));
  if not found then raise exception 'No linked collector was found for that Twitch username.'; end if;
  result:=public.apply_twitch_reward_v890(target.user_id,payload->>'rewardType',nullif(payload->>'starBitsAmount','')::bigint,nullif(payload->>'cardId',''),nullif(payload->>'cardQuantity','')::integer,nullif(payload->>'boosterId',''),null,null,target.twitch_user_id,'manual',auth.uid());
  return result||jsonb_build_object('collectorUserId',target.user_id,'twitchLogin',target.twitch_login);
end;$$;
revoke all on function public.admin_manual_twitch_reward_v890(jsonb) from public,anon;
grant execute on function public.admin_manual_twitch_reward_v890(jsonb) to authenticated;

-- Public profiles may show only the non-sensitive Twitch identity.
create or replace function public.get_public_twitch_connection_v890(requested_username text)
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce((select jsonb_build_object('linked',true,'login',c.twitch_login,'displayName',c.twitch_display_name,'avatarUrl',c.twitch_avatar_url) from public.profiles p join public.twitch_connections c on c.user_id=p.id where lower(p.username)=lower(requested_username) and coalesce(p.profile_visibility,'public')='public'),jsonb_build_object('linked',false));
$$;
grant execute on function public.get_public_twitch_connection_v890(text) to anon,authenticated;
