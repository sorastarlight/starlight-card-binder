import {
  EVOLUTION_COSTS,
  prestigeClassName,
  prestigeHeroPreviewHtml,
  prestigeLabel
} from '../prestige-utils.js?v=1.6.2';

const SHOWCASE_TIERS = Object.freeze([
  { tier: 'star_bit', costKey: 'prestigeStarBit' },
  { tier: 'protostar', costKey: 'prestigeProtostar' },
  { tier: 'starlight', costKey: 'prestigeStarlight' },
  { tier: 'super_starlight', costKey: 'prestigeSuperStarlight' },
  { tier: 'starlight_burst', costKey: 'prestigeStarlightBurst' }
]);

const PREVIOUS_TIER = Object.freeze({
  star_bit: 'stardust',
  protostar: 'star_bit',
  starlight: 'protostar',
  super_starlight: 'starlight',
  starlight_burst: 'super_starlight'
});

const AUTO_ROTATE_MS = 5200;

function fallbackCostLabel(tier) {
  const prev = PREVIOUS_TIER[tier];
  const cost = EVOLUTION_COSTS[prev] ?? 0;
  return `${cost} duplicates → ${prestigeLabel(tier)}`;
}

function readHydratedCostLabel(costKey, tier) {
  const source = document.querySelector(`[data-content="starlightEvolution.${costKey}"]`);
  const text = source?.textContent?.trim();
  return text || fallbackCostLabel(tier);
}

function badgeClassForTier(tier) {
  return prestigeClassName(tier).split(/\s+/).find((token) => token.startsWith('prestige-') && token !== 'prestige-frame') || '';
}

function buildSlideMarkup(entry, index) {
  const frameClass = prestigeClassName(entry.tier);
  const label = prestigeLabel(entry.tier);
  return `
    <article
      class="st-evo-radiance-slide ${frameClass}"
      data-tier="${entry.tier}"
      data-slide-index="${index}"
      role="group"
      aria-roledescription="slide"
      aria-label="${label}"
      aria-hidden="true"
    >
      ${prestigeHeroPreviewHtml({
        tier: entry.tier,
        alt: label,
        extraClass: 'st-evo-radiance-card st-evo-tier-preview'
      })}
    </article>
  `;
}

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

export function initRadianceCarousel(root) {
  if (!root || root.dataset.carouselReady === 'true') return;

  const stage = root.querySelector('.st-evo-radiance-stage');
  const badgeEl = root.querySelector('.st-evo-radiance-active-badge');
  const costEl = root.querySelector('.st-evo-radiance-active-cost');
  const dotsHost = root.querySelector('.st-evo-radiance-dots');
  const prevBtn = root.querySelector('.st-evo-radiance-prev');
  const nextBtn = root.querySelector('.st-evo-radiance-next');
  if (!stage || !badgeEl || !costEl || !dotsHost || !prevBtn || !nextBtn) return;

  stage.innerHTML = SHOWCASE_TIERS.map(buildSlideMarkup).join('');
  dotsHost.innerHTML = SHOWCASE_TIERS.map((entry, index) => {
    const label = prestigeLabel(entry.tier);
    return `<button type="button" class="st-evo-radiance-dot" data-slide-to="${index}" role="tab" aria-label="${label}" aria-selected="false"></button>`;
  }).join('');

  const slides = [...stage.querySelectorAll('.st-evo-radiance-slide')];
  const dots = [...dotsHost.querySelectorAll('.st-evo-radiance-dot')];
  let activeIndex = 0;
  let autoTimer = null;
  let paused = false;

  const syncMeta = () => {
    const entry = SHOWCASE_TIERS[activeIndex];
    const tier = entry.tier;
    const badgeToken = badgeClassForTier(tier);
    badgeEl.className = `prestige-badge st-evo-radiance-active-badge ${badgeToken}`.trim();
    badgeEl.textContent = prestigeLabel(tier);
    costEl.textContent = readHydratedCostLabel(entry.costKey, tier);
    root.dataset.activeTier = tier;
  };

  const paint = () => {
    slides.forEach((slide, index) => {
      const offset = wrapOffset(index, activeIndex, slides.length);
      slide.className = `st-evo-radiance-slide ${prestigeClassName(SHOWCASE_TIERS[index].tier)} ${offsetClass(offset)}`.trim();
      slide.setAttribute('aria-hidden', offset === 0 ? 'false' : 'true');
      slide.tabIndex = offset === 0 ? 0 : -1;
    });
    dots.forEach((dot, index) => {
      const selected = index === activeIndex;
      dot.classList.toggle('is-active', selected);
      dot.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    syncMeta();
  };

  const goTo = (index) => {
    activeIndex = (index + slides.length) % slides.length;
    paint();
  };

  const step = (delta) => {
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
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    stopAuto();
    autoTimer = window.setInterval(() => goTo(activeIndex + 1), AUTO_ROTATE_MS);
  };

  const restartAuto = () => {
    stopAuto();
    startAuto();
  };

  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));
  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      goTo(Number(dot.dataset.slideTo || 0));
      restartAuto();
    });
  });

  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
  });

  root.addEventListener('pointerenter', () => {
    paused = true;
    stopAuto();
  });
  root.addEventListener('pointerleave', () => {
    paused = false;
    startAuto();
  });
  root.addEventListener('focusin', () => {
    paused = true;
    stopAuto();
  });
  root.addEventListener('focusout', (event) => {
    if (!root.contains(event.relatedTarget)) {
      paused = false;
      startAuto();
    }
  });

  let touchStartX = 0;
  root.addEventListener('touchstart', (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? 0;
    paused = true;
    stopAuto();
  }, { passive: true });
  root.addEventListener('touchend', (event) => {
    const deltaX = (event.changedTouches[0]?.clientX ?? 0) - touchStartX;
    if (Math.abs(deltaX) > 42) step(deltaX > 0 ? -1 : 1);
    paused = false;
    startAuto();
  }, { passive: true });

  paint();
  startAuto();
  root.dataset.carouselReady = 'true';
}
