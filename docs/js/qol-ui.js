
(() => {
  const shouldEnhance = input => {
    if (!(input instanceof HTMLInputElement) || input.type !== 'checkbox') return false;
    if (input.classList.contains('qol-no-enhance')) return false;
    if (input.closest('.switch,.switch-row,.status-toggle,.toggle-card,.privacy-toggle')) return false;
    if (input.hidden) return false;
    const label = input.closest('label');
    return !!label && !label.classList.contains('qol-toggle-label');
  };

  const enhance = input => {
    if (!shouldEnhance(input)) return;
    const label = input.closest('label');
    label.classList.add('qol-toggle-label');

    const existingNodes = [...label.childNodes].filter(node => node !== input);
    const copy = document.createElement('span');
    copy.className = 'qol-toggle-copy';
    existingNodes.forEach(node => copy.append(node));

    const visual = document.createElement('span');
    visual.className = 'qol-switch-ui';
    visual.setAttribute('aria-hidden','true');

    label.append(input, copy, visual);
  };

  const scan = root => {
    if (root instanceof HTMLInputElement) enhance(root);
    root.querySelectorAll?.('input[type="checkbox"]').forEach(enhance);
  };

  const centerOpenDialogs = () => {
    document.querySelectorAll('[role="dialog"]:not(.hidden),.editor:not(.hidden),.rule-modal:not(.hidden),.confirm-overlay:not(.hidden),.shop-modal:not(.hidden),.purchase-modal:not(.hidden)')
      .forEach(dialog => {
        const first = dialog.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
        if (first && !dialog.dataset.qolFocused) {
          dialog.dataset.qolFocused = '1';
          requestAnimationFrame(() => first.focus({preventScroll:true}));
        }
      });
  };

  const init = () => {
    scan(document);
    centerOpenDialogs();
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) scan(node);
      }));
      centerOpenDialogs();
    }).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();
