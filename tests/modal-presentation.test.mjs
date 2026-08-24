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
  assert.match(css, /\.is-embed-anchored:not\(\.hidden\):not\(\[hidden\]\)/);
  assert.match(css, /--st-embed-overlay-height/);
  assert.match(css, /position:absolute!important/);
  assert.match(css, /\.editor>\.editor-card(?:,\.editor>\.st-dialog)?\{--qol-modal-width:1100px\}/);
  assert.match(css, /\.rule-modal>\.rule-modal-card(?:,\.rule-modal>\.st-dialog)?\{--qol-modal-width:1080px\}/);
  assert.match(css, /background:linear-gradient\(145deg,rgba\(255,255,255,\.99\)/);
});

test('keeps every administrative popup on the shared modal controller', async () => {
  const [boosters, news, twitch, gifts, profile, moderation] = await Promise.all([
    read('docs/js/pages/admin-boosters-page.js'),
    read('docs/js/pages/admin-news-page.js'),
    read('docs/js/pages/admin-twitch-page.js'),
    read('docs/js/pages/admin-gifts-page.js'),
    read('docs/js/profile-extras.js'),
    read('docs/js/pages/admin-moderation-page.js')
  ]);

  for (const source of [boosters, news, twitch, gifts, profile, moderation]) {
    assert.match(source, /(?:StarlightUI|ui)\.adoptModal/);
  }
  assert.match(profile, /querySelector\(['"]\.st-dialog['"]\)/);
  assert.match(profile, /whenStarlightUI/);
  assert.doesNotMatch(moderation, /\bprompt\s*\(/);
});

test('profile crop dialog uses the shared st-dialog contract', async () => {
  const [html, moderationHtml] = await Promise.all([
    read('docs/profile-settings.html'),
    read('docs/admin-moderation.html')
  ]);
  assert.match(html, /st-dialog-overlay profile-crop-modal/);
  assert.match(html, /st-dialog profile-crop-dialog/);
  assert.match(html, /st-dialog-close/);
  assert.match(moderationHtml, /id="hide-profile-modal"/);
  assert.match(moderationHtml, /st-dialog-close/);
});

test('collector, shop, and quest dialogs use the shared modal controller', async () => {
  const [shop, collector, quests] = await Promise.all([
    read('docs/js/pages/booster-shop-page.js'),
    read('docs/js/pages/collector-page.js'),
    read('docs/js/pages/admin-quests-page.js')
  ]);

  assert.match(shop, /adoptModal/);
  assert.match(collector, /adoptModal/);
  assert.match(quests, /adoptModal/);
});

test('shared modal controller supports click-outside backdrop dismissal', async () => {
  const [sharedUi, appJs, css] = await Promise.all([
    read('docs/js/shared-ui.js'),
    read('docs/js/app.js'),
    read('docs/css/shared-ui.css')
  ]);

  assert.match(sharedUi, /function ensureModalBackdrop/);
  assert.match(sharedUi, /function isBackdropClick/);
  assert.match(sharedUi, /data-st-modal-backdrop/);
  assert.match(sharedUi, /closeOnBackdrop !== false/);
  assert.match(appJs, /data-st-modal-backdrop/);
  assert.match(appJs, /closeOnBackdrop:\s*true/);
  assert.match(css, /\.st-modal-backdrop/);
});
