import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  SHELL_NAV_ICON_IDS,
  isShellNavIconId,
  renderShellNavIcon,
  shellNavIcon,
  shellNavIconForKey
} from '../docs/js/shell-nav-icons.js';
import { cloneDefaultShellNavigation } from '../docs/js/shell-navigation-defaults.js';
import { sanitizeShellNavigation } from '../docs/js/shell-navigation-model.js';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[m]));

test('shell nav icon set covers core destinations and renders svg markup', () => {
  assert.ok(SHELL_NAV_ICON_IDS.includes('gallery'));
  assert.ok(SHELL_NAV_ICON_IDS.includes('missions'));
  assert.ok(isShellNavIconId('trade'));
  assert.equal(shellNavIcon('shop').type, 'svg');
  assert.equal(shellNavIcon('shop').value, 'shop');
  assert.equal(shellNavIconForKey('binder').value, 'gallery');
  assert.equal(shellNavIconForKey('quests').value, 'missions');
  assert.equal(shellNavIconForKey('rewards').value, 'gifts');

  const markup = renderShellNavIcon(shellNavIcon('home'), esc);
  assert.match(markup, /<svg class="shell-nav-svg"/);
  assert.match(markup, /viewBox="0 0 24 24"/);
  assert.match(markup, /aria-hidden="true"/);
  assert.equal(renderShellNavIcon({ type: 'svg', value: 'missing' }, esc), '');
});

test('default shell navigation uses svg line icons (star bits stays image)', () => {
  const nav = cloneDefaultShellNavigation();
  const items = nav.sidebar.sections.flatMap((section) => section.items || []);
  const svgItems = items.filter((item) => item.icon?.type === 'svg');
  const starBits = items.find((item) => item.destination === 'star-bits');

  assert.ok(svgItems.length >= 14);
  assert.equal(starBits?.icon?.type, 'image');
  assert.match(starBits?.icon?.url || '', /star-bit\.png/);
  assert.equal(items.find((item) => item.destination === 'binder')?.icon?.value, 'gallery');
  assert.equal(items.find((item) => item.destination === 'checklist')?.icon?.value, 'checklist');
  assert.equal(nav.sidebar.sections.find((section) => section.id === 'cards')?.icon?.type, 'svg');
});

test('sanitizeShellNavigation preserves svg icon descriptors', () => {
  const cleaned = sanitizeShellNavigation(cloneDefaultShellNavigation());
  const gallery = cleaned.sidebar.sections
    .flatMap((section) => section.items || [])
    .find((item) => item.destination === 'binder');
  assert.equal(gallery?.icon?.type, 'svg');
  assert.equal(gallery?.icon?.value, 'gallery');
});

test('shell navigation render and css wire the svg icon system', async () => {
  const [render, css, icons] = await Promise.all([
    read('docs/js/shell-navigation-render.js'),
    read('docs/css/app-shell.css'),
    read('docs/js/shell-nav-icons.js')
  ]);
  assert.match(render, /renderShellNavIcon/);
  assert.match(render, /icon\?\.type === 'svg'/);
  assert.match(css, /\.shell-nav-svg/);
  assert.match(css, /stroke:currentColor/);
  assert.match(icons, /ICON_PATHS/);
});
