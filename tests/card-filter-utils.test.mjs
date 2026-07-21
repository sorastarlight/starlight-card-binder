import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildCardSearchHaystack,
  buildTradeSearchHaystack,
  cardDisplayNumber,
  filterCardList,
  formatBinderOwnedPill,
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

test('filterCardList respects collected / missing ownership views', () => {
  const owned = new Set(['a1', 'c3']);
  const collected = filterCardList(catalog, {
    q: '',
    series: 'All Series',
    rarity: 'All Rarities',
    view: 'collected'
  }, {
    respectOwnership: true,
    isCollected: id => owned.has(id)
  });
  const missing = filterCardList(catalog, {
    q: '',
    series: 'All Series',
    rarity: 'All Rarities',
    view: 'missing'
  }, {
    respectOwnership: true,
    isCollected: id => owned.has(id)
  });
  assert.deepEqual(collected.map(card => card.id), ['a1', 'c3']);
  assert.deepEqual(missing.map(card => card.id), ['b2']);
});

test('cardDisplayNumber prefers collector numbers', () => {
  assert.equal(cardDisplayNumber({ number: '001', collectorNumber: 'RS-001' }), 'RS-001');
  assert.equal(cardDisplayNumber({ number: '002' }), '002');
});

test('formatBinderOwnedPill stays honest for missing view', () => {
  assert.equal(formatBinderOwnedPill({ shown: 5, owned: 0, view: 'missing' }), 'Showing 5 not collected');
  assert.equal(formatBinderOwnedPill({ shown: 12, owned: 8, view: 'all' }), 'Collected: 8 / 12');
  assert.equal(formatBinderOwnedPill({ shown: 4, owned: 4, view: 'collected' }), 'Collected in view: 4');
});

test('buildTradeSearchHaystack includes collector numbers', () => {
  const haystack = buildTradeSearchHaystack({
    cardNumber: '014',
    collectorNumber: 'S2-014',
    name: 'Moonlit Stage',
    rarity: 'Rare',
    seriesName: 'Series II'
  });
  assert.match(haystack, /s2-014/);
  assert.match(haystack, /moonlit stage/);
});
