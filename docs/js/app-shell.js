import { supabase } from './supabase-client.js';
import { getMyStaffAccess } from './staff-service.js';
import { getMyTradeOffers } from './trade-offer-service.js';

const SHELL_BUILD = '88.0.0';
const VIEW_READY_TIMEOUT_MS = 6500;
const MAX_VIEW_RETRIES = 1;

const routes = {
  binder:{title:'Card Binder',src:null}, collection:{title:'My Collection',src:'collection.html'},
  daily:{title:'Daily Free Booster Pack',src:'daily-booster.html'}, shop:{title:'Starlight Card Shop',src:'booster-shop.html'}, events:{title:'Starlight Events',src:'events.html'}, redeem:{title:'Redeem Code',src:'redeem.html'},
  'star-bits':{title:'Star Bits Exchange',src:'star-bits.html'}, checklist:{title:'Checklist',src:'checklist.html'},
  trades:{title:'Wishlist & Trades',src:'trade-lists.html'}, offers:{title:'Trade Offers',src:'trade-offers.html'},
  profile:{title:'Profile Settings',src:'profile-settings.html'}, collector:{title:'Collector Profile',src:'collector.html'},
  report:{title:'Report Profile',src:'report-profile.html'}, about:{title:'About',src:'about.html'}, socials:{title:'Socials',src:'socials.html'},
  admin:{title:'Administration Hub',src:'admin-hub.html'}, 'admin-codes':{title:'Reward Code Console',src:'admin-codes.html'},
  'admin-staff':{title:'Staff Management',src:'admin-staff.html'}, 'admin-audit':{title:'Audit Log',src:'admin-audit.html'},
  'admin-moderation':{title:'Moderation Dashboard',src:'admin-moderation.html'},
  'admin-boosters':{title:'Starlight Card Management',src:'admin-boosters.html'}, 'admin-users':{title:'Registered User Directory',src:'admin-users.html'}
};

const nativeView=document.getElementById('binderNativeView');
const frameWrap=document.getElementById('shellViewFrame');
const frame=document.getElementById('shellViewIframe');
const heading=document.getElementById('shellViewTitle');
const menuButton=document.getElementById('shellMenuButton');
let profileUsername='';
let currentRoute='binder';
let currentLoadToken=0;
let readyTimer=0;
let retryCount=0;

function ensureViewStateUi(){
  if(!frameWrap)return {};
  let state=frameWrap.querySelector('.shell-view-state');
  if(!state){
    state=document.createElement('div');
    state.className='shell-view-state';
    state.innerHTML=`<div class="shell-view-loader" aria-hidden="true"></div><strong>Loading view…</strong><p>Please wait while the Starlight Binder prepares this page.</p><button type="button" class="shell-view-retry">Try Again</button>`;
    frameWrap.appendChild(state);
    state.querySelector('.shell-view-retry')?.addEventListener('click',()=>loadEmbeddedView(currentRoute,{force:true,resetRetry:true}));
  }
  return {state,retry:state.querySelector('.shell-view-retry'),label:state.querySelector('strong'),description:state.querySelector('p')};
}

function setViewState(mode,message=''){
  const {state,retry,label,description}=ensureViewStateUi();
  if(!state)return;
  state.dataset.state=mode;
  state.hidden=mode==='ready';
  frameWrap?.classList.toggle('is-loading',mode==='loading');
  frameWrap?.classList.toggle('has-error',mode==='error');
  if(label)label.textContent=mode==='error'?'This page did not finish loading':`Loading ${routes[currentRoute]?.title||'view'}…`;
  if(description)description.textContent=message||(mode==='error'?'Firefox may have restored an incomplete cached page. Try loading it again.':'Please wait while the Starlight Binder prepares this page.');
  if(retry)retry.hidden=mode!=='error';
}

function buildSrc(route,{retry=0,token=Date.now()}={}){
  const r=routes[route]||routes.binder;
  if(!r.src)return null;
  const current=new URLSearchParams(location.search);
  const p=new URLSearchParams();
  p.set('embed','1');
  p.set('shellBuild',SHELL_BUILD);
  p.set('shellLoad',String(token));
  if(retry)p.set('shellRetry',String(retry));
  for(const [k,v] of current){if(k!=='view'&&!p.has(k))p.set(k,v)}
  if(route==='collector' && !p.get('username') && profileUsername)p.set('username',profileUsername);
  return `${r.src}?${p.toString()}`;
}

function setActive(route){document.querySelectorAll('[data-shell-view]').forEach(a=>a.classList.toggle('active',a.dataset.shellView===route));}

function clearReadyTimer(){if(readyTimer){window.clearTimeout(readyTimer);readyTimer=0;}}

function armReadyTimeout(route,token){
  clearReadyTimer();
  readyTimer=window.setTimeout(()=>{
    if(route!==currentRoute||token!==currentLoadToken)return;
    if(retryCount<MAX_VIEW_RETRIES){
      retryCount+=1;
      loadEmbeddedView(route,{force:true});
      return;
    }
    setViewState('error');
  },VIEW_READY_TIMEOUT_MS);
}

function loadEmbeddedView(route,{force=false,resetRetry=false}={}){
  if(!frame||!routes[route]?.src)return;
  if(resetRetry)retryCount=0;
  currentLoadToken=Date.now();
  const src=buildSrc(route,{retry:retryCount,token:currentLoadToken});
  setViewState('loading');
  frame.style.height='720px';
  frame.setAttribute('scrolling','no');
  frame.dataset.route=route;
  const absolute=new URL(src,location.href).href;
  if(force||frame.src!==absolute){frame.src=absolute;}
  armReadyTimeout(route,currentLoadToken);
}

function navigate(route,{push=true,extra={}}={}){
  if(!routes[route])route='binder';
  currentRoute=route;
  retryCount=0;
  const url=new URL(location.href);
  url.searchParams.set('view',route);
  for(const[k,v]of Object.entries(extra||{})){if(v!=null)url.searchParams.set(k,v)}
  if(push)history.pushState({view:route},'',url);
  setActive(route);
  document.body.classList.remove('shell-menu-open');
  if(route==='binder'){
    clearReadyTimer();
    nativeView?.classList.remove('hidden');
    frameWrap?.classList.remove('active','is-loading','has-error');
    if(frame)frame.src='about:blank';
    document.title='Card Binder | Starlight Card Binder';
    return;
  }
  nativeView?.classList.add('hidden');
  frameWrap?.classList.add('active');
  if(heading)heading.textContent=routes[route].title;
  document.title=`${routes[route].title} | Starlight Card Binder`;
  loadEmbeddedView(route,{force:true,resetRetry:true});
  window.scrollTo({top:0,behavior:'auto'});
}

function markViewReady(data={}){
  if(data.view && routes[data.view] && data.view!==currentRoute)return;
  clearReadyTimer();
  setViewState('ready');
  if(Number.isFinite(Number(data.height)))resizeEmbeddedView(Number(data.height));
}

function resizeEmbeddedView(value){
  if(!frame)return;
  const height=Math.max(560,Math.min(20000,Math.ceil(value||0)+8));
  frame.style.height=`${height}px`;
}

async function hydrateTradeOfferBadge(){
  const badge=document.querySelector('[data-trade-offer-badge]');
  if(!badge)return;
  try{
    const offers=await getMyTradeOffers();
    const count=(offers?.incoming||[]).filter(o=>o.status==='pending').length;
    badge.textContent=String(count);badge.hidden=count===0;
  }catch(e){badge.hidden=true;console.warn('[Starlight] Trade offer badge failed',e)}
}

async function hydrateAccount(){
  const signedOut=document.querySelector('[data-shell-signed-out]');
  const signedIn=document.querySelector('[data-shell-signed-in]');
  try{
    const {data}=await supabase.auth.getUser();const user=data?.user;
    if(!user){
      signedOut?.removeAttribute('hidden');signedIn?.setAttribute('hidden','');
      document.querySelector('[data-shell-account-name]').textContent='Welcome to Starlight Cards';
      document.querySelector('[data-shell-account-sub]').textContent='Log in or create an account to collect cards';
      return;
    }
    signedOut?.setAttribute('hidden','');signedIn?.removeAttribute('hidden');
    const {data:profile}=await supabase.from('profiles').select('username,display_name,onboarding_complete,avatar_url,selected_title_id').eq('id',user.id).maybeSingle();
    profileUsername=profile?.username||'';
    const name=profile?.display_name||profile?.username||user.email||'Collector';
    document.querySelector('[data-shell-account-name]').textContent=name;
    document.querySelector('[data-shell-account-sub]').textContent=profile?.username?`@${profile.username}`:user.email;
    const avatar=document.querySelector('[data-shell-avatar]');
    if(profile?.avatar_url){avatar.textContent='';avatar.style.backgroundImage=`url(${profile.avatar_url})`;avatar.style.backgroundSize='cover';avatar.style.backgroundPosition='center'}
    else{avatar.textContent=String(name).trim().charAt(0).toUpperCase()||'✦';}
    const link=document.querySelector('[data-shell-profile-link]');if(link&&profileUsername)link.href=`binder.html?view=collector&username=${encodeURIComponent(profileUsername)}`;
    const access=await getMyStaffAccess();
    if(access?.isStaff)document.querySelector('.unified-nav')?.classList.add('has-staff-access');
    document.querySelectorAll('.staff-link').forEach(el=>el.classList.toggle('visible',Boolean(access?.isStaff)));
    document.querySelector('.staff-only-menu')?.toggleAttribute('hidden',!access?.isStaff);
  }catch(e){console.warn('[Starlight] Shell account hydration failed',e)}
}

document.addEventListener('click',e=>{const a=e.target.closest('[data-shell-view]');if(a){e.preventDefault();navigate(a.dataset.shellView);}});
menuButton?.addEventListener('click',()=>document.body.classList.toggle('shell-menu-open'));
window.addEventListener('popstate',()=>navigate(new URLSearchParams(location.search).get('view')||'binder',{push:false}));
window.addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const data=e.data||{};
  if(data.type==='starlight-navigate')navigate(data.view,{extra:data.params||{}});
  if(data.type==='starlight-trades-changed'||data.type==='starlight-view-ready')hydrateTradeOfferBadge();
  if(data.type==='starlight-view-ready'||data.type==='starlight-content-ready'){
    markViewReady(data);
    window.dispatchEvent(new CustomEvent('starlight-dashboard-refresh',{detail:data}));
  }
  if(data.type==='starlight-view-height')resizeEmbeddedView(Number(data.height));
});

frame?.addEventListener('load',()=>{
  if(frame.src==='about:blank')return;
  // A successful document load is not enough; the child still must send its ready handshake.
  setViewState('loading');
});

window.addEventListener('pageshow',event=>{
  if(event.persisted && currentRoute!=='binder')loadEmbeddedView(currentRoute,{force:true,resetRetry:true});
});

const initial=new URLSearchParams(location.search).get('view')||'binder';
navigate(initial,{push:false});
hydrateAccount();
hydrateTradeOfferBadge();


document.querySelector('[data-shell-signout]')?.addEventListener('click',async()=>{await supabase.auth.signOut();location.href='binder.html';});
