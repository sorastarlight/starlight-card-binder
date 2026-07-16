-- ============================================================
-- STARLIGHT CARD BINDER V89.1
-- Twitch Reward Studio validation and rule-builder repair
-- ============================================================

-- Replace the reward payload constraint with a named, explicit constraint.
alter table public.twitch_reward_rules
  drop constraint if exists twitch_reward_rules_check;
alter table public.twitch_reward_rules
  drop constraint if exists twitch_reward_rules_reward_payload_check;

alter table public.twitch_reward_rules
  add constraint twitch_reward_rules_reward_payload_check check (
    (reward_type='star_bits' and coalesce(star_bits_amount,0)>0
      and card_id is null and card_quantity is null and booster_id is null)
    or
    (reward_type='single_card' and card_id is not null and coalesce(card_quantity,0)>0
      and booster_id is null and star_bits_amount is null)
    or
    (reward_type='booster' and booster_id is not null
      and card_id is null and card_quantity is null and star_bits_amount is null)
  );

-- Channel Point rules must target a real Twitch reward ID. Other events do not use one.
alter table public.twitch_reward_rules
  drop constraint if exists twitch_reward_rules_event_target_check;
alter table public.twitch_reward_rules
  add constraint twitch_reward_rules_event_target_check check (
    (event_type='channel_points' and nullif(trim(twitch_reward_id),'') is not null)
    or
    (event_type<>'channel_points' and twitch_reward_id is null)
  );

create or replace function public.admin_save_twitch_reward_rule_v890(payload jsonb)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  rid uuid:=nullif(payload->>'id','')::uuid;
  event_name text:=nullif(trim(payload->>'eventType'),'');
  reward_name text:=nullif(trim(payload->>'rewardType'),'');
  saved public.twitch_reward_rules;
  clean_twitch_reward_id text;
  clean_bits bigint;
  clean_card_id text;
  clean_card_quantity integer;
  clean_booster_id text;
begin
  if not public.is_content_admin() then raise exception 'Administrator access is required.'; end if;
  if nullif(trim(payload->>'name'),'') is null then raise exception 'Enter a rule name.'; end if;
  if event_name not in ('channel_points','subscription','follow','manual','attendance') then
    raise exception 'Choose a supported Twitch event.';
  end if;
  if reward_name not in ('star_bits','single_card','booster') then
    raise exception 'Choose a supported site reward.';
  end if;

  clean_twitch_reward_id:=case when event_name='channel_points' then nullif(trim(payload->>'twitchRewardId'),'') else null end;
  if event_name='channel_points' and clean_twitch_reward_id is null then
    raise exception 'Select a Twitch Channel Points reward.';
  end if;

  clean_bits:=case when reward_name='star_bits' then nullif(payload->>'starBitsAmount','')::bigint else null end;
  clean_card_id:=case when reward_name='single_card' then nullif(payload->>'cardId','') else null end;
  clean_card_quantity:=case when reward_name='single_card' then greatest(coalesce(nullif(payload->>'cardQuantity','')::integer,1),1) else null end;
  clean_booster_id:=case when reward_name='booster' then nullif(payload->>'boosterId','') else null end;

  if reward_name='star_bits' and coalesce(clean_bits,0)<=0 then raise exception 'Enter a positive Star Bits amount.'; end if;
  if reward_name='single_card' and clean_card_id is null then raise exception 'Select a card.'; end if;
  if reward_name='booster' and clean_booster_id is null then raise exception 'Select a booster pack.'; end if;

  if rid is null then
    insert into public.twitch_reward_rules(
      name,event_type,twitch_reward_id,reward_type,star_bits_amount,card_id,card_quantity,
      booster_id,cooldown_minutes,max_claims_per_user,active,created_by
    ) values(
      trim(payload->>'name'),event_name,clean_twitch_reward_id,reward_name,clean_bits,clean_card_id,
      clean_card_quantity,clean_booster_id,coalesce(nullif(payload->>'cooldownMinutes','')::integer,0),
      nullif(payload->>'maxClaimsPerUser','')::integer,coalesce((payload->>'active')::boolean,true),auth.uid()
    ) returning * into saved;
  else
    update public.twitch_reward_rules set
      name=trim(payload->>'name'),event_type=event_name,twitch_reward_id=clean_twitch_reward_id,
      reward_type=reward_name,star_bits_amount=clean_bits,card_id=clean_card_id,
      card_quantity=clean_card_quantity,booster_id=clean_booster_id,
      cooldown_minutes=coalesce(nullif(payload->>'cooldownMinutes','')::integer,0),
      max_claims_per_user=nullif(payload->>'maxClaimsPerUser','')::integer,
      active=coalesce((payload->>'active')::boolean,true),updated_at=now()
    where id=rid returning * into saved;
    if saved.id is null then raise exception 'Reward rule was not found.'; end if;
  end if;
  return to_jsonb(saved);
end;$$;
revoke all on function public.admin_save_twitch_reward_rule_v890(jsonb) from public,anon;
grant execute on function public.admin_save_twitch_reward_rule_v890(jsonb) to authenticated;
