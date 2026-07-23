import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('public profile migration exposes collector XP and summary fields', async () => {
  const migration = await read('supabase/migrations/20260722140000_public_profile_level_stats.sql');
  assert.match(migration, /collectorXp/);
  assert.match(migration, /favoriteCount/);
  assert.match(migration, /extraCopies/);
  assert.match(migration, /collector_xp/);
  assert.match(migration, /get_public_collector_profile/);
});

test('public collector profile renders collection dashboard stats', async () => {
  const [html, page] = await Promise.all([
    read('docs/collector.html'),
    read('docs/js/pages/collector-page.js')
  ]);
  assert.match(html, /collection-summary-grid/);
  assert.match(html, /collection-level-card/);
  assert.match(html, /collection-progress-suite/);
  assert.match(page, /levelFromPoints/);
  assert.match(page, /renderCollectorLevel/);
  assert.match(page, /renderRaritySpotlight/);
  assert.match(page, /renderSeriesMini/);
});

test('collector peer gift uses shared modal adoptModal contract', async () => {
  const [html, page, css] = await Promise.all([
    read('docs/collector.html'),
    read('docs/js/pages/collector-page.js'),
    read('docs/css/pages/collector.css')
  ]);
  assert.match(html, /st-dialog-overlay collector-gift-dialog/);
  assert.doesNotMatch(html, /<dialog\b/);
  assert.match(html, /data-st-modal-close/);
  assert.match(page, /adoptModal\(giftDialog/);
  assert.match(page, /ensureGiftModal/);
  assert.doesNotMatch(page, /showModal\(/);
  assert.doesNotMatch(page, /(?<![\w.])alert\s*\(/);
  assert.match(css, /\.collector-gift-dialog\.st-dialog-overlay/);
});
