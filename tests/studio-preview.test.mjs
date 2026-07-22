import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildContentStudioPreviewUrl,
  buildShellStudioPreviewUrl,
  isStudioPreview
} from '../docs/js/studio-preview.js';

test('studio preview helpers build relative preview URLs', () => {
  assert.equal(isStudioPreview('?studioPreview=1'), true);
  assert.equal(isStudioPreview(''), false);
  assert.match(buildContentStudioPreviewUrl('home.html'), /home\.html\?/);
  assert.match(buildContentStudioPreviewUrl('home.html'), /studioPreview=1/);
  assert.match(buildContentStudioPreviewUrl('home.html'), /embed=1/);
  assert.match(buildContentStudioPreviewUrl('binder.html?view=binder'), /view=binder/);
  assert.match(buildShellStudioPreviewUrl('home'), /binder\.html\?view=home/);
  assert.match(buildShellStudioPreviewUrl('home'), /studioPreview=1/);
});
