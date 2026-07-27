import { getPullFeed } from './social-service.js';
import { supabase } from './supabase-client.js';

const POLL_MS = 8000;
const MAX_ITEMS = 12;
const MAX_TICKER_ITEMS = 3;
const STORAGE_KEY = 'starlight-live-feed-expanded';

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

function readExpanded() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeExpanded(expanded) {
  try {
    localStorage.setItem(STORAGE_KEY, expanded ? '1' : '0');
  } catch {
    /* ignore */
  }
}

function tickerLabel(item) {
  const actor = item.actor || {};
  const handle = actor.username ? `@${actor.username}` : (actor.displayName || 'Collector');
  const summary = String(item.summary || 'New activity').replace(/\s+/g, ' ').trim();
  return `${handle} · ${summary} · ${relativeTime(item.createdAt)}`;
}

function estimateTickerItemWidth(label) {
  return Math.min(Math.max(label.length * 6.8 + 18, 96), 320);
}

function measureTickerCapacity(sourceItems, availableWidth) {
  if (!sourceItems.length || availableWidth <= 0) return 1;
  const widths = sourceItems.slice(0, MAX_TICKER_ITEMS).map((item) => estimateTickerItemWidth(tickerLabel(item)));
  const sepWidth = 22;
  for (let count = Math.min(MAX_TICKER_ITEMS, widths.length); count >= 1; count -= 1) {
    const total = widths.slice(0, count).reduce((sum, width) => sum + width, 0) + Math.max(0, count - 1) * sepWidth;
    if (total <= availableWidth) return count;
  }
  return 1;
}

function buildTickerMarkup(sourceItems, { animateNew = false } = {}) {
  const labels = sourceItems.map((item) => {
    const classes = ['shell-live-feed-ticker-item'];
    if (item.__isNew && animateNew) classes.push('is-entering');
    return `<span class="${classes.join(' ')}">${esc(tickerLabel(item))}</span>`;
  });
  return labels.join('<span class="shell-live-feed-ticker-sep" aria-hidden="true">✦</span>');
}

export function initLiveFeedWidget({ onOpenFullFeed } = {}) {
  const root = document.getElementById('shellLiveFeed');
  if (!root) return;

  const list = root.querySelector('[data-live-feed-list]');
  const ticker = root.querySelector('[data-live-feed-ticker]');
  const status = root.querySelector('[data-live-feed-status]');
  const toggle = root.querySelector('[data-live-feed-toggle]');
  const openFull = root.querySelector('[data-live-feed-open]');
  const head = root.querySelector('.shell-live-feed-head');

  let items = [];
  let knownIds = new Set();
  let tickerCapacity = 2;
  let lastTickerKey = '';
  let resizeObserver = null;
  let timer = 0;
  let loading = false;
  let signedIn = false;

  function getTickerWrap() {
    return ticker?.closest('.shell-live-feed-ticker-wrap') || ticker;
  }

  function syncTickerCapacity() {
    const wrap = getTickerWrap();
    tickerCapacity = measureTickerCapacity(items, wrap?.clientWidth || 0);
  }

  function getVisibleTickerItems() {
    syncTickerCapacity();
    return items.slice(0, tickerCapacity);
  }

  function renderTicker({ animateNew = false } = {}) {
    if (!ticker) return;
    if (!signedIn) {
      lastTickerKey = '';
      ticker.innerHTML = `<div class="shell-live-feed-ticker-track is-static"><span>Sign in to watch live collector activity</span></div>`;
      return;
    }
    if (!items.length) {
      lastTickerKey = '';
      ticker.innerHTML = `<div class="shell-live-feed-ticker-track is-static"><span>Listening for the next pull…</span></div>`;
      return;
    }

    const visible = getVisibleTickerItems();
    const nextKey = visible.map((item) => String(item.id)).join('|');
    const shouldAnimate = animateNew && visible.some((item) => item.__isNew) && nextKey !== lastTickerKey;
    ticker.innerHTML = `<div class="shell-live-feed-ticker-track is-static${shouldAnimate ? ' is-advancing' : ''}">${buildTickerMarkup(visible, { animateNew: shouldAnimate })}</div>`;
    lastTickerKey = nextKey;

    if (shouldAnimate) {
      const track = ticker.querySelector('.shell-live-feed-ticker-track');
      track?.addEventListener('animationend', () => {
        track.classList.remove('is-advancing');
        track.querySelectorAll('.shell-live-feed-ticker-item.is-entering').forEach((node) => {
          node.classList.remove('is-entering');
        });
      }, { once: true });
    }
  }

  function renderList() {
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

  function setExpanded(expanded) {
    root.classList.toggle('is-expanded', expanded);
    root.classList.toggle('is-collapsed', !expanded);
    if (toggle) {
      toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      toggle.textContent = expanded ? '▴' : '▾';
      toggle.setAttribute('aria-label', expanded ? 'Collapse live feed' : 'Expand live feed');
    }
    writeExpanded(expanded);
  }

  function render({ animateTicker = false } = {}) {
    renderTicker({ animateNew: animateTicker });
    renderList();
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
        lastTickerKey = '';
        render();
        if (status) status.textContent = 'Offline';
        return;
      }

      const data = await getPullFeed({ filter: 'everyone', limit: MAX_ITEMS });
      const next = data?.items || [];
      const nextIds = new Set(next.map((item) => String(item.id)));
      const hasNewEvents = knownIds.size > 0 && next.some((item) => !knownIds.has(String(item.id)));
      items = next.map((item) => ({
        ...item,
        __isNew: knownIds.size > 0 && !knownIds.has(String(item.id))
      }));
      knownIds = nextIds;
      render({ animateTicker: hasNewEvents });

      window.setTimeout(() => {
        items = items.map((item) => ({ ...item, __isNew: false }));
        render();
      }, 2200);
    } catch (error) {
      if (status) status.textContent = 'Paused';
      if (ticker && !items.length) {
        ticker.innerHTML = `<div class="shell-live-feed-ticker-track is-static"><span>${esc(error.message || 'Feed unavailable')}</span></div>`;
      }
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
    event.stopPropagation();
    setExpanded(!root.classList.contains('is-expanded'));
  });

  head?.addEventListener('click', (event) => {
    if (event.target.closest('.shell-live-feed-controls')) return;
    setExpanded(!root.classList.contains('is-expanded'));
  });

  openFull?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof onOpenFullFeed === 'function') onOpenFullFeed();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      window.clearInterval(timer);
    } else {
      start();
    }
  });

  document.addEventListener('click', (event) => {
    if (!root.classList.contains('is-expanded')) return;
    if (root.contains(event.target)) return;
    setExpanded(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && root.classList.contains('is-expanded')) {
      setExpanded(false);
    }
  });

  const tickerWrap = getTickerWrap();
  if (tickerWrap && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (root.classList.contains('is-expanded')) return;
      renderTicker();
    });
    resizeObserver.observe(tickerWrap);
  } else {
    window.addEventListener('resize', () => {
      if (root.classList.contains('is-expanded')) return;
      renderTicker();
    });
  }

  setExpanded(readExpanded());
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
      resizeObserver?.disconnect();
    }
  };
}
