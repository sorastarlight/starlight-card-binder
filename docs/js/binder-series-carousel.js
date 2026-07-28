const AUTO_ROTATE_MS = 6000;

function offsetClass(offset) {
  if (offset === 0) return 'is-active';
  if (offset === -1) return 'is-left-1';
  if (offset === 1) return 'is-right-1';
  if (offset === -2) return 'is-left-2';
  if (offset === 2) return 'is-right-2';
  return 'is-hidden';
}

function wrapOffset(index, activeIndex, total) {
  let offset = index - activeIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

export function initBinderSeriesCarousel(root) {
  if (!root) return;

  const stage = root.querySelector('.binder-series-stage');
  const dotsHost = root.querySelector('.binder-series-dots');
  const prevBtn = root.querySelector('.binder-series-prev');
  const nextBtn = root.querySelector('.binder-series-next');
  if (!stage || !dotsHost || !prevBtn || !nextBtn) return;

  const slides = [...stage.querySelectorAll('.binder-series-slide')];
  if (!slides.length) return;

  if (root._binderCarouselCleanup) {
    root._binderCarouselCleanup();
    root._binderCarouselCleanup = null;
  }

  dotsHost.innerHTML = slides.map((slide, index) => {
    const label = slide.getAttribute('aria-label') || `Series ${index + 1}`;
    return `<button type="button" class="binder-series-dot" data-slide-to="${index}" role="tab" aria-label="${label}" aria-selected="false"></button>`;
  }).join('');

  const dots = [...dotsHost.querySelectorAll('.binder-series-dot')];
  let activeIndex = 0;
  let autoTimer = null;
  let paused = false;
  const multi = slides.length > 1;

  root.classList.toggle('is-single', !multi);
  prevBtn.disabled = !multi;
  nextBtn.disabled = !multi;

  const paint = () => {
    slides.forEach((slide, index) => {
      const offset = wrapOffset(index, activeIndex, slides.length);
      slide.className = `binder-series-slide ${offsetClass(offset)}`.trim();
      slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
    });
    dots.forEach((dot, index) => {
      const selected = index === activeIndex;
      dot.classList.toggle('is-active', selected);
      dot.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    root.dataset.activeIndex = String(activeIndex);
  };

  const goTo = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    paint();
  };

  const step = (delta) => {
    if (!multi) return;
    goTo(activeIndex + delta);
    restartAuto();
  };

  const stopAuto = () => {
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
  };

  const startAuto = () => {
    if (!multi || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stopAuto();
    autoTimer = window.setInterval(() => goTo(activeIndex + 1), AUTO_ROTATE_MS);
  };

  const restartAuto = () => {
    stopAuto();
    startAuto();
  };

  const onPrev = () => step(-1);
  const onNext = () => step(1);
  const onKeydown = (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  };
  const onPointerEnter = () => {
    paused = true;
    stopAuto();
  };
  const onPointerLeave = () => {
    paused = false;
    startAuto();
  };
  const onFocusIn = () => {
    paused = true;
    stopAuto();
  };
  const onFocusOut = (event) => {
    if (!root.contains(event.relatedTarget)) {
      paused = false;
      startAuto();
    }
  };

  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);
  root.addEventListener('keydown', onKeydown);
  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goTo(Number(dot.dataset.slideTo || 0));
      restartAuto();
    });
  });

  let touchStartX = 0;
  const onTouchStart = (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? 0;
    paused = true;
    stopAuto();
  };
  const onTouchEnd = (event) => {
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (Math.abs(deltaX) > 42) step(deltaX > 0 ? -1 : 1);
    paused = false;
    startAuto();
  };
  root.addEventListener('touchstart', onTouchStart, { passive: true });
  root.addEventListener('touchend', onTouchEnd, { passive: true });

  paint();
  startAuto();

  root._binderCarouselCleanup = () => {
    stopAuto();
    prevBtn.removeEventListener('click', onPrev);
    nextBtn.removeEventListener('click', onNext);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchend', onTouchEnd);
  };
}

window.StarlightBinderSeriesCarousel = { init: initBinderSeriesCarousel };
