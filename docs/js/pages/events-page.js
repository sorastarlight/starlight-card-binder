import { getActiveEvents } from '../event-service.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const eventsCopy = siteCopy?.events || {};
const root = document.querySelector('#events');
const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m]));

function countdown(end) {
  const ms = new Date(end) - Date.now();
  if (ms <= 0) return 'Ending now';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor(ms % 86400000 / 3600000);
  return `${d} day${d === 1 ? '' : 's'}, ${h} hour${h === 1 ? '' : 's'} remaining`;
}

try {
  const events = await getActiveEvents();
  if (!events.length) {
    const emptyTitle = esc(eventsCopy.emptyTitle || 'No active events right now');
    const emptyLead = esc(eventsCopy.emptyLead || 'Check back soon for the next Starlight celebration.');
    root.innerHTML = `<div class="empty"><h2>${emptyTitle}</h2><p>${emptyLead}</p></div>`;
  } else {
    root.innerHTML = events.map(e => `<article class="event-card"><div class="event-banner" style="${e.bannerImageUrl ? `background-image:linear-gradient(135deg,rgba(107,198,248,.45),rgba(255,130,200,.45)),url('${esc(e.bannerImageUrl)}')` : ''}"><div class="event-banner-copy"><p class="countdown">${esc(countdown(e.endAt))}</p><h2>${esc(e.name)}</h2><p>${esc(e.description || 'A limited Starlight event is underway!')}</p></div></div><div class="event-body"><h3>${esc(eventsCopy.boostersHeading || 'Event Booster Packs')}</h3><div class="event-grid">${(e.boosters || []).map(b => `<div class="mini">${b.packImageUrl ? `<img src="${esc(b.packImageUrl)}" alt="">` : ''}<h3>${esc(b.name)}</h3><p>${esc(b.description || '')}</p><a class="button primary" href="binder.html?view=shop" target="_top">${esc(eventsCopy.shopCta || 'Visit Card Shop')}</a></div>`).join('') || '<p>No event booster is available yet.</p>'}</div><h3>${esc(eventsCopy.achievementsHeading || 'Event Achievements')}</h3><div class="event-grid">${(e.achievements || []).map(a => `<div class="mini"><strong>${esc(a.name)}</strong><p>${esc(a.description || '')}</p><small>${a.rewardTitle ? `Title: ${esc(a.rewardTitle)}` : ''}${a.rewardStarBits ? ` • ${a.rewardStarBits} Star Bits` : ''}</small></div>`).join('') || '<p>No achievements configured yet.</p>'}</div></div></article>`).join('');
  }
} catch (e) {
  root.innerHTML = `<div class="empty"><h2>${esc(eventsCopy.loadError || 'Events could not load')}</h2><p>${esc(e.message)}</p></div>`;
}
