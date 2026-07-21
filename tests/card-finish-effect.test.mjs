import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), 'utf8');

test('holographic finish uses full-card rainbow that shifts with tilt orientation', async () => {
  const [ui, css] = await Promise.all([
    read('docs/js/shared-ui.js'),
    read('docs/css/shared-ui.css')
  ]);

  assert.match(ui, /function isHolographicCard\(card = \{\}\)/);
  assert.match(ui, /finishId === 'holographic'/);
  assert.match(ui, /card\.finish_name/);
  assert.match(ui, /cardFinishClass/);
  assert.match(ui, /ensureHoloSparkLayer/);
  assert.match(ui, /holoSparkMarkup/);
  assert.match(ui, /function attachCardDragTilt/);
  assert.match(ui, /function setHoloFromTilt/);
  assert.match(ui, /setHoloFromTilt\(foil, tiltX, tiltY, max\)/);
  assert.doesNotMatch(ui, /setHoloPointer\(foil, x, y\)[\s\S]*--st-holo-x/);
  assert.match(css, /\.card-finish-holographic::before/);
  assert.match(css, /mix-blend-mode:soft-light/);
  assert.match(css, /\.st-holo-spark/);
  assert.match(css, /--st-holo-shift-x/);
  assert.match(css, /--tilt-nx/);
  assert.match(css, /@keyframes stHoloIdleOrient/);
  assert.match(css, /animation:stHoloIdleOrient[^;]*alternate/);
  assert.match(css, /\.st-card-drag-tilt/);
  assert.doesNotMatch(css, /--st-holo-x/);
  assert.doesNotMatch(css, /farthest-corner circle at var\(--st-holo/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*card-finish-holographic/);
});

test('holographic shimmer is limited to reveal and full-card view surfaces', async () => {
  const [app, reveal, daily, admin] = await Promise.all([
    read('docs/js/app.js'),
    read('docs/js/reward-reveal.js'),
    read('docs/js/pages/daily-booster-page.js'),
    read('docs/js/pages/admin-boosters-page.js')
  ]);

  assert.match(app, /face front \$\{cardFinishClass\(selected, got && !overlayFlipped\)\}/);
  assert.match(app, /holoSparkMarkup\(selected, got && !overlayFlipped\)/);
  assert.match(app, /data-holographic="\$\{got && isHolographicCard\(selected\)\}"/);
  assert.match(app, /attachCardDragTilt/);
  assert.doesNotMatch(app, /collection-image \$\{cardFinishClass/);
  assert.doesNotMatch(app, /v61-card-art \$\{cardFinishClass/);
  assert.doesNotMatch(app, /fav-image \$\{cardFinishClass/);
  assert.match(reveal, /st-r3-card-front \$\{cardFinishClass\(card\)\}/);
  assert.match(reveal, /st-r3-result-art \$\{cardFinishClass\(card\)\}/);
  assert.match(reveal, /attachHoloSpark\(/);
  assert.match(reveal, /attachCardDragTilt/);
  assert.doesNotMatch(daily, /reward-card-art \$\{finishClass\}/);
  assert.doesNotMatch(admin, /card-db-art \$\{window\.StarlightUI\?\.cardFinishClass/);
});
