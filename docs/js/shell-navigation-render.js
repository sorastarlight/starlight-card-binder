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
    return `<img class="shell-nav-icon-img" src="${esc(icon.url)}" alt="" width="20" height="20">`;
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
