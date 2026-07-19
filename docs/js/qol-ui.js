(() => {
  const enhance = input => {
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return;
    if (input.dataset.qolEnhanced === '1' || input.classList.contains('qol-no-enhance')) return;
    if (input.closest('.switch,.switch-row,.status-toggle,.toggle-card,.privacy-toggle')) return;
    if (input.hidden) return;
    const label = input.closest('label');
    if (!label || label.classList.contains('qol-toggle-label')) return;
    input.dataset.qolEnhanced = '1';
    label.classList.add('qol-toggle-label');
    const copy = document.createElement('span');
    copy.className = 'qol-toggle-copy';
    [...label.childNodes].filter(node => node !== input).forEach(node => copy.append(node));
    const visual = document.createElement('span');
    visual.className = 'qol-switch-ui';
    visual.setAttribute('aria-hidden', 'true');
    label.append(input, copy, visual);
  };
  const scan = root => {
    if (root instanceof HTMLInputElement) enhance(root);
    root.querySelectorAll?.('input[type="checkbox"]').forEach(enhance);
  };
  const init = () => {
    scan(document);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === 1) scan(node);
        }
      }
    });
    const observerRoot = document.body || document.documentElement;
    if (observerRoot?.nodeType) {
      try { observer.observe(observerRoot, { childList: true, subtree: true }); }
      catch (error) { console.warn('[Starlight] Checkbox observer unavailable.', error); }
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
