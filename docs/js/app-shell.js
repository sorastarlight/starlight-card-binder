import { supabase } from './supabase-client.js';
import { getMyStaffAccess } from './staff-service.js';
import { getMyTradeOffers } from './trade-offer-service.js';
import { getMyNotifications } from './notification-service.js';
import { getActiveEvents } from './event-service.js';
import { getReceivedRewards } from './received-rewards-service.js';
import {
  aliasShellRoute,
  isKnownShellRoute,
  normalizeNotificationParams,
  resolveNotificationRoute
} from './shell-route-utils.js';
import { getShellNavigation } from './shell-navigation-service.js';
import { applyShellNavigationToDom, applyShellPageTitles } from './shell-navigation-render.js';

const SHELL_BUILD = '94.3.1';
const VIEW_READY_TIMEOUT_MS = 6500;
const MAX_VIEW_RETRIES = 1;

const routes = {
  home:{title:'Home',src:'home.html'},
  binder:{title:'The Starlight Card Series Binder',src:null}, collection:{title:'My Card Collection & Favorites',src:'collection.html'},
  daily:{title:'Daily Free Booster Pack',src:'daily-booster.html'}, shop:{title:'Starlight Card Shop',src:'booster-shop.html'}, events:{title:'Starlight Events',src:'events.html'}, redeem:{title:'Redeem A Code',src:'redeem.html'},
  'star-bits':{title:'Star Bits Exchange',src:'star-bits.html'}, checklist:{title:'My Checklist',src:'checklist.html'},
  trades:{title:'Wishlist & Trades',src:'trade-lists.html'}, offers:{title:'Trade Offers',src:'trade-offers.html'},
  notifications:{title:'Notifications',src:'notifications.html'}, rewards:{title:'Received Gifts',src:'received-rewards.html'}, profile:{title:'Profile Settings',src:'profile-settings.html'}, collector:{title:'Collector Profile',src:'collector.html'},
  report:{title:'Report Profile',src:'report-profile.html'}, about:{title:'About',src:'about.html'}, socials:{title:'Socials',src:'socials.html'},
  admin:{title:'Administration Hub',src:'admin-hub.html'}, 'admin-codes':{title:'Reward Code Console',src:'admin-codes.html'},
  'admin-staff':{title:'Staff Management',src:'admin-staff.html'}, 'admin-audit':{title:'Audit Log',src:'admin-audit.html'},
  'admin-moderation':{title:'Moderation Dashboard',src:'admin-moderation.html'},
  'admin-boosters':{title:'Starlight Card Management',src:'admin-boosters.html'}, 'admin-twitch':{title:'Twitch Redeems',src:'admin-twitch.html'}, 'admin-gifts':{title:'Send Gifts',src:'admin-gifts.html'}, 'admin-news':{title:'News & Updates Management',src:'admin-news.html'}, 'admin-users':{title:'Registered User Directory',src:'admin-users.html'}, 'admin-health':{title:'Database Health',src:'admin-health.html'}, 'admin-notifications':{title:'Notification Broadcasts',src:'admin-notifications.html'},
  'admin-ui':{title:'Website User Interface',src:'admin-ui.html'},
  'admin-website':{title:'Website Editor',src:'admin-website.html'}
};

const nativeView=document.getElementById('binderNativeView');
const frameWrap=document.getElementById('shellViewFrame');
const frame=document.getElementById('shellViewIframe');
const heading=document.getElementById('shellViewTitle');
const menuButton=document.getElementById('shellMenuButton');
const mainContent=document.querySelector('.main');
let profileUsername='';
let currentRoute='binder';
let currentLoadToken=0;
let readyTimer=0;
let retryCount=0;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

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
  if(description)description.textContent=message||(mode==='error'?'This page did not finish loading. Try again — a cached copy may have been incomplete.':'Please wait while the Starlight Binder prepares this page.');
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
  closeNotificationPopover();
  const resolved = aliasShellRoute(route) || (isKnownShellRoute(route) ? route : '');
  if(!resolved){
    console.warn('[Starlight] Unknown shell route ignored:', route);
    return;
  }
  route = resolved;
  currentRoute=route;
  retryCount=0;
  const url=new URL(location.href);
  const preserved = new Set(['view']);
  for (const key of [...url.searchParams.keys()]) {
    if (!preserved.has(key)) url.searchParams.delete(key);
  }
  url.searchParams.set('view',route);
  for(const[k,v]of Object.entries(extra||{})){if(v!=null&&v!=='')url.searchParams.set(k,v)}
  if(push)history.pushState({view:route},'',url);
  setActive(route);
  document.body.classList.remove('shell-menu-open');
  mainContent?.scrollTo({top:0,left:0,behavior:'auto'});
  if(route==='binder'){
    clearReadyTimer();
    nativeView?.classList.remove('hidden');
    frameWrap?.classList.remove('active','is-loading','has-error');
    if(frame)frame.src='about:blank';
    document.title='The Starlight Card Series Binder | Starlight Card Binder';
    return;
  }
  nativeView?.classList.add('hidden');
  frameWrap?.classList.add('active');
  if(heading)heading.textContent=routes[route].title;
  document.title=`${routes[route].title} | Starlight Card Binder`;
  loadEmbeddedView(route,{force:true,resetRetry:true});
  window.scrollTo({top:0,left:0,behavior:'auto'});
}

function markViewReady(data={}){
  if(data.view && routes[data.view] && data.view!==currentRoute)return;
  clearReadyTimer();
  setViewState('ready');
  if(Number.isFinite(Number(data.height)))resizeEmbeddedView(Number(data.height));
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      mainContent?.scrollTo({top:0,left:0,behavior:'auto'});
      window.scrollTo({top:0,left:0,behavior:'auto'});
    });
  });
}

function resizeEmbeddedView(value){
  if(!frame)return;
  const height=Math.max(560,Math.min(20000,Math.ceil(value||0)+8));
  frame.style.height=`${height}px`;
}



function normalizeNotificationRoute(value,notice={}){
  const hint=`${notice.notification_type||''} ${notice.title||''} ${notice.body||''} ${notice.source_key||''}`.toLowerCase();
  if(/reward|gift|twitch redeem|code accepted|booster.*waiting/.test(hint))return 'rewards';
  if(/daily.*booster/.test(hint))return 'daily';
  if(/trade/.test(hint)&&(!value||String(value).toLowerCase()==='binder'))return 'offers';
  const raw=String(value||'binder').trim();
  const withoutShell=raw.replace(/^https?:\/\/[^/]+\/?/i,'').replace(/^\/?binder\.html\?view=/i,'').replace(/^\/?/,'');
  const key=withoutShell.split(/[?&#]/)[0].toLowerCase();
  const aliases={daily:'daily','daily-booster':'daily','daily-booster.html':'daily','free-daily-booster':'daily',notifications:'notifications','notifications.html':'notifications',collection:'collection','collection.html':'collection',offers:'offers','trade-offers':'offers','trade-offers.html':'offers',trades:'trades','trade-lists':'trades','trade-lists.html':'trades',events:'events','events.html':'events',shop:'shop','booster-shop':'shop','booster-shop.html':'shop',profile:'profile','profile-settings':'profile','profile-settings.html':'profile',rewards:'rewards','received-rewards':'rewards','received-rewards.html':'rewards',collector:'collector','collector.html':'collector',report:'report','report-profile':'report','report-profile.html':'report'};
  return aliases[key]||key||'binder';
}

function escShell(value){
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

function closeNotificationPopover(){
  const pop=document.querySelector('.shell-notification-popover');
  if(pop)pop.hidden=true;
}

function ensureNotificationPopover(){
  const button=document.querySelector('.shell-notification-button');
  if(!button||document.querySelector('.shell-notification-popover'))return;
  const pop=document.createElement('div');
  pop.className='shell-notification-popover';
  pop.hidden=true;
  pop.innerHTML='<div class="shell-popover-head"><strong>Notifications</strong><a href="binder.html?view=notifications" data-shell-view="notifications">View all</a></div><div class="shell-popover-list">Loading…</div>';
  button.parentElement?.appendChild(pop);
  button.addEventListener('click',async e=>{
    e.preventDefault();
    e.stopPropagation();
    pop.hidden=!pop.hidden;
    if(pop.hidden)return;
    try{
      const data=await getMyNotifications(5);
      const rows=data?.notifications||[];
      pop.querySelector('.shell-popover-list').innerHTML = rows.length
        ? rows.map(n => {
          const route = resolveNotificationRoute(n.route, n);
          const params = normalizeNotificationParams(n);
          return `<button type="button" data-notice-route="${escShell(route)}" data-notice-params='${escShell(JSON.stringify(params))}'>
            <span>${escShell(n.icon || '✦')}</span>
            <span><b>${escShell(n.title || 'Notification')}</b><small>${escShell(n.body || '')}</small></span>
          </button>`;
        }).join('')
        : '<p>All caught up ✨</p>';
    }catch{
      pop.querySelector('.shell-popover-list').textContent='Could not load notifications.';
    }
  });
  pop.addEventListener('click',e=>{
    const item=e.target.closest('[data-notice-route]');
    if(!item)return;
    let params={};
    try{params=JSON.parse(item.dataset.noticeParams||'{}')}catch{}
    pop.hidden=true;
    const route = aliasShellRoute(item.dataset.noticeRoute) || item.dataset.noticeRoute;
    if(!isKnownShellRoute(route)){
      navigate('notifications');
      return;
    }
    navigate(route,{extra:params});
  });
  document.addEventListener('click',e=>{if(!pop.hidden&&!pop.contains(e.target)&&e.target!==button)pop.hidden=true});
}

async function hydrateNotificationBadge(){
  document.querySelectorAll('[data-notification-badge]').forEach(b=>b.hidden=true);
  try{
    const data=await getMyNotifications(20);const count=Number(data?.unreadCount||0);
    document.querySelectorAll('[data-notification-badge]').forEach(b=>{b.textContent=String(count);b.hidden=count===0});
  }catch(e){console.warn('[Starlight] Notification badge failed',e)}
}

async function hydrateReceivedGiftBadge(){
  const badges=document.querySelectorAll('[data-received-reward-badge]');badges.forEach(b=>b.hidden=true);
  try{const data=await getReceivedRewards('pending');const count=Number(data?.pendingCount??data?.rewards?.length??0);badges.forEach(b=>{b.textContent=String(count);b.hidden=count===0})}catch(e){console.warn('[Starlight] Received Gifts badge failed',e)}
}

async function hydrateActiveEventBanner(){
  const banner=document.querySelector('[data-shell-event-banner]');if(!banner)return;
  try{const events=await getActiveEvents();const event=events?.[0];if(!event){banner.hidden=true;return}banner.hidden=false;banner.style.setProperty('--event-accent',event.accentColor||'#ff82c8');banner.querySelector('[data-shell-event-name]').textContent=event.name||'Starlight Event';const end=new Date(event.endAt);const hours=Math.max(0,Math.ceil((end-Date.now())/36e5));banner.querySelector('[data-shell-event-time]').textContent=hours>48?`${Math.ceil(hours/24)} days remaining`:`${hours} hours remaining`;if(event.bannerImageUrl)banner.style.setProperty('--event-image',`url("${String(event.bannerImageUrl).replaceAll('"','%22')}")`)}catch(e){banner.hidden=true;console.warn('[Starlight] Event banner failed',e)}
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
  const signedOutNodes=[...document.querySelectorAll('[data-shell-signed-out]')];
  const signedInNodes=[...document.querySelectorAll('[data-shell-signed-in]')];
  const showSignedOut=()=>{
    signedOutNodes.forEach(node=>node.removeAttribute('hidden'));
    signedInNodes.forEach(node=>node.setAttribute('hidden',''));
  };
  const showSignedIn=()=>{
    signedOutNodes.forEach(node=>node.setAttribute('hidden',''));
    signedInNodes.forEach(node=>node.removeAttribute('hidden'));
  };
  let access = null;
  try{
    const {data}=await supabase.auth.getUser();const user=data?.user;
    if(!user){
      showSignedOut();
      document.querySelector('[data-shell-account-name]').textContent='Welcome to Starlight Cards';
      document.querySelector('[data-shell-account-sub]').textContent='Log in or create an account to collect cards';
    } else {
      showSignedIn();
      const {data:profile}=await supabase.from('profiles').select('username,display_name,onboarding_complete,username_locked,username_source,avatar_url,selected_title_id').eq('id',user.id).maybeSingle();
      profileUsername=profile?.username||'';
      const name=profile?.display_name||profile?.username||user.email||'Collector';
      document.querySelector('[data-shell-account-name]').textContent=name;
      document.querySelector('[data-shell-account-sub]').textContent=profile?.username?`@${profile.username}`:user.email;
      const avatar=document.querySelector('[data-shell-avatar]');
      if(profile?.avatar_url){avatar.textContent='';avatar.style.backgroundImage=`url(${profile.avatar_url})`;avatar.style.backgroundSize='cover';avatar.style.backgroundPosition='center'}
      else{avatar.textContent=String(name).trim().charAt(0).toUpperCase()||'✦';}
      const link=document.querySelector('[data-shell-profile-link]');if(link&&profileUsername)link.href=`binder.html?view=collector&username=${encodeURIComponent(profileUsername)}`;
      access=await getMyStaffAccess();
      if(profile && profile.onboarding_complete===false){
        try{
          const nudged=sessionStorage.getItem('starlight-onboarding-nudge');
          if(!nudged){
            sessionStorage.setItem('starlight-onboarding-nudge','1');
            if(currentRoute!=='profile')navigate('profile');
          }
        }catch(_e){/* sessionStorage may be unavailable */}
      }
    }
  }catch(e){
    console.warn('[Starlight] Shell account hydration failed',e);
    showSignedOut();
  }

  try{
    const navigation = await getShellNavigation();
    applyShellPageTitles(routes, navigation);
    applyShellNavigationToDom(navigation, { isStaff: Boolean(access?.isStaff) });
    if(heading && routes[currentRoute]?.title) heading.textContent = routes[currentRoute].title;
    if(currentRoute !== 'binder' && routes[currentRoute]?.title){
      document.title = `${routes[currentRoute].title} | Starlight Card Binder`;
    }
  }catch(e){
    console.warn('[Starlight] Shell navigation config failed', e);
    applyShellNavigationToDom(null, { isStaff: Boolean(access?.isStaff) });
  }

  if(access?.isStaff)document.querySelector('.unified-nav')?.classList.add('has-staff-access');
  document.querySelectorAll('.staff-link').forEach(el=>el.classList.toggle('visible',Boolean(access?.isStaff)));
  document.querySelector('.staff-only-menu')?.toggleAttribute('hidden',!access?.isStaff);
}

document.addEventListener('click',e=>{const a=e.target.closest('[data-shell-view]');if(a){e.preventDefault();navigate(a.dataset.shellView);}});
menuButton?.addEventListener('click',()=>document.body.classList.toggle('shell-menu-open'));
window.addEventListener('popstate',()=>navigate(new URLSearchParams(location.search).get('view')||'home',{push:false}));
window.addEventListener('message',e=>{
  if(e.origin!==location.origin)return;
  const data=e.data||{};
  if(data.type==='starlight-close-notifications')closeNotificationPopover();
  if(data.type==='starlight-navigate'){
    const route = aliasShellRoute(data.view) || (isKnownShellRoute(data.view) ? data.view : '');
    if(route) navigate(route,{extra:data.params||{}});
  }
  if(data.type==='starlight-trades-changed'||data.type==='starlight-view-ready')hydrateTradeOfferBadge();
  if(data.type==='starlight-notifications-changed'||data.type==='starlight-view-ready')hydrateNotificationBadge();
  if(data.type==='starlight-rewards-changed'||data.type==='starlight-view-ready'||data.type==='starlight-content-ready')hydrateReceivedGiftBadge();
  if(data.type==='starlight-view-ready'||data.type==='starlight-content-ready'){
    markViewReady(data);
    window.dispatchEvent(new CustomEvent('starlight-dashboard-refresh',{detail:data}));
  }
  if(data.type==='starlight-view-height')resizeEmbeddedView(Number(data.height));
});

frame?.addEventListener('pointerdown',closeNotificationPopover);
frame?.addEventListener('load',()=>{
  closeNotificationPopover();
  if(frame.src==='about:blank')return;
  // A successful document load is not enough; the child still must send its ready handshake.
  setViewState('loading');
});

window.addEventListener('pageshow',event=>{
  if(event.persisted && currentRoute!=='binder')loadEmbeddedView(currentRoute,{force:true,resetRetry:true});
});

const initial=aliasShellRoute(new URLSearchParams(location.search).get('view')||'home')||'home';
navigate(initial,{push:false});
hydrateAccount().then(ensureNotificationPopover);
hydrateTradeOfferBadge();
hydrateNotificationBadge();
hydrateReceivedGiftBadge();
hydrateActiveEventBanner();


document.querySelector('[data-shell-signout]')?.addEventListener('click',async()=>{await supabase.auth.signOut();location.href='binder.html?view=home';});
