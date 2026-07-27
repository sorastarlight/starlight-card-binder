/**
 * Starlight Evolution reveal — light-themed duplicate carousel fusing into the evolved card.
 */

import {
  EVOLUTION_TIERS,
  normalizeEvolutionTier,
  prestigeLabel
} from './prestige-utils.js?v=1.5.0';

const STYLESHEET_ID = 'starlight-evolution-reveal-css';
const STYLESHEET_HREF = '../css/starlight-evolution-reveal.css?v=2.4.0';

const TIMING = Object.freeze({
  boot: 340,
  charge: 2900,
  fuse: 1100,
  complete: 1800,
  leave: 260
});

const REDUCED_TIMING = Object.freeze({
  complete: 1000,
  leave: 220
});

const evoViewportLocks = new WeakMap();

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

function intensityForTier(tier) {
  const key = normalizeEvolutionTier(tier);
  const index = Math.max(0, EVOLUTION_TIERS.indexOf(key));
  return Math.min(5, Math.max(1, index || 1));
}

function orbiterCountForCost(cost) {
  const spent = Math.max(1, Number(cost) || 1);
  return Math.min(14, spent);
}

function getEmbedVisibleFrame(view = window) {
  try {
    if (window.StarlightUI?.getEmbedVisibleFrame) {
      return window.StarlightUI.getEmbedVisibleFrame(view);
    }
  } catch {}
  try {
    if (!view || view.parent === view) return null;
    const frameEl = view.frameElement;
    if (!frameEl) return null;
    const parentWin = view.parent;
    const parentDoc = parentWin.document;
    const main = parentDoc.querySelector('.main');
    const frameRect = frameEl.getBoundingClientRect();
    const viewportHeight = parentWin.innerHeight || parentDoc.documentElement.clientHeight || 0;
    const intersectTop = Math.max(frameRect.top, 0);
    const intersectBottom = Math.min(frameRect.bottom, viewportHeight);
    const visibleHeight = Math.max(240, intersectBottom - intersectTop);
    const topWithinIframe = Math.max(0, intersectTop - frameRect.top);
    return {
      top: topWithinIframe,
      height: visibleHeight,
      parentMain: main instanceof parentWin.HTMLElement ? main : null,
      parentWin
    };
  } catch {
    return null;
  }
}

function anchorReveal(root) {
  try {
    if (window.StarlightUI?.anchorOverlayToVisibleViewport) {
      window.StarlightUI.anchorOverlayToVisibleViewport(root);
      return;
    }
  } catch {}
  const frame = getEmbedVisibleFrame();
  if (!frame) return;
  const top = `${Math.round(frame.top)}px`;
  const height = `${Math.round(frame.height)}px`;
  root.classList.add('is-embed-anchored');
  root.style.setProperty('--st-embed-overlay-top', top);
  root.style.setProperty('--st-embed-overlay-height', height);
  root.style.setProperty('position', 'absolute', 'important');
  root.style.setProperty('inset', 'auto', 'important');
  root.style.setProperty('top', top, 'important');
  root.style.setProperty('left', '0', 'important');
  root.style.setProperty('right', '0', 'important');
  root.style.setProperty('bottom', 'auto', 'important');
  root.style.setProperty('width', '100%', 'important');
  root.style.setProperty('max-width', '100%', 'important');
  root.style.setProperty('height', height, 'important');
  root.style.setProperty('max-height', height, 'important');
}

function clearRevealAnchor(root) {
  if (!root) return;
  try {
    window.StarlightUI?.clearOverlayViewportAnchor?.(root);
  } catch {}
  root.classList.remove('is-embed-viewport', 'is-embed-anchored');
  root.style.removeProperty('--st-embed-overlay-top');
  root.style.removeProperty('--st-embed-overlay-height');
  [
    'position', 'inset', 'top', 'left', 'right', 'bottom',
    'width', 'height', 'max-height', 'max-width'
  ].forEach((property) => root.style.removeProperty(property));
}

function prepareEmbedRevealViewport() {
  try {
    const frame = window.frameElement;
    const parentMain = window.parent?.document?.querySelector('.main');
    if (!(frame instanceof HTMLElement) || !(parentMain instanceof HTMLElement)) return;
    resetEmbeddedDocumentScroll(document);
    const mainRect = parentMain.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const delta = frameRect.top - mainRect.top;
    if (Math.abs(delta) > 4) {
      parentMain.scrollTop = Math.max(0, parentMain.scrollTop + delta);
    }
    window.parent.scrollTo?.({ top: 0, left: 0, behavior: 'auto' });
  } catch {}
}

function alignParentShellToIframeTop() {
  try {
    const frame = window.frameElement;
    const parentMain = window.parent?.document?.querySelector('.main');
    if (!(frame instanceof HTMLElement) || !(parentMain instanceof HTMLElement)) return;
    resetEmbeddedDocumentScroll(document);
    const mainRect = parentMain.getBoundingClientRect();
    const frameRect = frame.getBoundingClientRect();
    const target = Math.max(0, Math.floor(frameRect.top - mainRect.top + parentMain.scrollTop));
    parentMain.scrollTop = target;
  } catch {}
}

function acquireViewportLock(doc = document) {
  const existing = evoViewportLocks.get(doc);
  if (existing) {
    existing.count += 1;
    return () => {
      existing.count -= 1;
      if (existing.count === 0) existing.restore();
    };
  }

  const root = doc.documentElement;
  const body = doc.body;
  const properties = ['overflow', 'overflow-x', 'overflow-y', 'overscroll-behavior'];
  const snapshots = [root, body].map((element) => ({
    element,
    values: properties.map((property) => ({
      property,
      value: element.style.getPropertyValue(property),
      priority: element.style.getPropertyPriority(property)
    }))
  }));
  const hadClass = root.classList.contains('st-evo-open');
  const lock = { count: 1, restore: null };

  root.classList.add('st-evo-open');
  [root, body].forEach((element) => {
    element.style.setProperty('overflow', 'hidden', 'important');
    element.style.setProperty('overflow-x', 'hidden', 'important');
    element.style.setProperty('overflow-y', 'hidden', 'important');
    element.style.setProperty('overscroll-behavior', 'none', 'important');
  });

  lock.restore = () => {
    snapshots.forEach(({ element, values }) => {
      values.forEach(({ property, value, priority }) => {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
      });
    });
    if (!hadClass) root.classList.remove('st-evo-open');
    body?.classList.remove('st-evo-open');
    evoViewportLocks.delete(doc);
  };
  evoViewportLocks.set(doc, lock);

  return () => {
    lock.count -= 1;
    if (lock.count === 0) lock.restore();
  };
}

function measureEmbedContentHeight(doc = document) {
  const root = doc.documentElement;
  const scrollTop = root.scrollTop || doc.body?.scrollTop || 0;
  const main = doc.querySelector('body > main')
    || doc.querySelector('.site > .main')
    || doc.querySelector('main')
    || doc.body;
  if (!main) return 320;
  const rect = main.getBoundingClientRect();
  return Math.max(320, Math.ceil(scrollTop + rect.bottom + 24));
}

function documentHeight() {
  return measureEmbedContentHeight();
}

function resetEmbeddedDocumentScroll(doc = document) {
  try {
    doc.documentElement.scrollTop = 0;
    doc.body.scrollTop = 0;
    doc.documentElement.classList.remove('st-evo-open');
    doc.body?.classList.remove('st-evo-open');
    doc.documentElement.style.removeProperty('overflow');
    doc.documentElement.style.removeProperty('overflow-x');
    doc.documentElement.style.removeProperty('overflow-y');
    doc.documentElement.style.removeProperty('overscroll-behavior');
    doc.body?.style.removeProperty('overflow');
    doc.body?.style.removeProperty('overflow-x');
    doc.body?.style.removeProperty('overflow-y');
    doc.body?.style.removeProperty('overscroll-behavior');
  } catch {}
}

function notifyEmbedHeight() {
  try {
    window.parent?.postMessage?.({
      type: 'starlight-view-height',
      height: documentHeight()
    }, window.location.origin);
  } catch {}
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
  const isEmbedded = window.parent !== window;

  const root = document.createElement('div');
  root.className = `st-evo-root${reduced ? ' is-reduced' : ''}`;
  root.dataset.intensity = String(intensity);
  root.style.setProperty('--evo-orbit-n', String(orbiters));
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', `Evolving to ${label}`);
  root.innerHTML = `
    <div class="st-evo-backdrop" aria-hidden="true">
      <div class="st-evo-shimmer" aria-hidden="true"></div>
    </div>
    <div class="st-evo-stage prestige-${toToken}" data-intensity="${intensity}">
      <p class="st-evo-caption">Starlight Evolution</p>
      <p class="st-evo-phase-label" aria-live="polite">Gathering duplicate energy…</p>
      <div class="st-evo-arena">
        <div class="st-evo-hero-wrap">
          <span class="st-evo-hero-glow" aria-hidden="true"></span>
          <div class="st-evo-hero prestige-frame prestige-${fromToken}" data-from-tier="${esc(fromToken)}" data-to-tier="${esc(toToken)}">
            <span class="st-evo-hero-halo" aria-hidden="true"></span>
            <img src="${safeImg}" alt="${safeName}" draggable="false">
            <span class="st-evo-border prestige-frame prestige-${fromToken}" aria-hidden="true"></span>
          </div>
        </div>
        <div class="st-evo-orbit-rig" aria-hidden="true">
          <div class="st-evo-orbit"></div>
        </div>
        <div class="st-evo-ring-system" aria-hidden="true">
          <span class="st-evo-ring st-evo-ring-outer"></span>
          <span class="st-evo-ring st-evo-ring-inner"></span>
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

  const phaseLabel = root.querySelector('.st-evo-phase-label');
  const hero = root.querySelector('.st-evo-hero');
  const border = root.querySelector('.st-evo-border');
  const releaseViewportLock = acquireViewportLock(document);

  if (isEmbedded) prepareEmbedRevealViewport();
  document.body.appendChild(root);
  anchorReveal(root);
  void root.offsetWidth;
  root.classList.add('is-open');

  const onViewportChange = () => anchorReveal(root);
  try {
    window.addEventListener('resize', onViewportChange);
    window.parent?.addEventListener?.('scroll', onViewportChange, { passive: true });
    window.parent?.addEventListener?.('resize', onViewportChange);
  } catch {}

  const setPhaseLabel = (text) => {
    if (phaseLabel) phaseLabel.textContent = text;
  };

  try {
    if (reduced) {
      setPhaseLabel('Evolution complete');
      root.classList.add('is-complete');
      if (hero) hero.className = `st-evo-hero prestige-frame prestige-${toToken} is-evolved`;
      if (border) border.className = `st-evo-border prestige-frame prestige-${toToken}`;
      await wait(REDUCED_TIMING.complete);
      return;
    }

    root.classList.add('is-boot');
    await wait(TIMING.boot);

    root.classList.add('is-charge');
    setPhaseLabel('Duplicates spinning in…');
    await wait(TIMING.charge);

    root.classList.add('is-fuse');
    setPhaseLabel('Infusing Radiance!');
    await wait(Math.round(TIMING.fuse * 0.62));

    if (hero) hero.className = `st-evo-hero prestige-frame prestige-${toToken} is-evolved`;
    if (border) border.className = `st-evo-border prestige-frame prestige-${toToken}`;
    root.classList.add('is-break');
    setPhaseLabel('Evolution complete!');
    await wait(Math.round(TIMING.fuse * 0.38));

    root.classList.add('is-complete');
    await wait(TIMING.complete);
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
    releaseViewportLock();
    resetEmbeddedDocumentScroll(document);
    if (isEmbedded) alignParentShellToIframeTop();
    notifyEmbedHeight();
    window.__starlightEmbedReportHeight?.();
    window.requestAnimationFrame(() => {
      resetEmbeddedDocumentScroll(document);
      if (isEmbedded) alignParentShellToIframeTop();
      notifyEmbedHeight();
      window.__starlightEmbedReportHeight?.();
    });
    window.setTimeout(() => {
      notifyEmbedHeight();
      window.__starlightEmbedReportHeight?.();
    }, 120);
  }
}

export default { playStarlightEvolutionReveal };
