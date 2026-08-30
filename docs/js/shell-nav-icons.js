/**
 * Cohesive Starlight line icons for shell navigation.
 * Thin stroke set with blue/purple base; accents via CSS currentColor / modifiers.
 */

export const SHELL_NAV_ICON_IDS = Object.freeze([
  'home',
  'cards',
  'gallery',
  'checklist',
  'collection',
  'daily',
  'shop',
  'missions',
  'season-pass',
  'redeem',
  'events',
  'trade',
  'rankings',
  'feed',
  'profile',
  'notifications',
  'gifts',
  'community',
  'account'
]);

/** Destination / section id → icon id */
export const SHELL_NAV_ICON_BY_KEY = Object.freeze({
  home: 'home',
  binder: 'gallery',
  checklist: 'checklist',
  collection: 'collection',
  daily: 'daily',
  shop: 'shop',
  quests: 'missions',
  'season-pass': 'season-pass',
  redeem: 'redeem',
  events: 'events',
  trades: 'trade',
  offers: 'trade',
  rankings: 'rankings',
  feed: 'feed',
  profile: 'profile',
  notifications: 'notifications',
  rewards: 'gifts',
  cards: 'cards',
  collect: 'collection',
  community: 'community',
  account: 'account'
});

/**
 * Inline SVG path content (viewBox 0 0 24 24). Stroke icons only.
 * Paths drawn for 1.75 stroke, round caps/joins.
 */
const ICON_PATHS = Object.freeze({
  home: '<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5.2v-6.2H10.2V21H5a1 1 0 0 1-1-1z"/>',
  cards: '<rect x="5.5" y="4.5" width="10" height="14" rx="1.6"/><path d="M15.5 7.2h2.2a1.6 1.6 0 0 1 1.6 1.6v10.2a1.6 1.6 0 0 1-1.6 1.6H9.4"/>',
  gallery: '<rect x="5" y="4.5" width="11" height="15" rx="1.8"/><path d="M8 9.2h5M8 12.2h5M8 15.2h3.2"/>',
  checklist: '<rect x="6" y="3.8" width="12" height="16.4" rx="2"/><path d="M9.2 3.8v2.4h5.6V3.8M8.4 11.2l2 2 4.2-4.4M8.4 16.4h7.2"/>',
  collection: '<path d="M5 6.2c0-.9.7-1.6 1.6-1.6H12v15.2H6.6A1.6 1.6 0 0 1 5 18.2zM12 4.6h5.4c.9 0 1.6.7 1.6 1.6v12c0 .9-.7 1.6-1.6 1.6H12"/><path d="M12 4.6v15.2"/>',
  daily: '<path d="M12 4.2v2.4M12 17.4v2.4M4.2 12h2.4M17.4 12h2.4M6.4 6.4l1.7 1.7M15.9 15.9l1.7 1.7M17.6 6.4l-1.7 1.7M8.1 15.9l-1.7 1.7"/><circle cx="12" cy="12" r="3.1"/>',
  shop: '<path d="M7.2 8.2 8.4 19h7.2l1.2-10.8z"/><path d="M9.1 8.2a2.9 2.9 0 0 1 5.8 0"/>',
  missions: '<circle cx="12" cy="12" r="7.4"/><circle cx="12" cy="12" r="3.6"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/>',
  'season-pass': '<path d="M4.5 8.2h15a1.4 1.4 0 0 1 1.4 1.4v5.8a1.4 1.4 0 0 1-1.4 1.4h-15a1.4 1.4 0 0 1-1.4-1.4V9.6A1.4 1.4 0 0 1 4.5 8.2z"/><path d="M9.2 8.2v8.6M14.8 8.2v8.6"/>',
  redeem: '<path d="M5 9.2h14v8.2a1.6 1.6 0 0 1-1.6 1.6H6.6A1.6 1.6 0 0 1 5 17.4z"/><path d="M5 9.2 7.4 5.6h9.2L19 9.2M9.2 13.4h5.6"/>',
  events: '<rect x="4.8" y="6.4" width="14.4" height="13" rx="2"/><path d="M8 4.8v3.2M16 4.8v3.2M4.8 10.4h14.4M9 14.2h2M13 14.2h2M9 17h2"/>',
  trade: '<path d="M7.2 9.2H18l-2.4-2.6M16.8 14.8H6l2.4 2.6"/>',
  rankings: '<path d="M8.2 19V11h3.4v8zM12.8 19V7.4h3.4V19zM4.6 19v-4.4H8V19z"/><path d="M4.6 19h13.6"/>',
  feed: '<path d="M6 6.2h12M6 10.4h12M6 14.6h8.4"/><circle cx="17.4" cy="16.8" r="2.2"/>',
  profile: '<circle cx="12" cy="8.2" r="3.2"/><path d="M5.6 19.2c.8-3.4 3.2-5.1 6.4-5.1s5.6 1.7 6.4 5.1"/>',
  notifications: '<path d="M7.2 16.6h9.6M8 16.6V11a4 4 0 0 1 8 0v5.6"/><path d="M10.4 16.6a1.6 1.6 0 0 0 3.2 0"/>',
  gifts: '<rect x="5.2" y="10.2" width="13.6" height="9.2" rx="1.4"/><path d="M5.2 13.4h13.6M12 10.2v9.2M12 10.2c-1.8-2.8-4.6-2.8-4.6-.4S10.4 12 12 10.2c1.8-2.8 4.6-2.8 4.6-.4S13.6 12 12 10.2z"/>',
  community: '<circle cx="8.2" cy="9" r="2.4"/><circle cx="15.8" cy="9" r="2.4"/><path d="M4.6 17.6c.6-2.4 2.2-3.6 3.6-3.6s3 1.2 3.6 3.6M12.2 17.6c.6-2.4 2.2-3.6 3.6-3.6s3 1.2 3.6 3.6"/>',
  account: '<circle cx="12" cy="8.2" r="3.2"/><path d="M5.6 19.2c.8-3.4 3.2-5.1 6.4-5.1s5.6 1.7 6.4 5.1"/>'
});

export function isShellNavIconId(value) {
  return SHELL_NAV_ICON_IDS.includes(String(value || '').trim());
}

/** Navigation descriptor for defaults / studio. */
export function shellNavIcon(id) {
  const key = String(id || '').trim();
  if (!isShellNavIconId(key)) return { type: 'emoji', value: '' };
  return { type: 'svg', value: key };
}

export function shellNavIconForKey(key) {
  const mapped = SHELL_NAV_ICON_BY_KEY[String(key || '').trim()];
  return mapped ? shellNavIcon(mapped) : { type: 'emoji', value: '' };
}

/**
 * Escape-safe inline SVG markup.
 * @param {{ type?: string, value?: string }|string} icon
 * @param {(value: unknown) => string} esc
 */
export function renderShellNavIcon(icon, esc, { className = 'shell-nav-svg' } = {}) {
  if (typeof esc !== 'function') return '';
  const id = typeof icon === 'string'
    ? icon
    : (icon?.type === 'svg' ? icon.value : '');
  const paths = ICON_PATHS[String(id || '').trim()];
  if (!paths) return '';
  return `<svg class="${esc(className)}" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">${paths}</svg>`;
}
