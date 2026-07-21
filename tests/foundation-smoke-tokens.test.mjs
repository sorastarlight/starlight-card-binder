import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('V1.0 smoke-test matrix covers the critical foundation journeys', async () => {
  const matrix = await read('docs/V1_0_SMOKE_TEST_MATRIX.md');
  for (const journey of [
    'Sign in and sign out',
    'Navigate through the application shell',
    'Browse binder and collection views',
    'Open a Daily Booster',
    'Purchase and open a Shop pack',
    'Redeem and reveal a reward',
    'Claim and reveal a Received Gift or Twitch reward',
    'migrated modal',
    'Staff/admin pages',
    'Chromium',
    'Firefox',
    'Opera GX',
    'Reduced motion'
  ]) {
    assert.match(matrix, new RegExp(journey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
  }
  assert.match(matrix, /Desktop/i);
  assert.match(matrix, /Mobile/i);
});

test('shell and shop/star-bits page tokens alias shared --st-* design tokens', async () => {
  const [shell, shop, bits] = await Promise.all([
    read('docs/css/app-shell.css'),
    read('docs/css/pages/booster-shop.css'),
    read('docs/css/pages/star-bits.css')
  ]);
  assert.match(shell, /--shell-blue:var\(--st-color-blue/);
  assert.match(shop, /--shop-pink:var\(--st-color-pink/);
  assert.match(bits, /--bits-gold: var\(--st-color-gold/);
});
