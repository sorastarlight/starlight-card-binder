import { getPullFeed } from './social-service.js';
import { supabase } from './supabase-client.js';

const POLL_MS = 12000;
const MAX_ITEMS = 10;
const STORAGE_KEY = 'starlight-live-feed-collapsed';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const delta = Math.max(0, Date.now() - date.getTime());
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function readCollapsed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function initLiveFeedWidget({ onOpenFullFeed } = {}) {
  const root = document.getElementById('shellLiveFeed');
  if (!root) return;

  const list = root.querySelector('[data-live-feed-list]');
  const status = root.querySelector('[data-live-feed-status]');
  const toggle = root.querySelector('[data-live-feed-toggle]');
  const openFull = root.querySelector('[data-live-feed-open]');
  const body = root.querySelector('[data-live-feed-body]');

  let items = [];
  let knownIds = new Set();
  let timer = 0;
  let loading = false;
  let signedIn = false;

  function setCollapsed(collapsed) {
    root.classList.toggle('is-collapsed', collapsed);
    if (toggle) {
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      toggle.textContent = collapsed ? '▴' : '▾';
      toggle.setAttribute('aria-label', collapsed ? 'Expand live feed' : 'Collapse live feed');
    }
    writeCollapsed(collapsed);
  }

  function render() {
    if (!list) return;
    if (!signedIn) {
      list.innerHTML = `<div class="shell-live-feed-empty">Sign in to watch live collector activity.</div>`;
      if (status) status.textContent = 'Offline';
      return;
    }
    if (!items.length) {
      list.innerHTML = `<div class="shell-live-feed-empty">Waiting for the next pull…</div>`;
      if (status) status.textContent = 'Listening';
      return;
    }

    list.innerHTML = items.map((item, index) => {
      const actor = item.actor || {};
      const highlight = item.payload?.highlight || null;
      const thumb = highlight?.thumbnailUrl || highlight?.imageUrl || '';
      const isNew = item.__isNew;
      const isSeriesComplete = item.type === 'series_complete';
      const media = isSeriesComplete
        ? `<span class="shell-live-feed-badge" aria-hidden="true">🏆</span>`
        : (thumb
          ? `<img class="shell-live-feed-thumb" src="${esc(thumb)}" alt="">`
          : `<span class="shell-live-feed-dot" aria-hidden="true"></span>`);
      return `<article class="shell-live-feed-item${isNew ? ' is-new' : ''}${isSeriesComplete ? ' is-series-complete' : ''}" style="--i:${index}">
        ${media}
        <div class="shell-live-feed-copy">
          <strong>${esc(item.summary || '')}</strong>
          <span>${esc(relativeTime(item.createdAt))}${actor.username ? ` · @${esc(actor.username)}` : ''}</span>
        </div>
      </article>`;
    }).join('');

    if (status) status.textContent = 'Live';
  }

  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const { data: auth } = await supabase.auth.getUser();
      signedIn = Boolean(auth?.user);
      if (!signedIn) {
        items = [];
        knownIds = new Set();
        render();
        return;
      }

      const data = await getPullFeed({ filter: 'everyone', limit: MAX_ITEMS });
      const next = data?.items || [];
      const nextIds = new Set(next.map((item) => String(item.id)));
      const enriched = next.map((item) => ({
        ...item,
        __isNew: knownIds.size > 0 && !knownIds.has(String(item.id))
      }));
      items = enriched;
      knownIds = nextIds;
      render();

      // Clear "new" highlight after the entrance animation window.
      window.setTimeout(() => {
        items = items.map((item) => ({ ...item, __isNew: false }));
        render();
      }, 2200);
    } catch (error) {
      if (status) status.textContent = 'Paused';
      if (list && !items.length) {
        list.innerHTML = `<div class="shell-live-feed-empty">${esc(error.message || 'Feed unavailable')}</div>`;
      }
    } finally {
      loading = false;
    }
  }

  function start() {
    window.clearInterval(timer);
    refresh();
    timer = window.setInterval(refresh, POLL_MS);
  }

  toggle?.addEventListener('click', (event) => {
    event.preventDefault();
    setCollapsed(!root.classList.contains('is-collapsed'));
  });

  openFull?.addEventListener('click', (event) => {
    event.preventDefault();
    if (typeof onOpenFullFeed === 'function') onOpenFullFeed();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearInterval(timer);
    } else {
      start();
    }
  });

  setCollapsed(readCollapsed());
  start();

  return {
    refresh,
    destroy() {
      window.clearInterval(timer);
    }
  };
}
