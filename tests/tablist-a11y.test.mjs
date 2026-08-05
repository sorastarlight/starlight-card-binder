import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('tablist-a11y helper exposes keyboard and selection sync APIs', async () => {
  const source = await read('docs/js/tablist-a11y.js');
  assert.match(source, /export function bindTablistKeyboard/);
  assert.match(source, /export function syncTabSelection/);
  assert.match(source, /ArrowRight/);
  assert.match(source, /Home/);
  assert.match(source, /aria-controls/);
  assert.match(source, /if \(!panel\.id\)/);
});

test('collection and trade pages import shared tablist keyboard helpers', async () => {
  const [collection, myTrade, offersHub, hub, collectionHtml, listsHtml, offersHtml] = await Promise.all([
    read('docs/js/collection-redesign.js'),
    read('docs/js/pages/my-trade-cards.js'),
    read('docs/js/pages/trade-offers-hub.js'),
    read('docs/js/pages/trade-hub-page.js'),
    read('docs/collection.html'),
    read('docs/trade-lists.html'),
    read('docs/trade-offers.html')
  ]);
  assert.match(collection, /bindTablistKeyboard/);
  assert.match(collection, /syncTabSelection/);
  assert.match(hub, /bindTablistKeyboard/);
  assert.match(offersHub, /bindTablistKeyboard/);
  assert.match(offersHub, /syncTabSelection/);
  assert.match(collectionHtml, /collection-redesign\.js\?v=1\.4\.0/);
  assert.match(listsHtml, /trade-hub-page\.js\?v=1\.3\.1/);
  assert.match(listsHtml, /data-hub-view="open-trades"/);
  assert.match(offersHtml, /trade-lists\.html\?/);
});
