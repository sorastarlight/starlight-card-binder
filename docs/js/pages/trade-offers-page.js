import { getTradeOfferContext, createTradeOffer, getMyTradeOffers, respondToTradeOffer, searchTradeCollectors } from '../trade-offer-service.js';
import { buildTradeSearchHaystack } from '../card-filter-utils.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';
import { bindTablistKeyboard, syncTabSelection } from '../tablist-a11y.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const offersCopy = siteCopy?.offers || {};

const params = new URLSearchParams(location.search);
let username = params.get('username') || '';
const status = document.querySelector('#tradeStatus');
const recipientInput = document.querySelector('#recipientUsername');
const recipientResults = document.querySelector('#recipientResults');
const mySearch = document.querySelector('#myCardsSearch');
const theirSearch = document.querySelector('#theirCardsSearch');
const sendButton = document.querySelector('#sendOffer');
const offerTabs = [...document.querySelectorAll('[data-tab]')];
const offerTablist = document.querySelector('.tabs[role="tablist"], .tabs');
const offerSummary = document.querySelector('#offerSummary');

let context = null;
let offers = { incoming: [], outgoing: [] };
let myQuery = '';
let theirQuery = '';
/** @type {Map<string, number>} */
const offeredQty = new Map();
/** @type {Map<string, number>} */
const requestedQty = new Map();
let sending = false;
let searchTimer = 0;
let searchRequestId = 0;
/** @type {Array<{username:string,displayName?:string,avatarUrl?:string,matchedByEmail?:boolean}>} */
let searchHits = [];
let activeSearchIndex = -1;
let searchAvailable = true;

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

function isMatch(card) {
  return Boolean(card.wantedByOther || card.onMyWishlist);
}

function sortPickCards(cards) {
  return [...cards].sort((a, b) => {
    const matchDelta = Number(isMatch(b)) - Number(isMatch(a));
    if (matchDelta) return matchDelta;
    const aNum = String(a.collectorNumber || a.cardNumber || '');
    const bNum = String(b.collectorNumber || b.cardNumber || '');
    return aNum.localeCompare(bNum, undefined, { numeric: true }) || String(a.name || '').localeCompare(String(b.name || ''));
  });
}

function selectionMap(side) {
  return side === 'offered' ? offeredQty : requestedQty;
}

function setSelection(side, cardId, quantity) {
  const map = selectionMap(side);
  const next = Math.max(0, Number(quantity) || 0);
  if (next > 0) map.set(cardId, next);
  else map.delete(cardId);
}

function chosen(side) {
  return [...selectionMap(side).entries()]
    .map(([cardId, quantity]) => ({ cardId, quantity: Number(quantity) }))
    .filter(entry => entry.quantity > 0);
}

function cardById(side, cardId) {
  const list = side === 'offered' ? context?.myAvailableCards : context?.theirAvailableCards;
  return (list || []).find(card => String(card.id) === String(cardId));
}

function pickHtml(card, side) {
  const number = card.collectorNumber || card.cardNumber;
  const selected = selectionMap(side).get(String(card.id)) || 0;
  const max = Number(card.available) || 0;
  const clamped = Math.min(selected, max);
  return `<article class="pick-card${clamped ? ' is-selected' : ''}${isMatch(card) ? ' is-match' : ''}">
    <img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)} card artwork">
    <h3>#${esc(number)} ${esc(card.name)}</h3>
    <p>${isMatch(card) ? 'Match • ' : ''}${esc(card.rarity)}</p>
    <label class="pick-qty">
      <span class="visually-hidden">Quantity for ${esc(card.name)}</span>
      <select data-pick="${side}" data-card="${esc(card.id)}" aria-label="Quantity for ${esc(card.name)}">
        ${Array.from({ length: max + 1 }, (_, index) => `<option value="${index}"${index === clamped ? ' selected' : ''}>${index === 0 ? 'Not selected' : `×${index}`}</option>`).join('')}
      </select>
    </label>
  </article>`;
}

function selectionChips(side, label) {
  const entries = chosen(side);
  if (!entries.length) {
    return `<div class="offer-summary-side"><b>${esc(label)}</b><span class="offer-summary-empty">None selected</span></div>`;
  }
  const chips = entries.map(({ cardId, quantity }) => {
    const card = cardById(side, cardId);
    const name = card?.name || 'Card';
    const number = card?.collectorNumber || card?.cardNumber || '';
    return `<span class="offer-chip">×${quantity} #${esc(number)} ${esc(name)}</span>`;
  }).join('');
  return `<div class="offer-summary-side"><b>${esc(label)} (${entries.length})</b><div class="offer-chips">${chips}</div></div>`;
}

function renderOfferSummary() {
  if (!offerSummary) return;
  if (!context) {
    offerSummary.hidden = true;
    offerSummary.innerHTML = '';
    return;
  }
  const offered = chosen('offered');
  const requested = chosen('requested');
  const ready = offered.length > 0 && requested.length > 0;
  offerSummary.hidden = false;
  offerSummary.innerHTML = `
    <div class="offer-summary-head">
      <b>Selected for this offer</b>
      <button type="button" class="offer-summary-clear" data-action="clear-selections"${offered.length || requested.length ? '' : ' disabled'}>Clear selections</button>
    </div>
    <div class="offer-summary-grid">
      ${selectionChips('offered', 'You offer')}
      ${selectionChips('requested', 'You request')}
    </div>
    <p class="offer-summary-hint">${ready ? 'Ready to send when both sides look right.' : 'Choose at least one card from each side.'}</p>
  `;
  if (sendButton) sendButton.disabled = sending || !ready;
}

function renderPickGrids() {
  if (!context) return;
  const myCards = sortPickCards(
    (context.myAvailableCards || []).filter(card => !myQuery || buildTradeSearchHaystack(card).includes(myQuery))
  );
  const theirCards = sortPickCards(
    (context.theirAvailableCards || []).filter(card => !theirQuery || buildTradeSearchHaystack(card).includes(theirQuery))
  );
  document.querySelector('#myCards').innerHTML = myCards.map(card => pickHtml(card, 'offered')).join('')
    || `<div class="empty">${myQuery ? 'No offered cards matched your search.' : 'You have no duplicate cards listed for trade.'}</div>`;
  document.querySelector('#theirCards').innerHTML = theirCards.map(card => pickHtml(card, 'requested')).join('')
    || `<div class="empty">${theirQuery ? 'No requested cards matched your search.' : 'This collector has no duplicate cards listed.'}</div>`;
  renderOfferSummary();
}

function clearSelections() {
  offeredQty.clear();
  requestedQty.clear();
  renderPickGrids();
  status.textContent = 'Selections cleared.';
}

function resetComposerSelections() {
  offeredQty.clear();
  requestedQty.clear();
  myQuery = '';
  theirQuery = '';
  if (mySearch) mySearch.value = '';
  if (theirSearch) theirSearch.value = '';
}

function profileHref(name) {
  const handle = String(name || '').trim().replace(/^@/, '');
  if (!handle) return '';
  return `binder.html?view=collector&username=${encodeURIComponent(handle)}`;
}

function collectorLink(displayName, handle) {
  const href = profileHref(handle);
  const label = displayName || handle || 'Collector';
  if (!href) return esc(label);
  return `<a class="collector-link" href="${esc(href)}" target="_top" data-shell-view="collector">${esc(label)}</a>`;
}

function setResultsOpen(open) {
  if (!recipientResults || !recipientInput) return;
  recipientResults.hidden = !open;
  recipientInput.setAttribute('aria-expanded', String(Boolean(open)));
}

function hideRecipientResults() {
  searchHits = [];
  activeSearchIndex = -1;
  if (recipientResults) recipientResults.innerHTML = '';
  setResultsOpen(false);
}

function renderRecipientResults(message = '') {
  if (!recipientResults) return;
  if (message) {
    recipientResults.innerHTML = `<div class="recipient-results-status">${esc(message)}</div>`;
    setResultsOpen(true);
    return;
  }
  if (!searchHits.length) {
    recipientResults.innerHTML = '<div class="recipient-results-empty">No collectors matched.</div>';
    setResultsOpen(true);
    return;
  }
  recipientResults.innerHTML = searchHits.map((hit, index) => {
    const label = hit.displayName || hit.username;
    const meta = hit.matchedByEmail ? `@${hit.username} • matched by email` : `@${hit.username}`;
    return `<button type="button" class="recipient-option" role="option" id="recipient-option-${index}" data-username="${esc(hit.username)}" aria-selected="${index === activeSearchIndex}">
      ${hit.avatarUrl ? `<img src="${esc(hit.avatarUrl)}" alt="">` : '<span class="recipient-option-avatar" aria-hidden="true"></span>'}
      <span class="recipient-option-copy"><b>${esc(label)}</b><small>${esc(meta)}</small></span>
    </button>`;
  }).join('');
  setResultsOpen(true);
}

async function runCollectorSearch(rawQuery) {
  const query = String(rawQuery || '').trim();
  if (query.length < 2) {
    hideRecipientResults();
    return;
  }
  if (!searchAvailable) {
    renderRecipientResults('Live search is unavailable. Enter an exact username, then Create Offer.');
    return;
  }
  const requestId = ++searchRequestId;
  renderRecipientResults('Searching…');
  try {
    const payload = await searchTradeCollectors(query);
    if (requestId !== searchRequestId) return;
    searchHits = payload.results || [];
    activeSearchIndex = searchHits.length ? 0 : -1;
    renderRecipientResults();
  } catch (error) {
    if (requestId !== searchRequestId) return;
    const message = String(error?.message || error || '');
    if (/search_trade_collectors|Could not find the function|schema cache/i.test(message)) {
      searchAvailable = false;
      renderRecipientResults('Live search needs a database update. Enter an exact username for now.');
      return;
    }
    renderRecipientResults(message || 'Could not search collectors.');
  }
}

function scheduleCollectorSearch() {
  window.clearTimeout(searchTimer);
  const query = recipientInput?.value || '';
  if (String(query).trim().length < 2) {
    hideRecipientResults();
    return;
  }
  searchTimer = window.setTimeout(() => {
    runCollectorSearch(query);
  }, 220);
}

function selectSearchHit(index) {
  const hit = searchHits[index];
  if (!hit?.username) return;
  if (recipientInput) recipientInput.value = hit.username;
  hideRecipientResults();
  loadRecipient(hit.username);
}

function showRecipientLookup() {
  document.querySelector('#composeForm').hidden = true;
  document.querySelector('#composeMissing').hidden = false;
  context = null;
  resetComposerSelections();
  renderOfferSummary();
  if (recipientInput) {
    recipientInput.focus();
    if (username) recipientInput.value = username;
  }
}

async function initCompose(requestedUsername = username) {
  username = String(requestedUsername || '').trim().replace(/^@/, '');
  if (!username) return;
  if (recipientInput) recipientInput.value = username;
  hideRecipientResults();
  try {
    context = await getTradeOfferContext(username);
    context.myAvailableCards = (context.myAvailableCards || []).map(normalizeCard);
    context.theirAvailableCards = (context.theirAvailableCards || []).map(normalizeCard);
    resetComposerSelections();
    document.querySelector('#composeMissing').hidden = true;
    document.querySelector('#composeForm').hidden = false;
    const recipient = context.recipient;
    const avatarAlt = recipient.displayName || recipient.username || 'Collector';
    document.querySelector('#recipientHead').innerHTML = `<div class="collector-head">${recipient.avatarUrl ? `<img src="${esc(recipient.avatarUrl)}" alt="${esc(avatarAlt)} avatar">` : ''}<div><b>Trading with ${collectorLink(recipient.displayName || recipient.username, recipient.username)}</b><div>@${esc(recipient.username)}</div><button type="button" class="change-recipient" data-action="change-recipient">Change collector</button></div></div>`;
    renderPickGrids();
    status.textContent = `Ready to trade with @${recipient.username}.`;
  } catch (error) {
    status.textContent = error.message;
    showRecipientLookup();
  }
}

async function loadRecipient(forcedUsername) {
  username = String(forcedUsername ?? recipientInput?.value ?? '').trim().replace(/^@/, '');
  if (!username) {
    status.textContent = 'Search for a collector, or enter a username.';
    return;
  }
  const next = new URLSearchParams(params);
  next.set('username', username);
  history.replaceState({}, '', `${location.pathname}?${next.toString()}`);
  setActiveOfferTab('compose');
  await initCompose(username);
}

function mini(items) {
  return `<div class="offer-items">${(items || []).map(card => `<div class="mini-card"><img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)} card artwork"><div>×${card.quantity} ${esc(card.name)}</div></div>`).join('')}</div>`;
}

function offerHtml(offer, incoming) {
  const handle = incoming ? offer.proposer_username : offer.recipient_username;
  const name = incoming ? (offer.proposer_name || offer.proposer_username) : (offer.recipient_name || offer.recipient_username);
  const offerId = String(offer.id || '');
  const highlight = params.get('offerId') === offerId || params.get('tradeId') === offerId;
  return `<article class="offer-card${highlight ? ' is-highlighted' : ''}" data-offer-id="${esc(offerId)}" id="offer-${esc(offerId)}">
    <div class="offer-top"><b>${incoming ? 'From ' : 'To '}${collectorLink(name, handle)}</b><span class="status-pill ${esc(offer.status)}">${esc(offer.status)}</span></div>
    <div class="offer-sides"><div><b>Sender gives</b>${mini(offer.proposer_items)}</div><div class="offer-arrow">⇄</div><div><b>Recipient gives</b>${mini(offer.recipient_items)}</div></div>
    ${offer.note ? `<p>“${esc(offer.note)}”</p>` : ''}
    ${offer.status === 'pending' ? `<div class="actions">${incoming
      ? `<button class="accept" data-action="accept" data-id="${esc(offerId)}">Accept</button><button class="decline" data-action="decline" data-id="${esc(offerId)}">Decline</button>`
      : `<button class="cancel" data-action="cancel" data-id="${esc(offerId)}">Cancel Offer</button>`}</div>` : ''}
  </article>`;
}

function pendingIncomingCount() {
  return (offers.incoming || []).filter(offer => offer.status === 'pending').length;
}

function renderOffers() {
  const pending = pendingIncomingCount();
  const incomingTab = document.querySelector('[data-tab="incoming"]');
  const incomingLabel = offersCopy.tabIncoming || 'Incoming';
  if (incomingTab) {
    incomingTab.textContent = pending ? `${incomingLabel} (${pending})` : incomingLabel;
  }
  const emptyIncoming = esc(offersCopy.emptyIncoming || 'No incoming offers.');
  const emptyOutgoing = esc(offersCopy.emptyOutgoing || 'No sent offers.');
  document.querySelector('#incomingList').innerHTML = offers.incoming.length
    ? offers.incoming.map(offer => offerHtml(offer, true)).join('')
    : `<div class="empty">${emptyIncoming}</div>`;
  document.querySelector('#outgoingList').innerHTML = offers.outgoing.length
    ? offers.outgoing.map(offer => offerHtml(offer, false)).join('')
    : `<div class="empty">${emptyOutgoing}</div>`;
}

async function loadOffers() {
  try {
    offers = await getMyTradeOffers();
    renderOffers();
  } catch (error) {
    status.textContent = error.message;
  }
}

function setActiveOfferTab(name) {
  const panels = ['compose', 'incoming', 'outgoing']
    .map((tabName) => document.querySelector(`#${tabName}View`))
    .filter(Boolean);
  syncTabSelection(offerTabs, panels, name, {
    nameFromTab: (button) => button.dataset.tab,
    nameFromPanel: (panel) => panel.id.replace(/View$/, '')
  });
}

function initialOfferTab() {
  const tab = (params.get('tab') || '').toLowerCase();
  if (tab === 'incoming' || tab === 'outgoing' || tab === 'compose') return tab;
  if (params.get('offerId') || params.get('tradeId')) return 'incoming';
  if (username) return 'compose';
  return 'compose';
}

function focusHighlightedOffer() {
  const id = params.get('offerId') || params.get('tradeId');
  if (!id) return;
  const target = document.querySelector(`#offer-${CSS.escape(id)}`) || document.querySelector(`[data-offer-id="${CSS.escape(id)}"]`);
  target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

document.querySelector('#loadRecipient')?.addEventListener('click', () => loadRecipient());
recipientInput?.addEventListener('input', scheduleCollectorSearch);
recipientInput?.addEventListener('focus', () => {
  if (searchHits.length || (recipientInput.value || '').trim().length >= 2) {
    if (searchHits.length) renderRecipientResults();
    else scheduleCollectorSearch();
  }
});
recipientInput?.addEventListener('keydown', event => {
  if (event.key === 'ArrowDown' && searchHits.length) {
    event.preventDefault();
    activeSearchIndex = (activeSearchIndex + 1) % searchHits.length;
    renderRecipientResults();
    return;
  }
  if (event.key === 'ArrowUp' && searchHits.length) {
    event.preventDefault();
    activeSearchIndex = (activeSearchIndex - 1 + searchHits.length) % searchHits.length;
    renderRecipientResults();
    return;
  }
  if (event.key === 'Escape') {
    hideRecipientResults();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    if (activeSearchIndex >= 0 && searchHits[activeSearchIndex]) {
      selectSearchHit(activeSearchIndex);
      return;
    }
    loadRecipient();
  }
});
recipientResults?.addEventListener('mousedown', event => {
  const option = event.target.closest('[data-username]');
  if (!option) return;
  event.preventDefault();
  loadRecipient(option.dataset.username);
});
document.addEventListener('click', event => {
  if (event.target.closest('.recipient-search')) return;
  hideRecipientResults();
});

mySearch?.addEventListener('input', () => {
  myQuery = mySearch.value.trim().toLowerCase();
  renderPickGrids();
});
theirSearch?.addEventListener('input', () => {
  theirQuery = theirSearch.value.trim().toLowerCase();
  renderPickGrids();
});

document.querySelector('#composeForm')?.addEventListener('change', event => {
  const select = event.target.closest('[data-pick]');
  if (!select) return;
  setSelection(select.dataset.pick, select.dataset.card, select.value);
  const card = select.closest('.pick-card');
  card?.classList.toggle('is-selected', Number(select.value) > 0);
  renderOfferSummary();
});

if (sendButton) {
  sendButton.onclick = async () => {
    if (sending) return;
    const offered = chosen('offered');
    const requested = chosen('requested');
    if (!offered.length || !requested.length) {
      status.textContent = 'Choose at least one card from each side.';
      renderOfferSummary();
      return;
    }
    sending = true;
    sendButton.disabled = true;
    status.textContent = 'Sending offer…';
    try {
      await createTradeOffer(username, offered, requested, document.querySelector('#tradeNote').value);
      status.textContent = 'Trade offer sent.';
      resetComposerSelections();
      const note = document.querySelector('#tradeNote');
      if (note) note.value = '';
      renderPickGrids();
      await loadOffers();
      setActiveOfferTab('outgoing');
    } catch (error) {
      status.textContent = error.message;
    } finally {
      sending = false;
      renderOfferSummary();
    }
  };
}

document.addEventListener('click', async event => {
  const changeButton = event.target.closest('[data-action="change-recipient"]');
  if (changeButton) {
    showRecipientLookup();
    status.textContent = 'Search for another collector.';
    return;
  }

  const clearButton = event.target.closest('[data-action="clear-selections"]');
  if (clearButton) {
    clearSelections();
    return;
  }

  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'accept' && !(await StarlightUI.confirm({
    title: 'Accept this trade?',
    message: 'The listed duplicate cards will be exchanged immediately.',
    confirmText: 'Accept Trade'
  }))) return;
  if (action === 'decline' && !(await StarlightUI.confirm({
    title: 'Decline this trade?',
    message: 'The sender will be notified that you declined.',
    confirmText: 'Decline Offer'
  }))) return;
  if (action === 'cancel' && !(await StarlightUI.confirm({
    title: 'Cancel this offer?',
    message: 'This pending offer will be withdrawn.',
    confirmText: 'Cancel Offer'
  }))) return;
  if (!['accept', 'decline', 'cancel'].includes(action)) return;
  button.disabled = true;
  status.textContent = 'Updating trade…';
  try {
    await respondToTradeOffer(button.dataset.id, action);
    status.textContent = `Trade ${action === 'accept' ? 'completed' : `${action}d`}.`;
    await loadOffers();
  } catch (error) {
    status.textContent = error.message;
    button.disabled = false;
  }
});

document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => setActiveOfferTab(button.dataset.tab));
});

if (offerTablist) {
  offerTablist.setAttribute('role', 'tablist');
  bindTablistKeyboard(offerTablist, offerTabs, {
    onActivate: (button) => setActiveOfferTab(button.dataset.tab)
  });
}

if (recipientInput && username) recipientInput.value = username;
setActiveOfferTab(initialOfferTab());
await Promise.all([initCompose(), loadOffers()]);
focusHighlightedOffer();
