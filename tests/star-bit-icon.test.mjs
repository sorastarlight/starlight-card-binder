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
  await access(new URL(`../docs/${STAR_BIT_ICON_SRC}`, import.meta.url));
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

  const [binder, shop, bits, collection, checklist, shopPage] = await Promise.all([
    read('docs/binder.html'),
    read('docs/booster-shop.html'),
    read('docs/star-bits.html'),
    read('docs/collection.html'),
    read('docs/checklist.html'),
    read('docs/js/pages/booster-shop-page.js')
  ]);
  assert.match(binder, /data-star-bits[\s\S]*star-bit\.png|star-bit\.png[\s\S]*data-star-bits/);
  assert.match(binder, /My Star Bits[\s\S]*star-bit\.png|star-bit\.png[\s\S]*My Star Bits/);
  assert.match(shop, /star-bit\.png/);
  assert.match(bits, /star-bit\.png/);
  assert.match(collection, /star-bit\.png/);
  assert.match(checklist, /star-bit\.png/);
  assert.match(shopPage, /starBitIconHtml|starBitAmountHtml/);
});
