import { getPublicProfileExtras } from './profile-extras-service.js';

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
      avatar.style.backgroundImage = `url(${JSON.stringify(data.avatarUrl).slice(1, -1)})`;
      avatar.style.backgroundSize = 'cover';
      avatar.style.backgroundPosition = 'center';
    }

    const banner = document.getElementById('collector-banner') || document.querySelector('.collector-banner');
    if (data.bannerUrl && banner) {
      banner.style.backgroundImage = `url(${JSON.stringify(data.bannerUrl).slice(1, -1)})`;
      banner.style.backgroundSize = 'cover';
      banner.style.backgroundPosition = 'center';
      banner.classList.add('has-photo');
    }

    const identity = document.querySelector('.collector-identity');
    if (data.title?.name && identity) {
      const title = document.createElement('p');
      title.className = 'collector-title';
      title.textContent = `✦ ${data.title.name}`;
      identity.insertBefore(title, document.getElementById('collector-bio'));
    }

    const content = document.querySelector('.collector-content');
    if (content && data.achievements?.length) {
      const section = document.createElement('section');
      section.className = 'collector-section';
      section.innerHTML = `<h2>🏅 Achievements</h2><div class="public-achievement-grid">${data.achievements.map(achievement => (
        `<article><span>${esc(achievement.icon)}</span><div><strong>${esc(achievement.name)}</strong><small>${esc(achievement.description)}</small></div></article>`
      )).join('')}</div>`;
      content.append(section);
    }
  } catch (error) {
    console.warn('[Starlight] Public extras unavailable', error);
  }
})();
