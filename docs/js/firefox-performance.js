/* Compatibility alias for pages still referencing firefox-performance.js. */
(() => {
  if (window.StarlightBrowser) return;
  const script = document.createElement('script');
  script.src = 'js/browser-performance.js?v=1.0.0';
  script.async = false;
  const anchor = document.currentScript;
  if (anchor?.parentNode) anchor.parentNode.insertBefore(script, anchor.nextSibling);
  else (document.head || document.documentElement).appendChild(script);
})();
