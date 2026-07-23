import { getMyStaffAccess } from '../staff-service.js';
import {
  getQuestsSeasonAdmin,
  saveCollectionQuest,
  saveSeason,
  saveSeasonTier,
  saveCollectorTitle,
  deleteSeasonTier
} from '../quests-season-admin-service.js';
import {
  slugifyAdminId,
  requirementNeedsTarget,
  formatRequirementSummary,
  toDatetimeLocalValue,
  fromDatetimeLocalValue
} from '../quests-season-admin-utils.js';

const byId = (id) => document.getElementById(id);
const escapeHtml = window.StarlightUI.escapeHtml;

const questEditorEl = byId('questEditor');
const seasonEditorEl = byId('seasonEditor');
const tierEditorEl = byId('tierEditor');
const titleEditorEl = byId('titleEditor');

const questModal = window.StarlightUI.adoptModal(questEditorEl, {
  dialog: questEditorEl.querySelector('.st-dialog'),
  labelledBy: 'questEditorTitle',
  initialFocus: '#questTitle'
});
const seasonModal = window.StarlightUI.adoptModal(seasonEditorEl, {
  dialog: seasonEditorEl.querySelector('.st-dialog'),
  labelledBy: 'seasonEditorTitle',
  initialFocus: '#seasonName'
});
const tierModal = window.StarlightUI.adoptModal(tierEditorEl, {
  dialog: tierEditorEl.querySelector('.st-dialog'),
  labelledBy: 'tierEditorTitle',
  initialFocus: '#tierLabel'
});
const titleModal = window.StarlightUI.adoptModal(titleEditorEl, {
  dialog: titleEditorEl.querySelector('.st-dialog'),
  labelledBy: 'titleEditorTitle',
  initialFocus: '#titleName'
});

let quests = [];
let seasons = [];
let titles = [];
let pickers = { frames: [], series: [], categories: [], rarities: [] };
let editingQuest = null;
let editingSeason = null;
let editingTier = null;
let editingTitle = null;

function optionHtml(value, label, selected) {
  return `<option value="${escapeHtml(value)}" ${selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
}

function fillTitleSelect(selectId, selected) {
  const el = byId(selectId);
  const active = titles.filter((t) => t.isActive || t.id === selected);
  el.innerHTML = `<option value="">None</option>${active.map((t) => optionHtml(t.id, t.name, t.id === selected)).join('')}`;
}

function fillFrameSelect(selectId, selected) {
  const el = byId(selectId);
  const frames = pickers.frames || [];
  const active = frames.filter((f) => f.isActive || f.id === selected);
  el.innerHTML = `<option value="">None</option>${active.map((f) => optionHtml(f.id, f.name, f.id === selected)).join('')}`;
}

function syncQuestTargetOptions(selected) {
  const type = byId('questReqType').value;
  const wrap = byId('questTargetWrap');
  const select = byId('questReqTarget');
  const needs = requirementNeedsTarget(type);
  wrap.hidden = !needs;
  if (!needs) {
    select.innerHTML = '';
    return;
  }
  let options = [];
  if (type === 'own_rarity') {
    options = (pickers.rarities || []).map((r) => ({ id: r, name: r }));
  } else if (type === 'own_series_complete') {
    options = pickers.series || [];
  } else if (type === 'own_category') {
    options = pickers.categories || [];
  }
  select.innerHTML = options.map((o) => optionHtml(o.id, o.name || o.id, o.id === selected)).join('')
    || '<option value="">No targets available</option>';
}

function renderQuests() {
  const list = byId('questList');
  if (!quests.length) {
    list.innerHTML = '<div class="empty">No quests yet. Create the first Collection Quest.</div>';
    return;
  }
  list.innerHTML = quests.map((q) => `
    <article class="item">
      <div>
        <h3>${escapeHtml(q.icon || '✦')} ${escapeHtml(q.title)}</h3>
        <p>${escapeHtml(q.description || '')}</p>
        <div class="meta">
          <span class="meta-badge ${q.isActive ? 'ok' : 'inactive'}">${q.isActive ? 'Active' : 'Inactive'}</span>
          <span class="meta-badge">${escapeHtml(formatRequirementSummary(q, pickers))}</span>
          <span class="meta-badge">${Number(q.rewardStarBits || 0)} Star Bits</span>
          ${q.rewardTitleName ? `<span class="meta-badge">${escapeHtml(q.rewardTitleName)}</span>` : ''}
          ${q.rewardFrameName ? `<span class="meta-badge">${escapeHtml(q.rewardFrameName)}</span>` : ''}
          <span class="meta-badge">Sort ${Number(q.sortOrder || 0)}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn secondary" type="button" data-edit-quest="${escapeHtml(q.id)}">Edit</button>
      </div>
    </article>`).join('');
}

function renderSeasons() {
  const list = byId('seasonList');
  if (!seasons.length) {
    list.innerHTML = '<div class="empty">No seasons yet. Create a Seasonal Collection Pass.</div>';
    return;
  }
  list.innerHTML = seasons.map((s) => {
    const tiers = Array.isArray(s.tiers) ? s.tiers : [];
    const start = s.startsAt ? new Date(s.startsAt).toLocaleDateString() : '—';
    const end = s.endsAt ? new Date(s.endsAt).toLocaleDateString() : '—';
    const audience = s.audience === 'twitch_subscribers' ? 'Twitch subscribers' : 'All collectors';
    return `
      <article class="item">
        <div>
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description || '')}</p>
          <div class="meta">
            <span class="meta-badge ${s.isActive ? 'ok' : 'inactive'}">${s.isActive ? 'Active' : 'Inactive'}</span>
            <span class="meta-badge">${escapeHtml(audience)}</span>
            <span class="meta-badge">${escapeHtml(start)} – ${escapeHtml(end)}</span>
            <span class="meta-badge">${tiers.length} tier${tiers.length === 1 ? '' : 's'}</span>
          </div>
          <div class="tiers">
            ${tiers.map((t) => `
              <div class="tier-row">
                <div>
                  <strong>T${Number(t.tierIndex)} · ${escapeHtml(t.label)}</strong>
                  <small>${Number(t.pointsRequired || 0)} pts · ${Number(t.rewardStarBits || 0)} bits${t.rewardTitleName ? ` · ${escapeHtml(t.rewardTitleName)}` : ''}${t.rewardFrameName ? ` · ${escapeHtml(t.rewardFrameName)}` : ''} · ${Number(t.claimCount || 0)} claim(s)</small>
                </div>
                <button class="btn secondary" type="button" data-edit-tier="${escapeHtml(t.id)}" data-season="${escapeHtml(s.id)}">Edit</button>
              </div>`).join('') || '<p class="muted">No tiers yet.</p>'}
          </div>
        </div>
        <div class="item-actions">
          <button class="btn secondary" type="button" data-edit-season="${escapeHtml(s.id)}">Edit Season</button>
          <button class="btn" type="button" data-add-tier="${escapeHtml(s.id)}">＋ Add Tier</button>
        </div>
      </article>`;
  }).join('');
}

function renderTitles() {
  const list = byId('titleList');
  if (!titles.length) {
    list.innerHTML = '<div class="empty">No titles yet. Create titles for reward pickers.</div>';
    return;
  }
  list.innerHTML = titles.map((t) => `
    <article class="item">
      <div>
        <h3>${escapeHtml(t.name)}</h3>
        <p>${escapeHtml(t.description || 'No description')}</p>
        <div class="meta">
          <span class="meta-badge ${t.isActive ? 'ok' : 'inactive'}">${t.isActive ? 'Active' : 'Inactive'}</span>
          <span class="meta-badge">${escapeHtml(t.id)}</span>
          <span class="meta-badge">Sort ${Number(t.sortOrder || 0)}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn secondary" type="button" data-edit-title="${escapeHtml(t.id)}">Edit</button>
      </div>
    </article>`).join('');
}

function renderAll() {
  renderQuests();
  renderSeasons();
  renderTitles();
}

async function load() {
  try {
    const access = await getMyStaffAccess();
    if (!access.isStaff) throw new Error('Administration access is required.');
    const data = await getQuestsSeasonAdmin();
    quests = Array.isArray(data.quests) ? data.quests : [];
    seasons = Array.isArray(data.seasons) ? data.seasons : [];
    titles = Array.isArray(data.titles) ? data.titles : [];
    pickers = data.pickers || pickers;
    byId('status').textContent = '';
    renderAll();
  } catch (error) {
    byId('status').textContent = error.message || String(error);
  }
}

function openQuestEditor(quest = null) {
  editingQuest = quest;
  byId('questEditorTitle').textContent = quest ? 'Edit Quest' : 'New Quest';
  byId('questId').value = quest?.id || '';
  byId('questId').disabled = Boolean(quest);
  byId('questIcon').value = quest?.icon || '✦';
  byId('questSort').value = Number(quest?.sortOrder ?? 100);
  byId('questTitle').value = quest?.title || '';
  byId('questDescription').value = quest?.description || '';
  byId('questReqType').value = quest?.requirementType || 'own_unique';
  byId('questReqCount').value = Number(quest?.requirementCount || 1);
  byId('questBits').value = Number(quest?.rewardStarBits || 0);
  byId('questActive').checked = quest?.isActive ?? true;
  syncQuestTargetOptions(quest?.requirementTarget || '');
  fillTitleSelect('questRewardTitle', quest?.rewardTitleId || '');
  fillFrameSelect('questRewardFrame', quest?.rewardFrameId || '');
  byId('deactivateQuest').hidden = !quest || !quest.isActive;
  byId('questEditorStatus').textContent = '';
  questModal.open({ initialFocus: quest ? '#questTitle' : '#questId' });
}

function openSeasonEditor(season = null) {
  editingSeason = season;
  byId('seasonEditorTitle').textContent = season ? 'Edit Season' : 'New Season';
  byId('seasonId').value = season?.id || '';
  byId('seasonId').disabled = Boolean(season);
  byId('seasonName').value = season?.name || '';
  byId('seasonDescription').value = season?.description || '';
  byId('seasonStarts').value = toDatetimeLocalValue(season?.startsAt) || toDatetimeLocalValue(new Date().toISOString());
  byId('seasonEnds').value = toDatetimeLocalValue(season?.endsAt) || '';
  byId('seasonAudience').value = season?.audience || 'all';
  byId('seasonActive').checked = season?.isActive ?? true;
  byId('deactivateSeason').hidden = !season || !season.isActive;
  byId('seasonEditorStatus').textContent = '';
  seasonModal.open({ initialFocus: season ? '#seasonName' : '#seasonId' });
}

function openTierEditor(seasonId, tier = null) {
  const season = seasons.find((s) => s.id === seasonId);
  const tiers = Array.isArray(season?.tiers) ? season.tiers : [];
  const nextIndex = tiers.reduce((max, t) => Math.max(max, Number(t.tierIndex || 0)), 0) + 1;
  editingTier = tier;
  byId('tierEditorTitle').textContent = tier ? 'Edit Tier' : 'New Tier';
  byId('tierSeasonId').value = seasonId;
  byId('tierId').value = tier?.id || '';
  byId('tierId').disabled = Boolean(tier);
  byId('tierIndex').value = Number(tier?.tierIndex || nextIndex);
  byId('tierPoints').value = Number(tier?.pointsRequired || 0);
  byId('tierBits').value = Number(tier?.rewardStarBits || 0);
  byId('tierLabel').value = tier?.label || '';
  fillTitleSelect('tierRewardTitle', tier?.rewardTitleId || '');
  fillFrameSelect('tierRewardFrame', tier?.rewardFrameId || '');
  byId('deleteTier').hidden = !tier || Number(tier.claimCount || 0) > 0;
  byId('tierEditorStatus').textContent = tier && Number(tier.claimCount || 0) > 0
    ? `This tier has ${tier.claimCount} claim(s); delete is blocked.`
    : '';
  tierModal.open({ initialFocus: '#tierLabel' });
}

function openTitleEditor(title = null) {
  editingTitle = title;
  byId('titleEditorTitle').textContent = title ? 'Edit Title' : 'New Title';
  byId('titleId').value = title?.id || '';
  byId('titleId').disabled = Boolean(title);
  byId('titleName').value = title?.name || '';
  byId('titleDescription').value = title?.description || '';
  byId('titleSort').value = Number(title?.sortOrder ?? 100);
  byId('titleActive').checked = title?.isActive ?? true;
  byId('deactivateTitle').hidden = !title || !title.isActive;
  byId('titleEditorStatus').textContent = '';
  titleModal.open({ initialFocus: title ? '#titleName' : '#titleId' });
}

document.querySelectorAll('.tab').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.tab, .view').forEach((el) => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((tab) => tab.setAttribute('aria-selected', 'false'));
    button.classList.add('active');
    button.setAttribute('aria-selected', 'true');
    document.querySelector(`[data-view="${button.dataset.tab}"]`)?.classList.add('active');
  });
});

byId('questReqType').addEventListener('change', () => syncQuestTargetOptions(''));

byId('newQuest').addEventListener('click', () => openQuestEditor());
byId('newSeason').addEventListener('click', () => openSeasonEditor());
byId('newTitle').addEventListener('click', () => openTitleEditor());
byId('closeQuestEditor').addEventListener('click', () => questModal.close(undefined, 'page'));
byId('closeSeasonEditor').addEventListener('click', () => seasonModal.close(undefined, 'page'));
byId('closeTierEditor').addEventListener('click', () => tierModal.close(undefined, 'page'));
byId('closeTitleEditor').addEventListener('click', () => titleModal.close(undefined, 'page'));

byId('questList').addEventListener('click', (event) => {
  const id = event.target.closest('[data-edit-quest]')?.dataset.editQuest;
  if (id) openQuestEditor(quests.find((q) => q.id === id) || null);
});

byId('seasonList').addEventListener('click', (event) => {
  const editSeason = event.target.closest('[data-edit-season]')?.dataset.editSeason;
  if (editSeason) {
    openSeasonEditor(seasons.find((s) => s.id === editSeason) || null);
    return;
  }
  const addTier = event.target.closest('[data-add-tier]')?.dataset.addTier;
  if (addTier) {
    openTierEditor(addTier, null);
    return;
  }
  const editTier = event.target.closest('[data-edit-tier]');
  if (editTier) {
    const season = seasons.find((s) => s.id === editTier.dataset.season);
    const tier = (season?.tiers || []).find((t) => t.id === editTier.dataset.editTier);
    openTierEditor(editTier.dataset.season, tier || null);
  }
});

byId('titleList').addEventListener('click', (event) => {
  const id = event.target.closest('[data-edit-title]')?.dataset.editTitle;
  if (id) openTitleEditor(titles.find((t) => t.id === id) || null);
});

byId('questTitle').addEventListener('blur', () => {
  if (editingQuest || byId('questId').value.trim()) return;
  const slug = slugifyAdminId(byId('questTitle').value);
  if (slug) byId('questId').value = slug;
});

byId('seasonName').addEventListener('blur', () => {
  if (editingSeason || byId('seasonId').value.trim()) return;
  const slug = slugifyAdminId(byId('seasonName').value);
  if (slug) byId('seasonId').value = slug.startsWith('season_') ? slug : `season_${slug}`;
});

byId('titleName').addEventListener('blur', () => {
  if (editingTitle || byId('titleId').value.trim()) return;
  const slug = slugifyAdminId(byId('titleName').value);
  if (slug) byId('titleId').value = slug;
});

byId('saveQuest').addEventListener('click', async () => {
  try {
    byId('questEditorStatus').textContent = 'Saving…';
    const type = byId('questReqType').value;
    await saveCollectionQuest({
      id: byId('questId').value.trim() || slugifyAdminId(byId('questTitle').value),
      title: byId('questTitle').value.trim(),
      description: byId('questDescription').value.trim(),
      icon: byId('questIcon').value.trim() || '✦',
      requirementType: type,
      requirementTarget: requirementNeedsTarget(type) ? byId('questReqTarget').value : null,
      requirementCount: Number(byId('questReqCount').value || 1),
      rewardStarBits: Number(byId('questBits').value || 0),
      rewardTitleId: byId('questRewardTitle').value || null,
      rewardFrameId: byId('questRewardFrame').value || null,
      sortOrder: Number(byId('questSort').value || 100),
      isActive: byId('questActive').checked
    });
    questModal.close(undefined, 'saved');
    await load();
  } catch (error) {
    byId('questEditorStatus').textContent = error.message || String(error);
  }
});

byId('deactivateQuest').addEventListener('click', async () => {
  if (!editingQuest) return;
  try {
    byId('questEditorStatus').textContent = 'Deactivating…';
    await saveCollectionQuest({
      id: editingQuest.id,
      title: editingQuest.title,
      description: editingQuest.description,
      icon: editingQuest.icon || '✦',
      requirementType: editingQuest.requirementType,
      requirementTarget: editingQuest.requirementTarget,
      requirementCount: editingQuest.requirementCount,
      rewardStarBits: editingQuest.rewardStarBits,
      rewardTitleId: editingQuest.rewardTitleId,
      rewardFrameId: editingQuest.rewardFrameId,
      sortOrder: editingQuest.sortOrder,
      isActive: false
    });
    questModal.close(undefined, 'deactivated');
    await load();
  } catch (error) {
    byId('questEditorStatus').textContent = error.message || String(error);
  }
});

byId('saveSeason').addEventListener('click', async () => {
  try {
    byId('seasonEditorStatus').textContent = 'Saving…';
    const startsAt = fromDatetimeLocalValue(byId('seasonStarts').value);
    const endsAt = fromDatetimeLocalValue(byId('seasonEnds').value);
    if (!startsAt || !endsAt) throw new Error('Valid start and end dates are required.');
    await saveSeason({
      id: byId('seasonId').value.trim() || slugifyAdminId(byId('seasonName').value),
      name: byId('seasonName').value.trim(),
      description: byId('seasonDescription').value.trim(),
      startsAt,
      endsAt,
      audience: byId('seasonAudience').value,
      isActive: byId('seasonActive').checked
    });
    seasonModal.close(undefined, 'saved');
    await load();
  } catch (error) {
    byId('seasonEditorStatus').textContent = error.message || String(error);
  }
});

byId('deactivateSeason').addEventListener('click', async () => {
  if (!editingSeason) return;
  try {
    byId('seasonEditorStatus').textContent = 'Deactivating…';
    await saveSeason({
      id: editingSeason.id,
      name: editingSeason.name,
      description: editingSeason.description || '',
      startsAt: editingSeason.startsAt,
      endsAt: editingSeason.endsAt,
      audience: editingSeason.audience || 'all',
      isActive: false
    });
    seasonModal.close(undefined, 'deactivated');
    await load();
  } catch (error) {
    byId('seasonEditorStatus').textContent = error.message || String(error);
  }
});

byId('saveTier').addEventListener('click', async () => {
  try {
    byId('tierEditorStatus').textContent = 'Saving…';
    const seasonId = byId('tierSeasonId').value;
    const tierIndex = Number(byId('tierIndex').value || 1);
    await saveSeasonTier({
      id: byId('tierId').value.trim() || undefined,
      seasonId,
      tierIndex,
      pointsRequired: Number(byId('tierPoints').value || 0),
      label: byId('tierLabel').value.trim(),
      rewardStarBits: Number(byId('tierBits').value || 0),
      rewardTitleId: byId('tierRewardTitle').value || null,
      rewardFrameId: byId('tierRewardFrame').value || null
    });
    tierModal.close(undefined, 'saved');
    await load();
  } catch (error) {
    byId('tierEditorStatus').textContent = error.message || String(error);
  }
});

byId('deleteTier').addEventListener('click', async () => {
  if (!editingTier) return;
  if (!(await window.StarlightUI.confirm({
    title: 'Delete this season tier?',
    message: 'This permanently removes the tier. Blocked if any collectors have claimed it.',
    confirmText: 'Delete Tier',
    danger: true
  }))) return;
  try {
    byId('tierEditorStatus').textContent = 'Deleting…';
    await deleteSeasonTier(editingTier.id);
    tierModal.close(undefined, 'deleted');
    await load();
  } catch (error) {
    byId('tierEditorStatus').textContent = error.message || String(error);
  }
});

byId('saveTitle').addEventListener('click', async () => {
  try {
    byId('titleEditorStatus').textContent = 'Saving…';
    await saveCollectorTitle({
      id: byId('titleId').value.trim() || slugifyAdminId(byId('titleName').value),
      name: byId('titleName').value.trim(),
      description: byId('titleDescription').value.trim(),
      sortOrder: Number(byId('titleSort').value || 100),
      isActive: byId('titleActive').checked
    });
    titleModal.close(undefined, 'saved');
    await load();
  } catch (error) {
    byId('titleEditorStatus').textContent = error.message || String(error);
  }
});

byId('deactivateTitle').addEventListener('click', async () => {
  if (!editingTitle) return;
  try {
    byId('titleEditorStatus').textContent = 'Deactivating…';
    await saveCollectorTitle({
      id: editingTitle.id,
      name: editingTitle.name,
      description: editingTitle.description || '',
      sortOrder: editingTitle.sortOrder,
      isActive: false
    });
    titleModal.close(undefined, 'deactivated');
    await load();
  } catch (error) {
    byId('titleEditorStatus').textContent = error.message || String(error);
  }
});

load();
