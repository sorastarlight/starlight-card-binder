import assert from 'node:assert/strict';
import test from 'node:test';
import { cloneDefaultShellNavigation, PUBLIC_SHELL_DESTINATIONS } from '../docs/js/shell-navigation-defaults.js';
import { mergeShellNavigation, sanitizeShellNavigation } from '../docs/js/shell-navigation-model.js';
import { readFile } from 'node:fs/promises';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('default shell navigation includes core destinations and staff section', () => {
  const nav = cloneDefaultShellNavigation();
  assert.equal(nav.sidebar.sections[0].label, 'Explore The Starlight Card Series');
  assert.ok(nav.sidebar.sections.some(section => section.staffOnly));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'offers'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'rankings'));
  assert.ok(PUBLIC_SHELL_DESTINATIONS.some(entry => entry.value === 'feed' && entry.label === 'LIVE Feed'));
  assert.ok(nav.sidebar.sections[1].items.some(item => item.destination === 'rankings'));
  assert.ok(nav.sidebar.sections[1].items.some(item => item.destination === 'feed' && item.label === 'LIVE Feed'));
  assert.equal(nav.pageTitles.feed, 'LIVE Feed');
  assert.equal(nav.topBar.quickLinks.length, 4);
  assert.ok(nav.accountMenu.signedIn.some(item => (item.features || []).includes('notificationBadge')));
  assert.ok(nav.accountMenu.signedIn.some(item => (item.features || []).includes('receivedGiftBadge')));
  assert.ok(nav.accountMenu.signedIn.some(item => (item.features || []).includes('tradeOfferBadge')));
  assert.ok(nav.accountMenu.signedOut.some(item => (item.features || []).includes('signIn')));
});

test('sanitizeShellNavigation rejects unknown destinations and merges empty remote', () => {
  const merged = mergeShellNavigation({});
  assert.equal(merged.brandRibbon, 'Card Binder');
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
  assert.match(html, /data-tab="account"/);
  assert.match(html, /64[\u00d7x]64/i);
  assert.match(page, /uploadStudioAsset\(file, 'nav-icons'\)/);
  assert.match(page, /shellPreviewFrame|NAV_DRAFT|buildShellStudioPreviewUrl/);
  assert.match(page, /renderAccountMenu|ACCOUNT_FEATURES|accountMenu/);
  assert.match(hub, /admin-ui\.html/);
  assert.match(migration, /admin_save_shell_navigation/);
  assert.match(embed, /'admin-ui\.html':'admin-ui'/);
  assert.match(shell, /getShellNavigation/);
  assert.match(shell, /admin-ui/);
  assert.match(shell, /refreshShellBadges|data-notification-dot/);
});