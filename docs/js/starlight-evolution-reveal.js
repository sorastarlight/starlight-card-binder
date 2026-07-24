/**
 * Starlight Evolution reveal: orbit duplicates → merge → burst → tier border.
 * Prefer CSS / Web Animations; prefers-reduced-motion uses a short fade.
 * Uses embed-anchoring so the reveal stays centered in the visible viewport.
 */

const STYLESHEET_ID = 'starlight-evolution-reveal-css';
const STYLESHEET_HREF = '../css/starlight-evolution-reveal.css?v=1.0.1';

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

function tierCssToken(tier) {
  return String(tier || 'stardust').trim().toLowerCase().replace(/_/g, '-');
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
 * @param {number} [options.cost]
 * @returns {Promise<void>}
 */
export async function playStarlightEvolutionReveal(options = {}) {
  ensureStylesheet();

  const imageUrl = String(options.imageUrl || '').trim();
  const cardName = String(options.cardName || 'Card').trim();
  const toTier = String(options.toTier || 'star_bit').trim().toLowerCase();
  const label = String(options.label || toTier).trim();
  const cost = Math.max(1, Math.min(8, Number(options.cost) || 3));
  const token = tierCssToken(toTier);
  const reduced = preferReducedMotion();

  const root = document.createElement('div');
  root.className = `st-evo-root${reduced ? ' is-reduced' : ''}`;
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-label', `Evolving to ${label}`);
  root.innerHTML = `
    <div class="st-evo-backdrop" aria-hidden="true"></div>
    <div class="st-evo-stage prestige-${token}">
      <p class="st-evo-caption">Starlight Evolution</p>
      <div class="st-evo-orbit" aria-hidden="true"></div>
      <div class="st-evo-hero">
        <img src="${imageUrl}" alt="${cardName}" draggable="false">
        <span class="st-evo-border prestige-frame prestige-${token}" aria-hidden="true"></span>
      </div>
      <div class="st-evo-burst" aria-hidden="true"></div>
      <p class="st-evo-result">${label}</p>
    </div>
  `;

  const orbit = root.querySelector('.st-evo-orbit');
  for (let i = 0; i < cost; i += 1) {
    const mote = document.createElement('span');
    mote.className = 'st-evo-mote';
    mote.style.setProperty('--i', String(i));
    mote.style.setProperty('--n', String(cost));
    if (imageUrl) {
      mote.innerHTML = `<img src="${imageUrl}" alt="" draggable="false">`;
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
      root.classList.add('is-reveal');
      await wait(420);
      return;
    }

    root.classList.add('is-orbit');
    await wait(900);
    root.classList.add('is-merge');
    await wait(520);
    root.classList.add('is-burst', 'is-reveal');
    await wait(980);
  } finally {
    try {
      window.removeEventListener('resize', onViewportChange);
      window.parent?.removeEventListener?.('scroll', onViewportChange);
      window.parent?.removeEventListener?.('resize', onViewportChange);
    } catch {}
    root.classList.add('is-leaving');
    await wait(220);
    clearRevealAnchor(root);
    root.remove();
    document.body.classList.remove('st-evo-open');
  }
}

export default { playStarlightEvolutionReveal };
