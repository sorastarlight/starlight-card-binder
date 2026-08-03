import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('favorites polish wires full-view, showcase unstar, and synced grid', async () => {
  const app = await read('docs/js/app.js');
  const collection = await read('docs/collection.html');
  const css = await read('docs/css/collection-redesign.css');

  assert.match(app, /overlay-favorite/);
  assert.match(app, /data-toggle-favorite/);
  assert.match(app, /fav-unstar/);
  assert.match(app, /resolveFullViewAfterFavoriteChange/);
  assert.match(app, /same list as the grid below/);
  assert.match(app, /Showing \$\{list\.length\} of \$\{baseList\.length\} favorite/);
  assert.match(app, /window\.renderAll = renderAll/);
  assert.match(collection, /id="favoriteShowcase"/);
  assert.match(collection, /id="favoriteGrid"/);
  assert.match(css, /V1\.1 favorites polish/);
});

test('favorite sync failure rolls back UI and notifies the collector', async () => {
  const cloud = await read('docs/js/cloud-collection.js');
  assert.match(cloud, /window\.renderAll/);
  assert.match(cloud, /Favorite could not sync/);
  assert.match(cloud, /StarlightUI\?\.toast/);
});

test('binder filter panel stays hidden on series landing until a pack is selected', async () => {
  const app = await read('docs/js/app.js');
  const css = await read('docs/css/pages/binder.css');
  const binder = await read('docs/binder.html');

  assert.match(app, /const showSearch = true/);
  assert.match(app, /id="globalSearch"/);
  assert.match(app, /role="status" aria-live="polite"/);
  assert.match(app, /function syncBinderSeriesMode\(browse\)/);
  assert.match(app, /function ensureBinderFilterPanel\(/);
  assert.match(app, /document\.body\.classList\.toggle\('series-select', onLanding\)/);
  assert.match(app, /chrome\.removeAttribute\('hidden'\)/);
  assert.match(css, /Hide binder browse chrome on the series landing until a pack is selected/);
  assert.match(css, /:not\(\.series-select\) \.binder-browse-chrome \{/);
  assert.match(css, /series-select \.binder-browse-chrome,\s*body\[data-page="binder"\]\.series-select \.binder-browse-chrome \.series-hero/);
  assert.doesNotMatch(
    css,
    /series-select \.card-filter-panel,\s*body\[data-page="binder"\]\.series-select \.binder-browser-layout \{\s*display: none;/
  );
  assert.match(binder, /id="v62Showcase"/);
  assert.match(binder, /binder\.css\?v=1\.7\.5/);
  assert.match(app, /renderV62Showcase/);
  assert.match(app, /function cardSupportsHoloToggle\(/);
  assert.match(app, /function previewDisplayTogglesHtml\(/);
  assert.match(app, /cardSupportsHoloToggle\(card\)/);
  assert.match(app, /cardHasStarlightEvolution\(card\.id\)/);
  assert.match(binder, /cloud-collection\.js\?v=1\.3\.5/);
  assert.match(binder, /card-analyzer\.css\?v=2\.4\.1/);
  assert.doesNotMatch(binder, /<b data-duplicates="">0<\/b> extras/);
});

test('shell-safe profile links avoid binder-in-binder nesting', async () => {
  const [offersHub, comments, report, rankings] = await Promise.all([
    read('docs/js/pages/trade-offers-hub.js'),
    read('docs/js/card-comments.js'),
    read('docs/js/pages/report-profile-page.js'),
    read('docs/js/pages/user-rankings-page.js')
  ]);
  assert.match(offersHub, /target="_top"/);
  assert.match(offersHub, /data-shell-view="collector"/);
  assert.match(comments, /target="_top" data-shell-view="collector"/);
  assert.match(comments, /target="_top" data-shell-view="login"/);
  assert.match(report, /setAttribute\('target','_top'\)/);
  assert.match(rankings, /rankings-avatar has-photo[\s\S]*aria-hidden="true"/);
});
