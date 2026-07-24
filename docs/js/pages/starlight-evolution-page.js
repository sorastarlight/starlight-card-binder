import { evolveMyCard, loadCloudCollection, unfuseMyCard } from '../collection-sync.js';
import {
  fetchFreshCardCatalog,
  getCachedCardCatalog
} from '../card-catalog-service.js';
import {
  canEvolve,
  canUnfuse,
  evolutionCostForNextTier,
  evolutionExtras,
  evolutionUnfuseRefund,
  EVOLUTION_TIERS,
  nextEvolutionTier,
  normalizeEvolutionTier,
  prestigeClassName,
  prestigeLabel,
  previousEvolutionTier
} from '../prestige-utils.js?v=1.4.0';
import { playStarlightEvolutionReveal } from '../starlight-evolution-reveal.js?v=1.2.0';
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
const dialogEl = document.getElementById('st-evo-card-modal');
const dialogBodyEl = document.getElementById('st-evo-card-body');
const dialogTitleEl = document.getElementById('st-evo-card-title');
const dialogCloseEl = document.getElementById('st-evo-card-close');

/** @type {Map<string, object>} */
let ownedById = new Map();
let activeCardId = '';
let actionBusy = false;

const cardModal = dialogEl && window.StarlightUI?.adoptModal
  ? window.StarlightUI.adoptModal(dialogEl, {
      dialog: dialogEl.querySelector('.st-dialog'),
      labelledBy: 'st-evo-card-title',
      describedBy: 'st-evo-card-body',
      initialFocus: dialogCloseEl
    })
  : null;

function setStatus(message, type = '') {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.hidden = !message;
  statusEl.classList.toggle('is-error', type === 'error');
}

function toast(message, type = 'info') {
  window.StarlightUI?.toast?.(message, type);
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

function normalizeOwnedRows(cards, byId) {
  return (cards || [])
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
}

function renderGrid(evolved) {
  if (!gridEl) return;
  ownedById = new Map(evolved.map((card) => [card.id, card]));

  if (!evolved.length) {
    gridEl.hidden = true;
    gridEl.innerHTML = '';
    setStatus(document.querySelector('[data-content="starlightEvolution.ownedEmpty"]')?.textContent
      || 'No evolved cards yet. Gather duplicates, then Evolve from Collection.');
    return;
  }

  gridEl.innerHTML = evolved.map((card) => {
    const frame = prestigeClassName(card.tier);
    const label = prestigeLabel(card.tier);
    const tierToken = String(card.tier).replace(/_/g, '-');
    const ready = canEvolve(card.quantity, card.tier);
    return `<button type="button" class="st-evo-owned-card ${esc(frame)}${ready ? ' is-ready' : ''}" data-evo-open-card="${esc(card.id)}" aria-label="Open ${esc(card.name)} evolution details">
      <img src="${esc(card.imageUrl)}" alt="" loading="lazy" onerror="this.style.opacity='0.35'">
      <strong>${esc(card.name)}</strong>
      <div class="st-evo-owned-meta">
        <span class="prestige-badge prestige-${esc(tierToken)}">${esc(label)}</span>
        <span class="qty">×${card.quantity}</span>
        ${ready ? '<span class="st-evo-ready-chip">Ready to evolve</span>' : ''}
      </div>
    </button>`;
  }).join('');
  gridEl.hidden = false;
  setStatus(`${evolved.length} evolved card${evolved.length === 1 ? '' : 's'}.`);
}

function detailActionMarkup(card) {
  const extras = evolutionExtras(card.quantity);
  const next = nextEvolutionTier(card.tier);
  const cost = evolutionCostForNextTier(card.tier);
  const nextLabel = next ? prestigeLabel(next) : '';
  const ready = canEvolve(card.quantity, card.tier);
  const unfuseOk = canUnfuse(card.tier);
  const refund = evolutionUnfuseRefund(card.tier);
  const prev = previousEvolutionTier(card.tier);
  const prevLabel = prev ? prestigeLabel(prev) : '';

  let evolveBlock = '';
  if (!next || cost == null) {
    evolveBlock = `<p class="st-evo-detail-note">This card is already at Super Starlight.</p>`;
  } else if (ready) {
    evolveBlock = `<button type="button" class="btn primary" data-evo-evolve="${esc(card.id)}">Evolve to ${esc(nextLabel)} (−${cost})</button>
      <p class="st-evo-detail-note">Spends ${cost} duplicate${cost === 1 ? '' : 's'} and keeps 1 protected copy.</p>`;
  } else {
    evolveBlock = `<button type="button" class="btn primary" data-evo-evolve="${esc(card.id)}" disabled>Need ${cost} extras to evolve</button>
      <p class="st-evo-detail-note">You have ${extras} exchangeable duplicate${extras === 1 ? '' : 's'}.</p>`;
  }

  const unfuseBlock = unfuseOk && refund != null
    ? `<button type="button" class="btn" data-evo-unfuse="${esc(card.id)}">Unfuse to ${esc(prevLabel)} (+${refund})</button>`
    : '';

  return `<div class="st-evo-detail-actions">${evolveBlock}${unfuseBlock}</div>`;
}

function renderCardDetail(card) {
  if (!dialogBodyEl || !dialogTitleEl || !card) return;
  const frame = prestigeClassName(card.tier);
  const label = prestigeLabel(card.tier);
  const tierToken = String(card.tier).replace(/_/g, '-');
  dialogTitleEl.textContent = card.name;
  dialogBodyEl.innerHTML = `
    <div class="st-evo-detail-layout">
      <div class="st-evo-detail-art ${esc(frame)}">
        <img src="${esc(card.imageUrl)}" alt="${esc(card.name)}" onerror="this.style.opacity='0.35'">
      </div>
      <div class="st-evo-detail-copy">
        <p class="st-evo-detail-meta">
          <span class="prestige-badge prestige-${esc(tierToken)}">${esc(label)}</span>
          <span class="qty">Owned ×${card.quantity}</span>
          <span class="qty">${evolutionExtras(card.quantity)} extras</span>
        </p>
        ${detailActionMarkup(card)}
      </div>
    </div>`;
}

function openCardDetail(cardId) {
  const id = String(cardId || '').trim();
  const card = ownedById.get(id);
  if (!card) return;
  activeCardId = id;
  renderCardDetail(card);
  if (cardModal) {
    cardModal.open({ initialFocus: dialogCloseEl });
    return;
  }
  dialogEl?.classList.remove('hidden');
  dialogEl?.setAttribute('aria-hidden', 'false');
}

function closeCardDetail() {
  activeCardId = '';
  if (cardModal) {
    cardModal.close();
    return;
  }
  dialogEl?.classList.add('hidden');
  dialogEl?.setAttribute('aria-hidden', 'true');
}

async function confirmEvolve(card) {
  const next = nextEvolutionTier(card.tier);
  const cost = evolutionCostForNextTier(card.tier);
  if (!next || cost == null) {
    toast('This card is already at Super Starlight.', 'info');
    return false;
  }
  if (!canEvolve(card.quantity, card.tier)) {
    toast(`Need ${cost} duplicates to evolve.`, 'error');
    return false;
  }
  const nextLabel = prestigeLabel(next);
  const confirmed = await window.StarlightUI?.confirm?.({
    title: `Evolve to ${nextLabel}?`,
    message: `This spends ${cost} duplicate${cost === 1 ? '' : 's'} and keeps 1 copy. Your Starlight Evolution will become ${nextLabel}.`,
    warning: 'You can Unfuse later for a partial refund.',
    confirmText: `Evolve (−${cost})`,
    cancelText: 'Cancel',
    danger: true
  });
  return Boolean(confirmed);
}

async function handleEvolve(cardId) {
  if (actionBusy) return;
  const card = ownedById.get(String(cardId || '').trim());
  if (!card) return;
  if (!(await confirmEvolve(card))) return;

  actionBusy = true;
  try {
    const result = await evolveMyCard(card.id);
    if (!result) throw new Error('Starlight Evolution is unavailable while signed out.');
    const toTier = normalizeEvolutionTier(
      result.evolutionTier || result.fusionTier || result.prestigeTier || nextEvolutionTier(card.tier)
    );
    const nextLabel = result.label || prestigeLabel(toTier);
    const cost = evolutionCostForNextTier(card.tier);
    closeCardDetail();
    await playStarlightEvolutionReveal({
      imageUrl: card.imageUrl,
      cardName: card.name,
      fromTier: card.tier,
      toTier,
      label: nextLabel,
      cost
    });
    toast(`Evolved to ${nextLabel}!`, 'success');
    await renderOwned();
    const refreshed = ownedById.get(card.id);
    if (refreshed) openCardDetail(card.id);
  } catch (error) {
    toast(error?.message || error?.error_description || 'Evolution failed.', 'error');
  } finally {
    actionBusy = false;
  }
}

async function handleUnfuse(cardId) {
  if (actionBusy) return;
  const card = ownedById.get(String(cardId || '').trim());
  if (!card) return;
  const prev = previousEvolutionTier(card.tier);
  const refund = evolutionUnfuseRefund(card.tier);
  if (!prev || refund == null) {
    toast('This card is already at Stardust.', 'info');
    return;
  }
  const prevLabel = prestigeLabel(prev);
  const confirmed = await window.StarlightUI?.confirm?.({
    title: `Unfuse to ${prevLabel}?`,
    message: `This steps Evolution down one level and refunds ${refund} duplicate${refund === 1 ? '' : 's'} (half of the step cost, rounded down).`,
    confirmText: `Unfuse (+${refund})`,
    cancelText: 'Cancel',
    danger: true
  });
  if (!confirmed) return;

  actionBusy = true;
  try {
    const result = await unfuseMyCard(card.id);
    if (!result) throw new Error('Unfuse is unavailable while signed out.');
    const nextLabel = result.label || prestigeLabel(
      result.evolutionTier || result.fusionTier || result.prestigeTier || prev
    );
    toast(`Unfused to ${nextLabel}. +${result.refund ?? refund} copies restored.`, 'success');
    await renderOwned();
    const refreshed = ownedById.get(card.id);
    if (refreshed) {
      renderCardDetail(refreshed);
    } else {
      closeCardDetail();
    }
  } catch (error) {
    toast(error?.message || error?.error_description || 'Unfuse failed.', 'error');
  } finally {
    actionBusy = false;
  }
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
    renderGrid(normalizeOwnedRows(cards, byId));
  } catch (error) {
    console.error('[Starlight] Evolution page failed to load', error);
    setStatus(error?.message || 'Unable to load Evolution progress. Sign in and try again.', 'error');
  }
}

gridEl?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-evo-open-card]');
  if (!button) return;
  event.preventDefault();
  openCardDetail(button.getAttribute('data-evo-open-card'));
});

dialogBodyEl?.addEventListener('click', (event) => {
  const evolveBtn = event.target.closest('[data-evo-evolve]');
  if (evolveBtn && !evolveBtn.disabled) {
    event.preventDefault();
    handleEvolve(evolveBtn.getAttribute('data-evo-evolve'));
    return;
  }
  const unfuseBtn = event.target.closest('[data-evo-unfuse]');
  if (unfuseBtn) {
    event.preventDefault();
    handleUnfuse(unfuseBtn.getAttribute('data-evo-unfuse'));
  }
});

dialogCloseEl?.addEventListener('click', () => closeCardDetail());

renderOwned();
