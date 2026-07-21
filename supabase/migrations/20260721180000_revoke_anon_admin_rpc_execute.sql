-- V1.0 foundation: lock admin SECURITY DEFINER RPCs to authenticated staff callers.
-- These functions already enforce staff checks internally, but anon EXECUTE was still
-- granted (Supabase advisor: anon_security_definer_function_executable).

revoke all on function public.admin_delete_news_post(uuid) from public, anon;
revoke all on function public.admin_delete_user_completely_v896(uuid) from public, anon;
revoke all on function public.admin_get_gift_history_v895(integer) from public, anon;
revoke all on function public.admin_list_news_posts() from public, anon;
revoke all on function public.admin_list_reward_codes() from public, anon;
revoke all on function public.admin_save_news_post(jsonb) from public, anon;
revoke all on function public.admin_set_reward_code_active(uuid, boolean) from public, anon;

grant execute on function public.admin_delete_news_post(uuid) to authenticated, service_role;
grant execute on function public.admin_delete_user_completely_v896(uuid) to authenticated, service_role;
grant execute on function public.admin_get_gift_history_v895(integer) to authenticated, service_role;
grant execute on function public.admin_list_news_posts() to authenticated, service_role;
grant execute on function public.admin_list_reward_codes() to authenticated, service_role;
grant execute on function public.admin_save_news_post(jsonb) to authenticated, service_role;
grant execute on function public.admin_set_reward_code_active(uuid, boolean) to authenticated, service_role;
