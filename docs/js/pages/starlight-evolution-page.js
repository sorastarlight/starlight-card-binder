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
} from '../prestige-utils.js?v=1.5.0';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const statusEl = document.getElementById('st-evo-status');
const gridEl = document.getElementById('st-evo-owned-grid');
const readyStatusEl = document.getElementById('st-evo-ready-status');
const readyGridEl = document.getElementById('st-evo-ready-grid');
const dialogEl = document.getElementById('st-evo-card-modal');
const dialogBodyEl = document.getElementById('st-evo-card-body');
const dialogTitleEl = document.getElementById('st-evo-card-title');
const dialogCloseEl = document.getElementById('st-evo-card-close');
const resultModalEl = document.getElementById('st-evo-result-modal');
const resultStageEl = document.getElementById('st-evo-ascend-stage');
const resultAuraEl = document.getElementById('st-evo-ascend-aura');
const resultTitleEl = document.getElementById('st-evo-result-title');
const resultArtEl = document.getElementById('st-evo-result-art');
const resultTierEl = document.getElementById('st-evo-result-tier');
const resultNameEl = document.getElementById('st-evo-result-name');
const resultDoneEl = document.getElementById('st-evo-result-done');
const resultCloseEl = document.getElementById('st-evo-result-close');

/** @type {Map<string, object>} */
let ownedById = new Map();
/** @type {Map<string, object>} */
let readyById = new Map();
let activeCardId = '';
let actionBusy = false;

const cardModal = dialogEl && window.StarlightUI?.adoptModal
  ? window.StarlightUI.adoptModal(dialogEl, {
      dialog: dialogEl.querySelector('.st-dialog'),
      labelledBy: 'st-evo-card-title',
      describedBy: 'st-evo-card-body',
      initialFocus: dialogCloseEl,
      onClose: () => {
        activeCardId = '';
      }
    })
  : null;

const resultModal = resultModalEl && window.StarlightUI?.adoptModal
  ? window.StarlightUI.adoptModal(resultModalEl, {
      dialog: resultModalEl.querySelector('.st-dialog'),
      labelledBy: 'st-evo-result-title',
      describedBy: 'st-evo-result-body',
      initialFocus: resultDoneEl,
      closeOnBackdrop: true
    })
  : null;

function resetAscendStage() {
  if (!resultStageEl) return;
  resultStageEl.classList.remove('is-summon', 'is-channel', 'is-ascend', 'is-transcend', 'is-crown', 'is-reveal', 'is-complete');
  resultStageEl.removeAttribute('data-tier');
  clearAscendAura();
}

function clearAscendAura() {
  if (!resultAuraEl) return;
  resultAuraEl.style.removeProperty('background-image');
}

function setAscendAura(imageUrl) {
  if (!resultAuraEl) return;
  const safeUrl = String(imageUrl || '').trim();
  if (!safeUrl) {
    clearAscendAura();
    return;
  }
  resultAuraEl.style.backgroundImage = `url("${safeUrl.replace(/"/g, '\\"')}")`;
}

function setAscendTierAccent(tier) {
  if (!resultStageEl) return;
  const token = String(tier || '').replace(/_/g, '-');
  if (token) resultStageEl.setAttribute('data-tier', token);
}

function setResultCardArt(imageUrl, cardName, tier) {
  if (!resultArtEl) return;
  const frame = prestigeClassName(tier);
  resultArtEl.className = `st-evo-ascend-card ${frame}`.trim();
  resultArtEl.innerHTML = imageUrl
    ? `<span class="collection-image"><img src="${esc(imageUrl)}" alt="${esc(cardName)}" draggable="false"></span>`
    : '';
}

function applyResultMeta({ cardName, toTier, label }, visible = true) {
  const tierToken = String(toTier).replace(/_/g, '-');
  const safeLabel = label || prestigeLabel(toTier);
  if (resultTierEl) {
    resultTierEl.hidden = !visible;
    resultTierEl.innerHTML = `<span class="prestige-badge prestige-${esc(tierToken)}">${esc(safeLabel)}</span>`;
  }
  if (resultNameEl) {
    resultNameEl.hidden = !visible;
    resultNameEl.textContent = cardName;
  }
  if (resultTitleEl && visible) {
    resultTitleEl.textContent = 'Evolution complete!';
  }
}

async function playAscendSequence({ cardName, imageUrl, fromTier, toTier, label }) {
  const sourceTier = fromTier || toTier;
  resetAscendStage();
  applyResultMeta({ cardName, toTier, label }, false);
  setAscendAura(imageUrl);
  setResultCardArt(imageUrl, cardName, sourceTier);

  if (preferReducedMotion()) {
    if (resultTitleEl) resultTitleEl.textContent = 'Evolution complete!';
    setAscendTierAccent(toTier);
    setResultCardArt(imageUrl, cardName, toTier);
    applyResultMeta({ cardName, toTier, label }, true);
    resultStageEl?.classList.add('is-complete');
    return;
  }

  if (resultTitleEl) resultTitleEl.textContent = 'Enhancing…';
  resultStageEl?.classList.add('is-summon');
  await wait(580);
  resultStageEl?.classList.remove('is-summon');
  resultStageEl?.classList.add('is-channel');
  if (resultTitleEl) resultTitleEl.textContent = 'Channeling Starlight…';
  await wait(1180);
  resultStageEl?.classList.remove('is-channel');
  resultStageEl?.classList.add('is-ascend');
  if (resultTitleEl) resultTitleEl.textContent = 'Ascending…';
  await wait(980);
  resultStageEl?.classList.remove('is-ascend');
  resultStageEl?.classList.add('is-transcend');
  setAscendTierAccent(toTier);
  setResultCardArt(imageUrl, cardName, toTier);
  await wait(820);
  resultStageEl?.classList.remove('is-transcend');
  resultStageEl?.classList.add('is-crown');
  await wait(420);
  resultStageEl?.classList.add('is-reveal');
  applyResultMeta({ cardName, toTier, label }, true);
  await wait(300);
  resultStageEl?.classList.add('is-complete');
}

function preferReducedMotion() {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function showEvolutionResult({ cardName, imageUrl, fromTier, toTier, label }) {
  const safeLabel = label || prestigeLabel(toTier);

  if (!resultModal) {
    toast(`${cardName} evolved to ${safeLabel}!`, 'success');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const finish = () => {
      resetAscendStage();
      resolve();
    };

    resultModalEl?.addEventListener('starlight:modal-close', finish, { once: true });
    resultModal.open({ initialFocus: resultDoneEl || resultCloseEl });
    playAscendSequence({ cardName, imageUrl, fromTier, toTier, label });
  });
}

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

function mapOwnedRow(row, byId) {
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
}

function normalizeOwnedRows(cards, byId) {
  return (cards || [])
    .map((row) => mapOwnedRow(row, byId))
    .filter((card) => card.id && tierRank(card.tier) > 0)
    .sort((a, b) => tierRank(b.tier) - tierRank(a.tier) || a.name.localeCompare(b.name));
}

function normalizeReadyRows(cards, byId) {
  return (cards || [])
    .map((row) => mapOwnedRow(row, byId))
    .filter((card) => card.id && card.tier === 'stardust' && canEvolve(card.quantity, card.tier))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
}

function cardById(cardId) {
  const id = String(cardId || '').trim();
  return ownedById.get(id) || readyById.get(id) || null;
}

function renderOwnedCardButton(card, { readyFirstEvolution = false } = {}) {
  const frame = prestigeClassName(card.tier);
  const label = prestigeLabel(card.tier);
  const tierToken = String(card.tier).replace(/_/g, '-');
  const ready = canEvolve(card.quantity, card.tier);
  const next = nextEvolutionTier(card.tier);
  const nextLabel = next ? prestigeLabel(next) : '';
  const readyNote = readyFirstEvolution && nextLabel
    ? `<span class="st-evo-ready-chip">Evolve to ${esc(nextLabel)}</span>`
    : (ready ? '<span class="st-evo-ready-chip">Ready to evolve</span>' : '');
  return `<button type="button" class="st-evo-owned-card${ready ? ' is-ready' : ''}" data-evo-open-card="${esc(card.id)}" aria-label="Open ${esc(card.name)} evolution details">
      <span class="collection-image ${esc(frame)}"><img src="${esc(card.imageUrl)}" alt="" loading="lazy" onerror="this.style.opacity='0.35'"></span>
      <strong>${esc(card.name)}</strong>
      <div class="st-evo-owned-meta">
        ${card.tier !== 'stardust' ? `<span class="prestige-badge prestige-${esc(tierToken)}">${esc(label)}</span>` : '<span class="prestige-badge">Standard</span>'}
        <span class="qty">×${card.quantity}</span>
        ${readyNote}
      </div>
    </button>`;
}

function renderGrid(evolved) {
  if (!gridEl) return;
  ownedById = new Map(evolved.map((card) => [card.id, card]));

  if (!evolved.length) {
    gridEl.hidden = true;
    gridEl.innerHTML = '';
    setStatus(document.querySelector('[data-content="starlightEvolution.ownedEmpty"]')?.textContent
      || 'No evolved cards yet. When a card is ready below, Evolve it to see its Radiance frame here.');
    return;
  }

  gridEl.innerHTML = evolved.map((card) => renderOwnedCardButton(card)).join('');
  gridEl.hidden = false;
  setStatus(`${evolved.length} evolved card${evolved.length === 1 ? '' : 's'}.`);
}

function renderReadyGrid(ready) {
  if (!readyGridEl) return;
  readyById = new Map(ready.map((card) => [card.id, card]));

  if (!ready.length) {
    readyGridEl.hidden = true;
    readyGridEl.innerHTML = '';
    if (readyStatusEl) {
      readyStatusEl.hidden = false;
      readyStatusEl.textContent = document.querySelector('[data-content="starlightEvolution.readyEmpty"]')?.textContent
        || 'No cards are ready right now. Gather more duplicate extras in your album, then check back here.';
    }
    return;
  }

  readyGridEl.innerHTML = ready.map((card) => renderOwnedCardButton(card, { readyFirstEvolution: true })).join('');
  readyGridEl.hidden = false;
  if (readyStatusEl) {
    readyStatusEl.hidden = false;
    readyStatusEl.textContent = `${ready.length} card${ready.length === 1 ? '' : 's'} ready for first Evolution.`;
  }
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
    evolveBlock = `<p class="st-evo-detail-note">This card is already at Radiance V.</p>`;
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
  const card = cardById(id);
  if (!card || !cardModal) return;
  activeCardId = id;
  renderCardDetail(card);
  cardModal.open({ initialFocus: dialogCloseEl });
}

function closeCardDetail() {
  cardModal?.close();
}

async function confirmEvolve(card) {
  const next = nextEvolutionTier(card.tier);
  const cost = evolutionCostForNextTier(card.tier);
  if (!next || cost == null) {
    toast('This card is already at Radiance V.', 'info');
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
  const card = cardById(String(cardId || '').trim());
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
    await showEvolutionResult({
      imageUrl: card.imageUrl,
      cardName: card.name,
      fromTier: card.tier,
      toTier,
      label: nextLabel
    });
    await renderOwned();
  } catch (error) {
    toast(error?.message || error?.error_description || 'Evolution failed.', 'error');
  } finally {
    actionBusy = false;
  }
}

async function handleUnfuse(cardId) {
  if (actionBusy) return;
  const card = cardById(String(cardId || '').trim());
  if (!card) return;
  const prev = previousEvolutionTier(card.tier);
  const refund = evolutionUnfuseRefund(card.tier);
  if (!prev || refund == null) {
    toast('This card has not been evolved yet.', 'info');
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
    const refreshed = cardById(card.id);
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
  if (readyGridEl) {
    readyGridEl.hidden = true;
    readyGridEl.innerHTML = '';
  }
  if (readyStatusEl) {
    readyStatusEl.hidden = true;
    readyStatusEl.textContent = '';
  }

  try {
    const [{ cards, error }, byId] = await Promise.all([
      loadCloudCollection(),
      catalogById()
    ]);
    if (error) throw error;
    const evolved = normalizeOwnedRows(cards, byId);
    const ready = normalizeReadyRows(cards, byId);
    renderGrid(evolved);
    renderReadyGrid(ready);
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

readyGridEl?.addEventListener('click', (event) => {
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

void renderOwned();
