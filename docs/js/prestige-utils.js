/** Card Fusion levels (stored prestige_tier). Fusion spends duplicate extras. */

export const FUSION_TIERS = Object.freeze([
  'standard',
  'rookie',
  'champion',
  'ultimate',
  'mega'
]);

/** Cost in extras (quantity − 1) to evolve FROM each tier to the next. */
export const FUSION_COSTS = Object.freeze({
  standard: 10,
  rookie: 25,
  champion: 75,
  ultimate: 200
});

export const FUSION_LABELS = Object.freeze({
  standard: 'Standard',
  rookie: 'Rookie',
  champion: 'Champion',
  ultimate: 'Ultimate',
  mega: 'Mega'
});

export function normalizeFusionTier(tier) {
  const key = String(tier || 'standard').trim().toLowerCase();
  return FUSION_TIERS.includes(key) ? key : 'standard';
}

export function prestigeLabel(tier) {
  return FUSION_LABELS[normalizeFusionTier(tier)] || 'Standard';
}

export function nextFusionTier(tier) {
  const current = normalizeFusionTier(tier);
  const index = FUSION_TIERS.indexOf(current);
  if (index < 0 || index >= FUSION_TIERS.length - 1) return null;
  return FUSION_TIERS[index + 1];
}

export function fusionCostForNextTier(tier) {
  const current = normalizeFusionTier(tier);
  const cost = FUSION_COSTS[current];
  return Number.isFinite(cost) ? cost : null;
}

/** Extras available for fusion / trade / exchange (always keep 1). */
export function fusionExtras(quantity) {
  return Math.max(0, Math.floor(Number(quantity) || 0) - 1);
}

export function canFuse(quantity, tier) {
  const cost = fusionCostForNextTier(tier);
  if (cost == null) return false;
  return fusionExtras(quantity) >= cost;
}

/** @deprecated Quantity no longer determines fusion level. Prefer stored tier. */
export function prestigeTierFromQuantity() {
  return 'standard';
}

/** Returns CSS class string for non-standard fusion frames. */
export function prestigeClassName(tierOrQuantity) {
  const tier = typeof tierOrQuantity === 'string'
    ? normalizeFusionTier(tierOrQuantity)
    : 'standard';
  if (!tier || tier === 'standard') return '';
  return `prestige-frame prestige-${tier}`;
}

// Aliases matching plan / RPC naming
export const nextTier = nextFusionTier;
export const fusionCostForNext = fusionCostForNextTier;
