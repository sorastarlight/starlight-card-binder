import { getMyStaffAccess } from '../staff-service.js';
import { HOME_QUICK_LINK_IDS, WEBSITE_EDITOR_TABS } from '../website-content-defaults.js';
import {
  getWebsiteContent,
  saveWebsiteContent,
  resetWebsiteContent
} from '../website-content-service.js';
import { labelForFieldKey, sanitizeWebsiteContent } from '../website-content-model.js';

const byId = (id) => document.getElementById(id);
const esc = (value) =>
  (window.StarlightUI?.escapeHtml || ((v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]))))(value);

const statusEl = byId('status');
const appEl = byId('app');
const tablist = byId('tablist');
const editorPanel = byId('editorPanel');
const previewEl = byId('livePreview');
const saveBtn = byId('saveBtn');
const resetBtn = byId('resetBtn');

let content = null;
let activeTab = WEBSITE_EDITOR_TABS[0].id;
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

function renderTabs() {
  tablist.innerHTML = WEBSITE_EDITOR_TABS.map((tab) => `
    <button type="button" class="tab ${tab.id === activeTab ? 'active' : ''}" role="tab"
      aria-selected="${tab.id === activeTab}" data-tab="${esc(tab.id)}">${esc(tab.label)}</button>
  `).join('');
}

function renderStringFields(sectionKey, section) {
  const keys = Object.keys(section).filter((key) => typeof section[key] === 'string');
  if (!keys.length) return '<p class="lead">No text fields on this page.</p>';
  const longKeys = new Set(['lead', 'signInLead', 'morePacksLead', 'emptyLead', 'emptyWishlist', 'emptyTrade', 'composeEmpty', 'accountIntro', 'signedOutLead', 'duplicatesLead', 'chooseNote', 'exchangeNote', 'exchangeLead', 'wishlistCardLead', 'offersCardLead', 'publicCardLead', 'footerLead', 'tagline']);
  return `
    <div class="field-grid wide">
      ${keys.map((key) => field(
        labelForFieldKey(key),
        `maxlength="500" data-path="${esc(sectionKey)}.${esc(key)}"`,
        section[key],
        { multiline: longKeys.has(key) || section[key].length > 90 }
      )).join('')}
    </div>
  `;
}

function renderHomeExtras() {
  const home = content.home;
  return `
    <h3>Quick links</h3>
    <p class="lead">Destinations stay fixed to left-nav routes. Edit labels only.</p>
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
  `;
}

function renderSocialLinks() {
  const links = content.socials.links || [];
  return `
    <h3>Social links</h3>
    <p class="lead">Add, reorder, or remove public social destinations.</p>
    <div class="link-list">
      ${links.map((link, index) => `
        <article class="link-card-editor" data-link-index="${index}">
          <div class="field-grid">
            ${field('Icon', `maxlength="8" data-link-field="icon" data-link-index="${index}"`, link.icon)}
            ${field('Label', `maxlength="40" data-link-field="label" data-link-index="${index}"`, link.label)}
            ${field('Handle', `maxlength="60" data-link-field="handle" data-link-index="${index}"`, link.handle)}
            ${field('URL', `maxlength="240" data-link-field="url" data-link-index="${index}"`, link.url)}
          </div>
          <div class="row-actions">
            <button type="button" class="btn" data-link-move="${index}" data-delta="-1">Up</button>
            <button type="button" class="btn" data-link-move="${index}" data-delta="1">Down</button>
            <button type="button" class="btn danger" data-link-remove="${index}">Remove</button>
          </div>
        </article>
      `).join('')}
    </div>
    <button type="button" class="btn" id="addSocialLink">Add social link</button>
  `;
}

function renderEditor() {
  const section = content[activeTab];
  if (!section || typeof section !== 'object') {
    editorPanel.innerHTML = '<p class="lead">Unknown page section.</p>';
    return;
  }

  const tabMeta = WEBSITE_EDITOR_TABS.find((tab) => tab.id === activeTab);
  let html = `<h2>${esc(tabMeta?.label || activeTab)}</h2>`;
  html += renderStringFields(activeTab, section);

  if (activeTab === 'home') html += renderHomeExtras();
  if (activeTab === 'socials') html += renderSocialLinks();

  editorPanel.innerHTML = html;
  renderPreview();
}

function renderPreview() {
  const section = content[activeTab] || {};
  const eyebrow = section.eyebrow || section.brandTitle || '';
  const title = section.title || section.brandTitle || labelForFieldKey(activeTab);
  const lead = section.lead || section.signInDescription || section.accountIntro || '';
  previewEl.innerHTML = `
    <div class="preview-card">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      <h3>${esc(title)}</h3>
      ${lead ? `<p>${esc(lead)}</p>` : ''}
      <p class="preview-meta">${esc(Object.keys(section).filter((key) => typeof section[key] === 'string').length)} editable text fields</p>
    </div>
  `;
}

function syncFromDom() {
  editorPanel.querySelectorAll('[data-path]').forEach((input) => {
    const path = input.getAttribute('data-path');
    const [section, key] = path.split('.');
    if (!content[section] || !key) return;
    content[section][key] = input.value;
  });

  editorPanel.querySelectorAll('[data-quick-link]').forEach((input) => {
    const id = input.getAttribute('data-quick-link');
    const row = content.home.quickLinks.find((link) => link.id === id);
    if (row) row.label = input.value;
  });

  editorPanel.querySelectorAll('[data-link-field]').forEach((input) => {
    const index = Number(input.getAttribute('data-link-index'));
    const fieldName = input.getAttribute('data-link-field');
    if (!content.socials.links[index]) return;
    content.socials.links[index][fieldName] = input.value;
  });
}

function renderAll() {
  renderTabs();
  renderEditor();
}

async function boot() {
  try {
    const access = await getMyStaffAccess();
    if (!canEditWebsite(access)) {
      setStatus('Administrator access is required to edit website content.', 'error');
      return;
    }
    content = await getWebsiteContent();
    appEl.hidden = false;
    appEl.classList.remove('hidden');
    saveBtn.hidden = false;
    resetBtn.hidden = false;
    setStatus('Website content loaded. Edit any left-nav page, then Save.');
    renderAll();
  } catch (error) {
    setStatus(error.message || 'Could not load website content.', 'error');
  }
}

tablist.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tab]');
  if (!button) return;
  syncFromDom();
  activeTab = button.dataset.tab;
  renderAll();
});

editorPanel.addEventListener('input', () => {
  syncFromDom();
  renderPreview();
});

editorPanel.addEventListener('click', (event) => {
  const add = event.target.closest('#addSocialLink');
  if (add) {
    syncFromDom();
    content.socials.links.push({
      id: uid('social'),
      icon: '✦',
      label: 'New Link',
      handle: '@starlight',
      url: 'https://example.com'
    });
    renderEditor();
    return;
  }

  const remove = event.target.closest('[data-link-remove]');
  if (remove) {
    syncFromDom();
    const index = Number(remove.getAttribute('data-link-remove'));
    content.socials.links.splice(index, 1);
    renderEditor();
    return;
  }

  const move = event.target.closest('[data-link-move]');
  if (move) {
    syncFromDom();
    const index = Number(move.getAttribute('data-link-move'));
    const delta = Number(move.getAttribute('data-delta'));
    moveItem(content.socials.links, index, delta);
    renderEditor();
  }
});

saveBtn.addEventListener('click', async () => {
  if (busy) return;
  syncFromDom();
  busy = true;
  saveBtn.disabled = true;
  setStatus('Saving website content…');
  try {
    content = await saveWebsiteContent(sanitizeWebsiteContent(content));
    setStatus('Website content saved. Public pages will show updates after refresh.', 'success');
    renderAll();
  } catch (error) {
    setStatus(error.message || 'Could not save website content.', 'error');
  } finally {
    busy = false;
    saveBtn.disabled = false;
  }
});

resetBtn.addEventListener('click', async () => {
  if (busy) return;
  const confirmed = await window.StarlightUI?.confirm?.({
    title: 'Reset website content?',
    message: 'This restores every public page’s marketing copy to the built-in defaults.',
    confirmText: 'Reset to Defaults'
  });
  if (!confirmed) return;
  busy = true;
  setStatus('Resetting…');
  try {
    content = await resetWebsiteContent();
    setStatus('Website content reset to defaults.', 'success');
    renderAll();
  } catch (error) {
    setStatus(error.message || 'Could not reset website content.', 'error');
  } finally {
    busy = false;
  }
});

await boot();
