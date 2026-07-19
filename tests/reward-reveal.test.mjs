import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createRevealStackLayout,
  normalizeRevealCard,
  normalizeRevealOptions,
  summarizeRevealCards
} from '../docs/js/reward-reveal.js';

test('normalizes snake_case reward cards into the canonical reveal shape', () => {
  const card = normalizeRevealCard({
    card_id: 42,
    card_name: 'Moonlight Sora',
    image_url: '/cards/moonlight.png',
    rarity_name: 'LEGENDARY',
    category_name: 'event_cards',
    subcategory_id: 'summer-2026',
    is_duplicate: 1
  });

  assert.equal(card.id, 42);
  assert.equal(card.name, 'Moonlight Sora');
  assert.equal(card.imageUrl, '/cards/moonlight.png');
  assert.equal(card.rarity, 'legendary');
  assert.equal(card.categoryName, 'Event Cards');
  assert.equal(card.subcategoryName, 'Summer 2026');
  assert.equal(card.isDuplicate, true);
});

test('normalizes reveal option aliases and supplies the canonical card back', () => {
  const snakeCase = normalizeRevealOptions({
    booster_name: 'Daily Booster',
    pack_image_url: '/packs/daily.png',
    card_back_url: '/cards/back.png'
  });

  assert.deepEqual(snakeCase, {
    title: 'Daily Booster',
    packImageUrl: '/packs/daily.png',
    cardBackUrl: '/cards/back.png'
  });

  assert.match(normalizeRevealOptions({}).cardBackUrl, /StarlightCard_Back_NewLogo\.png$/);
});

test('builds one deterministic stack position per awarded card', () => {
  const layout = createRevealStackLayout(12);

  assert.equal(layout.length, 12);
  assert.deepEqual(layout[0], { depth: 0, x: 0, y: 0, rotation: 0, zIndex: 12 });
  assert.equal(layout[7].depth, 7);
  assert.equal(layout[11].depth, 7);
  assert.equal(layout[11].zIndex, 1);
});

test('summarizes new and duplicate cards for the result screen', () => {
  assert.deepEqual(summarizeRevealCards([
    { id: 'new', name: 'New Card' },
    { id: 'duplicate', name: 'Duplicate Card', is_duplicate: true },
    { id: 'new-again', name: 'Another New Card', isDuplicate: false }
  ]), { total: 3, newCards: 2, duplicates: 1 });
});

test('uses deliberate motion states with a reduced-motion fallback', async () => {
  const [script, stylesheet] = await Promise.all([
    readFile(new URL('../docs/js/reward-reveal.js', import.meta.url), 'utf8'),
    readFile(new URL('../docs/css/reward-reveal.css', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(script, /\bsetTimeout\b|\bnew Audio\b|\bsr931\b/);
  assert.match(stylesheet, /@keyframes stRevealPackOpen/);
  assert.match(stylesheet, /@keyframes stRevealCardLift/);
  assert.match(stylesheet, /@keyframes stRevealCardFlip/);
  assert.match(stylesheet, /@keyframes stRevealResultIn/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
});
