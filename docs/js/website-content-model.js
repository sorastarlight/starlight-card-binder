import { cloneDefaultWebsiteContent, HOME_QUICK_LINK_IDS } from './website-content-defaults.js';

const QUICK_LINK_SET = new Set(HOME_QUICK_LINK_IDS);
const MAX_STRING = 500;

function text(value, fallback = '', max = MAX_STRING) {
  const next = String(value ?? '').trim();
  if (!next) return fallback;
  return next.slice(0, max);
}

function safeHttpUrl(value, fallback = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

function normalizeLegacyHome(home = {}, defaults) {
  const primary = typeof home.primaryCta === 'object'
    ? home.primaryCta?.label
    : home.primaryCta;
  const secondary = typeof home.secondaryCta === 'object'
    ? home.secondaryCta?.label
    : home.secondaryCta;
  const newsEyebrow = home.newsEyebrow ?? home.newsHeading?.eyebrow;
  const newsTitle = home.newsTitle ?? home.newsHeading?.title;
  return {
    ...home,
    primaryCta: primary,
    secondaryCta: secondary,
    newsEyebrow,
    newsTitle
  };
}

function sanitizeStringMap(source = {}, defaults = {}, max = MAX_STRING) {
  const out = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    if (typeof fallback !== 'string') continue;
    // Present empty string is intentional (hide this copy on the live page).
    if (Object.prototype.hasOwnProperty.call(source, key) && typeof source[key] === 'string') {
      out[key] = String(source[key]).trim().slice(0, max);
    } else {
      out[key] = fallback;
    }
  }
  // Inclusive: keep extra string fields staff already saved (future-proof).
  for (const [key, value] of Object.entries(source)) {
    if (key in out) continue;
    if (typeof value === 'string') out[key] = String(value).trim().slice(0, max);
  }
  return out;
}

function sanitizeSocialLinks(links, defaults) {
  const rows = Array.isArray(links) ? links : defaults;
  const sanitized = rows.slice(0, 12).map((link, index) => {
    const fallback = defaults[index] || defaults[0] || {
      id: `link-${index}`, icon: '✦', label: 'Link', handle: '', url: 'https://example.com'
    };
    return {
      id: text(link?.id, fallback.id, 32) || `link-${index}`,
      icon: text(link?.icon, fallback.icon, 8),
      label: text(link?.label, fallback.label, 40),
      handle: text(link?.handle, fallback.handle, 60),
      url: safeHttpUrl(link?.url, fallback.url)
    };
  });
  if (!sanitized.length) throw new Error('At least one social link is required.');
  return sanitized;
}

function sanitizeQuickLinks(links, defaults) {
  const rows = Array.isArray(links) ? links : defaults;
  const mapped = rows
    .map((link, index) => {
      const id = String(link?.id || HOME_QUICK_LINK_IDS[index] || '').trim();
      if (!QUICK_LINK_SET.has(id)) return null;
      const fallback = defaults.find(entry => entry.id === id) || defaults[index];
      return { id, label: text(link?.label, fallback?.label || id, 40) };
    })
    .filter(Boolean);
  return HOME_QUICK_LINK_IDS.map(id => (
    mapped.find(link => link.id === id)
    || defaults.find(link => link.id === id)
  )).filter(Boolean);
}

export function sanitizeWebsiteContent(input) {
  const defaults = cloneDefaultWebsiteContent();
  const source = input && typeof input === 'object' ? input : {};
  const homeSource = normalizeLegacyHome(source.home || {}, defaults.home);

  const result = {
    version: 4,
    home: {
      ...sanitizeStringMap(homeSource, {
        eyebrow: defaults.home.eyebrow,
        title: defaults.home.title,
        lead: defaults.home.lead,
        primaryCta: defaults.home.primaryCta,
        secondaryCta: defaults.home.secondaryCta,
        newsEyebrow: defaults.home.newsEyebrow,
        newsTitle: defaults.home.newsTitle,
        newsLoading: defaults.home.newsLoading
      }),
      quickLinks: sanitizeQuickLinks(homeSource.quickLinks, defaults.home.quickLinks)
    },
    binderLanding: sanitizeStringMap(source.binderLanding || {}, defaults.binderLanding),
    reveal: sanitizeStringMap(source.reveal || {}, defaults.reveal),
    binderSidePanel: sanitizeStringMap(source.binderSidePanel || {}, defaults.binderSidePanel),
    binderFullView: sanitizeStringMap(source.binderFullView || {}, defaults.binderFullView),
    daily: sanitizeStringMap(source.daily || {}, defaults.daily),
    shop: sanitizeStringMap(source.shop || {}, defaults.shop),
    events: sanitizeStringMap(source.events || {}, defaults.events),
    redeem: sanitizeStringMap(source.redeem || {}, defaults.redeem),
    collection: sanitizeStringMap(source.collection || {}, defaults.collection),
    starBits: sanitizeStringMap(source.starBits || {}, defaults.starBits),
    checklist: sanitizeStringMap(source.checklist || {}, defaults.checklist),
    trades: sanitizeStringMap(source.trades || {}, defaults.trades),
    offers: sanitizeStringMap(source.offers || {}, defaults.offers),
    notifications: sanitizeStringMap(source.notifications || {}, defaults.notifications),
    rewards: sanitizeStringMap(source.rewards || {}, defaults.rewards),
    profile: sanitizeStringMap(source.profile || {}, defaults.profile),
    collector: sanitizeStringMap(source.collector || {}, defaults.collector),
    rankings: sanitizeStringMap(source.rankings || {}, defaults.rankings),
    about: sanitizeStringMap(source.about || {}, defaults.about),
    socials: {
      ...sanitizeStringMap(source.socials || {}, {
        eyebrow: defaults.socials.eyebrow,
        title: defaults.socials.title,
        lead: defaults.socials.lead
      }),
      links: sanitizeSocialLinks(source.socials?.links, defaults.socials.links)
    },
    login: sanitizeStringMap(source.login || {}, defaults.login),
    shared: sanitizeStringMap(source.shared || {}, defaults.shared)
  };

  return result;
}

export function mergeWebsiteContent(remote) {
  try {
    return sanitizeWebsiteContent(remote && typeof remote === 'object' ? remote : cloneDefaultWebsiteContent());
  } catch {
    return cloneDefaultWebsiteContent();
  }
}

/** Humanize a camelCase / dotted field key for admin labels. */
export function labelForFieldKey(key) {
  return String(key || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}
