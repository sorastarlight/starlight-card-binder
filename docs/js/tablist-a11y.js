/**
 * Lightweight ARIA tablist helpers shared by collection and trade pages.
 */

export function bindTablistKeyboard(tablist, tabs, { onActivate } = {}) {
  if (!tablist || !tabs?.length) return;

  tablist.addEventListener('keydown', (event) => {
    const current = event.target?.closest?.('[role="tab"]');
    if (!current || !tabs.includes(current)) return;

    const index = tabs.indexOf(current);
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      next = (index + 1) % tabs.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      next = (index - 1 + tabs.length) % tabs.length;
    } else if (event.key === 'Home') {
      next = 0;
    } else if (event.key === 'End') {
      next = tabs.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const target = tabs[next];
    target?.focus();
    onActivate?.(target);
  });
}

export function syncTabSelection(tabs, panels, activeName, {
  nameFromTab = (tab) => tab.dataset.tab || tab.dataset.collectionTab,
  nameFromPanel = (panel) => panel.dataset.collectionPanel || panel.id?.replace(/View$/, '')
} = {}) {
  tabs.forEach((tab) => {
    const name = nameFromTab(tab);
    const active = name === activeName;
    const matchingPanel = panels.find((panel) => nameFromPanel(panel) === name);
    const tabId = tab.id || `tab-${name}`;
    const panelId = matchingPanel?.id || tab.getAttribute('aria-controls') || `panel-${name}`;
    tab.id = tabId;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', String(active));
    tab.setAttribute('tabindex', active ? '0' : '-1');
    tab.setAttribute('aria-controls', panelId);
    tab.classList.toggle('active', active);
  });

  panels.forEach((panel) => {
    const name = nameFromPanel(panel);
    const active = name === activeName;
    const controllingTab = tabs.find((tab) => nameFromTab(tab) === name);
    if (!panel.id) {
      panel.id = controllingTab?.getAttribute('aria-controls') || `panel-${name}`;
    }
    panel.setAttribute('role', 'tabpanel');
    if (controllingTab?.id) panel.setAttribute('aria-labelledby', controllingTab.id);
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
}
