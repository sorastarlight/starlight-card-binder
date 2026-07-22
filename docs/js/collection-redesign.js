import { bindTablistKeyboard, syncTabSelection } from './tablist-a11y.js';

const tabs = [...document.querySelectorAll('[data-collection-tab]')];
const panels = [...document.querySelectorAll('[data-collection-panel]')];
const tablist = document.querySelector('.collection-tabs');

function activateCollectionView(name, { focus = false } = {}) {
  syncTabSelection(tabs, panels, name, {
    nameFromTab: (tab) => tab.dataset.collectionTab,
    nameFromPanel: (panel) => panel.dataset.collectionPanel
  });
  if (focus) {
    tabs.find((tab) => tab.dataset.collectionTab === name)?.focus();
  }
  window.dispatchEvent(new CustomEvent('starlight-collection-tab-changed', {
    detail: { tab: name }
  }));
}

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    activateCollectionView(tab.dataset.collectionTab);
  });
});

if (tablist) {
  tablist.setAttribute('role', 'tablist');
  tablist.setAttribute('aria-label', 'Collection views');
  bindTablistKeyboard(tablist, tabs, {
    onActivate: (tab) => activateCollectionView(tab.dataset.collectionTab)
  });
}

activateCollectionView('all');
