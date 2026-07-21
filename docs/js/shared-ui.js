const LEGACY_KEYS = [
  'starlightMode',
  'starlight-mode',
  'starlightHolographic',
  'holographicEnabled',
  'starlight-reveal-cache'
];

const modalControllers = new WeakMap();
const modalStack = [];
const scrollSnapshots = new WeakMap();

function cleanupLegacyStorage() {
  for (const key of LEGACY_KEYS) localStorage.removeItem(key);
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function ensureToastRegion() {
  let region = document.querySelector('.st-toast-region');
  if (!region) {
    region = document.createElement('div');
    region.className = 'st-toast-region';
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    document.body.append(region);
  }
  return region;
}

function toast(message, type = 'info', timeout = 3200) {
  if (!message) return null;
  const element = document.createElement('div');
  element.className = `st-toast ${type}`;
  element.textContent = message;
  ensureToastRegion().append(element);
  window.setTimeout(() => element.remove(), timeout);
  return element;
}

function isHolographicCard(card = {}) {
  const finishId = String(card.finishId ?? card.finish_id ?? card.finish?.id ?? '')
    .trim()
    .toLowerCase();
  if (finishId === 'holographic' || finishId === 'reverse-holo') return true;

  const finishName = String(card.finishName ?? card.finish_name ?? card.finish?.name ?? '')
    .trim()
    .toLowerCase();
  return /\bholographic\b|\breverse[\s-]?holo\b|\bholofoil\b/.test(finishName);
}

function cardFinishClass(card, visible = true) {
  if (!visible) return '';
  if (isHolographicCard(card)) return 'card-finish-holographic';
  return '';
}

function finishEffectLabel(card) {
  if (isHolographicCard(card)) return 'Holographic';
  return '';
}

function finishEffectBadgeClass(card) {
  if (isHolographicCard(card)) return 'finish-holographic';
  return '';
}

function finishEffectMarkup(card, visible = true) {
  if (!visible) return '';
  if (isHolographicCard(card)) return '<span class="st-holo-spark" aria-hidden="true"></span>';
  return '';
}

function holoSparkMarkup(card, visible = true) {
  return finishEffectMarkup(card, visible);
}

function ensureFinishEffectLayer(element, finishClass = '') {
  if (!element) return null;
  const holoSpark = element.querySelector(':scope > .st-holo-spark');
  const glitter = element.querySelector(':scope > .st-sparkle-glitter');
  const goldSpark = element.querySelector(':scope > .st-gold-spark');
  element.classList.remove('is-holo-lit');
  glitter?.remove();
  goldSpark?.remove();

  if (finishClass === 'card-finish-holographic') {
    if (!holoSpark) {
      const spark = document.createElement('span');
      spark.className = 'st-holo-spark';
      spark.setAttribute('aria-hidden', 'true');
      element.append(spark);
      return spark;
    }
    return holoSpark;
  }

  holoSpark?.remove();
  return null;
}

function ensureHoloSparkLayer(element, enabled = true) {
  return ensureFinishEffectLayer(element, enabled ? 'card-finish-holographic' : '');
}

/**
 * Left-click / touch-drag 3D tilt. Release returns the card to its resting pose.
 * Foil rainbow is CSS-only and independent of this tilt.
 */
function attachCardDragTilt(card, options = {}) {
  if (!card || card.dataset.dragTiltBound === '1') return card;
  card.dataset.dragTiltBound = '1';
  card.classList.add('st-card-drag-tilt');

  const max = Number(options.max ?? 16);
  let dragging = false;
  let activePointer = null;
  const clamp = (value) => Math.max(-max, Math.min(max, value));

  const applyTilt = (clientX, clientY) => {
    const rect = card.getBoundingClientRect();
    const x = (clientX - rect.left) / Math.max(1, rect.width);
    const y = (clientY - rect.top) / Math.max(1, rect.height);
    const tiltY = clamp((x - 0.5) * max * 2);
    const tiltX = clamp((0.5 - y) * max * 2);
    card.style.setProperty('--tiltX', `${tiltX.toFixed(2)}deg`);
    card.style.setProperty('--tiltY', `${tiltY.toFixed(2)}deg`);
    card.classList.add('is-dragging', 'tilting');
  };

  const endDrag = (event) => {
    if (!dragging) return;
    if (activePointer != null && event?.pointerId != null && event.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;
    try { if (event?.pointerId != null) card.releasePointerCapture?.(event.pointerId); } catch {}
    card.classList.remove('is-dragging', 'tilting');
    card.style.setProperty('--tiltX', '0deg');
    card.style.setProperty('--tiltY', '0deg');
  };

  card.addEventListener('pointerdown', event => {
    if (event.button != null && event.button !== 0) return;
    if (options.shouldIgnore?.(event)) return;
    if (card.classList.contains('flip-turning')) return;
    dragging = true;
    activePointer = event.pointerId;
    card.setPointerCapture?.(event.pointerId);
    applyTilt(event.clientX, event.clientY);
    event.preventDefault();
  });

  card.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== activePointer) return;
    applyTilt(event.clientX, event.clientY);
  });

  card.addEventListener('pointerup', endDrag);
  card.addEventListener('pointercancel', endDrag);
  return card;
}

function attachHoloPointer(surface, foil = surface) {
  return attachCardDragTilt(surface, { foil, max: 16 });
}

function setHoloFromTilt() { /* foil is CSS-only */ }
function clearHoloFromTilt() { /* foil is CSS-only */ }
function setHoloPointer() { /* foil is CSS-only */ }
function clearHoloPointer() { /* foil is CSS-only */ }

function focusableElements(root) {
  return [...root.querySelectorAll([
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    '[contenteditable="true"]'
  ].join(','))].filter(element => !element.hidden && element.getAttribute('aria-hidden') !== 'true');
}

function lockScroll(ownerDocument) {
  if (!scrollSnapshots.has(ownerDocument)) {
    scrollSnapshots.set(ownerDocument, {
      body: ownerDocument.body.style.overflow,
      html: ownerDocument.documentElement.style.overflow
    });
    ownerDocument.body.style.overflow = 'hidden';
    ownerDocument.documentElement.style.overflow = 'hidden';
  }
}

function unlockScroll(ownerDocument) {
  if (modalStack.some(controller => controller.isOpen && controller.element.ownerDocument === ownerDocument)) return;
  const snapshot = scrollSnapshots.get(ownerDocument);
  if (!snapshot) return;
  ownerDocument.body.style.overflow = snapshot.body;
  ownerDocument.documentElement.style.overflow = snapshot.html;
  scrollSnapshots.delete(ownerDocument);
}

function modalKeydown(event, modal) {
  if (!modal?.isOpen || topModal() !== modal) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    modal.close(undefined, 'escape');
    return;
  }
  if (event.key !== 'Tab') return;
  const items = focusableElements(modal.dialog);
  if (!items.length) {
    event.preventDefault();
    modal.dialog.focus?.();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && modal.element.ownerDocument.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && modal.element.ownerDocument.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function topModal() {
  return modalStack[modalStack.length - 1] || null;
}

function adoptModal(element, options = {}) {
  if (!element) throw new Error('A modal element is required.');
  if (modalControllers.has(element)) return modalControllers.get(element);

  const resolveDialog = () => (
    (typeof options.dialog === 'function' ? options.dialog(element) : options.dialog)
    || element.querySelector('[role="dialog"]')
    || element.firstElementChild
    || null
  );
  const configureDialog = dialog => {
    if (!dialog) return;
    if (!dialog.hasAttribute('role')) dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    if (options.labelledBy) dialog.setAttribute('aria-labelledby', options.labelledBy);
    if (options.describedBy) dialog.setAttribute('aria-describedby', options.describedBy);
    if (options.label && !dialog.hasAttribute('aria-label')) dialog.setAttribute('aria-label', options.label);
  };
  const state = {
    open: false,
    priorFocus: null,
    returnValue: undefined
  };

  configureDialog(resolveDialog());

  const controller = {
    element,
    get dialog() { return resolveDialog() || element; },
    get isOpen() { return state.open; },
    get returnValue() { return state.returnValue; },
    open({ initialFocus = options.initialFocus } = {}) {
      if (state.open) return controller;
      state.open = true;
      state.returnValue = undefined;
      const ownerDocument = element.ownerDocument;
      const dialog = controller.dialog;
      configureDialog(dialog);
      state.priorFocus = ownerDocument.activeElement instanceof ownerDocument.defaultView.HTMLElement ? ownerDocument.activeElement : null;
      element.hidden = false;
      element.classList.remove('hidden');
      element.setAttribute('aria-hidden', 'false');
      element.style.zIndex = String((options.zIndex || 31000) + modalStack.length * 10);
      modalStack.push(controller);
      lockScroll(ownerDocument);
      options.onOpen?.(controller);
      element.dispatchEvent(new ownerDocument.defaultView.CustomEvent('starlight:modal-open', { detail: { controller } }));
      ownerDocument.defaultView.requestAnimationFrame(() => {
        element.classList.add('is-open');
        const target = typeof initialFocus === 'string' ? dialog.querySelector(initialFocus) : initialFocus;
        (target || focusableElements(dialog)[0] || dialog).focus?.({ preventScroll: true });
      });
      return controller;
    },
    close(value, reason = 'programmatic') {
      if (!state.open || options.beforeClose?.({ value, reason, controller }) === false) return false;
      state.open = false;
      state.returnValue = value;
      element.classList.remove('is-open');
      element.classList.add('hidden');
      element.hidden = true;
      element.setAttribute('aria-hidden', 'true');
      const index = modalStack.indexOf(controller);
      if (index >= 0) modalStack.splice(index, 1);
      const ownerDocument = element.ownerDocument;
      unlockScroll(ownerDocument);
      options.onClose?.({ value, reason, controller });
      element.dispatchEvent(new ownerDocument.defaultView.CustomEvent('starlight:modal-close', { detail: { value, reason, controller } }));
      if (options.restoreFocus !== false && state.priorFocus?.isConnected) state.priorFocus.focus?.({ preventScroll: true });
      return true;
    },
    destroy() {
      if (state.open) controller.close(undefined, 'destroy');
      element.removeEventListener('click', onClick);
      element.removeEventListener('keydown', onKeydown, true);
      modalControllers.delete(element);
      if (options.removeOnDestroy) element.remove();
    }
  };

  function onClick(event) {
    if (event.target === element && options.closeOnBackdrop !== false) controller.close(undefined, 'backdrop');
    const closeButton = event.target.closest?.('[data-st-modal-close]');
    if (closeButton && element.contains(closeButton)) controller.close(closeButton.dataset.stModalValue, 'button');
  }

  function onKeydown(event) {
    modalKeydown(event, controller);
  }

  element.addEventListener('click', onClick);
  element.addEventListener('keydown', onKeydown, true);
  modalControllers.set(element, controller);
  return controller;
}

function createModal({
  title = '',
  message = '',
  content = '',
  className = '',
  actions = [],
  closeLabel = 'Close',
  ...options
} = {}) {
  const id = `st-modal-${crypto.randomUUID?.() || Date.now()}`;
  const overlay = document.createElement('div');
  overlay.className = `st-dialog-overlay hidden ${className}`.trim();
  overlay.hidden = true;
  overlay.setAttribute('aria-hidden', 'true');
  overlay.innerHTML = `
    <section class="st-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}-title"${message ? ` aria-describedby="${id}-description"` : ''} tabindex="-1">
      <button class="st-dialog-close" type="button" data-st-modal-close aria-label="${escapeHtml(closeLabel)}">×</button>
      <h2 id="${id}-title">${escapeHtml(title)}</h2>
      ${message ? `<p id="${id}-description">${escapeHtml(message)}</p>` : ''}
      ${content ? `<div class="st-dialog-content">${content}</div>` : ''}
      ${actions.length ? `<div class="st-dialog-actions">${actions.map(action => `
        <button type="button" class="${escapeHtml(action.className || 'st-dialog-cancel')}" data-st-modal-value="${escapeHtml(action.value ?? '')}">${escapeHtml(action.label || 'OK')}</button>
      `).join('')}</div>` : ''}
    </section>`;
  document.body.append(overlay);
  const controller = adoptModal(overlay, { ...options, removeOnDestroy: true });
  overlay.querySelectorAll('[data-st-modal-value]').forEach(button => {
    button.addEventListener('click', () => controller.close(button.dataset.stModalValue, 'action'));
  });
  return controller;
}

function confirmDialog({
  title = 'Are you sure?',
  message = '',
  warning = '',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false
} = {}) {
  return new Promise(resolve => {
    const modal = createModal({
      title,
      message,
      content: warning ? `<p class="st-dialog-warning">${escapeHtml(warning)}</p>` : '',
      closeLabel: cancelText,
      actions: [
        { label: cancelText, value: 'cancel', className: 'st-dialog-cancel' },
        { label: confirmText, value: 'confirm', className: `st-dialog-confirm${danger ? ' danger' : ''}` }
      ],
      initialFocus: '.st-dialog-confirm',
      onClose: ({ value }) => {
        resolve(value === 'confirm');
        modal.destroy();
      }
    });
    modal.open();
  });
}

function alertDialog({ title = 'Starlight Cards', message = '', buttonText = 'OK' } = {}) {
  return new Promise(resolve => {
    const modal = createModal({
      title,
      message,
      actions: [{ label: buttonText, value: 'ok', className: 'st-dialog-confirm' }],
      onClose: () => {
        resolve();
        modal.destroy();
      }
    });
    modal.open();
  });
}

function stateMarkup(kind, title, message, buttonText = 'Retry') {
  return `<div class="st-view-state ${escapeHtml(kind)}">${kind === 'loading' ? '<div class="st-spinner" aria-hidden="true"></div>' : ''}<div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>${kind === 'error' ? `<button type="button" data-st-retry>${escapeHtml(buttonText)}</button>` : ''}</div></div>`;
}

function watchRoutineStatuses() {
  const routine = /\b(loaded|completed|confirmed|refreshed|saved successfully|successfully loaded)\.?$/i;
  const process = element => {
    const text = element.textContent?.trim();
    if (!text || !routine.test(text) || element.classList.contains('error')) return;
    toast(text, 'success');
    element.textContent = '';
    element.style.display = 'none';
  };
  const observer = new MutationObserver(records => {
    for (const record of records) {
      const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (element?.matches?.('.status,.page-status,[role="status"]')) process(element);
    }
  });
  document.querySelectorAll('.status,.page-status,[role="status"]').forEach(process);
  const observerRoot = document.body || document.documentElement;
  if (observerRoot?.nodeType) {
    try { observer.observe(observerRoot, { subtree: true, childList: true, characterData: true }); }
    catch (error) { console.warn('[Starlight] Status observer unavailable.', error); }
  }
}

window.StarlightUI = {
  toast,
  confirm: confirmDialog,
  alert: alertDialog,
  createModal,
  adoptModal,
  isHolographicCard,
  cardFinishClass,
  finishEffectLabel,
  finishEffectBadgeClass,
  finishEffectMarkup,
  holoSparkMarkup,
  ensureFinishEffectLayer,
  ensureHoloSparkLayer,
  attachHoloPointer,
  attachCardDragTilt,
  setHoloFromTilt,
  clearHoloFromTilt,
  setHoloPointer,
  clearHoloPointer,
  stateMarkup,
  escapeHtml,
  cleanupLegacyStorage
};

window.addEventListener('error', event => {
  if (event.message) console.error('[Starlight UI]', event.error || event.message);
});
window.addEventListener('unhandledrejection', event => console.error('[Starlight UI] Unhandled promise rejection:', event.reason));
document.addEventListener('DOMContentLoaded', () => {
  cleanupLegacyStorage();
  watchRoutineStatuses();
});
