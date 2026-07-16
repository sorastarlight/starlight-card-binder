-- ============================================================
-- STARLIGHT CARD BINDER V89.2
-- Received Rewards, Twitch Redeems, and User Directory repair
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.received_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('twitch','manual','reward_code','gift','system','event')),
  source_id text,
  title text not null,
  message text,
  reward_type text not null check (reward_type in ('star_bits','single_card','booster','card_bundle')),
  reward_payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','claimed','expired','cancelled')),
  claimed_snapshot jsonb,
  available_at timestamptz not null default now(),
  expires_at timestamptz,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists received_rewards_user_status_idx on public.received_rewards(user_id,status,created_at desc);
create unique index if not exists received_rewards_source_unique_idx on public.received_rewards(user_id,source_type,source_id) where source_id is not null;
alter table public.received_rewards enable row level security;
drop policy if exists "Collectors can view own received rewards" on public.received_rewards;
create policy "Collectors can view own received rewards" on public.received_rewards for select to authenticated using(user_id=auth.uid());

create or replace function public.queue_received_reward_v892(
  requested_user_id uuid,
  requested_source_type text,
  requested_source_id text,
  requested_title text,
  requested_message text,
  requested_reward_type text,
  requested_reward_payload jsonb,
  requested_created_by uuid default null,
  requested_metadata jsonb default '{}'::jsonb,
  requested_expires_at timestamptz default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare saved public.received_rewards;
begin
  if requested_user_id is null then raise exception 'A collector account is required.'; end if;
  insert into public.received_rewards(user_id,source_type,source_id,title,message,reward_type,reward_payload,created_by,metadata,expires_at)
  values(requested_user_id,requested_source_type,nullif(requested_source_id,''),coalesce(nullif(trim(requested_title),''),'Starlight Reward'),requested_message,requested_reward_type,coalesce(requested_reward_payload,'{}'::jsonb),requested_created_by,coalesce(requested_metadata,'{}'::jsonb),requested_expires_at)
  on conflict(user_id,source_type,source_id) where source_id is not null do update set metadata=public.received_rewards.metadata||excluded.metadata
  returning * into saved;
  if to_regclass('public.user_notifications') is not null then
    perform public.create_user_notification_v881(requested_user_id,'reward','New reward ready to claim',saved.title||' is waiting in Received Rewards.','🎁','rewards',jsonb_build_object('rewardId',saved.id),case when saved.source_id is null then 'received:'||saved.id else 'received:'||saved.source_type||':'||saved.source_id end,requested_expires_at);
  end if;
  return to_jsonb(saved);
end;$$;
revoke all on function public.queue_received_reward_v892(uuid,text,text,text,text,text,jsonb,uuid,jsonb,timestamptz) from public,anon,authenticated;
grant execute on function public.queue_received_reward_v892(uuid,text,text,text,text,text,jsonb,uuid,jsonb,timestamptz) to service_role;

create or replace function public.get_my_received_rewards_v892(requested_status text default null)
returns jsonb language sql stable security definer set search_path=public as $$
  select jsonb_build_object(
    'pendingCount',count(*) filter(where status='pending' and available_at<=now() and (expires_at is null or expires_at>now())),
    'rewards',coalesce(jsonb_agg(jsonb_build_object(
      'id',id,'sourceType',source_type,'sourceId',source_id,'title',title,'message',message,
      'rewardType',reward_type,'rewardPayload',reward_payload,'status',status,'claimedSnapshot',claimed_snapshot,
      'availableAt',available_at,'expiresAt',expires_at,'claimedAt',claimed_at,'createdAt',created_at,'metadata',metadata
    ) order by created_at desc) filter(where requested_status is null or status=requested_status),'[]'::jsonb)
  ) from public.received_rewards where user_id=auth.uid();
$$;
grant execute on function public.get_my_received_rewards_v892(text) to authenticated;

create or replace function public.claim_my_received_reward_v892(requested_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); r public.received_rewards; snapshot jsonb:='{}'::jsonb; qty integer; card_ids text[]; cards_json jsonb:='[]'::jsonb;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into r from public.received_rewards where id=requested_id and user_id=uid for update;
  if not found then raise exception 'Reward was not found.'; end if;
  if r.status<>'pending' then raise exception 'This reward is no longer available.'; end if;
  if r.available_at>now() then raise exception 'This reward is not available yet.'; end if;
  if r.expires_at is not null and r.expires_at<=now() then update public.received_rewards set status='expired' where id=r.id; raise exception 'This reward has expired.'; end if;
  if r.reward_type='star_bits' then
    qty:=greatest(coalesce((r.reward_payload->>'amount')::integer,0),0); if qty<=0 then raise exception 'This reward is invalid.'; end if;
    insert into public.user_wallets(user_id,star_bits,lifetime_star_bits_earned) values(uid,qty,qty)
    on conflict(user_id) do update set star_bits=public.user_wallets.star_bits+excluded.star_bits,lifetime_star_bits_earned=public.user_wallets.lifetime_star_bits_earned+excluded.lifetime_star_bits_earned,updated_at=now();
    snapshot=jsonb_build_object('type','star_bits','amount',qty);
  elsif r.reward_type='single_card' then
    qty:=greatest(coalesce((r.reward_payload->>'quantity')::integer,1),1);
    insert into public.user_cards(user_id,card_id,quantity) values(uid,r.reward_payload->>'cardId',qty)
    on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
    select jsonb_build_object('type','single_card','cards',jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'cardNumber',c.card_number,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url,'quantity',qty))) into snapshot from public.cards c where c.id=r.reward_payload->>'cardId';
  elsif r.reward_type='booster' and nullif(r.reward_payload->>'boosterId','') is not null then
    snapshot:=public.build_and_award_booster(r.reward_payload->>'boosterId',uid);
  elsif r.reward_type in ('booster','card_bundle') then
    select array_agg(value::text) into card_ids from jsonb_array_elements_text(coalesce(r.reward_payload->'cardIds','[]'::jsonb));
    if coalesce(cardinality(card_ids),0)=0 then raise exception 'This reward has no cards.'; end if;
    insert into public.user_cards(user_id,card_id,quantity)
    select uid,x.card_id,count(*)::integer from unnest(card_ids) x(card_id) group by x.card_id
    on conflict(user_id,card_id) do update set quantity=public.user_cards.quantity+excluded.quantity,last_obtained_at=now(),updated_at=now();
    select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'cardNumber',c.card_number,'rarity',c.rarity,'imageUrl',c.image_url,'thumbnailUrl',c.thumbnail_url) order by u.ord),'[]'::jsonb) into cards_json from unnest(card_ids) with ordinality u(card_id,ord) join public.cards c on c.id=u.card_id;
    snapshot=jsonb_build_object('type','booster','cards',cards_json);
  else raise exception 'Unsupported reward type.'; end if;
  update public.received_rewards set status='claimed',claimed_snapshot=snapshot,claimed_at=now() where id=r.id;
  return jsonb_build_object('success',true,'rewardId',r.id,'title',r.title,'rewardType',r.reward_type,'snapshot',snapshot);
end;$$;
grant execute on function public.claim_my_received_reward_v892(uuid) to authenticated;

create or replace function public.dismiss_my_received_reward_v892(requested_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$ begin update public.received_rewards set status='cancelled' where id=requested_id and user_id=auth.uid() and status in ('claimed','expired'); return found; end;$$;
grant execute on function public.dismiss_my_received_reward_v892(uuid) to authenticated;

-- Twitch rewards now arrive in the collector's claim inbox.
create or replace function public.apply_twitch_reward_v890(
  requested_user_id uuid, requested_reward_type text, requested_star_bits bigint default null,
  requested_card_id text default null, requested_card_quantity integer default null,
  requested_booster_id text default null, requested_event_id text default null,
  requested_rule_id uuid default null, requested_twitch_user_id text default null,
  requested_source text default 'twitch', requested_granted_by uuid default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare payload jsonb; queued jsonb;
begin
  payload:=case requested_reward_type
    when 'star_bits' then jsonb_build_object('amount',requested_star_bits)
    when 'single_card' then jsonb_build_object('cardId',requested_card_id,'quantity',greatest(coalesce(requested_card_quantity,1),1))
    when 'booster' then jsonb_build_object('boosterId',requested_booster_id)
    else '{}'::jsonb end;
  queued:=public.queue_received_reward_v892(requested_user_id,case when requested_source='manual' then 'manual' else 'twitch' end,coalesce(requested_event_id,requested_source||':'||coalesce(requested_twitch_user_id,'')||':'||extract(epoch from now())::bigint),'Twitch reward',case when requested_source='manual' then 'A one-time reward was sent to you.' else 'Your Twitch activity unlocked a Starlight reward.' end,requested_reward_type,payload,requested_granted_by,jsonb_build_object('ruleId',requested_rule_id,'twitchUserId',requested_twitch_user_id,'eventId',requested_event_id),null);
  insert into public.twitch_reward_grants(event_id,rule_id,user_id,twitch_user_id,reward_snapshot,source,granted_by)
  values(requested_event_id,requested_rule_id,requested_user_id,requested_twitch_user_id,jsonb_build_object('pending',true,'receivedRewardId',queued->>'id','rewardType',requested_reward_type,'payload',payload),coalesce(requested_source,'twitch'),requested_granted_by);
  return jsonb_build_object('success',true,'pending',true,'receivedRewardId',queued->>'id');
end;$$;
revoke all on function public.apply_twitch_reward_v890(uuid,text,bigint,text,integer,text,text,uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.apply_twitch_reward_v890(uuid,text,bigint,text,integer,text,text,uuid,text,text,uuid) to service_role;

-- Reward codes now reserve a reward in Received Rewards instead of auto-opening it.
create or replace function public.redeem_reward_code(requested_code text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); normalized text; generated_hash text; c public.reward_codes%rowtype; rw public.reward_code_rewards%rowtype; redemption_id bigint; queued jsonb; payload jsonb;
begin
  if uid is null then raise exception 'You must be signed in to redeem a code.'; end if;
  normalized:=regexp_replace(upper(trim(requested_code)),'[^A-Z0-9]','','g'); if normalized='' then raise exception 'Enter a redemption code.'; end if;
  generated_hash:=encode(digest(normalized,'sha256'),'hex'); select * into c from public.reward_codes where code_hash=generated_hash for update;
  if not found then return jsonb_build_object('success',false,'message','That redemption code is not valid.'); end if;
  if not c.active or (c.starts_at is not null and now()<c.starts_at) or (c.expires_at is not null and now()>=c.expires_at) or (c.max_uses is not null and c.current_uses>=c.max_uses) then return jsonb_build_object('success',false,'message','That redemption code is not currently available.'); end if;
  insert into public.reward_code_redemptions(code_id,user_id) values(c.id,uid) on conflict(code_id,user_id) do nothing returning id into redemption_id;
  if redemption_id is null then return jsonb_build_object('success',false,'message','You have already redeemed this code.'); end if;
  select * into rw from public.reward_code_rewards where code_id=c.id;
  payload:=case rw.reward_type when 'star_bits' then jsonb_build_object('amount',rw.star_bits_amount) when 'single_card' then jsonb_build_object('cardId',rw.card_id,'quantity',rw.card_quantity) else jsonb_build_object('cardIds',to_jsonb(rw.booster_card_ids)) end;
  queued:=public.queue_received_reward_v892(uid,'reward_code',c.id::text,c.label,'A reward code was redeemed and is ready to open.',case when rw.reward_type='booster' then 'card_bundle' else rw.reward_type end,payload,null,jsonb_build_object('redemptionId',redemption_id),c.expires_at);
  update public.reward_codes set current_uses=current_uses+1,updated_at=now() where id=c.id;
  update public.reward_code_redemptions set reward_snapshot=jsonb_build_object('pending',true,'receivedRewardId',queued->>'id','label',c.label,'rewardType',rw.reward_type) where id=redemption_id;
  return jsonb_build_object('success',true,'pending',true,'receivedRewardId',queued->>'id','label',c.label,'rewardType',rw.reward_type,'message','Reward added to Received Rewards.');
end;$$;
grant execute on function public.redeem_reward_code(text) to authenticated;

-- Repair directory RPC and keep it independent of fragile page-side joins.
create or replace function public.admin_list_user_directory(requested_search text default null,requested_limit integer default 500)
returns jsonb language plpgsql stable security definer set search_path=public,auth as $$
declare out_json jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',u.id,'email',u.email,'accountCreatedAt',u.created_at,'lastSignInAt',u.last_sign_in_at,'username',p.username,'displayName',p.display_name,'profileVisibility',p.profile_visibility,'role',coalesce(sr.role::text,'collector'),'twitchLogin',tc.twitch_login,'twitchDisplayName',tc.twitch_display_name) order by u.created_at desc),'[]'::jsonb) into out_json
  from auth.users u left join public.profiles p on p.id=u.id left join public.site_roles sr on sr.user_id=u.id left join public.twitch_connections tc on tc.user_id=u.id
  where requested_search is null or requested_search='' or lower(coalesce(u.email,'')||' '||coalesce(p.username,'')||' '||coalesce(p.display_name,'')||' '||coalesce(tc.twitch_login,'')) like '%'||lower(requested_search)||'%'
  limit greatest(1,least(coalesce(requested_limit,500),2000));
  return out_json;
end;$$;
grant execute on function public.admin_list_user_directory(text,integer) to authenticated;

create or replace function public.notify_redemption_v881()
returns trigger language plpgsql security definer set search_path=public as $$
declare label text;
begin
  select rc.label into label from public.reward_codes rc where rc.id=new.code_id;
  perform public.create_user_notification_v881(new.user_id,'reward','Reward code accepted',coalesce(label,'Your Starlight reward')||' is being prepared in Received Rewards.','🎟️','rewards','{}'::jsonb,'redemption:'||new.id,null);
  return new;
end;$$;

-- Public, non-sensitive list of booster redeems configured for Twitch Channel Points.
create or replace function public.get_twitch_shop_redeems_v892()
returns jsonb language sql stable security definer set search_path=public as $$
  select coalesce(jsonb_agg(jsonb_build_object('ruleId',r.id,'name',r.name,'boosterId',r.booster_id,'twitchRewardId',r.twitch_reward_id) order by r.name),'[]'::jsonb)
  from public.twitch_reward_rules r
  where r.active=true and r.event_type='channel_points' and r.reward_type='booster' and r.booster_id is not null;
$$;
grant execute on function public.get_twitch_shop_redeems_v892() to anon,authenticated;
