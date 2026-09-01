import { mergeShellNavigation } from './shell-navigation-model.js';
import { cloneDefaultShellNavigation } from './shell-navigation-defaults.js';
import { loginShellHref, shellHref } from './shell-route-utils.js';
import { renderShellNavIcon } from './shell-nav-icons.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[char]));

function renderIcon(icon, fallback = '') {
  if (icon?.type === 'svg' && icon.value) {
    return renderShellNavIcon(icon, esc);
  }
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
  if (
    features.includes('clearSeries')
    || features.includes('eventCards')
    || features.includes('specialCards')
    || features.includes('clearCardSet')
  ) {
    params.series = 'All Series';
  }
  if (item.seriesKey) params.series = item.seriesKey;
  if (features.includes('eventCards')) params.cardSet = 'event';
  else if (features.includes('specialCards')) params.cardSet = 'special';
  else if (features.includes('clearCardSet') || features.includes('clearSeries')) params.cardSet = '';
  return shellHref(destination, params);
}

function renderNavLink(item) {
  if (item.enabled === false) return '';
  const features = item.features || [];
  if (features.includes('sectionLabel')) {
    const seriesSlot = features.includes('seriesLinksSlot')
      ? '<div class="shell-series-links" data-series-links></div>'
      : '';
    return `<p class="shell-nav-label shell-nav-label-sub">${renderIcon(item.icon)} ${esc(item.label)}</p>${seriesSlot}`;
  }
  const destination = item.destination || 'home';
  const classes = ['shell-nav-item', item.className || ''].filter(Boolean).join(' ');
  const staffClass = features.includes('staffOnly') ? ' staff-link' : '';
  const seriesAttr = item.seriesKey ? ` data-series-key="${esc(item.seriesKey)}"` : '';
  const clearAttr = features.includes('clearSeries') || features.includes('clearCardSet') ? ' data-clear-series="1"' : '';
  const cardSet = features.includes('eventCards')
    ? 'event'
    : (features.includes('specialCards') ? 'special' : (features.includes('clearCardSet') ? '' : null));
  const cardSetAttr = cardSet != null ? ` data-card-set="${esc(cardSet)}"` : '';
  return `<a class="${esc(classes)}${staffClass}" data-shell-view="${esc(destination)}" href="${itemHref(item)}"${seriesAttr}${clearAttr}${cardSetAttr}>${renderIcon(item.icon)} <span>${esc(item.label)}</span>${itemBadge(features)}</a>`;
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

export function resolveShellLiveFeedVisible(navigation) {
  return navigation?.chrome?.showLiveFeed !== false;
}

export function applyShellLiveFeedToDom(visible = true) {
  const show = visible !== false;
  document.body.classList.toggle('shell-live-feed-off', !show);
  document.documentElement.classList.toggle('shell-live-feed-off', !show);
  const strip = document.getElementById('shellLiveStrip');
  if (strip) strip.hidden = !show;
  const feed = document.getElementById('shellLiveFeed');
  if (feed) {
    if (!show) {
      feed.hidden = true;
      feed.classList.add('is-suppressed');
    } else {
      feed.hidden = false;
      feed.classList.remove('is-suppressed');
    }
  }
  if (!show) {
    document.documentElement.style.setProperty('--shell-live-feed-h', '0px');
  }
  window.dispatchEvent(new CustomEvent('starlight-shell-live-feed-changed', { detail: { visible: show } }));
  return show;
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
    const homeQuick = topQuick.find(link => link.destination === 'home');
    const otherQuick = topQuick.filter(link => link.destination !== 'home');
    const linkHtml = (link) => {
      const features = link.features || [];
      const classes = [
        'shell-top-link',
        link.className || '',
        features.includes('dailyBadge') ? 'shell-daily-top-link' : ''
      ].filter(Boolean).join(' ');
      return `<a class="${esc(classes)}" data-shell-view="${esc(link.destination)}" href="${shellHref(link.destination)}"><span>${esc(link.label)}</span>${itemBadge(features)}</a>`;
    };
    const homeHtml = homeQuick
      ? linkHtml(homeQuick)
      : `<a class="shell-top-link" data-shell-view="home" href="${shellHref('home')}">Home</a>`;
    const otherHtml = otherQuick.map(linkHtml).join('');
    const megaHtml = megaSections.map(renderMegaSection).join('');
    mastheadNav.innerHTML = layout === 'hybrid'
      ? `${homeHtml}${otherHtml}`
      : `${homeHtml}${megaHtml}${otherHtml}`;
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
  applyShellLiveFeedToDom(resolveShellLiveFeedVisible(config));

  return config;
}

/** Fill Card Series slots (and legacy series panels) from catalog groups. */
export function populateSeriesMegaMenus(groups = []) {
  const list = Array.isArray(groups) ? groups : [];
  const links = list.map((group) => {
    const key = group.series || group.seriesName || '';
    if (!key) return '';
    return `<a class="shell-nav-item" data-shell-view="binder" data-series-key="${esc(key)}" data-card-set="" href="${shellHref('binder', { series: key })}">${renderShellNavIcon('gallery', esc)} <span>${esc(group.seriesName || key)}</span></a>`;
  }).join('');

  const allLink = `<a class="shell-nav-item shell-series-all" data-shell-view="binder" data-clear-series="1" data-card-set="" href="${shellHref('binder', { series: 'All Series' })}">${renderShellNavIcon('cards', esc)} <span>All Series</span></a>`;
  const seriesHtml = `${allLink}${links}` || '<p class="shell-nav-empty">Series will appear here when the catalog loads.</p>';

  document.querySelectorAll('[data-series-links]').forEach(slot => {
    slot.innerHTML = seriesHtml;
  });

  document.querySelectorAll('[data-series-mega-panel]').forEach(panel => {
    panel.innerHTML = seriesHtml;
  });

  const drawerSeries = document.querySelector('.unified-nav [data-nav-section="series"]');
  if (drawerSeries) {
    const label = drawerSeries.querySelector('.shell-nav-label');
    drawerSeries.innerHTML = `${label ? label.outerHTML : '<p class="shell-nav-label">Series</p>'}${seriesHtml}`;
  }

  return list.length;
}

export function applyShellPageTitles(routes, navigation) {
  const titles = mergeShellNavigation(navigation).pageTitles || {};
  for (const [key, title] of Object.entries(titles)) {
    if (routes[key] && title) routes[key].title = title;
  }
}
