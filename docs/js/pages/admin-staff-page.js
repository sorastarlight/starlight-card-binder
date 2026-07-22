import {
  getMyStaffAccess,
  listStaffUsers,
  listStaffRoleLabels,
  createStaffRoleLabel,
  deleteStaffRoleLabel,
  setStaffRole,
  removeStaffRole
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

function renderUsers() {
  const q = search.value.trim().toLowerCase();
  const list = users.filter((user) => (
    `${user.email || ''} ${user.username || ''} ${user.displayName || ''} ${user.labelName || ''} ${user.role || ''}`
      .toLowerCase()
      .includes(q)
  ));

  usersEl.innerHTML = list.map((user) => `
    <article class="user" data-id="${esc(user.userId)}">
      <div>
        <strong>${esc(user.displayName || user.username || user.email || 'Unnamed collector')}</strong>
        <small>${esc(user.email || '')}${user.username ? ` · @${esc(user.username)}` : ''}</small>
        <span class="role-summary">${esc(displayRole(user))}</span>
      </div>
      <select aria-label="Role for ${esc(user.email || 'user')}">${options(user)}</select>
      <div class="user-actions">
        <button class="save" type="button">Save Role</button>
        ${user.role ? '<button class="remove" type="button">Remove</button>' : ''}
      </div>
    </article>
  `).join('');

  usersEl.querySelectorAll('.user').forEach((row) => {
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
  });
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
