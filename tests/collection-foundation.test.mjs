import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('keeps the requested collection navigation labels in the shared shell', async () => {
  const binder = await read('docs/binder.html');
  const shell = await read('docs/js/app-shell.js');

  for (const label of [
    'Explore The Starlight Card Series',
    'The Starlight Card Series Binder',
    'Redeem A Code',
    'My Stuff',
    'My Starlight Album',
    'Star Registry'
  ]) assert.match(binder, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  assert.match(shell, /collection:\{title:'My Starlight Album'/);
  assert.match(shell, /checklist:\{title:'Star Registry'/);
});

test('places shared card filters in the binder and collection content areas', async () => {
  const [binder, collection, checklist, app] = await Promise.all([
    read('docs/binder.html'),
    read('docs/collection.html'),
    read('docs/checklist.html'),
    read('docs/js/app.js')
  ]);

  assert.doesNotMatch(binder, /side-card filters/);
  assert.match(binder, /data-card-filter-context="binder"/);
  assert.match(collection, /data-card-filter-context="collection"/);
  assert.match(checklist, /data-card-filter-context="checklist"/);
  assert.match(checklist, /css\/card-filters\.css/);
  assert.match(app, /function renderFilterControls\(\)/);
  assert.match(app, /filterCardList\(baseList, activeFilters\(\)/);
  assert.match(app, /function renderChecklist\(\)/);
  assert.match(app, /filterCardList\(cards, activeFilters\(\)/);
});

test('removes daily-booster promotion and floating quantity badges from My Cards', async () => {
  const [collection, app] = await Promise.all([
    read('docs/collection.html'),
    read('docs/js/app.js')
  ]);

  assert.doesNotMatch(collection, /data-daily-status|Open Daily Booster/);
  assert.doesNotMatch(app, /quantityBadgesHtml/);
  assert.match(app, /duplicate-copy-summary/);
});

test('rebalances Epic and Legendary duplicate exchange values in a forward migration', async () => {
  const migration = await read('docs/supabase/v94_1_star_bits_exchange_rebalance.sql');

  assert.match(migration, /\('Epic',\s*50\)/);
  assert.match(migration, /\('Legendary',\s*100\)/);
  assert.match(migration, /on conflict \(rarity\)[\s\S]*bits_per_duplicate = excluded\.bits_per_duplicate/);
});
