(() => {
  const ua = navigator.userAgent || "";
  const isFirefox = /Firefox\//i.test(ua) && !/Seamonkey\//i.test(ua);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const lowPower = (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) || (navigator.deviceMemory && navigator.deviceMemory <= 4);
  const enableLiteMode = isFirefox || reducedMotion || lowPower;

  document.documentElement.classList.toggle('firefox-performance-mode', isFirefox);
  document.documentElement.classList.toggle('starlight-performance-lite', enableLiteMode);

  const updateVisibility = () => {
    document.documentElement.classList.toggle('starlight-page-hidden', document.hidden);
  };
  document.addEventListener('visibilitychange', updateVisibility, { passive: true });
  updateVisibility();

  const prepareImages = (root = document) => {
    root.querySelectorAll('img').forEach((img) => {
      if (!img.hasAttribute('decoding')) img.decoding = 'async';
      if (!img.hasAttribute('loading') && !img.closest('.pack-stage,.daily-portal,.reward-sequence-overlay,.shell-account-bar,.brand')) {
        img.loading = 'lazy';
      }
      img.fetchPriority = img.closest('.brand,.shell-account-bar') ? 'high' : 'auto';
    });
  };

  const start = () => {
    prepareImages();
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.('img')) prepareImages(node.parentElement || document);
          else prepareImages(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          entry.target.classList.toggle('starlight-offscreen', !entry.isIntersecting);
        }
      }, { rootMargin: '220px 0px' });
      document.querySelectorAll('.panel,.side-card,.collection-card,.v61-card-slot,.reward-card,.duplicate-card,.favorite-card').forEach(el => sectionObserver.observe(el));
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
