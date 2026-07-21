import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('forward migration revokes anon execute on collector-private RPCs', async () => {
  const migration = await read('supabase/migrations/20260721191343_revoke_anon_collector_rpc_execute.sql');
  for (const fn of [
    'open_daily_booster',
    'get_daily_booster_status',
    'get_star_bits_exchange_preview',
    'claim_my_received_reward_v892',
    'get_my_notifications_v881',
    'set_card_favorite',
    'unlink_my_twitch_v890',
    'audit_reward_code_change',
    'enforce_profile_moderation_lock'
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}`));
  }
  assert.match(migration, /from public, anon/);
  assert.match(migration, /to authenticated, service_role/);
});
