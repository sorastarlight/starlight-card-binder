import {getMyNotifications,markNotificationRead,markAllNotificationsRead,deleteNotification,deleteReadNotifications,getNotificationPreferences,saveNotificationPreferences} from '../notification-service.js';
const list=document.getElementById('list'),summary=document.getElementById('summary');let state=[],historyMode=false;
document.addEventListener('pointerdown',()=>{if(window.parent!==window)window.parent.postMessage({type:'starlight-close-notifications'},location.origin)},{capture:true,once:true});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function when(value){try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))}catch{return ''}}
function normalizedParams(n){
  const params=(n.route_params&&typeof n.route_params==='object')?{...n.route_params}:{};
  if(params.giftId&&!params.rewardId)params.rewardId=params.giftId;
  if(!params.rewardId&&String(n.source_key||'').startsWith('received:')){
    const candidate=String(n.source_key).split(':').pop();
    if(/^[0-9a-f-]{20,}$/i.test(candidate))params.rewardId=candidate;
  }
  return params;
}
function normalizeRoute(value,n={}){
  const params=normalizedParams(n);
  const raw=String(value||'').trim();
  const hint=[n.notification_type,n.title,n.body,n.source_key,raw,...Object.values(params)]
    .filter(Boolean).join(' ').toLowerCase();

  if(params.rewardId||/gift|received.?reward|reward ready|twitch redeem|reward code|code accepted|claim.*reward|booster.*waiting/.test(hint))return 'rewards';
  if(/daily.*booster|free.*booster/.test(hint))return 'daily';
  if(params.tradeId||params.offerId||/trade offer|incoming trade|accepted trade|declined trade/.test(hint))return 'offers';
  if(/wishlist|trade list/.test(hint))return 'trades';
  if(params.eventId||/event|seasonal|announcement|broadcast|news update/.test(hint))return 'events';
  if(/achievement|collection milestone|favorite/.test(hint))return 'collection';

  const clean=raw.replace(/^https?:\/\/[^/]+\/?/i,'').replace(/^\/?binder\.html\?view=/i,'').replace(/^\/?/,'');
  const key=clean.split(/[?&#]/)[0].toLowerCase();
  const aliases={
    home:'home','home.html':'home',binder:'binder','binder.html':'binder',
    daily:'daily','daily-booster':'daily','daily-booster.html':'daily','free-daily-booster':'daily',
    notifications:'notifications','notifications.html':'notifications',
    collection:'collection','collection.html':'collection','my-cards':'collection',
    offers:'offers','trade-offers':'offers','trade-offers.html':'offers',
    trades:'trades','trade-lists':'trades','trade-lists.html':'trades',
    events:'events','events.html':'events',
    shop:'shop','booster-shop':'shop','booster-shop.html':'shop',
    profile:'profile','profile-settings':'profile','profile-settings.html':'profile',
    rewards:'rewards','received-rewards':'rewards','received-rewards.html':'rewards','received-gifts':'rewards'
  };
  return aliases[key]||key||'home';
}
function shellUrl(n){const route=normalizeRoute(n.route,n);const p=new URLSearchParams(normalizedParams(n));p.set('view',route);return `binder.html?${p.toString()}`}
function render(data){state=data.notifications||[];const visible=historyMode?state:state.filter(n=>!n.is_read);summary.textContent=`${data.unreadCount||0} unread • ${state.length} recent${historyMode?' • history':''}`;list.replaceChildren();if(!visible.length){list.innerHTML='<div class="notice-empty"><h2>All caught up ✨</h2><p>New collector activity will appear here.</p></div>';return}for(const n of visible){const card=document.createElement('article');card.className=`notice-card ${n.is_read?'':'unread'}`;card.innerHTML=`<div class="notice-icon">${esc(n.icon||'✦')}</div><div class="notice-copy"><h2>${esc(n.title)}</h2><p>${esc(n.body||'')}</p><p class="notice-meta">${esc(when(n.created_at))}</p></div><div class="notice-controls">${n.route?`<a class="notice-open" data-open href="${esc(shellUrl(n))}">Open</a>`:''}${n.is_read?'':`<button class="notice-muted" data-read type="button">Read</button>`}<button class="notice-muted" data-delete type="button">Delete</button></div>`;card.querySelector('[data-read]')?.addEventListener('click',async()=>{await markNotificationRead(n.id);await load()});card.querySelector('[data-delete]')?.addEventListener('click',async()=>{await deleteNotification(n.id);await load()});card.querySelector('[data-open]')?.addEventListener('click',async e=>{e.preventDefault();if(!n.is_read)await markNotificationRead(n.id);const route=normalizeRoute(n.route,n);const params=normalizedParams(n);window.parent!==window?window.parent.postMessage({type:'starlight-navigate',view:route,params},location.origin):location.href=shellUrl({...n,route})});list.append(card)}}
async function load(){try{render(await getMyNotifications())}catch(e){summary.textContent='Notifications could not be loaded.';list.innerHTML=`<div class="notice-empty"><h2>Unable to load</h2><p>${esc(e.message)}</p></div>`}}
async function loadPreferences(){try{const prefs=await getNotificationPreferences();document.querySelectorAll('[data-pref]').forEach(input=>{input.checked=prefs[input.dataset.pref]!==false})}catch(e){console.warn('[Starlight] Preferences failed',e)}}
document.getElementById('savePreferences').onclick=async()=>{const prefs={};document.querySelectorAll('[data-pref]').forEach(input=>prefs[input.dataset.pref]=input.checked);await saveNotificationPreferences(prefs);window.StarlightUI?.toast?.('Notification preferences saved.','success')};
document.getElementById('historyButton').onclick=()=>{historyMode=!historyMode;document.getElementById('historyButton').textContent=historyMode?'Show Unread':'Notification History';render({notifications:state,unreadCount:state.filter(n=>!n.is_read).length})};document.getElementById('markAll').onclick=async()=>{await markAllNotificationsRead();await load()};document.getElementById('clearRead').onclick=async()=>{await deleteReadNotifications();await load()};await Promise.all([load(),loadPreferences()]);
