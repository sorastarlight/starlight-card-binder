/**
 * Shared card filter helpers for binder/collection browse (V1.1).
 * Pure functions so Node tests can import them without a DOM.
 */

export function buildCardSearchHaystack(card = {}) {
  return [
    card.number,
    card.collectorNumber,
    card.name,
    card.series,
    card.rarity,
    card.cardDescription,
    card.artist
  ].map(value => String(value ?? '')).join(' ').toLowerCase();
}

export function filterCardList(
  source,
  filters = {},
  { respectOwnership = true, isCollected = () => false, sortCards = list => list } = {}
) {
  const list = (Array.isArray(source) ? source : []).filter(card => {
    const haystack = buildCardSearchHaystack(card);
    const seriesMatches = !filters.series || filters.series === 'All Series' || card.series === filters.series;
    const rarityMatches = !filters.rarity || filters.rarity === 'All Rarities'
      || String(card.rarity || '').trim().toLowerCase() === String(filters.rarity || '').trim().toLowerCase();
    const query = String(filters.q || '').trim().toLowerCase();
    const searchMatches = !query || haystack.includes(query);
    const ownershipMatches = !respectOwnership || !filters.view || filters.view === 'all'
      || (filters.view === 'collected' ? isCollected(card.id) : !isCollected(card.id));
    return seriesMatches && rarityMatches && searchMatches && ownershipMatches;
  });
  sortCards(list, filters.sort);
  return list;
}

/**
 * Binder browse: series landing vs in-series grid vs catalog search.
 * Grid and showcase must consume the same `list`.
 */
export function resolveBinderBrowseList(cards, filters = {}, options = {}) {
  const catalog = Array.isArray(cards) ? cards : [];
  const query = String(filters.q || '').trim();
  const searching = query.length > 0;
  const series = filters.series || 'All Series';

  if (!searching && series === 'All Series') {
    return {
      showLanding: true,
      list: [],
      poolSize: catalog.length,
      heading: 'All Series',
      summary: `Choose a series to browse ${catalog.length} cards`
    };
  }

  const pool = series === 'All Series'
    ? catalog
    : catalog.filter(card => card.series === series);

  const list = filterCardList(pool, { ...filters, series: 'All Series' }, options);
  const heading = series === 'All Series' ? 'Search results' : series;
  const summary = series === 'All Series'
    ? `Showing ${list.length} of ${pool.length} cards matching “${query}”`
    : `Showing ${list.length} of ${pool.length} cards in ${series}`;

  return {
    showLanding: false,
    list,
    poolSize: pool.length,
    heading,
    summary
  };
}

/** Preferred on-card number label (collector number when present). */
export function cardDisplayNumber(card = {}) {
  const value = String(card.collectorNumber || card.number || '').trim();
  return value;
}

/**
 * Binder grid count pill copy that stays honest under Collected / Not Collected views.
 */
export function formatBinderOwnedPill({ shown = 0, owned = 0, view = 'all' } = {}) {
  const shownCount = Math.max(0, Number(shown) || 0);
  const ownedCount = Math.max(0, Number(owned) || 0);
  const mode = String(view || 'all').toLowerCase();
  if (mode === 'missing') return `Showing ${shownCount} not collected`;
  if (mode === 'collected') return `Collected in view: ${ownedCount}`;
  return `Collected: ${ownedCount} / ${shownCount}`;
}

/** Trade-list search haystack (card number + optional collector number). */
export function buildTradeSearchHaystack(card = {}) {
  return [
    card.cardNumber,
    card.collectorNumber,
    card.number,
    card.name,
    card.rarity,
    card.seriesName,
    card.series
  ].map(value => String(value ?? '')).join(' ').toLowerCase();
}
