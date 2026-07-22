import { supabase } from './supabase-client.js';

const TWITCH_ICON = `<svg class="collector-twitch-icon" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false"><path fill="currentColor" d="M4 2L2 6v14h5v3l3-3h4l6-6V2H4zm15 10l-4 4h-4l-2 2v-2H6V4h13v8zM15 7h-2v5h2V7zm-5 0H8v5h2V7z"/></svg>`;

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
  } catch (error) {
    console.warn('[Starlight] Public Twitch badge unavailable.', error);
    badge.hidden = true;
  }
}

mountPublicTwitchBadge();
