
import { supabase } from './supabase-client.js';
import { getMyStaffAccess } from './staff-service.js';

const routes = {
  binder:{title:'Card Binder',src:null}, collection:{title:'My Collection',src:'collection.html'},
  daily:{title:'Daily Booster',src:'daily-booster.html'}, redeem:{title:'Redeem Code',src:'redeem.html'},
  'star-bits':{title:'Star Bits Exchange',src:'star-bits.html'}, checklist:{title:'Checklist',src:'checklist.html'},
  trades:{title:'Wishlist & Trades',src:'trade-lists.html'}, offers:{title:'Trade Offers',src:'trade-offers.html'},
  profile:{title:'Profile Settings',src:'profile-settings.html'}, collector:{title:'Collector Profile',src:'collector.html'},
  report:{title:'Report Profile',src:'report-profile.html'}, about:{title:'About',src:'about.html'}, socials:{title:'Socials',src:'socials.html'},
  admin:{title:'Administration Hub',src:'admin-hub.html'}, 'admin-codes':{title:'Reward Code Console',src:'admin-codes.html'},
  'admin-staff':{title:'Staff Management',src:'admin-staff.html'}, 'admin-audit':{title:'Audit Log',src:'admin-audit.html'},
  'admin-moderation':{title:'Moderation Dashboard',src:'admin-moderation.html'}
};
const nativeView=document.getElementById('binderNativeView');
const frameWrap=document.getElementById('shellViewFrame');
const frame=document.getElementById('shellViewIframe');
const heading=document.getElementById('shellViewTitle');
const external=document.getElementById('shellOpenStandalone');
const menuButton=document.getElementById('shellMenuButton');
let profileUsername='';

function buildSrc(route){
  const r=routes[route]||routes.binder; if(!r.src)return null;
  const current=new URLSearchParams(location.search); const p=new URLSearchParams(); p.set('embed','1');
  for(const [k,v] of current){if(k!=='view')p.set(k,v)}
  if(route==='collector' && !p.get('username') && profileUsername)p.set('username',profileUsername);
  return `${r.src}?${p.toString()}`;
}
function setActive(route){document.querySelectorAll('[data-shell-view]').forEach(a=>a.classList.toggle('active',a.dataset.shellView===route));}
function navigate(route,{push=true,extra={}}={}){
  if(!routes[route])route='binder';
  const url=new URL(location.href); url.searchParams.set('view',route); for(const[k,v]of Object.entries(extra||{})){if(v!=null)url.searchParams.set(k,v)}
  if(push)history.pushState({view:route},'',url);
  setActive(route); document.body.classList.remove('shell-menu-open');
  if(route==='binder'){
    nativeView?.classList.remove('hidden'); frameWrap?.classList.remove('active'); if(frame)frame.src='about:blank'; document.title='Card Binder | Starlight Card Binder'; return;
  }
  nativeView?.classList.add('hidden'); frameWrap?.classList.add('active');
  const src=buildSrc(route); if(frame && frame.src!==new URL(src,location.href).href)frame.src=src;
  if(heading)heading.textContent=routes[route].title; if(external){external.href=routes[route].src+(location.search||'');}
  document.title=`${routes[route].title} | Starlight Card Binder`;
}
async function hydrateAccount(){
  try{
    const {data}=await supabase.auth.getUser(); const user=data?.user;
    if(!user){document.querySelector('[data-shell-account-name]').textContent='Guest Collector';return;}
    const {data:profile}=await supabase.from('profiles').select('username,display_name,onboarding_complete,avatar_url,selected_title_id').eq('id',user.id).maybeSingle();
    profileUsername=profile?.username||'';
    const name=profile?.display_name||profile?.username||user.email||'Collector';
    document.querySelector('[data-shell-account-name]').textContent=name;
    document.querySelector('[data-shell-account-sub]').textContent=profile?.username?`@${profile.username}`:user.email;
    const avatar=document.querySelector('[data-shell-avatar]');
    if(profile?.avatar_url){avatar.textContent='';avatar.style.backgroundImage=`url(${profile.avatar_url})`;avatar.style.backgroundSize='cover';avatar.style.backgroundPosition='center'}
    else{avatar.textContent=String(name).trim().charAt(0).toUpperCase()||'✦';}
    const link=document.querySelector('[data-shell-profile-link]'); if(link&&profileUsername)link.href=`binder.html?view=collector&username=${encodeURIComponent(profileUsername)}`;
    const access=await getMyStaffAccess(); if(access?.isStaff)document.querySelectorAll('.staff-link').forEach(el=>el.classList.add('visible'));
  }catch(e){console.warn('[Starlight] Shell account hydration failed',e)}
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-shell-view]');if(a){e.preventDefault();navigate(a.dataset.shellView);}});
menuButton?.addEventListener('click',()=>document.body.classList.toggle('shell-menu-open'));
window.addEventListener('popstate',()=>navigate(new URLSearchParams(location.search).get('view')||'binder',{push:false}));
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.type==='starlight-navigate')navigate(e.data.view,{extra:e.data.params||{}})});
const initial=new URLSearchParams(location.search).get('view')||'binder';
navigate(initial,{push:false}); hydrateAccount();
