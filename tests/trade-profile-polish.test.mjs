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
  assert.match(offersHtml, /aria-label="Search collectors by username, display name, or email"/);
  assert.match(offersHtml, /id="myCardsSearch"/);
  assert.match(offersHtml, /id="offerSummary"/);
  assert.match(offersHtml, /id="recipientResults"/);
});

test('trade offer composer keeps selections outside the pick grid DOM', async () => {
  const offersPage = await read('docs/js/pages/trade-offers-page.js');
  assert.match(offersPage, /const offeredQty = new Map\(\)/);
  assert.match(offersPage, /const requestedQty = new Map\(\)/);
  assert.match(offersPage, /function chosen\(side\) \{\s*return \[\.\.\.selectionMap\(side\)\.entries\(\)\]/s);
  assert.match(offersPage, /function sortPickCards/);
  assert.match(offersPage, /setActiveOfferTab\('outgoing'\)/);
  assert.match(offersPage, /initialOfferTab/);
  assert.match(offersPage, /Decline this trade\?/);
  assert.match(offersPage, /view=collector&username=/);
});

test('wishlist empty state can open the All Cards tab', async () => {
  const listsPage = await read('docs/js/pages/trade-lists-page.js');
  assert.match(listsPage, /data-open-tab="all"/);
  assert.match(listsPage, /dataset\.openTab/);
});

test('trade recipient typeahead searches username display name and exact email', async () => {
  const [migration, service, offersPage] = await Promise.all([
    read('supabase/migrations/20260722030000_search_trade_collectors.sql'),
    read('docs/js/trade-offer-service.js'),
    read('docs/js/pages/trade-offers-page.js')
  ]);
  assert.match(migration, /create or replace function public\.search_trade_collectors/i);
  assert.match(migration, /from auth\.users u/);
  assert.match(migration, /matchedByEmail/);
  assert.doesNotMatch(migration, /'email',\s*u\.email/);
  assert.match(migration, /grant execute on function public\.search_trade_collectors\(text, integer\) to authenticated, service_role/);
  assert.match(migration, /revoke all on function public\.search_trade_collectors\(text, integer\) from public, anon/);
  assert.match(service, /export async function searchTradeCollectors/);
  assert.match(offersPage, /scheduleCollectorSearch/);
  assert.match(offersPage, /searchTradeCollectors/);
  assert.match(offersPage, /data-action="change-recipient"/);
});
