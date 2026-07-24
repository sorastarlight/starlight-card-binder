/**
 * Starlight Evolution reveal — compact 3D duplicate carousel fusing into the evolved card.
 * Duplicates orbit the primary card, then shake/flash into the new Radiance appearance.
 */

import {
  EVOLUTION_TIERS,
  normalizeEvolutionTier,
  prestigeLabel
} from './prestige-utils.js?v=1.5.0';

const STYLESHEET_ID = 'starlight-evolution-reveal-css';
const STYLESHEET_HREF = '../css/starlight-evolution-reveal.css?v=1.3.0';

/** Full-motion phase timings (ms). Total ≈ 5.8s before leave. */
const TIMING = Object.freeze({
  enter: 320,
  carousel: 2600,
  fuse: 900,
  reveal: 1500,
  leave: 260
});

const REDUCED_TIMING = Object.freeze({
  reveal: 1000,
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

function starRankForTier(tier) {
  const key = normalizeEvolutionTier(tier);
  const index = EVOLUTION_TIERS.indexOf(key);
  if (index <= 0) return 0;
  return Math.min(5, index);
}

function starsMarkup(count) {
  const n = Math.max(0, Math.min(5, Number(count) || 0));
  return n ? '⭐'.repeat(n) : '';
}

/** Visual intensity 1–5 from target tier (glow strength). */
function intensityForTier(tier) {
  const key = normalizeEvolutionTier(tier);
  const index = Math.max(0, EVOLUTION_TIERS.indexOf(key));
  return Math.min(5, Math.max(1, index || 1));
}

/** Duplicate cards shown in the 3D carousel (matches spent cost, capped for layout). */
function orbiterCountForCost(cost) {
  const spent = Math.max(1, Number(cost) || 1);
  return Math.min(12, spent);
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
 * @param {number} [options.cost] duplicates spent — drives carousel count
 * @returns {Promise<void>}
 */
export async function playStarlightEvolutionReveal(options = {}) {
  ensureStylesheet();

  const imageUrl = String(options.imageUrl || '').trim();
  const cardName = String(options.cardName || 'Card').trim();
  const fromTier = normalizeEvolutionTier(options.fromTier || 'stardust');
  const toTier = normalizeEvolutionTier(options.toTier || 'star_bit');
  const label = String(options.label || prestigeLabel(toTier)).trim();
  const fromToken = tierCssToken(fromTier);
  const toToken = tierCssToken(toTier);
  const starRank = starRankForTier(toTier);
  const intensity = intensityForTier(toTier);
  const orbiters = orbiterCountForCost(options.cost);
  const reduced = preferReducedMotion();
  const safeImg = esc(imageUrl);
  const safeName = esc(cardName);
  const safeLabel = esc(label);
  const safeStars = esc(starsMarkup(starRank));
  const orbitMs = TIMING.carousel;

  const root = document.createElement('div');
  root.className = `st-evo-root${reduced ? ' is-reduced' : ''}`;
  root.dataset.intensity = String(intensity);
  root.style.setProperty('--evo-orbit-ms', `${orbitMs}ms`);
  root.style.setProperty('--evo-orbit-n', String(orbiters));
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', `Evolving to ${label}`);
  root.innerHTML = `
    <div class="st-evo-backdrop" aria-hidden="true"></div>
    <div class="st-evo-panel prestige-${toToken}" data-intensity="${intensity}">
      <p class="st-evo-caption">Starlight Evolution</p>
      <div class="st-evo-arena">
        <div class="st-evo-orbit-rig" aria-hidden="true">
          <div class="st-evo-orbit"></div>
        </div>
        <div class="st-evo-hero-wrap">
          <div class="st-evo-hero prestige-frame prestige-${fromToken}" data-from-tier="${esc(fromToken)}" data-to-tier="${esc(toToken)}">
            <span class="st-evo-hero-halo" aria-hidden="true"></span>
            <img src="${safeImg}" alt="${safeName}" draggable="false">
            <span class="st-evo-border prestige-frame prestige-${fromToken}" aria-hidden="true"></span>
          </div>
        </div>
        <div class="st-evo-flash" aria-hidden="true"></div>
        <div class="st-evo-sparks" aria-hidden="true"></div>
      </div>
      <div class="st-evo-reveal-meta">
        <p class="st-evo-stars" aria-hidden="true">${safeStars}</p>
        <p class="st-evo-result">${safeLabel}</p>
        <p class="st-evo-rank-line"><span class="st-evo-rank-num">${starRank}</span>★ Star Rank</p>
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

  const hero = root.querySelector('.st-evo-hero');
  const border = root.querySelector('.st-evo-border');

  try {
    if (reduced) {
      root.classList.add('is-reveal');
      if (hero) hero.className = `st-evo-hero prestige-frame prestige-${toToken}`;
      if (border) border.className = `st-evo-border prestige-frame prestige-${toToken}`;
      await wait(REDUCED_TIMING.reveal);
      return;
    }

    root.classList.add('is-enter');
    await wait(TIMING.enter);

    root.classList.add('is-carousel');
    await wait(TIMING.carousel);

    root.classList.add('is-fuse');
    await wait(Math.round(TIMING.fuse * 0.55));

    if (hero) hero.className = `st-evo-hero prestige-frame prestige-${toToken} is-evolved`;
    if (border) border.className = `st-evo-border prestige-frame prestige-${toToken}`;

    root.classList.add('is-reveal');
    await wait(Math.round(TIMING.fuse * 0.45) + TIMING.reveal);
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
