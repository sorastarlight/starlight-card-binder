import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('shared-ui exports a shell overlay viewport contract', async () => {
  const source = await read('docs/js/shared-ui.js');

  assert.match(source, /anchorOverlayToVisibleViewport:\s*syncOverlayEmbedAnchor/);
  assert.match(source, /clearOverlayViewportAnchor:\s*clearOverlayEmbedAnchor/);
  assert.match(source, /getEmbedVisibleFrame/);
  assert.match(source, /setProperty\('position', 'absolute', 'important'\)/);
  assert.match(source, /setProperty\('height', height, 'important'\)/);
  assert.doesNotMatch(source, /scrollIntoView/);
  assert.match(source, /Never touch the parent shell/);
});

test('shared overlay CSS keeps embed anchors stronger than fixed fullscreen rules', async () => {
  const [shared, qol, reveal] = await Promise.all([
    read('docs/css/shared-ui.css'),
    read('docs/css/qol-ui.css'),
    read('docs/css/reward-reveal.css')
  ]);

  for (const css of [shared, qol]) {
    assert.match(css, /\.st-r3-overlay/);
    assert.match(css, /\.is-embed-anchored:not\(\.hidden\):not\(\[hidden\]\)/);
    assert.match(css, /position:absolute!important/);
    assert.match(css, /--st-embed-overlay-height/);
  }

  assert.match(reveal, /\.st-r3-overlay\.is-embed-anchored:not\(\.hidden\):not\(\[hidden\]\)/);
  assert.match(reveal, /position: absolute !important/);
});

test('reward reveal uses the shared viewport clear path on finish', async () => {
  const source = await read('docs/js/reward-reveal.js');

  assert.match(source, /clearOverlayViewportAnchor/);
  assert.match(source, /anchorOverlayToVisibleViewport/);
  assert.match(source, /adoptModal/);
  assert.match(source, /clearOverlayClass/);
});

test('smoke matrix documents shell overlay regression checks', async () => {
  const matrix = await read('docs/V1_0_SMOKE_TEST_MATRIX.md');

  assert.match(matrix, /Shell overlay viewport contract/i);
  assert.match(matrix, /Profile crop\/banner dialog opens centered/i);
  assert.match(matrix, /Done returns a clickable page/i);
  assert.match(matrix, /Reveal pack UI is visible/i);
});
