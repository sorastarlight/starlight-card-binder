const AUTO_ROTATE_MS = 6000;

function wrapOffset(index, activeIndex, total) {
  let offset = index - activeIndex;
  if (offset > total / 2) offset -= total;
  if (offset < -total / 2) offset += total;
  return offset;
}

function visibleRadius(total, viewportWidth) {
  if (total <= 1) return 0;
  if (viewportWidth < 620) return 1;
  if (viewportWidth < 920) return 2;
  return Math.min(Math.ceil(total / 2), Math.max(2, Math.min(5, total - 1)));
}

function stepSpreadPercent(total, viewportWidth) {
  let step = viewportWidth < 620 ? 64 : viewportWidth < 920 ? 78 : 92;
  const radius = visibleRadius(total, viewportWidth);
  const maxFan = viewportWidth < 620 ? 108 : viewportWidth < 920 ? 132 : 156;
  if (radius > 0 && step * radius > maxFan) {
    step = maxFan / radius;
  }
  return step;
}

function layoutForOffset(offset, total, viewportWidth) {
  const abs = Math.abs(offset);
  const radius = visibleRadius(total, viewportWidth);
  if (abs > radius) {
    return { hidden: true };
  }

  const stepX = stepSpreadPercent(total, viewportWidth);
  const x = offset * stepX;
  const rotY = offset * -15;
  const z = offset === 0 ? 168 : Math.max(-130, 118 - abs * 54);
  const y = abs * 2.2;
  const scale = offset === 0 ? 1.1 : Math.max(0.62, 0.94 - abs * 0.075);
  const opacity = offset === 0 ? 1 : Math.max(0.3, 0.97 - abs * 0.1);
  const zIndex = 12 - abs;

  return { hidden: false, x, y, z, rotY, scale, opacity, zIndex };
}

function applySlideLayout(slide, layout, offset) {
  slide.classList.toggle('is-active', offset === 0);
  slide.classList.toggle('is-visible', !layout.hidden);

  if (layout.hidden) {
    slide.style.opacity = '0';
    slide.style.pointerEvents = 'none';
    slide.style.zIndex = '0';
    slide.style.transform = 'translate3d(0, 10%, -180px) rotateY(0deg) scale(0.55)';
    slide.setAttribute('aria-hidden', 'true');
    return;
  }

  slide.style.opacity = String(layout.opacity);
  slide.style.pointerEvents = 'auto';
  slide.style.zIndex = String(layout.zIndex);
  slide.style.transform =
    `translate3d(${layout.x}%, ${layout.y}%, ${layout.z}px) rotateY(${layout.rotY}deg) scale(${layout.scale})`;
  slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
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
  let resizeTimer = null;
  const multi = slides.length > 1;

  root.dataset.packCount = String(slides.length);
  root.classList.toggle('is-single', !multi);
  prevBtn.disabled = !multi;
  nextBtn.disabled = !multi;

  const paint = () => {
    const viewportWidth = window.innerWidth || 1200;
    slides.forEach((slide, index) => {
      const offset = wrapOffset(index, activeIndex, slides.length);
      applySlideLayout(slide, layoutForOffset(offset, slides.length, viewportWidth), offset);
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
  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(paint, 120);
  };

  prevBtn.addEventListener('click', onPrev);
  nextBtn.addEventListener('click', onNext);
  root.addEventListener('keydown', onKeydown);
  root.addEventListener('pointerenter', onPointerEnter);
  root.addEventListener('pointerleave', onPointerLeave);
  root.addEventListener('focusin', onFocusIn);
  root.addEventListener('focusout', onFocusOut);
  window.addEventListener('resize', onResize);

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
    window.clearTimeout(resizeTimer);
    prevBtn.removeEventListener('click', onPrev);
    nextBtn.removeEventListener('click', onNext);
    root.removeEventListener('keydown', onKeydown);
    root.removeEventListener('pointerenter', onPointerEnter);
    root.removeEventListener('pointerleave', onPointerLeave);
    root.removeEventListener('focusin', onFocusIn);
    root.removeEventListener('focusout', onFocusOut);
    root.removeEventListener('touchstart', onTouchStart);
    root.removeEventListener('touchend', onTouchEnd);
    window.removeEventListener('resize', onResize);
  };
}

window.StarlightBinderSeriesCarousel = { init: initBinderSeriesCarousel };
