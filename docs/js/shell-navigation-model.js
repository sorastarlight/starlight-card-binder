import { cloneDefaultShellNavigation, PUBLIC_SHELL_DESTINATIONS } from './shell-navigation-defaults.js';
import { isKnownShellRoute } from './shell-route-utils.js';

const ALLOWED_DESTINATIONS = new Set(PUBLIC_SHELL_DESTINATIONS.map(entry => entry.value));

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
  return {
    id: String(item.id || `item-${index}`).slice(0, 64),
    label: String(item.label || (isSeparator ? '' : 'Untitled')).trim().slice(0, 80) || (isSeparator ? '' : 'Untitled'),
    icon: asIcon(item.icon),
    destination,
    enabled: item.enabled !== false,
    features,
    className: String(item.className || '').trim().slice(0, 80)
  };
}

function sanitizeAccountMenuItems(items, fallback) {
  const source = Array.isArray(items) ? items : fallback;
  return source.map(sanitizeItem).slice(0, 16);
}

function sanitizeSection(section = {}, index = 0) {
  const items = Array.isArray(section.items) ? section.items.map(sanitizeItem).slice(0, 24) : [];
  return {
    id: String(section.id || `section-${index}`).slice(0, 64),
    label: String(section.label || 'Section').trim().slice(0, 80) || 'Section',
    icon: asIcon(section.icon),
    staffOnly: Boolean(section.staffOnly),
    items
  };
}

export function sanitizeShellNavigation(input) {
  const defaults = cloneDefaultShellNavigation();
  const source = input && typeof input === 'object' ? input : {};
  const pageTitles = { ...defaults.pageTitles };
  if (source.pageTitles && typeof source.pageTitles === 'object') {
    for (const [key, value] of Object.entries(source.pageTitles)) {
      if (!isKnownShellRoute(key)) continue;
      pageTitles[key] = String(value || '').trim().slice(0, 80) || defaults.pageTitles[key] || key;
    }
  }

  const quickLinks = Array.isArray(source.topBar?.quickLinks)
    ? source.topBar.quickLinks.slice(0, 10).map((link, index) => {
      const destination = String(link.destination || '').trim();
      if (!ALLOWED_DESTINATIONS.has(destination)) {
        throw new Error(`Unsupported top-bar destination: ${destination || '(empty)'}`);
      }
      return {
        id: String(link.id || `top-${index}`).slice(0, 64),
        label: String(link.label || destination).trim().slice(0, 40) || destination,
        destination,
        enabled: link.enabled !== false
      };
    })
    : defaults.topBar.quickLinks;

  const sections = Array.isArray(source.sidebar?.sections)
    ? source.sidebar.sections.map(sanitizeSection).slice(0, 8)
    : defaults.sidebar.sections;

  if (!sections.length) throw new Error('At least one sidebar section is required.');

  // Keep LIVE Feed naming in sync when older saves still say "Pull Feed".
  for (const section of sections) {
    for (const item of section.items || []) {
      if (item.destination === 'feed' && /^pull feed$/i.test(String(item.label || '').trim())) {
        item.label = 'LIVE Feed';
      }
    }
  }
  if (/^pull feed$/i.test(String(pageTitles.feed || '').trim())) {
    pageTitles.feed = 'LIVE Feed';
  }

  const accountMenuSource = source.accountMenu && typeof source.accountMenu === 'object'
    ? source.accountMenu
    : defaults.accountMenu;

  const accountMenu = {
    signedIn: sanitizeAccountMenuItems(accountMenuSource.signedIn, defaults.accountMenu.signedIn),
    signedOut: sanitizeAccountMenuItems(accountMenuSource.signedOut, defaults.accountMenu.signedOut)
  };
  for (const list of [accountMenu.signedIn, accountMenu.signedOut]) {
    for (const item of list) {
      if (item.destination === 'feed' && /^pull feed$/i.test(String(item.label || '').trim())) {
        item.label = 'LIVE Feed';
      }
    }
  }

  return {
    version: 1,
    brandRibbon: String(source.brandRibbon ?? defaults.brandRibbon).trim().slice(0, 40) || defaults.brandRibbon,
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