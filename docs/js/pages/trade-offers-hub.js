import { getTradeOfferContext, createTradeOffer, getMyTradeOffers, respondToTradeOffer, searchTradeCollectors } from '../trade-offer-service.js';
import { enrichCardWithCatalogEffects } from '../card-catalog-service.js';
import { buildTradeSearchHaystack } from '../card-filter-utils.js';
import { shellHref } from '../shell-route-utils.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';
import { bindTablistKeyboard, syncTabSelection } from '../tablist-a11y.js';

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

function profileHref(name) {
  const handle = String(name || '').trim().replace(/^@/, '');
  if (!handle) return '';
  return shellHref('trades', { section: 'collectors', username: handle });
}

function collectorLink(displayName, handle) {
  const href = shellHref('collector', { username: handle });
  const label = displayName || handle || 'Collector';
  if (!href) return esc(label);
  return `<a class="collector-link" href="${esc(href)}" target="_top" data-shell-view="collector">${esc(label)}</a>`;
}

export function initProposeTrade(root, options = {}) {
  if (!root) return null;

  let offersCopy = getCachedWebsiteContent()?.offers || {};
  let username = String(options.username || new URLSearchParams(location.search).get('username') || '').trim().replace(/^@/, '');
  const status = root.querySelector('[data-propose-status]');
  const recipientInput = root.querySelector('[data-propose-recipient]');
  const recipientResults = root.querySelector('[data-propose-results]');
  const mySearch = root.querySelector('[data-propose-my-search]');
  const theirSearch = root.querySelector('[data-propose-their-search]');
  const sendButton = root.querySelector('[data-propose-send]');
  const offerSummary = root.querySelector('[data-propose-summary]');
  const composeMissing = root.querySelector('[data-propose-missing]');
  const composeForm = root.querySelector('[data-propose-form]');
  const recipientHead = root.querySelector('[data-propose-head]');
  const myCardsGrid = root.querySelector('[data-propose-my-cards]');
  const theirCardsGrid = root.querySelector('[data-propose-their-cards]');
  const loadButton = root.querySelector('[data-propose-load]');

  let context = null;
  let myQuery = '';
  let theirQuery = '';
  const offeredQty = new Map();
  const requestedQty = new Map();
  let sending = false;
  let searchTimer = 0;
  let searchRequestId = 0;
  let searchHits = [];
  let activeSearchIndex = -1;
  let searchAvailable = true;

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

  function pickArtHtml(card) {
    const enriched = enrichCardWithCatalogEffects(normalizeCard(card));
    const art = enriched.thumbnailUrl || enriched.imageUrl || '';
    if (window.StarlightPerspectiveCard?.cardArtMarkup) {
      return window.StarlightPerspectiveCard.cardArtMarkup(enriched, {
        imageUrl: art,
        alt: `${enriched.name} card artwork`,
        visible: Boolean(art)
      });
    }
    return `<img src="${esc(art)}" alt="${esc(enriched.name)} card artwork" loading="lazy">`;
  }

  function pickHtml(card, side) {
    const number = card.collectorNumber || card.cardNumber;
    const selected = selectionMap(side).get(String(card.id)) || 0;
    const max = Number(card.available) || 0;
    const clamped = Math.min(selected, max);
    return `<article class="pick-card${clamped ? ' is-selected' : ''}${isMatch(card) ? ' is-match' : ''}">
      <div class="pick-card-art">
        ${pickArtHtml(card)}
      </div>
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
    if (myCardsGrid) {
      myCardsGrid.innerHTML = myCards.map(card => pickHtml(card, 'offered')).join('')
        || `<div class="empty">${myQuery ? 'No offered cards matched your search.' : 'You have no duplicate cards listed for trade.'}</div>`;
      window.StarlightPerspectiveCard?.scanPerspectiveCards?.(myCardsGrid);
    }
    if (theirCardsGrid) {
      theirCardsGrid.innerHTML = theirCards.map(card => pickHtml(card, 'requested')).join('')
        || `<div class="empty">${theirQuery ? 'No requested cards matched your search.' : 'This collector has no duplicate cards listed.'}</div>`;
      window.StarlightPerspectiveCard?.scanPerspectiveCards?.(theirCardsGrid);
    }
    renderOfferSummary();
  }

  function clearSelections() {
    offeredQty.clear();
    requestedQty.clear();
    renderPickGrids();
    if (status) status.textContent = 'Selections cleared.';
  }

  function resetComposerSelections() {
    offeredQty.clear();
    requestedQty.clear();
    myQuery = '';
    theirQuery = '';
    if (mySearch) mySearch.value = '';
    if (theirSearch) theirSearch.value = '';
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
      renderRecipientResults('Live search is unavailable. Enter an exact username, then continue.');
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

  function syncUsernameUrl(nextUsername) {
    if (typeof options.syncUrl === 'function') {
      options.syncUrl({ username: nextUsername || null });
      return;
    }
    const next = new URLSearchParams(location.search);
    if (nextUsername) next.set('username', nextUsername);
    else next.delete('username');
    const query = next.toString();
    history.replaceState({}, '', query ? `${location.pathname}?${query}` : location.pathname);
  }

  function showRecipientLookup() {
    if (composeForm) composeForm.hidden = true;
    if (composeMissing) composeMissing.hidden = false;
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
      if (composeMissing) composeMissing.hidden = true;
      if (composeForm) composeForm.hidden = false;
      const recipient = context.recipient;
      const avatarAlt = recipient.displayName || recipient.username || 'Collector';
      if (recipientHead) {
        recipientHead.innerHTML = `<div class="collector-head">${recipient.avatarUrl ? `<img src="${esc(recipient.avatarUrl)}" alt="${esc(avatarAlt)} avatar">` : ''}<div><b>Trading with ${collectorLink(recipient.displayName || recipient.username, recipient.username)}</b><div>@${esc(recipient.username)}</div><button type="button" class="change-recipient" data-action="change-recipient">Change collector</button></div></div>`;
      }
      renderPickGrids();
      if (status) status.textContent = `Ready to trade with @${recipient.username}.`;
    } catch (error) {
      if (status) status.textContent = error.message;
      showRecipientLookup();
    }
  }

  async function loadRecipient(forcedUsername) {
    username = String(forcedUsername ?? recipientInput?.value ?? '').trim().replace(/^@/, '');
    if (!username) {
      if (status) status.textContent = 'Search for a collector, or enter a username.';
      return;
    }
    syncUsernameUrl(username);
    await initCompose(username);
  }

  function selectSearchHit(index) {
    const hit = searchHits[index];
    if (!hit?.username) return;
    if (recipientInput) recipientInput.value = hit.username;
    hideRecipientResults();
    loadRecipient(hit.username);
  }

  loadButton?.addEventListener('click', () => loadRecipient());
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

  mySearch?.addEventListener('input', () => {
    myQuery = mySearch.value.trim().toLowerCase();
    renderPickGrids();
  });
  theirSearch?.addEventListener('input', () => {
    theirQuery = theirSearch.value.trim().toLowerCase();
    renderPickGrids();
  });

  root.addEventListener('change', event => {
    const select = event.target.closest('[data-pick]');
    if (!select) return;
    setSelection(select.dataset.pick, select.dataset.card, select.value);
    const card = select.closest('.pick-card');
    card?.classList.toggle('is-selected', Number(select.value) > 0);
    renderOfferSummary();
  });

  sendButton?.addEventListener('click', async () => {
    if (sending) return;
    const offered = chosen('offered');
    const requested = chosen('requested');
    if (!offered.length || !requested.length) {
      if (status) status.textContent = 'Choose at least one card from each side.';
      renderOfferSummary();
      return;
    }
    sending = true;
    sendButton.disabled = true;
    if (status) status.textContent = 'Sending offer…';
    try {
      const noteEl = root.querySelector('[data-propose-note]');
      await createTradeOffer(username, offered, requested, noteEl?.value || '');
      if (status) status.textContent = 'Trade offer sent.';
      resetComposerSelections();
      if (noteEl) noteEl.value = '';
      renderPickGrids();
      options.onSent?.();
    } catch (error) {
      if (status) status.textContent = error.message;
    } finally {
      sending = false;
      renderOfferSummary();
    }
  });

  root.addEventListener('click', event => {
    const changeButton = event.target.closest('[data-action="change-recipient"]');
    if (changeButton) {
      showRecipientLookup();
      if (status) status.textContent = 'Search for another collector.';
      return;
    }
    const clearButton = event.target.closest('[data-action="clear-selections"]');
    if (clearButton) {
      clearSelections();
    }
  });

  document.addEventListener('click', event => {
    if (event.target.closest('.recipient-search')) return;
    hideRecipientResults();
  });

  const onContentHydrated = (event) => {
    offersCopy = event.detail?.offers || offersCopy;
  };
  window.addEventListener('starlight-website-content-hydrated', onContentHydrated);

  if (recipientInput && username) recipientInput.value = username;
  if (username) void initCompose(username);
  else showRecipientLookup();

  return {
    loadRecipient,
    destroy() {
      window.removeEventListener('starlight-website-content-hydrated', onContentHydrated);
    }
  };
}

function mini(items) {
  return `<div class="offer-items">${(items || []).map(card => `<div class="mini-card"><img src="${esc(card.thumbnailUrl || card.imageUrl)}" alt="${esc(card.name)} card artwork"><div>×${card.quantity} ${esc(card.name)}</div></div>`).join('')}</div>`;
}

function offerHtml(offer, incoming, highlightId) {
  const handle = incoming ? offer.proposer_username : offer.recipient_username;
  const name = incoming ? (offer.proposer_name || offer.proposer_username) : (offer.recipient_name || offer.recipient_username);
  const offerId = String(offer.id || '');
  const highlight = highlightId === offerId;
  return `<article class="offer-card${highlight ? ' is-highlighted' : ''}" data-offer-id="${esc(offerId)}" id="offer-${esc(offerId)}">
    <div class="offer-top"><b>${incoming ? 'From ' : 'To '}${collectorLink(name, handle)}</b><span class="status-pill ${esc(offer.status)}">${esc(offer.status)}</span></div>
    <div class="offer-sides"><div><b>Sender gives</b>${mini(offer.proposer_items)}</div><div class="offer-arrow">⇄</div><div><b>Recipient gives</b>${mini(offer.recipient_items)}</div></div>
    ${offer.note ? `<p>“${esc(offer.note)}”</p>` : ''}
    ${offer.status === 'pending' ? `<div class="actions">${incoming
      ? `<button class="accept" data-action="accept" data-id="${esc(offerId)}">Accept</button><button class="decline" data-action="decline" data-id="${esc(offerId)}">Decline</button>`
      : `<button class="cancel" data-action="cancel" data-id="${esc(offerId)}">Cancel Offer</button>`}</div>` : ''}
  </article>`;
}

export function initTradesInProgress(root, options = {}) {
  if (!root) return null;

  let offersCopy = getCachedWebsiteContent()?.offers || {};
  const params = new URLSearchParams(location.search);
  const status = root.querySelector('[data-progress-status]');
  const incomingList = root.querySelector('[data-progress-incoming]');
  const outgoingList = root.querySelector('[data-progress-outgoing]');
  const progressTabs = [...root.querySelectorAll('[data-progress-tab]')];
  const progressTablist = root.querySelector('[data-progress-tablist]');
  const incomingPanel = root.querySelector('[data-progress-panel="incoming"]');
  const outgoingPanel = root.querySelector('[data-progress-panel="outgoing"]');

  let offers = { incoming: [], outgoing: [] };
  let activeSub = options.initialSub || params.get('sub') || params.get('tab') || 'incoming';
  if (activeSub !== 'incoming' && activeSub !== 'outgoing') activeSub = 'incoming';

  function pendingIncomingCount() {
    return (offers.incoming || []).filter(offer => offer.status === 'pending').length;
  }

  function renderOffers() {
    const pending = pendingIncomingCount();
    options.onPendingCount?.(pending);

    const incomingTab = progressTabs.find(button => button.dataset.progressTab === 'incoming');
    const incomingLabel = offersCopy.tabIncoming || 'Incoming';
    if (incomingTab) {
      incomingTab.textContent = pending ? `${incomingLabel} (${pending})` : incomingLabel;
    }

    const emptyIncoming = esc(offersCopy.emptyIncoming || 'No incoming offers.');
    const emptyOutgoing = esc(offersCopy.emptyOutgoing || 'No sent offers.');
    const highlightId = params.get('offerId') || params.get('tradeId') || '';

    if (incomingList) {
      incomingList.innerHTML = offers.incoming.length
        ? offers.incoming.map(offer => offerHtml(offer, true, highlightId)).join('')
        : `<div class="empty">${emptyIncoming}</div>`;
    }
    if (outgoingList) {
      outgoingList.innerHTML = offers.outgoing.length
        ? offers.outgoing.map(offer => offerHtml(offer, false, highlightId)).join('')
        : `<div class="empty">${emptyOutgoing}</div>`;
    }
  }

  async function loadOffers() {
    try {
      offers = await getMyTradeOffers();
      renderOffers();
    } catch (error) {
      if (status) status.textContent = error.message;
    }
  }

  function syncSubUrl(sub) {
    if (typeof options.syncUrl === 'function') {
      options.syncUrl({ sub });
      return;
    }
    const next = new URLSearchParams(location.search);
    if (sub === 'incoming') next.delete('sub');
    else next.set('sub', sub);
    const query = next.toString();
    history.replaceState({}, '', query ? `${location.pathname}?${query}` : location.pathname);
  }

  function setProgressSub(sub) {
    activeSub = sub === 'outgoing' ? 'outgoing' : 'incoming';
    const panels = [incomingPanel, outgoingPanel].filter(Boolean);
    syncTabSelection(progressTabs, panels, activeSub, {
      nameFromTab: (button) => button.dataset.progressTab,
      nameFromPanel: (panel) => panel.dataset.progressPanel
    });
    syncSubUrl(activeSub);
  }

  function focusHighlightedOffer() {
    const id = params.get('offerId') || params.get('tradeId');
    if (!id) return;
    const target = root.querySelector(`#offer-${CSS.escape(id)}`) || root.querySelector(`[data-offer-id="${CSS.escape(id)}"]`);
    target?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  progressTabs.forEach(button => {
    button.addEventListener('click', () => setProgressSub(button.dataset.progressTab));
  });

  if (progressTablist && progressTabs.length) {
    progressTablist.setAttribute('role', 'tablist');
    bindTablistKeyboard(progressTablist, progressTabs, {
      onActivate: (button) => setProgressSub(button.dataset.progressTab)
    });
  }

  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (!['accept', 'decline', 'cancel'].includes(action)) return;

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

    button.disabled = true;
    if (status) status.textContent = 'Updating trade…';
    try {
      await respondToTradeOffer(button.dataset.id, action);
      if (status) status.textContent = `Trade ${action === 'accept' ? 'completed' : `${action}d`}.`;
      await loadOffers();
    } catch (error) {
      if (status) status.textContent = error.message;
      button.disabled = false;
    }
  });

  const onContentHydrated = (event) => {
    offersCopy = event.detail?.offers || offersCopy;
    renderOffers();
  };
  window.addEventListener('starlight-website-content-hydrated', onContentHydrated);

  setProgressSub(activeSub);
  void loadOffers().then(() => focusHighlightedOffer());

  return {
    refresh: loadOffers,
    getPendingIncomingCount: pendingIncomingCount,
    setProgressSub,
    destroy() {
      window.removeEventListener('starlight-website-content-hydrated', onContentHydrated);
    }
  };
}
