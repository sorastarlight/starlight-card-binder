/**
 * Home spotlight carousel — Pokémon TCG "What's new" style, fed from published news.
 */
import { supabase } from './supabase-client.js';

const track = document.getElementById('homeSpotlightTrack');
const prevBtn = document.querySelector('[data-home-spotlight-prev]');
const nextBtn = document.querySelector('[data-home-spotlight-next]');
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

let index = 0;
let slideCount = 0;

function date(v) {
  try {
    return new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

function renderSlide(post) {
  const media = post.imageUrl
    ? `<img src="${esc(post.imageUrl)}" alt="">`
    : '<span class="home-spotlight-star" aria-hidden="true">✦</span>';
  const summary = post.summary ? `<p>${esc(post.summary)}</p>` : '';
  return `<article class="home-spotlight-slide">
    <div class="home-spotlight-copy">
      <p class="eyebrow">${post.isPinned ? 'Featured sparkle' : 'What\'s new'}</p>
      <h2>${esc(post.title)}</h2>
      ${summary}
      <time class="home-spotlight-date">${date(post.publishedAt)}</time>
    </div>
    <div class="home-spotlight-media">${media}</div>
  </article>`;
}

function renderFallback() {
  if (!track) return;
  track.innerHTML = `<article class="home-spotlight-slide">
    <div class="home-spotlight-copy">
      <p class="eyebrow">Welcome, Starlight Collector</p>
      <h2>Your magical card adventure starts here</h2>
      <p>Open your free daily pack, browse the gallery, and trade with fellow collectors.</p>
      <a class="btn primary" href="binder?view=daily" data-shell-view="daily">Open Free Daily Starlight Pack</a>
    </div>
    <div class="home-spotlight-media"><span class="home-spotlight-star" aria-hidden="true">✦</span></div>
  </article>`;
  slideCount = 1;
}

function goTo(i) {
  if (!track || slideCount <= 1) return;
  index = ((i % slideCount) + slideCount) % slideCount;
  track.style.transform = `translateX(-${index * 100}%)`;
}

function bindControls() {
  if (prevBtn) prevBtn.addEventListener('click', () => goTo(index - 1));
  if (nextBtn) nextBtn.addEventListener('click', () => goTo(index + 1));
}

async function load() {
  if (!track) return;
  try {
    const { data, error } = await supabase.rpc('get_published_news_posts', { requested_limit: 8 });
    if (error) throw error;
    const posts = Array.isArray(data) ? data.filter(p => p?.title) : [];
    if (!posts.length) {
      renderFallback();
      return;
    }
    const sorted = [...posts].sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
    track.innerHTML = sorted.map(renderSlide).join('');
    slideCount = sorted.length;
    bindControls();
    if (slideCount > 1 && prevBtn?.parentElement) prevBtn.parentElement.hidden = false;
  } catch {
    renderFallback();
    bindControls();
  }
}

load();
