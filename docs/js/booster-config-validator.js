export const BOOSTER_RARITIES = Object.freeze([
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary'
]);

export const BOOSTER_REWARD_MODES = Object.freeze([
  'slots',
  'series',
  'exact',
  'weighted_pool',
  'single',
  'mixed'
]);

const MODE_ALIASES = Object.freeze({
  rarity_slots: 'slots',
  exact_cards: 'exact',
  single_card: 'single'
});

const asArray = value => Array.isArray(value) ? value : [];
const asText = value => String(value ?? '').trim();
const asNumber = value => Number(value);
const read = (value, camel, snake = camel) => value?.[camel] ?? value?.[snake];
const modeOf = booster => MODE_ALIASES[asText(read(booster, 'rewardMode', 'reward_mode'))] || asText(read(booster, 'rewardMode', 'reward_mode')) || 'slots';
const cardIdOf = value => asText(read(value, 'cardId', 'card_id') ?? value?.id);
const rarityOf = value => {
  const raw = asText(value);
  return BOOSTER_RARITIES.find(rarity => rarity.toLowerCase() === raw.toLowerCase()) || raw;
};

function ratesOf(slot) {
  if (slot?.rates && typeof slot.rates === 'object' && !Array.isArray(slot.rates)) return slot.rates;
  const rows = asArray(slot?.booster_slot_rates ?? slot?.rates);
  return Object.fromEntries(rows.map(row => [rarityOf(row.rarity), row.percentage]));
}

function rewardsOf(booster) {
  return asArray(
    booster?.rewardCards ?? booster?.reward_cards ?? booster?.rewards ??
    booster?.exactCards ?? booster?.exact_cards
  );
}

function eligibleCards(cards, booster, rarity = '') {
  const seriesId = asText(read(booster, 'seriesId', 'series_id'));
  const categories = new Set(asArray(read(booster, 'categoryIds', 'category_ids')).map(asText));
  const finishes = new Set(asArray(read(booster, 'finishIds', 'finish_ids')).map(asText));
  const excludePromos = read(booster, 'excludePromos', 'exclude_promos') !== false;

  return cards.filter(card => {
    if (read(card, 'isPullable', 'is_pullable') === false) return false;
    if (excludePromos && Boolean(read(card, 'isPromo', 'is_promo'))) return false;
    if (seriesId && asText(read(card, 'seriesId', 'series_id')) !== seriesId) return false;
    if (rarity && rarityOf(card.rarity) !== rarity) return false;
    if (categories.size && !categories.has(asText(read(card, 'categoryId', 'category_id')))) return false;
    if (finishes.size && !finishes.has(asText(read(card, 'finishId', 'finish_id')))) return false;
    return true;
  });
}

function issue(code, path, message) {
  return { code, path, message };
}

export function validateBooster(booster, { cards = [], tolerance = 0.001 } = {}) {
  const errors = [];
  const warnings = [];
  const id = asText(booster?.id);
  const label = id || '(unnamed booster)';
  const mode = modeOf(booster);
  const active = Boolean(read(booster, 'isActive', 'is_active'));
  const cardCount = asNumber(read(booster, 'cardCount', 'card_count') ?? 1);
  const slots = asArray(booster?.slots);
  const rewards = rewardsOf(booster);

  if (!id) errors.push(issue('booster.id.required', 'id', 'Booster ID is required.'));
  if (!asText(booster?.name)) errors.push(issue('booster.name.required', 'name', `${label} requires a name.`));
  if (!BOOSTER_REWARD_MODES.includes(mode)) {
    errors.push(issue('booster.mode.invalid', 'rewardMode', `${label} uses unknown reward mode “${mode}”.`));
  }
  if (!Number.isInteger(cardCount) || cardCount < 1 || cardCount > 50) {
    errors.push(issue('booster.card_count.range', 'cardCount', `${label} card count must be an integer from 1 to 50.`));
  }

  for (const [field, snake] of [['bonusStarBits', 'bonus_star_bits'], ['starBitsCost', 'star_bits_cost']]) {
    const value = asNumber(read(booster, field, snake) ?? 0);
    if (!Number.isFinite(value) || value < 0) {
      errors.push(issue('booster.number.nonnegative', field, `${label} ${field} must be a non-negative number.`));
    }
  }

  if (active && mode === 'slots' && !slots.length) {
    errors.push(issue('booster.slots.empty', 'slots', `${label} is active but has no rarity slots.`));
  }
  if (active && ['exact', 'single', 'weighted_pool'].includes(mode) && !rewards.length) {
    errors.push(issue('booster.rewards.empty', 'rewardCards', `${label} is active but has an empty reward pool.`));
  }
  if (mode === 'series' && !asText(read(booster, 'seriesId', 'series_id'))) {
    errors.push(issue('booster.series.required', 'seriesId', `${label} requires a series.`));
  }

  const slotKeys = new Set();
  slots.forEach((slot, slotIndex) => {
    const path = `slots[${slotIndex}]`;
    const slotKey = asText(read(slot, 'slotKey', 'slot_key') ?? slot.id ?? `slot_${slotIndex + 1}`);
    const quantity = asNumber(slot?.quantity);
    const rates = ratesOf(slot);

    if (slotKeys.has(slotKey)) errors.push(issue('slot.id.duplicate', `${path}.slotKey`, `${label} repeats slot key “${slotKey}”.`));
    slotKeys.add(slotKey);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) {
      errors.push(issue('slot.quantity.range', `${path}.quantity`, `${label} ${slotKey} quantity must be an integer from 1 to 20.`));
    }

    let total = 0;
    let positiveRates = 0;
    for (const [rawRarity, rawPercentage] of Object.entries(rates)) {
      const rarity = rarityOf(rawRarity);
      const percentage = asNumber(rawPercentage);
      if (!BOOSTER_RARITIES.includes(rarity)) {
        errors.push(issue('slot.rarity.invalid', `${path}.rates.${rawRarity}`, `${label} ${slotKey} uses unknown rarity “${rawRarity}”.`));
        continue;
      }
      if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
        errors.push(issue('slot.percentage.range', `${path}.rates.${rarity}`, `${label} ${slotKey} ${rarity} odds must be from 0 to 100.`));
        continue;
      }
      total += percentage;
      if (percentage > 0) {
        positiveRates += 1;
        if (cards.length && !eligibleCards(cards, booster, rarity).length) {
          errors.push(issue('slot.pool.empty', `${path}.rates.${rarity}`, `${label} ${slotKey} assigns ${percentage}% to ${rarity}, but no eligible cards exist.`));
        }
      }
    }
    if (!positiveRates) errors.push(issue('slot.odds.empty', `${path}.rates`, `${label} ${slotKey} has no positive rarity odds.`));
    if (Math.abs(total - 100) > tolerance) {
      errors.push(issue('slot.odds.total', `${path}.rates`, `${label} ${slotKey} odds total ${total}%; expected 100%.`));
    }
  });

  const cardIds = new Set(cards.map(cardIdOf).filter(Boolean));
  const rewardIds = new Set();
  rewards.forEach((reward, rewardIndex) => {
    const path = `rewardCards[${rewardIndex}]`;
    const cardId = cardIdOf(reward);
    const quantity = asNumber(reward?.quantity ?? 1);
    const weight = asNumber(reward?.weight ?? 1);
    if (!cardId) errors.push(issue('reward.card.required', `${path}.cardId`, `${label} has a reward without a card ID.`));
    if (cardId && rewardIds.has(cardId)) warnings.push(issue('reward.card.duplicate', `${path}.cardId`, `${label} repeats card “${cardId}” in its reward pool.`));
    rewardIds.add(cardId);
    if (cardIds.size && cardId && !cardIds.has(cardId)) errors.push(issue('reward.card.missing', `${path}.cardId`, `${label} references missing card “${cardId}”.`));
    if (!Number.isInteger(quantity) || quantity < 1) errors.push(issue('reward.quantity.range', `${path}.quantity`, `${label} reward quantity must be a positive integer.`));
    if (!Number.isFinite(weight) || weight < 0) errors.push(issue('reward.weight.range', `${path}.weight`, `${label} reward weight must be non-negative.`));
  });
  if (mode === 'weighted_pool' && rewards.length && !rewards.some(reward => asNumber(reward?.weight ?? 1) > 0)) {
    errors.push(issue('reward.weight.empty', 'rewardCards', `${label} weighted pool has no positive weights.`));
  }
  if (cards.length && mode === 'series' && !eligibleCards(cards, booster).length) {
    errors.push(issue('booster.series.empty', 'seriesId', `${label} has no eligible cards in its configured series.`));
  }

  if (!asText(read(booster, 'packImageUrl', 'pack_image_url'))) warnings.push(issue('booster.art.pack', 'packImageUrl', `${label} has no pack artwork.`));
  if (!asText(read(booster, 'cardBackUrl', 'card_back_url'))) warnings.push(issue('booster.art.back', 'cardBackUrl', `${label} has no card-back artwork.`));

  return { valid: errors.length === 0, errors, warnings };
}

export function validateBoosterCatalog(config = {}, options = {}) {
  const boosters = asArray(config.boosters ?? config.boosterTypes ?? config.booster_types);
  const cards = asArray(config.cards);
  const errors = [];
  const warnings = [];
  const boosterIds = new Set();
  const cardIds = new Set();

  cards.forEach((card, index) => {
    const id = cardIdOf(card);
    if (!id) errors.push(issue('card.id.required', `cards[${index}].id`, 'Every card requires an ID.'));
    if (id && cardIds.has(id)) errors.push(issue('card.id.duplicate', `cards[${index}].id`, `Duplicate card ID “${id}”.`));
    cardIds.add(id);
    if (!BOOSTER_RARITIES.includes(rarityOf(card.rarity))) {
      errors.push(issue('card.rarity.invalid', `cards[${index}].rarity`, `Card ${id || index + 1} has unknown rarity “${card.rarity}”.`));
    }
    const weight = asNumber(read(card, 'pullWeight', 'pull_weight') ?? 1);
    if (!Number.isFinite(weight) || weight < 0) errors.push(issue('card.weight.range', `cards[${index}].pullWeight`, `Card ${id || index + 1} has an invalid pull weight.`));
  });

  boosters.forEach((booster, index) => {
    const id = asText(booster?.id);
    if (id && boosterIds.has(id)) errors.push(issue('booster.id.duplicate', `boosters[${index}].id`, `Duplicate booster ID “${id}”.`));
    boosterIds.add(id);
    const result = validateBooster(booster, { ...options, cards });
    errors.push(...result.errors.map(item => ({ ...item, path: `boosters[${index}].${item.path}` })));
    warnings.push(...result.warnings.map(item => ({ ...item, path: `boosters[${index}].${item.path}` })));
  });

  return { valid: errors.length === 0, errors, warnings, summary: { boosters: boosters.length, cards: cards.length } };
}

export function selectWeighted(items, getWeight = item => item?.weight ?? 1, random = Math.random) {
  const weighted = asArray(items).map(item => ({ item, weight: Math.max(0, asNumber(getWeight(item)) || 0) }));
  const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  if (!weighted.length || total <= 0) return null;
  const roll = Math.min(Math.max(asNumber(random()), 0), 1 - Number.EPSILON) * total;
  let cursor = 0;
  for (const entry of weighted) {
    cursor += entry.weight;
    if (roll < cursor) return entry.item;
  }
  return weighted[weighted.length - 1].item;
}

export function selectRarity(rates, random = Math.random) {
  const entries = Object.entries(rates ?? {})
    .map(([rarity, percentage]) => ({ rarity: rarityOf(rarity), percentage: Math.max(0, asNumber(percentage) || 0) }))
    .filter(entry => BOOSTER_RARITIES.includes(entry.rarity) && entry.percentage > 0);
  return selectWeighted(entries, entry => entry.percentage, random)?.rarity ?? null;
}
