(() => {
  const ua = navigator.userAgent || '';
  const brands = navigator.userAgentData?.brands?.map(entry => entry.brand).join(' ') || '';
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;
  const saveData = navigator.connection?.saveData === true;
  const lowPower = (
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)
    || (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || saveData
  );

  const isFirefox = /Firefox\//i.test(ua) && !/Seamonkey\//i.test(ua);
  const isOperaGX = /OPR\//i.test(ua) && /Edition GX/i.test(ua);
  const isOpera = /OPR\//i.test(ua) || /Opera\//i.test(ua) || /Opera/i.test(brands);
  const isChromium = !isFirefox && (
    /Chrom(e|ium)\//i.test(ua)
    || /Chrome|Chromium|Opera|Brave|Edge/i.test(brands)
    || (!!window.chrome && /Safari\//i.test(ua))
    || isOpera
  );
  const isWebKit = !isFirefox && !isChromium && /Safari\//i.test(ua) && /Apple Computer|Safari/i.test(ua + brands);
  const engine = isFirefox ? 'firefox' : isOperaGX ? 'opera-gx' : isOpera ? 'opera' : isChromium ? 'chromium' : isWebKit ? 'webkit' : 'other';

  const narrowQuery = window.matchMedia?.('(max-width: 900px)');
  const touchLikely = (navigator.maxTouchPoints || 0) > 1;
  const mobileUa = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const updateMobile = () => {
    const narrow = narrowQuery?.matches === true;
    document.documentElement.classList.toggle('starlight-mobile', mobileUa || (touchLikely && narrow) || narrow);
  };

  // Firefox still benefits from lite mode by default. Chromium / Opera GX keep full
  // visuals on capable desktops and lighten on phones, save-data, or low-power sessions.
  const enableLiteMode = isFirefox
    || reducedMotion
    || lowPower
    || mobileUa
    || ((isChromium || isOpera || isWebKit) && narrowQuery?.matches === true && touchLikely);

  const root = document.documentElement;
  root.dataset.starlightEngine = engine;
  root.classList.toggle('firefox-performance-mode', isFirefox);
  root.classList.toggle('starlight-engine-firefox', isFirefox);
  root.classList.toggle('starlight-engine-chromium', isChromium && !isOpera);
  root.classList.toggle('starlight-engine-opera', isOpera);
  root.classList.toggle('starlight-engine-opera-gx', isOperaGX);
  root.classList.toggle('starlight-engine-webkit', isWebKit);
  root.classList.toggle('starlight-performance-lite', enableLiteMode);
  updateMobile();
  narrowQuery?.addEventListener?.('change', updateMobile);

  window.StarlightBrowser = Object.freeze({
    engine,
    isFirefox,
    isChromium,
    isOpera,
    isOperaGX,
    isWebKit,
    lite: enableLiteMode,
    lowPower,
    reducedMotion
  });

  const updateVisibility = () => {
    root.classList.toggle('starlight-page-hidden', document.hidden);
  };
  document.addEventListener('visibilitychange', updateVisibility, { passive: true });
  updateVisibility();

  const prepareImages = (scope = document) => {
    scope.querySelectorAll?.('img')?.forEach((img) => {
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
      if (!img.hasAttribute('loading') && !img.closest('.pack-stage,.daily-portal,.reward-sequence-overlay,.shell-account-bar,.brand,.st-r3-stage')) {
        img.loading = 'lazy';
      }
      try {
        img.fetchPriority = img.closest('.brand,.shell-account-bar,.featured-pack-art,.st-r3-stage') ? 'high' : 'auto';
      } catch {
        /* Older engines may reject fetchPriority writes. */
      }
    });
  };

  const start = () => {
    prepareImages();
    const observerRoot = document.documentElement || document.body;
    if (observerRoot?.nodeType && 'MutationObserver' in window) {
      try {
        new MutationObserver((records) => {
          for (const record of records) {
            for (const node of record.addedNodes) {
              if (node.nodeType !== 1) continue;
              if (node.matches?.('img')) prepareImages(node.parentElement || document);
              else prepareImages(node);
            }
          }
        }).observe(observerRoot, { childList: true, subtree: true });
      } catch (error) {
        console.warn('[Starlight] Image performance observer unavailable.', error);
      }
    }

    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('starlight-offscreen', !entry.isIntersecting);
        }
      }, { rootMargin: '220px 0px' });
      document.querySelectorAll('.panel,.side-card,.collection-card,.v61-card-slot,.reward-card,.duplicate-card,.favorite-card,.pack-card,.featured-pack').forEach(el => sectionObserver.observe(el));
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
