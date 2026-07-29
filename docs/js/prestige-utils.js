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
  stardust: 'Standard',
  star_bit: '⭐ Radiance I',
  protostar: '⭐⭐ Radiance II',
  starlight: '⭐⭐⭐ Radiance III',
  super_starlight: '⭐⭐⭐⭐ Radiance IV',
  starlight_burst: '⭐⭐⭐⭐⭐ Radiance V'
});

/** @deprecated Prefer EVOLUTION_LABELS */
export const FUSION_LABELS = EVOLUTION_LABELS;

/** Bump when Radiance PNG assets change (cache bust). */
export const PRESTIGE_FRAME_ASSET_VERSION = '3.2';

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

/** Transparent PNG frame overlays — Radiance I–V. */
export const PRESTIGE_FRAME_IMAGES = Object.freeze({
  star_bit: 'site_assets/Radiance1.png',
  protostar: 'site_assets/Radiance2.png',
  starlight: 'site_assets/Radiance3.png',
  super_starlight: 'site_assets/Radiance4.png',
  starlight_burst: 'site_assets/Radiance5.png'
});

/** Returns the Radiance PNG path for an evolution tier, or empty string for Standard. */
export function prestigeFrameImageUrl(tier) {
  const path = PRESTIGE_FRAME_IMAGES[normalizeEvolutionTier(tier)] || '';
  return path ? `${path}?v=${PRESTIGE_FRAME_ASSET_VERSION}` : '';
}

/** Overlay markup placed above card art on enhanced/evolved cards. */
export function prestigeFrameOverlayHtml(tier) {
  const src = prestigeFrameImageUrl(tier);
  if (!src) return '';
  return `<img class="prestige-frame-overlay" src="${src}" alt="" aria-hidden="true" draggable="false" loading="lazy">`;
}

/** Official card back used beneath Radiance hero previews. */
export const PRESTIGE_PREVIEW_BACK_URL = 'site_assets/StarlightCard_Back_NewLogo.png';

const PRESTIGE_PARTICLE_COUNTS = Object.freeze({
  star_bit: 14,
  protostar: 18,
  starlight: 22,
  super_starlight: 28,
  starlight_burst: 32
});

function escPrestigeAttr(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

/** Tier particles rendered above art and below the frame overlay. */
export function prestigeParticlesHtml(tier) {
  const normalized = normalizeEvolutionTier(tier);
  if (normalized === 'stardust') return '';
  const token = tierCssToken(normalized);
  const count = PRESTIGE_PARTICLE_COUNTS[normalized] || 10;
  const particles = Array.from({ length: count }, (_, index) => {
    let extra = '';
    if (normalized === 'star_bit' && index % 4 === 0) extra = ' prestige-particle-spark';
    if (normalized === 'protostar') {
      if (index % 5 === 0) extra = ' prestige-particle-streak';
      else if (index % 6 === 2) extra = ' prestige-particle-orb-sm';
    }
    if (normalized === 'starlight') {
      if (index % 3 === 1) extra = ' prestige-particle-petal';
      else if (index % 5 === 0) extra = ' prestige-particle-spark';
    }
    if (normalized === 'super_starlight') {
      if (index % 4 === 0) extra = ' prestige-particle-orb';
      else if (index % 5 === 2) extra = ' prestige-particle-star-sm';
      else if (index % 6 === 1) extra = ' prestige-particle-wisp';
    }
    if (normalized === 'starlight_burst') {
      if (index % 2 === 0) extra = ' prestige-particle-star';
      else if (index % 3 === 1) extra = ' prestige-particle-shard';
      else if (index % 5 === 0) extra = ' prestige-particle-comet';
    }
    return `<span class="prestige-particle${extra}" style="--p:${index}"></span>`;
  }).join('');
  return `<span class="prestige-particles prestige-particles-${token}" aria-hidden="true">${particles}</span>`;
}

/** Particles + frame overlay for hero Radiance previews (full view, carousel, evolution result). */
export function prestigeFrameEffectsHtml(tier) {
  return `${prestigeParticlesHtml(tier)}${prestigeFrameOverlayHtml(tier)}`;
}

/**
 * Hero Radiance preview shell: card back art, optional front art, particles, and frame.
 * Card back always renders so previews never show an empty window.
 */
export function prestigeHeroPreviewHtml({ tier, imageUrl = '', alt = '', extraClass = '' } = {}) {
  const normalized = normalizeEvolutionTier(tier);
  if (normalized === 'stardust') return '';
  const frame = prestigeClassName(tier);
  const back = PRESTIGE_PREVIEW_BACK_URL;
  const front = String(imageUrl || '').trim();
  const safeAlt = escPrestigeAttr(alt);
  const classes = ['prestige-hero-preview', frame, extraClass].filter(Boolean).join(' ');
  const frontMarkup = front && front !== back
    ? `<img class="prestige-preview-front" src="${escPrestigeAttr(front)}" alt="${safeAlt}" draggable="false" decoding="async" onerror="this.remove()">`
    : '';
  const art = `<img class="prestige-preview-back" src="${back}" alt="${frontMarkup ? '' : safeAlt}" ${frontMarkup ? 'aria-hidden="true"' : ''} draggable="false" decoding="async">${frontMarkup}`;
  return `<div class="${classes}">${art}${prestigeFrameEffectsHtml(tier)}</div>`;
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
