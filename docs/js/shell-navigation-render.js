import { mergeShellNavigation } from './shell-navigation-model.js';
import { cloneDefaultShellNavigation } from './shell-navigation-defaults.js';

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

function renderAccountMenuItem(item) {
  if (item.enabled === false) return '';
  const features = item.features || [];
  if (features.includes('separator')) {
    return '<hr class="shell-account-menu-sep" aria-hidden="true"/>';
  }
  if (features.includes('signOut')) {
    return `<button role="menuitem" type="button" class="shell-signout-button" data-shell-signout>${esc(item.label || 'Sign Out')}</button>`;
  }
  if (features.includes('signIn')) {
    return `<a role="menuitem" data-shell-auth="signin" href="login.html?mode=signin">${esc(item.label || 'Sign In')}</a>`;
  }
  if (features.includes('signUp')) {
    return `<a role="menuitem" data-shell-auth="signup" href="login.html?mode=signup">${esc(item.label || 'Register')}</a>`;
  }
  if (features.includes('profileLink')) {
    return `<a role="menuitem" class="shell-profile-link" data-shell-profile-link="" href="binder.html?view=profile">${esc(item.label || 'View My Profile')}${itemBadge(features)}</a>`;
  }
  const destination = item.destination || 'home';
  return `<a role="menuitem" data-shell-view="${esc(destination)}" href="binder.html?view=${esc(destination)}">${esc(item.label || destination)}${itemBadge(features)}</a>`;
}

function renderSidebarItem(item) {
  if (item.enabled === false) return '';
  const features = item.features || [];
  if (features.includes('sectionLabel')) {
    return `<p class="shell-nav-label shell-nav-label-sub">${renderIcon(item.icon)} ${esc(item.label)}</p>`;
  }
  const destination = item.destination || 'home';
  const classes = ['shell-nav-item', item.className || ''].filter(Boolean).join(' ');
  const staffClass = features.includes('staffOnly') ? ' staff-link' : '';
  return `<a class="${esc(classes)}${staffClass}" data-shell-view="${esc(destination)}" href="binder.html?view=${esc(destination)}">${renderIcon(item.icon)} <span>${esc(item.label)}</span>${itemBadge(features)}</a>`;
}

function renderSidebarSection(section) {
  const itemsHtml = (section.items || []).map(renderSidebarItem).join('');
  if (!itemsHtml.trim()) return '';
  const staffClass = section.staffOnly ? ' shell-nav-staff' : '';
  return `<div class="shell-nav-section${staffClass}"><p class="shell-nav-label">${renderIcon(section.icon)} ${esc(section.label)}</p>${itemsHtml}</div>`;
}

export function applyShellNavigationToDom(navigation, { isStaff = false } = {}) {
  const config = mergeShellNavigation(navigation || cloneDefaultShellNavigation());
  const nav = document.querySelector('.unified-nav');
  if (nav) {
    nav.innerHTML = config.sidebar.sections.map(renderSidebarSection).join('');
    nav.classList.toggle('has-staff-access', Boolean(isStaff));
    document.querySelectorAll('.staff-link').forEach(el => el.classList.toggle('visible', Boolean(isStaff)));
  }

  const top = document.querySelector('.shell-primary-links');
  if (top) {
    top.innerHTML = (config.topBar.quickLinks || [])
      .filter(link => link.enabled !== false)
      .map(link => `<a data-shell-view="${esc(link.destination)}" href="binder.html?view=${esc(link.destination)}">${esc(link.label)}</a>`)
      .join('');
  }

  const signedInMenu = document.querySelector('.shell-account-menu-signed-in');
  if (signedInMenu) {
    signedInMenu.innerHTML = (config.accountMenu?.signedIn || [])
      .map(renderAccountMenuItem)
      .join('');
  }
  const signedOutMenu = document.querySelector('.shell-account-menu-signed-out');
  if (signedOutMenu) {
    signedOutMenu.innerHTML = (config.accountMenu?.signedOut || [])
      .map(renderAccountMenuItem)
      .join('');
  }

  const ribbon = document.querySelector('.binder-ribbon');
  if (ribbon && config.brandRibbon) ribbon.textContent = config.brandRibbon;

  return config;
}

export function applyShellPageTitles(routes, navigation) {
  const titles = mergeShellNavigation(navigation).pageTitles || {};
  for (const [key, title] of Object.entries(titles)) {
    if (routes[key] && title) routes[key].title = title;
  }
}
