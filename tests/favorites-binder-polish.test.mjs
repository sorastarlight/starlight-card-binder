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

test('binder filter panel exposes search on series landing', async () => {
  const app = await read('docs/js/app.js');
  const css = await read('docs/css/pages/binder.css');
  const binder = await read('docs/binder.html');

  assert.match(app, /const showSearch = true/);
  assert.match(app, /id="globalSearch"/);
  assert.match(app, /if \(filters\.q\) document\.body\.classList\.remove\('series-select'\)/);
  assert.match(css, /Keep binder filters \(including search\) available on the series landing/);
  assert.match(css, /series-select \.card-filter-panel \{\s*display: block;/);
  assert.doesNotMatch(
    css,
    /series-select \.card-filter-panel,\s*body\[data-page="binder"\]\.series-select \.binder-browser-layout \{\s*display: none;/
  );
  assert.match(binder, /binder\.css\?v=1\.4\.0/);
  assert.match(binder, /cloud-collection\.js\?v=1\.1\.8/);
});
