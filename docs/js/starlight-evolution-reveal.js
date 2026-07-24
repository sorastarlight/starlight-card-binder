/**
 * Starlight Evolution reveal: center glow → carousel orbit → merge → burst → tier reveal.
 * Prefer CSS / Web Animations; prefers-reduced-motion keeps center + final title/stars.
 * Uses embed-anchoring so the reveal stays centered in the visible viewport.
 */

import {
  EVOLUTION_TIERS,
  normalizeEvolutionTier,
  prestigeLabel
} from './prestige-utils.js?v=1.4.0';

const STYLESHEET_ID = 'starlight-evolution-reveal-css';
const STYLESHEET_HREF = '../css/starlight-evolution-reveal.css?v=1.1.0';

/** Full-motion phase timings (ms). Total ≈ 5.8–6.4s before leave. */
const TIMING = Object.freeze({
  glow: 450,
  orbit: 2800,
  merge: 550,
  burst: 1000,
  reveal: 1600,
  leave: 280
});

const REDUCED_TIMING = Object.freeze({
  reveal: 900,
  leave: 220
});

function preferReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function ensureStylesheet() {
  if (document.getElementById(STYLESHEET_ID)) return;
  const link = document.createElement('link');
  link.id = STYLESHEET_ID;
  link.rel = 'stylesheet';
  link.href = new URL(STYLESHEET_HREF, import.meta.url).href;
  document.head.appendChild(link);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function tierCssToken(tier) {
  return String(tier || 'stardust').trim().toLowerCase().replace(/_/g, '-');
}

/** 1★ Stardust … 6★ Super Starlight */
function starRankForTier(tier) {
  const key = normalizeEvolutionTier(tier);
  const index = EVOLUTION_TIERS.indexOf(key);
  return Math.max(1, index + 1);
}

function starsMarkup(count) {
  const n = Math.max(1, Math.min(6, Number(count) || 1));
  return '★'.repeat(n);
}

/**
 * Orbiter count + CSS intensity 1–5 from target tier (higher = more dramatic).
 * @returns {{ orbiters: number, intensity: number }}
 */
function intensityForTier(tier) {
  const key = normalizeEvolutionTier(tier);
  const index = Math.max(0, EVOLUTION_TIERS.indexOf(key));
  // star_bit(1) → 4, … starlight_burst(5) → 8
  const orbiters = Math.min(8, Math.max(4, 3 + index));
  const intensity = Math.min(5, Math.max(1, index));
  return { orbiters, intensity };
}

function getUiApi() {
  return window.StarlightUI || null;
}

function anchorReveal(root) {
  const api = getUiApi();
  if (api?.anchorOverlayToVisibleViewport) {
    api.anchorOverlayToVisibleViewport(root);
    return;
  }
  root.classList.add('is-embed-anchored');
}

function clearRevealAnchor(root) {
  const api = getUiApi();
  if (api?.clearOverlayViewportAnchor) {
    api.clearOverlayViewportAnchor(root);
    return;
  }
  root.classList.remove('is-embed-anchored');
  root.style.removeProperty('--st-embed-overlay-top');
  root.style.removeProperty('--st-embed-overlay-height');
  ['position', 'inset', 'top', 'left', 'right', 'bottom', 'width', 'height', 'max-height', 'max-width']
    .forEach((property) => root.style.removeProperty(property));
}

/**
 * @param {object} options
 * @param {string} options.imageUrl
 * @param {string} options.cardName
 * @param {string} options.fromTier
 * @param {string} options.toTier
 * @param {string} [options.label]
 * @param {number} [options.cost] unused for visuals; kept for caller compatibility
 * @returns {Promise<void>}
 */
export async function playStarlightEvolutionReveal(options = {}) {
  ensureStylesheet();

  const imageUrl = String(options.imageUrl || '').trim();
  const cardName = String(options.cardName || 'Card').trim();
  const toTier = normalizeEvolutionTier(options.toTier || 'star_bit');
  const label = String(options.label || prestigeLabel(toTier)).trim();
  const token = tierCssToken(toTier);
  const starRank = starRankForTier(toTier);
  const { orbiters, intensity } = intensityForTier(toTier);
  const reduced = preferReducedMotion();
  const safeImg = esc(imageUrl);
  const safeName = esc(cardName);
  const safeLabel = esc(label);
  const safeStars = esc(starsMarkup(starRank));

  const root = document.createElement('div');
  root.className = `st-evo-root${reduced ? ' is-reduced' : ''}`;
  root.dataset.intensity = String(intensity);
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', `Evolving to ${label}`);
  root.innerHTML = `
    <div class="st-evo-backdrop" aria-hidden="true"></div>
    <div class="st-evo-energy" aria-hidden="true"></div>
    <div class="st-evo-stage prestige-${token}" data-intensity="${intensity}">
      <p class="st-evo-caption">Starlight Evolution</p>
      <div class="st-evo-orbit" aria-hidden="true"></div>
      <div class="st-evo-hero">
        <span class="st-evo-hero-glow" aria-hidden="true"></span>
        <img src="${safeImg}" alt="${safeName}" draggable="false">
        <span class="st-evo-border prestige-frame prestige-${token}" aria-hidden="true"></span>
      </div>
      <div class="st-evo-burst" aria-hidden="true">
        <span class="st-evo-burst-core"></span>
        <span class="st-evo-burst-ring st-evo-burst-ring--a"></span>
        <span class="st-evo-burst-ring st-evo-burst-ring--b"></span>
        <span class="st-evo-burst-rays"></span>
        <span class="st-evo-burst-sparkles"></span>
      </div>
      <div class="st-evo-reveal-meta">
        <p class="st-evo-stars" aria-hidden="true">${safeStars}</p>
        <p class="st-evo-result">${safeLabel}</p>
        <p class="st-evo-card-name">${safeName}</p>
      </div>
    </div>
  `;

  const orbit = root.querySelector('.st-evo-orbit');
  for (let i = 0; i < orbiters; i += 1) {
    const mote = document.createElement('span');
    mote.className = 'st-evo-mote';
    mote.style.setProperty('--i', String(i));
    mote.style.setProperty('--n', String(orbiters));
    if (imageUrl) {
      mote.innerHTML = `<img src="${safeImg}" alt="" draggable="false">`;
    }
    orbit.appendChild(mote);
  }

  document.body.appendChild(root);
  document.body.classList.add('st-evo-open');
  anchorReveal(root);
  void root.offsetWidth;
  root.classList.add('is-open');

  const onViewportChange = () => anchorReveal(root);
  try {
    window.addEventListener('resize', onViewportChange);
    window.parent?.addEventListener?.('scroll', onViewportChange, { passive: true });
    window.parent?.addEventListener?.('resize', onViewportChange);
  } catch {}

  try {
    if (reduced) {
      root.classList.add('is-glow', 'is-reveal');
      await wait(REDUCED_TIMING.reveal);
      return;
    }

    root.classList.add('is-glow');
    await wait(TIMING.glow);

    root.classList.add('is-orbit');
    await wait(TIMING.orbit);

    root.classList.add('is-merge');
    await wait(TIMING.merge);

    root.classList.add('is-burst');
    await wait(Math.round(TIMING.burst * 0.45));
    root.classList.add('is-reveal');
    await wait(Math.round(TIMING.burst * 0.55) + TIMING.reveal);
  } finally {
    try {
      window.removeEventListener('resize', onViewportChange);
      window.parent?.removeEventListener?.('scroll', onViewportChange);
      window.parent?.removeEventListener?.('resize', onViewportChange);
    } catch {}
    root.classList.add('is-leaving');
    await wait(reduced ? REDUCED_TIMING.leave : TIMING.leave);
    clearRevealAnchor(root);
    root.remove();
    document.body.classList.remove('st-evo-open');
  }
}

export default { playStarlightEvolutionReveal };
