/** Shared Administration suite chrome helpers. */

const ESC_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
};

export function escapeAdminHtml(value) {
  if (window.StarlightUI?.escapeHtml) return window.StarlightUI.escapeHtml(value);
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ESC_MAP[ch]);
}

export function formatStaffRole(access) {
  if (!access) return 'staff';
  const tier = String(access.role || 'staff').replaceAll('_', ' ');
  if (access.roleLabel) return `${access.roleLabel} · ${tier}`;
  return tier;
}

export function setAdminStatus(el, message, type = '') {
  if (!el) return;
  el.hidden = !message;
  el.textContent = message || '';
  el.className = type ? `admin-status status ${type}` : 'admin-status status';
  if (type === 'error') el.classList.add('is-error', 'error');
  if (type === 'ok') el.classList.add('is-ok', 'ok');
  if (type === 'warn') el.classList.add('is-warn');
}

/**
 * Soft-disable hub tool links when a capability is missing.
 * @param {Record<string, boolean>} map id -> enabled
 */
export function applyAdminCapabilityGates(map = {}) {
  for (const [id, enabled] of Object.entries(map)) {
    const el = document.getElementById(id);
    if (!el) continue;
    if (enabled) el.removeAttribute('aria-disabled');
    else el.setAttribute('aria-disabled', 'true');
  }
}

export function mountAdminCrumb({ tool } = {}) {
  const host = document.getElementById('adminCrumb');
  if (!host) return;
  const toolLabel = String(tool || '').trim();
  host.innerHTML = toolLabel
    ? `<a href="admin-hub.html">Administration</a><span class="admin-suite-crumb__sep" aria-hidden="true">/</span><span>${escapeAdminHtml(toolLabel)}</span>`
    : `<span>Administration</span>`;
}
