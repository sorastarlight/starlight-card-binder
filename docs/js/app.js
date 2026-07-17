const FALLBACK_JSON_URL = "data/cards.json";
const CARD_BACK_URL = "site_assets/StarlightCard_Back_NewLogo.png";
const REVEAL_CARD_BACK_URL = "/site_assets/StarlightCard_Back_NewLogo.png";
const BOOSTER_PACK_URL = "site_assets/series01_rising_star_booster.png";
const SFX = {
  flip: "site_assets/sfx/card-flip.wav",
  reveal: "site_assets/sfx/starlight-reveal.wav",
  page: "site_assets/sfx/page-turn.wav",
  sparkle: "site_assets/sfx/sparkle-chime.wav",
  pack: "site_assets/sfx/booster-open.wav",
  charge: "site_assets/sfx/cosmic-charge.wav",
  legendary: "site_assets/sfx/legendary-reveal.wav",
  favorite: "site_assets/sfx/favorite-heart.wav",
  reset: "site_assets/sfx/Sakura_Hoe_Reset.wav",
  hover: "site_assets/sfx/card_mouse_over.wav",
  analyze: "site_assets/sfx/card_analyze.wav"
};
const STORAGE_KEY = "sora-starlight-card-binder-v5-collected";
const FAVORITES_KEY = "sora-starlight-card-binder-v5-favorites";
const QUANTITIES_KEY = "sora-starlight-card-binder-v80-quantities";
const SFX_KEY = "sora-starlight-card-binder-v7-sfx";
const CARD_CACHE_KEY = "sora-starlight-card-binder-v66-card-cache";
const PER_PAGE = 18;
const RARITY_SCORE = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };

let cards = [];
let filtered = [];
let page = 1;
let selectedIndex = 0;
let selected = null;
let sfxOn = localStorage.getItem(SFX_KEY) !== "off";
let previewFlipped = false;
let overlayFlipped = false;
let revealTimers = [];
let fullViewList = [];

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const pageName = document.body.dataset.page || "binder";

function esc(v) { return String(v ?? "").replace(/[&<>'"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#039;",'"':"&quot;"}[m])); }
function readStore(key) { try { return JSON.parse(localStorage.getItem(key)) || {}; } catch { return {}; } }
function writeStore(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function isCollected(id) { return !!readStore(STORAGE_KEY)[id]; }
function isFavorite(id) { return !!readStore(FAVORITES_KEY)[id]; }
function getCardQuantity(id) { return Math.max(isCollected(id) ? 1 : 0, Number(readStore(QUANTITIES_KEY)[id] || 0)); }
function quantityBadgesHtml(id) { const q=getCardQuantity(id); if(q<=0) return ""; return `<span class="quantity-badge">×${q}</span>${q>1?`<span class="duplicate-badge">+${q-1} Extra</span>`:""}`; }
function binderRarityBadgeHtml(card) { const label=String(card?.rarity || 'Common'); return `<span class="binder-rarity-badge ${rarityClass(card)}">${esc(label)}</span>`; }
function percent(part, total) { return total ? Math.round((part / total) * 100) : 0; }
function padNumber(value, fallback) { return String(value || fallback).padStart(3, "0"); }
function rarityClass(card) { return `rarity-${String(card?.rarity || "common").toLowerCase().replace(/[^a-z0-9]/g, '')}`; }
function displayName(card) { return String(card?.name || '').trim() || `Card ${card?.number || ''}`.trim(); }
function revealButtonHtml() { return ''; }
function revealBigButtonHtml() { return ''; }

function taxonomyLabel(name, id, fallback = '') {
  const raw = String(name || id || fallback || '').trim();
  if (!raw) return '';
  return raw
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, m => m.toUpperCase());
}
function categoryLabel(card) { return taxonomyLabel(card?.categoryName, card?.categoryId, 'Uncategorized'); }
function subcategoryLabel(card) { return taxonomyLabel(card?.subcategoryName, card?.subcategoryId); }
function variantLabel(card) { return taxonomyLabel(card?.variantName, card?.variantId, 'Standard Art'); }
function finishLabel(card) { return taxonomyLabel(card?.finishName, card?.finishId, 'Standard'); }
function distributionLabel(card) {
  const labels = {
    booster_pull: 'Booster Pull', redeem_code: 'Redeem Code', twitch_reward: 'Twitch Reward',
    event_reward: 'Event Reward', admin_gift: 'Admin Gift', promo: 'Promo', special: 'Special Distribution'
  };
  return labels[String(card?.distributionType || '').toLowerCase()] || taxonomyLabel('', card?.distributionType, 'Booster Pull');
}
function isStandardMeta(value) {
  return ['standard', 'standard art', 'booster pull', 'published'].includes(String(value || '').trim().toLowerCase());
}
function cardIdentityChips(card, { full = false, hidden = false } = {}) {
  if (hidden) return `<span class="card-meta-chip muted">Details unlock when collected</span>`;
  const chips = [
    `<span class="card-meta-chip rarity ${rarityClass(card)}">${esc(card?.rarity || 'Common')}</span>`,
    `<span class="card-meta-chip category">${esc(categoryLabel(card))}</span>`
  ];
  const sub = subcategoryLabel(card);
  if (sub) chips.push(`<span class="card-meta-chip subcategory">${esc(sub)}</span>`);
  const variant = variantLabel(card);
  const finish = finishLabel(card);
  if (full || !isStandardMeta(variant)) chips.push(`<span class="card-meta-chip variant">${esc(variant)}</span>`);
  if (full || !isStandardMeta(finish)) chips.push(`<span class="card-meta-chip finish">${esc(finish)}</span>`);
  return chips.join('');
}
function cardExpandedDetails(card) {
  const rows = [];
  const distribution = distributionLabel(card);
  if (distribution) rows.push(`<p><b>Distribution</b><span>${esc(distribution)}</span></p>`);
  if (card?.isPromo) rows.push(`<p><b>Special Status</b><span>Promo Card</span></p>`);
  if (card?.isEventExclusive) rows.push(`<p><b>Special Status</b><span>Event Exclusive</span></p>`);
  if (card?.availableFrom || card?.availableUntil) {
    const from = card.availableFrom ? new Date(card.availableFrom).toLocaleDateString() : 'Always';
    const until = card.availableUntil ? new Date(card.availableUntil).toLocaleDateString() : 'No end date';
    rows.push(`<p><b>Availability</b><span>${esc(from)} – ${esc(until)}</span></p>`);
  }
  if (Array.isArray(card?.tags) && card.tags.length) {
    rows.push(`<div class="card-tag-row">${card.tags.slice(0, 8).map(tag => `<span>${esc(tag)}</span>`).join('')}</div>`);
  }
  return rows.join('');
}

const activeSfx = {};
let lastHoverSfxAt = 0;
let lastHoverSfxId = '';
function playSfx(name, sourceId = '') {
  if (!sfxOn || !SFX[name]) return;
  if (name === 'hover') {
    const now = Date.now();
    // V49: binder hover sound should feel responsive, but not spammy.
    // It can replay on each new card entry, with a tiny global cooldown only.
    if (sourceId && sourceId === lastHoverSfxId && now - lastHoverSfxAt < 650) return;
    if (now - lastHoverSfxAt < 120) return;
    lastHoverSfxAt = now;
    lastHoverSfxId = sourceId || '';
  }
  try {
    if (activeSfx[name]) {
      activeSfx[name].pause();
      activeSfx[name].currentTime = 0;
    }
    const audio = new Audio(SFX[name]);
    activeSfx[name] = audio;
    audio.volume = name === 'hover' ? 0.24 : name === 'reset' ? 0.55 : name === 'legendary' ? 0.50 : (name === 'reveal' || name === 'charge' || name === 'pack' ? 0.42 : 0.28);
    audio.addEventListener('ended', () => { if (activeSfx[name] === audio) delete activeSfx[name]; }, { once: true });
    audio.play().catch(() => {});
  } catch {}
}


function attachTiltTo(el, options = {}) {
  if (!el || el.dataset.tiltReady === '1') return;
  el.dataset.tiltReady = '1';
  const max = Number(options.max || 10);
  let dragging = false;
  let lastX = 0, lastY = 0;
  const setTilt = (clientX, clientY) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const px = (clientX - r.left) / r.width - 0.5;
    const py = (clientY - r.top) / r.height - 0.5;
    const rx = Math.max(-max, Math.min(max, -py * max * 2));
    const ry = Math.max(-max, Math.min(max, px * max * 2));
    el.style.setProperty('--tilt-x', `${rx}deg`);
    el.style.setProperty('--tilt-y', `${ry}deg`);
    el.classList.add('tilting');
  };
  el.addEventListener('pointermove', (e) => {
    if (options.drag && !dragging && e.pointerType !== 'mouse') return;
    if (options.drag && dragging) {
      lastX += e.movementX || 0;
      lastY += e.movementY || 0;
      lastX = Math.max(-38, Math.min(38, lastX));
      lastY = Math.max(-38, Math.min(38, lastY));
      el.style.setProperty('--drag-x', `${lastX}px`);
      el.style.setProperty('--drag-y', `${lastY}px`);
    }
    setTilt(e.clientX, e.clientY);
  });
  el.addEventListener('pointerenter', (e) => setTilt(e.clientX, e.clientY));
  el.addEventListener('pointerleave', () => {
    if (!dragging) {
      el.style.setProperty('--tilt-x', '0deg');
      el.style.setProperty('--tilt-y', '0deg');
      el.classList.remove('tilting');
    }
  });
  if (options.drag) {
    el.addEventListener('pointerdown', (e) => {
      dragging = true;
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('is-dragging');
      setTilt(e.clientX, e.clientY);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
      el.classList.remove('is-dragging');
    };
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
  }
}

function attachTileTilts() {
  // V45: binder thumbnails no longer use pointer-tracking tilt.
  // The binder effect is pure CSS now: gentle idle float + clean pop/wobble on hover.
  // This prevents transform systems from fighting each other and causing jitter.
  $$('.collection-card, .fav-spot').forEach(el => attachTiltTo(el, { max: 5, drag: false }));
}

function attachBinderHoverSfx() { return; }



function normalize(row, i) {
  const number = padNumber(row.number || row.cardNumber || row.card || row.cardNumberInSeries, i + 1);
  const seriesId = String(row.seriesId || row.seriesID || row.setId || row.setID || "").trim();
  const seriesNameRaw = String(row.seriesName || row.setName || "").trim();
  const legacySeries = String(row.series || "Series 01: Rising Star").trim();
  const seriesName = seriesNameRaw || legacySeries.replace(/^Series\s*\d+\s*:\s*/i, "").trim() || legacySeries;
  const series = seriesId
    ? `Series ${String(seriesId).padStart(2, "0")}: ${seriesName}`
    : legacySeries;
  const seriesSort = Number(row.seriesSort || row.seriesOrder || row.setSort || seriesId || i + 1) || (i + 1);
  return {
    id: String(row.id || row.ID || `card-${seriesId || "series"}-${number}`).trim(),
    number,
    name: String(row.name || row.cardName || ``).trim(),
    series,
    seriesId,
    seriesName,
    seriesSort,
    seriesDescription: String(row.seriesDescription || row.setDescription || "").trim(),
    boosterImageUrl: String(row.boosterImageUrl || row.boosterImageURL || row.packImageUrl || row.packImageURL || BOOSTER_PACK_URL).trim(),
    rarity: String(row.rarity || "Common").trim(),
    categoryId: String(row.categoryId || row.category_id || "").trim(),
    categoryName: String(row.categoryName || row.category_name || "").trim(),
    subcategoryId: String(row.subcategoryId || row.subcategory_id || "").trim(),
    subcategoryName: String(row.subcategoryName || row.subcategory_name || "").trim(),
    variantId: String(row.variantId || row.variant_id || "").trim(),
    variantName: String(row.variantName || row.variant_name || "").trim(),
    finishId: String(row.finishId || row.finish_id || "").trim(),
    finishName: String(row.finishName || row.finish_name || "").trim(),
    collectorNumber: String(row.collectorNumber || row.collector_number || number).trim(),
    distributionType: String(row.distributionType || row.distribution_type || "booster_pull").trim(),
    publishStatus: String(row.publishStatus || row.publish_status || "published").trim(),
    tags: Array.isArray(row.tags) ? row.tags : [],
    isPromo: Boolean(row.isPromo ?? row.is_promo ?? false),
    isEventExclusive: Boolean(row.isEventExclusive ?? row.is_event_exclusive ?? false),
    availableFrom: String(row.availableFrom || row.available_from || "").trim(),
    availableUntil: String(row.availableUntil || row.available_until || "").trim(),
    imageUrl: String(row.imageUrl || row.imageURL || row.image || CARD_BACK_URL).trim(),
    thumbnailUrl: String(row.thumbnailUrl || row.thumbnail || row.thumb || row.imageUrl || row.imageURL || row.image || CARD_BACK_URL).trim(),
    cardDescription: String(row.cardDescription || row.description || row.lore || "A mysterious Starlight card waiting to sparkle.").trim(),
    artist: String(row.artist || row.Artist || "Starlight Studio").trim()
  };
}

function applyLoadedCards(data, fromCache = false) {
  const normalized = Array.isArray(data) ? data.map(normalize).filter(c => c.id && c.number) : [];
  if (!normalized.length) return;
  cards = normalized;
  sortCards(cards, "numberAsc");
  selected = cards.find(c => c.id === selected?.id) || cards[0] || null;
  selectedIndex = Math.max(0, cards.findIndex(c => c.id === selected?.id));
  hydrateFilters();
  renderAll();
  warmCriticalAssets();
  scheduleIdleImagePreload();
  // Card metadata is cached by card-catalog-service.js.
  // app.js no longer maintains a second catalog cache.
}

function warmCriticalAssets() {
  const seen = new Set();
  const urls = [CARD_BACK_URL, BOOSTER_PACK_URL, ...getSeriesGroups().map(g => g.boosterImageUrl)];
  cards.slice(0, PER_PAGE).forEach(c => {
    urls.push(c.thumbnailUrl);
    if (isCollected(c.id)) urls.push(c.imageUrl);
  });
  for (const url of urls.filter(Boolean)) {
    if (seen.has(url)) continue;
    seen.add(url);
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;
  }
}


function scheduleIdleImagePreload() {
  try {
    const urls = [];
    const push = (url) => { if (url && !urls.includes(url)) urls.push(url); };

    // First-load rule: warm chrome, booster art, and currently visible card art only.
    push(CARD_BACK_URL);
    push(typeof REVEAL_CARD_BACK_URL !== 'undefined' ? REVEAL_CARD_BACK_URL : null);
    push(BOOSTER_PACK_URL);
    getSeriesGroups().forEach(group => push(group.boosterImageUrl));

    const visibleSeries = ($('[data-series]')?.value || 'All Series');
    const firstVisibleCards = (visibleSeries === 'All Series'
      ? cards.slice(0, PER_PAGE)
      : cards.filter(c => c.series === visibleSeries).slice(0, PER_PAGE));
    firstVisibleCards.forEach(c => {
      push(c.thumbnailUrl);
      if (isCollected(c.id)) push(c.imageUrl);
    });

    const run = () => preloadImagesInBatches(urls, 4);
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1800 });
    else window.setTimeout(run, 250);
  } catch (_) {}
}

function preloadImagesInBatches(urls, batchSize = 4) {
  let index = 0;
  const loadNext = () => {
    urls.slice(index, index + batchSize).forEach(url => {
      try {
        const img = new Image();
        img.decoding = 'async';
        img.loading = 'lazy';
        img.src = url;
      } catch (_) {}
    });
    index += batchSize;
    if (index < urls.length) window.setTimeout(loadNext, 90);
  };
  loadNext();
}

function warmCardForReveal(card) {
  if (!card) return;
  [CARD_BACK_URL, (typeof REVEAL_CARD_BACK_URL !== 'undefined' ? REVEAL_CARD_BACK_URL : null), card.thumbnailUrl, card.imageUrl].filter(Boolean).forEach(url => {
    try {
      const img = new Image();
      img.decoding = "async";
      img.loading = "eager";
      img.src = url;
    } catch (_) {}
  });
}

function ensureImageReady(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    if (img.complete && img.naturalWidth > 0) resolve(true);
  });
}

async function loadCards(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  let renderedFromCache = false;
  const catalogService = window.StarlightCardCatalog;

  if (!forceRefresh && catalogService?.getCached) {
    try {
      const cached = catalogService.getCached();
      if (cached?.cards?.length) {
        applyLoadedCards(cached.cards, true);
        renderedFromCache = true;
      }
    } catch (_) {}
  }

  try {
    if (!catalogService?.fetchFresh) {
      throw new Error("The Supabase card catalog service is unavailable.");
    }

    const fresh = await catalogService.fetchFresh();
    applyLoadedCards(fresh.cards, false);
    return;
  } catch (error) {
    console.error("[Starlight] Supabase card catalog load failed.", error);

    if (renderedFromCache) {
      return;
    }

    // Emergency offline fallback only. This file is no longer the live source.
    const response = await fetch(FALLBACK_JSON_URL, { cache: "no-cache" });
    if (!response.ok) {
      throw error;
    }
    const data = await response.json();
    applyLoadedCards(data, false);
  }
}

async function refreshCardCatalog() {
  try {
    await loadCards({ forceRefresh: true });
  } catch (error) {
    console.error("[Starlight] Card catalog refresh failed.", error);
  }
}

window.refreshStarlightCardCatalog = refreshCardCatalog;

window.addEventListener("starlight-card-catalog-updated", () => {
  refreshCardCatalog();
});

function sortCards(list, mode) {
  list.sort((a, b) => {
    if (mode === "numberDesc") return b.number.localeCompare(a.number, undefined, { numeric: true });
    if (mode === "nameAsc") return a.name.localeCompare(b.name);
    if (mode === "rarityDesc") return (RARITY_SCORE[b.rarity] || 0) - (RARITY_SCORE[a.rarity] || 0) || a.number.localeCompare(b.number, undefined, { numeric: true });
    return a.number.localeCompare(b.number, undefined, { numeric: true });
  });
}


function getSeriesGroups() {
  const map = new Map();
  cards.forEach(card => {
    const key = card.series || "Series";
    if (!map.has(key)) {
      map.set(key, {
        series: key,
        seriesId: card.seriesId || "",
        seriesName: card.seriesName || key,
        seriesSort: Number(card.seriesSort || 9999),
        seriesDescription: card.seriesDescription || "",
        boosterImageUrl: card.boosterImageUrl || BOOSTER_PACK_URL,
        cards: []
      });
    }
    const group = map.get(key);
    group.cards.push(card);
    if (!group.seriesDescription && card.seriesDescription) group.seriesDescription = card.seriesDescription;
    if ((!group.boosterImageUrl || group.boosterImageUrl === BOOSTER_PACK_URL) && card.boosterImageUrl) group.boosterImageUrl = card.boosterImageUrl;
    group.seriesSort = Math.min(group.seriesSort, Number(card.seriesSort || group.seriesSort || 9999));
  });
  return [...map.values()].sort((a, b) => (a.seriesSort - b.seriesSort) || a.series.localeCompare(b.series, undefined, { numeric: true }));
}

function hydrateFilters() {
  const series = ["All Series", ...getSeriesGroups().map(g => g.series)];
  $$('[data-series]').forEach(select => select.innerHTML = series.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join(""));
}

function activeFilters() {
  return {
    q: ($('#globalSearch')?.value || '').trim().toLowerCase(),
    series: ($('[data-series]')?.value || 'All Series'),
    rarity: ($('[data-rarity]')?.value || 'All Rarities'),
    view: ($('[name="viewFilter"]:checked')?.value || 'all'),
    sort: ($('#sortSelect')?.value || 'numberAsc')
  };
}

function applyFilters() {
  const f = activeFilters();
  filtered = cards.filter(c => {
    const hay = `${c.number} ${c.name} ${c.series} ${c.rarity} ${c.cardDescription} ${c.artist}`.toLowerCase();
    const seriesOk = f.series === 'All Series' || c.series === f.series;
    const rarityOk = f.rarity === 'All Rarities' || String(c.rarity || '').trim().toLowerCase() === String(f.rarity || '').trim().toLowerCase();
    const queryOk = !f.q || hay.includes(f.q);
    const viewOk = f.view === 'all' || (f.view === 'collected' ? isCollected(c.id) : !isCollected(c.id));
    return seriesOk && rarityOk && queryOk && viewOk;
  });
  sortCards(filtered, f.sort);
  const max = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  if (page > max) page = max;
}

function getVisibleImage(card) { return isCollected(card.id) ? card.imageUrl : CARD_BACK_URL; }
function getVisibleName(card) { return isCollected(card.id) ? displayName(card) : "???"; }
function getVisibleRarity(card) { return isCollected(card.id) ? card.rarity : "Unknown"; }
function getVisibleDescription(card) { return isCollected(card.id) ? card.cardDescription : "This card has not been collected yet. Earn it from Daily Boosters, reward codes, or future events."; }

function setCollected(id, value) {
  const store = readStore(STORAGE_KEY);
  if (value) store[id] = true; else delete store[id];
  writeStore(STORAGE_KEY, store);
}
function toggleCollected(id) {
  console.warn('[Starlight] Manual ownership changes are disabled. Cards are earned through rewards.');
  selected = cards.find(c => c.id === id) || selected;
  selectedIndex = cards.findIndex(c => c.id === id);
  renderAll();
}
function toggleFavorite(id) {
  const store = readStore(FAVORITES_KEY);
  if (store[id]) delete store[id]; else store[id] = true;
  writeStore(FAVORITES_KEY, store);
  playSfx('favorite');
  renderAll();
}
function burstFor(id) {
  const tile = $(`.card-tile[data-id="${CSS.escape(id)}"]`);
  if (!tile) return;
  tile.classList.add('reveal-burst');
  setTimeout(() => tile.classList.remove('reveal-burst'), 1200);
}

function startRevealAnimation(card) {
  if (!card) return;
  const frontUrl = card.imageUrl || card.thumbnailUrl || CARD_BACK_URL;
  warmCardForReveal(card);
  Promise.all([ensureImageReady(typeof REVEAL_CARD_BACK_URL !== 'undefined' ? REVEAL_CARD_BACK_URL : CARD_BACK_URL), ensureImageReady(frontUrl)]).then(([_, ok]) => {
    runRevealAnimation(card, ok ? frontUrl : (card.thumbnailUrl || CARD_BACK_URL));
  });
}

function runRevealAnimation(card, forcedFrontUrl) {
  if (!card) return;
  warmCardForReveal(card);
  selected = card;
  selectedIndex = cards.findIndex(c => c.id === card.id);
  clearRevealTimers();

  const overlay = $('#revealOverlay') || createRevealOverlay();
  const r = String(card.rarity || 'Common').toLowerCase();
  const finalSfx = r === 'legendary' ? 'legendary' : 'reveal';

  const legendaryFx = r === 'legendary'
    ? `<div class="legendary-charge-field" aria-hidden="true"><span></span><span></span><span></span></div><div class="legendary-magic-explosion" aria-hidden="true">${Array.from({length: 18}, () => '<i></i>').join('')}</div>`
    : '';

  overlay.innerHTML = `<div class="reveal-clean ${rarityClass(card)}" role="dialog" aria-modal="true">
    <button class="reveal-clean-close" type="button" aria-label="Close reveal">×</button>
    <div class="reveal-magic-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <div class="reveal-clean-stars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
    ${legendaryFx}
    <div class="v27-reveal-ribbons" aria-hidden="true"><i></i><i></i><i></i></div>
    <div class="v27-reveal-orbit" aria-hidden="true"></div>
    <div class="reveal-clean-card" aria-live="polite">
      <div class="reveal-clean-inner">
        <div class="reveal-clean-face reveal-clean-back"><img src="${REVEAL_CARD_BACK_URL}" alt="Card back" loading="eager" decoding="sync" onerror="this.src=\'site_assets/StarlightCard_Back_NewLogo.png\'"></div>
        <div class="reveal-clean-face reveal-clean-front"><img src="${esc(forcedFrontUrl || card.imageUrl || card.thumbnailUrl || CARD_BACK_URL)}" alt="${esc(displayName(card))}" loading="eager" decoding="async" onerror="this.src='${CARD_BACK_URL}'"></div>
      </div>
    </div>
    <div class="reveal-clean-copy">
      <h2 class="reveal-clean-title">Card of Starlight... RELEASE!</h2>
      <div class="reveal-card-info" aria-live="polite">
        <h3>${esc(displayName(card))}</h3>
        <p class="reveal-info-rarity rarity-text ${rarityClass(card)}">${esc(card.rarity)}</p>
      </div>
    </div>
  </div>`;

  overlay.classList.add('open', 'clean-open', 'is-animating');
  overlay.classList.remove('is-finished');
  document.body.classList.add('modal-open');

  const stage = $('.reveal-clean', overlay);
  const cardWrap = $('.reveal-clean-card', overlay);

  const finish = () => {
    clearRevealTimers();
    cardWrap?.classList.add('flipped', 'revealed');
    stage?.classList.add('phase-charge', 'phase-burst', 'phase-revealed');
    overlay.classList.remove('is-animating');
    overlay.classList.add('is-finished');
    renderAll();
  };
  overlay._skipReveal = finish;

  playSfx('charge');
  revealTimers.push(setTimeout(() => {
    stage?.classList.add('phase-charge');
    cardWrap?.classList.add('charge');
  }, 350));
  revealTimers.push(setTimeout(() => {
    stage?.classList.add('phase-burst');
    cardWrap?.classList.add('burst');
    playSfx('flip');
  }, 1900));
  revealTimers.push(setTimeout(() => {
    cardWrap?.classList.add('flipped', 'revealed');
    stage?.classList.add('phase-revealed');
    playSfx(finalSfx);
  }, 2850));
  revealTimers.push(setTimeout(() => {
    overlay.classList.remove('is-animating');
    overlay.classList.add('is-finished');
    renderAll();
  }, 4100));

  overlay.addEventListener('pointerdown', revealSkipHandler);
  $('.reveal-clean-close', overlay)?.addEventListener('click', () => completeReveal(card.id));
}

function revealSkipHandler(e) {
  const overlay = $('#revealOverlay');
  if (!overlay) return;
  if (e.target.closest('.reveal-clean-close')) { completeReveal(selected?.id); return; }
  if (overlay.classList.contains('is-animating')) {
    overlay._skipReveal?.();
    return;
  }
  if (overlay.classList.contains('open')) completeReveal(selected?.id);
}

function clearRevealTimers() { revealTimers.forEach(t => clearTimeout(t)); revealTimers = []; }
function createRevealOverlay() { const div = document.createElement('div'); div.id = 'revealOverlay'; document.body.appendChild(div); return div; }
function completeReveal(id) {
  clearRevealTimers();
  const overlay = $('#revealOverlay');
  if (overlay) {
    overlay.classList.remove('open', 'clean-open', 'is-animating', 'is-finished');
    overlay.removeEventListener('pointerdown', revealSkipHandler);
    overlay._skipReveal = null;
  }
  document.body.classList.remove('modal-open');
  renderAll();
  if (id) burstFor(id);
}

function renderShell() {
  const total = cards.length;
  const got = cards.filter(c => isCollected(c.id)).length;
  const p = percent(got, total);
  $$('[data-total]').forEach(e => e.textContent = total);
  $$('[data-collected]').forEach(e => e.textContent = got);
  $$('[data-percent]').forEach(e => e.textContent = `${p}%`);
  $$('[data-progress]').forEach(e => e.style.width = `${p}%`);
  const mini = $('#miniSeries');
  if (mini) {
    const groups = [...new Set(cards.map(c => c.series))];
    mini.innerHTML = groups.map(series => {
      const list = cards.filter(c => c.series === series);
      const count = list.filter(c => isCollected(c.id)).length;
      return `<div class="mini-row"><b><span>${esc(series)}</span><span>${count} / ${list.length}</span></b><div class="bar"><span style="width:${percent(count, list.length)}%"></span></div></div>`;
    }).join("");
  }
  $('#sfxToggle')?.classList.toggle('on', sfxOn);
}

function getPageCards() { applyFilters(); return filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE); }

function renderSeriesHero() {
  const f = activeFilters();
  const title = $('#seriesHeroTitle');
  const desc = $('#seriesHeroDescription');
  const stats = $('#seriesHeroStats');
  if (!title || !desc) return;
  const inSeriesSelect = document.body.classList.contains('series-select');
  const list = f.series === 'All Series' ? cards : cards.filter(c => c.series === f.series);
  const got = list.filter(c => isCollected(c.id)).length;
  if (inSeriesSelect || f.series === 'All Series') {
    title.textContent = 'Starlight Card Series Binder 📦';
    desc.textContent = 'Choose a booster pack to enter that series binder.';
  } else {
    title.textContent = `${f.series} ⭐`;
    desc.textContent = list.find(c => c.seriesDescription)?.seriesDescription || '';
  }
  if (stats) {
    const rarityBits = ['Common','Uncommon','Rare','Epic','Legendary'].map(r => {
      const n = list.filter(c => c.rarity === r).length;
      return n ? `<span class="hero-pill rarity-pill rarity-${r.toLowerCase()}">${r}: ${n}</span>` : '';
    }).join('');
    stats.innerHTML = inSeriesSelect ? `<span class="hero-pill progress">${cards.length} total cards</span>` : `<span class="hero-pill progress">${got} / ${list.length} collected</span>${rarityBits}`;
  }
}

function renderDetail() {
  const detail = $('#detailPanel');
  if (!detail) return;
  if (!selected) { detail.innerHTML = '<p class="description">Select a card to view details.</p>'; return; }
  selectedIndex = Math.max(0, cards.findIndex(c => c.id === selected.id));
  const got = isCollected(selected.id);
  const hidden = !got;
  detail.innerHTML = `
  <div class="detail-actions top-actions-preview">
    <button class="btn primary" id="flipPreview" type="button">↻ Flip</button>
    <button class="btn" id="openFullView" type="button">⛶ Full View</button>
  </div>
  <button class="preview-card flip-card simple-flip ${previewFlipped ? 'show-back showing-card-back' : ''} ${rarityClass(selected)}" id="previewCard" type="button" aria-label="Open full card view">
    <span class="preview-inner">
      <span class="face front"><img class="${hidden && !previewFlipped?'obscured':''}" src="${esc(previewFlipped ? CARD_BACK_URL : getVisibleImage(selected))}" alt="${esc(previewFlipped ? 'Card back' : getVisibleName(selected))}" onerror="this.src='${CARD_BACK_URL}'"></span>
      <span class="face back"><img src="${CARD_BACK_URL}" alt="Card back"></span>
    </span>
  </button>
  <div class="detail-card-info db2-card-info">
    <div class="db2-card-heading">
      <div>
        <p class="db2-collector-line">${esc(selected.seriesId ? `S${String(selected.seriesId).padStart(2,'0')}` : 'Starlight')} · ${esc(selected.collectorNumber || selected.number)}</p>
        <h2>${esc(getVisibleName(selected))}</h2>
      </div>
      <span class="ownership-status ${got ? 'owned' : 'locked'}">${got ? `Owned ×${getCardQuantity(selected.id)}` : 'Not Collected'}</span>
    </div>
    <div class="card-meta-chips">${cardIdentityChips(selected, { hidden })}</div>
    <div class="detail-list clean-detail-list">
      <p><b>Series</b><span>${esc(selected.series)}</span></p>
      <p><b>Collector Number</b><span>${esc(selected.collectorNumber || selected.number)}</span></p>
      ${got && selected.artist ? `<p><b>Illustrator</b><span>${esc(selected.artist)}</span></p>` : ''}
    </div>
    <div class="db2-story"><b>Card Story</b><p>${esc(getVisibleDescription(selected))}</p></div>
    ${got ? `<details class="db2-more"><summary>Collection Details</summary><div class="detail-list clean-detail-list">${cardExpandedDetails(selected)}</div></details>` : ''}
  </div>
  <div class="detail-actions">
    <span class="ownership-status ${got ? 'owned' : 'locked'}">${got ? `Owned ×${getCardQuantity(selected.id)}` : 'Not Collected'}</span>
    ${got ? `<button class="btn primary" onclick="toggleFavorite('${esc(selected.id)}')">${isFavorite(selected.id)?'★ Favorited':'♡ Favorite'}</button>` : ''}
    
  </div>`;
  $('#flipPreview')?.addEventListener('click', () => { previewFlipped = !previewFlipped; flipCardImage($('#previewCard'), getVisibleImage(selected), getVisibleName(selected), previewFlipped); playSfx('flip'); });
  $('#openFullView')?.addEventListener('click', () => openFullView('filtered'));
  $('#previewCard')?.addEventListener('click', (e) => { if (!e.target.closest('#flipPreview')) openFullView('filtered'); });
}

function openFullView(listMode = 'all') {
  if (!selected) return;
  if (listMode === 'favorites') {
    fullViewList = cards.filter(c => isFavorite(c.id));
  } else if (listMode === 'filtered') {
    applyFilters();
    fullViewList = filtered.length ? [...filtered] : [...cards];
  } else {
    fullViewList = [...cards];
  }
  if (!fullViewList.find(c => c.id === selected.id)) fullViewList.unshift(selected);
  selectedIndex = Math.max(0, fullViewList.findIndex(c => c.id === selected.id));
  overlayFlipped = previewFlipped;
  renderFullView();
  playSfx('analyze');
  $('#cardOverlay')?.classList.add('open');
  document.body.classList.add('modal-open');
}
function closeFullView() { $('#cardOverlay')?.classList.remove('open'); document.body.classList.remove('modal-open'); }
function stepFullView(dir) {
  const list = fullViewList.length ? fullViewList : cards;
  if (!list.length) return;
  selectedIndex = (selectedIndex + dir + list.length) % list.length;
  selected = list[selectedIndex];
  previewFlipped = false;
  overlayFlipped = false;
  renderDetail();
  renderFullView();
  playSfx('page');
}
function renderFullView() {
  const overlay = $('#cardOverlay'); if (!overlay || !selected) return;
  const got = isCollected(selected.id);
  const hidden = !got;
  const visibleName = getVisibleName(selected);
  const visibleRarity = getVisibleRarity(selected);
  overlay.innerHTML = `<div class="full-card-stage analyzer-full-stage ${rarityClass(selected)}" role="dialog" aria-modal="true">
    <div class="analyzer-bg" aria-hidden="true"><span></span><span></span><span></span></div>
    <button class="overlay-close analyzer-close" type="button" aria-label="Close">×</button>
    <button class="overlay-arrow left analyzer-arrow" type="button" aria-label="Previous card">‹</button>
    <section class="analyzer-screen">
      <div class="analyzer-actions"><button class="overlay-flip analyzer-flip" type="button">↻ Flip</button></div>
      <div class="analyzer-card-zone">
        <div class="analyzer-reticle" aria-hidden="true"></div>
        <div class="full-card-wrap flip-card simple-flip ${overlayFlipped?'show-back showing-card-back':''} ${rarityClass(selected)}" id="fullCard3d" aria-label="${esc(overlayFlipped ? 'Card back' : visibleName)}">
          <span class="full-inner">
            <span class="face front"><img class="${hidden && !overlayFlipped?'obscured':''}" src="${esc(overlayFlipped ? CARD_BACK_URL : getVisibleImage(selected))}" alt="${esc(overlayFlipped ? 'Card back' : visibleName)}" onerror="this.src='${CARD_BACK_URL}'"></span>
            <span class="face back"><img src="${CARD_BACK_URL}" alt="Card back"></span>
          </span>
        </div>
      </div>
      <div class="analyzer-info-card db2-full-info">
        <div class="analyzer-title-row"><div><p class="eyebrow">Card Scan Complete</p><h2>${esc(visibleName)}</h2><p class="db2-collector-line">${esc(selected.collectorNumber || selected.number || '???')} · ${esc(selected.series || 'Unknown Series')}</p></div></div>
        <div class="card-meta-chips">${cardIdentityChips(selected, { full: true, hidden })}</div>
        <div class="analyzer-data-grid"><span><b>Series</b>${esc(selected.series || 'Unknown')}</span><span><b>Collector #</b>${esc(selected.collectorNumber || selected.number || '???')}</span>${got && selected.artist ? `<span><b>Illustrator</b>${esc(selected.artist)}</span>` : ''}${got ? `<span><b>Owned</b>×${getCardQuantity(selected.id)}</span>` : ''}</div>
        ${got ? `<div class="db2-full-story"><b>Card Story</b><p>${esc(selected.cardDescription || 'No card story has been added yet.')}</p></div><details class="db2-more"><summary>Distribution & Tags</summary><div class="detail-list clean-detail-list">${cardExpandedDetails(selected)}</div></details>` : ''}
        <p class="analyzer-description">${esc(getVisibleDescription(selected))}</p>
      </div>
    </section>
    <button class="overlay-arrow right analyzer-arrow" type="button" aria-label="Next card">›</button>
  </div>`;
  $('.overlay-close', overlay).addEventListener('click', closeFullView);
  $('.overlay-arrow.left', overlay).addEventListener('click', () => stepFullView(-1));
  $('.overlay-arrow.right', overlay).addEventListener('click', () => stepFullView(1));
  $('.overlay-flip', overlay).addEventListener('click', () => { overlayFlipped = !overlayFlipped; flipCardImage($('.full-card-wrap', overlay), getVisibleImage(selected), getVisibleName(selected), overlayFlipped); playSfx('flip'); });
  attachFullViewTilt();
}

function renderGridPage(target, mode) {
  const wrap = $(target); if (!wrap) return;
  let list = cards;
  if (mode === 'collection') list = cards.filter(c => isCollected(c.id));
  if (mode === 'favorites') list = cards.filter(c => isFavorite(c.id));
  wrap.classList.toggle('empty-grid', !list.length);
  wrap.innerHTML = list.length ? list.map(c => {
    const got = isCollected(c.id); const hidden = !got;
    return `<article class="collection-card ${rarityClass(c)}"><div class="collection-image">${quantityBadgesHtml(c.id)}<img class="${hidden?'obscured':''}" src="${esc(getVisibleImage(c))}" alt="${esc(getVisibleName(c))}" onerror="this.src='${CARD_BACK_URL}'"></div><h3>${esc(getVisibleName(c))}</h3><p class="collection-card-number">${esc(c.collectorNumber || c.number)} • ${esc(c.series)}</p><div class="card-meta-chips compact">${cardIdentityChips(c,{hidden})}</div><div class="card-buttons"><span class="ownership-status ${got ? 'owned' : 'locked'}">${got ? `Owned ×${getCardQuantity(c.id)}` : 'Not Collected'}</span>${got ? `<button class="icon-btn" onclick="toggleFavorite('${esc(c.id)}')">${isFavorite(c.id)?'★':'☆'}</button>` : ''}</div></article>`;
  }).join('') : `<div class="empty-state"><h2>${mode === 'favorites' ? 'No favorites yet' : 'No cards here yet'}</h2><p>${mode === 'favorites' ? 'Tap the star on your favorite cards and this showcase will sparkle to life.' : 'Earn cards from Daily Boosters, redemption codes, and special rewards to fill this collection.'}</p><a class="btn primary" href="binder.html">Open Binder</a></div>`;
  renderFavoritesShowcase();
  attachTileTilts();
  attachBinderHoverSfx();
}

function renderFavoritesShowcase() {
  const showcase = $('#favoriteShowcase'); if (!showcase) return;
  const favs = cards.filter(c => isFavorite(c.id));
  if (!favs.length) { showcase.innerHTML = `<div class="empty-state trophy-empty"><h2>Favorite Showcase</h2><p>Star a card to put it on the Starlight stage. Your favorites will scroll here like a tiny idol parade.</p><a class="btn primary" href="binder.html">Find Favorites</a></div>`; return; }
  showcase.innerHTML = `<div class="favorite-carousel-head"><h2>Favorite Showcase 💖</h2><p>${favs.length} favorite card${favs.length===1?'':'s'} saved to this collection.</p></div><div class="favorite-carousel">${favs.map((c,i)=>{ const hidden = !isCollected(c.id); return `<button class="fav-spot ${rarityClass(c)}" style="--i:${i}" onclick="selected=cards.find(x=>x.id==='${esc(c.id)}');selectedIndex=cards.findIndex(x=>x.id==='${esc(c.id)}');openFullView('favorites')"><span class="fav-image">${quantityBadgesHtml(c.id)}<img class="${hidden?'obscured':''}" src="${esc(getVisibleImage(c))}" alt="${esc(getVisibleName(c))}"></span><span>${esc(getVisibleName(c))}</span></button>`}).join('')}</div>`;
  attachTileTilts();
  attachBinderHoverSfx();
}


function exportCollectionData() {
  const payload = {
    app: 'Starlight Card Binder',
    version: 42,
    exportedAt: new Date().toISOString(),
    collected: readStore(STORAGE_KEY),
    favorites: readStore(FAVORITES_KEY),
    sfxOn
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = `starlight-card-binder-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importCollectionData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const payload = JSON.parse(String(reader.result || '{}'));
      const collected = payload.collected && typeof payload.collected === 'object' ? payload.collected : null;
      const favorites = payload.favorites && typeof payload.favorites === 'object' ? payload.favorites : null;
      if (!collected && !favorites) throw new Error('Missing collection data');
      // Ownership is cloud-authoritative and is never imported from a browser backup.
      if (favorites) writeStore(FAVORITES_KEY, favorites);
      if (typeof payload.sfxOn === 'boolean') { sfxOn = payload.sfxOn; localStorage.setItem(SFX_KEY, sfxOn ? 'on' : 'off'); }
      playSfx('sparkle');
      renderAll();
      window.StarlightUI?.toast('Your Starlight preferences and favorites were imported. Card ownership remains synced from your account.','success');
    } catch (err) {
      window.StarlightUI?.toast('That backup file could not be imported. Make sure it is a Starlight Card Binder JSON export.','error',5000);
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function renderChecklist() {
  const body = $('#checklistBody'); if (!body) return;
  body.innerHTML = cards.map(c => {
    const got = isCollected(c.id); const hidden = !got;
    return `<tr class="item"><td><div class="check-card"><img class="${hidden?'obscured':''}" src="${esc(getVisibleImage(c))}" alt="${esc(getVisibleName(c))}" onerror="this.src='${CARD_BACK_URL}'"><span>${esc(c.collectorNumber || c.number)}</span></div></td><td>${esc(getVisibleName(c))}</td><td>${esc(c.series)}</td><td>${hidden?'—':`<span class="card-meta-chip category">${esc(categoryLabel(c))}</span>${subcategoryLabel(c)?`<br><small>${esc(subcategoryLabel(c))}</small>`:''}`}</td><td><span class="rarity-text ${rarityClass(c)}">${esc(getVisibleRarity(c))}</span></td><td><b>×${getCardQuantity(c.id)}</b>${getCardQuantity(c.id)>1?`<br><small>+${getCardQuantity(c.id)-1} extra</small>`:""}</td><td><span class="ownership-status ${got ? 'owned' : 'locked'}">${got ? 'Collected' : 'Not Collected'}</span></td><td>${got ? `<button class="icon-btn" onclick="toggleFavorite('${esc(c.id)}')">${isFavorite(c.id)?'★':'☆'}</button>` : '<span class="soft-note">—</span>'}</td></tr>`;
  }).join('');
}
function renderAbout() {
  const about = $('#seriesAbout'); if (!about) return;
  const groups = [...new Set(cards.map(c => c.series))];
  about.innerHTML = groups.map(series => { const list = cards.filter(c => c.series === series); const legendary = list.filter(c=>c.rarity==='Legendary').length; return `<div class="collection-card text-card"><h3>${esc(series)}</h3><p>${esc(list.find(c=>c.seriesDescription)?.seriesDescription || 'A Starlight card series.')}</p><p><b>${list.length}</b> cards • <b>${legendary}</b> Legendary</p></div>`; }).join('');
}
function renderAll() { document.body.classList.toggle('sfx-on', sfxOn); renderShell(); if (pageName === 'binder') renderBinder(); renderGridPage('#collectionGrid', 'collection'); renderGridPage('#favoriteGrid', 'favorites'); renderChecklist(); renderAbout(); updateRaritySelectClass(); }


function startPackOpen(series) {
  const select = $('[data-series]'); if (select) select.value = series;
  page = 1;
  const nextSeriesCards = cards.filter(c => c.series === series);
  selected = nextSeriesCards[0] || null;
  selectedIndex = selected ? cards.findIndex(c => c.id === selected.id) : 0;
  previewFlipped = false;
  playSfx('charge');
  document.body.classList.remove('series-select');
  renderAll();
}

function updateRaritySelectClass() {
  $$('[data-rarity]').forEach(select => {
    const value = String(select.value || 'All Rarities').toLowerCase().replace(/[^a-z0-9]/g, '');
    select.className = select.className.replace(/\brarity-select-\S+/g, '').trim();
    select.classList.add(`rarity-select-${value || 'allrarities'}`);
  });
}


// V35: pointer tilt is handled per card by attachTiltTo().
// The older global pointermove tilt was removed to prevent duplicate hover state and SFX jitter.
document.addEventListener('click', e => {
  const pack = e.target.closest('[data-pack-series]');
  if (pack) {
    const select = $('[data-series]'); if (select) select.value = pack.dataset.packSeries;
    page = 1;
    startPackOpen(pack.dataset.packSeries);
    return;
  }
  if (e.target.closest('#backToSeries')) { document.body.classList.add('series-select'); const select = $('[data-series]'); if (select) select.value = 'All Series'; page = 1; renderAll(); return; }
  const tile = e.target.closest('.card-tile');
  if (tile) { selected = cards.find(c => c.id === tile.dataset.id) || selected; selectedIndex = cards.findIndex(c => c.id === tile.dataset.id); previewFlipped = false; renderDetail(); playSfx('sparkle'); }
  if (e.target.id === 'cardOverlay') closeFullView();
});
document.addEventListener('input', e => { if (e.target.matches('#globalSearch, [data-series], [data-rarity], [name="viewFilter"], #sortSelect')) { page = 1; renderAll(); updateRaritySelectClass(); } });
document.addEventListener('change', e => { if (e.target.matches('#globalSearch, [data-series], [data-rarity], [name="viewFilter"], #sortSelect')) { page = 1; renderAll(); updateRaritySelectClass(); } });
document.addEventListener('keydown', e => { if ($('#cardOverlay')?.classList.contains('open')) { if (e.key === 'Escape') closeFullView(); if (e.key === 'ArrowLeft') stepFullView(-1); if (e.key === 'ArrowRight') stepFullView(1); } });
document.addEventListener('DOMContentLoaded', () => {
  if (pageName === 'binder') document.body.classList.add('series-select');
  loadCards();
  $('#prevPage')?.addEventListener('click', () => { page = Math.max(1, page - 1); renderAll(); playSfx('page'); });
  $('#nextPage')?.addEventListener('click', () => { page += 1; renderAll(); playSfx('page'); });
  $('#sfxToggle')?.addEventListener('click', () => { sfxOn = !sfxOn; localStorage.setItem(SFX_KEY, sfxOn ? 'on' : 'off'); renderAll(); });
  $('#exportData')?.addEventListener('click', exportCollectionData);
  $('#importData')?.addEventListener('click', () => $('#importFile')?.click());
  $('#importFile')?.addEventListener('change', e => { importCollectionData(e.target.files?.[0]); e.target.value = ''; });
});


/* ===== V79.3 regression fix: shared preview/full flip helper ===== */
function flipCardImage(cardEl, frontUrl, frontAlt, showBack) {
  if (!cardEl) return;

  // V79.6: one visible surface + mid-spin image swap.
  // This keeps the official back artwork readable instead of mirrored/reversed during the flip.
  const frontImg = cardEl.querySelector('.face.front img');
  cardEl.classList.remove('flip-turning', 'flipped', 'show-back', 'showing-card-back');
  void cardEl.offsetWidth;
  cardEl.classList.add('flip-turning');
  cardEl.setAttribute('aria-label', showBack ? 'Card back' : (frontAlt || 'Card front'));

  window.setTimeout(() => {
    if (frontImg) {
      frontImg.src = showBack ? CARD_BACK_URL : frontUrl;
      frontImg.alt = showBack ? 'Card back' : (frontAlt || 'Card front');
      frontImg.classList.toggle('obscured', false);
    }
    cardEl.classList.toggle('show-back', !!showBack);
    cardEl.classList.toggle('showing-card-back', !!showBack);
  }, 280);

  window.setTimeout(() => cardEl.classList.remove('flip-turning'), 640);
}

function attachFullViewTilt() {
  const card = $('#fullCard3d');
  if (!card) return;
  card.addEventListener('pointermove', (e) => {
    if (card.classList.contains('flip-turning')) return;
    const r = card.getBoundingClientRect();
    const x = (e.clientX - r.left) / Math.max(1, r.width);
    const y = (e.clientY - r.top) / Math.max(1, r.height);
    const tiltY = (x - 0.5) * 8;
    const tiltX = (0.5 - y) * 7;
    card.style.setProperty('--tiltX', `${tiltX.toFixed(2)}deg`);
    card.style.setProperty('--tiltY', `${tiltY.toFixed(2)}deg`);
    card.classList.add('tilting');
  });
  card.addEventListener('pointerleave', () => {
    card.classList.remove('tilting');
    card.style.removeProperty('--tiltX');
    card.style.removeProperty('--tiltY');
  });
}


/* ===== V61: Booster splash + magical grid binder replacement ===== */
function renderBinder() {
  renderSeriesHero();
  const inSeriesSelect = document.body.classList.contains('series-select');
  const landing = $('#seriesLanding');
  const grid = $('#seriesGridStage');
  if (landing) landing.innerHTML = inSeriesSelect ? renderV61SeriesLandingHtml() : '';
  if (grid) grid.innerHTML = inSeriesSelect ? '' : renderV61CardGridHtml();
  renderV62Showcase(inSeriesSelect);
  attachV61HoverSfx();
}
function renderV61SeriesLandingHtml() {
  const groups = getSeriesGroups();
  return `<div class="v61-splash-inner v78-splash-inner">
    <div class="v61-splash-title"><h2>Choose A Series Booster Pack Below And Start Collecting!</h2></div>
    <div class="v61-pack-row v78-pack-grid">${groups.map((group,i)=>{
      const list = group.cards;
      const got = list.filter(c => isCollected(c.id)).length;
      const label = group.seriesName || group.series;
      const seriesIdLabel = group.seriesId ? `Series ${String(group.seriesId).padStart(2, "0")}` : 'Series Booster';
      return `<button class="v61-pack v78-pack" style="--i:${i}" type="button" data-v61-pack="${esc(group.series)}" aria-label="Open ${esc(group.series)}">
        <img src="${esc(group.boosterImageUrl || BOOSTER_PACK_URL)}" alt="${esc(group.series)} booster pack" loading="eager" onerror="this.src='${BOOSTER_PACK_URL}'">
        <span class="v61-pack-label"><small class="v79-pack-title-line">${esc(seriesIdLabel)} — ${esc(label)}</small><small>${got} / ${list.length} Collected</small></span>
      </button>`;
    }).join('')}</div>
  </div>`;
}
function renderV61CardGridHtml() {
  const f = activeFilters();
  const series = f.series === 'All Series' ? ([...new Set(cards.map(c => c.series))][0] || '') : f.series;
  let list = cards.filter(c => c.series === series);
  const q = f.q;
  if (f.rarity !== 'All Rarities') list = list.filter(c => String(c.rarity).toLowerCase() === String(f.rarity).toLowerCase());
  if (q) list = list.filter(c => `${c.number} ${c.name} ${c.series} ${c.rarity} ${c.artist} ${c.cardDescription}`.toLowerCase().includes(q));
  sortCards(list, f.sort);
  const gotCount = list.filter(c => isCollected(c.id)).length;
  return `<div class="v61-grid-shell">
    <div class="v61-grid-head">
      <button id="backToSeries" class="v61-back-btn" type="button">← Back to Series</button>
      <div><h2>${esc(series)}</h2><p>Browse the set and see which Starlight cards you have earned.</p></div>
      <span class="v61-count-pill">Collected: ${gotCount} / ${list.length} ✨</span>
    </div>
    <div class="v61-grid">${list.map((card,i)=>renderV61Card(card,i)).join('')}</div>
  </div>`;
}
function renderV61Card(card, i) {
  const got = isCollected(card.id);
  const hidden = !got;
  const img = getVisibleImage(card);
  return `<article class="v61-card-slot ${rarityClass(card)} ${got ? 'is-collected' : 'is-hidden'}" style="--i:${i}">
    <button class="v61-card-btn" type="button" data-v61-card="${esc(card.id)}" aria-label="View ${esc(getVisibleName(card))}">
      <img class="${hidden?'obscured':''}" src="${esc(img)}" alt="${esc(getVisibleName(card))}" loading="lazy" onerror="this.src='${CARD_BACK_URL}'">
      <span class="badge">${esc(card.number)}</span>
    </button>
    <span class="v61-ownership ${got ? 'owned' : 'locked'}">
      <span>${got ? `Owned ×${getCardQuantity(card.id)}` : 'Not Collected'}</span>
      ${binderRarityBadgeHtml(card)}
    </span>
  </article>`;
}

function renderV62Showcase(inSeriesSelect = false) {
  const panel = $('#v62Showcase');
  if (!panel) return;
  if (inSeriesSelect) { panel.innerHTML = ''; return; }
  applyFilters();
  const list = filtered.length ? filtered : cards;
  if (!selected || !list.some(c => c.id === selected.id)) {
    selected = list[0] || null;
    selectedIndex = selected ? cards.findIndex(c => c.id === selected.id) : 0;
    previewFlipped = false;
  }
  const card = selected;
  if (!card) {
    panel.innerHTML = `<div class="v62-empty-showcase"><h2>Pick a Card ✨</h2><p>Select a Starlight card to preview it here.</p></div>`;
    return;
  }
  const got = isCollected(card.id);
  const hidden = !got;
  const visibleImage = getVisibleImage(card);
  const visibleName = getVisibleName(card);
  const visibleRarity = getVisibleRarity(card);
  panel.innerHTML = `<div class="v62-panel-inner ${rarityClass(card)} ${got ? 'is-collected' : 'is-hidden'}">
    <div class="v62-panel-actions">
      <button class="btn primary" id="v62Flip" type="button">↻ Flip</button>
      <button class="btn" id="v62Full" type="button">⛶ Full View</button>
    </div>
    <button class="v62-preview-card flip-card simple-flip ${previewFlipped ? 'show-back showing-card-back' : ''}" id="v62PreviewCard" type="button" aria-label="Open full view for ${esc(visibleName)}">
      <span class="preview-inner">
        <span class="face front"><img class="${hidden && !previewFlipped?'obscured':''}" src="${esc(previewFlipped ? CARD_BACK_URL : visibleImage)}" alt="${esc(previewFlipped ? 'Card back' : visibleName)}" onerror="this.src='${CARD_BACK_URL}'"></span>
        <span class="face back"><img src="${CARD_BACK_URL}" alt="Starlight card back"></span>
      </span>
    </button>
    <div class="v62-card-info">
      <h2>${esc(visibleName)}</h2>
      <span class="pill rarity-pill ${rarityClass(card)}">${esc(visibleRarity)}</span>
      <div class="v62-info-list">
        <p><b>Series</b><span>${esc(card.series)}</span></p>
        <p><b>Card Number</b><span>${esc(card.number)} / ${String(cards.length).padStart(3,'0')}</span></p>
        <p><b>Artist</b><span>${esc(card.artist)}</span></p>
        <p><b>Owned</b><span>×${getCardQuantity(card.id)}</span></p>
      </div>
      <p class="v62-description"><b>Description</b><br>${esc(getVisibleDescription(card))}</p>
    </div>
    <div class="v62-panel-buttons">
      <span class="ownership-status ${got ? 'owned' : 'locked'}">${got ? `Owned ×${getCardQuantity(card.id)}` : 'Not Collected'}</span>
      ${got ? `<button class="btn primary" id="v62Favorite" type="button">${isFavorite(card.id)?'★ Favorited':'♡ Favorite'}</button>` : ''}
      
    </div>
  </div>`;
  $('#v62Flip')?.addEventListener('click', (e) => { e.stopPropagation(); previewFlipped = !previewFlipped; flipCardImage($('#v62PreviewCard'), getVisibleImage(card), getVisibleName(card), previewFlipped); playSfx('flip'); });
  $('#v62Full')?.addEventListener('click', (e) => { e.stopPropagation(); playSfx('analyze'); openFullView('filtered'); });
  $('#v62PreviewCard')?.addEventListener('click', () => { playSfx('analyze'); openFullView('filtered'); });
  $('#v62Favorite')?.addEventListener('click', (e) => { e.stopPropagation(); toggleFavorite(card.id); });
}

function attachV61HoverSfx() {
  $$('.v61-card-btn, .v61-pack').forEach(el => {
    if (el.dataset.v61HoverReady === '1') return;
    el.dataset.v61HoverReady = '1';
    el.addEventListener('mouseenter', () => playSfx('hover', el.dataset.v61Card || el.dataset.v61Pack || 'pack'));
  });
}


document.addEventListener('click', e => {
  const pack = e.target.closest('[data-v61-pack]');
  if (pack) {
    e.preventDefault(); e.stopPropagation();
    const select = $('[data-series]'); if (select) select.value = pack.dataset.v61Pack;
    document.body.classList.remove('series-select');
    page = 1;
    const nextSeriesCards = cards.filter(c => c.series === pack.dataset.v61Pack);
    selected = nextSeriesCards[0] || null;
    selectedIndex = selected ? cards.findIndex(c => c.id === selected.id) : 0;
    previewFlipped = false;
    playSfx('charge');
    renderAll();
    return;
  }
  const cardBtn = e.target.closest('[data-v61-card]');
  if (cardBtn) {
    e.preventDefault(); e.stopPropagation();
    selected = cards.find(c => c.id === cardBtn.dataset.v61Card) || selected;
    selectedIndex = cards.findIndex(c => c.id === cardBtn.dataset.v61Card);
    previewFlipped = false;
    renderV62Showcase(false);
    playSfx('sparkle');
    return;
  }
}, true);


/* ===== V80.9 reusable reward reveal bridge ===== */
window.StarlightRewardReveal = {
  revealCard(cardLike) {
    if (!cardLike) return;
    const card = normalize({
      id: cardLike.id,
      number: cardLike.cardNumber || cardLike.number,
      name: cardLike.name,
      seriesId: cardLike.seriesId,
      seriesName: cardLike.seriesName,
      rarity: cardLike.rarity,
      imageUrl: cardLike.imageUrl,
      thumbnailUrl: cardLike.thumbnailUrl,
      cardDescription: cardLike.description || cardLike.cardDescription,
      artist: cardLike.artist
    }, 0);
    startRevealAnimation(card);
  },
  async revealSequence(cardList = []) {
    for (const card of cardList) {
      this.revealCard(card);
      await new Promise(resolve => {
        const check = window.setInterval(() => {
          const overlay = document.getElementById('revealOverlay');
          if (!overlay || !overlay.classList.contains('open')) {
            window.clearInterval(check);
            resolve();
          }
        }, 200);
      });
    }
  }
};
