const tabs = [...document.querySelectorAll('[data-collection-tab]')];
const panels = [...document.querySelectorAll('[data-collection-panel]')];

function activateCollectionView(name) {
  tabs.forEach(tab => {
    const active = tab.dataset.collectionTab === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
  });
  panels.forEach(panel => {
    const active = panel.dataset.collectionPanel === name;
    panel.classList.toggle('active', active);
    panel.hidden = !active;
  });
}

tabs.forEach(tab => {
  tab.setAttribute('role', 'tab');
  tab.addEventListener('click', () => {
    activateCollectionView(tab.dataset.collectionTab);
    window.dispatchEvent(new CustomEvent('starlight-collection-tab-changed', {
      detail: { tab: tab.dataset.collectionTab }
    }));
  });
});

document.querySelector('.collection-tabs')?.setAttribute('role', 'tablist');
activateCollectionView('all');
