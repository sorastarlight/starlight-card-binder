/**
 * My Card Album Binder — two-page spreads, organization, and render helpers.
 */
(function initStarlightAlbumBinder(global) {
  const STORAGE_KEY = 'sora-starlight-album-page-v1';
  const ORGANIZE_KEY = 'sora-starlight-binder-organize-v1';
  const POCKETS_PER_PAGE = 9;
  const CARDS_PER_SPREAD = POCKETS_PER_PAGE * 2;

  function readPage() {
    try {
      const value = Number(global.localStorage?.getItem(STORAGE_KEY));
      return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1;
    } catch {
      return 1;
    }
  }

  function writePage(page) {
    try {
      global.localStorage?.setItem(STORAGE_KEY, String(Math.max(1, page)));
    } catch {
      // ignore
    }
  }

  function readOrganize() {
    try {
      return String(global.localStorage?.getItem(ORGANIZE_KEY) || 'numberAsc').trim() || 'numberAsc';
    } catch {
      return 'numberAsc';
    }
  }

  function writeOrganize(value) {
    try {
      if (value) global.localStorage?.setItem(ORGANIZE_KEY, value);
    } catch {
      // ignore
    }
  }

  function rarityRank(card = {}) {
    const map = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
    return map[String(card.rarity || 'Common').trim()] || 0;
  }

  function sortOwnedCards(list, organizeBy = 'numberAsc', helpers = {}) {
    const source = Array.isArray(list) ? list.slice() : [];
    const isFavorite = helpers.isFavorite || (() => false);
    const num = card => String(card?.collectorNumber || card?.number || '').padStart(8, '0');

    switch (organizeBy) {
      case 'numberDesc':
        source.sort((a, b) => num(b).localeCompare(num(a)));
        break;
      case 'series':
        source.sort((a, b) => String(a.series || '').localeCompare(String(b.series || '')) || num(a).localeCompare(num(b)));
        break;
      case 'rarityDesc':
        source.sort((a, b) => rarityRank(b) - rarityRank(a) || num(a).localeCompare(num(b)));
        break;
      case 'favorites':
        source.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)) || num(a).localeCompare(num(b)));
        break;
      case 'nameAsc':
        source.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        break;
      default:
        source.sort((a, b) => num(a).localeCompare(num(b)));
    }
    return source;
  }

  function padPockets(cards, size = POCKETS_PER_PAGE) {
    const padded = (cards || []).slice(0, size);
    while (padded.length < size) padded.push(null);
    return padded;
  }

  function paginateSpread(list, spreadIndex = 1) {
    const total = Array.isArray(list) ? list.length : 0;
    const totalSpreads = Math.max(1, Math.ceil(total / CARDS_PER_SPREAD) || 1);
    const spread = Math.min(Math.max(1, spreadIndex), totalSpreads);
    const start = (spread - 1) * CARDS_PER_SPREAD;
    const chunk = (list || []).slice(start, start + CARDS_PER_SPREAD);
    const leftPageNum = (spread - 1) * 2 + 1;
    const rightPageNum = leftPageNum + 1;
    const totalPhysicalPages = totalSpreads * 2;
    return {
      left: padPockets(chunk.slice(0, POCKETS_PER_PAGE)),
      right: padPockets(chunk.slice(POCKETS_PER_PAGE, CARDS_PER_SPREAD)),
      spread,
      totalSpreads,
      total,
      leftPageNum,
      rightPageNum,
      totalPhysicalPages,
      perSpread: CARDS_PER_SPREAD
    };
  }

  function renderPagerHtml({
    spread,
    totalSpreads,
    leftPageNum,
    rightPageNum,
    totalPhysicalPages,
    total
  }) {
    if (!total) return '';
    const prevDisabled = spread <= 1 ? ' disabled' : '';
    const nextDisabled = spread >= totalSpreads ? ' disabled' : '';
    const status = totalSpreads <= 1
      ? `Pages ${leftPageNum}–${rightPageNum} of ${totalPhysicalPages}`
      : `Pages ${leftPageNum}–${rightPageNum} of ${totalPhysicalPages} · spread ${spread} of ${totalSpreads}`;
    return `<nav class="card-album-pager" aria-label="Binder pages">
      <button class="btn card-album-page-btn" type="button" data-album-spread="prev" aria-label="Previous spread"${prevDisabled}>‹ Prev</button>
      <span class="card-album-page-status" role="status">${status}</span>
      <button class="btn card-album-page-btn" type="button" data-album-spread="next" aria-label="Next spread"${nextDisabled}>Next ›</button>
    </nav>`;
  }

  function renderPageGrid(cards, ctx, side, pageNum) {
    const tile = global.StarlightCardTile;
    const slots = cards.map((card, index) => {
      if (tile?.renderSpreadSlot) return tile.renderSpreadSlot(ctx, card, index);
      if (!card) {
        return `<div class="card-album-slot card-album-slot--empty" data-pocket-slot="${index}"><div class="card-album-empty-pocket" aria-hidden="true"><span>✦</span></div></div>`;
      }
      return `<article class="card-album-slot" data-pocket-slot="${index}"><button type="button" class="card-album-btn" data-album-card="${ctx.esc(card.id)}">${ctx.displayName(card)}</button></article>`;
    }).join('');
    return `<section class="card-album-page card-album-page--${side}" aria-label="Binder page ${pageNum}">
      <header class="card-album-page-label">Page ${pageNum}</header>
      <div class="card-album-page-grid">${slots}</div>
    </section>`;
  }

  function renderSpreadHtml({ spreadData, ctx, themeId, pagerHtml = '' }) {
    const { left, right, leftPageNum, rightPageNum } = spreadData;
    return `<div class="card-album-binder" data-binder-theme="${themeId || 'starlight-classic'}">
      <div class="card-album-binder-spread is-ready">
        ${renderPageGrid(left, ctx, 'left', leftPageNum)}
        <div class="card-album-binder-rings" aria-hidden="true"><span></span><span></span><span></span></div>
        ${renderPageGrid(right, ctx, 'right', rightPageNum)}
      </div>
      ${pagerHtml}
    </div>`;
  }

  global.StarlightAlbumBinder = {
    STORAGE_KEY,
    ORGANIZE_KEY,
    POCKETS_PER_PAGE,
    CARDS_PER_SPREAD,
    readPage,
    writePage,
    readOrganize,
    writeOrganize,
    sortOwnedCards,
    paginateSpread,
    padPockets,
    renderPagerHtml,
    renderSpreadHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
