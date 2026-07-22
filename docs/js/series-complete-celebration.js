import { getPullFeed } from './social-service.js';
import { getMyProfileExtras, setMyProfileExtras } from './profile-extras-service.js';

const CELEBRATION_STYLE_ID = 'starlight-series-complete-css';
const SEEN_PREFIX = 'starlight-series-complete-seen:';
const RECENT_MS = 15 * 60 * 1000;
const SERIES_COMPLETE_TITLE_ID = 'series_complete';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function seriesIdsFromCards(cards = []) {
  const ids = new Set();
  for (const card of cards) {
    const id = card?.seriesId || card?.series_id || '';
    if (id) ids.add(String(id));
  }
  return [...ids];
}

function alreadySeen(seriesId) {
  try {
    return sessionStorage.getItem(`${SEEN_PREFIX}${seriesId}`) === '1';
  } catch {
    return false;
  }
}

function markSeen(seriesId) {
  try {
    sessionStorage.setItem(`${SEEN_PREFIX}${seriesId}`, '1');
  } catch {
    /* ignore */
  }
}

function seriesArt(seriesId) {
  if (!seriesId) return '';
  try {
    const raw = localStorage.getItem('sora-starlight-card-binder-v86-supabase-card-catalog');
    const series = raw ? JSON.parse(raw)?.series : null;
    if (!Array.isArray(series)) return '';
    const match = series.find((row) => String(row?.id) === String(seriesId));
    return match?.boosterImageUrl || match?.booster_image_url || '';
  } catch {
    return '';
  }
}

async function installStyles(doc = document) {
  if (doc.getElementById(CELEBRATION_STYLE_ID)) return;
  const link = doc.createElement('link');
  link.id = CELEBRATION_STYLE_ID;
  link.rel = 'stylesheet';
  link.href = new URL('../css/series-complete-celebration.css?v=1.0.0', import.meta.url).href;
  doc.head.appendChild(link);
  await new Promise((resolve) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
}

function canWearSeriesCompleteFlair(extras) {
  const titles = Array.isArray(extras?.titles) ? extras.titles : [];
  const unlocked = titles.some((title) => String(title?.id) === SERIES_COMPLETE_TITLE_ID);
  if (!unlocked) return false;
  return String(extras?.selectedTitleId || '') !== SERIES_COMPLETE_TITLE_ID;
}

async function wearSeriesCompleteFlair() {
  await setMyProfileExtras({ titleId: SERIES_COMPLETE_TITLE_ID });
  window.StarlightUI?.toast?.('Series Complete flair is now on your profile.', 'success');
}

function showCelebration(item, { canWearFlair = false } = {}) {
  const payload = item?.payload || {};
  const seriesId = payload.seriesId || '';
  const seriesName = payload.seriesName || 'a series';
  const owned = Number(payload.owned) || 0;
  const total = Number(payload.total) || 0;
  const art = seriesArt(seriesId);
  const ui = window.StarlightUI;
  if (!ui?.createModal) {
    ui?.toast?.(`Series complete: ${seriesName}`, 'success', 5200);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const contentHtml = `
      <div class="st-series-complete-body">
        <div class="st-series-complete-burst" aria-hidden="true"></div>
        <p class="st-series-complete-eyebrow">Collection Complete</p>
        ${art ? `<img class="st-series-complete-art" src="${esc(art)}" alt="">` : `<div class="st-series-complete-trophy" aria-hidden="true">🏆</div>`}
        <h3 class="st-series-complete-title">${esc(seriesName)}</h3>
        <p class="st-series-complete-lead">You collected every card in this series${total ? ` (${owned}/${total})` : ''}.</p>
        <p class="st-series-complete-perk">LIVE Feed announced · Series Complete badge unlocked · Exclusive profile flair ready</p>
      </div>
    `;

    const actions = [
      { label: 'View LIVE Feed', value: 'feed', className: 'st-dialog-cancel' }
    ];
    if (canWearFlair) {
      actions.push({ label: 'Wear Flair', value: 'flair', className: 'st-dialog-cancel' });
    }
    actions.push({ label: 'Celebrate!', value: 'ok', className: 'st-dialog-confirm' });

    const modal = ui.createModal({
      title: 'Series Complete!',
      content: contentHtml,
      label: 'Series completion celebration',
      actions,
      initialFocus: '.st-dialog-confirm',
      onClose: async ({ value } = {}) => {
        if (value === 'feed') {
          try {
            window.parent?.postMessage?.(
              { type: 'starlight-navigate', route: 'feed' },
              window.location.origin
            );
          } catch {
            location.href = 'pull-feed.html';
          }
        }
        if (value === 'flair') {
          try {
            await wearSeriesCompleteFlair();
          } catch (error) {
            console.warn('[Starlight] Could not equip Series Complete flair.', error);
            ui.toast?.(error.message || 'Could not equip flair.', 'error');
          }
        }
        modal.destroy();
        resolve();
      }
    });
    modal.element?.classList.add('st-series-complete-overlay');
    modal.open();
  });
}

/**
 * After a pack reveal, check for freshly written series_complete activity and celebrate.
 * Safe no-op when signed out, offline, or nothing completed.
 */
export async function maybeCelebrateSeriesCompletions(awardedCards = []) {
  const interestingSeries = seriesIdsFromCards(awardedCards);
  try {
    await installStyles();
    const feed = await getPullFeed({ filter: 'you', limit: 20 });
    const items = Array.isArray(feed?.items) ? feed.items : [];
    const now = Date.now();
    const completions = items.filter((item) => {
      if (item?.type !== 'series_complete') return false;
      const seriesId = item?.payload?.seriesId;
      if (!seriesId || alreadySeen(seriesId)) return false;
      const created = new Date(item.createdAt).getTime();
      if (!Number.isFinite(created) || now - created > RECENT_MS) return false;
      if (interestingSeries.length && !interestingSeries.includes(String(seriesId))) return false;
      return true;
    });

    if (!completions.length) return false;

    // Refresh achievements/titles so the badge appears without waiting for a profile visit.
    let extras = null;
    try {
      extras = await getMyProfileExtras();
    } catch (error) {
      console.warn('[Starlight] Profile extras sync after series complete failed.', error);
    }
    const canWearFlair = canWearSeriesCompleteFlair(extras);

    for (const item of completions) {
      const seriesId = item.payload?.seriesId;
      if (seriesId) markSeen(seriesId);
      await showCelebration(item, { canWearFlair });
    }
    return true;
  } catch (error) {
    console.warn('[Starlight] Series complete celebration skipped.', error);
    return false;
  }
}
