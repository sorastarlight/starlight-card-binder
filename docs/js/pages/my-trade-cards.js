import { getMyTradeLists, setCardTradePreference, setTradeListVisibility } from '../trade-list-service.js';
import { buildTradeSearchHaystack } from '../card-filter-utils.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';

let tradesCopy = getCachedWebsiteContent()?.trades || {};

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

function normalizeCard(card = {}) {
  return {
    ...card,
    collectorNumber: card.collectorNumber || card.cardNumber || ''
  };
}

function cardTileHtml(card, { showWishlist = false } = {}) {
  const number = card.collectorNumber || card.cardNumber;
  const tradeOptions = Array.from(
    { length: card.duplicateQuantity + 1 },
    (_, index) => `<option value="${index}"${index === card.tradeQuantity ? ' selected' : ''}>${index === 0 ? 'None' : `×${index}`}</option>`
  ).join('');

  return `<article class="trade-card${card.tradeQuantity > 0 ? ' is-listed' : ''}">
    <div class="trade-card-art">
      <img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)} card artwork" loading="lazy">
      ${card.tradeQuantity > 0 ? `<span class="trade-card-badge">For trade ×${card.tradeQuantity}</span>` : ''}
    </div>
    <h3>#${esc(number)} ${esc(card.name)}</h3>
    <p class="trade-card-meta">${esc(card.rarity)} • ${esc(card.seriesName)}</p>
    <p class="trade-card-owned">Owned ${card.ownedQuantity} • Extras ${card.duplicateQuantity}</p>
    <div class="trade-actions">
      ${showWishlist ? `<label class="trade-wish-label"><input type="checkbox" data-wish="${esc(card.id)}" ${card.wishlisted ? 'checked' : ''}> Want list</label>` : ''}
      <label class="trade-qty-label">
        <span>For trade</span>
        <select data-trade="${esc(card.id)}" aria-label="Trade quantity for ${esc(card.name)}"${card.duplicateQuantity < 1 ? ' disabled' : ''}>${tradeOptions}</select>
      </label>
    </div>
  </article>`;
}

function emptyBlock(title, message) {
  return `<div class="trade-empty"><h2>${esc(title)}</h2><p>${esc(message)}</p></div>`;
}

export function initMyTradeCards(container) {
  if (!container) return null;

  const listedGrid = container.querySelector('#listedForTradeGrid');
  const albumGrid = container.querySelector('#tradeAlbumGrid');
  const search = container.querySelector('#tradeSearch');
  const status = container.querySelector('#myTradeStatus');
  const publicToggle = container.querySelector('#publicLists');

  let data = [];
  let query = '';
  let started = false;

  function filteredCards() {
    return data.filter(card => !query || buildTradeSearchHaystack(card).includes(query));
  }

  function renderListed(list) {
    if (!listedGrid) return;
    const listed = list.filter(card => card.tradeQuantity > 0);
    if (!listed.length) {
      listedGrid.innerHTML = emptyBlock(
        tradesCopy.listedEmptyTitle || 'Nothing listed yet',
        query
          ? 'No listed cards matched your search.'
          : (tradesCopy.listedEmptyLead || 'Use your collection album below to offer duplicate copies for trade.')
      );
      return;
    }
    listedGrid.innerHTML = listed.map(card => cardTileHtml(card)).join('');
  }

  function renderAlbum(list) {
    if (!albumGrid) return;
    const album = list.filter(card => card.duplicateQuantity > 0 || card.tradeQuantity > 0);
    if (!album.length) {
      albumGrid.innerHTML = emptyBlock(
        tradesCopy.albumEmptyTitle || 'No duplicates yet',
        query
          ? 'No cards matched your search.'
          : (tradesCopy.albumEmptyLead || 'Pull extra copies from boosters and packs to list them for trade.')
      );
      return;
    }
    albumGrid.innerHTML = album.map(card => cardTileHtml(card, { showWishlist: true })).join('');
  }

  function render() {
    const list = filteredCards();
    renderListed(list);
    renderAlbum(list);
  }

  async function save(id) {
    const card = data.find(entry => entry.id === id);
    if (!card || !status) return;
    status.textContent = 'Saving…';
    try {
      const result = await setCardTradePreference(id, card.wishlisted, card.tradeQuantity);
      card.tradeQuantity = result.tradeQuantity;
      status.textContent = 'Trade list updated ✨';
      render();
    } catch (error) {
      status.textContent = error.message || 'Could not save.';
    }
  }

  async function loadLists() {
    if (!listedGrid || !albumGrid || !status) return;
    listedGrid.innerHTML = emptyBlock('Loading…', 'Gathering your trade binder.');
    albumGrid.innerHTML = '';
    status.textContent = 'Loading…';
    try {
      const result = await getMyTradeLists();
      data = (result.cards || []).map(normalizeCard);
      if (publicToggle) publicToggle.checked = result.publicLists !== false;
      render();
      status.textContent = 'Trade binder loaded.';
    } catch (error) {
      listedGrid.innerHTML = emptyBlock('Could not load trade binder', error.message || 'Please sign in.');
      albumGrid.innerHTML = '';
      status.textContent = error.message || 'Please sign in.';
    }
  }

  container.addEventListener('change', event => {
    if (event.target.matches('[data-wish]')) {
      const card = data.find(entry => entry.id === event.target.dataset.wish);
      if (!card) return;
      card.wishlisted = event.target.checked;
      save(card.id);
    }
    if (event.target.matches('[data-trade]')) {
      const card = data.find(entry => entry.id === event.target.dataset.trade);
      if (!card) return;
      card.tradeQuantity = Number(event.target.value);
      save(card.id);
    }
  });

  search?.addEventListener('input', () => {
    query = search.value.trim().toLowerCase();
    render();
  });

  publicToggle?.addEventListener('change', async () => {
    const previous = !publicToggle.checked;
    try {
      await setTradeListVisibility(publicToggle.checked);
      if (status) status.textContent = 'Profile visibility updated.';
    } catch (error) {
      publicToggle.checked = previous;
      if (status) status.textContent = error.message || 'Could not update visibility.';
    }
  });

  const onContentHydrated = () => {
    tradesCopy = getCachedWebsiteContent()?.trades || tradesCopy;
    if (started) render();
  };
  window.addEventListener('starlight-website-content-hydrated', onContentHydrated);

  started = true;
  void loadLists();

  return {
    refresh: loadLists,
    destroy() {
      window.removeEventListener('starlight-website-content-hydrated', onContentHydrated);
    }
  };
}
