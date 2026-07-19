import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeRevealCard,
  normalizeRevealOptions
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
