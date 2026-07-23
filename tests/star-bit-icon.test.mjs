import assert from 'node:assert/strict';
import test from 'node:test';
import { access } from 'node:fs/promises';
import {
  STAR_BIT_ICON_SRC,
  starBitAmountHtml,
  starBitIconHtml,
  starBitNavIcon
} from '../docs/js/star-bit-icon.js';
import { cloneDefaultShellNavigation } from '../docs/js/shell-navigation-defaults.js';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

test('star bit currency icon asset and helpers exist', async () => {
  const assetPath = STAR_BIT_ICON_SRC.split('?')[0];
  await access(new URL(`../docs/${assetPath}`, import.meta.url));
  assert.match(starBitIconHtml(esc, { size: 'sm' }), /star-bit\.png/);
  assert.match(starBitAmountHtml(esc, 1200, { suffix: 'Star Bits' }), /1,200|1200/);
  assert.equal(starBitNavIcon().url, STAR_BIT_ICON_SRC);
});

test('shell and shop surfaces wire the Star Bit image icon', async () => {
  const nav = cloneDefaultShellNavigation();
  const starBitsItem = nav.sidebar.sections
    .flatMap((section) => section.items || [])
    .find((item) => item.id === 'star-bits');
  assert.equal(starBitsItem?.icon?.type, 'image');
  assert.match(starBitsItem?.icon?.url || '', /star-bit\.png/);

  const [binder, shop, bits, collection, checklist, shopPage, bitsCss, sharedCss] = await Promise.all([
    read('docs/binder.html'),
    read('docs/booster-shop.html'),
    read('docs/star-bits.html'),
    read('docs/collection.html'),
    read('docs/checklist.html'),
    read('docs/js/pages/booster-shop-page.js'),
    read('docs/css/pages/star-bits.css'),
    read('docs/css/shared-ui.css')
  ]);
  assert.match(binder, /data-star-bits[\s\S]*star-bit\.png|star-bit\.png[\s\S]*data-star-bits/);
  assert.match(binder, /My Star Bits[\s\S]*star-bit\.png|star-bit\.png[\s\S]*My Star Bits/);
  assert.match(shop, /star-bit\.png/);
  assert.match(bits, /star-bit\.png/);
  assert.match(bitsCss, /\.duplicate-card\s*>\s*img/);
  assert.match(bitsCss, /\.duplicate-card\s+\.star-bit-icon/);
  assert.match(sharedCss, /\.star-bit-icon--xs\{[^}]*!important/);
  assert.match(collection, /star-bit\.png/);
  assert.match(checklist, /star-bit\.png/);
  assert.match(shopPage, /starBitIconHtml|starBitAmountHtml/);
});

test('season pass and quests insert Star Bit HTML without escaping it', async () => {
  const [seasonPass, quests, received] = await Promise.all([
    read('docs/js/pages/season-pass-page.js'),
    read('docs/js/pages/collection-quests-page.js'),
    read('docs/js/pages/received-rewards-page.js')
  ]);

  assert.match(seasonPass, /starBitAmountHtml\(esc,\s*tier\.rewardStarBits/);
  assert.match(seasonPass, /\$\{rewardLine\(tier\)\}/);
  assert.doesNotMatch(seasonPass, /esc\(rewardLine\(/);

  assert.match(quests, /starBitAmountHtml\(esc,\s*quest\.rewardStarBits/);
  assert.match(quests, /\$\{rewardLine\(quest\)\}/);
  assert.doesNotMatch(quests, /esc\(rewardLine\(/);

  assert.match(received, /starBitAmountHtml\(esc,/);
  assert.match(received, /\$\{labelHtml\(r\)\}/);
  assert.doesNotMatch(received, /\$\{esc\(label\(r\)\)\}/);
});
