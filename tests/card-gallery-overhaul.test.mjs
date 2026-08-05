import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('shared card tile module renders gallery, album, and list modes', async () => {
  const source = await read('docs/js/card-tile.js');
  assert.match(source, /renderGalleryTile/);
  assert.match(source, /renderAlbumTile/);
  assert.match(source, /renderListTile/);
  assert.match(source, /card-gallery-item/);
  assert.match(source, /card-album-slot/);
});

test('binder theme config exposes registry and apply hooks', async () => {
  const source = await read('docs/js/binder-theme-config.js');
  assert.match(source, /classic-starlight/);
  assert.match(source, /midnight-starlight/);
  assert.match(source, /sakura-bloom/);
  assert.match(source, /resolveThemeId/);
  assert.match(source, /applyTheme/);
});

test('album binder module paginates spreads', async () => {
  const source = await read('docs/js/album-binder.js');
  assert.match(source, /CARDS_PER_SPREAD = 9/);
  assert.match(source, /function paginate/);
  assert.match(source, /renderPagerHtml/);
});

test('app.js wires shared tile renderer and album pagination', async () => {
  const app = await read('docs/js/app.js');
  assert.match(app, /renderSharedGalleryCard/);
  assert.match(app, /StarlightCardTile/);
  assert.match(app, /StarlightAlbumBinder/);
  assert.match(app, /data-filter-favorites/);
  assert.match(app, /applyAlbumBinderTheme/);
  assert.match(app, /data-album-page/);
});

test('gallery and album pages load shared modules', async () => {
  const [binder, collection] = await Promise.all([
    read('docs/binder.html'),
    read('docs/collection.html')
  ]);
  assert.match(binder, /card-tile\.js/);
  assert.match(binder, /binder-theme-config\.js/);
  assert.match(collection, /card-tile\.js/);
  assert.match(collection, /album-binder\.js/);
  assert.match(collection, /binder-theme-config\.js/);
});
