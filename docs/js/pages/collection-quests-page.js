import { notifyShellEconomyChanged } from '../shell-economy.js';
import {
  claimCollectionQuest,
  getMyCollectionQuests
} from '../collection-quests-service.js';
import { loadAndHydrateWebsiteContent } from '../website-content-hydrate.js';
import { starBitAmountHtml } from '../star-bit-icon.js';

const siteCopy = await loadAndHydrateWebsiteContent();
const questsCopy = siteCopy?.quests || {};

const list = document.getElementById('quests-list');
const summary = document.getElementById('quests-summary');
const refreshButton = document.getElementById('quests-refresh');
const resetNote = document.getElementById('quests-reset-note');
const tabButtons = [...document.querySelectorAll('[data-cadence-tab]')];

let allQuests = [];
let activeCadence = 'daily';

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
  if (summary) {
    summary.textContent = message;
  }
}

function rewardLine(quest) {
  const parts = [];
  if (Number(quest.rewardStarBits) > 0) {
    parts.push(starBitAmountHtml(esc, quest.rewardStarBits, { iconSize: 'xs' }));
  }
  if (quest.rewardTitleName) parts.push(`Title: ${esc(quest.rewardTitleName)}`);
  if (quest.rewardFrameName) {
    parts.push(`<span class="reward-frame-chip">Frame: ${esc(quest.rewardFrameName)}</span>`);
  }
  return parts.length ? parts.join(' · ') : 'Progress reward';
}

function normalizeCadence(value) {
  const cadence = String(value || 'legacy').toLowerCase();
  if (cadence === 'daily' || cadence === 'weekly') return cadence;
  return 'legacy';
}

function formatReset(resetsAt) {
  if (!resetsAt) return '';
  try {
    const date = new Date(resetsAt);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return '';
  }
}

function sectionTitle(cadence) {
  if (cadence === 'daily') return questsCopy.dailySectionTitle || 'Daily Missions';
  if (cadence === 'weekly') return questsCopy.weeklySectionTitle || 'Weekly Missions';
  return questsCopy.legacySectionTitle || 'One-time Missions';
}

function updateTabs() {
  const counts = {
    daily: allQuests.filter((q) => normalizeCadence(q.cadence) === 'daily').length,
    weekly: allQuests.filter((q) => normalizeCadence(q.cadence) === 'weekly').length,
    legacy: allQuests.filter((q) => normalizeCadence(q.cadence) === 'legacy').length
  };

  for (const button of tabButtons) {
    const cadence = button.dataset.cadenceTab;
    const count = counts[cadence] || 0;
    if (cadence === 'legacy') {
      button.hidden = count === 0;
    }
    button.classList.toggle('active', cadence === activeCadence);
    button.setAttribute('aria-selected', cadence === activeCadence ? 'true' : 'false');
    const label = cadence === 'daily'
      ? (questsCopy.dailyTabLabel || '🌞 Daily')
      : cadence === 'weekly'
        ? (questsCopy.weeklyTabLabel || '🌙 Weekly')
        : (questsCopy.legacyTabLabel || 'Once');
    button.textContent = count ? `${label} (${count})` : label;
  }

  if (activeCadence === 'legacy' && counts.legacy === 0) {
    activeCadence = counts.daily ? 'daily' : (counts.weekly ? 'weekly' : 'daily');
  }
}

function updateResetNote(rows) {
  if (!resetNote) return;
  const sample = rows.find((q) => q.resetsAt);
  if (activeCadence === 'legacy') {
    resetNote.textContent = questsCopy.legacyResetNote || 'One-time missions do not reset.';
    return;
  }
  const when = formatReset(sample?.resetsAt);
  if (activeCadence === 'daily') {
    resetNote.textContent = when
      ? `${questsCopy.dailyResetNote || 'Resets next UTC day:'} ${when}`
      : (questsCopy.dailyResetFallback || 'Resets each day at 00:00 UTC.');
    return;
  }
  resetNote.textContent = when
    ? `${questsCopy.weeklyResetNote || 'Resets next Monday UTC:'} ${when}`
    : (questsCopy.weeklyResetFallback || 'Resets each Monday at 00:00 UTC.');
}

function renderQuestCard(quest) {
  const article = document.createElement('article');
  const state = quest.claimed ? 'claimed' : (quest.completed ? 'ready' : 'active');
  article.className = `quest-card quest-${state}`;
  const progress = Math.min(Number(quest.progress) || 0, Number(quest.requirementCount) || 1);
  const target = Math.max(1, Number(quest.requirementCount) || 1);
  const pct = Math.min(100, Math.round((progress / target) * 100));

  article.innerHTML = `
    <div class="quest-icon" aria-hidden="true">${esc(quest.icon || '✦')}</div>
    <div class="quest-copy">
      <h2>${esc(quest.title)}</h2>
      <p>${esc(quest.description)}</p>
      <div class="quest-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${progress}" aria-label="Mission progress">
        <span style="width:${pct}%"></span>
      </div>
      <p class="quest-meta">${progress} / ${target} · ${rewardLine(quest)}</p>
    </div>
    <div class="quest-actions"></div>
  `;

  const actions = article.querySelector('.quest-actions');
  if (quest.claimed) {
    const done = document.createElement('span');
    done.className = 'quest-status';
    done.textContent = questsCopy.claimedLabel || 'Claimed';
    actions.append(done);
  } else if (quest.completed) {
    const btn = document.createElement('button');
    btn.className = 'btn primary';
    btn.type = 'button';
    btn.textContent = questsCopy.claimCta || 'Claim';
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const result = await claimCollectionQuest(quest.id);
        const bits = Number(result?.rewardStarBits) || 0;
        toast(bits > 0 ? `You discovered ${bits} Star Bits!` : 'Mission reward claimed!', 'success');
        if (bits > 0) notifyShellEconomyChanged({ source: 'quest-claim', rewardStarBits: bits });
        await load();
      } catch (error) {
        btn.disabled = false;
        toast(error.message || 'Unable to claim mission.', 'error');
      }
    });
    actions.append(btn);
  } else {
    const status = document.createElement('span');
    status.className = 'quest-status muted';
    status.textContent = questsCopy.inProgressLabel || 'In progress';
    actions.append(status);
  }

  return article;
}

function render() {
  updateTabs();
  list.replaceChildren();
  const rows = allQuests.filter((q) => normalizeCadence(q.cadence) === activeCadence);
  const ready = rows.filter((q) => q.completed && !q.claimed).length;
  const claimed = rows.filter((q) => q.claimed).length;
  summary.textContent = rows.length
    ? `${sectionTitle(activeCadence)} · ${rows.length} · ${ready} ready · ${claimed} claimed`
    : `No ${sectionTitle(activeCadence).toLowerCase()} right now.`;
  updateResetNote(rows);

  if (!rows.length) {
    list.innerHTML = `<div class="quests-empty"><h2>${esc(questsCopy.emptyTitle || 'No missions yet')}</h2><p>${esc(questsCopy.emptyLead || 'Check back soon for new collector goals.')}</p></div>`;
    return;
  }

  for (const quest of rows) {
    list.append(renderQuestCard(quest));
  }
}

async function load() {
  try {
    summary.textContent = 'Syncing mission progress…';
    const data = await getMyCollectionQuests();
    allQuests = Array.isArray(data.quests) ? data.quests : [];
    render();
  } catch (error) {
    summary.textContent = 'Missions could not be loaded.';
    if (resetNote) resetNote.textContent = '';
    list.innerHTML = `<div class="quests-empty"><h2>${esc(questsCopy.signInTitle || 'Sign in required')}</h2><p>${esc(error.message || 'Unable to load missions.')}</p></div>`;
  }
}

for (const button of tabButtons) {
  button.addEventListener('click', () => {
    activeCadence = button.dataset.cadenceTab || 'daily';
    render();
  });
}

refreshButton?.addEventListener('click', () => {
  load();
});

await load();
