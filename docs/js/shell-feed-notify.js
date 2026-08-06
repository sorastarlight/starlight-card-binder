/**
 * Notify the Binder shell (and any open feed views) that collector activity changed.
 */
export function notifyShellFeedChanged(detail = {}) {
  const payload = {
    type: 'starlight-feed-changed',
    ...detail
  };

  try {
    window.dispatchEvent(new CustomEvent('starlight-feed-changed', { detail: payload }));
  } catch {
    /* ignore */
  }

  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(payload, window.location.origin);
    }
  } catch {
    /* ignore */
  }
}
