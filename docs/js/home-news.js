import { supabase } from './supabase-client.js';
import { loadAndHydrateWebsiteContent } from './website-content-hydrate.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const host = document.getElementById('news') || document.getElementById('newsList');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

function date(v) {
  try {
    return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

const loadingText = siteCopy?.home?.newsLoading || 'Loading the latest Starlight news…';
if (host && !host.querySelector('.news-card')) {
  host.innerHTML = `<div class="empty">${esc(loadingText)}</div>`;
}

try {
  const { data, error } = await supabase.rpc('get_published_news_posts', { requested_limit: 30 });
  if (error) throw error;
  const posts = Array.isArray(data) ? data : [];
  host.innerHTML = posts.length
    ? posts.map(p => `<article class="news-card ${p.isPinned ? 'pinned' : ''}">${p.imageUrl ? `<img src="${esc(p.imageUrl)}" alt="">` : ''}<div><time>${date(p.publishedAt)}</time><h3>${esc(p.title)}</h3>${p.summary ? `<p>${esc(p.summary)}</p>` : ''}</div></article>`).join('')
    : '<div class="empty">No news has been posted yet. Check back soon! ✨</div>';
} catch (e) {
  host.innerHTML = `<div class="empty">News could not be loaded right now.<br><small>${esc(e.message)}</small></div>`;
}
