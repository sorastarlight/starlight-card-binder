import {
  getMyStaffAccess,
  listStaffUsers,
  listStaffRoleLabels,
  createStaffRoleLabel,
  deleteStaffRoleLabel,
  setStaffRole,
  removeStaffRole,
  listUserUnlockables,
  setUserUnlockables
} from '../staff-service.js';

const status = document.getElementById('status');
const content = document.getElementById('content');
const usersEl = document.getElementById('users');
const labelsEl = document.getElementById('labels');
const search = document.getElementById('search');
const labelNameInput = document.getElementById('label-name');
const labelTierSelect = document.getElementById('label-tier');
const createLabelForm = document.getElementById('create-label-form');

let access = null;
let users = [];
let labels = [];
/** @type {Map<string, {loading?: boolean, data?: object|null, error?: string}>} */
const unlockCache = new Map();

const roleNames = {
  owner: 'Owner',
  admin: 'Admin',
  super_moderator: 'Super Moderator',
  moderator: 'Moderator',
  '': 'Collector'
};

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (m) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[m]));

function setStatus(message, kind = '') {
  status.textContent = message;
  status.className = kind ? `status ${kind}` : 'status';
}

function allowedTiers() {
  return access?.role === 'owner'
    ? ['moderator', 'super_moderator', 'admin', 'owner']
    : ['moderator', 'super_moderator'];
}

function allowedLabels() {
  const tiers = new Set(allowedTiers());
  return labels.filter((label) => tiers.has(label.permissionTier));
}

function assignmentValue(user) {
  if (user.labelId) return `label:${user.labelId}`;
  if (user.role) return `tier:${user.role}`;
  return '';
}

function parseAssignment(value) {
  if (!value) return { role: '', labelId: null };
  if (value.startsWith('label:')) {
    return { role: null, labelId: value.slice(6) };
  }
  if (value.startsWith('tier:')) {
    return { role: value.slice(5), labelId: null };
  }
  return { role: value, labelId: null };
}

function displayRole(user) {
  const tier = roleNames[user.role || ''] || 'Collector';
  if (user.labelName) return `${user.labelName} · ${tier}`;
  return tier;
}

function options(user) {
  const current = assignmentValue(user);
  const tierOptions = ['', ...allowedTiers()].map((tier) => {
    const value = tier ? `tier:${tier}` : '';
    return `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(roleNames[tier])}</option>`;
  });

  const labelOptions = allowedLabels().map((label) => {
    const value = `label:${label.id}`;
    const tierLabel = roleNames[label.permissionTier] || label.permissionTier;
    return `<option value="${esc(value)}" ${current === value ? 'selected' : ''}>${esc(label.name)} (${esc(tierLabel)})</option>`;
  });

  if (!labelOptions.length) return tierOptions.join('');
  return `${tierOptions.join('')}<optgroup label="Custom labels">${labelOptions.join('')}</optgroup>`;
}

function labelTierOptions() {
  return allowedTiers().map((tier) => (
    `<option value="${esc(tier)}">${esc(roleNames[tier])}</option>`
  )).join('');
}

function unlockCheckboxList(kind, items, selectedId) {
  if (!items?.length) {
    return `<p class="unlock-empty">No ${kind === 'title' ? 'titles' : 'frames'} in catalog.</p>`;
  }
  return items.map((item) => {
    const inactive = item.isActive === false ? ' unlock-item-inactive' : '';
    const equipped = selectedId && selectedId === item.id
      ? ' <span class="unlock-equipped">equipped</span>'
      : '';
    const hint = item.isActive === false ? ' (inactive)' : '';
    return `<label class="unlock-item${inactive}">
      <input type="checkbox" data-unlock-kind="${esc(kind)}" value="${esc(item.id)}" ${item.owned ? 'checked' : ''}/>
      <span>
        <strong>${esc(item.name)}</strong>${equipped}
        <small>${esc(item.id)}${esc(hint)}</small>
      </span>
    </label>`;
  }).join('');
}

function unlockPanelMarkup(userId) {
  const entry = unlockCache.get(userId);
  if (!entry) {
    return `<div class="unlock-panel" hidden data-unlock-panel>
      <p class="unlock-hint">Load titles and avatar frames to grant or revoke unlocks for this collector.</p>
      <button type="button" class="unlock-toggle" data-unlock-toggle>Manage unlocks</button>
    </div>`;
  }
  if (entry.loading) {
    return `<div class="unlock-panel" data-unlock-panel>
      <p class="unlock-hint">Loading unlockables…</p>
    </div>`;
  }
  if (entry.error) {
    return `<div class="unlock-panel" data-unlock-panel>
      <p class="unlock-error">${esc(entry.error)}</p>
      <button type="button" class="unlock-toggle" data-unlock-toggle>Retry</button>
    </div>`;
  }
  const data = entry.data || {};
  const titles = data.titles || [];
  const frames = data.frames || [];
  return `<div class="unlock-panel" data-unlock-panel>
    <div class="unlock-grid">
      <fieldset class="unlock-fieldset">
        <legend>Titles</legend>
        <div class="unlock-list" data-unlock-list="title">${unlockCheckboxList('title', titles, data.selectedTitleId)}</div>
      </fieldset>
      <fieldset class="unlock-fieldset">
        <legend>Avatar frames</legend>
        <div class="unlock-list" data-unlock-list="frame">${unlockCheckboxList('frame', frames, data.selectedFrameId)}</div>
      </fieldset>
    </div>
    <div class="unlock-actions">
      <button type="button" class="save" data-unlock-save>Save unlocks</button>
      <button type="button" class="unlock-collapse" data-unlock-collapse>Hide</button>
    </div>
  </div>`;
}

function renderLabels() {
  if (!labelsEl) return;
  if (labelTierSelect) labelTierSelect.innerHTML = labelTierOptions();

  if (!labels.length) {
    labelsEl.innerHTML = '<p class="labels-empty">No custom labels yet. Create one above — it maps to a permission tier and does not add new powers.</p>';
    return;
  }

  labelsEl.innerHTML = labels.map((label) => {
    const tier = roleNames[label.permissionTier] || label.permissionTier;
    const canDelete = access?.role === 'owner' || !['owner', 'admin'].includes(label.permissionTier);
    return `<article class="label-card" data-id="${esc(label.id)}">
      <div>
        <strong>${esc(label.name)}</strong>
        <small>Maps to ${esc(tier)}</small>
      </div>
      ${canDelete ? '<button class="remove" type="button" data-delete-label>Delete</button>' : '<span class="label-locked">Owner only</span>'}
    </article>`;
  }).join('');

  labelsEl.querySelectorAll('[data-delete-label]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('.label-card');
      const id = card?.dataset.id;
      if (!id) return;
      if (!(await StarlightUI.confirm({
        title: 'Delete role label?',
        message: 'Users keep their permission tier. Only the custom label is removed.',
        confirmText: 'Delete Label',
        danger: true
      }))) return;
      try {
        await deleteStaffRoleLabel(id);
        setStatus('Role label deleted.', 'success');
        await load();
      } catch (error) {
        setStatus(error.message, 'error');
      }
    });
  });
}

async function ensureUnlockables(userId, force = false) {
  const existing = unlockCache.get(userId);
  if (!force && existing?.data && !existing.error) return existing.data;
  unlockCache.set(userId, { loading: true });
  renderUsers();
  try {
    const data = await listUserUnlockables(userId);
    unlockCache.set(userId, { data });
    renderUsers();
    return data;
  } catch (error) {
    unlockCache.set(userId, { error: error.message || 'Unable to load unlockables.' });
    renderUsers();
    throw error;
  }
}

function collectCheckedIds(panel, kind) {
  return [...panel.querySelectorAll(`input[data-unlock-kind="${kind}"]:checked`)]
    .map((input) => input.value)
    .filter(Boolean);
}

function wireUserRow(row) {
  const id = row.dataset.id;
  const select = row.querySelector('select');
  row.querySelector('.save')?.addEventListener('click', async () => {
    try {
      const assignment = parseAssignment(select.value);
      if (!assignment.role && !assignment.labelId) {
        await removeStaffRole(id);
      } else {
        await setStaffRole(id, assignment.role, assignment.labelId);
      }
      setStatus('Role updated successfully.', 'success');
      await load();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });
  row.querySelector('.remove')?.addEventListener('click', async () => {
    if (!(await StarlightUI.confirm({
      title: 'Remove staff access?',
      message: 'This user will immediately lose access to staff tools.',
      confirmText: 'Remove Access',
      danger: true
    }))) return;
    try {
      await removeStaffRole(id);
      setStatus('Staff access removed.', 'success');
      await load();
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });
  row.querySelector('[data-unlock-toggle]')?.addEventListener('click', async () => {
    try {
      await ensureUnlockables(id, true);
    } catch (error) {
      setStatus(error.message, 'error');
    }
  });
  row.querySelector('[data-unlock-collapse]')?.addEventListener('click', () => {
    unlockCache.delete(id);
    renderUsers();
  });
  row.querySelector('[data-unlock-save]')?.addEventListener('click', async () => {
    const panel = row.querySelector('[data-unlock-panel]');
    if (!panel) return;
    const saveBtn = row.querySelector('[data-unlock-save]');
    if (saveBtn) saveBtn.disabled = true;
    try {
      const titleIds = collectCheckedIds(panel, 'title');
      const frameIds = collectCheckedIds(panel, 'frame');
      await setUserUnlockables(id, titleIds, frameIds);
      await ensureUnlockables(id, true);
      setStatus('Unlocks updated for this collector.', 'success');
    } catch (error) {
      setStatus(error.message, 'error');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  });
}

function renderUsers() {
  const q = search.value.trim().toLowerCase();
  const list = users.filter((user) => (
    `${user.email || ''} ${user.username || ''} ${user.displayName || ''} ${user.labelName || ''} ${user.role || ''}`
      .toLowerCase()
      .includes(q)
  ));

  usersEl.innerHTML = list.map((user) => `
    <article class="user" data-id="${esc(user.userId)}">
      <div class="user-main">
        <div class="user-identity">
          <strong>${esc(user.displayName || user.username || user.email || 'Unnamed collector')}</strong>
          <small>${esc(user.email || '')}${user.username ? ` · @${esc(user.username)}` : ''}</small>
          <span class="role-summary">${esc(displayRole(user))}</span>
        </div>
        <select aria-label="Role for ${esc(user.email || 'user')}">${options(user)}</select>
        <div class="user-actions">
          <button class="save" type="button">Save Role</button>
          ${user.role ? '<button class="remove" type="button">Remove</button>' : ''}
          ${!unlockCache.has(user.userId) ? '<button class="unlock-toggle" type="button" data-unlock-toggle>Manage unlocks</button>' : ''}
        </div>
      </div>
      ${unlockPanelMarkup(user.userId)}
    </article>
  `).join('');

  usersEl.querySelectorAll('.user').forEach(wireUserRow);
}

function render() {
  renderLabels();
  renderUsers();
}

async function load() {
  access = await getMyStaffAccess();
  if (!access.canManageRoles) throw new Error('Administrator access is required.');
  const [nextUsers, nextLabels] = await Promise.all([
    listStaffUsers(),
    listStaffRoleLabels()
  ]);
  users = nextUsers;
  labels = nextLabels;
  content.classList.remove('hidden');
  render();
}

createLabelForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = labelNameInput?.value?.trim() || '';
  const tier = labelTierSelect?.value || '';
  if (!name || !tier) return;
  try {
    await createStaffRoleLabel(name, tier);
    labelNameInput.value = '';
    setStatus('Custom role label created.', 'success');
    await load();
  } catch (error) {
    setStatus(error.message, 'error');
  }
});

search?.addEventListener('input', renderUsers);

try {
  await load();
  setStatus('Role management ready.');
} catch (error) {
  setStatus(error.message, 'error');
}
