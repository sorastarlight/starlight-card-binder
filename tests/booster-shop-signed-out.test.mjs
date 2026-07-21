import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('shop catalog still loads when Star Bits preview fails for signed-out collectors', async () => {
  const page = await read('docs/js/pages/booster-shop-page.js');
  assert.match(page, /if\(boosterError\)throw boosterError;if\(slotError\)throw slotError;/);
  assert.doesNotMatch(page, /if\(previewError\)throw previewError/);
  assert.match(page, /Star Bits preview requires auth; do not block browsing the public pack catalog/);
  assert.match(page, /if\(previewError\)\{[\s\S]*say\(/);
});
