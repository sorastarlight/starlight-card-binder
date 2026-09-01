import { getMyStaffAccess } from '../staff-service.js';
import {
  getShellNavigation,
  saveShellNavigation,
  resetShellNavigation
} from '../shell-navigation-service.js';
import {
  PUBLIC_SHELL_DESTINATIONS,
  COMMON_NAV_EMOJIS,
  BRAND_ICONS,
  BRAND_ICON_IDS
} from '../shell-navigation-defaults.js';
import { uploadStudioAsset } from '../content-studio-service.js';
import { renderShellNavIcon } from '../shell-nav-icons.js';
import { mountAdminCrumb } from '../admin-shell.js';

const byId = (id) => document.getElementById(id);
const esc = (value) =>
  (window.StarlightUI?.escapeHtml || ((v) => String(v ?? '').replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  }[m]))))(value);

mountAdminCrumb({ tool: 'Navigation Studio' });

const FEATURES = [
  { id: 'dailyBadge', label: 'Daily indicator: READY badge' },
  { id: 'dailyRainbow', label: 'Daily indicator: Rainbow glow' },
  { id: 'tradeOfferBadge', label: 'Trade offer badge' },
  { id: 'notificationBadge', label: 'Notification badge' },
  { id: 'receivedGiftBadge', label: 'Received gift badge' },
  { id: 'clearSeries', label: 'Clear series filter (gallery)' },
  { id: 'clearCardSet', label: 'Clear event/special card set' },
  { id: 'eventCards', label: 'Event cards gallery filter' },
  { id: 'specialCards', label: 'Special cards gallery filter' },
  { id: 'seriesLinksSlot', label: 'Series catalog links slot' },
  { id: 'sectionLabel', label: 'Section label (no destination)' },
  { id: 'staffOnly', label: 'Staff / admin only' }
];

const TOP_BAR_FEATURES = [
  { id: 'dailyBadge', label: 'Daily indicator: READY badge' },
  { id: 'dailyRainbow', label: 'Daily indicator: Rainbow glow' },
  { id: 'tradeOfferBadge', label: 'Trade offer badge' },
  { id: 'notificationBadge', label: 'Notification badge' },
  { id: 'receivedGiftBadge', label: 'Received gift badge' },
  { id: 'staffOnly', label: 'Staff / admin only' }
];

const statusEl = byId('status');
const appEl = byId('app');
const brandInput = byId('brandRibbon');
const liveFeedToggle = byId('shellLiveFeedToggle');
const sidebarPanel = byId('panel-sidebar');
const topbarPanel = byId('panel-topbar');
const saveBtn = byId('saveBtn');
const resetBtn = byId('resetBtn');

let navigation = null;
let busy = false;

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

function brandPickerHtml(icon, dataAttrs) {
  const activeSrc = icon?.type === 'image' ? String(icon.url || icon.path || '') : '';
  return `<div class="brand-icon-picker" ${dataAttrs}>${BRAND_ICON_IDS.map((id) => {
    const brand = BRAND_ICONS[id];
    const active = activeSrc === brand.file
      || activeSrc.endsWith(`/${brand.id}.svg`)
      || activeSrc.endsWith(`/${brand.id}.png`);
    return `<button type="button" class="brand-icon-btn ${active ? 'active' : ''}" data-action="set-brand-icon" data-brand="${esc(brand.id)}" ${dataAttrs} title="${esc(brand.label)}" aria-label="${esc(brand.label)} icon">
      <img src="${esc(brand.file)}" alt="" width="18" height="18" decoding="async">
    </button>`;
  }).join('')}</div>`;
}

function emojiPickerHtml(selectedEmoji, dataAttrs) {
  return `<div class="emoji-picker" ${dataAttrs}>${COMMON_NAV_EMOJIS.map((emoji) => `
    <button type="button" class="emoji-btn ${selectedEmoji === emoji ? 'active' : ''}" data-emoji="${esc(emoji)}" ${dataAttrs} title="${esc(emoji)}">${esc(emoji)}</button>
  `).join('')}</div>`;
}

function iconPreviewHtml(icon) {
  if (icon?.type === 'image' && icon.url) {
    return `<span class="icon-preview"><img src="${esc(icon.url)}" alt=""></span>`;
  }
  if (icon?.type === 'svg' && icon.value) {
    return `<span class="icon-preview icon-preview-svg">${renderShellNavIcon(icon, esc)}</span>`;
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
  const isSvg = icon?.type === 'svg' && icon.value;
  const lockEmoji = isImage || isSvg;
  return `
    <div class="icon-row">
      ${iconPreviewHtml(icon)}
      <input type="text" maxlength="8" value="${esc(lockEmoji ? '' : (icon?.value || ''))}" data-field="iconEmoji" ${scopeAttrs} placeholder="Emoji" aria-label="Icon emoji" ${lockEmoji ? 'disabled' : ''}>
      <label class="btn small upload-label">Upload icon
        <input type="file" accept="image/png,image/webp,image/*" hidden data-action="upload-icon" ${scopeAttrs}>
      </label>
      ${lockEmoji ? `<button type="button" class="btn small" data-action="clear-icon" ${scopeAttrs}>Use emoji</button>` : ''}
    </div>
    <p class="icon-picker-label">Brand icons</p>
    ${brandPickerHtml(icon, scopeAttrs)}
    <p class="icon-picker-label">Emoji</p>
    ${emojiPickerHtml(lockEmoji ? '' : (icon?.value || ''), scopeAttrs)}
  `;
}

function renderSidebar() {
  const sections = (navigation?.sidebar?.sections || []).filter((section) => {
    // Keep top-nav menus; skip empty Home shell stubs and mobile-only drawers.
    if (section.mobileOnly) return false;
    if (section.id === 'home' && !String(section.label || '').trim()) return false;
    return true;
  });
  const allSections = navigation?.sidebar?.sections || [];
  sidebarPanel.innerHTML = `
    <h3 class="admin-panel__title">Dropdown menus</h3>
    <p class="lead">These menus appear in the top navigation — including <strong>Cards</strong> (Card Gallery, Card Series, Event Cards, Special Cards), My Collection, Shop, and Community.</p>
    <div class="section-list">
      ${sections.map((section) => {
        const sIndex = allSections.indexOf(section);
        return `
        <article class="section-card" data-section="${sIndex}">
          <header>
            <div class="section-meta">
              <label>Menu label
                <input type="text" maxlength="80" value="${esc(section.label || '')}" data-field="sectionLabel" data-section="${sIndex}">
              </label>
              ${renderIconControls(section.icon, `data-section="${sIndex}" data-target="section"`)}
              <div class="checks">
                <label><input type="checkbox" data-field="mega" data-section="${sIndex}" ${section.mega ? 'checked' : ''}> Dropdown menu</label>
                <label><input type="checkbox" data-field="staffOnly" data-section="${sIndex}" ${section.staffOnly ? 'checked' : ''}> Staff only</label>
              </div>
            </div>
            <div class="row-tools">
              <button type="button" class="btn small" data-action="move-section" data-section="${sIndex}" data-delta="-1" ${sIndex <= 0 ? 'disabled' : ''}>↑</button>
              <button type="button" class="btn small" data-action="move-section" data-section="${sIndex}" data-delta="1" ${sIndex >= allSections.length - 1 ? 'disabled' : ''}>↓</button>
              <button type="button" class="btn small danger" data-action="remove-section" data-section="${sIndex}">Remove menu</button>
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
                  <label>CSS class
                    <input type="text" maxlength="80" value="${esc(item.className || '')}" data-field="itemClassName" data-section="${sIndex}" data-item="${iIndex}" placeholder="optional chrome class">
                  </label>
                  <div class="checks admin-feature-grid">
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
            }).join('') || '<p class="lead">No items in this menu yet.</p>'}
          </div>
          <div class="panel-actions">
            <button type="button" class="btn small" data-action="add-item" data-section="${sIndex}">＋ Add item</button>
          </div>
        </article>`;
      }).join('') || '<p class="lead">No top navigation menus yet.</p>'}
    </div>
    <div class="panel-actions">
      <button type="button" class="btn" data-action="add-section">＋ Add menu</button>
    </div>
  `;
}

function renderTopBar() {
  const links = navigation?.topBar?.quickLinks || [];
  topbarPanel.innerHTML = `
    <h3 class="admin-panel__title">Strip links</h3>
    <p class="lead">Top-navigation strip links (for example Home and Free Daily Card Pack). Reorder, rename, enable/disable, and choose a daily indicator: READY badge or rainbow glow (one at a time).</p>
    <div class="link-list admin-editor-list">
      ${links.map((link, index) => {
        const features = new Set(link.features || []);
        return `
        <article class="link-card admin-editor-card" data-link="${index}">
          <div class="admin-editor-card__row item-fields">
            <label>Label
              <input type="text" maxlength="40" value="${esc(link.label || '')}" data-field="linkLabel" data-link="${index}">
            </label>
            <label>Destination
              <select data-field="linkDestination" data-link="${index}">
                ${destinationOptions(link.destination || 'home')}
              </select>
            </label>
            <label>CSS class
              <input type="text" maxlength="80" value="${esc(link.className || '')}" data-field="linkClassName" data-link="${index}" placeholder="e.g. shell-daily-top-link">
            </label>
          </div>
          <div class="checks admin-feature-grid">
            <label><input type="checkbox" data-field="linkEnabled" data-link="${index}" ${link.enabled !== false ? 'checked' : ''}> Enabled</label>
            ${TOP_BAR_FEATURES.map((feature) => `
              <label>
                <input type="checkbox" data-field="linkFeature" data-feature="${feature.id}" data-link="${index}" ${features.has(feature.id) ? 'checked' : ''}>
                ${esc(feature.label)}
              </label>
            `).join('')}
          </div>
          <div class="row-tools">
            <button type="button" class="btn small" data-action="move-link" data-link="${index}" data-delta="-1" ${index === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="btn small" data-action="move-link" data-link="${index}" data-delta="1" ${index === links.length - 1 ? 'disabled' : ''}>↓</button>
            <button type="button" class="btn small danger" data-action="remove-link" data-link="${index}">Remove</button>
          </div>
        </article>`;
      }).join('') || '<p class="lead">No strip links yet.</p>'}
    </div>
    <div class="panel-actions">
      <button type="button" class="btn" data-action="add-link">＋ Add strip link</button>
    </div>
  `;
}

function renderAll() {
  if (brandInput && navigation) brandInput.value = navigation.brandRibbon || '';
  navigation.chrome = navigation.chrome && typeof navigation.chrome === 'object'
    ? navigation.chrome
    : { layout: 'masthead', showLiveFeed: true };
  navigation.chrome.layout = 'masthead';
  if (liveFeedToggle) liveFeedToggle.checked = navigation.chrome.showLiveFeed !== false;
  renderSidebar();
  renderTopBar();
  if (sidebarPanel) {
    sidebarPanel.classList.remove('hidden', 'admin-hidden');
    sidebarPanel.hidden = false;
  }
  if (topbarPanel) {
    topbarPanel.classList.remove('hidden', 'admin-hidden');
    topbarPanel.hidden = false;
  }
}

function getSection(index) {
  return navigation?.sidebar?.sections?.[index];
}

function getItem(sectionIndex, itemIndex) {
  return getSection(sectionIndex)?.items?.[itemIndex];
}

function setIconBrand(target, brandId) {
  const brand = BRAND_ICONS[brandId];
  if (!target || !brand) return;
  target.icon = {
    type: 'image',
    url: brand.file,
    path: brand.file
  };
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

brandInput?.addEventListener('input', () => {
  if (!navigation) return;
  navigation.brandRibbon = brandInput.value;
});

liveFeedToggle?.addEventListener('change', () => {
  if (!navigation) return;
  navigation.chrome = navigation.chrome && typeof navigation.chrome === 'object'
    ? navigation.chrome
    : { layout: 'masthead', showLiveFeed: true };
  navigation.chrome.layout = 'masthead';
  navigation.chrome.showLiveFeed = Boolean(liveFeedToggle.checked);
});

function onEditorInput(event) {
  if (!navigation) return;
  const el = event.target;
  const field = el.dataset.field;
  if (!field) return;

  if (field === 'sectionLabel') {
    const section = getSection(Number(el.dataset.section));
    if (section) section.label = el.value;
    return;
  }
  if (field === 'staffOnly') {
    const section = getSection(Number(el.dataset.section));
    if (section) section.staffOnly = el.checked;
    return;
  }
  if (field === 'mega') {
    const section = getSection(Number(el.dataset.section));
    if (section) section.mega = el.checked;
    return;
  }
  if (field === 'iconEmoji') {
    const sIndex = Number(el.dataset.section);
    const iIndex = el.dataset.item != null ? Number(el.dataset.item) : null;
    const target = el.dataset.target === 'item' ? getItem(sIndex, iIndex) : getSection(sIndex);
    if (target) setIconEmoji(target, el.value);
    return;
  }
  if (field === 'itemLabel') {
    const item = getItem(Number(el.dataset.section), Number(el.dataset.item));
    if (item) item.label = el.value;
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
    return;
  }
  if (field === 'feature') {
    const item = getItem(Number(el.dataset.section), Number(el.dataset.item));
    if (!item) return;
    const feature = el.dataset.feature;
    const set = new Set(item.features || []);
    if (el.checked) set.add(feature);
    else set.delete(feature);
    if (el.checked && feature === 'dailyBadge') set.delete('dailyRainbow');
    if (el.checked && feature === 'dailyRainbow') set.delete('dailyBadge');
    item.features = [...set];
    if (feature === 'sectionLabel') {
      if (el.checked) item.destination = '';
      renderAll();
    }
    return;
  }
  if (field === 'itemClassName') {
    const item = getItem(Number(el.dataset.section), Number(el.dataset.item));
    if (item) item.className = el.value;
    return;
  }
  if (field === 'linkLabel') {
    const link = navigation.topBar.quickLinks[Number(el.dataset.link)];
    if (link) link.label = el.value;
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
    return;
  }
  if (field === 'linkClassName') {
    const link = navigation.topBar.quickLinks[Number(el.dataset.link)];
    if (link) link.className = el.value;
    return;
  }
  if (field === 'linkFeature') {
    const link = navigation.topBar.quickLinks[Number(el.dataset.link)];
    if (!link) return;
    const feature = el.dataset.feature;
    const set = new Set(link.features || []);
    if (el.checked) set.add(feature);
    else set.delete(feature);
    if (el.checked && feature === 'dailyBadge') set.delete('dailyRainbow');
    if (el.checked && feature === 'dailyRainbow') set.delete('dailyBadge');
    link.features = [...set];
    if (feature === 'dailyBadge' || feature === 'dailyRainbow') renderAll();
  }
}

async function onEditorClick(event) {
  if (!navigation || busy) return;
  const btn = event.target.closest('[data-action], .emoji-btn');
  if (!btn) return;

  if (btn.classList.contains('emoji-btn')) {
    const scope = btn.closest('.emoji-picker') || btn;
    const emoji = btn.dataset.emoji || btn.textContent.trim() || '';
    const sIndex = Number(scope.dataset.section);
    const iIndex = scope.dataset.item != null ? Number(scope.dataset.item) : null;
    const target = scope.dataset.target === 'item' ? getItem(sIndex, iIndex) : getSection(sIndex);
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
      label: 'New menu',
      icon: { type: 'emoji', value: '✦' },
      staffOnly: false,
      mega: true,
      mobileOnly: false,
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
  if (action === 'set-brand-icon') {
    const target = btn.dataset.target === 'item' ? getItem(sIndex, iIndex) : getSection(sIndex);
    if (target) setIconBrand(target, btn.dataset.brand);
    renderAll();
    return;
  }
  if (action === 'add-link') {
    navigation.topBar.quickLinks = navigation.topBar.quickLinks || [];
    navigation.topBar.quickLinks.push({
      id: uid('top'),
      label: 'Link',
      destination: 'home',
      enabled: true,
      features: [],
      className: ''
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
    navigation.chrome = navigation.chrome && typeof navigation.chrome === 'object'
      ? navigation.chrome
      : { layout: 'masthead', showLiveFeed: true };
    navigation.chrome.layout = 'masthead';
    navigation = await saveShellNavigation(navigation);
    renderAll();
    setStatus('Navigation Studio settings saved.', 'success');
    window.StarlightUI?.toast?.('Navigation saved.', 'success');
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
    title: 'Reset navigation?',
    message: 'This restores the default top navigation, brand ribbon, and live-feed setting. Unsaved edits will be lost.',
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
    setStatus('Navigation reset to defaults.', 'success');
    window.StarlightUI?.toast?.('Navigation reset.', 'success');
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
      setStatus('Administrator access is required to edit Navigation Studio.', 'error');
      return;
    }
    setStatus('Loading navigation settings…');
    navigation = await getShellNavigation();
    appEl.hidden = false;
    appEl.classList.remove('hidden', 'admin-hidden');
    saveBtn.hidden = false;
    resetBtn.hidden = false;
    renderAll();
    setStatus('Ready. Save publishes top navigation for every collector.', 'success');
  } catch (error) {
    setStatus(error.message || 'Unable to load navigation settings.', 'error');
  }
}

boot();
