import {
  claimSeasonPassTier,
  getMySeasonPass
} from '../season-pass-service.js';

const titleEl = document.getElementById('season-title');
const leadEl = document.getElementById('season-lead');
const summaryEl = document.getElementById('season-summary');
const trackEl = document.getElementById('season-track');

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

function toast(message, type = '') {
  if (window.StarlightUI?.toast) {
    window.StarlightUI.toast(message, type);
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return '';
  }
}

function rewardLine(tier) {
  const parts = [];
  if (Number(tier.rewardStarBits) > 0) parts.push(`${tier.rewardStarBits} ✦`);
  if (tier.rewardTitleName) parts.push(`Title: ${tier.rewardTitleName}`);
  return parts.length ? parts.join(' · ') : 'Season reward';
}

function renderBreakdown(breakdown = {}) {
  const rows = [
    ['Booster opens', breakdown.boosterOpens],
    ['Trades', breakdown.trades],
    ['Gifts sent', breakdown.giftsSent],
    ['Series complete', breakdown.seriesComplete],
    ['Favorites', breakdown.favorites],
    ['Visit days', breakdown.visitDays]
  ];
  return rows
    .map(([label, value]) => `<li><span>${esc(label)}</span><strong>${Number(value) || 0}</strong></li>`)
    .join('');
}

function render(data) {
  if (!data?.found) {
    titleEl.textContent = 'Seasonal Collection Pass';
    leadEl.textContent = 'No active season is configured yet.';
    summaryEl.innerHTML = '<p>Check back when the next Collection Pass begins.</p>';
    trackEl.replaceChildren();
    return;
  }

  const season = data.season || {};
  titleEl.textContent = season.name || 'Seasonal Collection Pass';
  leadEl.textContent = season.description || '';
  const points = Number(data.points) || 0;
  const tiers = Array.isArray(data.tiers) ? data.tiers : [];
  const maxPoints = Math.max(...tiers.map((t) => Number(t.pointsRequired) || 0), 1);
  const pct = Math.min(100, Math.round((points / maxPoints) * 100));

  summaryEl.innerHTML = `
    <div class="season-points">
      <div>
        <span>Season points</span>
        <strong>${points}</strong>
      </div>
      <div class="season-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${maxPoints}" aria-valuenow="${points}" aria-label="Season progress">
        <span style="width:${pct}%"></span>
      </div>
      <p>${esc(formatDate(season.startsAt))} – ${esc(formatDate(season.endsAt))}${season.isActive ? ' · Active' : ''}</p>
    </div>
    <ul class="season-breakdown">${renderBreakdown(data.breakdown || {})}</ul>
  `;

  trackEl.replaceChildren();
  for (const tier of tiers) {
    const article = document.createElement('article');
    const state = tier.claimed ? 'claimed' : (tier.unlocked ? 'ready' : 'locked');
    article.className = `season-tier season-${state}`;
    article.innerHTML = `
      <div class="season-tier-index" aria-hidden="true">${Number(tier.tierIndex) || '?'}</div>
      <div class="season-tier-copy">
        <h2>${esc(tier.label)}</h2>
        <p>${Number(tier.pointsRequired) || 0} points · ${esc(rewardLine(tier))}</p>
      </div>
      <div class="season-tier-actions"></div>
    `;
    const actions = article.querySelector('.season-tier-actions');
    if (tier.claimed) {
      const done = document.createElement('span');
      done.className = 'season-status';
      done.textContent = 'Claimed';
      actions.append(done);
    } else if (tier.unlocked) {
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.type = 'button';
      btn.textContent = 'Claim';
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        try {
          const result = await claimSeasonPassTier(tier.id);
          const bits = Number(result?.rewardStarBits) || 0;
          toast(bits > 0 ? `Claimed ${bits} Star Bits!` : 'Season reward claimed!', 'success');
          await load();
        } catch (error) {
          btn.disabled = false;
          toast(error.message || 'Unable to claim season reward.', 'error');
        }
      });
      actions.append(btn);
    } else {
      const status = document.createElement('span');
      status.className = 'season-status muted';
      status.textContent = 'Locked';
      actions.append(status);
    }
    trackEl.append(article);
  }
}

async function load() {
  try {
    summaryEl.innerHTML = '<p>Loading season progress…</p>';
    render(await getMySeasonPass());
  } catch (error) {
    summaryEl.innerHTML = `<p>Unable to load the season pass. ${esc(error.message || 'Sign in required.')}</p>`;
    trackEl.replaceChildren();
  }
}

await load();
