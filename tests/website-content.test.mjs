import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  cloneDefaultWebsiteContent,
  HOME_QUICK_LINK_IDS
} from '../docs/js/website-content-defaults.js';
import {
  mergeWebsiteContent,
  sanitizeWebsiteContent
} from '../docs/js/website-content-model.js';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('default website content includes editable page groups', () => {
  const content = cloneDefaultWebsiteContent();
  assert.equal(content.version, 1);
  assert.ok(content.home.title);
  assert.ok(content.about.lead);
  assert.ok(content.socials.links.length >= 1);
  assert.equal(content.login.brandTitle, 'Starlight Card Binder');
  assert.ok(content.binderLanding.title);
  assert.ok(content.shared.infoStripCopyright);
  assert.deepEqual(
    content.home.quickLinks.map((link) => link.id),
    [...HOME_QUICK_LINK_IDS]
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
    loginPage,
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
    read('docs/js/pages/login-page.js'),
    read('docs/js/app.js'),
    read('supabase/migrations/20260722060000_website_content_settings.sql')
  ]);

  assert.match(html, /Website Editor/);
  assert.match(html, /Home \| About \| Socials \| Login \| Binder \| Shared|data-tab="home"/);
  assert.match(html, /data-tab="shared"/);
  assert.match(page, /canEditWebsite|canManageRoles/);
  assert.match(page, /saveWebsiteContent/);
  assert.match(page, /resetWebsiteContent/);
  assert.match(page, /data-action="add-social"/);
  assert.match(hydrate, /export function hydrateWebsiteContent/);
  assert.match(hydrate, /export async function loadAndHydrateWebsiteContent/);
  assert.match(hydrate, /\.social-links/);
  assert.match(hub, /admin-website\.html/);
  assert.match(hub, /Website Editor/);
  assert.match(embed, /'admin-website\.html':'admin-website'/);
  assert.match(shell, /'admin-website':\{title:'Website Editor'/);
  assert.match(routes, /'admin-website'/);
  assert.match(home, /data-content="home\.title"/);
  assert.match(home, /website-content-hydrate-page\.js/);
  assert.match(about, /data-content="about\.lead"/);
  assert.match(about, /shared\.infoStripCollection/);
  assert.match(socials, /id="socialLinks"/);
  assert.match(socials, /class="[^"]*social-links/);
  assert.match(login, /data-content="login\.brandTitle"/);
  assert.match(loginPage, /loginCopy/);
  assert.match(loginPage, /loadAndHydrateWebsiteContent/);
  assert.match(binder, /data-content="binder\.title"/);
  assert.match(app, /ensureWebsiteBinderLanding|getWebsiteContent/);
  assert.match(app, /binderLanding/);
  assert.match(migration, /get_website_content|admin_save_website_content/);
});
