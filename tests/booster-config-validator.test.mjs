import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  formatBoosterValidationLines,
  selectRarity,
  selectWeighted,
  validateBooster,
  validateBoosterCatalog
} from '../docs/js/booster-config-validator.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
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

test('empty eligible pools fail validation for active boosters', async () => {
  const result = validateBoosterCatalog(await fixture('booster-config-empty-pool.json'));
  const codes = new Set(result.errors.map(error => error.code));
  assert.equal(result.valid, false);
  assert.ok(codes.has('slot.pool.empty'));
  assert.ok(codes.has('booster.series.empty'));
  assert.equal(codes.has('booster.slots.empty'), false);
});

test('validateBooster rejects active slot boosters with no slots', () => {
  const result = validateBooster({
    id: 'daily',
    name: 'Daily Wish',
    rewardMode: 'slots',
    cardCount: 1,
    isActive: true,
    slots: []
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'booster.slots.empty'));
});

test('formatBoosterValidationLines renders errors and warnings', () => {
  const lines = formatBoosterValidationLines({
    errors: [{ path: 'boosters[0].slots[0].rates', message: 'Odds total invalid.' }],
    warnings: [{ path: 'boosters[0].packImageUrl', message: 'Missing artwork.' }]
  });
  assert.deepEqual(lines, [
    'error boosters[0].slots[0].rates: Odds total invalid.',
    'warning boosters[0].packImageUrl: Missing artwork.'
  ]);
});

test('validate-booster-config CLI exits nonzero for invalid fixtures', () => {
  const valid = spawnSync(process.execPath, ['scripts/validate-booster-config.mjs'], {
    cwd: root,
    encoding: 'utf8'
  });
  assert.equal(valid.status, 0, valid.stderr || valid.stdout);

  const invalid = spawnSync(
    process.execPath,
    ['scripts/validate-booster-config.mjs', 'tests/fixtures/booster-config-invalid.json'],
    { cwd: root, encoding: 'utf8' }
  );
  assert.notEqual(invalid.status, 0, 'invalid fixture should fail validation');
  assert.match(invalid.stdout + invalid.stderr, /booster\.rewards\.empty|error /);
});

test('validate-booster-config CLI rejects malformed JSON', () => {
  const malformed = spawnSync(
    process.execPath,
    ['scripts/validate-booster-config.mjs', 'tests/fixtures/booster-config-malformed.json'],
    { cwd: root, encoding: 'utf8' }
  );
  assert.notEqual(malformed.status, 0);
  assert.match(malformed.stderr + malformed.stdout, /Unexpected token|JSON|malformed/i);
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
