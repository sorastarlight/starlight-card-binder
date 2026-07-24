import { getPublicProfileExtras } from './profile-extras-service.js';
import { applyAvatarFrameClass } from './avatar-frame-utils.js';

const username = new URLSearchParams(location.search).get('username') || '';
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

(async () => {
  if (!username) return;
  try {
    const data = await getPublicProfileExtras(username);
    if (!data?.found) return;

    const avatar = document.getElementById('collector-avatar');
    if (data.avatarUrl && avatar) {
      avatar.textContent = '';
      avatar.classList.add('has-photo');
      avatar.style.backgroundImage = `url(${JSON.stringify(data.avatarUrl).slice(1, -1)})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
    }
    applyAvatarFrameClass(avatar, data.frame || null);

    const banner = document.getElementById('collector-banner') || document.querySelector('.collector-banner');
    if (data.bannerUrl && banner) {
      banner.style.backgroundImage = `url(${JSON.stringify(data.bannerUrl).slice(1, -1)})`;
      banner.style.backgroundSize = 'cover';
      banner.style.backgroundPosition = 'center';
      banner.classList.add('has-photo');
    }

    const flair = document.getElementById('collector-flair');
    const titleEl = document.getElementById('collector-title');
    if (data.title?.name && titleEl) {
      titleEl.hidden = false;
      titleEl.classList.toggle('is-series-complete', data.title.id === 'series_complete');
      titleEl.textContent = `✦ ${data.title.name}`;
      if (flair) flair.hidden = false;
    } else if (titleEl) {
      titleEl.hidden = true;
      titleEl.textContent = '';
    }

    const content = document.querySelector('.collector-content');
    if (content && data.achievements?.length) {
      const section = document.createElement('section');
      section.className = 'collector-section';
      section.innerHTML = `<h2>🏅 Starlight Memories</h2><div class="public-achievement-grid">${data.achievements.map(achievement => (
        `<article><span>${esc(achievement.icon)}</span><div><strong>${esc(achievement.name)}</strong><small>${esc(achievement.description)}</small></div></article>`
      )).join('')}</div>`;
      content.append(section);
    }
  } catch (error) {
    console.warn('[Starlight] Public extras unavailable', error);
  }
})();
