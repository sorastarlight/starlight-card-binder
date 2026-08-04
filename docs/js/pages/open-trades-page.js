import { listPublicCollectorRankings } from '../collector-rankings-service.js';
import { getPublicTradeLists } from '../trade-list-service.js';
import { shellHref } from '../shell-route-utils.js';
import { supabase } from '../supabase-client.js';
import { avatarFrameClassName, avatarFrameOverlayMarkup, avatarFrameOverlayUrl } from '../avatar-frame-utils.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';

const PAGE_SIZE = 24;
const FETCH_POOL = 5;

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

function tradesCopy() {
  return getCachedWebsiteContent()?.trades || {};
}

function copy(key, fallback) {
  const value = tradesCopy()[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function avatarMarkup(entry) {
  const initial = (entry.displayName || entry.username || '?').trim().charAt(0).toUpperCase() || '✦';
  const frameClass = avatarFrameClassName(entry.frame || null);
  const frameSuffix = frameClass ? ` ${frameClass}` : '';
  const overlayClass = avatarFrameOverlayUrl(entry.frame || null) ? ' avatar-frame-has-overlay' : '';
  const overlayMarkup = avatarFrameOverlayMarkup(entry.frame || null, esc);
  if (entry.avatarUrl) {
    return `<span class="open-trades-avatar has-photo${frameSuffix}${overlayClass}" style="background-image:url('${esc(entry.avatarUrl)}')" aria-hidden="true">${overlayMarkup}</span>`;
  }
  return `<span class="open-trades-avatar${frameSuffix}${overlayClass}" aria-hidden="true">${overlayMarkup}${esc(initial)}</span>`;
}

function tradeCardHtml(card) {
  const art = card.thumbnailUrl || card.imageUrl || '';
  const number = card.collectorNumber || card.cardNumber;
  const qty = Number(card.tradeQuantity) || 0;
  return `<article class="open-trades-card">
    <div class="open-trades-card-art">
      ${art ? `<img src="${esc(art)}" alt="" loading="lazy">` : '<div class="open-trades-card-fallback" aria-hidden="true">✦</div>'}
    </div>
    <div class="open-trades-card-copy">
      <strong>#${esc(number)} ${esc(card.name)}</strong>
      <span>${esc(card.rarity)} · ${esc(card.seriesName || 'Series')}</span>
      <span class="open-trades-qty">×${qty} available</span>
      ${card.viewerWantsThis ? '<span class="open-trades-match">On your want list</span>' : ''}
    </div>
  </article>`;
}

function collectorBlock(entry, forTrade) {
  const profileUrl = shellHref('collector', { username: entry.username });
  const count = forTrade.length;
  return `<article class="open-trades-collector" data-username="${esc(entry.username)}">
    <details class="open-trades-details" open>
      <summary class="open-trades-collector-head">
        <a class="open-trades-avatar-link" href="${esc(profileUrl)}" target="_top" data-shell-view="collector" aria-label="Open ${esc(entry.displayName || entry.username)} profile" onclick="event.stopPropagation()">
          ${avatarMarkup(entry)}
        </a>
        <div class="open-trades-collector-copy">
          <a href="${esc(profileUrl)}" target="_top" data-shell-view="collector" onclick="event.stopPropagation()"><strong>${esc(entry.displayName || entry.username)}</strong></a>
          <span>@${esc(entry.username)}</span>
          <span class="open-trades-count">${count} card${count === 1 ? '' : 's'} for trade</span>
        </div>
        <span class="open-trades-expand" aria-hidden="true"></span>
      </summary>
      <div class="open-trades-body">
        <div class="open-trades-grid">${forTrade.map(tradeCardHtml).join('')}</div>
        <button type="button" class="st-button primary" data-propose-trade data-username="${esc(entry.username)}">${esc(copy('proposeTradeCta', 'Propose trade'))}</button>
      </div>
    </details>
  </article>`;
}

async function getViewerUsername() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return '';
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .maybeSingle();
  return String(profile?.username || '').trim().toLowerCase();
}

function isSelfCollector(entry, viewerUsername) {
  if (!viewerUsername) return false;
  return String(entry?.username || '').trim().toLowerCase() === viewerUsername;
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

export function initOpenTrades(container) {
  if (!container) return null;

  const listRoot = container.querySelector('#openTradesList');
  const meta = container.querySelector('#openTradesMeta');
  const status = container.querySelector('#openTradesStatus');
  const searchInput = container.querySelector('#openTradesSearch');
  const pager = container.querySelector('#openTradesPager');

  let offset = 0;
  let searchQuery = '';
  let requestToken = 0;
  let debounceTimer = 0;

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
      <button type="button" class="st-button" data-page="prev"${canPrev ? '' : ' disabled'}>Previous</button>
      <button type="button" class="st-button" data-page="next"${canNext ? '' : ' disabled'}>Next</button>
    `;
  }

  async function loadOpenTrades({ resetOffset = false } = {}) {
    const token = ++requestToken;
    if (resetOffset) offset = 0;

    if (listRoot) {
      listRoot.innerHTML = `<div class="open-trades-loading"><h2>${esc(copy('openTradesLoadingTitle', 'Loading open trades…'))}</h2><p>${esc(copy('openTradesLoadingLead', 'Checking which collectors have cards listed.'))}</p></div>`;
    }
    if (status) status.textContent = 'Loading…';
    if (meta) meta.textContent = '';

    try {
      const data = await listPublicCollectorRankings({
        search: searchQuery,
        limit: PAGE_SIZE,
        offset
      });
      if (token !== requestToken) return;

      const viewerUsername = await getViewerUsername();
      if (token !== requestToken) return;

      const collectors = (Array.isArray(data.results) ? data.results : [])
        .filter(entry => !isSelfCollector(entry, viewerUsername));
      const blocks = [];

      await mapPool(collectors, FETCH_POOL, async (entry) => {
        if (token !== requestToken || isSelfCollector(entry, viewerUsername)) return;
        try {
          const result = await getPublicTradeLists(entry.username);
          if (token !== requestToken) return;
          if (!result?.found || !result.publicLists) return;
          const forTrade = Array.isArray(result.forTrade) ? result.forTrade.filter(card => Number(card.tradeQuantity) > 0) : [];
          if (!forTrade.length) return;
          blocks.push({ entry, forTrade });
        } catch {
          /* skip collector on fetch error */
        }
      });

      if (token !== requestToken) return;

      if (!blocks.length) {
        if (listRoot) {
          listRoot.innerHTML = `<div class="open-trades-empty"><h2>${esc(copy('openTradesEmptyTitle', 'No open trades here'))}</h2><p>${
            esc(searchQuery
              ? copy('openTradesEmptySearchLead', 'Try another name, or check the next page of collectors.')
              : copy('openTradesEmptyLead', 'No collectors on this page have public trade listings right now. Try the next page or search for someone specific.'))
          }</p></div>`;
        }
      } else if (listRoot) {
        listRoot.innerHTML = blocks.map(({ entry, forTrade }) => collectorBlock(entry, forTrade)).join('');
      }

      const start = offset + 1;
      const end = offset + collectors.length;
      if (meta) {
        meta.textContent = collectors.length
          ? `${blocks.length} collector${blocks.length === 1 ? '' : 's'} with open trades · scanned ${start}–${end} of ${data.total}`
          : '0 collectors scanned';
      }
      if (status) status.textContent = blocks.length ? 'Open trades loaded.' : '';
      renderPager(Number(data.total) || 0);
    } catch (error) {
      if (token !== requestToken) return;
      if (listRoot) {
        listRoot.innerHTML = `<div class="open-trades-empty"><h2>Could not load open trades</h2><p>${esc(error?.message || 'Please try again.')}</p></div>`;
      }
      if (status) status.textContent = error?.message || 'Could not load.';
      renderPager(0);
    }
  }

  container.addEventListener('click', event => {
    const pageButton = event.target.closest('[data-page]');
    if (!pageButton || pageButton.disabled || !pager?.contains(pageButton)) return;
    if (pageButton.dataset.page === 'prev') offset = Math.max(0, offset - PAGE_SIZE);
    if (pageButton.dataset.page === 'next') offset += PAGE_SIZE;
    loadOpenTrades();
  });

  searchInput?.addEventListener('input', () => {
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => {
      searchQuery = String(searchInput.value || '').trim();
      loadOpenTrades({ resetOffset: true });
    }, 280);
  });

  const onContentHydrated = () => loadOpenTrades({ resetOffset: false });
  window.addEventListener('starlight-website-content-hydrated', onContentHydrated);

  void loadOpenTrades({ resetOffset: true });

  return {
    refresh: () => loadOpenTrades({ resetOffset: true }),
    destroy() {
      window.removeEventListener('starlight-website-content-hydrated', onContentHydrated);
    }
  };
}
