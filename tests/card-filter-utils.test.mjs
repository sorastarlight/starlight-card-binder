import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCardSearchHaystack,
  filterCardList,
  resolveBinderBrowseList
} from '../docs/js/card-filter-utils.js';

const catalog = [
  {
    id: 'a1',
    number: '001',
    collectorNumber: 'RS-001',
    name: 'Rising Spark',
    series: 'Rising Star',
    rarity: 'Common',
    cardDescription: 'A bright start',
    artist: 'Sora'
  },
  {
    id: 'b2',
    number: '002',
    collectorNumber: 'S2-014',
    name: 'Moonlit Stage',
    series: 'Series II',
    rarity: 'Rare',
    cardDescription: 'Night performance',
    artist: 'Luna'
  },
  {
    id: 'c3',
    number: '003',
    collectorNumber: 'RS-003',
    name: 'Star Bit Glow',
    series: 'Rising Star',
    rarity: 'Epic',
    cardDescription: 'Currency sparkle',
    artist: 'Sora'
  }
];

test('buildCardSearchHaystack includes collector numbers', () => {
  const haystack = buildCardSearchHaystack(catalog[1]);
  assert.match(haystack, /s2-014/);
  assert.match(haystack, /moonlit stage/);
});

test('filterCardList matches collector number queries', () => {
  const list = filterCardList(catalog, { q: 'rs-003', series: 'All Series', rarity: 'All Rarities', view: 'all' }, {
    respectOwnership: false
  });
  assert.equal(list.length, 1);
  assert.equal(list[0].id, 'c3');
});

test('resolveBinderBrowseList shows landing for All Series without query', () => {
  const browse = resolveBinderBrowseList(catalog, {
    q: '',
    series: 'All Series',
    rarity: 'All Rarities',
    view: 'all'
  });
  assert.equal(browse.showLanding, true);
  assert.deepEqual(browse.list, []);
  assert.equal(browse.poolSize, 3);
});

test('resolveBinderBrowseList searches the full catalog when All Series + query', () => {
  const browse = resolveBinderBrowseList(catalog, {
    q: 'moon',
    series: 'All Series',
    rarity: 'All Rarities',
    view: 'all'
  });
  assert.equal(browse.showLanding, false);
  assert.equal(browse.heading, 'Search results');
  assert.equal(browse.list.length, 1);
  assert.equal(browse.list[0].id, 'b2');
  assert.match(browse.summary, /1 of 3/);
});

test('resolveBinderBrowseList keeps series-scoped search when a series is selected', () => {
  const browse = resolveBinderBrowseList(catalog, {
    q: 'star',
    series: 'Rising Star',
    rarity: 'All Rarities',
    view: 'all'
  });
  assert.equal(browse.showLanding, false);
  assert.equal(browse.heading, 'Rising Star');
  assert.equal(browse.list.length, 2);
  assert.ok(browse.list.every(card => card.series === 'Rising Star'));
});
