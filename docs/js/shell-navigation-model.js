import {
  cloneDefaultShellNavigation,
  PUBLIC_SHELL_DESTINATIONS,
  SHELL_LABEL_REWRITES,
  SHELL_LAYOUT_MODES
} from './shell-navigation-defaults.js';
import { isKnownShellRoute } from './shell-route-utils.js';

const ALLOWED_DESTINATIONS = new Set(PUBLIC_SHELL_DESTINATIONS.map(entry => entry.value));
const DEFAULT_DESTINATION_LABELS = Object.fromEntries(
  PUBLIC_SHELL_DESTINATIONS.map(entry => [entry.value, entry.label])
);

function rewriteLegacyLabel(destination, label, fallback, { preferFallback = false } = {}) {
  const current = String(label || '').trim();
  if (!current) return fallback;
  if (/^the community$|^community(\s+hub)?$/i.test(current)) return 'Community';
  const legacy = SHELL_LABEL_REWRITES[destination];
  if (!legacy?.length) return current;
  const matched = legacy.some(entry => entry.toLowerCase() === current.toLowerCase());
  if (!matched) return current;
  if (preferFallback) return fallback || DEFAULT_DESTINATION_LABELS[destination] || current;
  return DEFAULT_DESTINATION_LABELS[destination] || fallback || current;
}

function asIcon(icon) {
  if (!icon || typeof icon !== 'object') return { type: 'emoji', value: '' };
  if (icon.type === 'image' && icon.url) {
    return {
      type: 'image',
      url: String(icon.url),
      path: icon.path ? String(icon.path) : ''
    };
  }
  return { type: 'emoji', value: String(icon.value || '').slice(0, 8) };
}

function sanitizeItem(item = {}, index = 0) {
  const features = Array.isArray(item.features)
    ? item.features.map(String).filter(Boolean).slice(0, 8)
    : [];
  const isLabel = features.includes('sectionLabel');
  const isSeparator = features.includes('separator');
  const isAuthAction = features.some((feature) =>
    ['signOut', 'signIn', 'signUp', 'profileLink'].includes(feature)
  );
  const destination = isLabel || isSeparator ? '' : String(item.destination || '').trim();
  if (
    !isLabel &&
    !isSeparator &&
    !isAuthAction &&
    destination &&
    !ALLOWED_DESTINATIONS.has(destination) &&
    !isKnownShellRoute(destination)
  ) {
    throw new Error(`Unsupported navigation destination: ${destination}`);
  }
  const rawLabel = String(item.label || (isSeparator ? '' : 'Untitled')).trim().slice(0, 80)
    || (isSeparator ? '' : 'Untitled');
  return {
    id: String(item.id || `item-${index}`).slice(0, 64),
    label: isLabel || isSeparator
      ? rewriteLegacyLabel('', rawLabel, rawLabel)
      : rewriteLegacyLabel(destination, rawLabel, rawLabel),
    icon: asIcon(item.icon),
    destination,
    enabled: item.enabled !== false,
    features,
    className: String(item.className || '').trim().slice(0, 80),
    seriesKey: String(item.seriesKey || '').trim().slice(0, 120)
  };
}

function sanitizeAccountMenuItems(items, fallback) {
  const source = Array.isArray(items) ? items : fallback;
  return source.map(sanitizeItem).slice(0, 16);
}

function ensureAccountMenuAdminHub(signedIn, defaults) {
  const list = Array.isArray(signedIn) ? [...signedIn] : [];
  const hasAdmin = list.some(item =>
    item.destination === 'admin'
    || item.id === 'admin-hub'
    || ((item.features || []).includes('staffOnly') && /admin/i.test(item.label || ''))
  );
  if (hasAdmin) return list;
  const adminItem = (defaults.accountMenu?.signedIn || [])
    .find(item => item.destination === 'admin' || item.id === 'admin-hub');
  if (!adminItem) return list;
  const insert = sanitizeItem(adminItem, list.length);
  const sepIndex = list.findIndex(item => (item.features || []).includes('separator'));
  if (sepIndex >= 0) list.splice(sepIndex, 0, insert);
  else list.push(insert);
  return list;
}

function consolidateTradingNavItems(items = []) {
  const result = [];
  let tradingHubItem = null;

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const features = Array.isArray(item.features) ? item.features : [];
    if (features.includes('sectionLabel') || features.includes('separator')) {
      result.push(item);
      continue;
    }

    let destination = String(item.destination || '').trim();
    if (destination === 'offers') destination = 'trades';

    const label = String(item.label || '').trim();
    const isTradingEntry = destination === 'trades'
      || /wishlist|trade with others|trade offers|card exchange|trading hub/i.test(label);

    if (!isTradingEntry) {
      result.push(item);
      continue;
    }

    if (!tradingHubItem) {
      tradingHubItem = {
        ...item,
        destination: 'trades',
        label: DEFAULT_DESTINATION_LABELS.trades || 'Trade',
        features: [...features]
      };
      result.push(tradingHubItem);
      continue;
    }

    if (features.includes('tradeOfferBadge') && !tradingHubItem.features.includes('tradeOfferBadge')) {
      tradingHubItem.features = [...tradingHubItem.features, 'tradeOfferBadge'];
    }
  }

  return result;
}

function ensureDefaultSidebarItems(sections, defaults) {
  const defaultSections = defaults.sidebar?.sections || [];
  const presentDestinations = new Set();
  sections.forEach(section => {
    (section.items || []).forEach(item => {
      if (item.destination) presentDestinations.add(item.destination);
    });
  });

  defaultSections.forEach(defaultSection => {
    const targetSection = sections.find(section => section.id === defaultSection.id)
      || sections.find(section => section.label === defaultSection.label);
    if (!targetSection) return;

    (defaultSection.items || []).forEach(defaultItem => {
      const destination = String(defaultItem.destination || '').trim();
      if (!destination || presentDestinations.has(destination)) return;
      if ((defaultItem.features || []).includes('sectionLabel')) return;

      const insertItem = sanitizeItem(defaultItem, targetSection.items.length);
      const tradesIndex = targetSection.items.findIndex(item => item.destination === 'trades');
      if (tradesIndex >= 0 && destination !== 'trades') {
        targetSection.items.splice(tradesIndex + 1, 0, insertItem);
      } else {
        targetSection.items.push(insertItem);
      }
      presentDestinations.add(destination);
    });
  });

  return sections;
}

function rewriteSectionLabel(section) {
  const id = String(section.id || '');
  const label = String(section.label || '').trim();
  if (id === 'home') return '';
  if (id === 'cards' && /^(cards|starlight cards gallery)$/i.test(label)) return 'Cards';
  if (id === 'collect' && /^(collect|my collection)$/i.test(label)) return 'Collection';
  if (id === 'community' && /^(community|community hub)$/i.test(label)) return 'Community';
  if (id === 'account' && /^account$/i.test(label)) return 'Account';
  return label || section.label;
}

function sanitizeSection(section = {}, index = 0) {
  const items = Array.isArray(section.items) ? section.items.map(sanitizeItem).slice(0, 40) : [];
  const next = {
    id: String(section.id || `section-${index}`).slice(0, 64),
    label: String(section.label || 'Section').trim().slice(0, 80) || 'Section',
    icon: asIcon(section.icon),
    staffOnly: Boolean(section.staffOnly),
    mega: Boolean(section.mega),
    mobileOnly: Boolean(section.mobileOnly),
    items: consolidateTradingNavItems(items)
  };
  next.label = rewriteSectionLabel(next);
  return next;
}

export function sanitizeShellNavigation(input) {
  const defaults = cloneDefaultShellNavigation();
  const source = input && typeof input === 'object' ? input : {};
  const pageTitles = { ...defaults.pageTitles };
  if (source.pageTitles && typeof source.pageTitles === 'object') {
    for (const [key, value] of Object.entries(source.pageTitles)) {
      if (!isKnownShellRoute(key)) continue;
      const next = String(value || '').trim().slice(0, 80) || defaults.pageTitles[key] || key;
      pageTitles[key] = rewriteLegacyLabel(key, next, defaults.pageTitles[key] || key, {
        preferFallback: true
      });
    }
  }

  const quickLinks = Array.isArray(source.topBar?.quickLinks)
    ? source.topBar.quickLinks.slice(0, 10).map((link, index) => {
      const destination = String(link.destination || '').trim();
      if (!ALLOWED_DESTINATIONS.has(destination)) {
        throw new Error(`Unsupported top-bar destination: ${destination || '(empty)'}`);
      }
      const rawLabel = String(link.label || destination).trim().slice(0, 40) || destination;
      return {
        id: String(link.id || `top-${index}`).slice(0, 64),
        label: rewriteLegacyLabel(destination, rawLabel, destination).slice(0, 40),
        destination,
        enabled: link.enabled !== false
      };
    })
    : defaults.topBar.quickLinks;

  const sections = ensureDefaultSidebarItems(
    Array.isArray(source.sidebar?.sections)
      ? source.sidebar.sections.map(sanitizeSection).slice(0, 8)
      : defaults.sidebar.sections.map(sanitizeSection),
    defaults
  ).filter(section => section.id !== 'series' && section.id !== 'admin');

  if (!sections.length) throw new Error('At least one sidebar section is required.');

  for (const key of Object.keys(defaults.pageTitles)) {
    if (!pageTitles[key]) pageTitles[key] = defaults.pageTitles[key];
  }

  // Nav chrome uses clear destination labels; page titles keep magical defaults.
  for (const key of Object.keys(pageTitles)) {
    pageTitles[key] = rewriteLegacyLabel(key, pageTitles[key], defaults.pageTitles[key] || key, {
      preferFallback: true
    });
  }
  for (const section of sections) {
    for (const item of section.items || []) {
      if (!item.destination) continue;
      item.label = rewriteLegacyLabel(item.destination, item.label, item.label);
    }
  }

  const accountMenuSource = source.accountMenu && typeof source.accountMenu === 'object'
    ? source.accountMenu
    : defaults.accountMenu;

  const accountMenu = {
    signedIn: ensureAccountMenuAdminHub(
      sanitizeAccountMenuItems(accountMenuSource.signedIn, defaults.accountMenu.signedIn),
      defaults
    ),
    signedOut: sanitizeAccountMenuItems(accountMenuSource.signedOut, defaults.accountMenu.signedOut)
  };
  for (const list of [accountMenu.signedIn, accountMenu.signedOut]) {
    for (const item of list) {
      if (!item.destination) continue;
      item.label = rewriteLegacyLabel(item.destination, item.label, item.label);
    }
  }

  const chromeSource = source.chrome && typeof source.chrome === 'object' ? source.chrome : {};
  const layoutRaw = String(chromeSource.layout || defaults.chrome?.layout || 'masthead').trim().toLowerCase();
  const layout = SHELL_LAYOUT_MODES.includes(layoutRaw) ? layoutRaw : defaults.chrome.layout;

  return {
    version: Number(source.version) >= 2 ? 2 : 2,
    brandRibbon: String(source.brandRibbon ?? defaults.brandRibbon).trim().slice(0, 40) || defaults.brandRibbon,
    chrome: { layout },
    pageTitles,
    sidebar: { sections },
    topBar: { quickLinks },
    accountMenu
  };
}

export function mergeShellNavigation(remote) {
  try {
    return sanitizeShellNavigation(remote && typeof remote === 'object' ? remote : cloneDefaultShellNavigation());
  } catch {
    return cloneDefaultShellNavigation();
  }
}