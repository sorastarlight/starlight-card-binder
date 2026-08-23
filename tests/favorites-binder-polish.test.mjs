import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('favorites polish wires full-view, showcase unstar, and synced grid', async () => {
  const app = await read('docs/js/app.js');
  const collection = await read('docs/collection.html');
  const css = await read('docs/css/pages/card-album-page.css');

  assert.match(app, /overlay-favorite/);
  assert.match(app, /data-toggle-favorite/);
  assert.match(app, /fav-unstar/);
  assert.match(app, /resolveFullViewAfterFavoriteChange/);
  assert.match(app, /same list as the grid below/);
  assert.match(app, /Showing \$\{list\.length\} of \$\{baseList\.length\} favorite/);
  assert.match(app, /window\.renderAll = renderAll/);
  assert.match(collection, /id="favoriteShowcase"/);
  assert.match(collection, /id="favoriteGrid"/);
  assert.match(css, /\.favorite-carousel/);
});

test('favorite sync failure rolls back UI and notifies the collector', async () => {
  const cloud = await read('docs/js/cloud-collection.js');
  assert.match(cloud, /window\.renderAll/);
  assert.match(cloud, /Favorite could not sync/);
  assert.match(cloud, /StarlightUI\?\.toast/);
});

test('gallery page keeps filters visible and uses rebuilt markup', async () => {
  const app = await read('docs/js/app.js');
  const css = await read('docs/css/pages/card-gallery-page.css');
  const binder = await read('docs/binder.html');

  assert.match(app, /function syncBinderSeriesMode\(browse\)/);
  assert.match(app, /function ensureBinderFilterPanel\(/);
  assert.match(app, /document\.body\.classList\.remove\('series-select'\)/);
  assert.match(app, /renderGalleryGridHtml/);
  assert.match(app, /#seriesGridStage/);
  assert.match(app, /function cardSupportsHoloToggle\(/);
  assert.match(app, /function previewDisplayTogglesHtml\(/);
  assert.match(css, /\.card-gallery-grid/);
  assert.match(css, /is-unowned.*card-gallery-art img/);
  assert.match(binder, /card-gallery-page/);
  assert.match(binder, /card-gallery-page\.css/);
  assert.match(binder, /id="seriesGridStage"/);
  assert.match(binder, /data-card-filter-context="binder"/);
  assert.doesNotMatch(binder, /binder\.css/);
  assert.doesNotMatch(binder, /id="v62Showcase"/);
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
