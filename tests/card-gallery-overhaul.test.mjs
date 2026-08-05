import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const read = (relativePath) => readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');

test('shared card tile module renders gallery, album, and list modes', async () => {
  const source = await read('docs/js/card-tile.js');
  assert.match(source, /renderGalleryTile/);
  assert.match(source, /renderAlbumTile/);
  assert.match(source, /renderSpreadSlot/);
  assert.match(source, /renderListTile/);
  assert.match(source, /card-gallery-item/);
  assert.match(source, /card-album-sleeve/);
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
  assert.match(source, /renderSpreadHtml/);
  assert.match(source, /card-album-binder-spread/);
  assert.match(source, /Pages \$\{leftPageNum\}–\$\{rightPageNum\}/);
});

test('app.js wires album spread rendering and full view open', async () => {
  const app = await read('docs/js/app.js');
  assert.match(app, /renderAlbumBinderSpread/);
  assert.match(app, /turnAlbumBinderSpread/);
  assert.match(app, /StarlightAlbumBinder/);
  assert.match(app, /data-binder-organize/);
  assert.match(app, /data-album-spread/);
  assert.match(app, /initCardInteractionDelegation/);
  assert.match(app, /notifyEmbedLayoutReady/);
  assert.match(app, /openAlbumBinderCard/);
  assert.match(app, /scanPerspectiveCardsIn\(wrap\)/);
});

test('collection page loads spread binder modules and styles', async () => {
  const collection = await read('docs/collection.html');
  assert.match(collection, /album-binder\.js/);
  assert.match(collection, /card-album-page\.css/);
  assert.match(collection, /starlight-perspective-card\.js/);
  assert.doesNotMatch(collection, /album-binder-3d\.js/);
  assert.doesNotMatch(collection, /album-binder-3d\.css/);
  assert.match(collection, /data-binder-organize/);
  assert.match(collection, /card-album-binder-mount/);
  assert.match(collection, /Customize Binder/);
});

test('gallery page loads shared card modules', async () => {
  const binder = await read('docs/binder.html');
  assert.match(binder, /card-tile\.js/);
  assert.match(binder, /binder-theme-config\.js/);
});
