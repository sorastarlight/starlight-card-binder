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
 * Pointer moves are rAF-throttled to limit layout thrash during drag.
 */
function attachCardDragTilt(card, options = {}) {
  if (!card || card.dataset.dragTiltBound === '1') return card;
  card.dataset.dragTiltBound = '1';
  card.classList.add('st-card-drag-tilt');

  const max = Number(options.max ?? 16);
  let dragging = false;
  let activePointer = null;
  let rafId = 0;
  let pendingX = 0;
  let pendingY = 0;
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

  const scheduleTilt = (clientX, clientY) => {
    pendingX = clientX;
    pendingY = clientY;
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      if (!dragging) return;
      applyTilt(pendingX, pendingY);
    });
  };

  const cancelScheduledTilt = () => {
    if (!rafId) return;
    window.cancelAnimationFrame(rafId);
    rafId = 0;
  };

  const endDrag = (event) => {
    if (!dragging) return;
    if (activePointer != null && event?.pointerId != null && event.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;
    cancelScheduledTilt();
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
    scheduleTilt(event.clientX, event.clientY);
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

function getEmbedVisibleFrame(view) {
  try {
    if (!view || view.parent === view) return null;
    const frameEl = view.frameElement;
    if (!frameEl) return null;
    const parentWin = view.parent;
    const parentDoc = parentWin.document;
    const main = parentDoc.querySelector('.main');
    const frameRect = frameEl.getBoundingClientRect();
    const viewportHeight = parentWin.innerHeight || parentDoc.documentElement.clientHeight || 0;
    const intersectTop = Math.max(frameRect.top, 0);
    const intersectBottom = Math.min(frameRect.bottom, viewportHeight);
    const visibleHeight = Math.max(240, intersectBottom - intersectTop);
    const topWithinIframe = Math.max(0, intersectTop - frameRect.top);
    return {
      top: topWithinIframe,
      height: visibleHeight,
      parentMain: main instanceof parentWin.HTMLElement ? main : null,
      parentWin
    };
  } catch {
    return null;
  }
}

const EMBED_OVERLAY_STYLE_PROPS = [
  'position',
  'inset',
  'top',
  'left',
  'right',
  'bottom',
  'width',
  'height',
  'max-height',
  'max-width'
];

function clearOverlayEmbedAnchor(overlay) {
  if (!overlay) return;
  overlay.classList.remove('is-embed-anchored');
  overlay.style.removeProperty('--st-embed-overlay-top');
  overlay.style.removeProperty('--st-embed-overlay-height');
  EMBED_OVERLAY_STYLE_PROPS.forEach(property => overlay.style.removeProperty(property));
}

function syncOverlayEmbedAnchor(overlay, view = overlay?.ownerDocument?.defaultView) {
  const frame = getEmbedVisibleFrame(view);
  if (!frame) {
    clearOverlayEmbedAnchor(overlay);
    return null;
  }

  // Inline !important beats the base overlay rule (fixed + 100dvh), which otherwise
  // centers dialogs in the middle of tall shell iframes — off-screen for the user.
  const top = `${Math.round(frame.top)}px`;
  const height = `${Math.round(frame.height)}px`;
  overlay.classList.add('is-embed-anchored');
  overlay.style.setProperty('--st-embed-overlay-top', top);
  overlay.style.setProperty('--st-embed-overlay-height', height);
  overlay.style.setProperty('position', 'absolute', 'important');
  overlay.style.setProperty('inset', 'auto', 'important');
  overlay.style.setProperty('top', top, 'important');
  overlay.style.setProperty('left', '0', 'important');
  overlay.style.setProperty('right', '0', 'important');
  overlay.style.setProperty('bottom', 'auto', 'important');
  overlay.style.setProperty('width', '100%', 'important');
  overlay.style.setProperty('max-width', '100%', 'important');
  overlay.style.setProperty('height', height, 'important');
  overlay.style.setProperty('max-height', height, 'important');
  overlay.scrollTop = 0;
  return frame;
}

function syncOpenOverlayAnchors(ownerDocument) {
  modalStack.forEach(controller => {
    if (controller.isOpen && controller.element.ownerDocument === ownerDocument) {
      syncOverlayEmbedAnchor(controller.element, ownerDocument.defaultView);
    }
  });
}

function lockScroll(ownerDocument) {
  if (!scrollSnapshots.has(ownerDocument)) {
    const view = ownerDocument.defaultView;
    const embed = getEmbedVisibleFrame(view);
    scrollSnapshots.set(ownerDocument, {
      body: ownerDocument.body.style.overflow,
      html: ownerDocument.documentElement.style.overflow,
      parentWin: embed?.parentWin || null,
      parentMain: embed?.parentMain || null,
      onParentScroll: null,
      scrollY: view?.scrollY || 0
    });
    // Only lock the embedded document itself. Never touch the parent shell —
    // leftover parent overflow locks make the iframe look "dead" after reveal.
    ownerDocument.body.style.overflow = 'hidden';
    ownerDocument.documentElement.style.overflow = 'hidden';

    const snapshot = scrollSnapshots.get(ownerDocument);
    const refresh = () => syncOpenOverlayAnchors(ownerDocument);
    snapshot.onParentScroll = refresh;
    embed?.parentMain?.addEventListener('scroll', refresh, { passive: true });
    embed?.parentWin?.addEventListener('scroll', refresh, { passive: true });
    embed?.parentWin?.addEventListener('resize', refresh);
    view?.addEventListener('resize', refresh);
  }
  syncOpenOverlayAnchors(ownerDocument);
}

function unlockScroll(ownerDocument) {
  if (modalStack.some(controller => controller.isOpen && controller.element.ownerDocument === ownerDocument)) {
    syncOpenOverlayAnchors(ownerDocument);
    return;
  }
  const snapshot = scrollSnapshots.get(ownerDocument);
  if (!snapshot) return;
  ownerDocument.body.style.overflow = snapshot.body;
  ownerDocument.documentElement.style.overflow = snapshot.html;
  if (snapshot.onParentScroll) {
    snapshot.parentMain?.removeEventListener('scroll', snapshot.onParentScroll);
    snapshot.parentWin?.removeEventListener('scroll', snapshot.onParentScroll);
    snapshot.parentWin?.removeEventListener('resize', snapshot.onParentScroll);
    ownerDocument.defaultView?.removeEventListener('resize', snapshot.onParentScroll);
  }
  modalStack.forEach(controller => {
    if (controller.element.ownerDocument === ownerDocument) clearOverlayEmbedAnchor(controller.element);
  });
  // Also clear anchors on any closed-but-tracked overlays in this document.
  try {
    ownerDocument.querySelectorAll('.is-embed-anchored').forEach(clearOverlayEmbedAnchor);
  } catch {}
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
      syncOverlayEmbedAnchor(element, ownerDocument.defaultView);
      options.onOpen?.(controller);
      element.dispatchEvent(new ownerDocument.defaultView.CustomEvent('starlight:modal-open', { detail: { controller } }));
      // Keep the overlay's own scroll at top. Avoid auto-scrolling the host — in tall
      // shell iframes it scrolls the parent shell and leaves clicks missing the UI.
      element.scrollTop = 0;
      ownerDocument.defaultView.requestAnimationFrame(() => {
        element.classList.add('is-open');
        syncOverlayEmbedAnchor(element, ownerDocument.defaultView);
        element.scrollTop = 0;
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
      clearOverlayEmbedAnchor(element);
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

function protectImageAssets(doc = document) {
  if (!doc || doc.documentElement?.dataset?.stImageProtect === '1') return;
  if (doc.documentElement) doc.documentElement.dataset.stImageProtect = '1';

  const isProtectedImage = (target) => {
    if (!(target instanceof Element)) return false;
    if (target.closest('[data-allow-image-save]')) return false;
    return Boolean(target.closest('img, picture, svg, canvas, video'));
  };

  doc.addEventListener('contextmenu', (event) => {
    if (isProtectedImage(event.target)) event.preventDefault();
  }, true);

  doc.addEventListener('dragstart', (event) => {
    if (isProtectedImage(event.target)) event.preventDefault();
  }, true);
}

window.StarlightUI = {
  toast,
  confirm: confirmDialog,
  alert: alertDialog,
  createModal,
  adoptModal,
  /** Pin an overlay to the visible shell-iframe slice (tall embeds). */
  anchorOverlayToVisibleViewport: syncOverlayEmbedAnchor,
  /** Clear embed viewport pin styles after close/cleanup. */
  clearOverlayViewportAnchor: clearOverlayEmbedAnchor,
  getEmbedVisibleFrame,
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
  cleanupLegacyStorage,
  protectImageAssets
};

window.addEventListener('error', event => {
  if (event.message) console.error('[Starlight UI]', event.error || event.message);
});
window.addEventListener('unhandledrejection', event => console.error('[Starlight UI] Unhandled promise rejection:', event.reason));
document.addEventListener('DOMContentLoaded', () => {
  cleanupLegacyStorage();
  watchRoutineStatuses();
  protectImageAssets();
});
if (document.readyState !== 'loading') {
  protectImageAssets();
}