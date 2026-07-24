import { notifyShellEconomyChanged } from '../shell-economy.js';
import {
  claimPendingTwitchUnlocks,
  claimSeasonPassTier,
  getMySeasonPass
} from '../season-pass-service.js';
import { beginTwitchLink, callTwitchWorker, getMyTwitchConnection } from '../twitch-service.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';
import { starBitAmountHtml } from '../star-bit-icon.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const seasonCopy = siteCopy?.seasonPass || {};

const titleEl = document.getElementById('season-title');
const leadEl = document.getElementById('season-lead');
const summaryEl = document.getElementById('season-summary');
const trackEl = document.getElementById('season-track');
const benefitsEl = document.getElementById('season-benefits');
const benefitsBodyEl = document.getElementById('season-benefits-body');
const activationBannerEl = document.getElementById('season-activation-banner');

let seasonCountdownTimer = null;

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
  if (summaryEl) {
    summaryEl.textContent = message;
  }
}

function stopSeasonCountdown() {
  if (seasonCountdownTimer) {
    clearInterval(seasonCountdownTimer);
    seasonCountdownTimer = null;
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(new Date(value));
  } catch {
    return '';
  }
}

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  parts.push(`${hours}h`, `${minutes}m`, `${seconds}s`);
  return parts.join(' ');
}

function seasonScheduleHtml(season = {}) {
  const started = formatDate(season.startsAt);
  const ended = formatDate(season.endsAt);
  const startLabel = started ? `Started ${started}` : '';
  const endLabel = ended ? `Ended ${ended}` : 'Season ended';

  return `
    <div class="season-schedule">
      ${startLabel ? `<p class="season-started">${esc(startLabel)}</p>` : ''}
      <p class="season-countdown" data-season-countdown data-ends-at="${esc(season.endsAt || '')}" data-ended-label="${esc(endLabel)}" aria-atomic="true">Ends in —</p>
    </div>
  `;
}

function parseSeasonBenefits(season = {}) {
  const cmsList = String(seasonCopy.benefitsList || '').trim();
  if (cmsList) {
    return cmsList.split(/\r?\n+/).map((item) => item.trim()).filter(Boolean);
  }
  const raw = String(season.description || '').trim();
  if (raw.includes('*')) {
    return raw.split(/\s*\*\s*/).map((item) => item.trim()).filter(Boolean);
  }
  if (raw) return [raw];
  return [];
}

function applyExclusivePromoCopy() {
  const link = document.querySelector('.season-pass-promo-link');
  if (!link) return;
  const url = String(seasonCopy.exclusivePromoUrl || link.getAttribute('href') || '').trim();
  if (url) link.href = url;
}

function renderBenefits(season = {}) {
  if (!benefitsEl) return;
  const benefits = parseSeasonBenefits(season);
  benefitsEl.hidden = false;
  applyExclusivePromoCopy();

  if (!benefitsBodyEl) return;
  if (!benefits.length) {
    benefitsBodyEl.replaceChildren();
    return;
  }

  benefitsBodyEl.innerHTML = `
    <h2 class="season-benefits-title">${esc(seasonCopy.benefitsTitle || 'Included with your Twitch subscription')}</h2>
    <ul class="season-benefits-list">
      ${benefits.map((benefit) => `<li>${esc(benefit.replace(/^🎁\s*/, ''))}</li>`).join('')}
    </ul>
  `;
}

function renderActivationBanner(data = {}, season = {}) {
  if (!activationBannerEl) return;
  const linked = Boolean(data.twitchLinked);
  const login = String(data.twitchLogin || '').trim();
  const hasAccess = data.hasAccess !== false;

  if (hasAccess) {
    activationBannerEl.hidden = false;
    activationBannerEl.className = 'season-activation-banner is-active';
    activationBannerEl.innerHTML = `
      <span class="season-activation-icon" aria-hidden="true">✓</span>
      <div class="season-activation-copy">
        <strong>${esc(seasonCopy.activatedTitle || 'Twitch subscriber · Season Pass active')}</strong>
        <span>${esc(seasonCopy.activatedLead || 'Your pass is unlocked for this season. Keep collecting to earn every tier reward.')}</span>
        ${login ? `<span class="season-activation-login">${esc(fillLoginToken(seasonCopy.activatedLinkedLabel || 'Linked as @{login}', login))}</span>` : ''}
      </div>
      <span class="season-activation-badge">${esc(seasonCopy.activatedBadge || 'Active now')}</span>
    `;
    return;
  }

  if (linked) {
    activationBannerEl.hidden = false;
    activationBannerEl.className = 'season-activation-banner is-pending';
    activationBannerEl.innerHTML = `
      <span class="season-activation-icon" aria-hidden="true">!</span>
      <div class="season-activation-copy">
        <strong>${esc(seasonCopy.pendingTitle || 'Twitch linked · Pass not active yet')}</strong>
        <span>${esc(seasonCopy.pendingLead || 'Subscribe on Twitch, then open your Season Pass unlock gift in Received Gifts to activate.')}</span>
        ${login ? `<span class="season-activation-login">${esc(fillLoginToken(seasonCopy.activatedLinkedLabel || 'Linked as @{login}', login))}</span>` : ''}
      </div>
    `;
    return;
  }

  activationBannerEl.hidden = true;
  activationBannerEl.className = 'season-activation-banner';
  activationBannerEl.replaceChildren();
}

function fillLoginToken(template, login) {
  return String(template || '').replace(/\{login\}/g, login);
}

function renderHero(data = {}, season = {}) {
  titleEl.textContent = season.name || seasonCopy.title || 'Seasonal Collection Pass';
  if (leadEl) {
    leadEl.hidden = true;
    leadEl.textContent = '';
  }
  renderBenefits(season);
  renderActivationBanner(data, season);
}

function startSeasonCountdown() {
  stopSeasonCountdown();
  const el = summaryEl?.querySelector('[data-season-countdown]');
  if (!el) return;

  const endsAt = el.getAttribute('data-ends-at');
  const endedLabel = el.getAttribute('data-ended-label') || 'Season ended';
  if (!endsAt) {
    el.textContent = endedLabel;
    return;
  }

  const target = new Date(endsAt);
  if (Number.isNaN(target.getTime())) {
    el.textContent = endedLabel;
    return;
  }

  const tick = () => {
    const remaining = target.getTime() - Date.now();
    if (remaining <= 0) {
      el.textContent = endedLabel;
      el.classList.add('is-ended');
      stopSeasonCountdown();
      return;
    }
    el.classList.remove('is-ended');
    el.textContent = `Ends in ${formatCountdown(remaining)}`;
  };

  tick();
  seasonCountdownTimer = setInterval(tick, 1000);
}

function rewardLine(tier) {
  const parts = [];
  if (Number(tier.rewardStarBits) > 0) {
    parts.push(starBitAmountHtml(esc, tier.rewardStarBits, { iconSize: 'xs' }));
  }
  if (tier.rewardTitleName) parts.push(`Title: ${esc(tier.rewardTitleName)}`);
  if (tier.rewardFrameName) {
    parts.push(`<span class="reward-frame-chip">Frame: ${esc(tier.rewardFrameName)}</span>`);
  }
  return parts.length ? parts.join(' · ') : 'Season reward';
}

function renderLocked(data) {
  stopSeasonCountdown();
  const season = data.season || {};
  renderHero({ ...data, hasAccess: false }, season);
  const linked = Boolean(data.twitchLinked);
  summaryEl.innerHTML = `
    <div class="season-locked panel-inner">
      <p class="eyebrow">${esc(seasonCopy.subscriberEyebrow || 'Twitch Subscribers')}</p>
      <h2>${esc(seasonCopy.subscriberLockedTitle || 'Subscriber Collection Pass')}</h2>
      <p>${esc(seasonCopy.subscriberLockedLead || 'This season is for active Twitch subscribers. Link Twitch and subscribe to unlock the free track. New subs also receive a Season Pass unlock gift in Received Gifts.')}</p>
      ${seasonScheduleHtml(season)}
      <div class="season-locked-actions">
        ${linked
          ? `<p class="season-status">Linked as @${esc(data.twitchLogin || 'twitch')}</p>
             <a class="btn primary" data-shell-view="rewards" href="binder.html?view=rewards">${esc(seasonCopy.openGiftsCta || 'Open Received Gifts')}</a>`
          : `<button class="btn primary" type="button" id="season-link-twitch">${esc(seasonCopy.linkTwitchCta || 'Link Twitch')}</button>`}
      </div>
    </div>
  `;
  startSeasonCountdown();
  trackEl.replaceChildren();
  document.getElementById('season-link-twitch')?.addEventListener('click', () => {
    beginTwitchLink('collector').catch((error) => toast(error.message || 'Unable to link Twitch.', 'error'));
  });
}

function render(data) {
  stopSeasonCountdown();

  if (!data?.found) {
    titleEl.textContent = seasonCopy.title || 'Seasonal Collection Pass';
    if (leadEl) {
      leadEl.hidden = false;
      leadEl.textContent = seasonCopy.emptyLead || seasonCopy.lead || 'No active season is configured yet.';
    }
    if (benefitsEl) {
      benefitsEl.hidden = true;
      benefitsEl.replaceChildren();
    }
    if (activationBannerEl) {
      activationBannerEl.hidden = true;
      activationBannerEl.replaceChildren();
    }
    summaryEl.innerHTML = `<p>${esc(seasonCopy.emptyTitle || 'No active season')}</p>`;
    trackEl.replaceChildren();
    return;
  }

  if (data.hasAccess === false && data.accessRequired === 'twitch_subscribers') {
    renderLocked(data);
    return;
  }

  const season = data.season || {};
  renderHero(data, season);
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
      ${seasonScheduleHtml(season)}
    </div>
  `;
  startSeasonCountdown();

  trackEl.replaceChildren();
  for (const tier of tiers) {
    const article = document.createElement('article');
    const state = tier.claimed ? 'claimed' : (tier.unlocked ? 'ready' : 'locked');
    article.className = `season-tier season-${state}`;
    article.innerHTML = `
      <div class="season-tier-index" aria-hidden="true">${Number(tier.tierIndex) || '?'}</div>
      <div class="season-tier-copy">
        <h2>${esc(tier.label)}</h2>
        <p>${Number(tier.pointsRequired) || 0} points · ${rewardLine(tier)}</p>
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
          toast(bits > 0 ? `You discovered ${bits} Star Bits!` : 'Season reward claimed!', 'success');
          if (bits > 0) notifyShellEconomyChanged({ source: 'season-claim', rewardStarBits: bits });
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
    stopSeasonCountdown();
    summaryEl.innerHTML = `<p>${esc(seasonCopy.loadingLead || 'Loading season progress…')}</p>`;
    await maybeSyncActiveSubscription();
    render(await getMySeasonPass());
  } catch (error) {
    stopSeasonCountdown();
    summaryEl.innerHTML = `<p>Unable to load the season pass. ${esc(error.message || 'Sign in required.')}</p>`;
    trackEl.replaceChildren();
  }
}

applyExclusivePromoCopy();
window.addEventListener('starlight-website-content-hydrated', (event) => {
  Object.assign(seasonCopy, event.detail?.seasonPass || {});
  applyExclusivePromoCopy();
});

await load();
