import { getMyStaffAccess } from '../staff-service.js';
import {
  getShellNavigation,
  saveShellNavigation,
  resetShellNavigation
} from '../shell-navigation-service.js';
import {
  PUBLIC_SHELL_DESTINATIONS,
  COMMON_NAV_EMOJIS
} from '../shell-navigation-defaults.js';
import { uploadStudioAsset } from '../content-studio-service.js';
import { buildShellStudioPreviewUrl, STUDIO_MSG } from '../studio-preview.js';

const byId = (id) => document.getElementById(id);
const esc = (value) =>
  (window.StarlightUI?.escapeHtml || ((v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]))))(value);

const FEATURES = [
  { id: 'dailyBadge', label: 'Daily badge' },
  { id: 'tradeOfferBadge', label: 'Trade offer badge' },
  { id: 'notificationBadge', label: 'Notification badge' },
  { id: 'receivedGiftBadge', label: 'Received gift badge' },
  { id: 'sectionLabel', label: 'Section label (no destination)' }
];

const ACCOUNT_FEATURES = [
  { id: 'notificationBadge', label: 'Notification count badge' },
  { id: 'receivedGiftBadge', label: 'Received gifts count badge' },
  { id: 'tradeOfferBadge', label: 'Trade offers count badge' },
  { id: 'profileLink', label: 'My public profile link' },
  { id: 'separator', label: 'Separator line' },
  { id: 'signOut', label: 'Sign out action' },
  { id: 'signIn', label: 'Sign in action' },
  { id: 'signUp', label: 'Register action' }
];

const ACCOUNT_SPECIAL = new Set(['separator', 'signOut', 'signIn', 'signUp', 'profileLink']);

const statusEl = byId('status');
const appEl = byId('app');
const brandInput = byId('brandRibbon');
const sidebarPanel = byId('panel-sidebar');
const topbarPanel = byId('panel-topbar');
const accountPanel = byId('panel-account');
const titlesPanel = byId('panel-titles');
const previewEl = byId('livePreview');
const shellPreviewFrame = byId('shellPreviewFrame');
const shellPreviewWrap = shellPreviewFrame?.parentElement;
const reloadShellPreviewBtn = byId('reloadShellPreview');
const saveBtn = byId('saveBtn');
const resetBtn = byId('resetBtn');

let navigation = null;
let activeTab = 'sidebar';
let busy = false;
let shellPreviewReady = false;
let shellPreviewTimer = 0;

function setStatus(message, type = '') {
  statusEl.textContent = message || '';
  statusEl.className = type ? `status ${type}` : 'status';
}

function canEditUi(access) {
  if (!access?.isStaff) return false;
  const role = String(access.role || '').toLowerCase();
  return Boolean(access.canManageRoles || role === 'owner' || role === 'admin');
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function destinationOptions(selected = '', { allowEmpty = false } = {}) {
  const opts = [];
  if (allowEmpty) {
    opts.push(`<option value="" ${selected === '' ? 'selected' : ''}>(none)</option>`);
  }
  for (const dest of PUBLIC_SHELL_DESTINATIONS) {
    opts.push(
      `<option value="${esc(dest.value)}" ${dest.value === selected ? 'selected' : ''}>${esc(dest.label)}</option>`
    );
  }
  return opts.join('');
}

function emojiPickerHtml(selectedEmoji, dataAttrs) {
  return `<div class="emoji-picker" ${dataAttrs}>${COMMON_NAV_EMOJIS.map((emoji) => `
    <button type="button" class="emoji-btn ${selectedEmoji === emoji ? 'active' : ''}" data-emoji="${esc(emoji)}" title="${esc(emoji)}">${esc(emoji)}</button>
  `).join('')}</div>`;
}

function iconPreviewHtml(icon) {
  if (icon?.type === 'image' && icon.url) {
    return `<span class="icon-preview"><img src="${esc(icon.url)}" alt=""></span>`;
  }
  return `<span class="icon-preview">${esc(icon?.value || '·')}</span>`;
}

function moveItem(list, index, delta) {
  const next = index + delta;
  if (next < 0 || next >= list.length) return;
  const [row] = list.splice(index, 1);
  list.splice(next, 0, row);
}

function renderIconControls(icon, scopeAttrs) {
  const isImage = icon?.type === 'image' && icon.url;
  return `
    <div class="icon-row">
      ${iconPreviewHtml(icon)}
      <input type="text" maxlength="8" value="${esc(isImage ? '' : (icon?.value || ''))}" data-field="iconEmoji" ${scopeAttrs} placeholder="Emoji" aria-label="Icon emoji" ${isImage ? 'disabled' : ''}>
      <label class="btn small upload-label">Upload icon
        <input type="file" accept="image/png,image/webp,image/*" hidden data-action="upload-icon" ${scopeAttrs}>
      </label>
      ${isImage ? `<button type="button" class="btn small" data-action="clear-icon" ${scopeAttrs}>Use emoji</button>` : ''}
    </div>
    ${emojiPickerHtml(isImage ? '' : (icon?.value || ''), scopeAttrs)}
  `;
}

function renderSidebar() {
  const sections = navigation?.sidebar?.sections || [];
  sidebarPanel.innerHTML = `
    <div class="section-list">
      ${sections.map((section, sIndex) => `
        <article class="section-card" data-section="${sIndex}">
          <header>
            <div class="section-meta">
              <label>Section label
                <input type="text" maxlength="80" value="${esc(section.label || '')}" data-field="sectionLabel" data-section="${sIndex}">
              </label>
              ${renderIconControls(section.icon, `data-section="${sIndex}" data-target="section"`)}
              <div class="checks">
                <label><input type="checkbox" data-field="staffOnly" data-section="${sIndex}" ${section.staffOnly ? 'checked' : ''}> Staff only</label>
              </div>
            </div>
            <div class="row-tools">
              <button type="button" class="btn small" data-action="move-section" data-section="${sIndex}" data-delta="-1" ${sIndex === 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="btn small" data-action="move-section" data-section="${sIndex}" data-delta="1" ${sIndex === sections.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="btn small danger" data-action="remove-section" data-section="${sIndex}">Remove section</button>
            </div>
          </header>
          <div class="items">
            ${(section.items || []).map((item, iIndex) => {
              const features = new Set(item.features || []);
              const isLabel = features.has('sectionLabel');
              return `
                <div class="item-row" data-section="${sIndex}" data-item="${iIndex}">
                  <div class="item-fields">
                    <label>Item label
                      <input type="text" maxlength="80" value="${esc(item.label || '')}" data-field="itemLabel" data-section="${sIndex}" data-item="${iIndex}">
                    </label>
                    <label>Destination
                      <select data-field="destination" data-section="${sIndex}" data-item="${iIndex}" ${isLabel ? 'disabled' : ''}>
                        ${destinationOptions(item.destination || '', { allowEmpty: isLabel })}
                      </select>
                    </label>
                    <div class="checks">
                      <label><input type="checkbox" data-field="enabled" data-section="${sIndex}" data-item="${iIndex}" ${item.enabled !== false ? 'checked' : ''}> Enabled</label>
                    </div>
                  </div>
                  ${renderIconControls(item.icon, `data-section="${sIndex}" data-item="${iIndex}" data-target="item"`)}
                  <div class="checks">
                    ${FEATURES.map((feature) => `
                      <label>
                        <input type="checkbox" data-field="feature" data-feature="${feature.id}" data-section="${sIndex}" data-item="${iIndex}" ${features.has(feature.id) ? 'checked' : ''}>
                        ${esc(feature.label)}
                      </label>
                    `).join('')}
                  </div>
                  <div class="row-tools">
                    <button type="button" class="btn small" data-action="move-item" data-section="${sIndex}" data-item="${iIndex}" data-delta="-1" ${iIndex === 0 ? 'disabled' : ''}>↑</button>
                    <button type="button" class="btn small" data-action="move-item" data-section="${sIndex}" data-item="${iIndex}" data-delta="1" ${iIndex === section.items.length - 1 ? 'disabled' : ''}>↓</button>
                    <button type="button" class="btn small danger" data-action="remove-item" data-section="${sIndex}" data-item="${iIndex}">Remove item</button>
                  </div>
                </div>
              `;
            }).join('') || '<p class="lead">No items in this section yet.</p>'}
          </div>
          <div class="panel-actions">
            <button type="button" class="btn small" data-action="add-item" data-section="${sIndex}">＋ Add item</button>
          </div>
        </article>
      `).join('') || '<p class="lead">No sidebar sections yet.</p>'}
    </div>
    <div class="panel-actions">
      <button type="button" class="btn" data-action="add-section">＋ Add section</button>
    </div>
  `;
}

function renderTopBar() {
  const links = navigation?.topBar?.quickLinks || [];
  topbarPanel.innerHTML = `
    <div class="link-list">
      ${links.map((link, index) => `
        <article class="link-card" data-link="${index}">
          <label>Label
            <input type="text" maxlength="40" value="${esc(link.label || '')}" data-field="linkLabel" data-link="${index}">
          </label>
          <label>Destination
            <select data-field="linkDestination" data-link="${index}">
              ${destinationOptions(link.destination || 'home')}
            </select>
          </label>
          <div class="checks">
            <label><input type="checkbox" data-field="linkEnabled" data-link="${index}" ${link.enabled !== false ? 'checked' : ''}> Enabled</label>
          </div>
          <div class="row-tools">
            <button type="button" class="btn small" data-action="move-link" data-link="${index}" data-delta="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="btn small" data-action="move-link" data-link="${index}" data-delta="1" ${index === links.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="btn small danger" data-action="remove-link" data-link="${index}">Remove</button>
          </div>
        </article>
      `).join('') || '<p class="lead">No top-bar quick links yet.</p>'}
    </div>
    <div class="panel-actions">
      <button type="button" class="btn" data-action="add-link">＋ Add quick link</button>
    </div>
  `;
}

function ensureAccountMenu() {
  if (!navigation.accountMenu || typeof navigation.accountMenu !== 'object') {
    navigation.accountMenu = { signedIn: [], signedOut: [] };
  }
  if (!Array.isArray(navigation.accountMenu.signedIn)) navigation.accountMenu.signedIn = [];
  if (!Array.isArray(navigation.accountMenu.signedOut)) navigation.accountMenu.signedOut = [];
  return navigation.accountMenu;
}

function renderAccountMenuList(listKey, title, hint) {
  ensureAccountMenu();
  const items = navigation.accountMenu[listKey] || [];
  return `
    <article class="section-card account-menu-card">
      <header>
        <div class="section-meta">
          <strong>${esc(title)}</strong>
          <p class="lead">${esc(hint)}</p>
        </div>
      </header>
      <div class="items">
        ${items.map((item, index) => {
          const features = new Set(item.features || []);
          const isSpecial = [...ACCOUNT_SPECIAL].some((feature) => features.has(feature));
          const needsDestination = !isSpecial || features.has('profileLink');
          return `
            <div class="item-row" data-account-list="${listKey}" data-account-item="${index}">
              <div class="item-fields">
                <label>Item label
                  <input type="text" maxlength="80" value="${esc(item.label || '')}" data-field="accountLabel" data-account-list="${listKey}" data-account-item="${index}" ${features.has('separator') ? 'disabled' : ''}>
                </label>
                <label>Destination
                  <select data-field="accountDestination" data-account-list="${listKey}" data-account-item="${index}" ${needsDestination ? '' : 'disabled'}>
                    ${destinationOptions(item.destination || '', { allowEmpty: !needsDestination || features.has('profileLink') })}
                  </select>
                </label>
                <div class="checks">
                  <label><input type="checkbox" data-field="accountEnabled" data-account-list="${listKey}" data-account-item="${index}" ${item.enabled !== false ? 'checked' : ''}> Enabled</label>
                </div>
              </div>
              <div class="checks">
                ${ACCOUNT_FEATURES.map((feature) => `
                  <label>
                    <input type="checkbox" data-field="accountFeature" data-feature="${feature.id}" data-account-list="${listKey}" data-account-item="${index}" ${features.has(feature.id) ? 'checked' : ''}>
                    ${esc(feature.label)}
                  </label>
                `).join('')}
              </div>
              <div class="row-tools">
                <button type="button" class="btn small" data-action="move-account-item" data-account-list="${listKey}" data-account-item="${index}" data-delta="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" class="btn small" data-action="move-account-item" data-account-list="${listKey}" data-account-item="${index}" data-delta="1" ${index === items.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="btn small danger" data-action="remove-account-item" data-account-list="${listKey}" data-account-item="${index}">Remove</button>
              </div>
            </div>
          `;
        }).join('') || '<p class="lead">No menu items yet.</p>'}
      </div>
      <div class="panel-actions">
        <button type="button" class="btn small" data-action="add-account-item" data-account-list="${listKey}">＋ Add menu item</button>
      </div>
    </article>
  `;
}

function renderAccountMenu() {
  if (!accountPanel) return;
  accountPanel.innerHTML = `
    <div class="section-list">
      ${renderAccountMenuList('signedIn', 'Signed-in menu', 'Shown when a collector is signed in. Use count badges for notifications, gifts, and trades.')}
      ${renderAccountMenuList('signedOut', 'Signed-out menu', 'Shown on the profile button when nobody is signed in.')}
    </div>
  `;
}

function renderTitles() {
  const titles = navigation?.pageTitles || {};
  const keys = Object.keys(titles);
  titlesPanel.innerHTML = `
    <div class="title-grid">
      ${keys.map((key) => `
        <label>${esc(key)}
          <input type="text" maxlength="80" value="${esc(titles[key] || '')}" data-field="pageTitle" data-key="${esc(key)}">
        </label>
      `).join('') || '<p class="lead">No page titles configured.</p>'}
    </div>
  `;
}

function previewIcon(icon) {
  if (icon?.type === 'image' && icon.url) {
    return `<img class="preview-icon-img" src="${esc(icon.url)}" alt="">`;
  }
  return `<span>${esc(icon?.value || '')}</span>`;
}

function renderPreview() {
  if (!navigation) {
    if (previewEl) previewEl.innerHTML = '';
    return;
  }
  // Keep a compact schematic as an accessibility/fallback snapshot under the live iframe.
  if (previewEl) {
    const sections = navigation.sidebar?.sections || [];
    const links = (navigation.topBar?.quickLinks || []).filter(Boolean);
    previewEl.innerHTML = `
      <div class="preview-ribbon">${esc(navigation.brandRibbon || 'Card Binder')}</div>
      ${sections.map((section) => `
        <div class="preview-section">
          <strong>${previewIcon(section.icon)} ${esc(section.label || 'Section')}${section.staffOnly ? ' <small>(staff)</small>' : ''}</strong>
          <ul>
            ${(section.items || []).map((item) => {
              const isLabel = (item.features || []).includes('sectionLabel');
              const classes = [
                item.enabled === false ? 'disabled' : '',
                isLabel ? 'label' : ''
              ].filter(Boolean).join(' ');
              return `<li class="${classes}">${previewIcon(item.icon)} <span>${esc(item.label || 'Item')}</span></li>`;
            }).join('')}
          </ul>
        </div>
      `).join('')}
      <div class="preview-top">
        ${links.map((link) => `
          <span class="preview-chip ${link.enabled === false ? 'disabled' : ''}">${esc(link.label || link.destination)}</span>
        `).join('') || '<span class="lead">No quick links</span>'}
      </div>
      <div class="preview-top">
        <strong>Account ↓</strong>
        ${(navigation.accountMenu?.signedIn || []).filter((item) => item.enabled !== false).map((item) => {
          const features = item.features || [];
          if (features.includes('separator')) return '<span class="preview-chip">—</span>';
          return `<span class="preview-chip">${esc(item.label || item.destination || 'Item')}</span>`;
        }).join('') || '<span class="lead">No signed-in items</span>'}
      </div>
    `;
  }
  pushShellPreviewDraft();
}

function pushShellPreviewDraft() {
  window.clearTimeout(shellPreviewTimer);
  shellPreviewTimer = window.setTimeout(() => {
    if (!shellPreviewFrame?.contentWindow || !navigation || !shellPreviewReady) return;
    try {
      shellPreviewFrame.contentWindow.postMessage({
        type: STUDIO_MSG.NAV_DRAFT,
        navigation
      }, window.location.origin);
    } catch (_error) {
      /* ignore while loading */
    }
  }, 100);
}

function loadShellPreview({ force = false } = {}) {
  if (!shellPreviewFrame) return;
  if (!force && shellPreviewFrame.dataset.loaded === '1' && shellPreviewReady) {
    pushShellPreviewDraft();
    return;
  }
  shellPreviewReady = false;
  shellPreviewWrap?.classList.add('is-loading');
  shellPreviewFrame.dataset.loaded = '1';
  shellPreviewFrame.src = buildShellStudioPreviewUrl('home');
}

function renderAll() {
  if (brandInput && navigation) brandInput.value = navigation.brandRibbon || '';
  ensureAccountMenu();
  renderSidebar();
  renderTopBar();
  renderAccountMenu();
  renderTitles();
  renderPreview();
  loadShellPreview();
  showTab(activeTab);
}

function showTab(name) {
  activeTab = name;
  document.querySelectorAll('.tabs .tab').forEach((btn) => {
    const selected = btn.dataset.tab === name;
    btn.classList.toggle('active', selected);
    btn.setAttribute('aria-selected', selected ? 'true' : 'false');
  });
  [sidebarPanel, topbarPanel, accountPanel, titlesPanel].forEach((panel) => {
    if (!panel) return;
    const match = panel.dataset.panel === name;
    panel.classList.toggle('hidden', !match);
    panel.hidden = !match;
  });
}

function getSection(index) {
  return navigation?.sidebar?.sections?.[index];
}

function getItem(sectionIndex, itemIndex) {
  return getSection(sectionIndex)?.items?.[itemIndex];
}

function getAccountItem(listKey, itemIndex) {
  ensureAccountMenu();
  return navigation.accountMenu?.[listKey]?.[itemIndex];
}

function setIconEmoji(target, emoji) {
  target.icon = { type: 'emoji', value: String(emoji || '').slice(0, 8) };
}

async function handleUpload(file, target) {
  if (!file) return;
  setStatus('Uploading icon…');
  try {
    const uploaded = await uploadStudioAsset(file, 'nav-icons');
    target.icon = {
      type: 'image',
      url: uploaded.url,
      path: uploaded.path || ''
    };
    setStatus('Icon uploaded.', 'success');
    renderAll();
  } catch (error) {
    setStatus(error.message || 'Upload failed.', 'error');
  }
}

function syncFromDom() {
  // Values are applied on change; this is a safety no-op placeholder.
}

document.querySelector('.tabs')?.addEventListener('click', (event) => {
  const tab = event.target.closest('[data-tab]');
  if (!tab) return;
  showTab(tab.dataset.tab);
});

brandInput?.addEventListener('input', () => {
  if (!navigation) return;
  navigation.brandRibbon = brandInput.value;
  renderPreview();
});

function onEditorInput(event) {
  if (!navigation) return;
  const el = event.target;
  const field = el.dataset.field;
  if (!field) return;

  if (field === 'sectionLabel') {
    const section = getSection(Number(el.dataset.section));
    if (section) section.label = el.value;
    renderPreview();
    return;
  }
  if (field === 'staffOnly') {
    const section = getSection(Number(el.dataset.section));
    if (section) section.staffOnly = el.checked;
    renderPreview();
    return;
  }
  if (field === 'iconEmoji') {
    const sIndex = Number(el.dataset.section);
    const iIndex = el.dataset.item != null ? Number(el.dataset.item) : null;
    const target = el.dataset.target === 'item' ? getItem(sIndex, iIndex) : getSection(sIndex);
    if (target) setIconEmoji(target, el.value);
    renderPreview();
    return;
  }
  if (field === 'itemLabel') {
    const item = getItem(Number(el.dataset.section), Number(el.dataset.item));
    if (item) item.label = el.value;
    renderPreview();
    return;
  }
  if (field === 'destination') {
    const item = getItem(Number(el.dataset.section), Number(el.dataset.item));
    if (item) item.destination = el.value;
    return;
  }
  if (field === 'enabled') {
    const item = getItem(Number(el.dataset.section), Number(el.dataset.item));
    if (item) item.enabled = el.checked;
    renderPreview();
    return;
  }
  if (field === 'feature') {
    const item = getItem(Number(el.dataset.section), Number(el.dataset.item));
    if (!item) return;
    const feature = el.dataset.feature;
    const set = new Set(item.features || []);
    if (el.checked) set.add(feature);
    else set.delete(feature);
    item.features = [...set];
    if (feature === 'sectionLabel') {
      if (el.checked) item.destination = '';
      renderAll();
    } else {
      renderPreview();
    }
    return;
  }
  if (field === 'linkLabel') {
    const link = navigation.topBar.quickLinks[Number(el.dataset.link)];
    if (link) link.label = el.value;
    renderPreview();
    return;
  }
  if (field === 'linkDestination') {
    const link = navigation.topBar.quickLinks[Number(el.dataset.link)];
    if (link) link.destination = el.value;
    return;
  }
  if (field === 'linkEnabled') {
    const link = navigation.topBar.quickLinks[Number(el.dataset.link)];
    if (link) link.enabled = el.checked;
    renderPreview();
    return;
  }
  if (field === 'pageTitle') {
    const key = el.dataset.key;
    if (key) navigation.pageTitles[key] = el.value;
  }
  if (field === 'accountLabel') {
    const item = getAccountItem(el.dataset.accountList, Number(el.dataset.accountItem));
    if (item) item.label = el.value;
    renderPreview();
    return;
  }
  if (field === 'accountDestination') {
    const item = getAccountItem(el.dataset.accountList, Number(el.dataset.accountItem));
    if (item) item.destination = el.value;
    return;
  }
  if (field === 'accountEnabled') {
    const item = getAccountItem(el.dataset.accountList, Number(el.dataset.accountItem));
    if (item) item.enabled = el.checked;
    renderPreview();
    return;
  }
  if (field === 'accountFeature') {
    const item = getAccountItem(el.dataset.accountList, Number(el.dataset.accountItem));
    if (!item) return;
    const feature = el.dataset.feature;
    const set = new Set(item.features || []);
    if (el.checked) {
      if (ACCOUNT_SPECIAL.has(feature)) {
        for (const special of ACCOUNT_SPECIAL) set.delete(special);
      }
      set.add(feature);
      if (feature === 'separator') {
        item.label = '';
        item.destination = '';
      }
      if (feature === 'signOut' || feature === 'signIn' || feature === 'signUp') {
        item.destination = '';
      }
    } else {
      set.delete(feature);
    }
    item.features = [...set];
    renderAll();
  }
}

async function onEditorClick(event) {
  if (!navigation || busy) return;
  const btn = event.target.closest('[data-action], .emoji-btn');
  if (!btn) return;

  if (btn.classList.contains('emoji-btn')) {
    const emoji = btn.dataset.emoji || '';
    const sIndex = Number(btn.dataset.section);
    const iIndex = btn.dataset.item != null ? Number(btn.dataset.item) : null;
    const target = btn.dataset.target === 'item' ? getItem(sIndex, iIndex) : getSection(sIndex);
    if (target) {
      setIconEmoji(target, emoji);
      renderAll();
    }
    return;
  }

  const action = btn.dataset.action;
  const sIndex = btn.dataset.section != null ? Number(btn.dataset.section) : null;
  const iIndex = btn.dataset.item != null ? Number(btn.dataset.item) : null;
  const lIndex = btn.dataset.link != null ? Number(btn.dataset.link) : null;
  const delta = Number(btn.dataset.delta || 0);

  if (action === 'add-section') {
    navigation.sidebar.sections.push({
      id: uid('section'),
      label: 'New section',
      icon: { type: 'emoji', value: '✦' },
      staffOnly: false,
      items: []
    });
    renderAll();
    return;
  }
  if (action === 'remove-section' && sIndex != null) {
    navigation.sidebar.sections.splice(sIndex, 1);
    renderAll();
    return;
  }
  if (action === 'move-section' && sIndex != null) {
    moveItem(navigation.sidebar.sections, sIndex, delta);
    renderAll();
    return;
  }
  if (action === 'add-item' && sIndex != null) {
    const section = getSection(sIndex);
    if (!section) return;
    section.items = section.items || [];
    section.items.push({
      id: uid('item'),
      label: 'New link',
      icon: { type: 'emoji', value: '✦' },
      destination: 'home',
      enabled: true,
      features: []
    });
    renderAll();
    return;
  }
  if (action === 'remove-item' && sIndex != null && iIndex != null) {
    getSection(sIndex)?.items?.splice(iIndex, 1);
    renderAll();
    return;
  }
  if (action === 'move-item' && sIndex != null && iIndex != null) {
    const items = getSection(sIndex)?.items;
    if (items) moveItem(items, iIndex, delta);
    renderAll();
    return;
  }
  if (action === 'clear-icon') {
    const target = btn.dataset.target === 'item' ? getItem(sIndex, iIndex) : getSection(sIndex);
    if (target) setIconEmoji(target, '');
    renderAll();
    return;
  }
  if (action === 'add-link') {
    navigation.topBar.quickLinks = navigation.topBar.quickLinks || [];
    navigation.topBar.quickLinks.push({
      id: uid('top'),
      label: 'Link',
      destination: 'home',
      enabled: true
    });
    renderAll();
    return;
  }
  if (action === 'remove-link' && lIndex != null) {
    navigation.topBar.quickLinks.splice(lIndex, 1);
    renderAll();
    return;
  }
  if (action === 'move-link' && lIndex != null) {
    moveItem(navigation.topBar.quickLinks, lIndex, delta);
    renderAll();
  }
  if (action === 'add-account-item') {
    const listKey = btn.dataset.accountList;
    ensureAccountMenu();
    if (!navigation.accountMenu[listKey]) return;
    navigation.accountMenu[listKey].push({
      id: uid('account'),
      label: listKey === 'signedOut' ? 'Sign In' : 'Menu item',
      destination: listKey === 'signedOut' ? '' : 'profile',
      enabled: true,
      features: listKey === 'signedOut' ? ['signIn'] : []
    });
    renderAll();
    return;
  }
  if (action === 'remove-account-item') {
    const listKey = btn.dataset.accountList;
    const aIndex = Number(btn.dataset.accountItem);
    ensureAccountMenu();
    navigation.accountMenu[listKey]?.splice(aIndex, 1);
    renderAll();
    return;
  }
  if (action === 'move-account-item') {
    const listKey = btn.dataset.accountList;
    const aIndex = Number(btn.dataset.accountItem);
    ensureAccountMenu();
    const list = navigation.accountMenu[listKey];
    if (list) moveItem(list, aIndex, delta);
    renderAll();
  }
}

async function onEditorChange(event) {
  const input = event.target;
  if (input?.matches?.('input[type="file"][data-action="upload-icon"]')) {
    const file = input.files?.[0];
    const sIndex = Number(input.dataset.section);
    const iIndex = input.dataset.item != null ? Number(input.dataset.item) : null;
    const target = input.dataset.target === 'item' ? getItem(sIndex, iIndex) : getSection(sIndex);
    input.value = '';
    if (target) await handleUpload(file, target);
    return;
  }
  onEditorInput(event);
}

appEl.addEventListener('input', onEditorInput);
appEl.addEventListener('change', onEditorChange);
appEl.addEventListener('click', onEditorClick);

saveBtn.addEventListener('click', async () => {
  if (!navigation || busy) return;
  busy = true;
  saveBtn.disabled = true;
  setStatus('Saving…');
  try {
    syncFromDom();
    navigation.brandRibbon = brandInput.value;
    navigation = await saveShellNavigation(navigation);
    renderAll();
    setStatus('Website UI settings saved.', 'success');
    window.StarlightUI?.toast?.('Website UI saved.', 'success');
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
    title: 'Reset website UI?',
    message: 'This restores the default sidebar, top bar, account menu, brand ribbon, and page titles. Unsaved edits will be lost.',
    confirmText: 'Reset to Defaults',
    danger: true
  });
  if (!ok) return;
  busy = true;
  resetBtn.disabled = true;
  setStatus('Resetting…');
  try {
    navigation = await resetShellNavigation();
    renderAll();
    setStatus('Website UI reset to defaults.', 'success');
    window.StarlightUI?.toast?.('Website UI reset.', 'success');
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
    if (!canEditUi(access)) {
      setStatus('Administrator access is required to edit the website UI.', 'error');
      return;
    }
    setStatus('Loading website UI settings…');
    navigation = await getShellNavigation();
    appEl.hidden = false;
    appEl.classList.remove('hidden');
    saveBtn.hidden = false;
    resetBtn.hidden = false;
    renderAll();
    setStatus('Ready to edit. Live shell preview updates as you type; Save publishes.', 'success');
  } catch (error) {
    setStatus(error.message || 'Unable to load website UI settings.', 'error');
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data || {};
  if (data.type === STUDIO_MSG.READY && data.kind === 'shell') {
    shellPreviewReady = true;
    shellPreviewWrap?.classList.remove('is-loading');
    pushShellPreviewDraft();
  }
});

reloadShellPreviewBtn?.addEventListener('click', () => {
  loadShellPreview({ force: true });
});

boot();
