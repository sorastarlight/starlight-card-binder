import { getMyTradeLists, setCardTradePreference, setTradeListVisibility } from '../trade-list-service.js';
import { buildTradeSearchHaystack, cardDisplayNumber } from '../card-filter-utils.js';
import { shellHref } from '../shell-route-utils.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';

let tradesCopy = getCachedWebsiteContent()?.trades || {};

const RARITY_ORDER = Object.freeze({
  common: 0,
  uncommon: 1,
  rare: 2,
  epic: 3,
  legendary: 4
});

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

function copy(key, fallback) {
  const value = tradesCopy[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

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

function rarityToken(card) {
  return String(card.rarity || 'common').trim().toLowerCase().replace(/\s+/g, '-');
}

function cardArtHtml(card, altSuffix = '') {
  const art = card.thumbnailUrl || card.imageUrl;
  if (!art) {
    return '<div class="trade-card-fallback" aria-hidden="true">✦</div>';
  }
  return `<img src="${esc(art)}" alt="${esc(card.name)}${altSuffix}" loading="lazy">`;
}

function qtyStepperHtml(card, qty, { inputPrefix = 'trade' } = {}) {
  const max = Number(card.duplicateQuantity) || 0;
  const disabled = max < 1;
  return `<div class="trade-qty-stepper"${disabled ? ' data-disabled' : ''}>
    <button type="button" class="trade-qty-btn" data-trade-step="down" aria-label="Offer one fewer ${esc(card.name)}"${disabled || qty <= 0 ? ' disabled' : ''}>−</button>
    <input type="number" class="trade-qty-input" data-${inputPrefix}-input="${esc(card.id)}" min="0" max="${max}" step="1" value="${qty}" inputmode="numeric" aria-label="Copies of ${esc(card.name)} for trade"${disabled ? ' disabled' : ''}>
    <button type="button" class="trade-qty-btn" data-trade-step="up" aria-label="Offer one more ${esc(card.name)}"${disabled || qty >= max ? ' disabled' : ''}>+</button>
  </div>`;
}

function sortCards(list, mode) {
  const sorted = [...list];
  const byNumber = (a, b) => String(a.collectorNumber || a.cardNumber || '')
    .localeCompare(String(b.collectorNumber || b.cardNumber || ''), undefined, { numeric: true });
  switch (mode) {
    case 'name':
      return sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' }) || byNumber(a, b));
    case 'rarity':
      return sorted.sort((a, b) => {
        const delta = (RARITY_ORDER[rarityToken(b)] ?? 0) - (RARITY_ORDER[rarityToken(a)] ?? 0);
        return delta || byNumber(a, b);
      });
    case 'quantity':
      return sorted.sort((a, b) => Number(b.duplicateQuantity || 0) - Number(a.duplicateQuantity || 0) || byNumber(a, b));
    case 'number':
    default:
      return sorted.sort(byNumber);
  }
}

function emptyBlock(title, message, actionHtml = '') {
  return `<div class="trade-empty"><h2>${esc(title)}</h2><p>${esc(message)}</p>${actionHtml}</div>`;
}

function viewToggleHtml(scope, activeView) {
  return `<div class="trade-view-toggle" role="group" aria-label="Display layout">
    <button type="button" class="trade-view-btn${activeView === 'grid' ? ' active' : ''}" data-view-toggle="${scope}" data-view-mode="grid" aria-pressed="${activeView === 'grid' ? 'true' : 'false'}">Grid</button>
    <button type="button" class="trade-view-btn${activeView === 'list' ? ' active' : ''}" data-view-toggle="${scope}" data-view-mode="list" aria-pressed="${activeView === 'list' ? 'true' : 'false'}">List</button>
  </div>`;
}

export function initMyTradeCards(container) {
  if (!container) return null;

  const listedGrid = container.querySelector('#listedForTradeGrid');
  const listedCount = container.querySelector('[data-listed-count]');
  const albumGrid = container.querySelector('#tradeAlbumGrid');
  const search = container.querySelector('#tradeSearch');
  const seriesSelect = container.querySelector('#tradeSeriesFilter');
  const raritySelect = container.querySelector('#tradeRarityFilter');
  const sortSelect = container.querySelector('#tradeSort');
  const duplicatesToggle = container.querySelector('#tradeDuplicatesOnly');
  const status = container.querySelector('#myTradeStatus');
  const publicToggle = container.querySelector('#publicLists');
  const batchBar = container.querySelector('[data-trade-batch]');
  const batchCardCount = container.querySelector('[data-batch-card-count]');
  const batchCopyCount = container.querySelector('[data-batch-copy-count]');
  const listedViewToggleHost = container.querySelector('[data-listed-view-toggle]');
  const collectionViewToggleHost = container.querySelector('[data-collection-view-toggle]');

  let data = [];
  let query = '';
  let seriesFilter = '';
  let rarityFilter = '';
  let sortMode = 'number';
  let duplicatesOnly = false;
  let listedView = 'list';
  let collectionView = 'grid';
  let pendingBatch = new Map();
  let started = false;
  let pickModalQty = 1;
  let pickModalCardId = '';

  let pickModal = null;
  let previewModal = null;
  let reviewModal = null;

  function cardById(id) {
    return data.find(entry => entry.id === id);
  }

  function savedTradeQty(card) {
    return Number(card?.tradeQuantity) || 0;
  }

  function pendingQty(cardId) {
    return pendingBatch.has(cardId) ? pendingBatch.get(cardId) : null;
  }

  function displayTradeQty(card) {
    const pending = pendingQty(card.id);
    return pending == null ? savedTradeQty(card) : pending;
  }

  function availableToList(card) {
    const listed = displayTradeQty(card);
    return Math.max(0, Number(card.duplicateQuantity || 0) - listed);
  }

  function filteredOwnedCards() {
    let list = data.filter(card => Number(card.ownedQuantity) > 0);
    if (query) list = list.filter(card => buildTradeSearchHaystack(card).includes(query));
    if (seriesFilter) list = list.filter(card => card.seriesName === seriesFilter);
    if (rarityFilter) list = list.filter(card => rarityToken(card) === rarityFilter);
    if (duplicatesOnly) list = list.filter(card => Number(card.duplicateQuantity) > 0);
    return sortCards(list, sortMode);
  }

  function listedCards(list) {
    return sortCards(
      list.filter(card => savedTradeQty(card) > 0),
      sortMode
    );
  }

  function pendingEntries() {
    return [...pendingBatch.entries()]
      .map(([id, qty]) => ({ card: cardById(id), qty }))
      .filter(entry => entry.card && entry.qty !== savedTradeQty(entry.card));
  }

  function updateBatchBar() {
    const entries = pendingEntries();
    if (!batchBar) return;
    if (!entries.length) {
      batchBar.hidden = true;
      return;
    }
    batchBar.hidden = false;
    const copies = entries.reduce((sum, entry) => sum + Math.max(0, Number(entry.qty) || 0), 0);
    if (batchCardCount) batchCardCount.textContent = `${entries.length} card${entries.length === 1 ? '' : 's'} selected`;
    if (batchCopyCount) batchCopyCount.textContent = `${copies} cop${copies === 1 ? 'y' : 'ies'} to list`;
  }

  function populateFilterOptions() {
    const owned = data.filter(card => Number(card.ownedQuantity) > 0);
    const series = [...new Set(owned.map(card => card.seriesName).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const rarities = [...new Set(owned.map(card => rarityToken(card)).filter(Boolean))]
      .sort((a, b) => (RARITY_ORDER[a] ?? 99) - (RARITY_ORDER[b] ?? 99));
    if (seriesSelect) {
      const current = seriesFilter;
      seriesSelect.innerHTML = `<option value="">All Series</option>${series.map(name => `<option value="${esc(name)}"${name === current ? ' selected' : ''}>${esc(name)}</option>`).join('')}`;
    }
    if (raritySelect) {
      const current = rarityFilter;
      raritySelect.innerHTML = `<option value="">All Rarities</option>${rarities.map(name => `<option value="${esc(name)}"${name === current ? ' selected' : ''}>${esc(name.charAt(0).toUpperCase() + name.slice(1))}</option>`).join('')}`;
    }
  }

  function listedCardHtml(card) {
    const number = cardDisplayNumber(card);
    const qty = savedTradeQty(card);
    const max = Number(card.duplicateQuantity) || 0;
    return `<article class="trade-listed-card rarity-${esc(rarityToken(card))}" data-card-id="${esc(card.id)}" data-listed-card>
      <button type="button" class="trade-listed-art" data-trade-preview="${esc(card.id)}" aria-label="View ${esc(card.name)}">
        ${cardArtHtml(card, ' card artwork')}
      </button>
      <div class="trade-listed-copy">
        <strong>#${esc(number)} ${esc(card.name)}</strong>
        <span class="trade-listed-series">${esc(card.seriesName)}</span>
        <span class="trade-listed-rarity">${esc(card.rarity)}</span>
        <span class="trade-listed-qty-label">Listed for Trade: <b>${qty}</b></span>
      </div>
      <div class="trade-listed-actions">
        ${qtyStepperHtml(card, qty, { inputPrefix: 'listed' })}
        <button type="button" class="st-button trade-view-card-btn" data-trade-preview="${esc(card.id)}">View Card</button>
        <button type="button" class="st-button trade-remove-btn" data-trade-remove>Remove from Trade List</button>
      </div>
    </article>`;
  }

  function collectionCardHtml(card) {
    const number = cardDisplayNumber(card);
    const listed = displayTradeQty(card);
    const owned = Number(card.ownedQuantity) || 0;
    const extras = Number(card.duplicateQuantity) || 0;
    const available = availableToList(card);
    const pending = pendingQty(card.id) != null;
    const selectable = extras > 0 || listed > 0;
    const stateClass = [
      listed > 0 ? 'is-listed' : '',
      pending ? 'is-pending' : '',
      selectable ? '' : 'is-locked'
    ].filter(Boolean).join(' ');

    return `<article class="trade-collection-card rarity-${esc(rarityToken(card))}${stateClass ? ` ${stateClass}` : ''}" data-card-id="${esc(card.id)}" data-collection-card tabindex="0" role="button" aria-label="Select ${esc(card.name)} for trade">
      <div class="trade-collection-art">${cardArtHtml(card, ' card artwork')}</div>
      <div class="trade-collection-copy">
        <strong>#${esc(number)} ${esc(card.name)}</strong>
        <span>${esc(card.seriesName)} • ${esc(card.rarity)}</span>
        <dl class="trade-collection-stats">
          <div><dt>Quantity Owned</dt><dd>${owned}</dd></div>
          <div><dt>Listed for Trade</dt><dd>${listed}</dd></div>
          <div><dt>Available to List</dt><dd>${available}</dd></div>
        </dl>
      </div>
      <div class="trade-collection-actions">
        <button type="button" class="st-button trade-view-card-btn" data-trade-preview="${esc(card.id)}">View Card</button>
        <button type="button" class="st-button primary" data-trade-pick="${esc(card.id)}"${selectable ? '' : ' disabled'}>${listed > 0 ? 'Update Listing' : 'Add to Trade List'}</button>
      </div>
    </article>`;
  }

  function renderListed(list) {
    if (!listedGrid) return;
    if (listedViewToggleHost) {
      listedViewToggleHost.innerHTML = viewToggleHtml('listed', listedView);
    }
    listedGrid.dataset.view = listedView;
    listedGrid.classList.toggle('is-list-view', listedView === 'list');

    const listed = listedCards(list);
    if (listedCount) {
      listedCount.textContent = listed.length
        ? `${listed.length} card${listed.length === 1 ? '' : 's'} available for trade`
        : copy('listedEmptyTitle', 'You don’t have any cards listed for trade yet.');
    }
    if (!listed.length) {
      const collectionHref = shellHref('collection');
      const action = collectionHref
        ? `<a class="st-button primary" href="${esc(collectionHref)}" target="_top" data-shell-view="collection">${esc(copy('browseCollectionCta', 'Browse My Collection'))}</a>`
        : '';
      listedGrid.innerHTML = emptyBlock(
        copy('listedEmptyTitle', 'You don’t have any cards listed for trade yet.'),
        query
          ? 'No listed cards matched your search.'
          : copy('listedEmptyLead', 'Choose duplicates from your collection below to start listing cards for trade.'),
        action
      );
      listedGrid.classList.add('is-empty');
      return;
    }
    listedGrid.classList.remove('is-empty');
    listedGrid.innerHTML = listed.map(card => listedCardHtml(card)).join('');
  }

  function renderCollection() {
    if (!albumGrid) return;
    if (collectionViewToggleHost) {
      collectionViewToggleHost.innerHTML = viewToggleHtml('collection', collectionView);
    }
    albumGrid.dataset.view = collectionView;
    albumGrid.classList.toggle('is-list-view', collectionView === 'list');

    const owned = filteredOwnedCards();
    if (!owned.length) {
      albumGrid.innerHTML = emptyBlock(
        copy('albumEmptyTitle', 'No cards in your collection yet'),
        query || seriesFilter || rarityFilter || duplicatesOnly
          ? 'Try changing your search or filters.'
          : copy('albumEmptyLead', 'Open boosters and packs to grow your collection, then list duplicate copies for trade.')
      );
      return;
    }
    albumGrid.innerHTML = owned.map(card => collectionCardHtml(card)).join('');
  }

  function render() {
    const list = query
      ? data.filter(card => buildTradeSearchHaystack(card).includes(query))
      : data;
    renderListed(list);
    renderCollection();
    updateBatchBar();
  }

  async function saveListed(cardId, nextQty) {
    const card = cardById(cardId);
    if (!card || !status) return;
    const previous = savedTradeQty(card);
    const clamped = clampTradeQty(card, nextQty);
    card.tradeQuantity = clamped;
    render();
    status.textContent = 'Saving…';
    try {
      const result = await setCardTradePreference(cardId, card.wishlisted, clamped);
      card.tradeQuantity = result.tradeQuantity;
      pendingBatch.delete(cardId);
      status.textContent = clamped > 0 ? 'Trade list updated ✨' : 'Removed from trade list.';
      window.dispatchEvent(new CustomEvent('starlight-trades-changed'));
      render();
    } catch (error) {
      card.tradeQuantity = previous;
      status.textContent = error.message || 'Could not save.';
      render();
    }
  }

  async function confirmRemove(cardId) {
    const card = cardById(cardId);
    if (!card) return;
    const number = cardDisplayNumber(card);
    const confirmed = await window.StarlightUI?.confirm?.({
      title: copy('removeConfirmTitle', 'Remove from Trade List?'),
      message: `Remove #${number} ${card.name} from your trade list?`,
      confirmText: copy('removeConfirmCta', 'Remove from Trade List'),
      cancelText: copy('removeCancelCta', 'Keep Listed'),
      danger: true
    });
    if (confirmed) await saveListed(cardId, 0);
  }

  function setPending(cardId, qty) {
    const card = cardById(cardId);
    if (!card) return;
    const clamped = clampTradeQty(card, qty);
    if (clamped === savedTradeQty(card)) pendingBatch.delete(cardId);
    else pendingBatch.set(cardId, clamped);
    updateBatchBar();
    renderCollection();
  }

  function cardPreviewContent(card) {
    const number = cardDisplayNumber(card);
    return `
      <div class="trade-preview-layout">
        <div class="trade-preview-art rarity-${esc(rarityToken(card))}">${cardArtHtml(card, ' card artwork')}</div>
        <div class="trade-preview-copy">
          <p class="trade-preview-number">#${esc(number)}</p>
          <p class="trade-preview-rarity">${esc(card.rarity)}</p>
          <p class="trade-preview-series">${esc(card.seriesName)}</p>
          <dl class="trade-preview-stats">
            <div><dt>Quantity Owned</dt><dd>${Number(card.ownedQuantity) || 0}</dd></div>
            <div><dt>Listed for Trade</dt><dd>${displayTradeQty(card)}</dd></div>
            <div><dt>Available to List</dt><dd>${availableToList(card)}</dd></div>
          </dl>
        </div>
      </div>`;
  }

  function openPreview(cardId) {
    const card = cardById(cardId);
    if (!card || !window.StarlightUI?.createModal) return;
    previewModal?.destroy?.();
    previewModal = window.StarlightUI.createModal({
      title: card.name,
      content: cardPreviewContent(card),
      className: 'trade-card-preview-modal',
      actions: [{ label: copy('previewCloseCta', 'Close'), value: 'close', className: 'st-dialog-confirm' }],
      onClose: () => previewModal?.destroy?.()
    });
    previewModal.open();
  }

  function pickModalContent(card, qty) {
    const number = cardDisplayNumber(card);
    const max = Number(card.duplicateQuantity) || 0;
    return `
      <div class="trade-pick-layout">
        <div class="trade-pick-art rarity-${esc(rarityToken(card))}">${cardArtHtml(card, ' card artwork')}</div>
        <div class="trade-pick-copy">
          <p><strong>#${esc(number)} ${esc(card.name)}</strong></p>
          <p>${esc(card.seriesName)} • ${esc(card.rarity)}</p>
          <dl class="trade-preview-stats">
            <div><dt>Quantity Owned</dt><dd>${Number(card.ownedQuantity) || 0}</dd></div>
            <div><dt>Listed for Trade</dt><dd>${savedTradeQty(card)}</dd></div>
            <div><dt>Available to List</dt><dd>${Math.max(0, max - qty)}</dd></div>
          </dl>
          <label class="trade-pick-qty-label">
            <span>Listed for Trade</span>
            ${qtyStepperHtml(card, qty, { inputPrefix: 'pick' })}
          </label>
          <p class="trade-qty-hint">Choose 0–${max} duplicate${max === 1 ? '' : 's'}. Your first copy stays protected.</p>
        </div>
      </div>`;
  }

  function bindPickModal(card) {
    const overlay = pickModal?.element;
    if (!overlay || !card) return;
    const input = overlay.querySelector('[data-pick-input]');
    const applyQty = next => {
      pickModalQty = clampTradeQty(card, next);
      if (input) input.value = String(pickModalQty);
      overlay.querySelectorAll('[data-trade-step]').forEach(button => {
        const down = button.dataset.tradeStep === 'down';
        button.disabled = down ? pickModalQty <= 0 : pickModalQty >= Number(card.duplicateQuantity || 0);
      });
      const hint = overlay.querySelector('.trade-qty-hint');
      const max = Number(card.duplicateQuantity) || 0;
      if (hint) hint.textContent = `Choose 0–${max} duplicate${max === 1 ? '' : 's'}. Your first copy stays protected.`;
      const available = overlay.querySelector('.trade-preview-stats div:last-child dd');
      if (available) available.textContent = String(Math.max(0, max - pickModalQty));
    };
    overlay.querySelectorAll('[data-trade-step]').forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        applyQty(pickModalQty + (button.dataset.tradeStep === 'up' ? 1 : -1));
      };
    });
    if (input) {
      input.oninput = () => applyQty(input.value);
      input.onblur = () => applyQty(input.value);
    }
  }

  function openPickModal(cardId) {
    const card = cardById(cardId);
    if (!card || !window.StarlightUI?.createModal) return;
    pickModalCardId = cardId;
    pickModalQty = displayTradeQty(card) || (Number(card.duplicateQuantity) > 0 ? 1 : 0);
    pickModal?.destroy?.();
    pickModal = window.StarlightUI.createModal({
      title: copy('pickModalTitle', 'Add to Trade List'),
      content: pickModalContent(card, pickModalQty),
      className: 'trade-pick-modal',
      actions: [
        { label: copy('pickCancelCta', 'Cancel'), value: 'cancel', className: 'st-dialog-cancel' },
        { label: copy('pickConfirmCta', 'Add to Trade List'), value: 'confirm', className: 'st-dialog-confirm' }
      ],
      onClose: ({ value }) => {
        if (value === 'confirm') setPending(pickModalCardId, pickModalQty);
        pickModal?.destroy?.();
      }
    });
    pickModal.open();
    bindPickModal(card);
  }

  function reviewModalContent(entries) {
    return `<ul class="trade-review-list">${entries.map(({ card, qty }) => {
      const number = cardDisplayNumber(card);
      const removing = qty <= 0;
      return `<li class="trade-review-item" data-review-card="${esc(card.id)}">
        <div class="trade-review-art">${cardArtHtml(card, '')}</div>
        <div class="trade-review-copy">
          <strong>#${esc(number)} ${esc(card.name)}</strong>
          <span>${esc(card.seriesName)} • ${esc(card.rarity)}</span>
          <span class="trade-review-qty">${removing ? 'Remove from trade list' : `List ×${qty}`}</span>
        </div>
        <div class="trade-review-actions">
          ${removing ? '' : qtyStepperHtml(card, qty, { inputPrefix: 'review' })}
          <button type="button" class="st-button" data-review-remove>Remove</button>
        </div>
      </li>`;
    }).join('')}</ul>`;
  }

  function bindReviewModal(entries) {
    const overlay = reviewModal?.element;
    if (!overlay) return;
    overlay.querySelectorAll('[data-trade-step]').forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        const item = button.closest('[data-review-card]');
        const cardId = item?.dataset.reviewCard;
        const card = cardById(cardId);
        if (!card) return;
        const input = item.querySelector('[data-review-input]');
        const current = Number(input?.value || pendingBatch.get(cardId) || 0);
        const next = clampTradeQty(card, current + (button.dataset.tradeStep === 'up' ? 1 : -1));
        pendingBatch.set(cardId, next);
        openReviewModal();
      };
    });
    overlay.querySelectorAll('[data-review-input]').forEach(input => {
      input.onchange = () => {
        const card = cardById(input.dataset.reviewInput);
        if (card) pendingBatch.set(card.id, clampTradeQty(card, input.value));
        openReviewModal();
      };
    });
    overlay.querySelectorAll('[data-review-remove]').forEach(button => {
      button.onclick = () => {
        const cardId = button.closest('[data-review-card]')?.dataset.reviewCard;
        if (cardId) pendingBatch.delete(cardId);
        const remaining = pendingEntries();
        if (!remaining.length) {
          reviewModal?.close?.();
          updateBatchBar();
          renderCollection();
          return;
        }
        openReviewModal();
      };
    });
  }

  function openReviewModal() {
    const entries = pendingEntries();
    if (!entries.length || !window.StarlightUI?.createModal) return;
    reviewModal?.destroy?.();
    reviewModal = window.StarlightUI.createModal({
      title: copy('reviewModalTitle', 'Review Trade List'),
      message: copy('reviewModalLead', 'Confirm the cards and quantities you want to list for trade.'),
      content: reviewModalContent(entries),
      className: 'trade-review-modal',
      actions: [
        { label: copy('reviewBackCta', 'Back'), value: 'back', className: 'st-dialog-cancel' },
        { label: copy('reviewSaveCta', 'Save Trade List'), value: 'save', className: 'st-dialog-confirm' }
      ],
      onClose: ({ value }) => {
        if (value === 'save') void commitBatch(pendingEntries());
        reviewModal?.destroy?.();
      }
    });
    reviewModal.open();
    bindReviewModal(entries);
  }

  async function commitBatch(entries) {
    if (!entries.length || !status) return;
    const rollback = new Map(data.map(card => [card.id, savedTradeQty(card)]));
    entries.forEach(({ card, qty }) => {
      card.tradeQuantity = qty;
    });
    pendingBatch.clear();
    render();
    status.textContent = 'Saving trade list…';
    try {
      for (const { card, qty } of entries) {
        const result = await setCardTradePreference(card.id, card.wishlisted, qty);
        card.tradeQuantity = result.tradeQuantity;
      }
      status.textContent = 'Trade list saved ✨';
      window.dispatchEvent(new CustomEvent('starlight-trades-changed'));
      render();
    } catch (error) {
      rollback.forEach((qty, id) => {
        const card = cardById(id);
        if (card) card.tradeQuantity = qty;
      });
      status.textContent = error.message || 'Could not save trade list.';
      render();
    }
  }

  async function loadLists() {
    if (!listedGrid || !albumGrid || !status) return;
    listedGrid.innerHTML = emptyBlock(copy('loadingTitle', 'Loading…'), copy('loadingLead', 'Gathering your trade binder.'));
    albumGrid.innerHTML = '';
    status.textContent = 'Loading…';
    try {
      const result = await getMyTradeLists();
      data = (result.cards || []).map(normalizeCard);
      pendingBatch.clear();
      if (publicToggle) publicToggle.checked = result.publicLists !== false;
      populateFilterOptions();
      render();
      status.textContent = 'Trade list ready.';
    } catch (error) {
      listedGrid.innerHTML = emptyBlock('Could not load trade binder', error.message || 'Please sign in.');
      albumGrid.innerHTML = '';
      status.textContent = error.message || 'Please sign in.';
    }
  }

  container.addEventListener('click', event => {
    const stepButton = event.target.closest('.trade-listed-actions [data-trade-step]');
    if (stepButton) {
      event.preventDefault();
      event.stopPropagation();
      if (stepButton.disabled) return;
      const cardId = stepButton.closest('[data-card-id]')?.dataset.cardId;
      const card = cardById(cardId);
      if (!card) return;
      const delta = stepButton.dataset.tradeStep === 'up' ? 1 : -1;
      void saveListed(cardId, savedTradeQty(card) + delta);
      return;
    }

    if (event.target.closest('[data-listed-input], [data-pick-input], [data-review-input], .trade-qty-input')) {
      return;
    }

    const viewButton = event.target.closest('[data-view-toggle]');
    if (viewButton) {
      const scope = viewButton.dataset.viewToggle;
      const mode = viewButton.dataset.viewMode === 'list' ? 'list' : 'grid';
      if (scope === 'listed') listedView = mode;
      if (scope === 'collection') collectionView = mode;
      render();
      return;
    }

    const previewButton = event.target.closest('[data-trade-preview]');
    if (previewButton) {
      event.preventDefault();
      event.stopPropagation();
      openPreview(previewButton.dataset.tradePreview);
      return;
    }

    const pickButton = event.target.closest('[data-trade-pick]');
    if (pickButton) {
      event.preventDefault();
      event.stopPropagation();
      openPickModal(pickButton.dataset.tradePick);
      return;
    }

    const collectionCard = event.target.closest('[data-collection-card]');
    if (collectionCard?.dataset.cardId && !event.target.closest('button')) {
      openPickModal(collectionCard.dataset.cardId);
      return;
    }

    const removeButton = event.target.closest('[data-trade-remove]');
    if (removeButton) {
      event.preventDefault();
      const cardId = removeButton.closest('[data-card-id]')?.dataset.cardId;
      if (cardId) void confirmRemove(cardId);
      return;
    }

    if (event.target.closest('[data-batch-review]')) {
      openReviewModal();
      return;
    }
    if (event.target.closest('[data-batch-save]')) {
      const entries = pendingEntries();
      if (entries.length) void commitBatch(entries);
      return;
    }
    if (event.target.closest('[data-batch-clear]')) {
      pendingBatch.clear();
      updateBatchBar();
      renderCollection();
      if (status) status.textContent = 'Pending selections cleared.';
    }
  });

  container.addEventListener('change', event => {
    const input = event.target.closest('[data-listed-input]');
    if (!input) return;
    void saveListed(input.dataset.listedInput, input.value);
  });

  container.addEventListener('blur', event => {
    const input = event.target.closest('[data-listed-input]');
    if (!input) return;
    void saveListed(input.dataset.listedInput, input.value);
  }, true);

  container.addEventListener('keydown', event => {
    const card = event.target.closest('[data-collection-card]');
    if (!card || event.key !== 'Enter' && event.key !== ' ') return;
    if (event.target.closest('button')) return;
    event.preventDefault();
    openPickModal(card.dataset.cardId);
  });

  search?.addEventListener('input', () => {
    query = search.value.trim().toLowerCase();
    render();
  });
  seriesSelect?.addEventListener('change', () => {
    seriesFilter = seriesSelect.value;
    render();
  });
  raritySelect?.addEventListener('change', () => {
    rarityFilter = raritySelect.value;
    render();
  });
  sortSelect?.addEventListener('change', () => {
    sortMode = sortSelect.value || 'number';
    render();
  });
  duplicatesToggle?.addEventListener('change', () => {
    duplicatesOnly = Boolean(duplicatesToggle.checked);
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
      pickModal?.destroy?.();
      previewModal?.destroy?.();
      reviewModal?.destroy?.();
    }
  };
}
