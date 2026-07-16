-- ============================================================
-- STARLIGHT CARD BINDER V89.5
-- Send Gifts, notification history, and Twitch sign-in support
-- ============================================================

create or replace function public.admin_send_gift_v895(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  target_id uuid;
  target_label text;
  reward_type text:=coalesce(nullif(payload->>'rewardType',''),'star_bits');
  reward_payload jsonb;
  queued jsonb;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  target_id:=nullif(payload->>'userId','')::uuid;
  if target_id is null then raise exception 'Choose a registered collector.'; end if;
  select coalesce(nullif(p.display_name,''),nullif(p.username,''),u.email,'Collector') into target_label
  from auth.users u left join public.profiles p on p.id=u.id where u.id=target_id;
  if target_label is null then raise exception 'The selected collector no longer exists.'; end if;
  reward_payload:=case reward_type
    when 'star_bits' then jsonb_build_object('amount',greatest(coalesce(nullif(payload->>'starBitsAmount','')::integer,0),0))
    when 'single_card' then jsonb_build_object('cardId',nullif(payload->>'cardId',''),'quantity',greatest(coalesce(nullif(payload->>'cardQuantity','')::integer,1),1))
    when 'booster' then jsonb_build_object('boosterId',nullif(payload->>'boosterId',''))
    else '{}'::jsonb end;
  if reward_type='star_bits' and coalesce((reward_payload->>'amount')::integer,0)<=0 then raise exception 'Enter a Star Bits amount greater than zero.'; end if;
  if reward_type='single_card' and nullif(reward_payload->>'cardId','') is null then raise exception 'Choose a card.'; end if;
  if reward_type='booster' and nullif(reward_payload->>'boosterId','') is null then raise exception 'Choose a booster.'; end if;
  queued:=public.queue_received_reward_v892(
    target_id,'gift','admin-gift:'||gen_random_uuid()::text,
    coalesce(nullif(trim(payload->>'title'),''),'A gift from the Starlight team'),
    coalesce(nullif(trim(payload->>'message'),''),'A special gift is ready for you.'),
    reward_type,reward_payload,auth.uid(),
    jsonb_build_object('recipientLabel',target_label,'sentByAdmin',true),null
  );
  return jsonb_build_object('success',true,'giftId',queued->>'id','recipientId',target_id,'recipientLabel',target_label,'rewardType',reward_type,'rewardPayload',reward_payload,'status','pending');
end;$$;
revoke all on function public.admin_send_gift_v895(jsonb) from public,anon;
grant execute on function public.admin_send_gift_v895(jsonb) to authenticated;

create or replace function public.admin_get_gift_history_v895(requested_limit integer default 100)
returns jsonb language sql stable security definer set search_path=public as $$
  select case when public.is_content_admin() then coalesce(jsonb_agg(jsonb_build_object(
    'id',r.id,'userId',r.user_id,'recipient',coalesce(nullif(p.display_name,''),nullif(p.username,''),u.email,'Collector'),
    'title',r.title,'message',r.message,'rewardType',r.reward_type,'rewardPayload',r.reward_payload,
    'status',r.status,'createdAt',r.created_at,'claimedAt',r.claimed_at,'createdBy',r.created_by
  ) order by r.created_at desc),'[]'::jsonb) else '[]'::jsonb end
  from (select * from public.received_rewards where source_type='gift' order by created_at desc limit least(greatest(coalesce(requested_limit,100),1),500)) r
  join auth.users u on u.id=r.user_id left join public.profiles p on p.id=r.user_id;
$$;
grant execute on function public.admin_get_gift_history_v895(integer) to authenticated;
