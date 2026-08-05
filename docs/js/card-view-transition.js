/**
 * Card open/close transition helpers for full-view.
 * Flight animation is disabled until a transform-only version is ready — instant open avoids double-card glitches.
 */
(function initStarlightCardViewTransition(global) {
  let lastSourceSelector = null;

  function motionReduced() {
    return Boolean(
      global.StarlightBrowser?.reducedMotion
      || global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
  }

  function sourceSelector(el) {
    if (!el) return null;
    if (el.dataset.albumCard) return `[data-album-card="${CSS.escape(el.dataset.albumCard)}"]`;
    if (el.dataset.v61Card) return `[data-v61-card="${CSS.escape(el.dataset.v61Card)}"]`;
    return null;
  }

  function flyFromElement(sourceEl, { onReveal, onComplete } = {}) {
    lastSourceSelector = sourceSelector(sourceEl);
    onReveal?.();
    onComplete?.();
  }

  function flyBack({ onComplete } = {}) {
    onComplete?.();
  }

  global.StarlightCardViewTransition = {
    flyFromElement,
    flyBack,
    motionReduced,
    getLastSourceSelector: () => lastSourceSelector
  };
})(typeof window !== 'undefined' ? window : globalThis);
