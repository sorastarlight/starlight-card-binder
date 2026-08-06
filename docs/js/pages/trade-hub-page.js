import { bindTablistKeyboard, syncTabSelection } from '../tablist-a11y.js';
import { initMyTradeCards } from './my-trade-cards.js';
import { initUserRankings } from './user-rankings-page.js';
import { initOpenTrades } from './open-trades-page.js';
import { initProposeTrade, initTradesInProgress } from './trade-offers-hub.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';

const HUB_VIEWS = new Set(['collectors', 'my-trade', 'open-trades', 'progress']);
const hubTabs = [...document.querySelectorAll('.trade-hub-tabs [data-hub-view]')];
const hubTablist = document.querySelector('.trade-hub-tabs');
const panels = Object.fromEntries(
  [...document.querySelectorAll('[data-hub-panel]')].map(panel => [panel.dataset.hubPanel, panel])
);
const hubPanelList = ['collectors', 'my-trade', 'open-trades', 'progress']
  .map(name => panels[name])
  .filter(Boolean);
const hubMain = document.querySelector('.trade-hub-page');
const proposeSheet = panels.collectors?.querySelector('[data-collectors-propose]');

const progressBadge = document.querySelector('[data-hub-progress-badge]');

let rankingsReady = false;
let myTradeReady = false;
let openTradesReady = false;
let proposeReady = false;
let progressReady = false;
let myTradeController = null;
let openTradesController = null;
let proposeController = null;
let progressController = null;
let proposeOpen = false;

function resetHubScroll() {
  window.__starlightEmbedReportHeight?.();
}

function tradesCopy() {
  return getCachedWebsiteContent()?.trades || {};
}

function copy(key, fallback) {
  const value = tradesCopy()[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function normalizeView(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'lists' || value === 'wishlist' || value === 'trade' || value === 'all') return 'my-trade';
  if (value === 'rankings') return 'collectors';
  if (value === 'in-progress' || value === 'incoming' || value === 'outgoing') return 'progress';
  if (value === 'compose' || value === 'offers' || value === 'propose') return 'collectors';
  if (HUB_VIEWS.has(value)) return value;
  return 'collectors';
}

function readInitialView() {
  const params = new URLSearchParams(location.search);
  const section = params.get('section');
  const tab = params.get('tab');
  if (tab === 'incoming' || tab === 'outgoing') return 'progress';
  if (tab === 'compose') return 'collectors';
  if (!section && !tab) return 'my-trade';
  return normalizeView(section);
}

function readInitialProgressSub() {
  const params = new URLSearchParams(location.search);
  const sub = params.get('sub') || params.get('tab') || 'incoming';
  return sub === 'outgoing' ? 'outgoing' : 'incoming';
}

function readInitialPropose() {
  const params = new URLSearchParams(location.search);
  const section = String(params.get('section') || '').trim().toLowerCase();
  const tab = String(params.get('tab') || '').trim().toLowerCase();
  const username = params.get('username') || '';
  if (section === 'propose' || tab === 'compose') {
    return { open: true, username };
  }
  if (section === 'collectors' && username) {
    return { open: true, username };
  }
  return { open: false, username: '' };
}

function syncHubUrl(view, extra = {}) {
  const next = new URLSearchParams(location.search);
  ['section', 'sub', 'username', 'tab'].forEach(key => next.delete(key));
  if (view !== 'collectors') next.set('section', view);
  if (view === 'progress' && extra.sub === 'outgoing') next.set('sub', 'outgoing');
  if (view === 'collectors' && extra.username) next.set('username', extra.username);
  if (extra.offerId) next.set('offerId', extra.offerId);
  const query = next.toString();
  history.replaceState({ tradeHubView: view }, '', query ? `${location.pathname}?${query}` : location.pathname);
}

function updateProgressBadge(count) {
  if (!progressBadge) return;
  const pending = Number(count) || 0;
  progressBadge.textContent = pending > 99 ? '99+' : String(pending);
  progressBadge.hidden = pending <= 0;
}

function setProposeSheetOpen(open, { username, updateUrl = true } = {}) {
  proposeOpen = Boolean(open);
  panels.collectors?.classList.toggle('is-proposing', proposeOpen);
  if (proposeOpen) {
    proposeSheet?.removeAttribute('hidden');
  } else {
    proposeSheet?.setAttribute('hidden', '');
  }
  if (updateUrl) {
    syncHubUrl('collectors', { username: proposeOpen ? (username || undefined) : undefined });
  }
  resetHubScroll();
}

function openProposeTrade(username = '') {
  setHubView('collectors', { updateUrl: true, username });
}

function closeProposeTrade() {
  setProposeSheetOpen(false, { updateUrl: true });
}

function ensureRankings() {
  if (rankingsReady || !panels.collectors) return;
  initUserRankings(panels.collectors);
  rankingsReady = true;
}

function ensureMyTrade() {
  if (myTradeReady || !panels['my-trade']) return;
  myTradeController = initMyTradeCards(panels['my-trade']);
  myTradeReady = true;
}

function ensureOpenTrades() {
  if (openTradesReady || !panels['open-trades']) return;
  openTradesController = initOpenTrades(panels['open-trades']);
  openTradesReady = true;
}

function ensurePropose(initialUsername) {
  if (proposeReady || !proposeSheet) return;
  const params = new URLSearchParams(location.search);
  proposeController = initProposeTrade(proposeSheet, {
    username: initialUsername || params.get('username') || '',
    syncUrl({ username }) {
      syncHubUrl('collectors', { username: username || undefined });
    },
    onSent() {
      closeProposeTrade();
      ensureProgress();
      progressController?.refresh?.();
      setHubView('progress', { updateUrl: true, progressSub: 'outgoing' });
    }
  });
  proposeSheet.querySelector('[data-propose-close]')?.addEventListener('click', closeProposeTrade);
  proposeReady = true;
}

function ensureProgress(initialSub) {
  if (progressReady || !panels.progress) return;
  progressController = initTradesInProgress(panels.progress, {
    initialSub: initialSub || readInitialProgressSub(),
    syncUrl({ sub }) {
      syncHubUrl('progress', { sub });
    },
    onPendingCount: updateProgressBadge
  });
  progressReady = true;
}

function setHubView(view, { updateUrl = true, username, progressSub, scroll = false, openPropose = false } = {}) {
  const nextView = normalizeView(view);

  if (nextView !== 'collectors' && proposeOpen) {
    setProposeSheetOpen(false, { updateUrl: false });
  }

  syncTabSelection(hubTabs, hubPanelList, nextView, {
    nameFromTab: (button) => button.dataset.hubView,
    nameFromPanel: (panel) => panel.dataset.hubPanel
  });

  if (nextView === 'collectors') ensureRankings();
  if (nextView === 'my-trade') ensureMyTrade();
  if (nextView === 'open-trades') ensureOpenTrades();
  if (nextView === 'progress') {
    ensureProgress(progressSub);
    if (progressSub && progressController?.setProgressSub) {
      progressController.setProgressSub(progressSub);
    } else {
      progressController?.refresh?.();
    }
  }

  if (openPropose || (nextView === 'collectors' && username)) {
    ensurePropose(username);
    setProposeSheetOpen(true, { username, updateUrl: false });
    if (username && proposeController?.loadRecipient) {
      proposeController.loadRecipient(username);
    }
  }

  if (updateUrl) {
    syncHubUrl(nextView, {
      username: nextView === 'collectors' && proposeOpen ? (username || new URLSearchParams(location.search).get('username') || undefined) : undefined,
      sub: nextView === 'progress' ? (progressSub || readInitialProgressSub()) : undefined
    });
  }

  if (scroll) resetHubScroll();
}

hubTabs.forEach((button) => {
  button.addEventListener('click', () => setHubView(button.dataset.hubView || 'collectors'));
});

if (hubTablist) {
  hubTablist.setAttribute('role', 'tablist');
  bindTablistKeyboard(hubTablist, hubTabs, {
    onActivate: (button) => setHubView(button.dataset.hubView || 'collectors')
  });
}

hubMain?.addEventListener('click', (event) => {
  const proposeButton = event.target.closest('[data-propose-trade]');
  if (!proposeButton?.dataset.username) return;
  event.preventDefault();
  openProposeTrade(proposeButton.dataset.username);
});

const initialView = readInitialView();
const initialParams = new URLSearchParams(location.search);
const initialPropose = readInitialPropose();

setHubView(initialView, {
  updateUrl: false,
  username: initialPropose.username || initialParams.get('username') || undefined,
  progressSub: initialView === 'progress' ? readInitialProgressSub() : undefined,
  openPropose: initialPropose.open
});

if (initialView !== 'progress') {
  ensureProgress();
  progressController?.refresh?.().then?.(() => {
    updateProgressBadge(progressController?.getPendingIncomingCount?.() || 0);
  });
}

window.addEventListener('starlight-trades-changed', () => {
  progressController?.refresh?.();
  myTradeController?.refresh?.();
  openTradesController?.refresh?.();
});

window.__starlightEmbedAnnounceReady?.();
requestAnimationFrame(() => {
  window.__starlightEmbedReportHeight?.();
  window.__starlightEmbedAnnounceReady?.();
});

export { setHubView, openProposeTrade, closeProposeTrade };
