/**
 * Starlight premium card perspective + shine (inspired by interactive gallery cards).
 * Opt-in via card.effectStyle; standard cards stay unchanged.
 */
(function initStarlightPerspectiveCard(global) {
  const EFFECT_STYLES = new Set(['none', 'special-art', 'holographic', 'legendary', 'rainbow']);
  const controllers = new WeakMap();

  function motionReduced() {
    return Boolean(
      global.StarlightBrowser?.reducedMotion
      || global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
  }

  function liteMode() {
    return Boolean(global.StarlightBrowser?.lite);
  }

  function escapeAttr(value = '') {
    return String(value).replace(/"/g, '&quot;');
  }

  /** @returns {string|null} Active effect style or null when unchanged / standard. */
  function resolveEffectStyle(card = {}) {
    const raw = String(card.effectStyle ?? card.effect_style ?? '').trim().toLowerCase();
    if (!raw) return null;
    if (raw === 'none') return null;
    return EFFECT_STYLES.has(raw) ? raw : null;
  }

  function resolveEffectIntensity(card = {}, fallback = 65) {
    const value = Number(card.effectIntensity ?? card.effect_intensity);
    if (!Number.isFinite(value)) return fallback;
    return Math.max(20, Math.min(100, Math.round(value)));
  }

  function hasPremiumPerspective(card = {}) {
    return Boolean(resolveEffectStyle(card));
  }

  function buildPerspectiveCardMarkup({
    imageUrl = '',
    alt = '',
    effectStyle = 'special-art',
    effectIntensity = 65,
    imgClass = ''
  } = {}) {
    if (!effectStyle || effectStyle === 'none') {
      return `<img class="${imgClass}" src="${escapeAttr(imageUrl)}" alt="${escapeAttr(alt)}" loading="lazy">`;
    }
    return `<div class="starlight-perspective-card starlight-effect-${escapeAttr(effectStyle)}" data-effect-style="${escapeAttr(effectStyle)}" data-effect-intensity="${effectIntensity}" data-perspective-card>
      <div class="starlight-card-transformer">
        <div class="starlight-card-front">
          <img class="${imgClass}" src="${escapeAttr(imageUrl)}" alt="${escapeAttr(alt)}" loading="lazy" draggable="false">
        </div>
        <div class="starlight-card-shine" aria-hidden="true"></div>
      </div>
    </div>`;
  }

  function cardArtMarkup(card = {}, { imageUrl, alt = '', imgClass = '', visible = true } = {}) {
    const style = resolveEffectStyle(card);
    const src = imageUrl || card.thumbnailUrl || card.imageUrl || '';
    const label = alt || card.name || 'Card artwork';
    if (!style || !visible || !src) {
      return `<img class="${imgClass}" src="${escapeAttr(src)}" alt="${escapeAttr(label)}" loading="lazy">`;
    }
    return buildPerspectiveCardMarkup({
      imageUrl: src,
      alt: label,
      effectStyle: style,
      effectIntensity: resolveEffectIntensity(card),
      imgClass
    });
  }

  class PerspectiveController {
    constructor(root, options = {}) {
      this.root = root;
      this.transformer = root.querySelector('.starlight-card-transformer');
      this.shine = root.querySelector('.starlight-card-shine');
      this.intensity = Number(root.dataset.effectIntensity || 65) / 100;
      this.maxTilt = (Number(options.maxTilt ?? 14)) * this.intensity;
      this.active = false;
      this.rafId = 0;
      this.pointerX = 0.5;
      this.pointerY = 0.5;
      this.currentX = 0.5;
      this.currentY = 0.5;
      this.reduced = motionReduced() || liteMode();
      this.shouldIgnore = options.shouldIgnore || (() => false);

      this.onPointerEnter = this.onPointerEnter.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerLeave = this.onPointerLeave.bind(this);
      this.tick = this.tick.bind(this);

      root.addEventListener('pointerenter', this.onPointerEnter);
      root.addEventListener('pointermove', this.onPointerMove);
      root.addEventListener('pointerleave', this.onPointerLeave);

      if (!this.reduced && global.IntersectionObserver) {
        this.observer = new IntersectionObserver(entries => {
          if (!entries.some(entry => entry.isIntersecting)) this.deactivate();
        }, { rootMargin: '48px', threshold: 0.04 });
        this.observer.observe(root);
      }

      if (this.reduced) {
        root.classList.add('is-reduced-motion');
        this.applyStaticHighlight();
      }
    }

    onPointerEnter(event) {
      if (this.reduced || this.shouldIgnore(event)) return;
      this.active = true;
      this.root.classList.add('is-active');
      if (!this.rafId) this.rafId = global.requestAnimationFrame(this.tick);
    }

    onPointerMove(event) {
      if (this.reduced || !this.active || this.shouldIgnore(event)) return;
      const rect = this.root.getBoundingClientRect();
      this.pointerX = (event.clientX - rect.left) / Math.max(1, rect.width);
      this.pointerY = (event.clientY - rect.top) / Math.max(1, rect.height);
    }

    onPointerLeave() {
      this.deactivate();
    }

    deactivate() {
      this.active = false;
      this.pointerX = 0.5;
      this.pointerY = 0.5;
      this.root.classList.remove('is-active');
      if (this.rafId) {
        global.cancelAnimationFrame(this.rafId);
        this.rafId = 0;
      }
      this.applyTransform(0.5, 0.5, true);
    }

    tick() {
      if (!this.active) {
        this.rafId = 0;
        return;
      }
      const ease = 0.16;
      this.currentX += (this.pointerX - this.currentX) * ease;
      this.currentY += (this.pointerY - this.currentY) * ease;
      this.applyTransform(this.currentX, this.currentY);
      this.rafId = global.requestAnimationFrame(this.tick);
    }

    applyTransform(x, y, reset = false) {
      if (!this.transformer) return;
      const tiltY = (x - 0.5) * this.maxTilt * 2;
      const tiltX = (0.5 - y) * this.maxTilt * 2;
      const scale = reset ? 1 : 1 + 0.018 * this.intensity;
      const lift = reset ? 0 : -5 * this.intensity;
      this.transformer.style.transform = reset
        ? ''
        : `perspective(920px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) translateY(${lift.toFixed(2)}px) scale(${scale.toFixed(3)})`;

      if (this.shine) {
        const angle = Math.atan2(y - 0.5, x - 0.5) * (180 / Math.PI) + 90;
        const dist = Math.hypot(x - 0.5, y - 0.5);
        const opacity = reset ? 0 : Math.min(0.62, (0.12 + dist * 0.75) * this.intensity);
        this.root.style.setProperty('--shine-angle', `${angle.toFixed(1)}deg`);
        this.root.style.setProperty('--shine-opacity', opacity.toFixed(3));
        this.shine.style.opacity = reset ? '0' : String(Math.min(1, opacity + 0.08));
      }
    }

    applyStaticHighlight() {
      this.root.style.setProperty('--shine-angle', '132deg');
      this.root.style.setProperty('--shine-opacity', '0.16');
      if (this.shine) this.shine.style.opacity = '0.2';
    }

    destroy() {
      this.deactivate();
      this.observer?.disconnect();
      this.root.removeEventListener('pointerenter', this.onPointerEnter);
      this.root.removeEventListener('pointermove', this.onPointerMove);
      this.root.removeEventListener('pointerleave', this.onPointerLeave);
    }
  }

  function attachPerspectiveCard(root, options = {}) {
    if (!root || root.dataset.perspectiveBound === '1') return root;
    root.dataset.perspectiveBound = '1';
    controllers.set(root, new PerspectiveController(root, options));
    return root;
  }

  function detachPerspectiveCard(root) {
    controllers.get(root)?.destroy();
    controllers.delete(root);
    root?.removeAttribute('data-perspective-bound');
  }

  function scanPerspectiveCards(container = global.document, options = {}) {
    if (!container?.querySelectorAll) return;
    container.querySelectorAll('[data-perspective-card]:not([data-perspective-bound])').forEach(root => {
      attachPerspectiveCard(root, options);
    });
  }

  function refreshPerspectiveCards(container = global.document, options = {}) {
    if (!container?.querySelectorAll) return;
    container.querySelectorAll('[data-perspective-bound="1"]').forEach(root => detachPerspectiveCard(root));
    scanPerspectiveCards(container, options);
  }

  const api = {
    resolveEffectStyle,
    resolveEffectIntensity,
    hasPremiumPerspective,
    buildPerspectiveCardMarkup,
    cardArtMarkup,
    attachPerspectiveCard,
    detachPerspectiveCard,
    scanPerspectiveCards,
    refreshPerspectiveCards
  };

  global.StarlightPerspectiveCard = api;
  if (global.StarlightUI) Object.assign(global.StarlightUI, api);
}(window));
