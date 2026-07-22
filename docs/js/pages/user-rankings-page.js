import { listPublicCollectorRankings } from '../collector-rankings-service.js';
import { levelFromPoints } from '../collector-level.js';

const PAGE_SIZE = 40;
const root = document.querySelector('#rankingsList');
const meta = document.querySelector('#rankingsMeta');
const status = document.querySelector('#rankingsStatus');
const searchInput = document.querySelector('#rankingsSearch');
const sortSelect = document.querySelector('#rankingsSort');
const pager = document.querySelector('#rankingsPager');
const liveRegion = document.querySelector('#rankingsLive');

const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m]));

let offset = 0;
let searchQuery = '';
let requestToken = 0;
let debounceTimer = 0;

function setLive(message) {
  if (liveRegion) liveRegion.textContent = message;
}

function profileHref(username) {
  return `binder.html?view=collector&username=${encodeURIComponent(username)}`;
}

function avatarMarkup(entry) {
  const initial = (entry.displayName || entry.username || '?').trim().charAt(0).toUpperCase() || '✦';
  if (entry.avatarUrl) {
    return `<span class="rankings-avatar has-photo" style="background-image:url('${esc(entry.avatarUrl)}')" role="img" aria-label=""></span>`;
  }
  return `<span class="rankings-avatar" aria-hidden="true">${esc(initial)}</span>`;
}

function sortEntries(entries, mode) {
  const list = [...entries];
  const byName = (a, b) => String(a.displayName || a.username || '')
    .localeCompare(String(b.displayName || b.username || ''), undefined, { sensitivity: 'base' });

  switch (mode) {
    case 'name':
      return list.sort(byName);
    case 'collection':
      return list.sort((a, b) => {
        const ac = a.showCollectionStats ? Number(a.completionPercent || 0) : -1;
        const bc = b.showCollectionStats ? Number(b.completionPercent || 0) : -1;
        if (bc !== ac) return bc - ac;
        return Number(a.rank || 0) - Number(b.rank || 0);
      });
    case 'unique':
      return list.sort((a, b) => {
        const au = a.showCollectionStats ? Number(a.uniqueCards || 0) : -1;
        const bu = b.showCollectionStats ? Number(b.uniqueCards || 0) : -1;
        if (bu !== au) return bu - au;
        return Number(a.rank || 0) - Number(b.rank || 0);
      });
    case 'level':
    default:
      return list.sort((a, b) => {
        const ax = Number(a.collectorXp || 0);
        const bx = Number(b.collectorXp || 0);
        if (bx !== ax) return bx - ax;
        return Number(a.rank || 0) - Number(b.rank || 0);
      });
  }
}

function renderRow(entry) {
  const level = levelFromPoints(entry.collectorXp);
  const rank = Number(entry.rank || 0);
  const topClass = rank >= 1 && rank <= 3 ? ` is-top-${rank}` : '';
  const showStats = !!entry.showCollectionStats;
  const completion = showStats ? Number(entry.completionPercent || 0) : null;
  const unique = showStats ? Number(entry.uniqueCards || 0) : null;
  const catalog = Number(entry.catalogTotal || 0);

  const collectionStat = showStats
    ? `<div class="rankings-stat"><b>${esc(unique)}${catalog ? `/${esc(catalog)}` : ''}</b><span>Cards</span></div>
       <div class="rankings-stat"><b>${esc(completion)}%</b><span>Collection</span>
         <div class="rankings-progress" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, completion))}%"></i></div>
       </div>`
    : `<div class="rankings-stat"><b>—</b><span>Collection private</span></div>`;

  return `<li>
    <a class="rankings-row${topClass}" href="${esc(profileHref(entry.username))}" target="_top" data-shell-view="collector">
      <div class="rankings-place" aria-label="Rank ${esc(rank)}"><small>#</small>${esc(rank)}</div>
      ${avatarMarkup(entry)}
      <div class="rankings-identity">
        <strong>${esc(entry.displayName || entry.username || 'Collector')}</strong>
        <span>@${esc(entry.username)}</span>
      </div>
      <div class="rankings-stats">
        <div class="rankings-stat"><b>Lv. ${esc(level.level)}</b><span>${esc(level.xp)} XP</span>
          <div class="rankings-progress" aria-hidden="true"><i style="width:${esc(level.percent)}%"></i></div>
        </div>
        ${collectionStat}
      </div>
    </a>
  </li>`;
}

function renderPager(total) {
  if (!pager) return;
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;
  if (!canPrev && !canNext) {
    pager.innerHTML = '';
    pager.hidden = true;
    return;
  }
  pager.hidden = false;
  pager.innerHTML = `
    <button type="button" class="st-button" data-page="prev" ${canPrev ? '' : 'disabled'}>Previous</button>
    <button type="button" class="st-button" data-page="next" ${canNext ? '' : 'disabled'}>Next</button>
  `;
}

async function loadRankings({ resetOffset = false } = {}) {
  const token = ++requestToken;
  if (resetOffset) offset = 0;

  if (status) {
    status.hidden = false;
    status.innerHTML = '<h2>Loading rankings…</h2><p>Gathering public collectors.</p>';
  }
  if (root) root.innerHTML = '';
  if (meta) meta.textContent = '';

  try {
    const data = await listPublicCollectorRankings({
      search: searchQuery,
      limit: PAGE_SIZE,
      offset
    });
    if (token !== requestToken) return;

    const sorted = sortEntries(data.results, sortSelect?.value || 'level');
    if (status) status.hidden = true;

    if (!sorted.length) {
      if (root) {
        root.innerHTML = `<li class="rankings-empty"><h2>No collectors found</h2><p>${
          searchQuery
            ? 'Try another display name or username.'
            : 'Public collector profiles will appear here once they are available.'
        }</p></li>`;
      }
      if (meta) meta.textContent = '0 collectors';
      setLive('No collectors found.');
      renderPager(0);
      return;
    }

    if (root) root.innerHTML = sorted.map(renderRow).join('');
    const start = offset + 1;
    const end = offset + sorted.length;
    if (meta) {
      meta.textContent = searchQuery
        ? `Showing ${start}–${end} of ${data.total} matching collectors`
        : `Showing ${start}–${end} of ${data.total} public collectors · ranked by level`;
    }
    setLive(`Loaded ${sorted.length} collectors.`);
    renderPager(data.total);
  } catch (error) {
    if (token !== requestToken) return;
    if (status) {
      status.hidden = false;
      status.innerHTML = `<h2>Rankings could not load</h2><p>${esc(error?.message || 'Please try again shortly.')}</p>`;
    }
    if (root) root.innerHTML = '';
    setLive('Rankings failed to load.');
    renderPager(0);
  }
}

searchInput?.addEventListener('input', () => {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    searchQuery = String(searchInput.value || '').trim();
    loadRankings({ resetOffset: true });
  }, 280);
});

sortSelect?.addEventListener('change', () => {
  // Re-sort the current page without refetch when possible.
  loadRankings({ resetOffset: false });
});

pager?.addEventListener('click', event => {
  const button = event.target.closest('[data-page]');
  if (!button || button.disabled) return;
  if (button.dataset.page === 'prev') offset = Math.max(0, offset - PAGE_SIZE);
  if (button.dataset.page === 'next') offset += PAGE_SIZE;
  loadRankings();
});

loadRankings({ resetOffset: true });
