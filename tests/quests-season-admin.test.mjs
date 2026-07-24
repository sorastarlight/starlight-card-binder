import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  formatRequirementSummary,
  fromDatetimeLocalValue,
  requirementNeedsTarget,
  slugifyAdminId,
  toDatetimeLocalValue
} from '../docs/js/quests-season-admin-utils.js';

const read = (path) => readFile(path, 'utf8');

test('quest admin helpers format requirements and ids', () => {
  assert.equal(slugifyAdminId('Own One Legendary!'), 'own_one_legendary');
  assert.equal(requirementNeedsTarget('own_rarity'), true);
  assert.equal(requirementNeedsTarget('favorite_count'), false);
  assert.equal(
    formatRequirementSummary({ requirementType: 'own_rarity', requirementTarget: 'Legendary', requirementCount: 1 }),
    'Own 1 Legendary'
  );
  assert.equal(
    formatRequirementSummary(
      { requirementType: 'own_series_complete', requirementTarget: '001', requirementCount: 1 },
      { series: [{ id: '001', name: 'Rising Star' }] }
    ),
    'Complete series Rising Star'
  );
  const iso = fromDatetimeLocalValue('2026-07-01T12:00');
  assert.ok(iso);
  assert.match(toDatetimeLocalValue(iso), /^2026-07-01T/);
});

test('quests season admin migration defines staff RPCs and claim-guarded delete', async () => {
  const migration = await read('supabase/migrations/20260723180000_admin_quests_season_pass.sql');
  for (const fn of [
    'admin_list_collection_quests',
    'admin_list_seasons',
    'admin_list_collector_titles',
    'admin_get_quests_season_admin',
    'admin_save_collection_quest',
    'admin_save_season',
    'admin_save_season_tier',
    'admin_save_collector_title',
    'admin_delete_season_tier'
  ]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}`));
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}`));
  }
  assert.match(migration, /Administrator access is required/);
  assert.match(migration, /Cannot delete tier: % collector\(s\) have already claimed it/);
  assert.match(migration, /user_season_tier_claims/);
  assert.match(migration, /audience not in \('all', 'twitch_subscribers'\)/);
});

test('admin quests page is wired into hub and shell', async () => {
  const [html, page, service, hub, shell, css] = await Promise.all([
    read('docs/admin-quests.html'),
    read('docs/js/pages/admin-quests-page.js'),
    read('docs/js/quests-season-admin-service.js'),
    read('docs/admin-hub.html'),
    read('docs/js/app-shell.js'),
    read('docs/css/pages/admin-quests.css')
  ]);
  assert.match(html, /admin-quests-page\.js\?v=1\./);
  assert.match(html, /admin-quests\.css\?v=1\.0/);
  assert.match(html, /data-tab="quests"/);
  assert.match(html, /data-tab="seasons"/);
  assert.match(html, /data-tab="titles"/);
  assert.match(html, /id="questCadence"/);
  assert.match(page, /questCadence/);
  assert.match(page, /cadenceLabel/);
  assert.match(page, /getQuestsSeasonAdmin/);
  assert.match(page, /saveCollectionQuest/);
  assert.match(page, /saveSeason/);
  assert.match(page, /saveSeasonTier/);
  assert.match(page, /deleteSeasonTier/);
  assert.match(page, /getMyStaffAccess/);
  assert.match(service, /admin_get_quests_season_admin/);
  assert.match(service, /admin_delete_season_tier/);
  assert.match(service, /quests-season-admin-utils/);
  assert.match(hub, /admin-quests\.html/);
  assert.match(hub, /Quests &amp; Season Pass/);
  assert.match(shell, /'admin-quests':\{title:'Quests & Season Pass',src:'admin-quests\.html'\}/);
  assert.match(css, /\.tab\.active/);
  const embed = await read('docs/js/embed-mode.js');
  assert.match(embed, /'admin-quests\.html':'admin-quests'/);
  const routes = await read('docs/js/shell-route-utils.js');
  assert.match(routes, /'admin-quests'/);
});
