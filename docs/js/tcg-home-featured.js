import { supabase } from './supabase-client.js';
import { pageHref } from './page-href.js';

const PLACEHOLDER = 'INSERT ASSET';
const root = document.querySelector('[data-featured]');
if (!root) {
  /* home only */
} else {
  const cardHost = root.querySelector('[data-featured-card]');
  const nameHost = root.querySelector('[data-featured-name]');
  const heading = root.querySelector('[data-series-name]');
  const seriesLink = root.querySelector('[data-series-link]');
  const galleryLink = root.querySelector('[data-gallery-link]');
  let slides = [];
  let index = 0;
  let timer = 0;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function cardMarkup(card) {
    const img = card.thumbnail_url || card.image_url || '';
    if (img) {
      return `<div class="st-card"><img src="${esc(img)}" alt="${esc(card.name || 'Starlight card')}"></div>`;
    }
    return `<div class="st-card-placeholder" aria-label="${PLACEHOLDER}"><span>${PLACEHOLDER}</span></div>`;
  }

  function show(next) {
    if (!slides.length) return;
    index = (next + slides.length) % slides.length;
    const slide = slides[index];
    if (cardHost) cardHost.innerHTML = cardMarkup(slide);
    if (nameHost) nameHost.textContent = slide.name || 'N/A';
    if (heading) heading.textContent = slide.seriesName || 'Rising Star';
    if (seriesLink) seriesLink.href = 'series.html';
    if (galleryLink) galleryLink.href = pageHref('binder');
  }

  function play() {
    window.clearInterval(timer);
    if (document.documentElement.classList.contains('reduce-motion')) return;
    if (slides.length < 2) return;
    timer = window.setInterval(() => show(index + 1), 7000);
  }

  root.querySelector('[data-prev]')?.addEventListener('click', () => {
    show(index - 1);
    play();
  });
  root.querySelector('[data-next]')?.addEventListener('click', () => {
    show(index + 1);
    play();
  });
  root.addEventListener('mouseenter', () => window.clearInterval(timer));
  root.addEventListener('mouseleave', play);
  window.addEventListener('starlight-motion-change', play);

  try {
    const { data, error } = await supabase
      .from('cards')
      .select('id,name,thumbnail_url,image_url,series_id,rarity')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(12);
    if (error) throw error;
    slides = (data || []).map((card) => ({ ...card, seriesName: 'Rising Star' }));
    if (!slides.length) slides = [{ name: 'N/A', seriesName: 'Rising Star' }];
    show(0);
    play();
  } catch {
    slides = [{ name: 'N/A', seriesName: 'Rising Star' }];
    show(0);
  }
}
