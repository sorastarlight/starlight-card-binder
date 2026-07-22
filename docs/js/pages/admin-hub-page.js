import { getMyStaffAccess } from '../staff-service.js';

const status = document.getElementById('status');
const content = document.getElementById('content');
const role = document.getElementById('role');

function formatRole(access) {
  const tier = String(access.role || 'staff').replaceAll('_', ' ');
  if (access.roleLabel) return `${access.roleLabel} · ${tier}`;
  return tier;
}

try {
  const access = await getMyStaffAccess();
  if (!access.isStaff) {
    status.hidden = false;
    status.textContent = 'Administration access is required.';
    status.className = 'status error';
  } else {
    status.textContent = '';
    status.hidden = true;
    role.textContent = formatRole(access);
    content.classList.remove('hidden');
    if (!access.canManageCodes) document.getElementById('codes').setAttribute('aria-disabled', 'true');
    if (!access.canManageRoles) {
      document.getElementById('roles').setAttribute('aria-disabled', 'true');
      document.getElementById('users').setAttribute('aria-disabled', 'true');
    }
    if (!access.canManageCodes) document.getElementById('boosters').setAttribute('aria-disabled', 'true');
    if (!access.canViewAuditLog) document.getElementById('audit').setAttribute('aria-disabled', 'true');
  }
} catch (error) {
  status.hidden = false;
  status.textContent = error.message;
  status.className = 'status error';
}
