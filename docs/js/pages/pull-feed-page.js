import { supabase } from '../supabase-client.js';
import { getPullFeed } from '../social-service.js';

const listEl = document.getElementById('pull-feed-list');
const statusEl = document.getElementById('pull-feed-status');
const moreBtn = document.getElementById('pull-feed-more');
const filterButtons = [...document.querySelectorAll('[data-feed-filter]')];

let activeFilter = 'everyone';
let items = [];
let loading = false;

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
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function avatarStyle(actor) {
  if (actor?.avatarUrl) {
    return `style="background-image:url('${esc(actor.avatarUrl)}')"`;
  }
  return '';
}

function renderItems() {
  if (!items.length) {
    listEl.innerHTML = `<div class="pull-feed-empty">No activity yet for this filter. Open a pack, follow collectors, or check back soon.</div>`;
    moreBtn.hidden = true;
    return;
  }

  listEl.innerHTML = items.map((item) => {
    const actor = item.actor || {};
    const highlight = item.payload?.highlight || null;
    const name = actor.displayName || actor.username || 'Collector';
    const profileHref = actor.username
      ? `binder.html?view=collector&username=${encodeURIComponent(actor.username)}`
      : '#';
    const isSeriesComplete = item.type === 'series_complete';
    const seriesName = item.payload?.seriesName || '';
    const thumb = highlight?.thumbnailUrl || highlight?.imageUrl || '';
    const badge = isSeriesComplete
      ? `<span class="pull-feed-badge" aria-hidden="true">🏆</span>`
      : (thumb
        ? `<img class="pull-feed-thumb" src="${esc(thumb)}" alt="">`
        : '');
    return `<article class="pull-feed-item${isSeriesComplete ? ' is-series-complete' : ''}">
      <a class="pull-feed-avatar" href="${profileHref}" data-shell-view="collector" ${avatarStyle(actor)} aria-label="${esc(name)}">${actor.avatarUrl ? '' : '✦'}</a>
      <div class="pull-feed-copy">
        <strong>${esc(item.summary || '')}</strong>
        <span><a href="${profileHref}">@${esc(actor.username || 'collector')}</a> · ${esc(relativeTime(item.createdAt))}${isSeriesComplete && seriesName ? ` · ${esc(seriesName)}` : ''}</span>
      </div>
      ${badge}
    </article>`;
  }).join('');

  moreBtn.hidden = items.length < 20;
}

async function loadFeed({ append = false } = {}) {
  if (loading) return;
  loading = true;
  statusEl.textContent = append ? 'Loading more…' : 'Loading feed…';
  moreBtn.disabled = true;

  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      statusEl.textContent = 'Sign in to browse the LIVE Feed.';
      listEl.innerHTML = `<div class="pull-feed-empty"><a href="login.html?mode=signin">Sign in</a> to see Everyone, Following, or Just You.</div>`;
      moreBtn.hidden = true;
      return;
    }

    const beforeId = append && items.length ? items[items.length - 1].id : null;
    const data = await getPullFeed({
      filter: activeFilter,
      limit: 40,
      beforeId
    });
    const next = data?.items || [];
    items = append ? items.concat(next) : next;
    statusEl.textContent = items.length
      ? `${items.length} update${items.length === 1 ? '' : 's'}`
      : 'No updates yet';
    renderItems();
  } catch (error) {
    statusEl.textContent = error.message || 'Could not load feed.';
    if (!append) {
      listEl.innerHTML = `<div class="pull-feed-empty">${esc(error.message || 'Could not load feed.')}</div>`;
    }
  } finally {
    loading = false;
    moreBtn.disabled = false;
  }
}

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.feedFilter || 'everyone';
    filterButtons.forEach((node) => {
      const on = node === button;
      node.classList.toggle('active', on);
      node.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    items = [];
    loadFeed();
  });
});

moreBtn?.addEventListener('click', () => loadFeed({ append: true }));

listEl?.addEventListener('click', (event) => {
  const link = event.target.closest('[data-shell-view="collector"]');
  if (!link) return;
  // Keep normal navigation inside the shell iframe; parent shell may intercept.
});

loadFeed();
