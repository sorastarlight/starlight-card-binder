import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('shared card tile module renders gallery, album, and list modes', async () => {
  const source = await read('docs/js/card-tile.js');
  assert.match(source, /renderGalleryTile/);
  assert.match(source, /renderAlbumTile/);
  assert.match(source, /renderBinderPocket/);
  assert.match(source, /renderListTile/);
  assert.match(source, /card-gallery-item/);
  assert.match(source, /album-binder-3d-pocket/);
});

test('binder theme config exposes registry and CSS variable hooks', async () => {
  const source = await read('docs/js/binder-theme-config.js');
  assert.match(source, /starlight-classic/);
  assert.match(source, /THEME_VARS/);
  assert.match(source, /applyThemeVars/);
  assert.match(source, /resolveThemeId/);
});

test('album binder module paginates two-page spreads', async () => {
  const source = await read('docs/js/album-binder.js');
  assert.match(source, /POCKETS_PER_PAGE = 9/);
  assert.match(source, /CARDS_PER_SPREAD = POCKETS_PER_PAGE \* 2/);
  assert.match(source, /paginateSpread/);
  assert.match(source, /Pages \$\{leftPageNum\}–\$\{rightPageNum\}/);
});

test('3D album binder module renders spreads and page turns', async () => {
  const source = await read('docs/js/album-binder-3d.js');
  assert.match(source, /renderSceneHtml/);
  assert.match(source, /sortOwnedCards/);
  assert.match(source, /animateTurn/);
  assert.match(source, /bindDragCorners/);
  assert.match(source, /bindCardActions/);
  assert.match(source, /onCardOpen/);
  assert.match(source, /album-binder-3d-pocket-grid/);
});

test('card view transition module supports cinematic open and close', async () => {
  const source = await read('docs/js/card-view-transition.js');
  assert.match(source, /flyFromElement/);
  assert.match(source, /flyBack/);
  assert.match(source, /StarlightCardViewTransition/);
});

test('app.js wires cinematic full view and spread preloading', async () => {
  const app = await read('docs/js/app.js');
  assert.match(app, /renderAlbumBinder3D/);
  assert.match(app, /turnAlbumBinderSpread/);
  assert.match(app, /StarlightAlbumBinder3D/);
  assert.match(app, /data-binder-organize/);
  assert.match(app, /data-album-spread/);
  assert.match(app, /preloadAlbumBinderSpreadImages/);
  assert.match(app, /StarlightCardViewTransition/);
  assert.match(app, /openAlbumBinderCard/);
  assert.match(app, /onCardOpen/);
});

test('collection page loads 3D binder modules and styles', async () => {
  const collection = await read('docs/collection.html');
  assert.match(collection, /album-binder-3d\.js/);
  assert.match(collection, /album-binder-3d\.css/);
  assert.match(collection, /card-view-transition\.js/);
  assert.match(collection, /card-view-transition\.css/);
  assert.match(collection, /data-binder-organize/);
  assert.match(collection, /album-binder-3d-mount/);
  assert.match(collection, /Customize Binder/);
});

test('gallery page loads shared card modules', async () => {
  const binder = await read('docs/binder.html');
  assert.match(binder, /card-tile\.js/);
  assert.match(binder, /binder-theme-config\.js/);
});
