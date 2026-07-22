/** Shared shell route allowlist + notification destination resolution. */

export const SHELL_ROUTE_KEYS = Object.freeze([
  'home',
  'binder',
  'collection',
  'daily',
  'shop',
  'events',
  'redeem',
  'star-bits',
  'checklist',
  'trades',
  'offers',
  'rankings',
  'notifications',
  'rewards',
  'profile',
  'collector',
  'report',
  'about',
  'socials',
  'admin',
  'admin-codes',
  'admin-staff',
  'admin-audit',
  'admin-moderation',
  'admin-boosters',
  'admin-twitch',
  'admin-gifts',
  'admin-news',
  'admin-users',
  'admin-health',
  'admin-notifications',
  'admin-ui',
  'admin-website'
]);

const SHELL_ROUTE_SET = new Set(SHELL_ROUTE_KEYS);

const ROUTE_ALIASES = Object.freeze({
  home: 'home',
  'home.html': 'home',
  binder: 'binder',
  'binder.html': 'binder',
  daily: 'daily',
  'daily-booster': 'daily',
  'daily-booster.html': 'daily',
  'free-daily-booster': 'daily',
  notifications: 'notifications',
  'notifications.html': 'notifications',
  collection: 'collection',
  'collection.html': 'collection',
  'my-cards': 'collection',
  offers: 'offers',
  'trade-offers': 'offers',
  'trade-offers.html': 'offers',
  rankings: 'rankings',
  'user-rankings': 'rankings',
  'user-rankings.html': 'rankings',
  'user-ranking': 'rankings',
  trades: 'trades',
  'trade-lists': 'trades',
  'trade-lists.html': 'trades',
  events: 'events',
  'events.html': 'events',
  shop: 'shop',
  'booster-shop': 'shop',
  'booster-shop.html': 'shop',
  redeem: 'redeem',
  'redeem.html': 'redeem',
  'star-bits': 'star-bits',
  'star-bits.html': 'star-bits',
  checklist: 'checklist',
  'checklist.html': 'checklist',
  profile: 'profile',
  'profile-settings': 'profile',
  'profile-settings.html': 'profile',
  rewards: 'rewards',
  'received-rewards': 'rewards',
  'received-rewards.html': 'rewards',
  'received-gifts': 'rewards',
  collector: 'collector',
  'collector.html': 'collector',
  report: 'report',
  'report-profile': 'report',
  'report-profile.html': 'report',
  about: 'about',
  'about.html': 'about',
  socials: 'socials',
  'socials.html': 'socials',
  admin: 'admin',
  'admin-hub': 'admin',
  'admin-hub.html': 'admin',
  'admin-ui': 'admin-ui',
  'admin-ui.html': 'admin-ui',
  'admin-website': 'admin-website',
  'admin-website.html': 'admin-website'
});

export function isKnownShellRoute(route) {
  return SHELL_ROUTE_SET.has(String(route || ''));
}

/** Strip URLs / binder.html?view= / path prefixes down to a shell key candidate. */
export function extractShellRouteKey(value) {
  let raw = String(value ?? '').trim();
  if (!raw) return '';

  raw = raw.replace(/^https?:\/\/[^/]+\/?/i, '');

  const viewMatch = raw.match(/(?:^|[/?&#])view=([a-z0-9_-]+)/i);
  if (viewMatch) return viewMatch[1].toLowerCase();

  const binderMatch = raw.match(/binder\.html$/i);
  if (binderMatch) return 'binder';

  raw = raw.replace(/^\/+/, '');
  const segments = raw.split(/[/?&#]/).filter(Boolean);
  if (!segments.length) return '';

  // Prefer the last path segment that looks like a page/route (handles GitHub Pages prefixes).
  for (let i = segments.length - 1; i >= 0; i -= 1) {
    const part = segments[i].toLowerCase();
    if (part === 'view') continue;
    if (ROUTE_ALIASES[part] || SHELL_ROUTE_SET.has(part.replace(/\.html$/, ''))) {
      return part.replace(/\.html$/, '');
    }
  }

  return segments[segments.length - 1].toLowerCase().replace(/\.html$/, '');
}

/** Alias a route string to a canonical shell key without notification hinting. */
export function aliasShellRoute(value) {
  const key = extractShellRouteKey(value);
  if (!key) return '';
  const aliased = ROUTE_ALIASES[key] || ROUTE_ALIASES[`${key}.html`] || key;
  return isKnownShellRoute(aliased) ? aliased : '';
}

export function normalizeNotificationParams(notice = {}) {
  const params = (notice.route_params && typeof notice.route_params === 'object')
    ? { ...notice.route_params }
    : {};
  if (params.giftId && !params.rewardId) params.rewardId = params.giftId;
  if (params.event && !params.eventId) params.eventId = params.event;
  if (!params.rewardId && String(notice.source_key || '').startsWith('received:')) {
    const candidate = String(notice.source_key).split(':').pop();
    if (/^[0-9a-f-]{20,}$/i.test(candidate)) params.rewardId = candidate;
  }
  return params;
}

function hintRouteFromNotice(notice = {}, params = {}) {
  const hint = [
    notice.notification_type,
    notice.title,
    notice.body,
    notice.source_key,
    ...Object.values(params)
  ].filter(Boolean).join(' ').toLowerCase();

  if (params.rewardId || /gift|received.?reward|reward ready|twitch redeem|reward code|code accepted|claim.*reward|booster.*waiting/.test(hint)) {
    return 'rewards';
  }
  if (/daily.*booster|free.*booster/.test(hint)) return 'daily';
  if (params.tradeId || params.offerId || /trade offer|incoming trade|accepted trade|declined trade/.test(hint)) {
    return 'offers';
  }
  if (/wishlist|trade list/.test(hint)) return 'trades';
  if (params.eventId || /\bevent\b|seasonal event/.test(hint)) return 'events';
  if (/achievement|collection milestone/.test(hint)) return 'profile';
  if (/twitch.*(link|unlink|connect)/.test(hint)) return 'profile';
  return '';
}

/**
 * Resolve where a notification should open.
 * Trusts a known DB/route value first; uses hints only when the route is missing/unknown.
 */
export function resolveNotificationRoute(value, notice = {}) {
  const params = normalizeNotificationParams(notice);
  const trusted = aliasShellRoute(value);
  if (trusted) return trusted;

  const hinted = hintRouteFromNotice(notice, params);
  if (hinted && isKnownShellRoute(hinted)) return hinted;

  return 'notifications';
}

export function shellNotificationUrl(notice = {}) {
  const route = resolveNotificationRoute(notice.route, notice);
  const params = new URLSearchParams(normalizeNotificationParams(notice));
  params.set('view', route);
  return `binder.html?${params.toString()}`;
}
