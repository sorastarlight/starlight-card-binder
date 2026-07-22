/** Shared Studio / admin live-preview helpers. */

export const STUDIO_PREVIEW_PARAM = 'studioPreview';

export const STUDIO_MSG = Object.freeze({
  CONTENT_DRAFT: 'starlight-website-content-draft',
  NAV_DRAFT: 'starlight-shell-navigation-draft',
  READY: 'starlight-studio-preview-ready'
});

export function isStudioPreview(search = typeof location !== 'undefined' ? location.search : '') {
  return new URLSearchParams(search).get(STUDIO_PREVIEW_PARAM) === '1';
}

/**
 * Build a relative preview URL for an embedded public page.
 * Preserves existing query params (e.g. binder.html?view=binder).
 */
export function buildContentStudioPreviewUrl(previewUrl) {
  const raw = String(previewUrl || 'home.html').trim() || 'home.html';
  const url = new URL(raw, 'https://starlight.local/');
  url.searchParams.set('embed', '1');
  url.searchParams.set(STUDIO_PREVIEW_PARAM, '1');
  const file = url.pathname.split('/').filter(Boolean).pop() || 'home.html';
  return `${file}?${url.searchParams.toString()}`;
}

/** Full binder shell preview for Website UI editing. */
export function buildShellStudioPreviewUrl(view = 'home') {
  const params = new URLSearchParams();
  params.set('view', view || 'home');
  params.set(STUDIO_PREVIEW_PARAM, '1');
  return `binder.html?${params.toString()}`;
}
