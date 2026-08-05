/**
 * Album binder spread pagination — two-page spreads (9 pockets × 2 = 18 cards).
 */
(function initStarlightAlbumBinder(global) {
  const STORAGE_KEY = 'sora-starlight-album-page-v1';
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

  /** @deprecated Use paginateSpread for two-page binder. */
  function paginate(list, page = 1, perPage = POCKETS_PER_PAGE) {
    const total = Array.isArray(list) ? list.length : 0;
    const totalPages = Math.max(1, Math.ceil(total / perPage) || 1);
    const safePage = Math.min(Math.max(1, page), totalPages);
    const start = (safePage - 1) * perPage;
    return {
      slice: (list || []).slice(start, start + perPage),
      page: safePage,
      totalPages,
      total,
      perPage
    };
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
    if (total <= CARDS_PER_SPREAD && total > 0) {
      return `<nav class="album-binder-3d-controls" aria-label="Binder pages">
        <button class="btn album-binder-3d-nav" type="button" data-album-spread="prev" aria-label="Previous spread" disabled>‹ Prev</button>
        <span class="album-binder-3d-status" role="status">Pages ${leftPageNum}–${rightPageNum} of ${totalPhysicalPages}</span>
        <button class="btn album-binder-3d-nav" type="button" data-album-spread="next" aria-label="Next spread" disabled>Next ›</button>
      </nav>`;
    }
    if (!total) return '';
    return `<nav class="album-binder-3d-controls" aria-label="Binder pages">
      <button class="btn album-binder-3d-nav" type="button" data-album-spread="prev" aria-label="Previous spread"${spread <= 1 ? ' disabled' : ''}>‹ Prev</button>
      <span class="album-binder-3d-status" role="status">Pages ${leftPageNum}–${rightPageNum} of ${totalPhysicalPages} · spread ${spread} of ${totalSpreads}</span>
      <button class="btn album-binder-3d-nav" type="button" data-album-spread="next" aria-label="Next spread"${spread >= totalSpreads ? ' disabled' : ''}>Next ›</button>
    </nav>`;
  }

  global.StarlightAlbumBinder = {
    STORAGE_KEY,
    POCKETS_PER_PAGE,
    CARDS_PER_SPREAD,
    readPage,
    writePage,
    paginate,
    paginateSpread,
    padPockets,
    renderPagerHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
