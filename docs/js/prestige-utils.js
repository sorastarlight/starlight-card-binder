/** Starlight Evolution tiers (stored prestige_tier). Evolution spends duplicate extras. */

export const EVOLUTION_TIERS = Object.freeze([
  'stardust',
  'star_bit',
  'protostar',
  'starlight',
  'super_starlight',
  'starlight_burst'
]);

/** @deprecated Prefer EVOLUTION_TIERS */
export const FUSION_TIERS = EVOLUTION_TIERS;

/** Cost in extras (quantity − 1) to evolve FROM each tier to the next. */
export const EVOLUTION_COSTS = Object.freeze({
  stardust: 8,
  star_bit: 20,
  protostar: 45,
  starlight: 100,
  super_starlight: 220
});

/** @deprecated Prefer EVOLUTION_COSTS */
export const FUSION_COSTS = EVOLUTION_COSTS;

export const EVOLUTION_LABELS = Object.freeze({
  stardust: '☆ Stardust',
  star_bit: '★ Star Bit',
  protostar: '★★ Protostar',
  starlight: '★★★ Starlight',
  super_starlight: '★★★★ Super Starlight',
  starlight_burst: '★★★★★ Starlight Burst'
});

/** @deprecated Prefer EVOLUTION_LABELS */
export const FUSION_LABELS = EVOLUTION_LABELS;

const LEGACY_TIER_MAP = Object.freeze({
  standard: 'stardust',
  rookie: 'stardust',
  champion: 'stardust',
  ultimate: 'stardust',
  mega: 'stardust'
});

export function normalizeEvolutionTier(tier) {
  const key = String(tier || 'stardust').trim().toLowerCase();
  if (EVOLUTION_TIERS.includes(key)) return key;
  if (LEGACY_TIER_MAP[key]) return LEGACY_TIER_MAP[key];
  return 'stardust';
}

/** @deprecated Prefer normalizeEvolutionTier */
export function normalizeFusionTier(tier) {
  return normalizeEvolutionTier(tier);
}

export function prestigeLabel(tier) {
  return EVOLUTION_LABELS[normalizeEvolutionTier(tier)] || EVOLUTION_LABELS.stardust;
}

export function nextEvolutionTier(tier) {
  const current = normalizeEvolutionTier(tier);
  const index = EVOLUTION_TIERS.indexOf(current);
  if (index < 0 || index >= EVOLUTION_TIERS.length - 1) return null;
  return EVOLUTION_TIERS[index + 1];
}

/** @deprecated Prefer nextEvolutionTier */
export function nextFusionTier(tier) {
  return nextEvolutionTier(tier);
}

export function previousEvolutionTier(tier) {
  const current = normalizeEvolutionTier(tier);
  const index = EVOLUTION_TIERS.indexOf(current);
  if (index <= 0) return null;
  return EVOLUTION_TIERS[index - 1];
}

export function evolutionCostForNextTier(tier) {
  const current = normalizeEvolutionTier(tier);
  const cost = EVOLUTION_COSTS[current];
  return Number.isFinite(cost) ? cost : null;
}

/** @deprecated Prefer evolutionCostForNextTier */
export function fusionCostForNextTier(tier) {
  return evolutionCostForNextTier(tier);
}

/** Cost spent to reach the current tier from the previous step. */
export function evolutionCostForCurrentStep(tier) {
  const prev = previousEvolutionTier(tier);
  if (!prev) return null;
  return evolutionCostForNextTier(prev);
}

/** Floor(half) refund when unfusing one step. */
export function evolutionUnfuseRefund(tier) {
  const stepCost = evolutionCostForCurrentStep(tier);
  if (stepCost == null) return null;
  return Math.floor(stepCost / 2);
}

/** Extras available for evolution / trade / exchange (always keep 1). */
export function evolutionExtras(quantity) {
  return Math.max(0, Math.floor(Number(quantity) || 0) - 1);
}

/** @deprecated Prefer evolutionExtras */
export function fusionExtras(quantity) {
  return evolutionExtras(quantity);
}

export function canEvolve(quantity, tier) {
  const cost = evolutionCostForNextTier(tier);
  if (cost == null) return false;
  return evolutionExtras(quantity) >= cost;
}

/** @deprecated Prefer canEvolve */
export function canFuse(quantity, tier) {
  return canEvolve(quantity, tier);
}

export function canUnfuse(tier) {
  return previousEvolutionTier(tier) != null;
}

/** @deprecated Quantity no longer determines evolution level. Prefer stored tier. */
export function prestigeTierFromQuantity() {
  return 'stardust';
}

function tierCssToken(tier) {
  return normalizeEvolutionTier(tier).replace(/_/g, '-');
}

/** Returns CSS class string for non-base evolution frames. */
export function prestigeClassName(tierOrQuantity) {
  const tier = typeof tierOrQuantity === 'string'
    ? normalizeEvolutionTier(tierOrQuantity)
    : 'stardust';
  if (!tier || tier === 'stardust') return '';
  const token = tierCssToken(tier);
  return `prestige-frame prestige-${token}`;
}

// Aliases matching plan / RPC naming
export const nextTier = nextEvolutionTier;
export const fusionCostForNext = evolutionCostForNextTier;
export const evolutionCostForNext = evolutionCostForNextTier;
