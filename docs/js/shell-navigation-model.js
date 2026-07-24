import {
  cloneDefaultShellNavigation,
  PUBLIC_SHELL_DESTINATIONS,
  SHELL_LABEL_REWRITES
} from './shell-navigation-defaults.js';
import { isKnownShellRoute } from './shell-route-utils.js';

const ALLOWED_DESTINATIONS = new Set(PUBLIC_SHELL_DESTINATIONS.map(entry => entry.value));
const DEFAULT_DESTINATION_LABELS = Object.fromEntries(
  PUBLIC_SHELL_DESTINATIONS.map(entry => [entry.value, entry.label])
);

function rewriteLegacyLabel(destination, label, fallback) {
  const current = String(label || '').trim();
  if (!current) return fallback;
  const legacy = SHELL_LABEL_REWRITES[destination];
  if (!legacy?.length) return current;
  const matched = legacy.some(entry => entry.toLowerCase() === current.toLowerCase());
  return matched ? (DEFAULT_DESTINATION_LABELS[destination] || fallback || current) : current;
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
      ? rawLabel
      : rewriteLegacyLabel(destination, rawLabel, rawLabel),
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
      const next = String(value || '').trim().slice(0, 80) || defaults.pageTitles[key] || key;
      pageTitles[key] = rewriteLegacyLabel(key, next, defaults.pageTitles[key] || key);
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

  const sections = Array.isArray(source.sidebar?.sections)
    ? source.sidebar.sections.map(sanitizeSection).slice(0, 8)
    : defaults.sidebar.sections;

  if (!sections.length) throw new Error('At least one sidebar section is required.');

  // Overwrite legacy product labels with the current defaults.
  for (const key of Object.keys(pageTitles)) {
    pageTitles[key] = rewriteLegacyLabel(key, pageTitles[key], defaults.pageTitles[key] || key);
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
    signedIn: sanitizeAccountMenuItems(accountMenuSource.signedIn, defaults.accountMenu.signedIn),
    signedOut: sanitizeAccountMenuItems(accountMenuSource.signedOut, defaults.accountMenu.signedOut)
  };
  for (const list of [accountMenu.signedIn, accountMenu.signedOut]) {
    for (const item of list) {
      if (!item.destination) continue;
      item.label = rewriteLegacyLabel(item.destination, item.label, item.label);
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