import { bindTablistKeyboard, syncTabSelection } from '../tablist-a11y.js';
import { initMyTradeCards } from './my-trade-cards.js';
import { initUserRankings } from './user-rankings-page.js';
import { initProposeTrade, initTradesInProgress } from './trade-offers-hub.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';

const HUB_VIEWS = new Set(['collectors', 'my-trade', 'propose', 'progress']);
const hubTabs = [...document.querySelectorAll('.trade-hub-tabs [data-hub-view]')];
const hubTablist = document.querySelector('.trade-hub-tabs');
const panels = Object.fromEntries(
  [...document.querySelectorAll('[data-hub-panel]')].map(panel => [panel.dataset.hubPanel, panel])
);
const hubPanelList = ['collectors', 'my-trade', 'propose', 'progress']
  .map(name => panels[name])
  .filter(Boolean);
const hubMain = document.querySelector('.trade-hub-page');

const progressBadge = document.querySelector('[data-hub-progress-badge]');

function resetHubScroll() {
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  hubMain?.scrollIntoView({ block: 'start', behavior: 'auto' });
  window.__starlightEmbedReportHeight?.();
}
let rankingsReady = false;
let myTradeReady = false;
let proposeReady = false;
let progressReady = false;
let myTradeController = null;
let proposeController = null;
let progressController = null;

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
  if (value === 'compose' || value === 'offers') return 'propose';
  if (HUB_VIEWS.has(value)) return value;
  return 'collectors';
}

function readInitialView() {
  const params = new URLSearchParams(location.search);
  const section = params.get('section');
  const tab = params.get('tab');
  if (tab === 'incoming' || tab === 'outgoing') return 'progress';
  if (tab === 'compose') return 'propose';
  return normalizeView(section);
}

function readInitialProgressSub() {
  const params = new URLSearchParams(location.search);
  const sub = params.get('sub') || params.get('tab') || 'incoming';
  return sub === 'outgoing' ? 'outgoing' : 'incoming';
}

function syncHubUrl(view, extra = {}) {
  const next = new URLSearchParams(location.search);
  ['section', 'sub', 'username', 'tab'].forEach(key => next.delete(key));
  if (view !== 'collectors') next.set('section', view);
  if (view === 'progress' && extra.sub === 'outgoing') next.set('sub', 'outgoing');
  if (view === 'propose' && extra.username) next.set('username', extra.username);
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

function ensurePropose(initialUsername) {
  if (proposeReady || !panels.propose) return;
  const params = new URLSearchParams(location.search);
  proposeController = initProposeTrade(panels.propose, {
    username: initialUsername || params.get('username') || '',
    syncUrl({ username }) {
      syncHubUrl('propose', { username: username || undefined });
    },
    onSent() {
      ensureProgress();
      progressController?.refresh?.();
      setHubView('progress', { updateUrl: true, progressSub: 'outgoing' });
    }
  });
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

function setHubView(view, { updateUrl = true, username, progressSub, scroll = true } = {}) {
  const nextView = normalizeView(view);

  syncTabSelection(hubTabs, hubPanelList, nextView, {
    nameFromTab: (button) => button.dataset.hubView,
    nameFromPanel: (panel) => panel.dataset.hubPanel
  });

  if (nextView === 'collectors') ensureRankings();
  if (nextView === 'my-trade') ensureMyTrade();
  if (nextView === 'propose') {
    ensurePropose(username);
    if (username && proposeController?.loadRecipient) {
      proposeController.loadRecipient(username);
    }
  }
  if (nextView === 'progress') {
    ensureProgress(progressSub);
    if (progressSub && progressController?.setProgressSub) {
      progressController.setProgressSub(progressSub);
    } else {
      progressController?.refresh?.();
    }
  }

  if (updateUrl) {
    syncHubUrl(nextView, {
      username: nextView === 'propose' ? (username || new URLSearchParams(location.search).get('username') || undefined) : undefined,
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

const initialView = readInitialView();
const initialParams = new URLSearchParams(location.search);
setHubView(initialView, {
  updateUrl: false,
  username: initialParams.get('username') || undefined,
  progressSub: initialView === 'progress' ? readInitialProgressSub() : undefined
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
});

export { setHubView };
