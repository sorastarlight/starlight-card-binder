const params = new URLSearchParams(location.search);
const routes = {
  'binder.html':'binder','index.html':'binder','home.html':'home','collection.html':'collection','checklist.html':'checklist','daily-booster.html':'daily',
  'booster-shop.html':'shop','events.html':'events','star-bits.html':'star-bits','redeem.html':'redeem','notifications.html':'notifications','received-rewards.html':'rewards','profile-settings.html':'profile',
  'trade-lists.html':'trades','trade-offers.html':'offers','collector.html':'collector','report-profile.html':'report',
  'about.html':'about','socials.html':'socials','admin-hub.html':'admin','admin-codes.html':'admin-codes',
  'admin-staff.html':'admin-staff','admin-audit.html':'admin-audit','admin-moderation.html':'admin-moderation',
  'admin-boosters.html':'admin-boosters','admin-twitch.html':'admin-twitch','admin-gifts.html':'admin-gifts','admin-news.html':'admin-news','admin-notifications.html':'admin-notifications','admin-ui.html':'admin-ui','admin-users.html':'admin-users','admin-health.html':'admin-health'
};
const SHELL_PARAM_SKIP = new Set(['embed','view','shellBuild','shellLoad','shellRetry']);

function normalizePageName(value){
  const raw = String(value || '').split('/').pop().toLowerCase().split('?')[0].split('#')[0];
  if (!raw || raw === '/') return 'index.html';
  if (raw.endsWith('.html')) return raw;
  if (raw === 'binder' || raw === 'index') return `${raw === 'index' ? 'index' : 'binder'}.html`;
  return `${raw}.html`;
}

const file = normalizePageName(location.pathname);
const currentRoute = routes[file] || null;
const embedded = params.get('embed') === '1' || (window.parent !== window && !!currentRoute);

function routeForUrl(value){
  try{
    const u = new URL(value, location.href);
    const name = normalizePageName(u.pathname);
    if (name === 'binder.html' || name === 'index.html') {
      const view = u.searchParams.get('view');
      return {u, route: view || 'binder'};
    }
    return {u, route: routes[name] || null};
  }catch{
    return {u:null, route:null};
  }
}

function shellHref(route, u){
  const out = new URLSearchParams();
  out.set('view', route);
  if (u) for (const [k,v] of u.searchParams) if (!SHELL_PARAM_SKIP.has(k) && k !== 'view') out.set(k, v);
  return `binder.html?${out.toString()}`;
}

function parentNavigate(route, u){
  if (!route) return false;
  const args = {type:'starlight-navigate', view:route, params:{}};
  if (u) for (const [k,v] of u.searchParams) if (!SHELL_PARAM_SKIP.has(k)) args.params[k] = v;
  parent.postMessage(args, location.origin);
  return true;
}

function rewriteShellLinks(root = document){
  root.querySelectorAll?.('a[href]')?.forEach(a => {
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
    const {u, route} = routeForUrl(href);
    if (!route) return;
    a.setAttribute('href', shellHref(route, u));
    a.setAttribute('target', '_top');
    if (!a.hasAttribute('data-shell-view')) a.setAttribute('data-shell-view', route);
  });
}

function send(type, extra = {}){
  if (window.parent === window) return;
  parent.postMessage({type, view: currentRoute || file, ...extra}, location.origin);
}

function documentHeight(){
  const b = document.body, d = document.documentElement;
  return Math.max(b?.scrollHeight || 0, b?.offsetHeight || 0, d?.scrollHeight || 0, d?.offsetHeight || 0, d?.clientHeight || 0);
}

let lastHeight = 0;
let resizeFrame = 0;
function reportHeight(){
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    const height = documentHeight();
    if (Math.abs(height - lastHeight) > 2) {
      lastHeight = height;
      send('starlight-view-height', {height});
    }
  });
}

function announceReady(){
  reportHeight();
  send('starlight-view-ready', {height: documentHeight(), loadToken: params.get('shellLoad') || ''});
}

if (!embedded && currentRoute && file !== 'binder.html' && file !== 'index.html') {
  const out = new URLSearchParams();
  out.set('view', currentRoute);
  for (const [k,v] of params) if (!SHELL_PARAM_SKIP.has(k)) out.set(k, v);
  location.replace(`binder.html?${out.toString()}`);
} else if (embedded) {
  document.documentElement.classList.add('starlight-embedded');
  const style = document.createElement('style');
  style.textContent = `
    html.starlight-embedded,html.starlight-embedded body{background:transparent!important;min-height:0!important;height:auto!important;overflow:hidden!important;scroll-behavior:auto!important}
    html.starlight-embedded .sky{display:none!important}
    html.starlight-embedded .topbar,html.starlight-embedded .daily-nav,html.starlight-embedded .bits-nav,
    html.starlight-embedded .collector-nav,html.starlight-embedded .admin-nav,html.starlight-embedded .redeem-nav,
    html.starlight-embedded .site-footer-links{display:none!important}
    html.starlight-embedded .site{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;min-height:0!important}
    html.starlight-embedded .site>.sidebar{display:none!important}
    html.starlight-embedded .main{width:100%!important;max-width:none!important;margin:0!important;padding:14px!important;min-height:0!important;overflow:visible!important}
    html.starlight-embedded .daily-page,html.starlight-embedded .bits-page,html.starlight-embedded .collector-page,
    html.starlight-embedded .profile-settings-page,html.starlight-embedded .admin-page,html.starlight-embedded .redeem-page,
    html.starlight-embedded .trade-offers-page,html.starlight-embedded .shop-page{width:100%!important;max-width:none!important;margin:0!important;padding:14px!important;min-height:0!important}
    html.starlight-embedded .page-head:first-child{margin-top:0!important}
    html.starlight-embedded .embedded-filter-panel{margin:0 0 14px!important}
    html.starlight-embedded .page-status:not(.error),html.starlight-embedded .status.success{display:none!important}
  `;
  document.head.appendChild(style);
  document.addEventListener('click', event => {
    const a = event.target.closest('a[href]');
    if (!a) return;
    const {u, route} = routeForUrl(a.getAttribute('href'));
    if (route) {
      event.preventDefault();
      event.stopImmediatePropagation();
      parentNavigate(route, u);
    }
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.querySelector('.site>.sidebar');
    const filters = sidebar?.querySelector('.filters');
    const main = document.querySelector('.site>.main');
    if (filters && main) {
      filters.classList.add('embedded-filter-panel');
      main.prepend(filters);
    }
    rewriteShellLinks(document);
    announceReady();
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(reportHeight);
      ro.observe(document.documentElement);
      if (document.body) ro.observe(document.body);
    }
    const mo = new MutationObserver(reportHeight);
    const observerRoot = document.documentElement || document.body;
    if (observerRoot?.nodeType) {
      try {
        mo.observe(observerRoot, {childList:true, subtree:true, attributes:true, characterData:true});
      } catch (error) {
        console.warn('[Starlight] Embedded resize observer unavailable.', error);
      }
    }
    document.fonts?.ready?.then(reportHeight).catch(() => {});
    document.querySelectorAll('img').forEach(img => {
      if (!img.complete) img.addEventListener('load', reportHeight, {once:true});
    });
  });
  window.addEventListener('load', () => { announceReady(); setTimeout(announceReady, 120); });
  window.addEventListener('pageshow', () => { announceReady(); setTimeout(announceReady, 80); });
}
