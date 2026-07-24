import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  cloneDefaultWebsiteContent,
  HOME_QUICK_LINK_IDS,
  WEBSITE_EDITOR_TABS
} from '../docs/js/website-content-defaults.js';
import {
  mergeWebsiteContent,
  sanitizeWebsiteContent
} from '../docs/js/website-content-model.js';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('default website content includes editable page groups', () => {
  const content = cloneDefaultWebsiteContent();
  assert.equal(content.version, 5);
  assert.ok(content.home.title);
  assert.ok(content.home.primaryCta);
  assert.ok(content.home.newsLoading);
  assert.ok(content.about.lead);
  assert.ok(content.about.seriesLoading);
  assert.ok(content.socials.links.length >= 1);
  assert.equal(content.login.brandTitle, 'Starlight Card Binder');
  assert.ok(content.binderLanding.title);
  assert.ok(content.binderLanding.splashTitle);
  assert.ok(content.reveal.packPrompt);
  assert.ok(content.reveal.resultsTitle);
  assert.ok(content.binderSidePanel.flipCta);
  assert.ok(content.binderSidePanel.ownedQtyLabel);
  assert.ok(content.binderFullView.scanEyebrow);
  assert.ok(content.binderFullView.illustratorLabel);
  assert.equal(content.binderDisplay.sidePanel, 'on');
  assert.equal(content.binderDisplay.unownedDisplay, 'cardBack');
  assert.equal(content.binderDisplay.collectionStatusFilter, 'on');
  assert.ok(content.daily.title);
  assert.ok(content.daily.readyTitle);
  assert.ok(content.daily.signInCta);
  assert.ok(content.shop.emptyCategory);
  assert.ok(content.shop.featuredKicker);
  assert.ok(content.events.emptyTitle);
  assert.ok(content.redeem.submitCta);
  assert.ok(content.collection.duplicatesCta);
  assert.ok(content.collection.emptyAllTitle);
  assert.ok(content.starBits.exchangeCta);
  assert.ok(content.checklist.exchangeTitle);
  assert.ok(content.quests.title);
  assert.ok(content.seasonPass.title);
  assert.ok(content.trades.emptyWishlist);
  assert.ok(content.offers.emptyIncoming);
  assert.ok(content.notifications.emptyTitle);
  assert.ok(content.notifications.markAllReadCta);
  assert.ok(content.rewards.emptyLead);
  assert.ok(content.profile.accountIntro);
  assert.ok(content.profile.imageSectionTitle);
  assert.ok(content.collector.statsTitle);
  assert.ok(content.collector.followCta);
  assert.ok(content.rankings.title);
  assert.ok(content.rankings.sortLevel);
  assert.ok(content.shared.infoStripCopyright);
  assert.deepEqual(
    content.home.quickLinks.map((link) => link.id),
    [...HOME_QUICK_LINK_IDS]
  );
  assert.deepEqual(
    WEBSITE_EDITOR_TABS.map((tab) => tab.id),
    [
      'home',
      'binderLanding',
      'reveal',
      'binderSidePanel',
      'binderFullView',
      'binderDisplay',
      'daily',
      'shop',
      'events',
      'redeem',
      'collection',
      'starBits',
      'starlightEvolution',
      'checklist',
      'quests',
      'seasonPass',
      'trades',
      'offers',
      'notifications',
      'rewards',
      'profile',
      'collector',
      'rankings',
      'about',
      'socials',
      'login',
      'shared'
    ]
  );
});

test('sanitizeWebsiteContent keeps quick-link ids and rejects bad social urls', () => {
  const sanitized = sanitizeWebsiteContent({
    home: {
      title: '  Fresh Home Title  ',
      quickLinks: [
        { id: 'shop', label: 'Shop Now' },
        { id: 'unknown', label: 'Nope' },
        { id: 'collection', label: 'My Collection' }
      ]
    },
    socials: {
      links: [
        { id: 'x', icon: 'X', label: 'X', handle: '@x', url: 'javascript:alert(1)' },
        { id: 'site', icon: '🌐', label: 'Site', handle: 'example.com', url: 'https://example.com/path' }
      ]
    }
  });

  assert.equal(sanitized.version, 5);
  assert.equal(sanitized.home.title, 'Fresh Home Title');
  assert.deepEqual(
    sanitized.home.quickLinks.map((link) => link.id),
    [...HOME_QUICK_LINK_IDS]
  );
  assert.equal(
    sanitized.home.quickLinks.find((link) => link.id === 'shop')?.label,
    'Shop Now'
  );
  assert.equal(sanitized.socials.links[0].url, cloneDefaultWebsiteContent().socials.links[0].url);
  assert.equal(sanitized.socials.links[1].url, 'https://example.com/path');
});

test('mergeWebsiteContent falls back to defaults for empty remote', () => {
  const merged = mergeWebsiteContent({});
  assert.equal(merged.about.title, cloneDefaultWebsiteContent().about.title);
  assert.equal(merged.binderLanding.eyebrow, 'Starlight Cards');
  assert.equal(merged.daily.badge, 'FREE • DAILY');
  assert.equal(merged.version, 5);
});

test('sanitizeWebsiteContent clamps binderDisplay enums to defaults', () => {
  const sanitized = sanitizeWebsiteContent({
    binderDisplay: {
      sidePanel: 'maybe',
      unownedDisplay: 'glow',
      collectionStatusFilter: 'yes'
    }
  });
  assert.equal(sanitized.binderDisplay.sidePanel, 'on');
  assert.equal(sanitized.binderDisplay.unownedDisplay, 'cardBack');
  assert.equal(sanitized.binderDisplay.collectionStatusFilter, 'on');

  const valid = sanitizeWebsiteContent({
    binderDisplay: {
      sidePanel: 'off',
      unownedDisplay: 'dullPreview',
      collectionStatusFilter: 'off'
    }
  });
  assert.equal(valid.binderDisplay.sidePanel, 'off');
  assert.equal(valid.binderDisplay.unownedDisplay, 'dullPreview');
  assert.equal(valid.binderDisplay.collectionStatusFilter, 'off');
  assert.equal(valid.version, 5);
});

test('mergeWebsiteContent fills binderDisplay defaults for legacy payloads', () => {
  const merged = mergeWebsiteContent({
    version: 4,
    about: { title: 'Custom About' }
  });
  assert.equal(merged.about.title, 'Custom About');
  assert.equal(merged.binderDisplay.sidePanel, 'on');
  assert.equal(merged.binderDisplay.unownedDisplay, 'cardBack');
  assert.equal(merged.binderDisplay.collectionStatusFilter, 'on');
  assert.equal(merged.version, 5);
});

test('website editor field meta covers binder splash and admin visual chrome', async () => {
  const { WEBSITE_PAGE_META, listedFieldKeys } = await import('../docs/js/website-content-field-meta.js');
  assert.ok(WEBSITE_PAGE_META.binderLanding);
  assert.ok(listedFieldKeys('binderLanding').includes('splashTitle'));
  assert.ok(WEBSITE_PAGE_META.reveal);
  assert.ok(listedFieldKeys('reveal').includes('packPrompt'));
  assert.ok(WEBSITE_PAGE_META.binderSidePanel);
  assert.ok(listedFieldKeys('binderSidePanel').includes('ownedQtyLabel'));
  assert.ok(WEBSITE_PAGE_META.binderFullView);
  assert.ok(listedFieldKeys('binderFullView').includes('scanEyebrow'));
  assert.ok(WEBSITE_PAGE_META.binderDisplay);
  assert.ok(listedFieldKeys('binderDisplay').includes('sidePanel'));
  assert.ok(listedFieldKeys('binderDisplay').includes('unownedDisplay'));
  assert.equal(WEBSITE_PAGE_META.binderDisplay.groups[0].fields[0].control, 'select');
  assert.ok(listedFieldKeys('daily').includes('readyTitle'));
  assert.ok(WEBSITE_PAGE_META.collector);
  assert.equal(WEBSITE_PAGE_META.collector.previewUrl, 'collector.html');
  assert.ok(listedFieldKeys('collector').includes('statsTitle'));
  assert.ok(listedFieldKeys('collector').includes('followCta'));
  assert.ok(WEBSITE_PAGE_META.rankings);
  assert.equal(WEBSITE_PAGE_META.rankings.previewUrl, 'user-rankings.html');
  assert.ok(listedFieldKeys('rankings').includes('title'));
  assert.ok(listedFieldKeys('rankings').includes('wishlistCta'));
  assert.ok(listedFieldKeys('collection').includes('prestigeLegendTitle'));
  assert.ok(WEBSITE_PAGE_META.quests);
  assert.equal(WEBSITE_PAGE_META.quests.previewUrl, 'collection-quests.html');
  assert.ok(listedFieldKeys('quests').includes('claimCta'));
  assert.ok(WEBSITE_PAGE_META.seasonPass);
  assert.equal(WEBSITE_PAGE_META.seasonPass.previewUrl, 'season-pass.html');
  assert.ok(listedFieldKeys('seasonPass').includes('lockedLabel'));
  const html = await read('docs/admin-website.html');
  const page = await read('docs/js/pages/admin-website-page.js');
  assert.match(html, /fieldSearch/);
  assert.match(html, /resetPageBtn/);
  assert.match(html, /admin-website-page\.js\?v=2\.4/);
  assert.match(html, /previewFrame|Live preview/);
  assert.match(page, /WEBSITE_PAGE_META|getPageMeta/);
  assert.match(page, /renderGroupedFields|field-group/);
  assert.match(page, /splashTitle/);
  assert.match(page, /control === 'select'|control: 'select'/);
  assert.match(page, /data-visibility-path|Show on page/);
  assert.match(page, /renderPreview|CONTENT_DRAFT|buildContentStudioPreviewUrl/);
});

test('sanitizeWebsiteContent preserves intentionally blank hideable fields', () => {
  const sanitized = sanitizeWebsiteContent({
    binderLanding: {
      eyebrow: '',
      title: 'Custom Binder',
      splashTitle: ''
    },
    home: {
      eyebrow: '',
      title: 'Still here'
    }
  });
  assert.equal(sanitized.binderLanding.eyebrow, '');
  assert.equal(sanitized.binderLanding.splashTitle, '');
  assert.equal(sanitized.binderLanding.title, 'Custom Binder');
  assert.equal(sanitized.home.eyebrow, '');
  assert.equal(sanitized.home.title, 'Still here');
  assert.ok(sanitized.home.lead);
});

test('website editor admin page and public hooks are wired', async () => {
  const [
    html,
    page,
    hydrate,
    hub,
    embed,
    shell,
    routes,
    home,
    about,
    socials,
    login,
    binder,
    daily,
    shop,
    events,
    redeem,
    collection,
    starBits,
    checklist,
    trades,
    offers,
    notifications,
    rewards,
    profile,
    collector,
    rankingsPage,
    loginPage,
    tradeListsPage,
    tradeOffersPage,
    boosterShopPage,
    eventsPage,
    app,
    migration
  ] = await Promise.all([
    read('docs/admin-website.html'),
    read('docs/js/pages/admin-website-page.js'),
    read('docs/js/website-content-hydrate.js'),
    read('docs/admin-hub.html'),
    read('docs/js/embed-mode.js'),
    read('docs/js/app-shell.js'),
    read('docs/js/shell-route-utils.js'),
    read('docs/home.html'),
    read('docs/about.html'),
    read('docs/socials.html'),
    read('docs/login.html'),
    read('docs/binder.html'),
    read('docs/daily-booster.html'),
    read('docs/booster-shop.html'),
    read('docs/events.html'),
    read('docs/redeem.html'),
    read('docs/collection.html'),
    read('docs/star-bits.html'),
    read('docs/checklist.html'),
    read('docs/trade-lists.html'),
    read('docs/trade-offers.html'),
    read('docs/notifications.html'),
    read('docs/received-rewards.html'),
    read('docs/profile-settings.html'),
    read('docs/collector.html'),
    read('docs/user-rankings.html'),
    read('docs/js/pages/login-page.js'),
    read('docs/js/pages/trade-lists-page.js'),
    read('docs/js/pages/trade-offers-page.js'),
    read('docs/js/pages/booster-shop-page.js'),
    read('docs/js/pages/events-page.js'),
    read('docs/js/app.js'),
    read('supabase/migrations/20260722060000_website_content_settings.sql')
  ]);

  assert.match(html, /Website Editor/);
  assert.match(html, /id="tablist"/);
  assert.match(page, /canEditWebsite|canManageRoles/);
  assert.match(page, /saveWebsiteContent/);
  assert.match(page, /resetWebsiteContent/);
  assert.match(page, /id="addSocialLink"|addSocialLink/);
  assert.match(page, /WEBSITE_EDITOR_TABS/);
  assert.match(page, /data-tab=/);
  assert.match(hydrate, /export function hydrateWebsiteContent/);
  assert.match(hydrate, /export async function loadAndHydrateWebsiteContent/);
  assert.match(hydrate, /\.social-links/);
  assert.match(hub, /admin-website\.html/);
  assert.match(hub, /Website Editor/);
  assert.match(embed, /'admin-website\.html':'admin-website'/);
  assert.match(shell, /'admin-website':\{title:'Website Editor'/);
  assert.match(routes, /'admin-website'/);
  assert.match(home, /data-content="home\.title"/);
  assert.match(home, /data-content="home\.primaryCta"/);
  assert.match(home, /data-content="home\.newsLoading"/);
  assert.match(home, /website-content-hydrate-page\.js\?v=1\.2/);
  assert.match(about, /data-content="about\.lead"/);
  assert.match(about, /data-content="about\.seriesLoading"/);
  assert.match(about, /shared\.infoStripCollection/);
  assert.match(about, /website-content-hydrate-page\.js\?v=1\.2/);
  assert.match(socials, /id="socialLinks"/);
  assert.match(socials, /class="[^"]*social-links/);
  assert.match(login, /data-content="login\.brandTitle"/);
  assert.match(login, /data-content="login\.returnCta"/);
  assert.match(loginPage, /loginCopy/);
  assert.match(loginPage, /loadAndHydrateWebsiteContent/);
  assert.match(binder, /data-content="binder\.title"/);
  assert.match(daily, /data-content="daily\.title"/);
  assert.match(daily, /data-content="daily\.signInCta"/);
  assert.match(daily, /data-content="daily\.loopStep1"/);
  assert.match(daily, /website-content-hydrate-page\.js\?v=1\.2/);
  assert.match(shop, /data-content="shop\.title"/);
  assert.match(shop, /data-content="shop\.footerCta"/);
  assert.match(events, /data-content="events\.emptyTitle"|data-content="events\.loading"/);
  assert.match(redeem, /data-content="redeem\.submitCta"/);
  assert.match(collection, /data-content="collection\.title"/);
  assert.match(collection, /shared\.infoStripCollection/);
  assert.match(starBits, /data-content="starBits\.title"/);
  assert.match(checklist, /data-content="checklist\.title"/);
  assert.match(checklist, /shared\.infoStripCopyright/);
  assert.match(trades, /data-content="trades\.title"/);
  assert.match(offers, /data-content="offers\.composeEmpty"/);
  assert.match(notifications, /data-content="notifications\.preferencesTitle"/);
  assert.match(notifications, /data-content="notifications\.markAllReadCta"/);
  assert.match(rewards, /data-content="rewards\.tabPending"/);
  assert.match(profile, /data-content="profile\.accountIntro"/);
  assert.match(profile, /data-content="profile\.imageSectionTitle"/);
  assert.match(collector, /data-content="collector\.statsTitle"/);
  assert.match(collector, /data-content="collector\.followCta"/);
  assert.match(collector, /data-content="collector\.defaultBio"/);
  assert.match(collector, /website-content-hydrate-page\.js\?v=1\.4/);
  assert.match(collector, /collector-twitch-badge/);
  assert.match(collector, /public-twitch-profile\.js/);
  assert.doesNotMatch(collector, /collector-twitch-handle/);
  assert.match(collector, /collector-role|collector-flair/);
  assert.match(collector, /collection-level-card|collector-level/);
  assert.match(rankingsPage, /data-content="rankings\.title"/);
  assert.match(rankingsPage, /data-content="rankings\.lead"/);
  assert.match(rankingsPage, /website-content-hydrate-page\.js\?v=1\.3/);
  assert.match(tradeListsPage, /loadAndHydrateWebsiteContent/);
  assert.match(tradeListsPage, /emptyWishlist/);
  assert.match(tradeOffersPage, /emptyIncoming/);
  assert.match(boosterShopPage, /signedOutTitle/);
  assert.match(boosterShopPage, /featuredKicker/);
  assert.match(eventsPage, /emptyTitle/);
  assert.match(eventsPage, /boostersHeading/);
  assert.match(app, /ensureWebsiteBinderLanding|getWebsiteContent/);
  assert.match(app, /binderLanding/);
  assert.match(app, /splashTitle/);
  assert.match(app, /binderSidePanel/);
  assert.match(app, /binderFullView/);
  assert.match(migration, /get_website_content|admin_save_website_content/);
});
