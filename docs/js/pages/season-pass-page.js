import {
  claimPendingTwitchUnlocks,
  claimSeasonPassTier,
  getMySeasonPass
} from '../season-pass-service.js';
import { beginTwitchLink, callTwitchWorker, getMyTwitchConnection } from '../twitch-service.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const seasonCopy = siteCopy?.seasonPass || {};

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

function renderLocked(data) {
  const season = data.season || {};
  titleEl.textContent = season.name || seasonCopy.title || 'Seasonal Collection Pass';
  leadEl.textContent = season.description || seasonCopy.lead || '';
  const linked = Boolean(data.twitchLinked);
  summaryEl.innerHTML = `
    <div class="season-locked panel-inner">
      <p class="eyebrow">${esc(seasonCopy.subscriberEyebrow || 'Twitch Subscribers')}</p>
      <h2>${esc(seasonCopy.subscriberLockedTitle || 'Subscriber Collection Pass')}</h2>
      <p>${esc(seasonCopy.subscriberLockedLead || 'This season is for active Twitch subscribers. Link Twitch and subscribe to unlock the free track. New subs also receive a Season Pass unlock gift in Received Gifts.')}</p>
      <div class="season-locked-actions">
        ${linked
          ? `<p class="season-status">Linked as @${esc(data.twitchLogin || 'twitch')}</p>
             <a class="btn primary" data-shell-view="rewards" href="binder.html?view=rewards">${esc(seasonCopy.openGiftsCta || 'Open Received Gifts')}</a>`
          : `<button class="btn primary" type="button" id="season-link-twitch">${esc(seasonCopy.linkTwitchCta || 'Link Twitch')}</button>`}
      </div>
    </div>
  `;
  trackEl.replaceChildren();
  document.getElementById('season-link-twitch')?.addEventListener('click', () => {
    beginTwitchLink('collector').catch((error) => toast(error.message || 'Unable to link Twitch.', 'error'));
  });
}

function render(data) {
  if (!data?.found) {
    titleEl.textContent = seasonCopy.title || 'Seasonal Collection Pass';
    leadEl.textContent = seasonCopy.emptyLead || seasonCopy.lead || 'No active season is configured yet.';
    summaryEl.innerHTML = `<p>${esc(seasonCopy.emptyTitle || 'No active season')}</p>`;
    trackEl.replaceChildren();
    return;
  }

  if (data.hasAccess === false && data.accessRequired === 'twitch_subscribers') {
    renderLocked(data);
    return;
  }

  const season = data.season || {};
  titleEl.textContent = season.name || seasonCopy.title || 'Seasonal Collection Pass';
  leadEl.textContent = season.description || seasonCopy.lead || '';
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
      <p>${esc(formatDate(season.startsAt))} – ${esc(formatDate(season.endsAt))}${season.isActive ? ' · Active' : ''}${season.audience === 'twitch_subscribers' ? ' · Subscribers' : ''}</p>
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
      done.textContent = seasonCopy.claimedLabel || 'Claimed';
      actions.append(done);
    } else if (tier.unlocked) {
      const btn = document.createElement('button');
      btn.className = 'btn primary';
      btn.type = 'button';
      btn.textContent = seasonCopy.claimCta || 'Claim';
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
      status.textContent = seasonCopy.lockedLabel || 'Locked';
      actions.append(status);
    }
    trackEl.append(article);
  }
}

async function maybeSyncActiveSubscription() {
  try {
    const connection = await getMyTwitchConnection();
    if (!connection?.linked) return;
    await claimPendingTwitchUnlocks();
    // Optional Worker Helix check for already-active subscribers (graceful if unsupported).
    await callTwitchWorker('/viewer/subscription-check', { seasonId: 'season_2026_starlight_dawn' });
  } catch (_) {
    // Worker may not expose this endpoint yet; EventSub gifts + pending unlocks still work.
  }
}

async function load() {
  try {
    summaryEl.innerHTML = `<p>${esc(seasonCopy.loadingLead || 'Loading season progress…')}</p>`;
    await maybeSyncActiveSubscription();
    render(await getMySeasonPass());
  } catch (error) {
    summaryEl.innerHTML = `<p>Unable to load the season pass. ${esc(error.message || 'Sign in required.')}</p>`;
    trackEl.replaceChildren();
  }
}

await load();
