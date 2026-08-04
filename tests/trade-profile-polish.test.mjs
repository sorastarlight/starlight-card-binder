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
  const [myTradePage, offersHub, listsHtml] = await Promise.all([
    read('docs/js/pages/my-trade-cards.js'),
    read('docs/js/pages/trade-offers-hub.js'),
    read('docs/trade-lists.html')
  ]);
  assert.match(myTradePage, /buildTradeSearchHaystack/);
  assert.match(offersHub, /buildTradeSearchHaystack/);
  assert.match(listsHtml, /aria-label="Search cards"/);
  assert.match(listsHtml, /aria-label="Search collectors by username, display name, or email"/);
  assert.match(listsHtml, /data-propose-my-search/);
  assert.match(listsHtml, /data-propose-summary/);
  assert.match(listsHtml, /data-propose-results/);
});

test('trade offer composer keeps selections outside the pick grid DOM', async () => {
  const offersHub = await read('docs/js/pages/trade-offers-hub.js');
  assert.match(offersHub, /const offeredQty = new Map\(\)/);
  assert.match(offersHub, /const requestedQty = new Map\(\)/);
  assert.match(offersHub, /function chosen\(side\) \{\s*return \[\.\.\.selectionMap\(side\)\.entries\(\)\]/s);
  assert.match(offersHub, /function sortPickCards/);
  assert.match(offersHub, /options\.onSent/);
  assert.match(offersHub, /Decline this trade\?/);
  assert.match(offersHub, /shellHref\('collector'/);
  assert.match(offersHub, /target="_top"/);
  assert.match(offersHub, /data-shell-view="collector"/);
});

test('my trade cards module renders listed and album sections', async () => {
  const myTradePage = await read('docs/js/pages/my-trade-cards.js');
  assert.match(myTradePage, /listedForTradeGrid/);
  assert.match(myTradePage, /tradeAlbumGrid/);
  assert.match(myTradePage, /data-trade-batch/);
  assert.match(myTradePage, /data-batch-review/);
  assert.match(myTradePage, /pendingBatch/);
  assert.match(myTradePage, /trade-qty-stepper/);
  assert.match(myTradePage, /clampTradeQty/);
  assert.match(myTradePage, /openReviewModal/);
  assert.doesNotMatch(myTradePage, /showWishlist: true/);
});

test('trade recipient typeahead searches username display name and exact email', async () => {
  const [migration, service, offersHub] = await Promise.all([
    read('supabase/migrations/20260722030000_search_trade_collectors.sql'),
    read('docs/js/trade-offer-service.js'),
    read('docs/js/pages/trade-offers-hub.js')
  ]);
  assert.match(migration, /create or replace function public\.search_trade_collectors/i);
  assert.match(migration, /from auth\.users u/);
  assert.match(migration, /matchedByEmail/);
  assert.doesNotMatch(migration, /'email',\s*u\.email/);
  assert.match(migration, /grant execute on function public\.search_trade_collectors\(text, integer\) to authenticated, service_role/);
  assert.match(migration, /revoke all on function public\.search_trade_collectors\(text, integer\) from public, anon/);
  assert.match(service, /export async function searchTradeCollectors/);
  assert.match(offersHub, /scheduleCollectorSearch/);
  assert.match(offersHub, /searchTradeCollectors/);
  assert.match(offersHub, /data-action="change-recipient"/);
});
