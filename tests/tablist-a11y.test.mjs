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
  const [collection, lists, offers, collectionHtml, listsHtml, offersHtml] = await Promise.all([
    read('docs/js/collection-redesign.js'),
    read('docs/js/pages/trade-lists-page.js'),
    read('docs/js/pages/trade-offers-page.js'),
    read('docs/collection.html'),
    read('docs/trade-lists.html'),
    read('docs/trade-offers.html')
  ]);
  assert.match(collection, /bindTablistKeyboard/);
  assert.match(collection, /syncTabSelection/);
  assert.match(lists, /bindTablistKeyboard/);
  assert.match(offers, /bindTablistKeyboard/);
  assert.match(offers, /syncTabSelection/);
  assert.match(collectionHtml, /collection-redesign\.js\?v=1\.3\.0/);
  assert.match(listsHtml, /trade-lists-page\.js\?v=1\.3\.0/);
  assert.match(offersHtml, /trade-offers-page\.js\?v=1\.4\.1/);
});
