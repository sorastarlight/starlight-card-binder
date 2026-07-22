import { getMyTradeLists, setCardTradePreference, setTradeListVisibility } from '../trade-list-service.js';
import { buildTradeSearchHaystack } from '../card-filter-utils.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const tradesCopy = siteCopy?.trades || {};

const grid = document.querySelector('#tradeGrid');
const search = document.querySelector('#tradeSearch');
const status = document.querySelector('#tradeStatus');
const publicToggle = document.querySelector('#publicLists');
const tabs = [...document.querySelectorAll('[data-tab]')];

let data = [];
let tab = 'wishlist';
let query = '';

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

function filtered() {
  return data.filter(card => {
    const match = !query || buildTradeSearchHaystack(card).includes(query);
    if (!match) return false;
    if (tab === 'wishlist') return card.wishlisted;
    if (tab === 'trade') return card.tradeQuantity > 0;
    return true;
  });
}

function emptyCopy(listLength) {
  if (query && !listLength) return 'No cards matched your search.';
  if (tab === 'wishlist') {
    return tradesCopy.emptyWishlist || 'Browse All Cards and add the ones you are searching for.';
  }
  if (tab === 'trade') {
    return tradesCopy.emptyTrade || 'Only duplicate copies can be offered for trade.';
  }
  return 'No cards matched your search.';
}

function emptyActions() {
  if (query) return '';
  const actionLabel = esc(tradesCopy.emptyAction || 'Browse All Cards');
  if (tab === 'wishlist' || tab === 'trade') {
    return `<p><button type="button" class="trade-empty-action" data-open-tab="all">${actionLabel}</button></p>`;
  }
  return '';
}

function render() {
  const list = filtered();
  const emptyTitle = esc(tradesCopy.emptyTitle || 'Nothing here yet');
  grid.innerHTML = list.length
    ? list.map(card => `<article class="trade-card">
        <img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)} card artwork">
        <h3>#${esc(card.collectorNumber || card.cardNumber)} ${esc(card.name)}</h3>
        <p>${esc(card.rarity)} • ${esc(card.seriesName)}</p>
        <p>Owned: ${card.ownedQuantity} • Extras: ${card.duplicateQuantity}</p>
        <div class="trade-actions">
          <label><input type="checkbox" data-wish="${esc(card.id)}" ${card.wishlisted ? 'checked' : ''}> Add to Wishlist</label>
          <label>For Trade <select data-trade="${esc(card.id)}" aria-label="Trade quantity for ${esc(card.name)}">${Array.from({ length: card.duplicateQuantity + 1 }, (_, index) => `<option value="${index}" ${index === card.tradeQuantity ? 'selected' : ''}>${index}</option>`).join('')}</select></label>
        </div>
      </article>`).join('')
    : `<div class="trade-empty"><h2>${emptyTitle}</h2><p>${esc(emptyCopy(list.length))}</p>${emptyActions()}</div>`;
}

function setActiveTab(nextTab) {
  tab = nextTab;
  tabs.forEach(button => {
    const active = button.dataset.tab === tab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  render();
}

async function save(id) {
  const card = data.find(entry => entry.id === id);
  if (!card) return;
  status.textContent = 'Saving…';
  try {
    const result = await setCardTradePreference(id, card.wishlisted, card.tradeQuantity);
    card.tradeQuantity = result.tradeQuantity;
    status.textContent = 'Trade lists saved ✨';
    render();
  } catch (error) {
    status.textContent = error.message || 'Could not save.';
  }
}

document.addEventListener('change', event => {
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

tabs.forEach(button => {
  button.setAttribute('role', 'tab');
  button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

grid?.addEventListener('click', event => {
  const button = event.target.closest('[data-open-tab]');
  if (!button) return;
  setActiveTab(button.dataset.openTab);
});

search?.addEventListener('input', () => {
  query = search.value.trim().toLowerCase();
  render();
});

publicToggle?.addEventListener('change', async () => {
  const previous = !publicToggle.checked;
  try {
    await setTradeListVisibility(publicToggle.checked);
    status.textContent = 'Profile visibility updated.';
  } catch (error) {
    publicToggle.checked = previous;
    status.textContent = error.message || 'Could not update visibility.';
  }
});

grid.innerHTML = '<div class="trade-empty"><h2>Loading trade lists…</h2><p>Gathering your wishlist and trade binder.</p></div>';
status.textContent = 'Loading…';

try {
  const result = await getMyTradeLists();
  data = (result.cards || []).map(normalizeCard);
  if (publicToggle) publicToggle.checked = result.publicLists !== false;
  setActiveTab('wishlist');
  status.textContent = 'Wishlist and trade binder loaded.';
} catch (error) {
  grid.innerHTML = `<div class="trade-empty"><h2>Could not load trade lists</h2><p>${esc(error.message || 'Please sign in.')}</p></div>`;
  status.textContent = error.message || 'Please sign in.';
}
