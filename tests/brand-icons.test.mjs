import assert from 'node:assert/strict';
import test from 'node:test';
import { access } from 'node:fs/promises';
import {
  BRAND_ICON_IDS,
  BRAND_ICONS,
  brandIconToken,
  resolveBrandIcon,
  renderIconMarkup
} from '../docs/js/brand-icons.js';
import { COMMON_NAV_EMOJIS } from '../docs/js/shell-navigation-defaults.js';
import { cloneDefaultWebsiteContent } from '../docs/js/website-content-defaults.js';
import { sanitizeWebsiteContent } from '../docs/js/website-content-model.js';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

test('brand icons resolve Twitch, YouTube, and X tokens and files', async () => {
  assert.deepEqual([...BRAND_ICON_IDS], ['twitch', 'youtube', 'x', 'star-bit']);
  for (const id of BRAND_ICON_IDS) {
    const icon = BRAND_ICONS[id];
    assert.equal(resolveBrandIcon(id)?.id, id);
    assert.equal(resolveBrandIcon(brandIconToken(id))?.id, id);
    assert.equal(resolveBrandIcon(icon.file)?.id, id);
    await access(new URL(`../docs/${icon.file}`, import.meta.url));
  }
  assert.match(renderIconMarkup('brand:twitch', esc, { size: 24 }), /site_assets\/icons\/twitch\.svg/);
  assert.match(renderIconMarkup('📸', esc), /📸/);
});

test('nav emoji palette and editors expose brand icons', async () => {
  assert.ok(COMMON_NAV_EMOJIS.includes('𝕏'));
  assert.ok(COMMON_NAV_EMOJIS.includes('▶️'));
  const [uiPage, websitePage, socialsHtml, loginCss] = await Promise.all([
    read('docs/js/pages/admin-ui-page.js'),
    read('docs/js/pages/admin-website-page.js'),
    read('docs/socials.html'),
    read('docs/css/pages/login.css')
  ]);
  assert.match(uiPage, /set-brand-icon/);
  assert.match(uiPage, /BRAND_ICONS/);
  assert.match(websitePage, /data-social-brand/);
  assert.match(socialsHtml, /site_assets\/icons\/twitch\.svg/);
  assert.match(socialsHtml, /site_assets\/icons\/youtube\.svg/);
  assert.match(socialsHtml, /site_assets\/icons\/x\.svg/);
  assert.match(loginCss, /site_assets\/icons\/twitch\.svg/);
});

test('website social defaults keep brand icon tokens', () => {
  const defaults = cloneDefaultWebsiteContent();
  assert.equal(defaults.socials.links.find((link) => link.id === 'twitch')?.icon, 'brand:twitch');
  assert.equal(defaults.socials.links.find((link) => link.id === 'youtube')?.icon, 'brand:youtube');
  assert.equal(defaults.socials.links.find((link) => link.id === 'x')?.icon, 'brand:x');
  const sanitized = sanitizeWebsiteContent({
    ...defaults,
    socials: {
      ...defaults.socials,
      links: [{ id: 'twitch', icon: 'brand:twitch', label: 'Twitch', handle: 'x', url: 'https://www.twitch.tv/sorastarlight' }]
    }
  });
  assert.equal(sanitized.socials.links[0].icon, 'brand:twitch');
});
