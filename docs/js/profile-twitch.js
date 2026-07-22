import{getMyTwitchConnection,beginTwitchLink,unlinkTwitch}from'./twitch-service.js';
import{getMyCollectorIdentity}from'./profile-service.js';

const TWITCH_ICON=`<svg aria-hidden="true" class="twitch-linked-icon" viewBox="0 0 24 24" width="16" height="16" focusable="false"><path fill="currentColor" d="M4 2L2 6v14h5v3l3-3h4l6-6V2H4zm15 10l-4 4h-4l-2 2v-2H6V4h13v8zM15 7h-2v5h2V7zm-5 0H8v5h2V7z"/></svg>`;

const section=document.createElement('section');section.className='profile-section';section.innerHTML=`<h2>Connected Accounts</h2><p class="profile-section-intro">Link Twitch to receive stream rewards, Channel Point rewards, subscriber perks, and event drops.</p><div id="twitchConnectionCard" class="profile-activity-card"><div class="twitch-connection-heading"><strong>📺 Twitch</strong><span class="twitch-linked-badge hidden" id="twitchSectionLinkedBadge" hidden>${TWITCH_ICON}<span>Twitch Linked</span></span></div><span id="twitchConnectionText">Checking connection…</span><div class="account-data-actions" style="margin-top:12px"><button type="button" class="profile-link primary" id="linkTwitchButton">Link Twitch Account</button><button type="button" class="profile-link secondary hidden" id="unlinkTwitchButton">Unlink Twitch</button></div></div>`;
const account=document.querySelector('.account-data-section');account?.parentNode.insertBefore(section,account);
const text=section.querySelector('#twitchConnectionText'),link=section.querySelector('#linkTwitchButton'),unlink=section.querySelector('#unlinkTwitchButton'),badge=section.querySelector('#twitchSectionLinkedBadge');

function setSectionBadge(linked){
  if(!badge)return;
  const isLinked=Boolean(linked);
  badge.hidden=!isLinked;
  badge.classList.toggle('hidden',!isLinked);
}

async function load(){try{
  const [c,identity]=await Promise.all([
    getMyTwitchConnection(),
    getMyCollectorIdentity().catch(()=>({twitchLinked:false}))
  ]);
  const identityLinked=Boolean(identity?.twitchLinked);
  const workerLinked=Boolean(c.linked);
  setSectionBadge(workerLinked||identityLinked);
  if(workerLinked){
    text.innerHTML=`Linked as <strong>${c.displayName||c.login}</strong> (@${c.login})`;
    link.classList.add('hidden');
    unlink.classList.remove('hidden');
  }else if(identityLinked){
    const login=identity.twitchLogin||identity.twitch_login||'';
    const display=identity.twitchDisplayName||identity.twitch_display_name||login;
    text.innerHTML=login
      ?`Signed in with Twitch as <strong>${display||login}</strong> (@${login}). Link below to enable stream rewards.`
      :'Twitch sign-in is connected. Link below to enable stream rewards.';
    link.classList.remove('hidden');
    unlink.classList.add('hidden');
  }else{
    text.textContent='No Twitch account linked yet.';
    link.classList.remove('hidden');
    unlink.classList.add('hidden');
  }
}catch(e){text.textContent=e.message}}
link.onclick=()=>{text.textContent='Opening Twitch in a secure popup…';beginTwitchLink('collector').catch(e=>text.textContent=e.message)};unlink.onclick=async()=>{if(!(await window.StarlightUI.confirm({title:'Unlink Twitch?',message:'Your Twitch account will no longer be connected to this collector profile.',confirmText:'Unlink Twitch',danger:true})))return;try{await unlinkTwitch();await load()}catch(e){text.textContent=e.message}};
window.addEventListener('message',async event=>{
  if(event.origin!==location.origin||event.data?.type!=='starlight-twitch-oauth-complete')return;
  if(event.data.ok===false){text.textContent=event.data.message||'Twitch connection was not completed.';return}
  text.textContent='Twitch connected! Refreshing…';
  await new Promise(resolve=>setTimeout(resolve,700));
  await load();
});
await load();
