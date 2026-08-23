/** Legacy embed helpers — standalone TCG pages are first-class; embed=1 still reports height to parent frames. */

import { pageHref } from './page-href.js';

const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === '1' || (window.parent !== window && params.get('embed') !== '0');

function normalizePageName(value) {
  const raw = String(value || '').split('/').pop().toLowerCase().split('?')[0].split('#')[0];
  if (!raw || raw === '/') return 'index.html';
  if (raw.endsWith('.html')) return raw;
  return `${raw}.html`;
}

const file = normalizePageName(location.pathname);

function routeForUrl(value) {
  try {
    const u = new URL(value, location.href);
    const name = normalizePageName(u.pathname);
    if (name === 'binder.html') {
      const view = u.searchParams.get('view');
      if (view) return { u, href: pageHref(view, Object.fromEntries(u.searchParams)) };
    }
    return { u, href: u.pathname.split('/').pop() + u.search };
  } catch {
    return { u: null, href: null };
  }
}

function send(type, extra = {}) {
  if (window.parent === window) return;
  parent.postMessage({ type, view: file, ...extra }, location.origin);
}

function measureContentHeight() {
  const main = document.querySelector('#main') || document.querySelector('main') || document.body;
  return Math.max(320, Math.ceil(main.getBoundingClientRect().height + 24));
}

let lastHeight = 0;
let resizeFrame = 0;

function reportHeight() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    const height = measureContentHeight();
    if (Math.abs(height - lastHeight) > 2) {
      lastHeight = height;
      send('starlight-view-height', { height });
    }
  });
}

function announceReady() {
  reportHeight();
  send('starlight-view-ready', { height: measureContentHeight(), loadToken: params.get('shellLoad') || '' });
}

if (embedded) {
  document.documentElement.classList.add('starlight-embedded');
  const style = document.createElement('style');
  style.textContent = `
    html.starlight-embedded, html.starlight-embedded body { background: transparent !important; min-height: 0 !important; overflow: hidden !important; }
    html.starlight-embedded #site-header, html.starlight-embedded #site-footer { display: none !important; }
    html.starlight-embedded #main { padding-top: 0 !important; }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', () => {
    announceReady();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(reportHeight);
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    }
  });
  window.addEventListener('load', () => { announceReady(); setTimeout(announceReady, 120); });
  window.__starlightEmbedAnnounceReady = announceReady;
  window.__starlightEmbedReportHeight = reportHeight;
}

export { routeForUrl, embedded };
