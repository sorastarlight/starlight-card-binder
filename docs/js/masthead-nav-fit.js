/** Collapse masthead top nav into the drawer menu when inline links would overflow. */
let fitFrame = 0;

export function syncMastheadNavFit() {
  const inner = document.querySelector('.shell-masthead-inner');
  const nav = inner?.querySelector('.shell-masthead-nav');
  if (!inner || !nav || document.body.classList.contains('shell-hybrid-layout')) return;

  inner.classList.remove('shell-masthead--force-collapse');

  if (getComputedStyle(nav).display === 'none') return;

  if (nav.scrollWidth > nav.clientWidth + 2) {
    inner.classList.add('shell-masthead--force-collapse');
  }
}

export function scheduleMastheadNavFit() {
  if (typeof window === 'undefined') return;
  cancelAnimationFrame(fitFrame);
  fitFrame = requestAnimationFrame(() => {
    fitFrame = requestAnimationFrame(syncMastheadNavFit);
  });
}
