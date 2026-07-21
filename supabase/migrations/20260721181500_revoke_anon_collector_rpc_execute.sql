-- V1.0 foundation: revoke anon/public EXECUTE on collector-private and
-- trigger-only SECURITY DEFINER functions. Callers must be authenticated
-- (or service_role). Staff/admin checks inside functions remain unchanged.

revoke all on function public.audit_reward_code_change() from public, anon;
revoke all on function public.claim_my_received_reward_v892(uuid) from public, anon;
revoke all on function public.delete_notification_v881(bigint) from public, anon;
revoke all on function public.delete_read_notifications_v881() from public, anon;
revoke all on function public.dismiss_my_received_reward_v892(uuid) from public, anon;
revoke all on function public.enforce_profile_moderation_lock() from public, anon;
revoke all on function public.ensure_user_wallet() from public, anon;
revoke all on function public.get_my_notifications_v881(integer) from public, anon;
revoke all on function public.get_my_profile_extras() from public, anon;
revoke all on function public.get_my_received_rewards_v892(text) from public, anon;
revoke all on function public.get_my_twitch_connection_v890() from public, anon;
revoke all on function public.get_daily_booster_status() from public, anon;
revoke all on function public.get_star_bits_exchange_preview() from public, anon;
revoke all on function public.is_starlight_asset_admin(uuid) from public, anon;
revoke all on function public.mark_all_notifications_read_v881() from public, anon;
revoke all on function public.mark_notification_read_v881(bigint) from public, anon;
revoke all on function public.open_daily_booster() from public, anon;
revoke all on function public.set_card_favorite(text, boolean) from public, anon;
revoke all on function public.set_my_profile_extras(text, text) from public, anon;
revoke all on function public.set_profile_favorite_card(text) from public, anon;
revoke all on function public.unlink_my_twitch_v890() from public, anon;

grant execute on function public.audit_reward_code_change() to authenticated, service_role;
grant execute on function public.claim_my_received_reward_v892(uuid) to authenticated, service_role;
grant execute on function public.delete_notification_v881(bigint) to authenticated, service_role;
grant execute on function public.delete_read_notifications_v881() to authenticated, service_role;
grant execute on function public.dismiss_my_received_reward_v892(uuid) to authenticated, service_role;
grant execute on function public.enforce_profile_moderation_lock() to authenticated, service_role;
grant execute on function public.ensure_user_wallet() to authenticated, service_role;
grant execute on function public.get_my_notifications_v881(integer) to authenticated, service_role;
grant execute on function public.get_my_profile_extras() to authenticated, service_role;
grant execute on function public.get_my_received_rewards_v892(text) to authenticated, service_role;
grant execute on function public.get_my_twitch_connection_v890() to authenticated, service_role;
grant execute on function public.get_daily_booster_status() to authenticated, service_role;
grant execute on function public.get_star_bits_exchange_preview() to authenticated, service_role;
grant execute on function public.is_starlight_asset_admin(uuid) to authenticated, service_role;
grant execute on function public.mark_all_notifications_read_v881() to authenticated, service_role;
grant execute on function public.mark_notification_read_v881(bigint) to authenticated, service_role;
grant execute on function public.open_daily_booster() to authenticated, service_role;
grant execute on function public.set_card_favorite(text, boolean) to authenticated, service_role;
grant execute on function public.set_my_profile_extras(text, text) to authenticated, service_role;
grant execute on function public.set_profile_favorite_card(text) to authenticated, service_role;
grant execute on function public.unlink_my_twitch_v890() to authenticated, service_role;
