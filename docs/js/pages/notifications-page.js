import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteReadNotifications,
  getNotificationPreferences,
  saveNotificationPreferences
} from '../notification-service.js';
import {
  normalizeNotificationParams,
  resolveNotificationRoute,
  shellNotificationUrl
} from '../shell-route-utils.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const notificationsCopy = siteCopy?.notifications || {};

const list = document.getElementById('list');
const summary = document.getElementById('summary');
let state = [];
let historyMode = false;

document.addEventListener('pointerdown', () => {
  if (window.parent !== window) {
    window.parent.postMessage({ type: 'starlight-close-notifications' }, location.origin);
  }
}, { capture: true, once: true });

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

function when(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return '';
  }
}

function render(data) {
  state = data.notifications || [];
  const visible = historyMode ? state : state.filter(n => !n.is_read);
  summary.textContent = `${data.unreadCount || 0} unread • ${state.length} recent${historyMode ? ' • history' : ''}`;
  list.replaceChildren();
  if (!visible.length) {
    const emptyTitle = esc(notificationsCopy.emptyTitle || 'All caught up ✨');
    const emptyLead = esc(notificationsCopy.emptyLead || 'New collector activity will appear here.');
    list.innerHTML = `<div class="notice-empty"><h2>${emptyTitle}</h2><p>${emptyLead}</p></div>`;
    return;
  }
  for (const n of visible) {
    const card = document.createElement('article');
    card.className = `notice-card ${n.is_read ? '' : 'unread'}`;
    const route = resolveNotificationRoute(n.route, n);
    const href = shellNotificationUrl(n);
    card.innerHTML = `<div class="notice-icon">${esc(n.icon || '✦')}</div><div class="notice-copy"><h2>${esc(n.title)}</h2><p>${esc(n.body || '')}</p><p class="notice-meta">${esc(when(n.created_at))}</p></div><div class="notice-controls"><a class="notice-open" data-open href="${esc(href)}">Open</a>${n.is_read ? '' : '<button class="notice-muted" data-read type="button">Read</button>'}<button class="notice-muted" data-delete type="button">Delete</button></div>`;
    card.querySelector('[data-read]')?.addEventListener('click', async () => {
      await markNotificationRead(n.id);
      await load();
    });
    card.querySelector('[data-delete]')?.addEventListener('click', async () => {
      await deleteNotification(n.id);
      await load();
    });
    card.querySelector('[data-open]')?.addEventListener('click', async e => {
      e.preventDefault();
      e.stopPropagation();
      if (!n.is_read) await markNotificationRead(n.id);
      const params = normalizeNotificationParams(n);
      if (window.parent !== window) {
        window.parent.postMessage({ type: 'starlight-navigate', view: route, params }, location.origin);
      } else {
        location.href = href;
      }
    });
    list.append(card);
  }
}

async function load() {
  try {
    render(await getMyNotifications());
  } catch (e) {
    summary.textContent = 'Notifications could not be loaded.';
    list.innerHTML = `<div class="notice-empty"><h2>Unable to load</h2><p>${esc(e.message)}</p></div>`;
  }
}

async function loadPreferences() {
  try {
    const prefs = await getNotificationPreferences();
    document.querySelectorAll('[data-pref]').forEach(input => {
      input.checked = prefs[input.dataset.pref] !== false;
    });
  } catch (e) {
    console.warn('[Starlight] Preferences failed', e);
  }
}

document.getElementById('savePreferences').onclick = async () => {
  const prefs = {};
  document.querySelectorAll('[data-pref]').forEach(input => {
    prefs[input.dataset.pref] = input.checked;
  });
  await saveNotificationPreferences(prefs);
  window.StarlightUI?.toast?.('Notification preferences saved.', 'success');
};

document.getElementById('historyButton').onclick = () => {
  historyMode = !historyMode;
  document.getElementById('historyButton').textContent = historyMode ? 'Show Unread' : 'Notification History';
  render({ notifications: state, unreadCount: state.filter(n => !n.is_read).length });
};

document.getElementById('markAll').onclick = async () => {
  await markAllNotificationsRead();
  await load();
};

document.getElementById('clearRead').onclick = async () => {
  await deleteReadNotifications();
  await load();
};

await Promise.all([load(), loadPreferences()]);
