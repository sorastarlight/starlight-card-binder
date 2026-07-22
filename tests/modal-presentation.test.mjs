import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('keeps modal overlays centered without turning dialog cards into overlays', async () => {
  const css = await read('docs/css/qol-ui.css');

  assert.doesNotMatch(css, /\[role="dialog"\]:not\(\.qol-dialog-card\)/);
  assert.match(css, /:is\(\.st-dialog-overlay,\.editor,\.rule-modal,\.test-modal,\.receipt/);
  assert.match(css, /display:flex!important/);
  assert.match(css, /align-items:safe center!important/);
  assert.match(css, /justify-content:safe center!important/);
  assert.match(css, /\.is-embed-anchored\{/);
  assert.match(css, /--st-embed-overlay-height/);
  assert.match(css, /\.editor>\.editor-card(?:,\.editor>\.st-dialog)?\{--qol-modal-width:1100px\}/);
  assert.match(css, /\.rule-modal>\.rule-modal-card(?:,\.rule-modal>\.st-dialog)?\{--qol-modal-width:1080px\}/);
  assert.match(css, /background:linear-gradient\(145deg,rgba\(255,255,255,\.99\)/);
});

test('keeps every administrative popup on the shared modal controller', async () => {
  const [boosters, news, twitch, gifts, profile] = await Promise.all([
    read('docs/js/pages/admin-boosters-page.js'),
    read('docs/js/pages/admin-news-page.js'),
    read('docs/js/pages/admin-twitch-page.js'),
    read('docs/js/pages/admin-gifts-page.js'),
    read('docs/js/profile-extras.js')
  ]);

  for (const source of [boosters, news, twitch, gifts, profile]) {
    assert.match(source, /(?:StarlightUI|ui)\.adoptModal/);
  }
  assert.match(profile, /querySelector\(['"]\.st-dialog['"]\)/);
  assert.match(profile, /whenStarlightUI/);
});

test('profile crop dialog uses the shared st-dialog contract', async () => {
  const html = await read('docs/profile-settings.html');
  assert.match(html, /st-dialog-overlay profile-crop-modal/);
  assert.match(html, /st-dialog profile-crop-dialog/);
  assert.match(html, /st-dialog-close/);
});
