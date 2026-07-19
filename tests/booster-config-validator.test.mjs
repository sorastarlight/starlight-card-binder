import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  selectRarity,
  selectWeighted,
  validateBoosterCatalog
} from '../docs/js/booster-config-validator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = async name => JSON.parse(await readFile(path.join(here, 'fixtures', name), 'utf8'));

test('valid and boundary booster fixtures pass', async () => {
  assert.equal(validateBoosterCatalog(await fixture('booster-config-valid.json')).valid, true);
  assert.equal(validateBoosterCatalog(await fixture('booster-config-boundary.json')).valid, true);
});

test('invalid fixture reports identifiers, odds, ranges, and empty pools', async () => {
  const result = validateBoosterCatalog(await fixture('booster-config-invalid.json'));
  const codes = new Set(result.errors.map(error => error.code));
  assert.equal(result.valid, false);
  for (const code of [
    'card.id.duplicate',
    'card.rarity.invalid',
    'card.weight.range',
    'booster.id.duplicate',
    'booster.name.required',
    'booster.card_count.range',
    'slot.quantity.range',
    'slot.rarity.invalid',
    'slot.odds.total',
    'booster.rewards.empty'
  ]) assert.ok(codes.has(code), `expected ${code}`);
});

test('rarity selection has deterministic boundaries', () => {
  const rates = { Rare: 80, Epic: 18, Legendary: 2 };
  assert.equal(selectRarity(rates, () => 0), 'Rare');
  assert.equal(selectRarity(rates, () => 0.799999), 'Rare');
  assert.equal(selectRarity(rates, () => 0.8), 'Epic');
  assert.equal(selectRarity(rates, () => 0.98), 'Legendary');
  assert.equal(selectRarity({}, () => 0.5), null);
});

test('weighted selection ignores negative weights and handles final boundary', () => {
  const items = [{ id: 'zero', weight: -1 }, { id: 'a', weight: 1 }, { id: 'b', weight: 3 }];
  assert.equal(selectWeighted(items, item => item.weight, () => 0).id, 'a');
  assert.equal(selectWeighted(items, item => item.weight, () => 0.25).id, 'b');
  assert.equal(selectWeighted(items, item => item.weight, () => 1).id, 'b');
  assert.equal(selectWeighted([], item => item.weight, () => 0), null);
});
