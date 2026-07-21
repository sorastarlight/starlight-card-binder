import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('forward migration revokes anon execute on admin SECURITY DEFINER RPCs', async () => {
  const migration = await read('supabase/migrations/20260721175802_revoke_anon_admin_rpc_execute.sql');
  for (const fn of [
    'admin_delete_news_post',
    'admin_delete_user_completely_v896',
    'admin_get_gift_history_v895',
    'admin_list_news_posts',
    'admin_list_reward_codes',
    'admin_save_news_post',
    'admin_set_reward_code_active'
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}`));
  }
  assert.match(migration, /from public, anon/);
  assert.match(migration, /to authenticated, service_role/);
});
