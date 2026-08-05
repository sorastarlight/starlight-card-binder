/**
 * Cinematic card flight from grid/binder pocket into full-view modal (FLIP-style).
 */
(function initStarlightCardViewTransition(global) {
  const FLIGHT_MS = 440;
  let lastSourceSelector = null;
  let activeGhost = null;

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

  function pocketArtUrl(el, fallback = '') {
    const img = el?.querySelector?.('.album-binder-3d-card-art img, .card-gallery-art img, img');
    return img?.currentSrc || img?.src || fallback;
  }

  function targetRect(sourceWidth) {
    const width = Math.min(Math.max(sourceWidth * 1.35, 220), Math.min(380, global.innerWidth * 0.78));
    const height = width * (7 / 5);
    return {
      left: (global.innerWidth - width) / 2,
      top: (global.innerHeight - height) / 2,
      width,
      height
    };
  }

  function cleanupGhost() {
    activeGhost?.remove?.();
    activeGhost = null;
  }

  function flyFromElement(sourceEl, { imageUrl, alt = '', onReveal, onComplete } = {}) {
    cleanupGhost();
    lastSourceSelector = sourceSelector(sourceEl);
    const reveal = () => {
      onReveal?.();
      onComplete?.();
    };
    if (!sourceEl || motionReduced()) {
      reveal();
      return;
    }

    const from = sourceEl.getBoundingClientRect();
    if (!from.width || !from.height) {
      reveal();
      return;
    }

    const to = targetRect(from.width);
    const ghost = global.document.createElement('div');
    ghost.className = 'starlight-card-flight';
    ghost.setAttribute('aria-hidden', 'true');
    const img = global.document.createElement('img');
    img.src = imageUrl || pocketArtUrl(sourceEl);
    img.alt = alt;
    ghost.appendChild(img);
    global.document.body.appendChild(ghost);
    activeGhost = ghost;
    sourceEl.classList.add('is-opening-full-view');

    Object.assign(ghost.style, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`
    });

    const animation = ghost.animate([
      {
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        opacity: 1,
        transform: 'rotateY(0deg) scale(1)',
        filter: 'brightness(1)'
      },
      {
        left: `${to.left}px`,
        top: `${to.top}px`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        opacity: 1,
        transform: 'rotateY(8deg) scale(1.04)',
        filter: 'brightness(1.08) drop-shadow(0 18px 36px rgba(61, 83, 132, 0.28))'
      }
    ], {
      duration: FLIGHT_MS,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: 'forwards'
    });

    global.setTimeout(() => onReveal?.(), Math.round(FLIGHT_MS * 0.42));

    animation.onfinish = () => {
      cleanupGhost();
      sourceEl.classList.remove('is-opening-full-view');
      onComplete?.();
    };
    animation.oncancel = () => {
      cleanupGhost();
      sourceEl.classList.remove('is-opening-full-view');
    };
  }

  function flyBack({ onComplete } = {}) {
    const finish = () => onComplete?.();
    if (motionReduced() || !lastSourceSelector) {
      finish();
      return;
    }
    const sourceEl = global.document.querySelector(lastSourceSelector);
    const modalImg = global.document.querySelector(
      '#cardOverlay .analyzer-card-stage img, #cardOverlay .analyzer-card-shell img, #cardOverlay .full-card-wrap img'
    );
    if (!sourceEl || !modalImg) {
      finish();
      return;
    }

    const from = modalImg.getBoundingClientRect();
    const to = sourceEl.getBoundingClientRect();
    const ghost = global.document.createElement('div');
    ghost.className = 'starlight-card-flight is-returning';
    const img = global.document.createElement('img');
    img.src = modalImg.currentSrc || modalImg.src;
    img.alt = modalImg.alt || '';
    ghost.appendChild(img);
    global.document.body.appendChild(ghost);
    activeGhost = ghost;

    Object.assign(ghost.style, {
      left: `${from.left}px`,
      top: `${from.top}px`,
      width: `${from.width}px`,
      height: `${from.height}px`
    });

    const overlay = global.document.querySelector('#cardOverlay');
    overlay?.classList.add('is-flight-closing');

    const animation = ghost.animate([
      {
        left: `${from.left}px`,
        top: `${from.top}px`,
        width: `${from.width}px`,
        height: `${from.height}px`,
        opacity: 1,
        transform: 'rotateY(0deg) scale(1)'
      },
      {
        left: `${to.left}px`,
        top: `${to.top}px`,
        width: `${to.width}px`,
        height: `${to.height}px`,
        opacity: 0.92,
        transform: 'rotateY(-10deg) scale(0.96)'
      }
    ], {
      duration: Math.round(FLIGHT_MS * 0.88),
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      fill: 'forwards'
    });

    animation.onfinish = () => {
      cleanupGhost();
      overlay?.classList.remove('is-flight-closing');
      finish();
    };
    animation.oncancel = () => {
      cleanupGhost();
      overlay?.classList.remove('is-flight-closing');
      finish();
    };
  }

  global.StarlightCardViewTransition = {
    flyFromElement,
    flyBack,
    motionReduced,
    getLastSourceSelector: () => lastSourceSelector
  };
})(typeof window !== 'undefined' ? window : globalThis);
