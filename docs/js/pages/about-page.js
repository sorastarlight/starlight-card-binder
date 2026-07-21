import {
  fetchFreshCardCatalog,
  getCachedCardCatalog
} from '../card-catalog-service.js';

const container = document.querySelector('#seriesAbout');

function escapeHtml(value) {
  return window.StarlightUI?.escapeHtml(value) ?? String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function render(cards = []) {
  const groups = new Map();
  cards.forEach(card => {
    const name = card.seriesName || 'Other Cards';
    const group = groups.get(name) || [];
    group.push(card);
    groups.set(name, group);
  });

  if (!groups.size) {
    container.innerHTML = window.StarlightUI?.stateMarkup('empty', 'No series yet', 'No published card series are available yet.')
      || '<div class="st-state">No published card series are available yet.</div>';
    return;
  }

  container.innerHTML = [...groups].map(([series, seriesCards]) => {
    const description = seriesCards.find(card => card.seriesDescription)?.seriesDescription || 'A Starlight card series.';
    const legendaryCount = seriesCards.filter(card => String(card.rarity).toLowerCase() === 'legendary').length;
    return `
      <article class="collection-card text-card">
        <h3>${escapeHtml(series)}</h3>
        <p>${escapeHtml(description)}</p>
        <p><b>${seriesCards.length}</b> cards · <b>${legendaryCount}</b> Legendary</p>
      </article>`;
  }).join('');
}

async function load() {
  const cached = getCachedCardCatalog();
  if (cached?.cards?.length) render(cached.cards);

  try {
    const fresh = await fetchFreshCardCatalog();
    render(fresh.cards);
  } catch (error) {
    console.error('[Starlight] Unable to load About series.', error);
    if (!cached?.cards?.length) {
      container.innerHTML = window.StarlightUI?.stateMarkup('error', 'Unable to load', 'The card series could not be loaded. Please try again.')
        || '<div class="st-state">The card series could not be loaded. Please try again.</div>';
    }
  }
}

load();
