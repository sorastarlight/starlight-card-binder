import { supabase } from '../supabase-client.js';
import {
  convertSelectedDuplicatesToStarBits,
  getStarBitsExchangePreview
} from '../star-bits-service.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';

await loadAndHydrateWebsiteContent();

const summarySection = document.getElementById('summary-section');
const rateSection = document.getElementById('rate-section');
const duplicateSection = document.getElementById('duplicate-section');
const emptyState = document.getElementById('empty-state');
const exchangeBox = document.getElementById('exchange-box');
const pageStatus = document.getElementById('page-status');
const balanceValue = document.getElementById('balance-value');
const duplicateCardTypes = document.getElementById('duplicate-card-types');
const duplicateCopyCount = document.getElementById('duplicate-copy-count');
const exchangeValue = document.getElementById('exchange-value');
const rateGrid = document.getElementById('rate-grid');
const duplicateGrid = document.getElementById('duplicate-grid');
const exchangeDescription = document.getElementById('exchange-description');
const exchangeButton = document.getElementById('exchange-button');
const selectedSummary = document.getElementById('selected-summary');
const selectAllToggle = document.getElementById('select-all-toggle');
const clearSelectionButton = document.getElementById('clear-duplicate-selection');

let currentPreview = null;
let isConverting = false;
const selections = new Map();

function toast(message, type = '') {
  if (window.StarlightUI?.toast) {
    window.StarlightUI.toast(message, type);
    return;
  }
  displayStatus(message, type === 'error' ? 'error' : 'success');
}

function displayStatus(message = '', type = '') {
  pageStatus.textContent = message;
  pageStatus.classList.remove('success', 'error');
  if (type) pageStatus.classList.add(type);
}

function hideDynamicSections() {
  duplicateSection.classList.add('hidden');
  emptyState.classList.add('hidden');
  exchangeBox.classList.add('hidden');
}

function renderRates(rates) {
  const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  rateGrid.replaceChildren();
  for (const rarity of rarityOrder) {
    const card = document.createElement('div');
    card.className = `rate-card rarity-${rarity.toLowerCase()}`;
    card.innerHTML = `<span>${rarity}</span><strong>${rates?.[rarity] ?? 0} ✦</strong>`;
    rateGrid.append(card);
  }
}

function getSelectedTotals() {
  let copies = 0;
  let bits = 0;
  for (const card of currentPreview?.duplicateCards || []) {
    const quantity = selections.get(card.cardId) || 0;
    copies += quantity;
    bits += quantity * Number(card.bitsPerDuplicate || 0);
  }
  return { copies, bits };
}

function selectedCardsForReveal() {
  const out = [];
  for (const card of currentPreview?.duplicateCards || []) {
    const quantity = selections.get(card.cardId) || 0;
    if (quantity > 0) out.push({ ...card, quantity });
  }
  return out;
}

function updateSelectionSummary() {
  const { copies, bits } = getSelectedTotals();
  selectedSummary.innerHTML = `<strong>${copies}</strong> ${copies === 1 ? 'copy' : 'copies'} selected <span>→</span> <strong>★ ${bits}</strong> Star Bits`;
  exchangeButton.disabled = copies <= 0 || isConverting;
  exchangeDescription.textContent = copies > 0
    ? `Convert ${copies} selected duplicate ${copies === 1 ? 'copy' : 'copies'} into ${bits} Star Bits.`
    : 'Select the duplicate cards and quantities you want to convert.';

  duplicateGrid.querySelectorAll('[data-card-id]').forEach((article) => {
    const cardId = article.dataset.cardId;
    const qty = selections.get(cardId) || 0;
    const convertButton = article.querySelector('.card-convert-now');
    if (convertButton) convertButton.disabled = qty < 1 || isConverting;
  });
}

function setSelection(cardId, quantity, maximum) {
  const safe = Math.max(0, Math.min(maximum, Math.floor(Number(quantity) || 0)));
  if (safe > 0) selections.set(cardId, safe);
  else selections.delete(cardId);

  const article = duplicateGrid.querySelector(`[data-card-id="${CSS.escape(cardId)}"]`);
  if (article) {
    const checkbox = article.querySelector('input[type="checkbox"]');
    const input = article.querySelector('input[type="number"]');
    if (checkbox) checkbox.checked = safe === Number(maximum);
    if (input) {
      input.value = String(safe);
      input.disabled = false;
    }
    article.classList.toggle('is-selected', safe > 0);
  }

  const available = currentPreview?.duplicateCards || [];
  if (selectAllToggle && available.length) {
    selectAllToggle.checked = available.every((card) =>
      (selections.get(card.cardId) || 0) === Number(card.duplicateQuantity || 0)
    );
  }
  updateSelectionSummary();
}

function renderDuplicates(cards) {
  duplicateGrid.replaceChildren();
  selections.clear();
  if (selectAllToggle) selectAllToggle.checked = false;

  for (const card of cards || []) {
    const article = document.createElement('article');
    article.className = `duplicate-card rarity-${String(card.rarity || 'common').toLowerCase()}`;
    article.dataset.cardId = card.cardId;

    const image = document.createElement('img');
    image.src = card.thumbnailUrl || card.imageUrl || '';
    image.alt = `${card.name} card artwork`;
    image.loading = 'lazy';

    const name = document.createElement('h3');
    name.textContent = `#${card.cardNumber} ${card.name}`;

    const rarity = document.createElement('p');
    rarity.textContent = `${card.rarity} • ${card.seriesName}`;

    const quantity = document.createElement('p');
    quantity.textContent = `${card.totalQuantity} owned • ${card.duplicateQuantity} duplicate${card.duplicateQuantity === 1 ? '' : 's'}`;

    const value = document.createElement('span');
    value.className = 'value-pill';
    value.textContent = `${card.bitsPerDuplicate} Star Bits each`;

    const selectRow = document.createElement('label');
    selectRow.className = 'duplicate-select-row qol-card-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'qol-no-enhance';
    const selectText = document.createElement('span');
    selectText.innerHTML = '<strong>Select all copies</strong><small>Use every duplicate of this card</small>';
    const switchVisual = document.createElement('span');
    switchVisual.className = 'qol-switch-ui';
    switchVisual.setAttribute('aria-hidden', 'true');
    selectRow.append(checkbox, selectText, switchVisual);

    const controls = document.createElement('div');
    controls.className = 'duplicate-quantity-control';
    const minus = document.createElement('button');
    minus.type = 'button';
    minus.textContent = '−';
    minus.setAttribute('aria-label', `Decrease ${card.name} quantity`);
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.max = String(card.duplicateQuantity);
    input.value = '0';
    input.setAttribute('aria-label', `Duplicate copies of ${card.name} to convert`);
    const plus = document.createElement('button');
    plus.type = 'button';
    plus.textContent = '+';
    plus.setAttribute('aria-label', `Increase ${card.name} quantity`);
    controls.append(minus, input, plus);

    checkbox.addEventListener('change', () => {
      setSelection(
        card.cardId,
        checkbox.checked ? Number(card.duplicateQuantity || 0) : 0,
        card.duplicateQuantity
      );
    });
    input.addEventListener('input', () => {
      setSelection(card.cardId, input.value, card.duplicateQuantity);
    });
    minus.addEventListener('click', () => {
      const current = selections.get(card.cardId) || 0;
      setSelection(card.cardId, current - 1, card.duplicateQuantity);
    });
    plus.addEventListener('click', () => {
      const current = selections.get(card.cardId) || 0;
      setSelection(card.cardId, current + 1, card.duplicateQuantity);
    });

    const convertButton = document.createElement('button');
    convertButton.type = 'button';
    convertButton.className = 'card-convert-now';
    convertButton.textContent = 'Convert Now';
    convertButton.disabled = true;
    convertButton.addEventListener('click', async () => {
      const qty = selections.get(card.cardId) || 0;
      if (qty < 1) {
        toast('Choose at least one duplicate copy first.', 'error');
        return;
      }
      await runConversion(
        [{ cardId: card.cardId, quantity: qty }],
        [card],
        {
          title: 'Convert this card?',
          message: `Convert ${qty} duplicate ${qty === 1 ? 'copy' : 'copies'} of ${card.name} into Star Bits?`
        }
      );
    });

    const info = document.createElement('div');
    info.className = 'duplicate-card-info';
    info.append(name, rarity, quantity, value, selectRow, controls, convertButton);
    article.append(image, info);
    duplicateGrid.append(article);
  }
  updateSelectionSummary();
}

function renderPreview(preview) {
  currentPreview = preview;
  hideDynamicSections();

  balanceValue.textContent = String(preview.starBitsBalance ?? 0);
  duplicateCardTypes.textContent = String(preview.duplicateCardTypes ?? 0);
  duplicateCopyCount.textContent = String(preview.totalDuplicateCopies ?? 0);
  exchangeValue.textContent = String(preview.totalExchangeValue ?? 0);
  renderRates(preview.exchangeRates);

  summarySection.classList.remove('hidden');
  rateSection.classList.remove('hidden');

  const duplicateCards = preview.duplicateCards || [];
  if (duplicateCards.length > 0) {
    renderDuplicates(duplicateCards);
    duplicateSection.classList.remove('hidden');
    exchangeBox.classList.remove('hidden');
  } else {
    emptyState.classList.remove('hidden');
  }
}

async function loadPreview(successMessage = '') {
  displayStatus();
  const { preview, error } = await getStarBitsExchangePreview();
  if (error || !preview) {
    displayStatus(error?.message || 'The Star Bits exchange could not be loaded.', 'error');
    return;
  }
  renderPreview(preview);
  if (successMessage) displayStatus(successMessage, 'success');
}

function selectedPayload() {
  return [...selections.entries()].map(([cardId, quantity]) => ({ cardId, quantity }));
}

async function runConversion(payload, revealCards, confirmOptions) {
  if (isConverting) return;
  const copies = payload.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const bits = (revealCards || selectedCardsForReveal()).reduce((sum, card) => {
    const qty = payload.find((row) => row.cardId === card.cardId)?.quantity
      || selections.get(card.cardId)
      || 0;
    return sum + qty * Number(card.bitsPerDuplicate || 0);
  }, 0);

  const confirmed = await window.StarlightUI?.confirm?.({
    title: confirmOptions?.title || 'Convert Your Duplicates?',
    message: confirmOptions?.message
      || `You are about to convert ${copies} selected duplicate ${copies === 1 ? 'copy' : 'copies'} into ${bits} Star Bits.`,
    warning: 'This cannot be undone. Your final copy of every card will remain safely in your collection.',
    confirmText: 'Convert to Star Bits',
    cancelText: 'Keep My Duplicates'
  });
  if (!confirmed) return;

  isConverting = true;
  updateSelectionSummary();
  displayStatus();

  try {
    const result = await convertSelectedDuplicatesToStarBits(payload);
    const converted = Number(result.convertedDuplicateCopies ?? copies);
    const earned = Number(result.starBitsEarned ?? bits);
    await loadPreview(
      `Converted ${converted} duplicate ${converted === 1 ? 'copy' : 'copies'} into ${earned} Star Bits.`
    );
    toast(`Converted ${converted} ${converted === 1 ? 'copy' : 'copies'} into ${earned} Star Bits.`, 'success');
  } catch (error) {
    console.error('Star Bits conversion failed:', error);
    displayStatus(error.message || 'The selected duplicate cards could not be converted.', 'error');
    toast(error.message || 'Unable to convert.', 'error');
  } finally {
    isConverting = false;
    updateSelectionSummary();
  }
}

async function performConversion() {
  const { copies } = getSelectedTotals();
  if (copies <= 0) return;
  await runConversion(selectedPayload(), selectedCardsForReveal());
}

async function initializePage() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    displayStatus('Please sign in to use the Star Bits Exchange.', 'error');
    window.setTimeout(() => { window.location.href = './login.html'; }, 1400);
    return;
  }
  await loadPreview();
}

selectAllToggle.addEventListener('change', () => {
  const selectEverything = selectAllToggle.checked;
  const cards = currentPreview?.duplicateCards || [];
  for (const card of cards) {
    const quantity = selectEverything ? Number(card.duplicateQuantity || 0) : 0;
    setSelection(card.cardId, quantity, Number(card.duplicateQuantity || 0));
  }
  selectAllToggle.checked = selectEverything;
  updateSelectionSummary();
});

clearSelectionButton.addEventListener('click', () => {
  if (selectAllToggle) selectAllToggle.checked = false;
  for (const card of currentPreview?.duplicateCards || []) {
    setSelection(card.cardId, 0, card.duplicateQuantity);
  }
});

exchangeButton.addEventListener('click', performConversion);
initializePage();
