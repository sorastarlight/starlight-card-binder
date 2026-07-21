import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), 'utf8');

test('holographic finish is a simple always-on rainbow foil on reveal and full view', async () => {
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
  assert.match(css, /\.card-finish-holographic::before/);
  assert.match(css, /mix-blend-mode:overlay/);
  assert.match(css, /\.st-holo-spark/);
  assert.match(css, /@keyframes stHoloHue/);
  assert.match(css, /hue-rotate\(360deg\)/);
  assert.match(css, /@keyframes stHoloSheen/);
  assert.match(css, /@keyframes stHoloSparkleA/);
  assert.match(css, /animation:stHoloSparkleA[^;]*alternate/);
  assert.match(css, /animation:stHoloSheen[^;]*alternate/);
  assert.match(css, /\.st-card-drag-tilt/);
  assert.doesNotMatch(css, /--tilt-nx/);
  assert.doesNotMatch(css, /--st-holo-shift/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*card-finish-holographic/);
});

test('sparkle foil finish uses a simple glitter effect on reveal and full view', async () => {
  const [ui, css] = await Promise.all([
    read('docs/js/shared-ui.js'),
    read('docs/css/shared-ui.css')
  ]);

  assert.match(ui, /function isSparkleFoilCard\(card = \{\}\)/);
  assert.match(ui, /finishId === 'sparkle-foil'/);
  assert.match(ui, /\\bsparkle\[\\s-\]\?foil\\b/);
  assert.match(ui, /card-finish-sparkle-foil/);
  assert.match(ui, /ensureFinishEffectLayer/);
  assert.match(ui, /finishEffectLabel/);
  assert.match(ui, /st-sparkle-glitter/);
  assert.match(css, /\.card-finish-sparkle-foil::before/);
  assert.match(css, /\.st-sparkle-glitter/);
  assert.match(css, /@keyframes stSparkleTwinkleA/);
  assert.match(css, /animation:stSparkleTwinkleA[^;]*alternate/);
  assert.match(css, /prefers-reduced-motion:reduce[\s\S]*card-finish-sparkle-foil/);
});

test('finish effects are limited to reveal and full-card view surfaces', async () => {
  const [app, reveal, daily, admin] = await Promise.all([
    read('docs/js/app.js'),
    read('docs/js/reward-reveal.js'),
    read('docs/js/pages/daily-booster-page.js'),
    read('docs/js/pages/admin-boosters-page.js')
  ]);

  assert.match(app, /face front \$\{cardFinishClass\(selected, got && !overlayFlipped\)\}/);
  assert.match(app, /holoSparkMarkup\(selected, got && !overlayFlipped\)/);
  assert.match(app, /data-finish-class=/);
  assert.match(app, /ensureFinishEffectLayer/);
  assert.match(app, /attachCardDragTilt/);
  assert.doesNotMatch(app, /collection-image \$\{cardFinishClass/);
  assert.doesNotMatch(app, /v61-card-art \$\{cardFinishClass/);
  assert.doesNotMatch(app, /fav-image \$\{cardFinishClass/);
  assert.match(reveal, /st-r3-card-front \$\{cardFinishClass\(card\)\}/);
  assert.match(reveal, /st-r3-result-art \$\{cardFinishClass\(card\)\}/);
  assert.match(reveal, /attachHoloSpark\(/);
  assert.match(reveal, /ensureFinishEffectLayer/);
  assert.match(reveal, /finishEffectBadge/);
  assert.doesNotMatch(daily, /reward-card-art \$\{finishClass\}/);
  assert.doesNotMatch(admin, /card-db-art \$\{window\.StarlightUI\?\.cardFinishClass/);
});
