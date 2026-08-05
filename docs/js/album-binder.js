/**
 * Album binder spread pagination and page-turn chrome.
 */
(function initStarlightAlbumBinder(global) {
  const STORAGE_KEY = 'sora-starlight-album-page-v1';
  const CARDS_PER_SPREAD = 9;

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

  function paginate(list, page = 1, perPage = CARDS_PER_SPREAD) {
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

  function renderPagerHtml({ page, totalPages, total, perPage = CARDS_PER_SPREAD }) {
    if (total <= perPage) return '';
    const start = (page - 1) * perPage + 1;
    const end = Math.min(total, page * perPage);
    return `<nav class="card-album-pager" aria-label="Binder pages">
      <button class="btn card-album-page-btn" type="button" data-album-page="prev" aria-label="Previous binder page"${page <= 1 ? ' disabled' : ''}>‹ Prev</button>
      <span class="card-album-page-status" role="status">Page ${page} of ${totalPages} · cards ${start}–${end} of ${total}</span>
      <button class="btn card-album-page-btn" type="button" data-album-page="next" aria-label="Next binder page"${page >= totalPages ? ' disabled' : ''}>Next ›</button>
    </nav>`;
  }

  global.StarlightAlbumBinder = {
    STORAGE_KEY,
    CARDS_PER_SPREAD,
    readPage,
    writePage,
    paginate,
    renderPagerHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
