import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneDefaultShellNavigation, PUBLIC_SHELL_DESTINATIONS } from '../docs/js/shell-navigation-defaults.js';
import { mergeShellNavigation, sanitizeShellNavigation } from '../docs/js/shell-navigation-model.js';
import { loginShellHref } from '../docs/js/shell-route-utils.js';
import { readFile } from 'node:fs/promises';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('default shell navigation includes core destinations and staff account link', () => {
  const nav = cloneDefaultShellNavigation();
  const ids = nav.sidebar.sections.map(section => section.id);
  assert.deepEqual(ids.slice(0, 3), ['cards', 'collect', 'community']);
  assert.equal(nav.sidebar.sections[0].label, 'Starlight Cards Gallery');
  assert.equal(nav.sidebar.sections[1].label, 'My Collection');
  assert.ok(!nav.sidebar.sections.some(section => section.id === 'series'));
  assert.ok(!nav.sidebar.sections.some(section => section.staffOnly));
  assert.ok(nav.accountMenu.signedIn.some(item =>
    item.destination === 'admin' && (item.features || []).includes('staffOnly')
  ));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'offers'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'feed' && entry.label === 'LIVE Feed'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'collection' && entry.label === 'My Card Album Binder'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'daily' && entry.label === 'Free Daily Booster'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'shop' && entry.label === 'Card Boutique'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'checklist' && entry.label === 'Star Registry'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'quests' && entry.label === 'Starlight Missions'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'trades' && entry.label === 'Trade With Others'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'profile' && entry.label === 'Profile'));
  const collect = nav.sidebar.sections.find(section => section.id === 'collect');
  const community = nav.sidebar.sections.find(section => section.id === 'community');
  assert.ok(community.items.some(item => item.destination === 'trades' && item.label === 'Trade With Others'));
  assert.ok(community.items.some(item => item.destination === 'rankings' && item.label === 'User Rankings'));
  assert.ok(community.items.some(item => item.destination === 'feed' && item.label === 'LIVE Feed'));
  assert.ok(collect.items.some(item => item.destination === 'quests' && item.label === 'Starlight Missions'));
  assert.equal(nav.pageTitles.feed, 'LIVE Feed');
  assert.equal(nav.pageTitles.collection, 'My Card Album Binder');
  assert.equal(nav.pageTitles.binder, 'Starlight Card Gallery');
  assert.equal(nav.pageTitles.daily, 'Daily Free Booster Pack');
  assert.ok(nav.topBar.quickLinks.some(link => link.destination === 'events'));
  assert.ok(nav.accountMenu.signedIn.some(item => (item.features || []).includes('notificationBadge')));
  assert.ok(nav.accountMenu.signedIn.some(item => (item.features || []).includes('receivedGiftBadge')));
  assert.ok(nav.accountMenu.signedIn.some(item => (item.features || []).includes('tradeOfferBadge')));
  assert.ok(nav.accountMenu.signedOut.some(item => (item.features || []).includes('signIn')));
});

test('sanitizeShellNavigation overwrites legacy product labels with new defaults', () => {
  const renamed = sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    pageTitles: {
      ...cloneDefaultShellNavigation().pageTitles,
      collection: 'My Card Collection & Favorites',
      daily: 'Free Daily Booster',
      shop: 'Starlight Card Shop',
      checklist: 'My Checklist',
      quests: 'Collection Quests',
      trades: 'Wishlist & Trades',
      profile: 'Profile & Settings',
      feed: 'Pull Feed'
    },
    sidebar: {
      sections: [{
        id: 'my-stuff',
        label: 'My Stuff',
        icon: { type: 'emoji', value: '♡' },
        staffOnly: false,
        items: [
          { id: 'collection', label: 'My Card Collection & Favorites', destination: 'collection', enabled: true, features: [] },
          { id: 'daily', label: 'Free Daily Booster', destination: 'daily', enabled: true, features: [] },
          { id: 'feed', label: 'Pull Feed', destination: 'feed', enabled: true, features: [] }
        ]
      }]
    }
  });
  assert.equal(renamed.pageTitles.collection, 'My Card Album Binder');
  assert.equal(renamed.pageTitles.daily, 'Free Daily Booster');
  assert.equal(renamed.pageTitles.shop, 'Card Boutique');
  assert.equal(renamed.pageTitles.checklist, 'Star Registry');
  assert.equal(renamed.pageTitles.quests, 'Starlight Missions');
  assert.equal(renamed.pageTitles.trades, 'Trade With Others');
  assert.equal(renamed.pageTitles.profile, 'Profile');
  assert.equal(renamed.pageTitles.feed, 'LIVE Feed');
  assert.equal(renamed.sidebar.sections[0].items[0].label, 'My Card Album Binder');
  assert.equal(renamed.sidebar.sections[0].items[1].label, 'Free Daily Booster');
  assert.equal(renamed.sidebar.sections[0].items[2].label, 'LIVE Feed');
});

test('sanitizeShellNavigation rewrites Journal profile labels to Profile', () => {
  const renamed = sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    pageTitles: { ...cloneDefaultShellNavigation().pageTitles, profile: 'Journal' },
    sidebar: {
      sections: [{
        id: 'account',
        label: 'Account',
        icon: { type: 'emoji', value: '' },
        staffOnly: false,
        items: [
          { id: 'profile', label: 'Journal', destination: 'profile', enabled: true, features: [] }
        ]
      }]
    },
    accountMenu: {
      signedIn: [
        { id: 'profile-settings', label: 'Journal', destination: 'profile', enabled: true, features: [] }
      ],
      signedOut: cloneDefaultShellNavigation().accountMenu.signedOut
    }
  });
  assert.equal(renamed.pageTitles.profile, 'Profile');
  assert.equal(renamed.sidebar.sections[0].items[0].label, 'Profile');
  assert.equal(renamed.accountMenu.signedIn[0].label, 'Profile');
});

test('sanitizeShellNavigation merges duplicate trading hub sidebar links but keeps User Rankings separate', () => {
  const merged = sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    sidebar: {
      sections: [{
        id: 'my-stuff',
        label: 'My Stuff',
        icon: { type: 'emoji', value: '♡' },
        staffOnly: false,
        items: [
          { id: 'wishlist', label: 'My Wishlist', destination: 'trades', enabled: true, features: [] },
          { id: 'rankings', label: 'User Rankings', destination: 'rankings', enabled: true, features: [] },
          { id: 'offers', label: 'Trade Offers', destination: 'offers', enabled: true, features: ['tradeOfferBadge'] }
        ]
      }]
    }
  });

  const tradingItems = merged.sidebar.sections[0].items.filter(item => item.destination === 'trades');
  const rankingItems = merged.sidebar.sections[0].items.filter(item => item.destination === 'rankings');
  assert.equal(tradingItems.length, 1);
  assert.equal(rankingItems.length, 1);
  assert.equal(tradingItems[0].label, 'Trade With Others');
  assert.equal(rankingItems[0].label, 'User Rankings');
  assert.ok(tradingItems[0].features.includes('tradeOfferBadge'));
  assert.ok(!merged.sidebar.sections[0].items.some(item => item.destination === 'offers'));
});

test('sanitizeShellNavigation injects User Rankings when remote nav omits it', () => {
  const defaults = cloneDefaultShellNavigation();
  const remoteSection = defaults.sidebar.sections.find(section => section.id === 'community');
  const remoteItems = (remoteSection?.items || []).filter(item => item.destination !== 'rankings');
  const merged = sanitizeShellNavigation({
    ...defaults,
    sidebar: {
      sections: [{
        ...remoteSection,
        items: remoteItems
      }]
    }
  });

  assert.ok(merged.sidebar.sections[0].items.some(item => item.destination === 'rankings'));
  assert.equal(merged.pageTitles.rankings, 'User Rankings');
});

test('sanitizeShellNavigation rejects unknown destinations and merges empty remote', () => {
  const merged = mergeShellNavigation({});
  assert.equal(merged.brandRibbon, 'Starlight Cards');
  assert.ok(merged.accountMenu.signedIn.length > 0);
  const renamed = sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    pageTitles: { ...cloneDefaultShellNavigation().pageTitles, feed: 'Pull Feed' },
    sidebar: {
      sections: [{
        id: 'my-stuff',
        label: 'My Stuff',
        icon: { type: 'emoji', value: '♡' },
        staffOnly: false,
        items: [
          { id: 'feed', label: 'Pull Feed', destination: 'feed', enabled: true, features: [] }
        ]
      }]
    }
  });
  assert.equal(renamed.pageTitles.feed, 'LIVE Feed');
  assert.equal(renamed.sidebar.sections[0].items[0].label, 'LIVE Feed');
  assert.throws(() => sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    topBar: { quickLinks: [{ id: 'x', label: 'Bad', destination: 'not-real', enabled: true }] }
  }), /Unsupported top-bar destination/);
});

test('website UI admin page and migration are wired', async () => {
  const [html, page, hub, migration, embed, shell] = await Promise.all([
    read('docs/admin-ui.html'),
    read('docs/js/pages/admin-ui-page.js'),
    read('docs/admin-hub.html'),
    read('supabase/migrations/20260722040000_shell_navigation_settings.sql'),
    read('docs/js/embed-mode.js'),
    read('docs/js/app-shell.js')
  ]);
  assert.match(html, /Website User Interface/);
  assert.match(html, /Masthead Menus/);
  assert.match(html, /data-tab="account"/);
  assert.match(html, /64[\u00d7x]64/i);
  assert.match(page, /Mega menu \(desktop masthead\)/);
  assert.match(page, /clearSeries/);
  assert.match(page, /data-field="mega"/);
  assert.match(page, /uploadStudioAsset\(file, 'nav-icons'\)/);
  assert.match(page, /shellPreviewFrame|NAV_DRAFT|buildShellStudioPreviewUrl/);
  assert.match(html, /id="shellLayout"/);
  assert.match(page, /navigation\.chrome\.layout/);
  assert.match(page, /layoutSelect/);
  assert.match(hub, /admin-ui\.html/);
  assert.match(migration, /admin_save_shell_navigation/);
  assert.match(embed, /'admin-ui\.html':'admin-ui'/);
  assert.match(embed, /'login\.html':'login'/);
  assert.match(embed, /hasAuthReturnParams/);
  assert.match(embed, /currentRoute === 'login' && hasAuthReturnParams\(\)/);
  assert.match(embed, /html\.starlight-embedded \.home/);
  assert.match(shell, /login:\{title:'Sign In',src:'login'\}/);
  assert.match(shell, /navigate\('login',\{extra:\{mode\}\}\)/);
  assert.match(shell, /admin-ui/);
  assert.match(shell, /refreshShellBadges|data-notification-dot/);
  const shellCss = await read('docs/css/app-shell.css');
  assert.match(shellCss, /z-index:\s*5000/);
  assert.match(shellCss, /--shell-chrome-pad/);
  assert.match(shellCss, /shell-masthead-layout\.unified-shell \.shell-account-bar/);
});

test('shell refreshes Star Bits totals when wallet or rewards change', async () => {
  const [shell, economy, gifts, quests, season, shop, redeem, bits] = await Promise.all([
    read('docs/js/app-shell.js'),
    read('docs/js/shell-economy.js'),
    read('docs/js/pages/received-rewards-page.js'),
    read('docs/js/pages/collection-quests-page.js'),
    read('docs/js/pages/season-pass-page.js'),
    read('docs/js/pages/booster-shop-page.js'),
    read('docs/js/pages/redeem-page.js'),
    read('docs/js/pages/star-bits-page.js')
  ]);
  assert.match(economy, /export function notifyShellEconomyChanged/);
  assert.match(economy, /starlight-wallet-changed/);
  assert.match(economy, /starlight-dashboard-refresh/);
  assert.match(shell, /starlight-wallet-changed/);
  assert.match(shell, /starlight-rewards-changed[\s\S]*starlight-dashboard-refresh/);
  assert.match(gifts, /notifyShellEconomyChanged/);
  assert.match(quests, /notifyShellEconomyChanged/);
  assert.match(season, /notifyShellEconomyChanged/);
  assert.match(shop, /notifyShellEconomyChanged/);
  assert.match(redeem, /notifyShellEconomyChanged/);
  assert.match(bits, /notifyShellEconomyChanged/);
});

test('loginShellHref routes signed-out CTAs through the shell login view', () => {
  assert.equal(loginShellHref('signin'), 'binder?view=login&mode=signin');
  assert.equal(loginShellHref('signup'), 'binder?view=login&mode=signup');
  assert.equal(loginShellHref(), 'binder?view=login&mode=signin');
});

test('signed-out CTAs avoid standalone login.html links', async () => {
  const [shop, feed, comments, redeem, bits, profile, daily, collector, importPage] = await Promise.all([
    read('docs/js/pages/booster-shop-page.js'),
    read('docs/js/pages/pull-feed-page.js'),
    read('docs/js/card-comments.js'),
    read('docs/js/pages/redeem-page.js'),
    read('docs/js/pages/star-bits-page.js'),
    read('docs/js/pages/profile-settings-page.js'),
    read('docs/daily-booster.html'),
    read('docs/collector.html'),
    read('docs/import-collection.html')
  ]);

  for (const source of [shop, feed, comments, redeem, bits, profile]) {
    assert.doesNotMatch(source, /login\.html/);
  }
  assert.match(shop, /loginShellHref/);
  assert.match(comments, /loginShellHref/);
  assert.match(profile, /redirectToLogin/);
  assert.match(daily, /binder\?view=login/);
  assert.match(collector, /binder\?view=login/);
  assert.match(importPage, /binder\?view=login/);
});

test('sanitizeShellNavigation strips Series/Admin sidebar and keeps Admin Hub in account menu', () => {
  const cleaned = sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    sidebar: {
      sections: [
        {
          id: 'series',
          label: 'Series',
          icon: { type: 'emoji', value: '✦' },
          staffOnly: false,
          mega: true,
          items: [
            { id: 'all-series', label: 'All Series', destination: 'binder', enabled: true, features: ['clearSeries'] }
          ]
        },
        {
          id: 'cards',
          label: 'Cards',
          icon: { type: 'emoji', value: '🃏' },
          staffOnly: false,
          mega: true,
          items: [
            { id: 'binder', label: 'Starlight Card Gallery', destination: 'binder', enabled: true, features: [] }
          ]
        },
        {
          id: 'admin',
          label: 'Administration Hub',
          icon: { type: 'emoji', value: '🛠️' },
          staffOnly: true,
          mega: false,
          items: [
            { id: 'admin-hub', label: 'Open Administration Hub', destination: 'admin', enabled: true, features: ['staffOnly'] }
          ]
        }
      ]
    },
    accountMenu: {
      signedIn: [
        { id: 'profile-settings', label: 'Profile', destination: 'profile', enabled: true, features: [] },
        { id: 'sep-1', label: '', destination: '', enabled: true, features: ['separator'] },
        { id: 'sign-out', label: 'Sign Out', destination: '', enabled: true, features: ['signOut'] }
      ],
      signedOut: cloneDefaultShellNavigation().accountMenu.signedOut
    }
  });
  assert.ok(!cleaned.sidebar.sections.some(section => section.id === 'series'));
  assert.ok(!cleaned.sidebar.sections.some(section => section.id === 'admin'));
  assert.equal(cleaned.sidebar.sections.find(section => section.id === 'cards')?.label, 'Starlight Cards Gallery');
  assert.ok(cleaned.accountMenu.signedIn.some(item =>
    item.destination === 'admin' && (item.features || []).includes('staffOnly')
  ));
});

test('shell navigation render gates staff account items', async () => {
  const render = await read('docs/js/shell-navigation-render.js');
  assert.match(render, /features\.includes\('staffOnly'\) && !isStaff/);
  assert.match(render, /map\(item => renderAccountMenuItem\(item, \{ isStaff \}\)/);
});

test('sanitizeShellNavigation preserves chrome layout mode', () => {
  const hybrid = sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    chrome: { layout: 'hybrid' }
  });
  assert.equal(hybrid.chrome.layout, 'hybrid');

  const invalid = sanitizeShellNavigation({
    ...cloneDefaultShellNavigation(),
    chrome: { layout: 'sidebar-only' }
  });
  assert.equal(invalid.chrome.layout, 'masthead');
});

test('shell navigation render applies hybrid layout classes', async () => {
  const [render, shellCss] = await Promise.all([
    read('docs/js/shell-navigation-render.js'),
    read('docs/css/app-shell.css')
  ]);
  assert.match(render, /applyShellLayoutToDom/);
  assert.match(render, /shell-hybrid-layout/);
  assert.match(render, /layout === 'hybrid'/);
  assert.match(shellCss, /shell-hybrid-layout/);
  assert.match(shellCss, /grid-template-columns:var\(--shell-sidebar-w\)/);
});

test('shell navigation render and static shell HTML use extensionless binder hrefs', async () => {
  const [render, binderHtml, homeHtml] = await Promise.all([
    read('docs/js/shell-navigation-render.js'),
    read('docs/binder.html'),
    read('docs/home.html')
  ]);

  assert.match(render, /shellHref\(/);
  assert.match(render, /populateSeriesMegaMenus/);
  assert.match(render, /shell-mega-trigger/);
  assert.match(render, /data-series-mega-panel/);
  assert.doesNotMatch(render, /binder\.html\?/);
  assert.match(binderHtml, /href="binder\?view=home"/);
  assert.match(binderHtml, /shell-masthead/);
  assert.match(binderHtml, /shell-masthead-nav/);
  assert.match(homeHtml, /href="binder\?view=daily"/);
  assert.doesNotMatch(homeHtml, /binder\.html/);
});

test('shell masthead wires mega menus and series browse params', async () => {
  const [shell, defaults] = await Promise.all([
    read('docs/js/app-shell.js'),
    read('docs/js/shell-navigation-defaults.js')
  ]);
  assert.match(shell, /wireMastheadMenus/);
  assert.match(shell, /closeAllMegaMenus/);
  assert.match(shell, /stopPropagation/);
  assert.match(shell, /data-series-key|dataset\.seriesKey/);
  assert.match(shell, /applyStarlightSeriesFilter/);
  assert.match(shell, /locationExtraParams/);
  assert.doesNotMatch(shell, /pointerenter[\s\S]*openMegaMenu/);
  assert.match(defaults, /mega:\s*true/);
  assert.match(defaults, /clearSeries/);
  assert.match(defaults, /brandRibbon: 'Starlight Cards'/);
});

test('shell refreshes account chrome after embedded login', async () => {
  const [shell, loginPage] = await Promise.all([
    read('docs/js/app-shell.js'),
    read('docs/js/pages/login-page.js')
  ]);

  assert.match(shell, /onAuthStateChange/);
  assert.match(shell, /INITIAL_SESSION/);
  assert.match(shell, /syncShellSessionFromMessage/);
  assert.match(shell, /scheduleHydrateAccount/);
  assert.match(shell, /applyAccountChrome/);
  assert.match(shell, /starlight-auth-changed[\s\S]*syncShellSessionFromMessage/);
  assert.match(shell, /previousRoute==='login'[\s\S]*scheduleHydrateAccount/);
  assert.match(loginPage, /starlight-auth-changed[\s\S]*access_token/);
});
