import { getPublicTradeLists } from './trade-list-service.js';

const username = new URLSearchParams(window.location.search).get('username')?.trim().toLowerCase() || '';
const section = document.getElementById('public-trades-section');
const wishlistGrid = document.getElementById('public-wishlist-grid');
const tradeGrid = document.getElementById('public-trade-grid');
const matchSummary = document.getElementById('trade-match-summary');
const listsError = document.getElementById('trade-lists-error');

function cardNode(card, type) {
  const article = document.createElement('article');
  article.className = 'trade-showcase-card';
  const img = document.createElement('img');
  img.src = card.thumbnailUrl || card.imageUrl || '';
  img.alt = `${card.name} card artwork`;
  img.loading = 'lazy';
  const heading = document.createElement('h3');
  heading.textContent = `#${card.collectorNumber || card.cardNumber} ${card.name}`;
  const meta = document.createElement('p');
  meta.textContent = `${card.rarity} • ${card.seriesName}`;
  article.append(img, heading, meta);
  if (type === 'trade') {
    const quantity = document.createElement('span');
    quantity.className = 'trade-quantity-pill';
    quantity.textContent = `${card.tradeQuantity} available`;
    article.append(quantity);
    if (card.viewerWantsThis) {
      const match = document.createElement('span');
      match.className = 'trade-match-pill';
      match.textContent = '✨ On your wishlist';
      article.append(match);
    }
  } else if (card.viewerOwnsThis) {
    const match = document.createElement('span');
    match.className = 'trade-match-pill';
    match.textContent = '✨ You own this card';
    article.append(match);
  }
  return article;
}

function renderGrid(grid, cards, type, emptyText) {
  grid.replaceChildren();
  if (!cards.length) {
    const empty = document.createElement('div');
    empty.className = 'trade-showcase-empty';
    empty.textContent = emptyText;
    grid.append(empty);
    return;
  }
  cards.forEach(card => grid.append(cardNode(card, type)));
}

async function init() {
  if (!section || !username) return;
  try {
    const result = await getPublicTradeLists(username);
    if (!result?.found) {
      if (listsError) {
        listsError.textContent = 'Trade lists are not available for this collector.';
        listsError.classList.remove('hidden');
      }
      section.classList.remove('hidden');
      return;
    }
    if (!result?.publicLists) {
      if (listsError) {
        listsError.textContent = 'This collector keeps their wishlist and trade lists private.';
        listsError.classList.remove('hidden');
      }
      section.classList.remove('hidden');
      return;
    }
    const wishlist = Array.isArray(result.wishlist) ? result.wishlist : [];
    const forTrade = Array.isArray(result.forTrade) ? result.forTrade : [];
    renderGrid(wishlistGrid, wishlist, 'wishlist', 'This collector has not added any cards to their wishlist yet.');
    renderGrid(tradeGrid, forTrade, 'trade', 'This collector has not listed any duplicate cards for trade yet.');
    const ownedMatches = wishlist.filter(card => card.viewerOwnsThis).length;
    const wantedMatches = forTrade.filter(card => card.viewerWantsThis).length;
    if (ownedMatches || wantedMatches) {
      matchSummary.textContent = `✨ Trade match found: you own ${ownedMatches} card${ownedMatches === 1 ? '' : 's'} they want, and they offer ${wantedMatches} card${wantedMatches === 1 ? '' : 's'} on your wishlist.`;
      matchSummary.classList.remove('hidden');
    }
    section.classList.remove('hidden');
  } catch (error) {
    console.warn('[Starlight] Public trade lists unavailable:', error);
    if (listsError) {
      listsError.textContent = 'Trade lists could not be loaded right now. Try refreshing this profile.';
      listsError.classList.remove('hidden');
    }
    section.classList.remove('hidden');
  }
}

init();
