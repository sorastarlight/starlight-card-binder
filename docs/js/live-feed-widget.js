import { getPullFeed } from './social-service.js';
import { supabase } from './supabase-client.js';

const POLL_MS = 12000;
const MAX_ITEMS = 10;
const STORAGE_KEY = 'starlight-live-feed-collapsed';
const POSITION_KEY = 'starlight-live-feed-position';
const DRAG_MARGIN = 10;

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
    const raw = localStorage.getItem(STORAGE_KEY);
    // Default collapsed so the chip does not cover binder showcase copy.
    if (raw === null) return true;
    return raw === '1';
  } catch {
    return true;
  }
}

function writeCollapsed(collapsed) {
  try {
    localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function readPosition() {
  try {
    const raw = localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Number.isFinite(parsed?.x) && Number.isFinite(parsed?.y)) {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writePosition(point) {
  try {
    localStorage.setItem(POSITION_KEY, JSON.stringify({ x: point.x, y: point.y }));
  } catch {
    /* ignore */
  }
}

function clampPosition(x, y, root) {
  const rect = root.getBoundingClientRect();
  const width = rect.width || root.offsetWidth || 0;
  const height = rect.height || root.offsetHeight || 0;
  const maxX = Math.max(DRAG_MARGIN, window.innerWidth - width - DRAG_MARGIN);
  const maxY = Math.max(DRAG_MARGIN, window.innerHeight - height - DRAG_MARGIN);
  return {
    x: Math.min(Math.max(DRAG_MARGIN, x), maxX),
    y: Math.min(Math.max(DRAG_MARGIN, y), maxY)
  };
}

function applyPosition(root, x, y, { persist = false } = {}) {
  const next = clampPosition(x, y, root);
  root.style.right = 'auto';
  root.style.bottom = 'auto';
  root.style.left = `${next.x}px`;
  root.style.top = `${next.y}px`;
  root.classList.add('is-positioned');
  if (persist) writePosition(next);
  return next;
}

function defaultPosition(root) {
  const rect = root.getBoundingClientRect();
  const styles = window.getComputedStyle(root);
  const left = Number.parseFloat(styles.left);
  const bottom = Number.parseFloat(styles.bottom);
  const safeLeft = Number.isFinite(left) ? left : DRAG_MARGIN;
  const safeBottom = Number.isFinite(bottom) ? bottom : DRAG_MARGIN;
  return {
    x: safeLeft,
    y: window.innerHeight - rect.height - safeBottom
  };
}

function initLiveFeedPosition(root) {
  const saved = readPosition();
  if (saved) {
    applyPosition(root, saved.x, saved.y);
    return;
  }
  const fallback = defaultPosition(root);
  applyPosition(root, fallback.x, fallback.y);
}

function bindLiveFeedDrag(root) {
  const handle = root.querySelector('.shell-live-feed-head');
  if (!handle) return () => {};

  let drag = null;

  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    handle.releasePointerCapture?.(event.pointerId);
    root.classList.remove('is-dragging');
    handle.removeAttribute('aria-grabbed');
    if (drag.moved) {
      const rect = root.getBoundingClientRect();
      applyPosition(root, rect.left, rect.top, { persist: true });
    }
    drag = null;
  };

  handle.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    if (event.target.closest('.shell-live-feed-controls')) return;

    const rect = root.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false
    };
    handle.setPointerCapture(event.pointerId);
    root.classList.add('is-dragging');
    handle.setAttribute('aria-grabbed', 'true');
    event.preventDefault();
  });

  handle.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    applyPosition(root, drag.originX + dx, drag.originY + dy);
    event.preventDefault();
  });

  handle.addEventListener('pointerup', finishDrag);
  handle.addEventListener('pointercancel', finishDrag);

  const onResize = () => {
    const rect = root.getBoundingClientRect();
    applyPosition(root, rect.left, rect.top, { persist: true });
  };
  window.addEventListener('resize', onResize);

  return () => window.removeEventListener('resize', onResize);
}

export function initLiveFeedWidget({ onOpenFullFeed } = {}) {
  const root = document.getElementById('shellLiveFeed');
  if (!root) return;

  const list = root.querySelector('[data-live-feed-list]');
  const status = root.querySelector('[data-live-feed-status]');
  const toggle = root.querySelector('[data-live-feed-toggle]');
  const openFull = root.querySelector('[data-live-feed-open]');
  const body = root.querySelector('[data-live-feed-body]');
  const head = root.querySelector('.shell-live-feed-head');

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
    window.requestAnimationFrame(() => {
      const rect = root.getBoundingClientRect();
      applyPosition(root, rect.left, rect.top, { persist: true });
    });
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
  initLiveFeedPosition(root);
  const unbindDrag = bindLiveFeedDrag(root);
  if (head) head.title = 'Drag to move LIVE Feed';
  start();

  return {
    refresh,
    setSuppressed(hidden) {
      root.hidden = Boolean(hidden);
      root.classList.toggle('is-suppressed', Boolean(hidden));
      if (hidden) window.clearInterval(timer);
      else start();
    },
    destroy() {
      window.clearInterval(timer);
      unbindDrag?.();
    }
  };
}
