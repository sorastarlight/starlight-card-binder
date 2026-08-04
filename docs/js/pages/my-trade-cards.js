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

function clampTradeQty(card, value) {
  const max = Number(card.duplicateQuantity) || 0;
  return Math.max(0, Math.min(max, Math.floor(Number(value) || 0)));
}

function cardArtHtml(card, altSuffix = '') {
  return `<img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)}${altSuffix}" loading="lazy">`;
}

function qtyStepperHtml(card, qty) {
  const max = Number(card.duplicateQuantity) || 0;
  const disabled = max < 1;
  return `<div class="trade-qty-stepper"${disabled ? ' data-disabled' : ''}>
    <button type="button" class="trade-qty-btn" data-trade-step="down" aria-label="Offer one fewer ${esc(card.name)}"${disabled || qty <= 0 ? ' disabled' : ''}>−</button>
    <input type="number" class="trade-qty-input" data-trade-input="${esc(card.id)}" min="0" max="${max}" step="1" value="${qty}" inputmode="numeric" aria-label="Copies of ${esc(card.name)} for trade"${disabled ? ' disabled' : ''}>
    <button type="button" class="trade-qty-btn" data-trade-step="up" aria-label="Offer one more ${esc(card.name)}"${disabled || qty >= max ? ' disabled' : ''}>+</button>
  </div>`;
}

function listedRowHtml(card) {
  const number = card.collectorNumber || card.cardNumber;
  const qty = Number(card.tradeQuantity) || 0;
  const max = Number(card.duplicateQuantity) || 0;
  return `<article class="trade-listed-row" data-card-id="${esc(card.id)}" data-listed-card>
    <div class="trade-listed-art">${cardArtHtml(card, ' card artwork')}</div>
    <div class="trade-listed-copy">
      <strong>#${esc(number)} ${esc(card.name)}</strong>
      <span>${esc(card.rarity)} • ${esc(card.seriesName)}</span>
      <span class="trade-listed-meta">${max} extra${max === 1 ? '' : 's'} available</span>
    </div>
    <div class="trade-listed-actions">
      ${qtyStepperHtml(card, qty)}
      <button type="button" class="trade-remove-btn" data-trade-remove>Remove</button>
    </div>
  </article>`;
}

function albumCardHtml(card) {
  const number = card.collectorNumber || card.cardNumber;
  const max = Number(card.duplicateQuantity) || 0;
  const qty = Number(card.tradeQuantity) || 0;
  const disabled = max < 1;
  const listed = qty > 0;

  return `<article class="trade-card${listed ? ' is-listed' : ''}${disabled ? ' is-disabled' : ''}" data-card-id="${esc(card.id)}" data-album-card>
    <div class="trade-card-art">${cardArtHtml(card, ' card artwork')}</div>
    <h3>#${esc(number)} ${esc(card.name)}</h3>
    <p class="trade-card-meta">${esc(card.rarity)} • ${esc(card.seriesName)}</p>
    <p class="trade-card-owned">Owned ${card.ownedQuantity} • Extras ${max}</p>
    <label class="trade-list-toggle">
      <input type="checkbox" data-trade-toggle${listed ? ' checked' : ''}${disabled ? ' disabled' : ''}>
      <span class="trade-list-toggle-ui" aria-hidden="true"></span>
      <span class="trade-list-toggle-label">${listed ? 'Listed for trade' : 'Offer for trade'}</span>
    </label>
    <div class="trade-card-controls${listed ? '' : ' is-hidden'}" data-trade-controls>
      ${qtyStepperHtml(card, listed ? qty : 1)}
      <p class="trade-qty-hint">Choose 1–${max} duplicate${max === 1 ? '' : 's'}</p>
    </div>
  </article>`;
}

function emptyBlock(title, message) {
  return `<div class="trade-empty"><h2>${esc(title)}</h2><p>${esc(message)}</p></div>`;
}

export function initMyTradeCards(container) {
  if (!container) return null;

  const listedGrid = container.querySelector('#listedForTradeGrid');
  const listedCount = container.querySelector('[data-listed-count]');
  const albumGrid = container.querySelector('#tradeAlbumGrid');
  const search = container.querySelector('#tradeSearch');
  const status = container.querySelector('#myTradeStatus');
  const publicToggle = container.querySelector('#publicLists');
  const filterButtons = [...container.querySelectorAll('[data-album-filter]')];

  let data = [];
  let query = '';
  let albumFilter = 'all';
  let started = false;

  function filteredCards() {
    return data.filter(card => !query || buildTradeSearchHaystack(card).includes(query));
  }

  function albumCards(list) {
    return list.filter(card => {
      if (card.duplicateQuantity < 1 && card.tradeQuantity < 1) return false;
      if (albumFilter === 'listed') return card.tradeQuantity > 0;
      if (albumFilter === 'available') return card.duplicateQuantity > 0 && card.tradeQuantity <= 0;
      return card.duplicateQuantity > 0 || card.tradeQuantity > 0;
    });
  }

  function renderListed(list) {
    if (!listedGrid) return;
    const listed = list.filter(card => card.tradeQuantity > 0);
    if (listedCount) {
      listedCount.textContent = listed.length
        ? `${listed.length} card${listed.length === 1 ? '' : 's'} listed`
        : 'Nothing listed yet';
    }
    if (!listed.length) {
      listedGrid.innerHTML = emptyBlock(
        tradesCopy.listedEmptyTitle || 'Nothing listed yet',
        query
          ? 'No listed cards matched your search.'
          : (tradesCopy.listedEmptyLead || 'Turn on “Offer for trade” below to list duplicate copies.')
      );
      listedGrid.classList.toggle('is-empty', true);
      return;
    }
    listedGrid.classList.toggle('is-empty', false);
    listedGrid.innerHTML = listed.map(card => listedRowHtml(card)).join('');
  }

  function renderAlbum(list) {
    if (!albumGrid) return;
    const album = albumCards(list);
    if (!album.length) {
      albumGrid.innerHTML = emptyBlock(
        tradesCopy.albumEmptyTitle || 'No duplicates yet',
        query
          ? 'No cards matched your search.'
          : (tradesCopy.albumEmptyLead || 'Pull extra copies from boosters and packs to list them for trade.')
      );
      return;
    }
    albumGrid.innerHTML = album.map(card => albumCardHtml(card)).join('');
  }

  function render() {
    const list = filteredCards();
    renderListed(list);
    renderAlbum(list);
  }

  async function save(id, nextQty) {
    const card = data.find(entry => entry.id === id);
    if (!card || !status) return;
    card.tradeQuantity = clampTradeQty(card, nextQty);
    status.textContent = 'Saving…';
    try {
      const result = await setCardTradePreference(id, card.wishlisted, card.tradeQuantity);
      card.tradeQuantity = result.tradeQuantity;
      status.textContent = card.tradeQuantity > 0 ? 'Trade list updated ✨' : 'Removed from trade list.';
      render();
    } catch (error) {
      status.textContent = error.message || 'Could not save.';
      render();
    }
  }

  function applyStep(cardId, delta) {
    const card = data.find(entry => entry.id === cardId);
    if (!card) return;
    save(cardId, clampTradeQty(card, card.tradeQuantity + delta));
  }

  function applyInput(cardId, rawValue) {
    const card = data.find(entry => entry.id === cardId);
    if (!card) return;
    save(cardId, clampTradeQty(card, rawValue));
  }

  async function toggleListing(cardId, enabled) {
    const card = data.find(entry => entry.id === cardId);
    if (!card || card.duplicateQuantity < 1) return;
    if (enabled) {
      await save(cardId, card.tradeQuantity > 0 ? card.tradeQuantity : 1);
    } else {
      await save(cardId, 0);
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

  container.addEventListener('click', event => {
    const filterButton = event.target.closest('[data-album-filter]');
    if (filterButton) {
      albumFilter = filterButton.dataset.albumFilter || 'all';
      filterButtons.forEach(button => {
        const active = button === filterButton;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      render();
      return;
    }

    const removeButton = event.target.closest('[data-trade-remove]');
    if (removeButton) {
      const article = removeButton.closest('[data-card-id]');
      if (article?.dataset.cardId) save(article.dataset.cardId, 0);
      return;
    }

    const stepButton = event.target.closest('[data-trade-step]');
    if (stepButton) {
      if (stepButton.disabled) return;
      const article = stepButton.closest('[data-card-id]');
      const cardId = article?.dataset.cardId;
      if (!cardId) return;
      applyStep(cardId, stepButton.dataset.tradeStep === 'up' ? 1 : -1);
    }
  });

  container.addEventListener('change', event => {
    const toggle = event.target.closest('[data-trade-toggle]');
    if (toggle) {
      const article = toggle.closest('[data-album-card]');
      if (article?.dataset.cardId) void toggleListing(article.dataset.cardId, toggle.checked);
      return;
    }

    const input = event.target.closest('[data-trade-input]');
    if (!input) return;
    applyInput(input.dataset.tradeInput, input.value);
  });

  container.addEventListener('blur', event => {
    const input = event.target.closest('[data-trade-input]');
    if (!input) return;
    applyInput(input.dataset.tradeInput, input.value);
  }, true);

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
