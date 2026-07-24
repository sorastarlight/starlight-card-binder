import { loadCloudCollection } from '../collection-sync.js';
import {
  fetchFreshCardCatalog,
  getCachedCardCatalog
} from '../card-catalog-service.js';
import {
  EVOLUTION_TIERS,
  normalizeEvolutionTier,
  prestigeClassName,
  prestigeLabel
} from '../prestige-utils.js?v=1.4.0';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';

await loadAndHydrateWebsiteContent();

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const statusEl = document.getElementById('st-evo-status');
const gridEl = document.getElementById('st-evo-owned-grid');

function setStatus(message, type = '') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = !message;
  statusEl.classList.toggle('is-error', type === 'error');
}

async function catalogById() {
  let payload = getCachedCardCatalog();
  if (!payload?.cards?.length) {
    try {
      payload = await fetchFreshCardCatalog();
    } catch (error) {
      console.warn('[Starlight] Catalog unavailable for Evolution page', error);
    }
  }
  const map = new Map();
  for (const card of payload?.cards || []) {
    if (card?.id) map.set(String(card.id), card);
  }
  return map;
}

function tierRank(tier) {
  return EVOLUTION_TIERS.indexOf(normalizeEvolutionTier(tier));
}

async function renderOwned() {
  setStatus('Loading your Evolution progress…');
  if (gridEl) {
    gridEl.hidden = true;
    gridEl.innerHTML = '';
  }

  try {
    const [{ cards, error }, byId] = await Promise.all([
      loadCloudCollection(),
      catalogById()
    ]);
    if (error) throw error;

    const evolved = (cards || [])
      .map((row) => {
        const cardId = String(row.card_id || row.cards?.id || '').trim();
        const tier = normalizeEvolutionTier(row.prestige_tier);
        const quantity = Math.max(1, Number(row.quantity || 1));
        const catalogCard = byId.get(cardId) || {};
        const joined = row.cards || {};
        return {
          id: cardId,
          tier,
          quantity,
          name: catalogCard.name || joined.name || cardId,
          imageUrl: catalogCard.thumbnailUrl
            || catalogCard.imageUrl
            || joined.thumbnail_url
            || joined.image_url
            || ''
        };
      })
      .filter((card) => card.id && tierRank(card.tier) > 0)
      .sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || a.name.localeCompare(b.name));

    if (!evolved.length) {
      setStatus(document.querySelector('[data-content="starlightEvolution.ownedEmpty"]')?.textContent
        || 'No evolved cards yet. Gather duplicates, then Evolve from Collection.');
      return;
    }

    if (!gridEl) return;
    gridEl.innerHTML = evolved.map((card) => {
      const frame = prestigeClassName(card.tier);
      const label = prestigeLabel(card.tier);
      const tierToken = String(card.tier).replace(/_/g, '-');
      return `<a class="st-evo-owned-card ${esc(frame)}" href="binder.html?view=collection" data-shell-view="collection">
        <img src="${esc(card.imageUrl)}" alt="${esc(card.name)}" loading="lazy" onerror="this.style.opacity='0.35'">
        <strong>${esc(card.name)}</strong>
        <div class="st-evo-owned-meta">
          <span class="prestige-badge prestige-${esc(tierToken)}">${esc(label)}</span>
          <span class="qty">×${card.quantity}</span>
        </div>
      </a>`;
    }).join('');
    gridEl.hidden = false;
    setStatus(`${evolved.length} evolved card${evolved.length === 1 ? '' : 's'}.`);
  } catch (error) {
    console.error('[Starlight] Evolution page failed to load', error);
    setStatus(error?.message || 'Unable to load Evolution progress. Sign in and try again.', 'error');
  }
}

renderOwned();
