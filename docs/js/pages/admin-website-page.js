import { getMyStaffAccess } from '../staff-service.js';
import { HOME_QUICK_LINK_IDS } from '../website-content-defaults.js';
import {
  getWebsiteContent,
  saveWebsiteContent,
  resetWebsiteContent
} from '../website-content-service.js';
import { sanitizeWebsiteContent } from '../website-content-model.js';

const byId = (id) => document.getElementById(id);
const esc = (value) =>
  (window.StarlightUI?.escapeHtml || ((v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]))))(value);

const statusEl = byId('status');
const appEl = byId('app');
const previewEl = byId('livePreview');
const saveBtn = byId('saveBtn');
const resetBtn = byId('resetBtn');
const panels = {
  home: byId('panel-home'),
  about: byId('panel-about'),
  socials: byId('panel-socials'),
  login: byId('panel-login'),
  binder: byId('panel-binder'),
  shared: byId('panel-shared')
};

let content = null;
let activeTab = 'home';
let busy = false;

function setStatus(message, type = '') {
  statusEl.textContent = message || '';
  statusEl.className = type ? `status ${type}` : 'status';
}

function canEditWebsite(access) {
  if (!access?.isStaff) return false;
  const role = String(access.role || '').toLowerCase();
  return Boolean(access.canManageRoles || role === 'owner' || role === 'admin');
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function moveItem(list, index, delta) {
  const next = index + delta;
  if (next < 0 || next >= list.length) return;
  const [row] = list.splice(index, 1);
  list.splice(next, 0, row);
}

function field(label, attrs, value, { multiline = false, hint = '' } = {}) {
  const control = multiline
    ? `<textarea ${attrs}>${esc(value || '')}</textarea>`
    : `<input type="text" value="${esc(value || '')}" ${attrs}>`;
  return `
    <div class="field">
      <label>${esc(label)}
        ${control}
      </label>
      ${hint ? `<p class="field-hint">${esc(hint)}</p>` : ''}
    </div>
  `;
}

function renderHome() {
  const home = content.home;
  panels.home.innerHTML = `
    ${field('Eyebrow', 'maxlength="80" data-path="home.eyebrow"', home.eyebrow)}
    ${field('Title', 'maxlength="120" data-path="home.title"', home.title)}
    ${field('Lead', 'maxlength="400" data-path="home.lead"', home.lead, { multiline: true })}
    <div class="field-grid">
      ${field('Primary CTA label', 'maxlength="48" data-path="home.primaryCta.label"', home.primaryCta.label)}
      ${field('Secondary CTA label', 'maxlength="48" data-path="home.secondaryCta.label"', home.secondaryCta.label)}
    </div>
    <h3>Quick links</h3>
    <p class="lead">IDs are fixed. Edit labels only.</p>
    <div class="field-grid">
      ${HOME_QUICK_LINK_IDS.map((id) => {
        const link = home.quickLinks.find((entry) => entry.id === id) || { id, label: id };
        return `
          <div class="field">
            <span class="quick-link-id">${esc(id)}</span>
            <label>Label
              <input type="text" maxlength="40" value="${esc(link.label || '')}" data-quick-link="${esc(id)}">
            </label>
          </div>
        `;
      }).join('')}
    </div>
    <h3>News heading</h3>
    <div class="field-grid">
      ${field('News eyebrow', 'maxlength="80" data-path="home.newsHeading.eyebrow"', home.newsHeading.eyebrow)}
      ${field('News title', 'maxlength="80" data-path="home.newsHeading.title"', home.newsHeading.title)}
    </div>
  `;
}

function renderAbout() {
  const about = content.about;
  panels.about.innerHTML = `
    ${field('Eyebrow', 'maxlength="40" data-path="about.eyebrow"', about.eyebrow)}
    ${field('Title', 'maxlength="120" data-path="about.title"', about.title)}
    ${field('Lead', 'maxlength="400" data-path="about.lead"', about.lead, { multiline: true })}
  `;
}

function renderSocials() {
  const socials = content.socials;
  panels.socials.innerHTML = `
    ${field('Eyebrow', 'maxlength="40" data-path="socials.eyebrow"', socials.eyebrow)}
    ${field('Title', 'maxlength="120" data-path="socials.title"', socials.title)}
    ${field('Lead', 'maxlength="400" data-path="socials.lead"', socials.lead, { multiline: true })}
    <h3>Social links</h3>
    <div class="link-list">
      ${(socials.links || []).map((link, index) => `
        <article class="link-card" data-social="${index}">
          <div class="link-card-grid">
            <label>Icon
              <input type="text" maxlength="8" value="${esc(link.icon || '')}" data-social-field="icon" data-social="${index}">
            </label>
            <label>Label
              <input type="text" maxlength="40" value="${esc(link.label || '')}" data-social-field="label" data-social="${index}">
            </label>
            <label>Handle
              <input type="text" maxlength="60" value="${esc(link.handle || '')}" data-social-field="handle" data-social="${index}">
            </label>
          </div>
          <label>URL
            <input type="url" maxlength="240" value="${esc(link.url || '')}" data-social-field="url" data-social="${index}">
          </label>
          <div class="row-tools">
            <button type="button" class="btn small" data-action="move-social" data-social="${index}" data-delta="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="btn small" data-action="move-social" data-social="${index}" data-delta="1" ${index === socials.links.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="btn small danger" data-action="remove-social" data-social="${index}" ${socials.links.length <= 1 ? 'disabled' : ''}>Remove</button>
          </div>
        </article>
      `).join('') || '<p class="lead">No social links yet.</p>'}
    </div>
    <div class="panel-actions">
      <button type="button" class="btn" data-action="add-social" ${socials.links.length >= 8 ? 'disabled' : ''}>＋ Add social link</button>
    </div>
  `;
}

function renderLogin() {
  const login = content.login;
  panels.login.innerHTML = `
    ${field('Brand title', 'maxlength="60" data-path="login.brandTitle"', login.brandTitle)}
    ${field('Sign-in description', 'maxlength="220" data-path="login.signInDescription"', login.signInDescription, { multiline: true })}
    ${field('Sign-up description', 'maxlength="220" data-path="login.signUpDescription"', login.signUpDescription, { multiline: true })}
  `;
}

function renderBinder() {
  const binder = content.binderLanding;
  panels.binder.innerHTML = `
    ${field('Eyebrow', 'maxlength="60" data-path="binderLanding.eyebrow"', binder.eyebrow)}
    ${field('Title', 'maxlength="120" data-path="binderLanding.title"', binder.title)}
    ${field('Lead', 'maxlength="240" data-path="binderLanding.lead"', binder.lead, { multiline: true })}
  `;
}

function renderShared() {
  const shared = content.shared;
  panels.shared.innerHTML = `
    ${field('Info strip collection note', 'maxlength="220" data-path="shared.infoStripCollection"', shared.infoStripCollection, { multiline: true })}
    ${field('Info strip copyright', 'maxlength="80" data-path="shared.infoStripCopyright"', shared.infoStripCopyright)}
  `;
}

function renderPreview() {
  if (!content || !previewEl) return;
  const home = content.home;
  const about = content.about;
  const socials = content.socials;
  const login = content.login;
  const binder = content.binderLanding;
  const shared = content.shared;
  previewEl.innerHTML = `
    <div class="preview-block">
      <p class="eyebrow">${esc(home.eyebrow)}</p>
      <h3>${esc(home.title)}</h3>
      <p>${esc(home.lead)}</p>
      <div class="preview-actions">
        <span class="preview-chip primary">${esc(home.primaryCta.label)}</span>
        <span class="preview-chip">${esc(home.secondaryCta.label)}</span>
      </div>
      <div class="preview-links">
        ${home.quickLinks.map((link) => `<span class="preview-chip">${esc(link.label)}</span>`).join('')}
      </div>
    </div>
    <div class="preview-block">
      <p class="eyebrow">${esc(about.eyebrow)}</p>
      <h3>${esc(about.title)}</h3>
      <p>${esc(about.lead)}</p>
    </div>
    <div class="preview-block">
      <p class="eyebrow">${esc(socials.eyebrow)}</p>
      <h3>${esc(socials.title)}</h3>
      <p>${esc(socials.lead)}</p>
      <div class="preview-social">
        ${socials.links.map((link) => `
          <div class="preview-social-row">
            <span>${esc(link.icon)}</span>
            <div><strong>${esc(link.label)}</strong><small>${esc(link.handle)}</small></div>
          </div>
        `).join('')}
      </div>
    </div>
    <div class="preview-block">
      <h3>${esc(login.brandTitle)}</h3>
      <p>${esc(login.signInDescription)}</p>
    </div>
    <div class="preview-block">
      <p class="eyebrow">${esc(binder.eyebrow)}</p>
      <h3>${esc(binder.title)}</h3>
      <p>${esc(binder.lead)}</p>
    </div>
    <div class="preview-block">
      <p>${esc(shared.infoStripCollection)}</p>
      <p>${esc(shared.infoStripCopyright)}</p>
    </div>
  `;
}

function showTab(name) {
  activeTab = name;
  document.querySelectorAll('.tabs .tab').forEach((btn) => {
    const selected = btn.dataset.tab === name;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  Object.values(panels).forEach((panel) => {
    if (!panel) return;
    const match = panel.dataset.panel === name;
    panel.classList.toggle('hidden', !match);
    panel.hidden = !match;
  });
}

function renderAll() {
  if (!content) return;
  renderHome();
  renderAbout();
  renderSocials();
  renderLogin();
  renderBinder();
  renderShared();
  renderPreview();
  showTab(activeTab);
}

function setPathValue(path, value) {
  const parts = String(path || '').split('.');
  if (parts.length < 2) return;
  let cursor = content;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function onEditorInput(event) {
  if (!content) return;
  const el = event.target;
  if (el.dataset.path) {
    setPathValue(el.dataset.path, el.value);
    renderPreview();
    return;
  }
  if (el.dataset.quickLink) {
    const link = content.home.quickLinks.find((entry) => entry.id === el.dataset.quickLink);
    if (link) link.label = el.value;
    renderPreview();
    return;
  }
  if (el.dataset.socialField != null) {
    const index = Number(el.dataset.social);
    const link = content.socials.links[index];
    if (link) link[el.dataset.socialField] = el.value;
    renderPreview();
  }
}

function onEditorClick(event) {
  if (!content || busy) return;
  const btn = event.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const index = btn.dataset.social != null ? Number(btn.dataset.social) : null;
  const delta = Number(btn.dataset.delta || 0);

  if (action === 'add-social') {
    if (content.socials.links.length >= 8) return;
    content.socials.links.push({
      id: uid('social'),
      icon: '✦',
      label: 'New link',
      handle: '',
      url: 'https://'
    });
    renderAll();
    return;
  }
  if (action === 'remove-social' && index != null && content.socials.links.length > 1) {
    content.socials.links.splice(index, 1);
    renderAll();
    return;
  }
  if (action === 'move-social' && index != null) {
    moveItem(content.socials.links, index, delta);
    renderAll();
  }
}

document.querySelector('.tabs')?.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  showTab(tab.dataset.tab);
});

appEl.addEventListener('input', onEditorInput);
appEl.addEventListener('click', onEditorClick);

saveBtn.addEventListener('click', async () => {
  if (!content || busy) return;
  busy = true;
  saveBtn.disabled = true;
  setStatus('Saving…');
  try {
    content = await saveWebsiteContent(sanitizeWebsiteContent(content));
    renderAll();
    setStatus('Website content saved.', 'success');
    window.StarlightUI?.toast?.('Website content saved.', 'success');
  } catch (error) {
    setStatus(error.message || 'Save failed.', 'error');
  } finally {
    busy = false;
    saveBtn.disabled = false;
  }
});

resetBtn.addEventListener('click', async () => {
  if (busy) return;
  const ok = await window.StarlightUI.confirm({
    title: 'Reset website content?',
    message: 'This restores the default Home, About, Socials, Login, Binder, and shared copy. Unsaved edits will be lost.',
    confirmText: 'Reset to Defaults',
    danger: true
  });
  if (!ok) return;
  busy = true;
  resetBtn.disabled = true;
  setStatus('Resetting…');
  try {
    content = await resetWebsiteContent();
    renderAll();
    setStatus('Website content reset to defaults.', 'success');
    window.StarlightUI?.toast?.('Website content reset.', 'success');
  } catch (error) {
    setStatus(error.message || 'Reset failed.', 'error');
  } finally {
    busy = false;
    resetBtn.disabled = false;
  }
});

async function boot() {
  try {
    const access = await getMyStaffAccess();
    if (!canEditWebsite(access)) {
      setStatus('Administrator access is required to edit website content.', 'error');
      return;
    }
    setStatus('Loading website content…');
    content = await getWebsiteContent();
    appEl.hidden = false;
    appEl.classList.remove('hidden');
    saveBtn.hidden = false;
    resetBtn.hidden = false;
    renderAll();
    setStatus('Ready to edit. Changes publish when you save.', 'success');
  } catch (error) {
    setStatus(error.message || 'Unable to load website content.', 'error');
  }
}

boot();
