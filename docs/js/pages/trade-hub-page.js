import { bindTablistKeyboard } from '../tablist-a11y.js';
import { initTradeLists } from './trade-lists-page.js';
import { initUserRankings } from './user-rankings-page.js';

const params = new URLSearchParams(location.search);
const hubTabs = [...document.querySelectorAll('[data-trade-hub]')];
const hubTablist = document.querySelector('.trade-hub-tabs');
const collectorsPanel = document.querySelector('[data-trade-hub-panel="collectors"]');
const listsPanel = document.querySelector('[data-trade-hub-panel="lists"]');

let activeSection = params.get('section') === 'lists' ? 'lists' : 'collectors';
let rankingsReady = false;
let listsReady = false;

function syncHubUrl(section) {
  const next = new URLSearchParams(location.search);
  if (section === 'collectors') next.delete('section');
  else next.set('section', section);
  const query = next.toString();
  history.replaceState({ tradeHubSection: section }, '', query ? `${location.pathname}?${query}` : location.pathname);
}

function setHubSection(section, { updateUrl = true } = {}) {
  activeSection = section === 'lists' ? 'lists' : 'collectors';
  hubTabs.forEach((button) => {
    const active = button.dataset.tradeHub === activeSection;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
    button.setAttribute('tabindex', active ? '0' : '-1');
  });
  collectorsPanel?.toggleAttribute('hidden', activeSection !== 'collectors');
  listsPanel?.toggleAttribute('hidden', activeSection !== 'lists');
  if (activeSection === 'collectors' && !rankingsReady && collectorsPanel) {
    initUserRankings(collectorsPanel);
    rankingsReady = true;
  }
  if (activeSection === 'lists' && !listsReady && listsPanel) {
    initTradeLists(listsPanel);
    listsReady = true;
  }
  if (updateUrl) syncHubUrl(activeSection);
}

hubTabs.forEach((button) => {
  button.addEventListener('click', () => setHubSection(button.dataset.tradeHub || 'collectors'));
});

if (hubTablist) {
  hubTablist.setAttribute('role', 'tablist');
  bindTablistKeyboard(hubTablist, hubTabs, {
    onActivate: (button) => setHubSection(button.dataset.tradeHub || 'collectors')
  });
}

setHubSection(activeSection, { updateUrl: false });
