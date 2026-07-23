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

function render(quests) {
  list.replaceChildren();
  const rows = Array.isArray(quests) ? quests : [];
  const ready = rows.filter((q) => q.completed && !q.claimed).length;
  const claimed = rows.filter((q) => q.claimed).length;
  summary.textContent = rows.length
    ? `${rows.length} quests · ${ready} ready to claim · ${claimed} claimed`
    : 'No active quests right now.';

  if (!rows.length) {
    list.innerHTML = `<div class="quests-empty"><h2>${esc(questsCopy.emptyTitle || 'No quests yet')}</h2><p>${esc(questsCopy.emptyLead || 'Check back soon for new collector goals.')}</p></div>`;
    return;
  }

  for (const quest of rows) {
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
        <div class="quest-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${target}" aria-valuenow="${progress}" aria-label="Quest progress">
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
          toast(bits > 0 ? `Claimed ${bits} Star Bits!` : 'Quest reward claimed!', 'success');
          if (bits > 0) notifyShellEconomyChanged({ source: 'quest-claim', rewardStarBits: bits });
          await load();
        } catch (error) {
          btn.disabled = false;
          toast(error.message || 'Unable to claim quest.', 'error');
        }
      });
      actions.append(btn);
    } else {
      const status = document.createElement('span');
      status.className = 'quest-status muted';
      status.textContent = questsCopy.inProgressLabel || 'In progress';
      actions.append(status);
    }

    list.append(article);
  }
}

async function load() {
  try {
    summary.textContent = 'Syncing quest progress…';
    const data = await getMyCollectionQuests();
    render(data.quests || []);
  } catch (error) {
    summary.textContent = 'Quests could not be loaded.';
    list.innerHTML = `<div class="quests-empty"><h2>${esc(questsCopy.signInTitle || 'Sign in required')}</h2><p>${esc(error.message || 'Unable to load quests.')}</p></div>`;
  }
}

refreshButton?.addEventListener('click', () => {
  load();
});

await load();
