/**
 * Notify the Binder shell (and any local dashboard listeners) that Star Bits /
 * collector economy totals may have changed.
 */
export function notifyShellEconomyChanged(detail = {}) {
  const payload = {
    type: 'starlight-wallet-changed',
    ...detail
  };

  try {
    window.dispatchEvent(new CustomEvent('starlight-dashboard-refresh', { detail: payload }));
  } catch (_) {
    /* ignore */
  }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, window.location.origin);
    }
  } catch (_) {
    /* ignore */
  }
}
