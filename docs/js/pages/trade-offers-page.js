import { getTradeOfferContext, createTradeOffer, getMyTradeOffers, respondToTradeOffer } from '../trade-offer-service.js';
import { buildTradeSearchHaystack } from '../card-filter-utils.js';

const params = new URLSearchParams(location.search);
let username = params.get('username') || '';
const status = document.querySelector('#tradeStatus');
const recipientInput = document.querySelector('#recipientUsername');
const mySearch = document.querySelector('#myCardsSearch');
const theirSearch = document.querySelector('#theirCardsSearch');

let context = null;
let offers = { incoming: [], outgoing: [] };
let myQuery = '';
let theirQuery = '';

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

function pickHtml(card, side) {
  const number = card.collectorNumber || card.cardNumber;
  return `<article class="pick-card">
    <img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)} card artwork">
    <h3>#${esc(number)} ${esc(card.name)}</h3>
    <p>${card.wantedByOther || card.onMyWishlist ? '✨ Match • ' : ''}${esc(card.rarity)}</p>
    <label class="pick-qty">
      <span class="visually-hidden">Quantity for ${esc(card.name)}</span>
      <select data-pick="${side}" data-card="${esc(card.id)}" aria-label="Quantity for ${esc(card.name)}">
        ${Array.from({ length: Number(card.available) + 1 }, (_, index) => `<option value="${index}">${index === 0 ? 'Not selected' : `×${index}`}</option>`).join('')}
      </select>
    </label>
  </article>`;
}

function renderPickGrids() {
  if (!context) return;
  const myCards = (context.myAvailableCards || []).filter(card => !myQuery || buildTradeSearchHaystack(card).includes(myQuery));
  const theirCards = (context.theirAvailableCards || []).filter(card => !theirQuery || buildTradeSearchHaystack(card).includes(theirQuery));
  document.querySelector('#myCards').innerHTML = myCards.map(card => pickHtml(card, 'offered')).join('')
    || `<div class="empty">${myQuery ? 'No offered cards matched your search.' : 'You have no duplicate cards listed for trade.'}</div>`;
  document.querySelector('#theirCards').innerHTML = theirCards.map(card => pickHtml(card, 'requested')).join('')
    || `<div class="empty">${theirQuery ? 'No requested cards matched your search.' : 'This collector has no duplicate cards listed.'}</div>`;
}

async function initCompose() {
  if (!username) return;
  if (recipientInput) recipientInput.value = username;
  try {
    context = await getTradeOfferContext(username);
    context.myAvailableCards = (context.myAvailableCards || []).map(normalizeCard);
    context.theirAvailableCards = (context.theirAvailableCards || []).map(normalizeCard);
    document.querySelector('#composeMissing').hidden = true;
    document.querySelector('#composeForm').hidden = false;
    const recipient = context.recipient;
    document.querySelector('#recipientHead').innerHTML = `<div class="collector-head">${recipient.avatarUrl ? `<img src="${esc(recipient.avatarUrl)}" alt="">` : ''}<div><b>Trading with ${esc(recipient.displayName || recipient.username)}</b><div>@${esc(recipient.username)}</div></div></div>`;
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

function chosen(side) {
  return [...document.querySelectorAll(`[data-pick="${side}"]`)]
    .map(select => ({ cardId: select.dataset.card, quantity: Number(select.value) }))
    .filter(entry => entry.quantity > 0);
}

function mini(items) {
  return `<div class="offer-items">${(items || []).map(card => `<div class="mini-card"><img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)} card artwork"><div>×${card.quantity} ${esc(card.name)}</div></div>`).join('')}</div>`;
}

function offerHtml(offer, incoming) {
  return `<article class="offer-card">
    <div class="offer-top"><b>${incoming ? `From ${esc(offer.proposer_name || offer.proposer_username)}` : `To ${esc(offer.recipient_name || offer.recipient_username)}`}</b><span class="status-pill ${esc(offer.status)}">${esc(offer.status)}</span></div>
    <div class="offer-sides"><div><b>Sender gives</b>${mini(offer.proposer_items)}</div><div class="offer-arrow">⇄</div><div><b>Recipient gives</b>${mini(offer.recipient_items)}</div></div>
    ${offer.note ? `<p>“${esc(offer.note)}”</p>` : ''}
    ${offer.status === 'pending' ? `<div class="actions">${incoming
      ? `<button class="accept" data-action="accept" data-id="${offer.id}">Accept</button><button class="decline" data-action="decline" data-id="${offer.id}">Decline</button>`
      : `<button class="cancel" data-action="cancel" data-id="${offer.id}">Cancel Offer</button>`}</div>` : ''}
  </article>`;
}

function renderOffers() {
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

document.querySelector('#sendOffer').onclick = async () => {
  const offered = chosen('offered');
  const requested = chosen('requested');
  if (!offered.length || !requested.length) {
    status.textContent = 'Choose at least one card from each side.';
    return;
  }
  status.textContent = 'Sending offer…';
  try {
    await createTradeOffer(username, offered, requested, document.querySelector('#tradeNote').value);
    status.textContent = 'Trade offer sent ✨';
    document.querySelectorAll('[data-pick]').forEach(select => { select.value = '0'; });
    await loadOffers();
  } catch (error) {
    status.textContent = error.message;
  }
};

document.addEventListener('click', async event => {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'accept' && !(await StarlightUI.confirm({
    title: 'Accept this trade?',
    message: 'The listed duplicate cards will be exchanged immediately.',
    confirmText: 'Accept Trade'
  }))) return;
  status.textContent = 'Updating trade…';
  try {
    await respondToTradeOffer(button.dataset.id, action);
    status.textContent = `Trade ${action === 'accept' ? 'completed' : `${action}d`}.`;
    await loadOffers();
  } catch (error) {
    status.textContent = error.message;
  }
});

document.querySelectorAll('[data-tab]').forEach(button => {
  button.setAttribute('role', 'tab');
  button.addEventListener('click', () => setActiveOfferTab(button.dataset.tab));
});

if (recipientInput && username) recipientInput.value = username;
setActiveOfferTab('compose');
await Promise.all([initCompose(), loadOffers()]);
