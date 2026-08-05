import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = relativePath => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('keeps the requested collection navigation labels in the shared shell', async () => {
  const binder = await read('docs/binder.html');
  const shell = await read('docs/js/app-shell.js');

  for (const label of [
    'Explore The Starlight Card Series',
    'Starlight Card Gallery',
    'Redeem A Code',
    'My Stuff',
    'My Card Album Binder',
    'Star Registry'
  ]) assert.match(binder, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

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
  assert.match(app, /function renderGalleryCard\(/);
  assert.match(app, /function renderAlbumCard\(/);
  assert.match(app, /function renderGalleryGridHtml\(/);
});

test('removes daily-booster promotion from collection page', async () => {
  const collection = await read('docs/collection.html');
  assert.doesNotMatch(collection, /data-daily-status|Open Daily Booster/);
});
