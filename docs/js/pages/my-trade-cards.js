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
  return `<div class="trade-card-stage">
    <div class="trade-card-tilt">
      <img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)}${altSuffix}" loading="lazy">
    </div>
  </div>`;
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

function listedCardHtml(card) {
  const number = card.collectorNumber || card.cardNumber;
  const qty = Number(card.tradeQuantity) || 0;
  return `<article class="trade-card is-listed is-selected" data-card-id="${esc(card.id)}" data-listed-card>
    <button type="button" class="trade-remove-btn" data-trade-remove aria-label="Remove ${esc(card.name)} from trade">×</button>
    <div class="trade-card-art">
      ${cardArtHtml(card, ' card artwork')}
    </div>
    <h3>#${esc(number)} ${esc(card.name)}</h3>
    <p class="trade-card-meta">${esc(card.rarity)} • ${esc(card.seriesName)}</p>
    ${qtyStepperHtml(card, qty)}
    <p class="trade-qty-hint">Listed for trade</p>
  </article>`;
}

function albumCardHtml(card, selectedId) {
  const number = card.collectorNumber || card.cardNumber;
  const max = Number(card.duplicateQuantity) || 0;
  const qty = Number(card.tradeQuantity) || 0;
  const disabled = max < 1;
  const selected = selectedId === card.id;
  const classes = [
    'trade-card',
    selected ? 'is-selected' : '',
    qty > 0 ? 'is-listed' : '',
    disabled ? 'is-disabled' : 'is-selectable'
  ].filter(Boolean).join(' ');

  let hint = disabled ? 'No extras to trade' : 'Click to offer for trade';
  if (!selected && qty > 0) hint = `Listed ×${qty} — click to edit`;
  if (selected && !disabled) hint = `Up to ${max} duplicate${max === 1 ? '' : 's'}`;

  return `<article class="${classes}" data-card-id="${esc(card.id)}" data-album-card${selected ? ' data-selected' : ''}${disabled ? ' data-disabled' : ''}>
    <div class="trade-card-art" data-album-select-trigger>
      ${cardArtHtml(card, ' card artwork')}
    </div>
    <h3>#${esc(number)} ${esc(card.name)}</h3>
    <p class="trade-card-meta">${esc(card.rarity)} • ${esc(card.seriesName)}</p>
    <p class="trade-card-owned">Owned ${card.ownedQuantity} • Extras ${max}</p>
    ${selected ? qtyStepperHtml(card, qty) : `<p class="trade-qty-hint">${hint}</p>`}
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
  let albumSelectedId = null;

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
    listedGrid.innerHTML = listed.map(card => listedCardHtml(card)).join('');
  }

  function renderAlbum(list) {
    if (!albumGrid) return;
    const album = list.filter(card => card.duplicateQuantity > 0 || card.tradeQuantity > 0);
    if (albumSelectedId && !album.some(card => card.id === albumSelectedId)) {
      albumSelectedId = null;
    }
    if (!album.length) {
      albumGrid.innerHTML = emptyBlock(
        tradesCopy.albumEmptyTitle || 'No duplicates yet',
        query
          ? 'No cards matched your search.'
          : (tradesCopy.albumEmptyLead || 'Pull extra copies from boosters and packs to list them for trade.')
      );
      return;
    }
    albumGrid.innerHTML = album.map(card => albumCardHtml(card, albumSelectedId)).join('');
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
      if (card.tradeQuantity <= 0 && albumSelectedId === id) {
        albumSelectedId = null;
      }
      status.textContent = 'Trade list updated ✨';
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

  function toggleAlbumSelection(cardId) {
    const card = data.find(entry => entry.id === cardId);
    if (!card || card.duplicateQuantity < 1) return;
    albumSelectedId = albumSelectedId === cardId ? null : cardId;
    render();
  }

  async function loadLists() {
    if (!listedGrid || !albumGrid || !status) return;
    listedGrid.innerHTML = emptyBlock('Loading…', 'Gathering your trade binder.');
    albumGrid.innerHTML = '';
    status.textContent = 'Loading…';
    try {
      const result = await getMyTradeLists();
      data = (result.cards || []).map(normalizeCard);
      albumSelectedId = null;
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
      return;
    }

    const albumTrigger = event.target.closest('[data-album-select-trigger]');
    if (albumTrigger) {
      const article = albumTrigger.closest('[data-album-card]');
      if (article?.dataset.disabled !== undefined) return;
      if (article?.dataset.cardId) toggleAlbumSelection(article.dataset.cardId);
    }
  });

  container.addEventListener('change', event => {
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
