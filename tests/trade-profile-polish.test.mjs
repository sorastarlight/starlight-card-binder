import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('trade list migration exposes collectorNumber in RPC payloads', async () => {
  const migration = await read('supabase/migrations/20260722020000_trade_lists_collector_number.sql');
  for (const fn of [
    'get_my_trade_lists',
    'get_public_trade_lists',
    'get_trade_offer_context'
  ]) {
    assert.match(migration, new RegExp(`create or replace function public\\.${fn}`, 'i'));
  }
  assert.match(migration, /'collectorNumber',\s*coalesce\(nullif\(trim\(c\.collector_number\),\s*''\),\s*c\.card_number\)/);
  assert.match(migration, /revoke all on function public\.get_my_trade_lists\(\)/);
  assert.match(migration, /grant execute on function public\.get_public_trade_lists\(text\) to anon, authenticated, service_role/);
});

test('trade pages wire collector-number search helpers and a11y labels', async () => {
  const [listsPage, offersPage, listsHtml, offersHtml] = await Promise.all([
    read('docs/js/pages/trade-lists-page.js'),
    read('docs/js/pages/trade-offers-page.js'),
    read('docs/trade-lists.html'),
    read('docs/trade-offers.html')
  ]);
  assert.match(listsPage, /buildTradeSearchHaystack/);
  assert.match(offersPage, /buildTradeSearchHaystack/);
  assert.match(listsHtml, /aria-label="Search cards"/);
  assert.match(offersHtml, /aria-label="Collector username"/);
  assert.match(offersHtml, /id="myCardsSearch"/);
});
