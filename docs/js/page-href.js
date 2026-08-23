/** Maps legacy shell route keys to standalone HTML pages (TCG multi-page site). */

import { isKnownShellRoute } from './shell-route-utils.js';

export const ROUTE_PAGE_MAP = Object.freeze({
  home: 'index.html',
  binder: 'gallery.html',
  collection: 'collection.html',
  daily: 'daily-booster.html',
  shop: 'booster-shop.html',
  events: 'events.html',
  redeem: 'redeem.html',
  'star-bits': 'star-bits.html',
  'starlight-evolution': 'starlight-evolution.html',
  checklist: 'checklist.html',
  quests: 'collection-quests.html',
  'season-pass': 'season-pass.html',
  trades: 'trade-lists.html',
  offers: 'trade-lists.html',
  rankings: 'trade-lists.html',
  feed: 'pull-feed.html',
  notifications: 'notifications.html',
  rewards: 'received-rewards.html',
  profile: 'profile-settings.html',
  login: 'login.html',
  collector: 'collector.html',
  report: 'report-profile.html',
  about: 'about.html',
  socials: 'socials.html',
  admin: 'admin-hub.html',
  'admin-codes': 'admin-codes.html',
  'admin-staff': 'admin-staff.html',
  'admin-audit': 'admin-audit.html',
  'admin-moderation': 'admin-moderation.html',
  'admin-boosters': 'admin-boosters.html',
  'admin-twitch': 'admin-twitch.html',
  'admin-quests': 'admin-quests.html',
  'admin-gifts': 'admin-gifts.html',
  'admin-news': 'admin-news.html',
  'admin-users': 'admin-users.html',
  'admin-health': 'admin-health.html',
  'admin-notifications': 'admin-notifications.html',
  'admin-ui': 'admin-ui.html',
  'admin-website': 'admin-website.html'
});

/** data-page values used for nav highlighting (StarlightCards-style ids). */
export const PAGE_ROUTE_ID = Object.freeze({
  'index.html': 'home',
  'home.html': 'home',
  'gallery.html': 'gallery',
  'collection.html': 'album',
  'daily-booster.html': 'pack',
  'booster-shop.html': 'shop',
  'star-bits.html': 'bits',
  'received-rewards.html': 'gifts',
  'profile-settings.html': 'settings',
  'collector.html': 'profile',
  'trade-lists.html': 'trades',
  'login.html': 'login',
  'redeem.html': 'redeem',
  'notifications.html': 'notifications',
  'checklist.html': 'checklist',
  'starlight-evolution.html': 'evolution',
  'collection-quests.html': 'quests',
  'season-pass.html': 'season-pass',
  'events.html': 'events',
  'pull-feed.html': 'feed',
  'about.html': 'collect',
  'news.html': 'news',
  'series.html': 'series',
  'import-collection.html': 'import',
  'admin-hub.html': 'admin',
  'admin-codes.html': 'admin',
  'admin-staff.html': 'admin',
  'admin-audit.html': 'admin',
  'admin-moderation.html': 'admin',
  'admin-boosters.html': 'admin',
  'admin-twitch.html': 'admin',
  'admin-quests.html': 'admin',
  'admin-gifts.html': 'admin',
  'admin-news.html': 'admin',
  'admin-users.html': 'admin',
  'admin-health.html': 'admin',
  'admin-notifications.html': 'admin',
  'admin-ui.html': 'admin',
  'admin-website.html': 'admin'
});

export function pageForRoute(route) {
  const key = String(route || '').trim();
  if (!key) return 'index.html';
  return ROUTE_PAGE_MAP[key] || 'index.html';
}

export function pageHref(route, extraParams = {}) {
  const page = pageForRoute(route);
  const params = new URLSearchParams();
  Object.entries(extraParams).forEach(([key, value]) => {
    if (value != null && value !== '') params.set(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${page}?${qs}` : page;
}

export function legacyBinderRedirectUrl(search = location.search) {
  const params = new URLSearchParams(search);
  const view = params.get('view') || 'home';
  params.delete('view');
  params.delete('embed');
  params.delete('shellBuild');
  params.delete('shellLoad');
  params.delete('shellRetry');
  const extra = Object.fromEntries(params.entries());
  if (!isKnownShellRoute(view)) return pageHref('home', extra);
  return pageHref(view, extra);
}

export function loginPageHref(mode = 'signin') {
  return pageHref('login', { mode: mode === 'signup' ? 'signup' : 'signin' });
}

export function profilePageHref(username = '') {
  const user = String(username || '').trim();
  return user ? pageHref('collector', { username: user }) : pageHref('profile');
}

export function currentPageFile() {
  return `${location.pathname.split('/').pop() || 'index.html'}${location.search}`;
}

export function navPageId() {
  const file = location.pathname.split('/').pop() || 'index.html';
  return PAGE_ROUTE_ID[file] || document.body?.dataset?.page || '';
}
