import {
  cloneDefaultShellNavigation,
  PUBLIC_SHELL_DESTINATIONS,
  SHELL_LABEL_REWRITES,
  SHELL_LAYOUT_MODES
} from './shell-navigation-defaults.js';
import { isKnownShellRoute } from './shell-route-utils.js';
import { isShellNavIconId, shellNavIconForKey } from './shell-nav-icons.js';

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
  if (icon.type === 'svg' && icon.value) {
    return {
      type: 'svg',
      value: String(icon.value).trim().slice(0, 40)
    };
  }
  return { type: 'emoji', value: String(icon.value || '').slice(0, 8) };
}

/** Prefer cohesive SVG icons over legacy emoji; keep custom uploads. */
function upgradeShellIcon(icon, key) {
  if (icon?.type === 'image' && icon.url) return icon;
  if (icon?.type === 'svg' && isShellNavIconId(icon.value)) return icon;
  const upgraded = shellNavIconForKey(key);
  if (upgraded.type === 'svg') return upgraded;
  return icon;
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

/** Move checklist → Collection when remote nav still uses the prior layout. */
function relocateSidebarDestinations(sections, defaults) {
  const moves = [
    { destination: 'checklist', targetSectionId: 'collect' }
  ];

  for (const move of moves) {
    const targetSection = sections.find(section => section.id === move.targetSectionId)
      || sections.find(section => {
        const defaultSection = (defaults.sidebar?.sections || []).find(entry => entry.id === move.targetSectionId);
        return defaultSection && section.label === defaultSection.label;
      });
    if (!targetSection) continue;

    let relocated = null;
    for (const section of sections) {
      if (section === targetSection) continue;
      const index = (section.items || []).findIndex(item => item.destination === move.destination);
      if (index < 0) continue;
      relocated = section.items.splice(index, 1)[0];
      break;
    }
    if (!relocated) continue;
    if ((targetSection.items || []).some(item => item.destination === move.destination)) continue;

    const defaultSection = (defaults.sidebar?.sections || []).find(entry => entry.id === move.targetSectionId);
    const defaultOrder = (defaultSection?.items || []).map(item => item.destination);
    const desiredIndex = defaultOrder.indexOf(move.destination);
    if (desiredIndex < 0) {
      targetSection.items.push(relocated);
      continue;
    }

    let insertAt = targetSection.items.length;
    for (let i = desiredIndex + 1; i < defaultOrder.length; i += 1) {
      const afterIndex = targetSection.items.findIndex(item => item.destination === defaultOrder[i]);
      if (afterIndex >= 0) {
        insertAt = afterIndex;
        break;
      }
    }
    if (insertAt === targetSection.items.length) {
      for (let i = desiredIndex - 1; i >= 0; i -= 1) {
        const beforeIndex = targetSection.items.findIndex(item => item.destination === defaultOrder[i]);
        if (beforeIndex >= 0) {
          insertAt = beforeIndex + 1;
          break;
        }
      }
    }
    targetSection.items.splice(insertAt, 0, relocated);
  }

  return sections;
}

/** Daily Pack lives on the top bar; keep it out of sidebar/mega sections. */
function stripDailyFromSidebar(sections = []) {
  for (const section of sections) {
    section.items = (section.items || []).filter(item => item.destination !== 'daily');
  }
  return sections;
}

/** Refresh Cards mega to Gallery / Series / Event / Special when remote nav is stale. */
function normalizeCardsSection(sections, defaults) {
  const cards = sections.find(section => section.id === 'cards');
  const defaultCards = (defaults.sidebar?.sections || []).find(section => section.id === 'cards');
  if (!cards || !defaultCards) return sections;

  const items = [...(cards.items || [])];
  const seriesIndex = items.findIndex(item =>
    item.id === 'card-series' || /^card series$/i.test(String(item.label || '').trim())
  );
  const seriesItem = seriesIndex >= 0 ? items[seriesIndex] : null;
  const seriesIsClickable = seriesItem
    && seriesItem.destination === 'binder'
    && !(seriesItem.features || []).includes('sectionLabel')
    && !(seriesItem.features || []).includes('seriesLinksSlot');

  const needsReset = items.some(item => item.destination === 'daily')
    || !items.some(item => item.id === 'event-cards')
    || !items.some(item => item.id === 'special-cards')
    || !seriesIsClickable;

  if (needsReset) {
    cards.items = defaultCards.items.map((item, index) => sanitizeItem(item, index));
  }
  return sections;
}

const SHOP_SECTION_DESTINATIONS = new Set(['shop', 'season-pass', 'redeem']);

/** Keep shop/economy items out of My Collection, and Card Series under Cards. */
function normalizeCollectSection(sections, defaults) {
  const collect = sections.find(section => section.id === 'collect');
  if (!collect) return sections;

  collect.items = (collect.items || []).filter(item =>
    item.id !== 'card-series'
    && !/^card series$/i.test(String(item.label || '').trim())
    && !SHOP_SECTION_DESTINATIONS.has(item.destination)
  );

  const starBits = collect.items.find(item => item.destination === 'star-bits');
  if (starBits && /^star bits$/i.test(String(starBits.label || '').trim())) {
    starBits.label = 'My Star Bits';
  }
  const collectionItem = collect.items.find(item => item.destination === 'collection');
  if (collectionItem && /^my collection$/i.test(String(collectionItem.label || '').trim())) {
    collectionItem.label = 'My Card Binder';
  }
  return sections;
}

/** Ensure Shop is its own mega with Card Shop / Twitch Season Pass / Redeem Code. */
function normalizeShopSection(sections, defaults) {
  const defaultShop = (defaults.sidebar?.sections || []).find(section => section.id === 'shop');
  if (!defaultShop) return sections;

  const collect = sections.find(section => section.id === 'collect');
  if (collect) {
    collect.items = (collect.items || []).filter(item => !SHOP_SECTION_DESTINATIONS.has(item.destination));
  }

  let shop = sections.find(section => section.id === 'shop');
  const needsReset = !shop
    || !(shop.items || []).some(item => item.destination === 'shop')
    || !(shop.items || []).some(item => item.destination === 'season-pass')
    || !(shop.items || []).some(item => item.destination === 'redeem')
    || (shop.items || []).some(item => item.destination === 'shop' && /^shop$/i.test(String(item.label || '').trim()));

  if (!shop) {
    shop = sanitizeSection(structuredClone(defaultShop), sections.length);
    const collectIndex = sections.findIndex(section => section.id === 'collect');
    const communityIndex = sections.findIndex(section => section.id === 'community');
    const insertAt = collectIndex >= 0
      ? collectIndex + 1
      : (communityIndex >= 0 ? communityIndex : sections.length);
    sections.splice(insertAt, 0, shop);
  } else if (needsReset) {
    shop.label = 'Shop';
    shop.mega = true;
    shop.items = defaultShop.items.map((item, index) => sanitizeItem(item, index));
  } else {
    shop.label = 'Shop';
    shop.mega = true;
  }

  return sections;
}

function ensureDefaultSidebarSections(sections, defaults) {
  const defaultSections = defaults.sidebar?.sections || [];
  const result = [...sections];

  defaultSections.forEach((defaultSection, defaultIndex) => {
    if (result.some(section => section.id === defaultSection.id)) return;
    const insert = sanitizeSection(structuredClone(defaultSection), defaultIndex);
    let insertAt = result.length;
    for (let i = defaultIndex - 1; i >= 0; i -= 1) {
      const prevIndex = result.findIndex(section => section.id === defaultSections[i].id);
      if (prevIndex >= 0) {
        insertAt = prevIndex + 1;
        break;
      }
    }
    result.splice(insertAt, 0, insert);
  });

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
  if (id === 'collect' && /^(collect|collection|my collection)$/i.test(label)) return 'My Collection';
  if (id === 'shop' && /^(shop|card shop)$/i.test(label)) return 'Shop';
  if (id === 'community' && /^(community|community hub)$/i.test(label)) return 'Community';
  if (id === 'account' && /^account$/i.test(label)) return 'Account';
  return label || section.label;
}

/** Drop Events/Trade from the top bar (they live under Community) and keep Daily Pack + READY badge. */
function normalizeTopBarQuickLinks(links, defaults) {
  const defaultLinks = Array.isArray(defaults.topBar?.quickLinks) ? defaults.topBar.quickLinks : [];
  const defaultHome = defaultLinks.find(link => link.destination === 'home') || {
    id: 'home-top',
    label: 'Home',
    destination: 'home',
    enabled: true,
    features: []
  };
  const defaultDaily = defaultLinks.find(link => link.destination === 'daily') || {
    id: 'daily-top',
    label: 'Free Daily Card Pack',
    destination: 'daily',
    enabled: true,
    features: ['dailyBadge'],
    className: 'shell-daily-top-link'
  };

  const communityDupes = new Set(['events', 'trades', 'offers']);
  const cleaned = (Array.isArray(links) ? links : [])
    .filter(link => link && !communityDupes.has(String(link.destination || '')));

  const withHome = cleaned.some(link => link.destination === 'home')
    ? cleaned
    : [defaultHome, ...cleaned];

  const dailyIndex = withHome.findIndex(link => link.destination === 'daily');
  let next;
  if (dailyIndex < 0) {
    next = [...withHome, { ...defaultDaily, features: [...(defaultDaily.features || [])] }];
  } else {
    next = withHome.map((link, index) => {
      if (index !== dailyIndex) return link;
      const features = new Set(link.features || []);
      features.add('dailyBadge');
      const label = /^free daily( starlight)? (card )?pack$/i.test(String(link.label || '').trim())
        || !String(link.label || '').trim()
        ? defaultDaily.label
        : link.label;
      return {
        ...link,
        label,
        features: [...features],
        className: link.className || defaultDaily.className || 'shell-daily-top-link'
      };
    });
  }

  return next.slice(0, 10);
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
  next.icon = upgradeShellIcon(next.icon, next.id);
  next.items = next.items.map((item) => ({
    ...item,
    icon: upgradeShellIcon(item.icon, item.destination || item.id)
  }));
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

  const quickLinks = normalizeTopBarQuickLinks(
    Array.isArray(source.topBar?.quickLinks)
      ? source.topBar.quickLinks.slice(0, 10).map((link, index) => {
        const destination = String(link.destination || '').trim();
        if (!ALLOWED_DESTINATIONS.has(destination)) {
          throw new Error(`Unsupported top-bar destination: ${destination || '(empty)'}`);
        }
        const features = Array.isArray(link.features)
          ? link.features.map(String).filter(Boolean).slice(0, 8)
          : [];
        const rawLabel = String(link.label || destination).trim().slice(0, 40) || destination;
        return {
          id: String(link.id || `top-${index}`).slice(0, 64),
          label: rewriteLegacyLabel(destination, rawLabel, destination).slice(0, 40),
          destination,
          enabled: link.enabled !== false,
          features,
          className: String(link.className || '').trim().slice(0, 80)
        };
      })
      : defaults.topBar.quickLinks,
    defaults
  );

  const sections = normalizeShopSection(
    normalizeCollectSection(
      normalizeCardsSection(
        stripDailyFromSidebar(
          ensureDefaultSidebarItems(
            ensureDefaultSidebarSections(
              relocateSidebarDestinations(
                Array.isArray(source.sidebar?.sections)
                  ? source.sidebar.sections.map(sanitizeSection).slice(0, 8)
                  : defaults.sidebar.sections.map(sanitizeSection),
                defaults
              ),
              defaults
            ),
            defaults
          )
        ),
        defaults
      ),
      defaults
    ),
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
  const sourceVersion = Number(source.version) || 0;
  const defaultVersion = Number(defaults.version) || 3;
  let layoutRaw = String(chromeSource.layout || defaults.chrome?.layout || 'masthead').trim().toLowerCase();
  if (sourceVersion < 3 && layoutRaw === 'hybrid') {
    layoutRaw = 'masthead';
  }
  const layout = SHELL_LAYOUT_MODES.includes(layoutRaw) ? layoutRaw : defaults.chrome.layout;
  const showLiveFeed = chromeSource.showLiveFeed !== false
    && chromeSource.show_live_feed !== false
    && chromeSource.liveFeed !== false;
  const version = sourceVersion >= defaultVersion ? sourceVersion : defaultVersion;

  return {
    version,
    brandRibbon: String(source.brandRibbon ?? defaults.brandRibbon).trim().slice(0, 40) || defaults.brandRibbon,
    chrome: { layout, showLiveFeed },
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