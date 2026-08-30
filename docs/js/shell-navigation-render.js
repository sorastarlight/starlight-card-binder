import { mergeShellNavigation } from './shell-navigation-model.js';
import { cloneDefaultShellNavigation } from './shell-navigation-defaults.js';
import { loginShellHref, shellHref } from './shell-route-utils.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

function renderIcon(icon, fallback = '') {
  if (icon?.type === 'image' && icon.url) {
    const isStarBit = String(icon.url).includes('star-bit.');
    const cls = isStarBit ? 'shell-nav-icon-img star-bit-icon' : 'shell-nav-icon-img';
    return `<img class="${cls}" src="${esc(icon.url)}" alt="" width="20" height="20" decoding="async">`;
  }
  const emoji = icon?.value || fallback;
  return emoji ? `<span class="shell-nav-icon">${esc(emoji)}</span>` : '';
}

function itemBadge(features = []) {
  if (features.includes('dailyBadge')) {
    return '<span class="shell-daily-ready-badge" data-daily-nav-badge="" hidden="">READY</span>';
  }
  if (features.includes('tradeOfferBadge')) {
    return '<span class="shell-nav-badge" data-trade-offer-badge="" hidden="">0</span>';
  }
  if (features.includes('notificationBadge')) {
    return '<span class="shell-nav-badge" data-notification-badge hidden>0</span>';
  }
  if (features.includes('receivedGiftBadge')) {
    return '<span class="shell-nav-badge" data-received-reward-badge hidden>0</span>';
  }
  return '';
}

function itemHref(item) {
  const destination = item.destination || 'home';
  const features = item.features || [];
  const params = {};
  if (features.includes('clearSeries')) params.series = 'All Series';
  if (item.seriesKey) params.series = item.seriesKey;
  return shellHref(destination, params);
}

function renderAccountMenuItem(item, { isStaff = false } = {}) {
  if (item.enabled === false) return '';
  const features = item.features || [];
  if (features.includes('staffOnly') && !isStaff) return '';
  if (features.includes('separator')) {
    return '<hr class="shell-account-menu-sep" aria-hidden="true"/>';
  }
  if (features.includes('signOut')) {
    return `<button role="menuitem" type="button" class="shell-signout-button" data-shell-signout>${esc(item.label || 'Sign Out')}</button>`;
  }
  if (features.includes('signIn')) {
    return `<a role="menuitem" data-shell-auth="signin" href="${loginShellHref('signin')}">${esc(item.label || 'Sign In')}</a>`;
  }
  if (features.includes('signUp')) {
    return `<a role="menuitem" data-shell-auth="signup" href="${loginShellHref('signup')}">${esc(item.label || 'Register')}</a>`;
  }
  if (features.includes('profileLink')) {
    return `<a role="menuitem" class="shell-profile-link" data-shell-profile-link="" href="${shellHref('profile')}">${esc(item.label || 'View My Profile')}${itemBadge(features)}</a>`;
  }
  const destination = item.destination || 'home';
  const staffClass = features.includes('staffOnly') ? ' staff-link visible' : '';
  return `<a role="menuitem" class="${staffClass.trim()}" data-shell-view="${esc(destination)}" href="${shellHref(destination)}">${esc(item.label || destination)}${itemBadge(features)}</a>`;
}

function renderNavLink(item) {
  if (item.enabled === false) return '';
  const features = item.features || [];
  if (features.includes('sectionLabel')) {
    return `<p class="shell-nav-label shell-nav-label-sub">${renderIcon(item.icon)} ${esc(item.label)}</p>`;
  }
  const destination = item.destination || 'home';
  const classes = ['shell-nav-item', item.className || ''].filter(Boolean).join(' ');
  const staffClass = features.includes('staffOnly') ? ' staff-link' : '';
  const seriesAttr = item.seriesKey ? ` data-series-key="${esc(item.seriesKey)}"` : '';
  const clearAttr = features.includes('clearSeries') ? ' data-clear-series="1"' : '';
  return `<a class="${esc(classes)}${staffClass}" data-shell-view="${esc(destination)}" href="${itemHref(item)}"${seriesAttr}${clearAttr}>${renderIcon(item.icon)} <span>${esc(item.label)}</span>${itemBadge(features)}</a>`;
}

function renderMegaSection(section) {
  const itemsHtml = (section.items || []).map(renderNavLink).join('');
  if (!itemsHtml.trim()) return '';
  const staffClass = section.staffOnly ? ' shell-nav-staff' : '';
  const mobileClass = section.mobileOnly ? ' is-mobile-only' : '';
  const seriesPanelAttr = section.id === 'series' ? ' data-series-mega-panel' : '';
  return `<div class="shell-mega${staffClass}${mobileClass}" data-mega="${esc(section.id)}">
    <button type="button" class="shell-mega-trigger" aria-expanded="false" aria-haspopup="true" data-mega-trigger="${esc(section.id)}">${esc(section.label)} <span aria-hidden="true">▾</span></button>
    <div class="shell-mega-panel" role="region" aria-label="${esc(section.label)}" hidden${seriesPanelAttr}>
      ${itemsHtml}
    </div>
  </div>`;
}

function renderDrawerSection(section) {
  const itemsHtml = (section.items || []).map(renderNavLink).join('');
  if (!itemsHtml.trim()) return '';
  const staffClass = section.staffOnly ? ' shell-nav-staff' : '';
  const label = String(section.label || '').trim();
  const labelHtml = label
    ? `<p class="shell-nav-label">${renderIcon(section.icon)} ${esc(label)}</p>`
    : '';
  const bareClass = label ? '' : ' is-bare';
  return `<div class="shell-nav-section${staffClass}${bareClass}" data-nav-section="${esc(section.id)}">${labelHtml}${itemsHtml}</div>`;
}

export function resolveShellLayout(navigation) {
  const layout = navigation?.chrome?.layout;
  return layout === 'hybrid' ? 'hybrid' : 'masthead';
}

export function applyShellLayoutToDom(layout = 'masthead') {
  const mode = layout === 'hybrid' ? 'hybrid' : 'masthead';
  document.body.dataset.shellLayout = mode;
  document.body.classList.toggle('shell-hybrid-layout', mode === 'hybrid');
  document.documentElement.style.setProperty(
    '--shell-sidebar-w',
    mode === 'hybrid' ? 'min(286px, 28vw)' : '0px'
  );
  const frame = document.getElementById('shellViewIframe');
  if (frame?.contentWindow) {
    try {
      frame.contentWindow.postMessage({ type: 'starlight-shell-layout', layout: mode }, location.origin);
    } catch {
      /* cross-origin or not loaded */
    }
  }
  window.dispatchEvent(new CustomEvent('starlight-shell-layout-changed', { detail: { layout: mode } }));
  return mode;
}

export function applyShellNavigationToDom(navigation, { isStaff = false } = {}) {
  const config = mergeShellNavigation(navigation || cloneDefaultShellNavigation());
  const sections = config.sidebar.sections || [];
  const layout = resolveShellLayout(config);

  const mastheadNav = document.querySelector('.shell-masthead-nav');
  if (mastheadNav) {
    const megaSections = sections.filter(section => section.mega);
    const topQuick = (config.topBar.quickLinks || []).filter(link => link.enabled !== false);
    const quickHtml = topQuick
      .map(link => `<a class="shell-top-link" data-shell-view="${esc(link.destination)}" href="${shellHref(link.destination)}">${esc(link.label)}</a>`)
      .join('');
    mastheadNav.innerHTML = layout === 'hybrid'
      ? quickHtml
      : `${megaSections.map(renderMegaSection).join('')}${quickHtml}`;
  }

  const nav = document.querySelector('.unified-nav');
  if (nav) {
    nav.innerHTML = sections.map(renderDrawerSection).join('');
    nav.classList.toggle('has-staff-access', Boolean(isStaff));
    document.querySelectorAll('.staff-link').forEach(el => el.classList.toggle('visible', Boolean(isStaff)));
  }

  const top = document.querySelector('.shell-primary-links');
  if (top) {
    top.innerHTML = '';
    top.hidden = true;
  }

  const signedInMenu = document.querySelector('.shell-account-menu-signed-in');
  if (signedInMenu) {
    signedInMenu.innerHTML = (config.accountMenu?.signedIn || [])
      .map(item => renderAccountMenuItem(item, { isStaff }))
      .join('');
  }
  const signedOutMenu = document.querySelector('.shell-account-menu-signed-out');
  if (signedOutMenu) {
    signedOutMenu.innerHTML = (config.accountMenu?.signedOut || [])
      .map(item => renderAccountMenuItem(item, { isStaff }))
      .join('');
  }

  const ribbons = document.querySelectorAll('.binder-ribbon');
  ribbons.forEach(ribbon => {
    if (config.brandRibbon) ribbon.textContent = config.brandRibbon;
  });

  document.querySelectorAll('.staff-link').forEach(el => el.classList.toggle('visible', Boolean(isStaff)));
  document.querySelectorAll('.shell-nav-staff, .shell-mega.shell-nav-staff').forEach(el => {
    el.hidden = !isStaff;
  });

  applyShellLayoutToDom(layout);

  return config;
}

/** Fill Series mega menu + drawer section from catalog groups. */
export function populateSeriesMegaMenus(groups = []) {
  const list = Array.isArray(groups) ? groups : [];
  const links = list.map((group) => {
    const key = group.series || group.seriesName || '';
    if (!key) return '';
    return `<a class="shell-nav-item" data-shell-view="binder" data-series-key="${esc(key)}" href="${shellHref('binder', { series: key })}"><span class="shell-nav-icon" aria-hidden="true">✦</span> <span>${esc(group.seriesName || key)}</span></a>`;
  }).join('');

  const allLink = `<a class="shell-nav-item shell-series-all" data-shell-view="binder" data-clear-series="1" href="${shellHref('binder', { series: 'All Series' })}"><span class="shell-nav-icon" aria-hidden="true">🃏</span> <span>All Series</span></a>`;

  document.querySelectorAll('[data-series-mega-panel]').forEach(panel => {
    panel.innerHTML = `${allLink}${links}`;
  });

  const drawerSeries = document.querySelector('.unified-nav [data-nav-section="series"]');
  if (drawerSeries) {
    const label = drawerSeries.querySelector('.shell-nav-label');
    drawerSeries.innerHTML = `${label ? label.outerHTML : '<p class="shell-nav-label">Series</p>'}${allLink}${links}`;
  }

  return list.length;
}

export function applyShellPageTitles(routes, navigation) {
  const titles = mergeShellNavigation(navigation).pageTitles || {};
  for (const [key, title] of Object.entries(titles)) {
    if (routes[key] && title) routes[key].title = title;
  }
}
