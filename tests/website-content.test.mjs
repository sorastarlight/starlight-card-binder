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
  assert.equal(content.version, 3);
  assert.ok(content.home.title);
  assert.ok(content.home.primaryCta);
  assert.ok(content.home.newsLoading);
  assert.ok(content.about.lead);
  assert.ok(content.about.seriesLoading);
  assert.ok(content.socials.links.length >= 1);
  assert.equal(content.login.brandTitle, 'Starlight Card Binder');
  assert.ok(content.binderLanding.title);
  assert.ok(content.binderLanding.splashTitle);
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
  assert.ok(content.trades.emptyWishlist);
  assert.ok(content.offers.emptyIncoming);
  assert.ok(content.notifications.emptyTitle);
  assert.ok(content.notifications.markAllReadCta);
  assert.ok(content.rewards.emptyLead);
  assert.ok(content.profile.accountIntro);
  assert.ok(content.profile.imageSectionTitle);
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
      'daily',
      'shop',
      'events',
      'redeem',
      'collection',
      'starBits',
      'checklist',
      'trades',
      'offers',
      'notifications',
      'rewards',
      'profile',
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

  assert.equal(sanitized.version, 3);
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
  assert.equal(merged.version, 3);
});

test('website editor field meta covers binder splash and admin visual chrome', async () => {
  const { WEBSITE_PAGE_META, listedFieldKeys } = await import('../docs/js/website-content-field-meta.js');
  assert.ok(WEBSITE_PAGE_META.binderLanding);
  assert.ok(listedFieldKeys('binderLanding').includes('splashTitle'));
  assert.ok(listedFieldKeys('daily').includes('readyTitle'));
  const html = await read('docs/admin-website.html');
  const page = await read('docs/js/pages/admin-website-page.js');
  assert.match(html, /fieldSearch/);
  assert.match(html, /resetPageBtn/);
  assert.match(html, /admin-website-page\.js\?v=1\.4/);
  assert.match(page, /WEBSITE_PAGE_META|getPageMeta/);
  assert.match(page, /renderGroupedFields|field-group/);
  assert.match(page, /preview-splash|splashTitle/);
  assert.match(page, /data-visibility-path|Show on page/);
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
  assert.match(migration, /get_website_content|admin_save_website_content/);
});
