import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  createRevealStackLayout,
  normalizeRevealCard,
  normalizeRevealOptions,
  revealSfxForRarity,
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

test('maps each reveal rarity to its dedicated sound tier', () => {
  assert.equal(revealSfxForRarity('LEGENDARY'), 'legendary');
  assert.equal(revealSfxForRarity('epic'), 'epic');
  assert.equal(revealSfxForRarity('not-a-rarity'), 'common');
});

test('uses one deliberate pack, pile, and card motion system with reduced-motion support', async () => {
  const [script, stylesheet] = await Promise.all([
    readFile(new URL('../docs/js/reward-reveal.js', import.meta.url), 'utf8'),
    readFile(new URL('../docs/css/reward-reveal.css', import.meta.url), 'utf8')
  ]);

  assert.doesNotMatch(script, /\bsetTimeout\b|\bsr931\b/);
  assert.match(script, /new win\.Audio\(source\)/);
  assert.match(script, /booster-open\.wav/);
  assert.match(script, /legendary-reveal\.wav/);
  assert.match(script, /sora-starlight-card-binder-v7-sfx/);
  assert.match(stylesheet, /@keyframes stR3PackTop/);
  assert.match(stylesheet, /@keyframes stR3PackBottom/);
  assert.match(stylesheet, /@keyframes stR3CardRise/);
  assert.match(stylesheet, /@keyframes stR3CardSpin/);
  assert.match(stylesheet, /@keyframes stR3LegendaryRise/);
  assert.match(stylesheet, /@keyframes stR3LegendarySpin/);
  assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/);
});

test('keeps the fixed-center reveal lightweight and progressively loads artwork', async () => {
  const [script, stylesheet] = await Promise.all([
    readFile(new URL('../docs/js/reward-reveal.js', import.meta.url), 'utf8'),
    readFile(new URL('../docs/css/reward-reveal.css', import.meta.url), 'utf8')
  ]);

  assert.match(script, /\{ defer: true \}/);
  assert.match(script, /createDocumentFragment\(\)/);
  assert.match(script, /prepareCurrentCard\(\)/);
  assert.match(script, /const visibleLayers = Math\.min\(remaining, MAX_PILE_LAYERS\)/);
  assert.match(script, /setPhase\('returning'\)/);
  assert.match(script, /computedMotionDuration\(element, win\)/);
  assert.match(script, /waitForFrames\(win, computedMotionDuration/);
  assert.match(stylesheet, /\.st-r3-overlay[\s\S]*position: fixed !important;/);
  assert.match(stylesheet, /\.st-r3-card-actor[\s\S]*top: 50%;[\s\S]*left: 50%;/);
  assert.match(stylesheet, /\.st-r3-pile-button[\s\S]*top: 50%;[\s\S]*left: 50%;/);
  assert.doesNotMatch(stylesheet, /backdrop-filter\s*:/);
  assert.doesNotMatch(stylesheet, /stReveal|st-r3-backdrop-image|filter:\s*blur|drop-shadow\(/);
  assert.match(stylesheet, /will-change: transform, opacity/);
  assert.match(stylesheet, /\/\* Pile: static between clicks/);
});

test('keeps every production reward entry point on the canonical reveal engine', async () => {
  const consumers = await Promise.all([
    'daily-booster-page.js',
    'booster-shop-page.js',
    'received-rewards-page.js',
    'redeem-page.js'
  ].map(file => readFile(new URL(`../docs/js/pages/${file}`, import.meta.url), 'utf8')));

  consumers.forEach(source => {
    assert.match(source, /reward-reveal\.js\?v=1\.3\.1/);
    assert.match(source, /revealRewardSequence\s*\(/);
    assert.doesNotMatch(source, /@keyframes|stR3CardSpin|stR3PackTop/);
  });
});

test('restores focus to the control that launched an embedded reveal', async () => {
  const script = await readFile(new URL('../docs/js/reward-reveal.js', import.meta.url), 'utf8');

  assert.match(script, /const returnFocus = sourceDocument\.activeElement/);
  assert.match(script, /returnFocus\?\.isConnected/);
  assert.match(script, /restoreFocus: false/);
});
