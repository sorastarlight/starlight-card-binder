import { bindTablistKeyboard } from '../tablist-a11y.js';
import { initTradeLists } from './trade-lists-page.js';
import { initUserRankings } from './user-rankings-page.js';
import { getCachedWebsiteContent } from '../website-content-hydrate.js';

const LIST_VIEWS = new Set(['wishlist', 'trade', 'all']);
const hubTabs = [...document.querySelectorAll('[data-hub-view]')];
const hubTablist = document.querySelector('.trade-hub-tabs');
const collectorsPanel = document.querySelector('[data-hub-panel="collectors"]');
const listsPanel = document.querySelector('[data-hub-panel="lists"]');
const panelLead = document.querySelector('[data-hub-panel-lead]');

let rankingsReady = false;
let listsController = null;

function tradesCopy() {
  return getCachedWebsiteContent()?.trades || {};
}

function copy(key, fallback) {
  const value = tradesCopy()[key];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function normalizeView(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'lists') return 'wishlist';
  if (value === 'collectors' || value === 'rankings') return 'collectors';
  if (LIST_VIEWS.has(value)) return value;
  return 'collectors';
}

function readInitialView() {
  return normalizeView(new URLSearchParams(location.search).get('section'));
}

function syncHubUrl(view) {
  const next = new URLSearchParams(location.search);
  if (view === 'collectors') next.delete('section');
  else next.set('section', view);
  const query = next.toString();
  history.replaceState({ tradeHubView: view }, '', query ? `${location.pathname}?${query}` : location.pathname);
}

function updatePanelLead(view) {
  if (!panelLead) return;
  const leads = {
    wishlist: copy('listsLeadWishlist', 'Mark cards you are searching for. Other collectors can see this list when you allow public trade lists on your profile.'),
    trade: copy('listsLeadTrade', 'Offer only duplicate copies for trade. Your permanent first copy of each card stays protected.'),
    all: copy('listsLeadAll', 'Browse every card to add items to your wishlist or for-trade list.')
  };
  const text = leads[view] || '';
  panelLead.textContent = text;
  panelLead.hidden = !text;
}

function ensureRankings() {
  if (rankingsReady || !collectorsPanel) return;
  initUserRankings(collectorsPanel);
  rankingsReady = true;
}

function ensureLists() {
  if (listsController || !listsPanel) return;
  listsController = initTradeLists(listsPanel);
}

function setHubView(view, { updateUrl = true } = {}) {
  const nextView = normalizeView(view);
  const onLists = LIST_VIEWS.has(nextView);

  hubTabs.forEach((button) => {
    const active = button.dataset.hubView === nextView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.setAttribute('tabindex', active ? '0' : '-1');
  });

  collectorsPanel?.toggleAttribute('hidden', onLists);
  listsPanel?.toggleAttribute('hidden', !onLists);

  if (onLists) {
    ensureLists();
    listsController?.setTab(nextView);
    updatePanelLead(nextView);
  } else {
    ensureRankings();
  }

  if (updateUrl) syncHubUrl(nextView);
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

window.addEventListener('starlight-website-content-hydrated', () => {
  const active = hubTabs.find((button) => button.classList.contains('active'));
  if (active && LIST_VIEWS.has(active.dataset.hubView || '')) {
    updatePanelLead(active.dataset.hubView);
  }
});

setHubView(readInitialView(), { updateUrl: false });
