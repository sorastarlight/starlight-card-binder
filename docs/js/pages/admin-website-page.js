import { getMyStaffAccess } from '../staff-service.js';
import {
  cloneDefaultWebsiteContent,
  HOME_QUICK_LINK_IDS,
  WEBSITE_EDITOR_TABS
} from '../website-content-defaults.js';
import { getPageMeta, listedFieldKeys, isHideableField } from '../website-content-field-meta.js';
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
const previewHintEl = byId('previewHint');
const pageMetaEl = byId('pageMeta');
const fieldSearchEl = byId('fieldSearch');
const saveBtn = byId('saveBtn');
const resetBtn = byId('resetBtn');
const resetPageBtn = byId('resetPageBtn');
const openPreviewBtn = byId('openPreviewBtn');

let content = null;
const defaults = cloneDefaultWebsiteContent();
/** Remembers last non-empty value when a field is hidden, keyed as section.key */
const fieldMemory = Object.create(null);
let activeTab = WEBSITE_EDITOR_TABS[0].id;
let busy = false;
let fieldQuery = '';
let previewMode = 'full';

function memoryKey(sectionKey, key) {
  return `${sectionKey}.${key}`;
}

function rememberField(sectionKey, key, value) {
  const trimmed = String(value || '').trim();
  if (trimmed) fieldMemory[memoryKey(sectionKey, key)] = trimmed;
}

function restoreField(sectionKey, key) {
  return fieldMemory[memoryKey(sectionKey, key)]
    || defaults?.[sectionKey]?.[key]
    || '';
}

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

function isModified(sectionKey, key) {
  const current = content?.[sectionKey]?.[key];
  const fallback = defaults?.[sectionKey]?.[key];
  if (typeof current !== 'string') return false;
  return String(current) !== String(fallback ?? '');
}

function modifiedCount(sectionKey) {
  const section = content?.[sectionKey] || {};
  return Object.keys(section).filter((key) => typeof section[key] === 'string' && isModified(sectionKey, key)).length;
}

function matchesQuery(label, key, value) {
  const q = fieldQuery.trim().toLowerCase();
  if (!q) return true;
  return [label, key, value].some((part) => String(part || '').toLowerCase().includes(q));
}

function field(label, attrs, value, {
  multiline = false,
  hint = '',
  modified = false,
  key = '',
  hideable = false,
  sectionKey = '',
  visible = true
} = {}) {
  const control = multiline
    ? `<textarea ${attrs} ${visible ? '' : 'disabled'}>${esc(value || '')}</textarea>`
    : `<input type="text" value="${esc(value || '')}" ${attrs} ${visible ? '' : 'disabled'}>`;
  const visibility = hideable ? `
    <label class="field-visibility">
      <input type="checkbox" data-visibility-path="${esc(sectionKey)}.${esc(key)}" ${visible ? 'checked' : ''}>
      <span>Show on page</span>
    </label>
  ` : '';
  return `
    <div class="field ${modified ? 'is-modified' : ''} ${hideable && !visible ? 'is-hidden-field' : ''}" data-field-key="${esc(key)}">
      <div class="field-label-row">
        <span class="field-label">${esc(label)}</span>
        <span class="field-label-tools">
          ${modified ? '<span class="field-badge">Edited</span>' : ''}
          ${!visible ? '<span class="field-badge hidden-badge">Hidden</span>' : ''}
          ${visibility}
        </span>
      </div>
      <label class="field-control">
        ${control}
      </label>
      ${hint ? `<p class="field-hint">${esc(hint)}</p>` : ''}
      ${hideable && !visible ? '<p class="field-hint">Hidden on the live page. Turn on “Show on page” to restore it.</p>' : ''}
    </div>
  `;
}

function renderTabs() {
  tablist.innerHTML = WEBSITE_EDITOR_TABS.map((tab) => {
    const count = content ? modifiedCount(tab.id) : 0;
    return `
      <button type="button" class="tab ${tab.id === activeTab ? 'active' : ''}" role="tab"
        aria-selected="${tab.id === activeTab}" data-tab="${esc(tab.id)}">
        ${esc(tab.label)}
        ${count ? `<span class="tab-count" title="${count} edited field${count === 1 ? '' : 's'}">${count}</span>` : ''}
      </button>
    `;
  }).join('');
}

function renderStringField(sectionKey, fieldMeta, value) {
  const key = fieldMeta.key;
  const label = fieldMeta.label || labelForFieldKey(key);
  if (!matchesQuery(label, key, value)) return '';
  const longDefault = new Set(['lead', 'signInLead', 'morePacksLead', 'emptyLead', 'emptyWishlist', 'emptyTrade', 'composeEmpty', 'accountIntro', 'signedOutLead', 'duplicatesLead', 'chooseNote', 'exchangeNote', 'exchangeLead', 'wishlistCardLead', 'offersCardLead', 'publicCardLead', 'footerLead', 'tagline', 'splashTitle', 'gridBrowseLead', 'gridSearchLead', 'readyLead', 'claimedLead', 'disabledLead', 'resultsTitle', 'favoritesShowcaseEmptyLead', 'emptyAllLead', 'emptyFavoritesLead', 'emptyFiltersLead', 'showcaseEmptyLead', 'showcasePickLead', 'signInDescription', 'signUpDescription', 'infoStripCollection', 'loadError']);
  const multiline = Boolean(fieldMeta.multiline || longDefault.has(key) || String(value || '').length > 90);
  const hideable = isHideableField(fieldMeta);
  const visible = String(value ?? '').trim().length > 0;
  if (visible) rememberField(sectionKey, key, value);
  return field(
    label,
    `maxlength="500" data-path="${esc(sectionKey)}.${esc(key)}"`,
    value,
    {
      multiline,
      hint: fieldMeta.hint || (hideable ? 'Uncheck “Show on page” to remove this from the live page.' : ''),
      modified: isModified(sectionKey, key),
      key,
      hideable,
      sectionKey,
      visible: hideable ? visible : true
    }
  );
}

function renderGroupedFields(sectionKey, section) {
  const meta = getPageMeta(sectionKey);
  if (!meta) {
    const keys = Object.keys(section).filter((key) => typeof section[key] === 'string');
    return `<div class="field-grid wide">${keys.map((key) => renderStringField(sectionKey, { key }, section[key])).join('')}</div>`;
  }

  const listed = new Set(listedFieldKeys(sectionKey));
  const groupsHtml = meta.groups.map((group) => {
    const fieldsHtml = group.fields
      .map((fieldMeta) => renderStringField(sectionKey, fieldMeta, section[fieldMeta.key] ?? ''))
      .join('');
    if (!fieldsHtml && fieldQuery) return '';
    return `
      <details class="field-group" ${group.open || fieldQuery ? 'open' : ''}>
        <summary>
          <span>${esc(group.label)}</span>
          <span class="group-count">${group.fields.length}</span>
        </summary>
        ${group.description ? `<p class="group-desc">${esc(group.description)}</p>` : ''}
        <div class="field-grid wide">${fieldsHtml || '<p class="lead">No fields match this search.</p>'}</div>
      </details>
    `;
  }).join('');

  const extras = Object.keys(section)
    .filter((key) => typeof section[key] === 'string' && !listed.has(key))
    .filter((key) => matchesQuery(labelForFieldKey(key), key, section[key]));

  const extrasHtml = extras.length ? `
    <details class="field-group" ${fieldQuery ? 'open' : ''}>
      <summary>
        <span>Extra saved fields</span>
        <span class="group-count">${extras.length}</span>
      </summary>
      <p class="group-desc">Custom string keys already stored for this page. Kept for forward compatibility.</p>
      <div class="field-grid wide">
        ${extras.map((key) => renderStringField(sectionKey, { key }, section[key])).join('')}
      </div>
    </details>
  ` : '';

  return groupsHtml + extrasHtml;
}

function renderHomeExtras() {
  const home = content.home;
  const rows = HOME_QUICK_LINK_IDS.map((id) => {
    const link = home.quickLinks.find((entry) => entry.id === id) || { id, label: id };
    if (!matchesQuery('Quick link', id, link.label)) return '';
    return `
      <div class="field ${isModified('home', 'quickLinks') ? '' : ''}">
        <span class="quick-link-id">${esc(id)}</span>
        <label>Label
          <input type="text" maxlength="40" value="${esc(link.label || '')}" data-quick-link="${esc(id)}">
        </label>
      </div>
    `;
  }).join('');
  if (!rows && fieldQuery) return '';
  return `
    <details class="field-group" open>
      <summary><span>Quick links</span><span class="group-count">${HOME_QUICK_LINK_IDS.length}</span></summary>
      <p class="group-desc">Destinations stay fixed to left-nav routes. Edit labels only.</p>
      <div class="field-grid">${rows}</div>
    </details>
  `;
}

function renderSocialLinks() {
  if (fieldQuery && !['social', 'link', 'url', 'handle', 'icon'].some((token) => fieldQuery.includes(token))) {
    return '';
  }
  const links = content.socials.links || [];
  return `
    <details class="field-group" open>
      <summary><span>Social links</span><span class="group-count">${links.length}</span></summary>
      <p class="group-desc">Add, reorder, or remove public social destinations.</p>
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
    </details>
  `;
}

function valuesByPreview(section, role) {
  const meta = getPageMeta(activeTab);
  if (!meta) return [];
  return meta.groups
    .flatMap((group) => group.fields)
    .filter((fieldMeta) => fieldMeta.preview === role)
    .map((fieldMeta) => section[fieldMeta.key])
    .filter(Boolean);
}

function renderPreview() {
  const section = content[activeTab] || {};
  const meta = getPageMeta(activeTab);
  const eyebrow = valuesByPreview(section, 'eyebrow')[0] ?? section.eyebrow ?? '';
  const titleRaw = valuesByPreview(section, 'title')[0] ?? section.title ?? section.brandTitle ?? '';
  const title = titleRaw || (previewMode === 'empty' ? '' : labelForFieldKey(activeTab));
  const lead = valuesByPreview(section, 'lead')[0] ?? section.lead ?? section.signInDescription ?? '';
  const splash = valuesByPreview(section, 'splash')[0] ?? section.splashTitle ?? '';
  const primaryCtas = valuesByPreview(section, 'cta-primary');
  const ctas = [...primaryCtas, ...valuesByPreview(section, 'cta')];
  const chips = valuesByPreview(section, 'chip');
  const emptyTitle = valuesByPreview(section, 'empty-title')[0] || '';
  const emptyLead = valuesByPreview(section, 'empty-lead')[0] || '';
  const edited = modifiedCount(activeTab);
  const stringCount = Object.keys(section).filter((key) => typeof section[key] === 'string').length;
  const hiddenCount = Object.keys(section).filter((key) => typeof section[key] === 'string' && !String(section[key]).trim()).length;
  const showHero = previewMode !== 'empty';
  const showSplash = Boolean(splash) && previewMode !== 'hero';
  const showChips = chips.length > 0 && previewMode === 'full';
  const showEmpty = (emptyTitle || emptyLead) && previewMode !== 'hero';

  if (previewHintEl) {
    previewHintEl.textContent = meta?.description
      || 'Live composition of the selected page’s marketing blocks. Save to publish.';
  }

  const heroBlock = showHero ? `
    <div class="preview-block preview-hero">
      ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
      ${titleRaw ? `<h3>${esc(titleRaw)}</h3>` : '<p class="preview-hidden-note">Title hidden</p>'}
      ${lead ? `<p>${esc(lead)}</p>` : ''}
      ${ctas.length ? `<div class="preview-actions">${ctas.map((label, index) => `<span class="preview-chip ${index === 0 && primaryCtas.includes(label) ? 'primary' : ''}">${esc(label)}</span>`).join('')}</div>` : ''}
    </div>
  ` : '';

  const splashBlock = showSplash ? `
    <div class="preview-block preview-splash">
      <p class="eyebrow">Series splash</p>
      <h3>${esc(splash)}</h3>
      <div class="preview-pack-row" aria-hidden="true">
        <span class="preview-pack"></span><span class="preview-pack"></span><span class="preview-pack"></span>
      </div>
    </div>
  ` : '';

  const chipsBlock = showChips ? `
    <div class="preview-block">
      <p class="eyebrow">Labels & tabs</p>
      <div class="preview-actions">${chips.slice(0, 8).map((label) => `<span class="preview-chip">${esc(label)}</span>`).join('')}</div>
    </div>
  ` : '';

  const emptyBlock = showEmpty ? `
    <div class="preview-block preview-empty">
      <p class="eyebrow">Empty / signed-out state</p>
      ${emptyTitle ? `<h3>${esc(emptyTitle)}</h3>` : '<h3>Empty state</h3>'}
      ${emptyLead ? `<p>${esc(emptyLead)}</p>` : '<p>No empty-state copy on this page yet.</p>'}
    </div>
  ` : '';

  const socialBlock = activeTab === 'socials' && Array.isArray(section.links) && previewMode === 'full' ? `
    <div class="preview-block">
      <p class="eyebrow">Social links</p>
      <div class="preview-social">
        ${section.links.slice(0, 4).map((link) => `
          <div class="preview-social-row">
            <span>${esc(link.icon || '✦')}</span>
            <div><strong>${esc(link.label || 'Link')}</strong><small>${esc(link.handle || link.url || '')}</small></div>
          </div>
        `).join('')}
      </div>
    </div>
  ` : '';

  previewEl.innerHTML = `
    ${heroBlock}
    ${splashBlock}
    ${chipsBlock}
    ${emptyBlock}
    ${socialBlock}
    <p class="preview-meta">${stringCount} text fields · ${edited} edited · ${hiddenCount} hidden · preview: ${esc(previewMode)}</p>
  `;
}

function updatePageChrome() {
  const tabMeta = WEBSITE_EDITOR_TABS.find((tab) => tab.id === activeTab);
  const pageMeta = getPageMeta(activeTab);
  if (pageMetaEl) {
    pageMetaEl.innerHTML = `
      <strong>${esc(tabMeta?.label || activeTab)}</strong>
      <span>${esc(pageMeta?.description || 'Edit every string on this page.')}</span>
      ${pageMeta?.previewUrl ? `<a class="page-link" href="${esc(pageMeta.previewUrl)}" target="_blank" rel="noopener">Open live page</a>` : ''}
    `;
  }
  if (openPreviewBtn && pageMeta?.previewUrl) {
    openPreviewBtn.hidden = false;
    openPreviewBtn.dataset.href = pageMeta.previewUrl;
  } else if (openPreviewBtn) {
    openPreviewBtn.hidden = true;
  }
}

function renderEditor() {
  const section = content[activeTab];
  if (!section || typeof section !== 'object') {
    editorPanel.innerHTML = '<p class="lead">Unknown page section.</p>';
    return;
  }

  updatePageChrome();

  let html = `
    <div class="editor-toolbar">
      <div class="preview-mode" role="group" aria-label="Preview what to show">
        <button type="button" class="btn small ${previewMode === 'hero' ? 'primary' : ''}" data-preview-mode="hero">Page header only</button>
        <button type="button" class="btn small ${previewMode === 'full' ? 'primary' : ''}" data-preview-mode="full">Full page preview</button>
        <button type="button" class="btn small ${previewMode === 'empty' ? 'primary' : ''}" data-preview-mode="empty">Empty / signed-out messages</button>
      </div>
      <p class="editor-note">${modifiedCount(activeTab)} field${modifiedCount(activeTab) === 1 ? '' : 's'} differ from defaults on this page.</p>
    </div>
  `;
  html += renderGroupedFields(activeTab, section);
  if (activeTab === 'home') html += renderHomeExtras();
  if (activeTab === 'socials') html += renderSocialLinks();

  editorPanel.innerHTML = html || '<p class="lead">No fields match your search.</p>';
  renderPreview();
}

function syncFromDom() {
  editorPanel.querySelectorAll('[data-path]').forEach((input) => {
    if (input.disabled) return;
    const path = input.getAttribute('data-path');
    const [section, key] = path.split('.');
    if (!content[section] || !key) return;
    content[section][key] = input.value;
    rememberField(section, key, input.value);
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
    if (resetPageBtn) resetPageBtn.hidden = false;
    setStatus('Visual Website Editor ready. Edit any left-nav page group, preview live, then Save.');
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

fieldSearchEl?.addEventListener('input', () => {
  syncFromDom();
  fieldQuery = fieldSearchEl.value || '';
  renderEditor();
});

editorPanel.addEventListener('input', () => {
  syncFromDom();
  renderTabs();
  renderPreview();
  const note = editorPanel.querySelector('.editor-note');
  if (note) {
    const count = modifiedCount(activeTab);
    note.textContent = `${count} field${count === 1 ? '' : 's'} differ from defaults on this page.`;
  }
});

editorPanel.addEventListener('change', (event) => {
  const toggle = event.target.closest('[data-visibility-path]');
  if (!toggle) return;
  const path = toggle.getAttribute('data-visibility-path');
  const [section, key] = path.split('.');
  if (!content[section] || !key) return;
  syncFromDom();
  if (toggle.checked) {
    content[section][key] = restoreField(section, key);
  } else {
    rememberField(section, key, content[section][key]);
    content[section][key] = '';
  }
  renderAll();
});

editorPanel.addEventListener('click', (event) => {
  const modeBtn = event.target.closest('[data-preview-mode]');
  if (modeBtn) {
    previewMode = modeBtn.getAttribute('data-preview-mode') || 'full';
    editorPanel.querySelectorAll('[data-preview-mode]').forEach((btn) => {
      btn.classList.toggle('primary', btn.getAttribute('data-preview-mode') === previewMode);
    });
    renderPreview();
    return;
  }

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

openPreviewBtn?.addEventListener('click', () => {
  const href = openPreviewBtn.dataset.href;
  if (href) window.open(href, '_blank', 'noopener');
});

resetPageBtn?.addEventListener('click', async () => {
  if (busy) return;
  const tabMeta = WEBSITE_EDITOR_TABS.find((tab) => tab.id === activeTab);
  const confirmed = await window.StarlightUI?.confirm?.({
    title: `Reset ${tabMeta?.label || 'this page'}?`,
    message: 'Restores only this page’s copy to built-in defaults. Save afterward to publish.',
    confirmText: 'Reset Page'
  });
  if (!confirmed) return;
  syncFromDom();
  content[activeTab] = structuredClone(defaults[activeTab]);
  setStatus(`${tabMeta?.label || 'Page'} reset locally. Click Save Changes to publish.`, 'success');
  renderAll();
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
    title: 'Reset all website content?',
    message: 'This restores every public page’s marketing copy to the built-in defaults.',
    confirmText: 'Reset Everything'
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
