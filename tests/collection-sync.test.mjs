import assert from 'node:assert/strict';
import test from 'node:test';

import { applyAwardedCardsToLocalStore } from '../docs/js/collection-local-store.js';

const COLLECTION_KEY = 'sora-starlight-card-binder-v5-collected';
const QUANTITIES_KEY = 'sora-starlight-card-binder-v80-quantities';

function mockLocalStorage(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, value);
    }
  };
}

test('applyAwardedCardsToLocalStore writes collected flags and total quantities from API payloads', () => {
  const storage = mockLocalStorage({
    [COLLECTION_KEY]: JSON.stringify({ 's01-001': true }),
    [QUANTITIES_KEY]: JSON.stringify({ 's01-001': 4 })
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage
  });

  const result = applyAwardedCardsToLocalStore([
    { id: 's01-002', quantity: 1 },
    { id: 's01-001', quantity: 7 }
  ]);

  assert.deepEqual(result.updatedCardIds, ['s01-002', 's01-001']);

  const collected = JSON.parse(storage.getItem(COLLECTION_KEY));
  const quantities = JSON.parse(storage.getItem(QUANTITIES_KEY));

  assert.equal(collected['s01-001'], true);
  assert.equal(collected['s01-002'], true);
  assert.equal(quantities['s01-001'], 7);
  assert.equal(quantities['s01-002'], 1);
});

test('applyAwardedCardsToLocalStore increments duplicate slots without quantity fields', () => {
  const storage = mockLocalStorage({
    [COLLECTION_KEY]: JSON.stringify({}),
    [QUANTITIES_KEY]: JSON.stringify({ 's01-003': 2 })
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage
  });

  applyAwardedCardsToLocalStore([
    { card_id: 's01-003' },
    { card_id: 's01-003' },
    { cardId: 's01-004' }
  ]);

  const quantities = JSON.parse(storage.getItem(QUANTITIES_KEY));
  assert.equal(quantities['s01-003'], 4);
  assert.equal(quantities['s01-004'], 1);
});
