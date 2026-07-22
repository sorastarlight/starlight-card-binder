import { getWebsiteContent } from './website-content-service.js';
import { mergeWebsiteContent } from './website-content-model.js';
import { isStudioPreview, STUDIO_MSG } from './studio-preview.js';

const esc = (value) =>
  (typeof window !== 'undefined' && window.StarlightUI?.escapeHtml
    ? window.StarlightUI.escapeHtml(value)
    : String(value ?? '').replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m])));

function resolveContentValue(content, path) {
  if (!content || !path) return null;

  // Compatibility aliases for older path names / nested shapes.
  if (path === 'home.primaryCta') {
    const value = content.home?.primaryCta;
    return typeof value === 'object' ? value?.label ?? null : value ?? null;
  }
  if (path === 'home.secondaryCta') {
    const value = content.home?.secondaryCta;
    return typeof value === 'object' ? value?.label ?? null : value ?? null;
  }
  if (path === 'home.newsEyebrow') {
    return content.home?.newsEyebrow ?? content.home?.newsHeading?.eyebrow ?? null;
  }
  if (path === 'home.newsTitle') {
    return content.home?.newsTitle ?? content.home?.newsHeading?.title ?? null;
  }
  if (path.startsWith('home.quickLink.')) {
    const id = path.slice('home.quickLink.'.length);
    return content.home?.quickLinks?.find((link) => link.id === id)?.label ?? null;
  }
  if (path.startsWith('binder.')) {
    const key = path.slice('binder.'.length);
    return content.binderLanding?.[key] ?? null;
  }

  const parts = path.split('.');
  let cursor = content;
  for (const part of parts) {
    if (cursor == null || typeof cursor !== 'object') return null;
    cursor = cursor[part];
  }
  if (typeof cursor === 'string') return cursor;
  if (cursor && typeof cursor === 'object' && typeof cursor.label === 'string') return cursor.label;
  return null;
}

function setContentVisibility(el, visible) {
  if (!el) return;
  el.hidden = !visible;
  if (visible) el.removeAttribute('aria-hidden');
  else el.setAttribute('aria-hidden', 'true');
  el.classList.toggle('is-content-hidden', !visible);
}

function rebuildSocialLinks(content) {
  const roots = document.querySelectorAll('[data-content-socials], .social-links');
  if (!roots.length) return;
  const links = content?.socials?.links || [];
  const html = links.map((link) => `
    <a class="link-card" href="${esc(link.url)}" rel="noopener" target="_blank">
      <span aria-hidden="true">${esc(link.icon)}</span>
      <b>${esc(link.label)}</b>
      <small>${esc(link.handle)}</small>
    </a>
  `).join('');
  roots.forEach((root) => {
    root.innerHTML = html;
  });
}

/**
 * Apply sanitized website content to elements marked with data-content.
 * Paths use dot notation, e.g. daily.title, shop.emptyCategory, shared.infoStripCopyright.
 * Empty strings hide the element (staff can remove eyebrows/titles in the Website Editor).
 */
export function hydrateWebsiteContent(content) {
  const payload = mergeWebsiteContent(content);
  window.__starlightWebsiteContent = payload;

  document.querySelectorAll('[data-content]').forEach((el) => {
    const path = el.getAttribute('data-content');
    const value = resolveContentValue(payload, path);
    if (value == null) return;
    if (value === '') {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = '';
      } else {
        el.textContent = '';
      }
      setContentVisibility(el, false);
      return;
    }
    setContentVisibility(el, true);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.value = value;
      return;
    }
    el.textContent = value;
  });

  rebuildSocialLinks(payload);
  try {
    window.dispatchEvent(new CustomEvent('starlight-website-content-hydrated', { detail: payload }));
  } catch (_error) {
    /* ignore */
  }
  return payload;
}

function announceStudioPreviewReady() {
  if (window.parent === window) return;
  try {
    window.parent.postMessage({ type: STUDIO_MSG.READY, kind: 'website' }, window.location.origin);
  } catch (_error) {
    /* ignore */
  }
}

function installStudioPreviewListener() {
  if (window.__starlightStudioContentPreviewInstalled) return;
  window.__starlightStudioContentPreviewInstalled = true;
  window.addEventListener('message', (event) => {
    if (event.origin !== window.location.origin) return;
    const data = event.data || {};
    if (data.type !== STUDIO_MSG.CONTENT_DRAFT) return;
    hydrateWebsiteContent(data.content || null);
  });
}

export async function loadAndHydrateWebsiteContent() {
  if (isStudioPreview()) {
    installStudioPreviewListener();
    document.documentElement.classList.add('starlight-studio-preview');
    const draft = window.__starlightWebsiteContentDraft || null;
    const payload = hydrateWebsiteContent(draft);
    announceStudioPreviewReady();
    return payload;
  }

  try {
    const content = await getWebsiteContent();
    return hydrateWebsiteContent(content);
  } catch (error) {
    console.warn('[Starlight] Website content hydrate failed', error);
    return hydrateWebsiteContent(null);
  }
}

export function getCachedWebsiteContent() {
  return window.__starlightWebsiteContent || null;
}
