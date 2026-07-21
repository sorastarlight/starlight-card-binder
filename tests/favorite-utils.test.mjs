import assert from 'node:assert/strict';
import test from 'node:test';

import {
  countFavorites,
  resolveFullViewAfterFavoriteChange,
  toggleFavoriteInStore
} from '../docs/js/favorite-utils.js';

test('toggleFavoriteInStore adds and removes a favorite', () => {
  const added = toggleFavoriteInStore({}, 'card-1');
  assert.equal(added.isFavorite, true);
  assert.equal(added.store['card-1'], true);

  const removed = toggleFavoriteInStore(added.store, 'card-1');
  assert.equal(removed.isFavorite, false);
  assert.equal(removed.store['card-1'], undefined);
  assert.equal(countFavorites(removed.store), 0);
});

test('resolveFullViewAfterFavoriteChange keeps list when favoriting', () => {
  const list = [{ id: 'a' }, { id: 'b' }];
  const result = resolveFullViewAfterFavoriteChange({
    list,
    selectedId: 'a',
    cardId: 'a',
    isFavorite: true,
    listMode: 'favorites'
  });
  assert.equal(result.shouldClose, false);
  assert.equal(result.list.length, 2);
  assert.equal(result.selectedId, 'a');
});

test('resolveFullViewAfterFavoriteChange prunes and advances on unfavorite', () => {
  const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
  const result = resolveFullViewAfterFavoriteChange({
    list,
    selectedId: 'b',
    cardId: 'b',
    isFavorite: false,
    listMode: 'favorites'
  });
  assert.equal(result.shouldClose, false);
  assert.deepEqual(result.list.map(card => card.id), ['a', 'c']);
  assert.equal(result.selectedId, 'c');
});

test('resolveFullViewAfterFavoriteChange closes when last favorite is removed', () => {
  const result = resolveFullViewAfterFavoriteChange({
    list: [{ id: 'solo' }],
    selectedId: 'solo',
    cardId: 'solo',
    isFavorite: false,
    listMode: 'favorites'
  });
  assert.equal(result.shouldClose, true);
  assert.deepEqual(result.list, []);
  assert.equal(result.selectedId, null);
});
