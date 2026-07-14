
const params = new URLSearchParams(location.search);
const embedded = params.get('embed') === '1';
const file = location.pathname.split('/').pop().toLowerCase();
const routes = {
  'collection.html':'collection','checklist.html':'checklist','daily-booster.html':'daily',
  'star-bits.html':'star-bits','redeem.html':'redeem','profile-settings.html':'profile',
  'collector.html':'collector','report-profile.html':'report','about.html':'about','socials.html':'socials',
  'admin-hub.html':'admin','admin-codes.html':'admin-codes','admin-staff.html':'admin-staff',
  'admin-audit.html':'admin-audit','admin-moderation.html':'admin-moderation'
};
if (!embedded && routes[file]) {
  const out = new URLSearchParams();
  out.set('view', routes[file]);
  for (const [k,v] of params) if (k !== 'embed') out.set(k,v);
  location.replace(`binder.html?${out.toString()}`);
} else if (embedded) {
  document.documentElement.classList.add('starlight-embedded');
  const style=document.createElement('style');
  style.textContent=`
    html.starlight-embedded,html.starlight-embedded body{background:transparent!important;min-height:100%;}
    html.starlight-embedded .sky{display:none!important}
    html.starlight-embedded .topbar,html.starlight-embedded .daily-nav,html.starlight-embedded .bits-nav,
    html.starlight-embedded .collector-nav,html.starlight-embedded .admin-nav,html.starlight-embedded .site-footer-links{display:none!important}
    html.starlight-embedded .site{display:block!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important}
    html.starlight-embedded .site>.sidebar{display:none!important}
    html.starlight-embedded .main{width:100%!important;max-width:none!important;margin:0!important;padding:14px!important}
    html.starlight-embedded .daily-page,html.starlight-embedded .bits-page,html.starlight-embedded .collector-page,
    html.starlight-embedded .profile-settings-page,html.starlight-embedded .admin-page{width:100%!important;max-width:none!important;margin:0!important;padding:14px!important}
    html.starlight-embedded .page-head:first-child{margin-top:0!important}
    html.starlight-embedded .embedded-filter-panel{margin:0 0 14px!important}
  `;
  document.head.appendChild(style);
  document.addEventListener('DOMContentLoaded',()=>{
    const sidebar=document.querySelector('.site>.sidebar');
    const filters=sidebar?.querySelector('.filters');
    const main=document.querySelector('.site>.main');
    if(filters && main){ filters.classList.add('embedded-filter-panel'); main.prepend(filters); }
    document.querySelectorAll('a[href]').forEach(a=>{
      a.addEventListener('click',e=>{
        const u=new URL(a.href,location.href); const target=u.pathname.split('/').pop().toLowerCase();
        if(routes[target]){e.preventDefault(); parent.postMessage({type:'starlight-navigate',view:routes[target],params:Object.fromEntries(u.searchParams)},location.origin);}
      });
    });
    parent.postMessage({type:'starlight-view-ready',view:routes[file]||file},location.origin);
  });
}
