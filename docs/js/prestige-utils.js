/** Quantity-threshold prestige frames (copies are not burned). */

export const PRESTIGE_THRESHOLDS = Object.freeze([
  { tier: 'celestial', min: 500, label: 'Celestial' },
  { tier: 'prismatic', min: 100, label: 'Prismatic' },
  { tier: 'gold', min: 25, label: 'Gold' },
  { tier: 'silver', min: 10, label: 'Silver' },
  { tier: 'standard', min: 0, label: 'Standard' }
]);

export function prestigeTierFromQuantity(quantity) {
  const qty = Math.max(0, Math.floor(Number(quantity) || 0));
  for (const row of PRESTIGE_THRESHOLDS) {
    if (qty >= row.min) return row.tier;
  }
  return 'standard';
}

export function prestigeLabel(tier) {
  const found = PRESTIGE_THRESHOLDS.find((row) => row.tier === tier);
  return found?.label || 'Standard';
}

/** Returns CSS class string for non-standard prestige frames. */
export function prestigeClassName(tierOrQuantity) {
  const tier = typeof tierOrQuantity === 'string'
    ? tierOrQuantity
    : prestigeTierFromQuantity(tierOrQuantity);
  if (!tier || tier === 'standard') return '';
  return `prestige-frame prestige-${tier}`;
}
