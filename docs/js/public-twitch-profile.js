import { supabase } from './supabase-client.js';

const TWITCH_ICON = `<svg class="collector-twitch-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 2L2 6v14h5v3l3-3h4l6-6V2H4zm15 10l-4 4h-4l-2 2v-2H6V4h13v8zM15 7h-2v5h2V7zm-5 0H8v5h2V7z"/></svg>`;

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function mountPublicTwitchBadge() {
  const username = new URLSearchParams(location.search).get('username');
  const badge = document.getElementById('collector-twitch-badge');
  if (!username || !badge) return;

  try {
    const { data } = await supabase.rpc('get_public_twitch_connection_v890', {
      requested_username: username
    });
    if (!data?.linked || !data.login) {
      badge.hidden = true;
      return;
    }

    const login = String(data.login);
    const label = data.displayName || login;
    badge.hidden = false;
    badge.href = `https://twitch.tv/${encodeURIComponent(login)}`;
    badge.title = `${label} on Twitch`;
    badge.setAttribute('aria-label', `Open ${label} on Twitch`);
    badge.innerHTML = `${TWITCH_ICON}<span class="collector-twitch-label">Twitch</span>`;

    const identity = document.querySelector('.collector-identity');
    if (identity && !document.getElementById('collector-twitch-handle')) {
      const handle = document.createElement('a');
      handle.id = 'collector-twitch-handle';
      handle.className = 'collector-twitch-handle';
      handle.href = badge.href;
      handle.target = '_blank';
      handle.rel = 'noopener';
      handle.innerHTML = `${TWITCH_ICON}<span>@${esc(login)}</span>`;
      const usernameEl = document.getElementById('collector-username');
      if (usernameEl?.nextSibling) identity.insertBefore(handle, usernameEl.nextSibling);
      else identity.append(handle);
    }
  } catch (error) {
    console.warn('[Starlight] Public Twitch badge unavailable.', error);
    badge.hidden = true;
  }
}

mountPublicTwitchBadge();
