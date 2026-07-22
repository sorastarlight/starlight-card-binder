import { listPublicCollectorRankings } from '../collector-rankings-service.js';
import { levelFromPoints } from '../collector-level.js';
import {
  followCollector,
  getPublicCollectorSocial,
  unfollowCollector
} from '../social-service.js';
import { getPublicTradeLists } from '../trade-list-service.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';

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

const wishlistCache = new Map();
let offset = 0;
let searchQuery = '';
let requestToken = 0;
let debounceTimer = 0;

function rankingsCopy() {
  return getCachedWebsiteContent()?.rankings || {};
}

function copy(key, fallback) {
  const value = rankingsCopy()[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function setLive(message) {
  if (liveRegion) liveRegion.textContent = message;
}

function profileHref(username) {
  return `binder.html?view=collector&username=${encodeURIComponent(username)}`;
}

function tradeHref(username) {
  return `binder.html?view=offers&username=${encodeURIComponent(username)}`;
}

function avatarMarkup(entry) {
  const initial = (entry.displayName || entry.username || '?').trim().charAt(0).toUpperCase() || '✦';
  if (entry.avatarUrl) {
    return `<span class="rankings-avatar has-photo" style="background-image:url('${esc(entry.avatarUrl)}')" aria-hidden="true"></span>`;
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

function renderWishlistCards(cards) {
  if (!cards.length) {
    return '<p class="rankings-wishlist-empty">This collector is not publicly searching for any cards right now.</p>';
  }
  return `<div class="rankings-wishlist-grid">${cards.map(card => {
    const owned = card.viewerOwnsThis ? '<span class="rankings-match-pill">You own this</span>' : '';
    const art = card.thumbnailUrl || card.imageUrl || '';
    return `<article class="rankings-wish-card">
      ${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : '<div class="rankings-wish-fallback" aria-hidden="true">✦</div>'}
      <div>
        <strong>#${esc(card.collectorNumber || card.cardNumber)} ${esc(card.name)}</strong>
        <span>${esc(card.rarity)} · ${esc(card.seriesName || 'Series')}</span>
        ${owned}
      </div>
    </article>`;
  }).join('')}</div>`;
}

function renderRow(entry) {
  const level = levelFromPoints(entry.collectorXp);
  const rank = Number(entry.rank || 0);
  const topClass = rank >= 1 && rank <= 3 ? ` is-top-${rank}` : '';
  const showStats = !!entry.showCollectionStats;
  const completion = showStats ? Number(entry.completionPercent || 0) : null;
  const unique = showStats ? Number(entry.uniqueCards || 0) : null;
  const catalog = Number(entry.catalogTotal || 0);
  const title = entry.selectedTitle
    ? `<em class="rankings-title">${esc(entry.selectedTitle)}</em>`
    : '';

  const collectionStat = showStats
    ? `<div class="rankings-stat"><b>${esc(unique)}${catalog ? `/${esc(catalog)}` : ''}</b><span>Cards</span></div>
       <div class="rankings-stat"><b>${esc(completion)}%</b><span>Collection</span>
         <div class="rankings-progress" aria-hidden="true"><i style="width:${Math.max(0, Math.min(100, completion))}%"></i></div>
       </div>`
    : `<div class="rankings-stat"><b>—</b><span>Collection private</span></div>`;

  return `<li class="rankings-item" data-username="${esc(entry.username)}">
    <div class="rankings-row${topClass}">
      <div class="rankings-place" aria-label="Rank ${esc(rank)}">#${esc(rank)}</div>
      <a class="rankings-avatar-link" href="${esc(profileHref(entry.username))}" target="_top" data-shell-view="collector" aria-label="Open ${esc(entry.displayName || entry.username)} profile">
        ${avatarMarkup(entry)}
      </a>
      <div class="rankings-identity">
        <a href="${esc(profileHref(entry.username))}" target="_top" data-shell-view="collector">
          <strong>${esc(entry.displayName || entry.username || 'Collector')}</strong>
        </a>
        ${title}
        <span>@${esc(entry.username)}</span>
      </div>
      <div class="rankings-stats">
        <div class="rankings-stat"><b>Lv. ${esc(level.level)}</b><span>${esc(level.xp)} XP</span>
          <div class="rankings-progress" aria-hidden="true"><i style="width:${esc(level.percent)}%"></i></div>
        </div>
        ${collectionStat}
      </div>
    </div>
    <div class="rankings-actions">
      <a class="st-button" href="${esc(profileHref(entry.username))}" target="_top" data-shell-view="collector">${esc(copy('viewProfileCta', 'View profile'))}</a>
      <button type="button" class="st-button rankings-follow" data-follow-toggle aria-pressed="false" hidden>
        <span class="rankings-follow-icon" aria-hidden="true">♡</span>
        <span class="rankings-follow-label">${esc(copy('followCta', 'Follow'))}</span>
      </button>
      <button type="button" class="st-button" data-wishlist-toggle aria-expanded="false">${esc(copy('wishlistCta', 'Cards they want'))}</button>
      <a class="st-button primary" href="${esc(tradeHref(entry.username))}" target="_top" data-shell-view="offers">${esc(copy('proposeTradeCta', 'Propose trade'))}</a>
    </div>
    <div class="rankings-wishlist" hidden>
      <div class="rankings-wishlist-status">Loading wishlist…</div>
    </div>
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
    <button type="button" class="st-button" data-page="prev" ${canPrev ? '' : 'disabled'}>${esc(copy('prevCta', 'Previous'))}</button>
    <button type="button" class="st-button" data-page="next" ${canNext ? '' : 'disabled'}>${esc(copy('nextCta', 'Next'))}</button>
  `;
}

function followCtas() {
  return {
    follow: copy('followCta', 'Follow'),
    following: copy('followingCta', 'Following')
  };
}

function setFollowButtonState(button, following) {
  if (!button) return;
  const ctas = followCtas();
  const label = button.querySelector('.rankings-follow-label') || button;
  const icon = button.querySelector('.rankings-follow-icon');
  button.hidden = false;
  button.setAttribute('aria-pressed', following ? 'true' : 'false');
  button.classList.toggle('is-following', following);
  button.dataset.following = following ? '1' : '0';
  label.textContent = following ? ctas.following : ctas.follow;
  if (icon) icon.textContent = following ? '♥' : '♡';
}

async function mapPool(items, limit, worker) {
  let index = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index++;
      await worker(items[current], current);
    }
  });
  await Promise.all(runners);
}

async function hydrateFollowButtons(token) {
  const items = [...(root?.querySelectorAll('.rankings-item[data-username]') || [])];
  if (!items.length) return;

  await mapPool(items, 6, async item => {
    if (token !== requestToken) return;
    const username = item.dataset.username;
    const button = item.querySelector('[data-follow-toggle]');
    if (!username || !button) return;

    try {
      const social = await getPublicCollectorSocial(username);
      if (token !== requestToken) return;
      if (!social?.found || social.private || social.isSelf) {
        button.hidden = true;
        return;
      }
      setFollowButtonState(button, Boolean(social.follow?.following));
    } catch {
      if (token !== requestToken) return;
      setFollowButtonState(button, false);
    }
  });
}

async function toggleFollow(button) {
  const item = button?.closest('.rankings-item');
  const username = item?.dataset.username;
  if (!username || button.disabled) return;

  const nextFollow = button.dataset.following !== '1';
  const label = button.querySelector('.rankings-follow-label') || button;
  button.disabled = true;
  button.classList.add('is-busy');
  label.textContent = nextFollow ? 'Following…' : 'Unfollowing…';

  try {
    if (nextFollow) {
      await followCollector(username);
      setFollowButtonState(button, true);
      setLive(`You're now following @${username}.`);
      window.StarlightUI?.toast?.(`Following @${username}.`, 'success');
    } else {
      await unfollowCollector(username);
      setFollowButtonState(button, false);
      setLive(`Unfollowed @${username}.`);
      window.StarlightUI?.toast?.(`Unfollowed @${username}.`, 'success');
    }
  } catch (error) {
    setFollowButtonState(button, !nextFollow);
    const message = error?.message || 'Could not update follow.';
    setLive(message);
    window.StarlightUI?.toast?.(message, 'error') || alert(message);
  } finally {
    button.classList.remove('is-busy');
    button.disabled = false;
  }
}

async function loadWishlistPanel(item) {
  const username = item?.dataset.username;
  const panel = item?.querySelector('.rankings-wishlist');
  const toggle = item?.querySelector('[data-wishlist-toggle]');
  if (!username || !panel || !toggle) return;

  const open = panel.hasAttribute('hidden');
  document.querySelectorAll('.rankings-item.is-open').forEach(other => {
    if (other === item) return;
    other.classList.remove('is-open');
    other.querySelector('.rankings-wishlist')?.setAttribute('hidden', '');
    other.querySelector('[data-wishlist-toggle]')?.setAttribute('aria-expanded', 'false');
  });

  if (!open) {
    item.classList.remove('is-open');
    panel.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'false');
    return;
  }

  item.classList.add('is-open');
  panel.removeAttribute('hidden');
  toggle.setAttribute('aria-expanded', 'true');

  if (wishlistCache.has(username)) {
    panel.innerHTML = wishlistCache.get(username);
    return;
  }

  panel.innerHTML = '<div class="rankings-wishlist-status">Loading wishlist…</div>';
  try {
    const result = await getPublicTradeLists(username);
    let html = '';
    if (!result?.found) {
      html = '<p class="rankings-wishlist-empty">Trade lists are not available for this collector.</p>';
    } else if (!result.publicLists) {
      html = '<p class="rankings-wishlist-empty">This collector keeps their wishlist private.</p>';
    } else {
      const wishlist = Array.isArray(result.wishlist) ? result.wishlist : [];
      const owned = wishlist.filter(card => card.viewerOwnsThis).length;
      html = `<div class="rankings-wishlist-head">
        <strong>Searching for ${wishlist.length} card${wishlist.length === 1 ? '' : 's'}</strong>
        ${owned ? `<span>You own ${owned} of them</span>` : ''}
      </div>${renderWishlistCards(wishlist)}`;
    }
    wishlistCache.set(username, html);
    panel.innerHTML = html;
    setLive(`Loaded wishlist for @${username}.`);
  } catch (error) {
    panel.innerHTML = `<p class="rankings-wishlist-empty">${esc(error?.message || 'Wishlist could not load.')}</p>`;
  }
}

async function loadRankings({ resetOffset = false } = {}) {
  const token = ++requestToken;
  if (resetOffset) offset = 0;

  if (status) {
    status.hidden = false;
    status.innerHTML = `<h2>${esc(copy('loadingTitle', 'Loading rankings…'))}</h2><p>${esc(copy('loadingLead', 'Gathering public collectors.'))}</p>`;
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
        root.innerHTML = `<li class="rankings-empty"><h2>${esc(copy('emptyTitle', 'No collectors found'))}</h2><p>${
          esc(searchQuery
            ? copy('emptySearchLead', 'Try another display name or username.')
            : copy('emptyLead', 'Public collector profiles will appear here once they are available.'))
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
    hydrateFollowButtons(token);
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

root?.addEventListener('click', event => {
  const followToggle = event.target.closest('[data-follow-toggle]');
  if (followToggle) {
    toggleFollow(followToggle);
    return;
  }
  const toggle = event.target.closest('[data-wishlist-toggle]');
  if (!toggle) return;
  const item = toggle.closest('.rankings-item');
  loadWishlistPanel(item);
});

searchInput?.addEventListener('input', () => {
  window.clearTimeout(debounceTimer);
  debounceTimer = window.setTimeout(() => {
    searchQuery = String(searchInput.value || '').trim();
    loadRankings({ resetOffset: true });
  }, 280);
});

sortSelect?.addEventListener('change', () => {
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
window.addEventListener('starlight-website-content-hydrated', () => {
  if (root?.querySelector('.rankings-item, .rankings-empty')) {
    loadRankings({ resetOffset: false });
  }
});
