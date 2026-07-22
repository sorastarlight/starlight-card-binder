import { getTradeOfferContext, createTradeOffer, getMyTradeOffers, respondToTradeOffer } from '../trade-offer-service.js';
import { buildTradeSearchHaystack } from '../card-filter-utils.js';

const params = new URLSearchParams(location.search);
let username = params.get('username') || '';
const status = document.querySelector('#tradeStatus');
const recipientInput = document.querySelector('#recipientUsername');
const mySearch = document.querySelector('#myCardsSearch');
const theirSearch = document.querySelector('#theirCardsSearch');
const sendButton = document.querySelector('#sendOffer');
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
  return `<a class="collector-link" href="${esc(href)}">${esc(label)}</a>`;
}

async function initCompose() {
  if (!username) return;
  if (recipientInput) recipientInput.value = username;
  try {
    context = await getTradeOfferContext(username);
    context.myAvailableCards = (context.myAvailableCards || []).map(normalizeCard);
    context.theirAvailableCards = (context.theirAvailableCards || []).map(normalizeCard);
    resetComposerSelections();
    document.querySelector('#composeMissing').hidden = true;
    document.querySelector('#composeForm').hidden = false;
    const recipient = context.recipient;
    const avatarAlt = recipient.displayName || recipient.username || 'Collector';
    document.querySelector('#recipientHead').innerHTML = `<div class="collector-head">${recipient.avatarUrl ? `<img src="${esc(recipient.avatarUrl)}" alt="${esc(avatarAlt)} avatar">` : ''}<div><b>Trading with ${collectorLink(recipient.displayName || recipient.username, recipient.username)}</b><div>@${esc(recipient.username)}</div></div></div>`;
    renderPickGrids();
    status.textContent = `Ready to trade with @${recipient.username}.`;
  } catch (error) {
    status.textContent = error.message;
  }
}

async function loadRecipient() {
  username = (recipientInput?.value || '').trim().replace(/^@/, '');
  if (!username) {
    status.textContent = 'Enter a collector username.';
    return;
  }
  const next = new URLSearchParams(params);
  next.set('username', username);
  history.replaceState({}, '', `${location.pathname}?${next.toString()}`);
  await initCompose();
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
  if (incomingTab) {
    incomingTab.textContent = pending ? `Incoming (${pending})` : 'Incoming';
  }
  document.querySelector('#incomingList').innerHTML = offers.incoming.length
    ? offers.incoming.map(offer => offerHtml(offer, true)).join('')
    : '<div class="empty">No incoming offers.</div>';
  document.querySelector('#outgoingList').innerHTML = offers.outgoing.length
    ? offers.outgoing.map(offer => offerHtml(offer, false)).join('')
    : '<div class="empty">No sent offers.</div>';
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
  document.querySelectorAll('[data-tab]').forEach(button => {
    const active = button.dataset.tab === name;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
  ['compose', 'incoming', 'outgoing'].forEach(tabName => {
    const view = document.querySelector(`#${tabName}View`);
    if (view) view.hidden = tabName !== name;
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

document.querySelector('#loadRecipient')?.addEventListener('click', loadRecipient);
recipientInput?.addEventListener('keydown', event => {
  if (event.key === 'Enter') {
    event.preventDefault();
    loadRecipient();
  }
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
  button.setAttribute('role', 'tab');
  button.addEventListener('click', () => setActiveOfferTab(button.dataset.tab));
});

if (recipientInput && username) recipientInput.value = username;
setActiveOfferTab(initialOfferTab());
await Promise.all([initCompose(), loadOffers()]);
focusHighlightedOffer();
