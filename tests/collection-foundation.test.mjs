import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('keeps the requested collection navigation labels in the shared shell', async () => {
  const binder = await read('docs/binder.html');
  const shell = await read('docs/js/app-shell.js');

  assert.match(binder, /Starlight Card Gallery/);
  assert.match(binder, /shell-masthead/);
  const defaults = await read('docs/js/shell-navigation-defaults.js');
  assert.match(defaults, /label: 'Cards'/);
  assert.match(defaults, /label: 'Card Gallery'/);
  assert.match(defaults, /label: 'My Collection'/);
  assert.doesNotMatch(defaults, /id: 'series'/);
  assert.match(defaults, /id: 'admin-hub'/);
  assert.match(defaults, /Redeem Code/);
  assert.match(defaults, /My Card Album Binder/);
  assert.match(defaults, /Star Registry/);

  assert.match(shell, /collection:\{title:'My Card Album Binder'/);
  assert.match(shell, /binder:\{title:'Starlight Card Gallery'/);
});

test('gallery and album pages use rebuilt markup and render hooks', async () => {
  const [binder, collection, app] = await Promise.all([
    read('docs/binder.html'),
    read('docs/collection.html'),
    read('docs/js/app.js')
  ]);

  assert.match(binder, /card-gallery-page/);
  assert.match(binder, /card-gallery-page\.css/);
  assert.match(binder, /id="seriesGridStage"/);
  assert.doesNotMatch(binder, /binder-series-carousel/);
  assert.match(collection, /card-album-page/);
  assert.match(collection, /card-album-page\.css/);
  assert.match(collection, /id="collectionGrid"/);
  assert.match(collection, /card-album-binder-mount/);
  assert.match(app, /renderAlbumBinderSpread/);
  assert.match(app, /function renderGalleryGridHtml\(/);
});

test('removes daily-booster promotion from collection page', async () => {
  const collection = await read('docs/collection.html');
  assert.doesNotMatch(collection, /data-daily-status|Open Daily Booster/);
});
