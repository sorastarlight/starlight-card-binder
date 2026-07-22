import { getWebsiteContent } from './website-content-service.js';
import { mergeWebsiteContent } from './website-content-model.js';

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
  if (path === 'home.primaryCta') return content.home?.primaryCta?.label ?? null;
  if (path === 'home.secondaryCta') return content.home?.secondaryCta?.label ?? null;
  if (path === 'home.newsEyebrow') return content.home?.newsHeading?.eyebrow ?? null;
  if (path === 'home.newsTitle') return content.home?.newsHeading?.title ?? null;
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
  return typeof cursor === 'string' ? cursor : null;
}

function rebuildSocialLinks(content) {
  const roots = document.querySelectorAll('.social-links');
  if (!roots.length) return;
  const links = Array.isArray(content?.socials?.links) ? content.socials.links : [];
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
 * Missing elements are ignored. Social link lists are rebuilt from content.
 */
export function hydrateWebsiteContent(content) {
  const next = mergeWebsiteContent(content);
  if (typeof window !== 'undefined') {
    window.__starlightWebsiteContent = next;
  }

  document.querySelectorAll('[data-content]').forEach((el) => {
    const path = el.getAttribute('data-content');
    const value = resolveContentValue(next, path);
    if (value == null) return;
    el.textContent = value;
  });

  rebuildSocialLinks(next);
  return next;
}

export async function loadAndHydrateWebsiteContent() {
  try {
    const content = await getWebsiteContent();
    return hydrateWebsiteContent(content);
  } catch {
    if (typeof window !== 'undefined' && window.__starlightWebsiteContent) {
      return hydrateWebsiteContent(window.__starlightWebsiteContent);
    }
    return hydrateWebsiteContent(null);
  }
}
