-- ============================================================
-- STARLIGHT CARD BINDER V88.1
-- Notifications Center, Broadcasts, and Event Alerts
-- Rerunnable migration
-- ============================================================

create table if not exists public.user_notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null default 'general',
  title text not null,
  body text,
  icon text not null default '✦',
  route text,
  route_params jsonb not null default '{}'::jsonb,
  source_key text,
  is_read boolean not null default false,
  read_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists user_notifications_user_created_idx on public.user_notifications(user_id, created_at desc);
create index if not exists user_notifications_user_unread_idx on public.user_notifications(user_id, is_read, created_at desc);
create unique index if not exists user_notifications_source_unique_idx on public.user_notifications(user_id, source_key) where source_key is not null;
alter table public.user_notifications enable row level security;
drop policy if exists "Users can view their own notifications" on public.user_notifications;
create policy "Users can view their own notifications" on public.user_notifications for select to authenticated using (auth.uid()=user_id);
drop policy if exists "Users can update their own notifications" on public.user_notifications;
create policy "Users can update their own notifications" on public.user_notifications for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "Users can delete their own notifications" on public.user_notifications;
create policy "Users can delete their own notifications" on public.user_notifications for delete to authenticated using (auth.uid()=user_id);

create or replace function public.create_user_notification_v881(
  requested_user_id uuid, requested_type text, requested_title text, requested_body text,
  requested_icon text default '✦', requested_route text default null,
  requested_route_params jsonb default '{}'::jsonb, requested_source_key text default null,
  requested_expires_at timestamptz default null
) returns bigint language plpgsql security definer set search_path=public as $$
declare new_id bigint;
begin
  if requested_user_id is null or nullif(trim(requested_title),'') is null then return null; end if;
  insert into public.user_notifications(user_id,notification_type,title,body,icon,route,route_params,source_key,expires_at)
  values(requested_user_id,coalesce(nullif(trim(requested_type),''),'general'),trim(requested_title),nullif(trim(requested_body),''),coalesce(nullif(requested_icon,''),'✦'),nullif(trim(requested_route),''),coalesce(requested_route_params,'{}'::jsonb),nullif(trim(requested_source_key),''),requested_expires_at)
  on conflict (user_id,source_key) where source_key is not null do nothing returning id into new_id;
  return new_id;
end;$$;
revoke all on function public.create_user_notification_v881(uuid,text,text,text,text,text,jsonb,text,timestamptz) from public,anon,authenticated;

create or replace function public.sync_my_notifications_v881() returns void language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); e record; daily jsonb; daily_key text;
begin
  if uid is null then return; end if;
  delete from public.user_notifications where user_id=uid and expires_at is not null and expires_at<now();
  for e in select id,name,description,end_at from public.starlight_events where is_active=true and is_hidden=false and now() between start_at and end_at loop
    perform public.create_user_notification_v881(uid,'event','🎉 '||e.name,coalesce(e.description,'A Starlight event is active now.'),'🎉','events',jsonb_build_object('event',e.id),'event-active:'||e.id,e.end_at);
  end loop;
  begin
    daily:=public.get_daily_booster_status();
    if coalesce((daily->>'available')::boolean,false) then
      daily_key:='daily-ready:'||timezone('America/New_York',now())::date::text;
      perform public.create_user_notification_v881(uid,'daily_booster','Your Daily Free Booster is ready!','Open today’s free pack and reveal your new cards.','✨','daily','{}'::jsonb,daily_key,((timezone('America/New_York',now())::date+1)::timestamp at time zone 'America/New_York'));
    end if;
  exception when others then null; end;
end;$$;
grant execute on function public.sync_my_notifications_v881() to authenticated;

create or replace function public.get_my_notifications_v881(requested_limit integer default 60) returns jsonb language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); result jsonb; unread integer;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  perform public.sync_my_notifications_v881();
  select count(*) into unread from public.user_notifications where user_id=uid and is_read=false and (expires_at is null or expires_at>now());
  select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at desc),'[]'::jsonb) into result from (select * from public.user_notifications where user_id=uid and (expires_at is null or expires_at>now()) order by created_at desc limit greatest(1,least(coalesce(requested_limit,60),200))) n;
  return jsonb_build_object('notifications',result,'unreadCount',unread);
end;$$;
grant execute on function public.get_my_notifications_v881(integer) to authenticated;

create or replace function public.mark_notification_read_v881(requested_id bigint) returns boolean language plpgsql security definer set search_path=public as $$ begin update public.user_notifications set is_read=true,read_at=coalesce(read_at,now()) where id=requested_id and user_id=auth.uid(); return found; end;$$;
create or replace function public.mark_all_notifications_read_v881() returns integer language plpgsql security definer set search_path=public as $$ declare n integer; begin update public.user_notifications set is_read=true,read_at=coalesce(read_at,now()) where user_id=auth.uid() and is_read=false; get diagnostics n=row_count; return n; end;$$;
create or replace function public.delete_notification_v881(requested_id bigint) returns boolean language plpgsql security definer set search_path=public as $$ begin delete from public.user_notifications where id=requested_id and user_id=auth.uid(); return found; end;$$;
create or replace function public.delete_read_notifications_v881() returns integer language plpgsql security definer set search_path=public as $$ declare n integer; begin delete from public.user_notifications where user_id=auth.uid() and is_read=true; get diagnostics n=row_count; return n; end;$$;
grant execute on function public.mark_notification_read_v881(bigint),public.mark_all_notifications_read_v881(),public.delete_notification_v881(bigint),public.delete_read_notifications_v881() to authenticated;

create or replace function public.notify_trade_offer_v881() returns trigger language plpgsql security definer set search_path=public as $$
declare proposer_name text; recipient_name text;
begin
  select coalesce(display_name,username,'A collector') into proposer_name from public.profiles where id=new.proposer_id;
  select coalesce(display_name,username,'A collector') into recipient_name from public.profiles where id=new.recipient_id;
  if tg_op='INSERT' then
    perform public.create_user_notification_v881(new.recipient_id,'trade','New trade offer',proposer_name||' sent you a trade offer.','🤝','offers','{}'::jsonb,'trade-new:'||new.id,null);
  elsif old.status is distinct from new.status then
    if new.status='accepted' then
      perform public.create_user_notification_v881(new.proposer_id,'trade','Trade accepted',recipient_name||' accepted your trade offer.','✅','offers','{}'::jsonb,'trade-status:'||new.id||':accepted',null);
      perform public.create_user_notification_v881(new.recipient_id,'trade','Trade completed','Your trade with '||proposer_name||' was completed.','✅','offers','{}'::jsonb,'trade-status-recipient:'||new.id||':accepted',null);
    elsif new.status='declined' then
      perform public.create_user_notification_v881(new.proposer_id,'trade','Trade declined',recipient_name||' declined your trade offer.','💌','offers','{}'::jsonb,'trade-status:'||new.id||':declined',null);
    elsif new.status='cancelled' then
      perform public.create_user_notification_v881(new.recipient_id,'trade','Trade offer cancelled',proposer_name||' cancelled a trade offer.','↩️','offers','{}'::jsonb,'trade-status:'||new.id||':cancelled',null);
    end if;
  end if;
  return new;
end;$$;
drop trigger if exists trade_offer_notifications_v881 on public.trade_offers;
create trigger trade_offer_notifications_v881 after insert or update of status on public.trade_offers for each row execute function public.notify_trade_offer_v881();

create or replace function public.notify_achievement_v881() returns trigger language plpgsql security definer set search_path=public as $$
declare a record;
begin
  select name,description,icon into a from public.achievement_definitions where id=new.achievement_id;
  perform public.create_user_notification_v881(new.user_id,'achievement','Achievement unlocked: '||coalesce(a.name,new.achievement_id),a.description,coalesce(a.icon,'🏆'),'profile','{}'::jsonb,'achievement:'||new.achievement_id,null);
  return new;
end;$$;
drop trigger if exists user_achievement_notifications_v881 on public.user_achievements;
create trigger user_achievement_notifications_v881 after insert on public.user_achievements for each row execute function public.notify_achievement_v881();

create or replace function public.notify_redemption_v881() returns trigger language plpgsql security definer set search_path=public as $$
declare label text;
begin
  select rc.label into label from public.reward_codes rc where rc.id=new.code_id;
  perform public.create_user_notification_v881(new.user_id,'reward','Reward code redeemed',coalesce(label,'Your Starlight reward')||' was added to your account.','🎟️','redeem','{}'::jsonb,'redemption:'||new.id,null);
  return new;
end;$$;
drop trigger if exists reward_redemption_notifications_v881 on public.reward_code_redemptions;
create trigger reward_redemption_notifications_v881 after insert on public.reward_code_redemptions for each row execute function public.notify_redemption_v881();

create or replace function public.admin_broadcast_notification_v881(payload jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare count_inserted integer; source text:='broadcast:'||gen_random_uuid()::text;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if nullif(trim(payload->>'title'),'') is null or nullif(trim(payload->>'body'),'') is null then raise exception 'Title and message are required.'; end if;
  insert into public.user_notifications(user_id,notification_type,title,body,icon,route,source_key,expires_at)
  select u.id,'broadcast',trim(payload->>'title'),trim(payload->>'body'),coalesce(nullif(payload->>'icon',''),'📣'),nullif(trim(payload->>'route'),''),source,(payload->>'expiresAt')::timestamptz from auth.users u;
  get diagnostics count_inserted=row_count;
  return jsonb_build_object('success',true,'recipientCount',count_inserted);
end;$$;
revoke all on function public.admin_broadcast_notification_v881(jsonb) from public,anon;
grant execute on function public.admin_broadcast_notification_v881(jsonb) to authenticated;
