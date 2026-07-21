import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('legacy reveal layers keep live binder analyzer/pack styles and drop proven-dead skins', async () => {
  const [css03, css09, appJs, binderHtml] = await Promise.all([
    read('docs/css/legacy/03-reveal-v28-v33.css'),
    read('docs/css/legacy/09-reveal-v67-v80.css'),
    read('docs/js/app.js'),
    read('docs/binder.html')
  ]);
  const legacy = `${css03}\n${css09}`;

  for (const dead of [
    'v27-full-stage',
    'v27-full-info',
    'analyzer-topline',
    'analyzer-rarity',
    'spin-flip',
    'v70-flip-mode',
    'v78-pack-desc',
    'legendary-magic-explosion',
    'v68CleanCardSpin',
    'v70CardFlipSpin'
  ]) {
    assert.doesNotMatch(legacy, new RegExp(dead.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  for (const live of [
    'analyzer-full-stage',
    'analyzer-screen',
    'simple-flip',
    'v61-pack',
    'v78-pack',
    'v795SimpleCardSpin'
  ]) {
    assert.match(legacy, new RegExp(live.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(appJs, /analyzer-full-stage/);
  assert.match(appJs, /v61-pack v78-pack/);
  assert.match(binderHtml, /css\/style\.css\?v=1\.0\.3/);
});
