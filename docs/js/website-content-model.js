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
      icon: text(link?.icon, fallback.icon, 48),
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

function sanitizeEnum(value, allowed, fallback) {
  const next = String(value ?? '').trim();
  return allowed.includes(next) ? next : fallback;
}

/** Overwrite known legacy page titles with the current product defaults. */
const WEBSITE_TITLE_REWRITES = Object.freeze({
  'Daily Wish': 'Daily Booster',
  'Daily Free Booster Pack': 'Daily Booster',
  'Free Daily Booster': 'Daily Booster',
  'Open Daily Wish': 'Open Daily Booster',
  '✨ Open Daily Wish': '✨ Open Daily Booster',
  'Starlight Card Shop': 'Shop',
  'Card Boutique': 'Shop',
  'Starlight Card Gallery': 'Card Gallery',
  'My Card Collection & Favorites': 'My Collection',
  'My Starlight Album': 'My Collection',
  'My Card Album Binder': 'My Collection',
  'My Checklist': 'Card Checklist',
  'Star Registry': 'Card Checklist',
  'Collection Quests': 'Missions',
  'Starlight Missions': 'Missions',
  'Seasonal Collection Pass': 'Season Pass',
  'Star Bits Exchange': 'Star Bits',
  '✨ Starlight Events': 'Events',
  'Starlight Events': 'Events',
  '🎟 Redeem a Code': 'Redeem Code',
  'Redeem A Code': 'Redeem Code',
  '💫 Wishlist & Trade Binder': 'Trade',
  'Wishlist & Trade Binder': 'Trade',
  '💫 Card Exchange': 'Trade',
  'Card Exchange': 'Trade',
  'My Wishlist': 'Trade',
  '💫 My Wishlist': 'Trade',
  'Trade Hub': 'Trade',
  '🤝 Trade Hub': 'Trade',
  'Trade With Others': 'Trade',
  '🤝 Trade With Others': 'Trade',
  'Trading Hub': 'Trade',
  '🤝 Trading Hub': 'Trade',
  'User Rankings': 'Rankings',
  '🎁 Received Gifts': 'Gifts',
  'Received Gifts': 'Gifts',
  'Open Trades': 'Browse Open Trades',
  'Trades In-Progress': 'My Trades In-Progress',
  'Event Achievements': 'Achievements',
  'Starlight Memories': 'Achievements',
  'My Journal': 'Profile',
  'Journal': 'Profile',
  'Limited-time cards, boosters, achievements, and titles live here.':
    'Limited-time cards, boosters, Achievements, and titles live here.',
  'Limited-time cards, boosters, Starlight Memories, and titles live here.':
    'Limited-time cards, boosters, Achievements, and titles live here.',
  'Trade updates, event announcements, achievements, rewards, and other Starlight news all live here.':
    'Trade updates, event announcements, Achievements, rewards, and other Starlight news all live here.',
  'Trade updates, event announcements, Starlight Memories, rewards, and other Starlight news all live here.':
    'Trade updates, event announcements, Achievements, rewards, and other Starlight news all live here.',
  'See how your profile, showcase, achievements, and trade lists appear.':
    'See how your profile, showcase, Achievements, and trade lists appear.',
  'See how your profile, showcase, Starlight Memories, and trade lists appear.':
    'See how your profile, showcase, Achievements, and trade lists appear.',
  'Visit Card Shop': 'Visit Shop',
  'Visit Card Boutique': 'Visit Shop',
  'Open My Starlight Album': 'Open My Collection',
  'Open My Card Album Binder': 'Open My Collection',
  'Open Star Bits Exchange': 'Open Star Bits',
  'Open Received Gifts': 'Open Gifts',
  '💫 Wishlist & Trade List': 'Trade',
  'Resets next UTC day:': 'Next reset:',
  'Resets next Monday UTC:': 'Next weekly reset:',
  'Resets each day at 00:00 UTC.': 'Resets once per day.',
  'Resets each Monday at 00:00 UTC.': 'Resets each Monday.',
  'Complete Daily and Weekly Missions to earn Star Bits and titles. Daily resets at 00:00 UTC. Weekly resets Monday 00:00 UTC.':
    'Complete Daily and Weekly Missions to earn Star Bits and titles. Reset times appear below in your local time.'
});

function rewriteLegacyWebsiteText(value) {
  const current = String(value ?? '').trim();
  if (!current) return current;
  return WEBSITE_TITLE_REWRITES[current] || current;
}

function applyWebsiteTitleRewrites(section = {}) {
  const out = { ...section };
  for (const [key, value] of Object.entries(out)) {
    if (typeof value === 'string') out[key] = rewriteLegacyWebsiteText(value);
  }
  return out;
}

function stripLegacyKeys(section = {}, keys = []) {
  const out = { ...section };
  for (const key of keys) delete out[key];
  return out;
}

const LEGACY_COLLECTION_PRESTIGE_KEYS = Object.freeze([
  'prestigeLegendEyebrow',
  'prestigeLegendTitle',
  'prestigeLegendLead',
  'prestigeStardust',
  'prestigeStarBit',
  'prestigeProtostar',
  'prestigeStarlight',
  'prestigeSuperStarlight',
  'prestigeStarlightBurst',
  'prestigeRookie',
  'prestigeChampion',
  'prestigeUltimate',
  'prestigeMega',
  'evolutionLabel'
]);

function sanitizeBinderDisplay(source = {}, defaults = {}) {
  return {
    sidePanel: sanitizeEnum(source.sidePanel, ['on', 'off'], defaults.sidePanel),
    unownedDisplay: sanitizeEnum(
      source.unownedDisplay,
      ['cardBack', 'dullPreview'],
      defaults.unownedDisplay
    ),
    collectionStatusFilter: sanitizeEnum(
      source.collectionStatusFilter,
      ['on', 'off'],
      defaults.collectionStatusFilter
    )
  };
}

export function sanitizeWebsiteContent(input) {
  const defaults = cloneDefaultWebsiteContent();
  const source = input && typeof input === 'object' ? input : {};
  const homeSource = normalizeLegacyHome(source.home || {}, defaults.home);

  const result = {
    version: 5,
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
    binderDisplay: sanitizeBinderDisplay(source.binderDisplay || {}, defaults.binderDisplay),
    daily: sanitizeStringMap(source.daily || {}, defaults.daily),
    shop: sanitizeStringMap(source.shop || {}, defaults.shop),
    events: sanitizeStringMap(source.events || {}, defaults.events),
    redeem: sanitizeStringMap(source.redeem || {}, defaults.redeem),
    collection: stripLegacyKeys(
      applyWebsiteTitleRewrites(sanitizeStringMap(source.collection || {}, defaults.collection)),
      LEGACY_COLLECTION_PRESTIGE_KEYS
    ),
    starBits: applyWebsiteTitleRewrites(sanitizeStringMap(source.starBits || {}, defaults.starBits)),
    checklist: applyWebsiteTitleRewrites(sanitizeStringMap(source.checklist || {}, defaults.checklist)),
    quests: applyWebsiteTitleRewrites(sanitizeStringMap(source.quests || {}, defaults.quests)),
    seasonPass: applyWebsiteTitleRewrites(sanitizeStringMap(source.seasonPass || {}, defaults.seasonPass)),
    trades: applyWebsiteTitleRewrites(sanitizeStringMap(source.trades || {}, defaults.trades)),
    offers: applyWebsiteTitleRewrites(sanitizeStringMap(source.offers || {}, defaults.offers)),
    notifications: applyWebsiteTitleRewrites(sanitizeStringMap(source.notifications || {}, defaults.notifications)),
    rewards: applyWebsiteTitleRewrites(sanitizeStringMap(source.rewards || {}, defaults.rewards)),
    profile: applyWebsiteTitleRewrites(sanitizeStringMap(source.profile || {}, defaults.profile)),
    collector: applyWebsiteTitleRewrites(sanitizeStringMap(source.collector || {}, defaults.collector)),
    rankings: applyWebsiteTitleRewrites(sanitizeStringMap(source.rankings || {}, defaults.rankings)),
    about: applyWebsiteTitleRewrites(sanitizeStringMap(source.about || {}, defaults.about)),
    socials: {
      ...applyWebsiteTitleRewrites(sanitizeStringMap(source.socials || {}, {
        eyebrow: defaults.socials.eyebrow,
        title: defaults.socials.title,
        lead: defaults.socials.lead
      })),
      links: sanitizeSocialLinks(source.socials?.links, defaults.socials.links)
    },
    login: applyWebsiteTitleRewrites(sanitizeStringMap(source.login || {}, defaults.login)),
    shared: applyWebsiteTitleRewrites(sanitizeStringMap(source.shared || {}, defaults.shared))
  };

  result.home = {
    ...applyWebsiteTitleRewrites(result.home),
    quickLinks: (result.home.quickLinks || []).map(link => ({
      ...link,
      label: rewriteLegacyWebsiteText(link.label)
    }))
  };
  result.daily = applyWebsiteTitleRewrites(result.daily);
  result.shop = applyWebsiteTitleRewrites(result.shop);
  result.events = applyWebsiteTitleRewrites(result.events);

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
