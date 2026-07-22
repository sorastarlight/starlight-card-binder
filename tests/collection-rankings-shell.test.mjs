import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('collection cards open the shared full-view modal on click', async () => {
  const app = await read('docs/js/app.js');
  assert.match(app, /data-open-collection-card/);
  assert.match(app, /openFullView\(mode\)/);
  assert.match(app, /listMode === 'collection'/);
  assert.match(app, /listMode === 'duplicates'/);
});

test('user rankings actions are ordered profile, wishlist, trade', async () => {
  const page = await read('docs/js/pages/user-rankings-page.js');
  const block = page.match(/class="rankings-actions">([\s\S]*?)<\/div>\s*<div class="rankings-wishlist"/);
  assert.ok(block, 'rankings-actions block present');
  const html = block[1];
  const profile = html.indexOf('viewProfileCta');
  const wishlist = html.indexOf('wishlistCta');
  const trade = html.indexOf('proposeTradeCta');
  assert.ok(profile >= 0 && wishlist >= 0 && trade >= 0);
  assert.ok(profile < wishlist, 'View profile comes before wishlist');
  assert.ok(wishlist < trade, 'Wishlist comes before propose trade');
});

test('shell iframe navigation avoids history-pushing src assignment', async () => {
  const shell = await read('docs/js/app-shell.js');
  assert.match(shell, /function setFrameLocation/);
  assert.match(shell, /location\.replace/);
  assert.match(shell, /setFrameLocation\(absolute\)/);
  assert.match(shell, /setFrameLocation\('about:blank'\)/);
  assert.doesNotMatch(shell, /if\(frame\)frame\.src='about:blank'/);
});
