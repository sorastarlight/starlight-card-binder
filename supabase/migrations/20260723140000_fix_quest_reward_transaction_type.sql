-- Fix Collection Quest / Season Pass claims failing on star_bits_transactions check.
-- Allowed types: duplicate_conversion, admin_grant, reward, purchase, adjustment.
-- credit_star_bits_reward was writing 'quest_reward', which violates the check.

create or replace function public.credit_star_bits_reward(
  requested_user_id uuid,
  requested_amount integer,
  requested_description text,
  requested_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if requested_user_id is null or coalesce(requested_amount, 0) <= 0 then
    return;
  end if;

  insert into public.user_wallets(user_id, star_bits, lifetime_star_bits_earned)
  values (requested_user_id, requested_amount, requested_amount)
  on conflict (user_id) do update set
    star_bits = public.user_wallets.star_bits + excluded.star_bits,
    lifetime_star_bits_earned = public.user_wallets.lifetime_star_bits_earned + excluded.lifetime_star_bits_earned,
    updated_at = now();

  insert into public.star_bits_transactions(
    user_id, transaction_type, star_bits_change, description, metadata
  ) values (
    requested_user_id,
    'reward',
    requested_amount,
    coalesce(nullif(trim(requested_description), ''), 'Progress reward'),
    coalesce(requested_metadata, '{}'::jsonb) || jsonb_build_object('source', 'progress_reward')
  );
end;
$$;

revoke all on function public.credit_star_bits_reward(uuid, integer, text, jsonb) from public, anon, authenticated;
grant execute on function public.credit_star_bits_reward(uuid, integer, text, jsonb) to service_role;
