import { getMyStaffAccess } from '../staff-service.js';
import { listProfileReports, updateProfileReport, setProfileModeration } from '../moderation-service.js';

const statusEl = document.getElementById('status');
const list = document.getElementById('list');
const filter = document.getElementById('filter');
const hideModalEl = document.getElementById('hide-profile-modal');
const hideReasonInput = document.getElementById('hide-profile-reason');
const confirmHideBtn = document.getElementById('confirm-hide-profile');

let access = null;
let pendingHideResolve = null;

const hideProfileModalController = window.StarlightUI.adoptModal(hideModalEl, {
  dialog: hideModalEl.querySelector('.st-dialog'),
  labelledBy: 'hide-profile-title',
  initialFocus: hideReasonInput,
  onClose: () => {
    if (pendingHideResolve) {
      pendingHideResolve('');
      pendingHideResolve = null;
    }
  }
});

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (match) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[match]));

function setStatus(message, error = false) {
  statusEl.textContent = message;
  statusEl.className = `status${error ? ' error' : ''}`;
}

function render(rows) {
  if (!rows.length) {
    list.innerHTML = '<div class="empty">No reports match this view.</div>';
    return;
  }

  list.innerHTML = rows.map((report) => `<article class="report-card" data-id="${report.id}" data-user="${report.targetUserId}">
    <div class="report-head">
      <div>
        <h2>${esc(report.targetDisplayName || report.targetUsername)} <span class="muted">@${esc(report.targetUsername)}</span></h2>
        <p class="muted">Reported by ${esc(report.reporterEmail)} • ${new Date(report.createdAt).toLocaleString()}</p>
      </div>
      <span class="pill">${esc(report.status)} · ${esc(report.category.replaceAll('_', ' '))}</span>
    </div>
    <p>${esc(report.details)}</p>
    ${report.profileHidden || report.profileEditLocked
      ? `<p><b>Active moderation:</b> ${report.profileHidden ? 'Profile hidden. ' : ''}${report.profileEditLocked ? 'Editing locked.' : ''}<br><span class="muted">${esc(report.moderationReason || '')}</span></p>`
      : ''}
    <textarea placeholder="Staff resolution note">${esc(report.resolutionNote || '')}</textarea>
    <div class="actions">
      <button data-action="review">Mark Reviewing</button>
      <button data-action="resolve">Resolve</button>
      <button data-action="dismiss">Dismiss</button>
      <button class="danger" data-action="hide">Hide + Lock Profile</button>
      <button class="restore" data-action="restore">Restore Profile</button>
    </div>
  </article>`).join('');
}

async function load() {
  try {
    setStatus('Loading moderation queue…');
    const rows = await listProfileReports(filter.value, 150);
    render(rows);
    setStatus(`${rows.length} report${rows.length === 1 ? '' : 's'} loaded.`);
  } catch (error) {
    setStatus(error.message, true);
  }
}

function openHideReasonModal() {
  return new Promise((resolve) => {
    pendingHideResolve = resolve;
    hideReasonInput.value = '';
    hideProfileModalController.open();
  });
}

function finishHideReason(reason) {
  if (pendingHideResolve) {
    pendingHideResolve(reason);
    pendingHideResolve = null;
  }
  hideProfileModalController.close();
}

confirmHideBtn.addEventListener('click', () => {
  const reason = hideReasonInput.value.trim();
  if (!reason) {
    hideReasonInput.focus();
    return;
  }
  finishHideReason(reason);
});

try {
  access = await getMyStaffAccess();
  if (!access.canModerate) throw new Error('Moderator access is required.');
  setStatus(`Moderation access confirmed: ${String(access.role).replaceAll('_', ' ')}`);
  await load();
} catch (error) {
  setStatus(error.message, true);
  document.querySelector('.toolbar').style.display = 'none';
}

document.getElementById('refresh').addEventListener('click', load);
filter.addEventListener('change', load);

list.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const card = button.closest('.report-card');
  const id = Number(card.dataset.id);
  const userId = card.dataset.user;
  const note = card.querySelector('textarea').value.trim();
  const action = button.dataset.action;

  button.disabled = true;
  try {
    if (action === 'review') await updateProfileReport(id, 'reviewing', note);
    if (action === 'resolve') await updateProfileReport(id, 'resolved', note);
    if (action === 'dismiss') await updateProfileReport(id, 'dismissed', note);
    if (action === 'hide') {
      const reason = note || await openHideReasonModal();
      if (!reason) return;
      await setProfileModeration(userId, true, true, reason);
      await updateProfileReport(id, 'resolved', reason);
    }
    if (action === 'restore') {
      if (!(await StarlightUI.confirm({
        title: 'Restore this profile?',
        message: 'The profile will become visible and editable again.',
        confirmText: 'Restore Profile'
      }))) return;
      await setProfileModeration(userId, false, false, note);
    }
    await load();
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    button.disabled = false;
  }
});
