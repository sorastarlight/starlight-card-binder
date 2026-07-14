const DEFAULT_BACK='site_assets/StarlightCard_Back_NewLogo.png';
const SFX_KEY='sora-starlight-card-binder-v7-sfx';
const SFX={
  flip:'site_assets/sfx/card-flip.wav',
  reveal:'site_assets/sfx/starlight-reveal.wav',
  sparkle:'site_assets/sfx/sparkle-chime.wav',
  charge:'site_assets/sfx/cosmic-charge.wav',
  legendary:'site_assets/sfx/legendary-reveal.wav',
  analyze:'site_assets/sfx/card_analyze.wav'
};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const frontUrl=c=>c?.imageUrl||c?.image_url||c?.thumbnailUrl||c?.thumbnail_url||DEFAULT_BACK;
const rarityName=c=>String(c?.rarity||'Common').toLowerCase();
const tier=c=>['legendary','epic','rare'].includes(rarityName(c))?rarityName(c):'common';
const sounds={};
function soundEnabled(){return localStorage.getItem(SFX_KEY)!=='off'}
function play(name,volume=.38){
  if(!soundEnabled()||!SFX[name])return;
  try{
    const source=new URL(SFX[name],document.baseURI).href;
    const a=new Audio(source);
    a.volume=volume;
    sounds[name]=a;
    a.play().catch(()=>{});
  }catch{}
}
function preload(src){return new Promise(resolve=>{const i=new Image();let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};i.onload=()=>finish(true);i.onerror=()=>finish(false);i.src=src;i.decode?.().then(()=>finish(true)).catch(()=>{});setTimeout(()=>finish(false),5000)})}
function hostContext(){
  try{
    if(window.top&&window.top!==window&&window.top.location.origin===window.location.origin){return{win:window.top,doc:window.top.document};}
  }catch{}
  return{win:window,doc:document};
}
function styles(doc){
  if(doc.getElementById('starlight-reveal-v841'))return;
  const s=doc.createElement('style');
  s.id='starlight-reveal-v841';
  s.textContent=`
.reward-sequence-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(19,25,54,.7);opacity:0;transition:opacity .24s ease;overflow:auto}.reward-sequence-overlay.open{opacity:1}.reward-sequence-stage{--tier:#aee8ff;position:relative;width:min(94vw,590px);padding:22px;border-radius:28px;background:linear-gradient(165deg,rgba(47,55,104,.98),rgba(86,51,111,.98));border:2px solid rgba(255,255,255,.4);box-shadow:0 26px 80px rgba(0,0,0,.38);color:#fff;text-align:center;overflow:hidden;isolation:isolate}.reward-sequence-stage[data-tier=rare]{--tier:#65d8ff}.reward-sequence-stage[data-tier=epic]{--tier:#ff7ee1}.reward-sequence-stage[data-tier=legendary]{--tier:#ffe05a}.reward-tier-aura,.reward-tier-ring,.reward-tier-rays,.reward-tier-stars{position:absolute;inset:0;pointer-events:none;opacity:0;z-index:-1}.reward-tier-aura{background:radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--tier) 58%,transparent),transparent 58%)}.reward-tier-ring{inset:12%;border:2px solid var(--tier);border-radius:50%;box-shadow:0 0 38px var(--tier)}.reward-tier-rays{background:repeating-conic-gradient(from 0deg,transparent 0 14deg,color-mix(in srgb,var(--tier) 45%,transparent) 15deg 17deg,transparent 18deg 30deg);mask:radial-gradient(circle,transparent 0 29%,#000 31% 70%,transparent 72%)}.reward-tier-stars{background-image:radial-gradient(circle,#fff 0 2px,transparent 3px),radial-gradient(circle,var(--tier) 0 2px,transparent 3px);background-size:58px 61px,83px 77px;background-position:10px 20px,37px 8px}.reward-sequence-progress{display:flex;justify-content:center;gap:7px}.reward-sequence-progress span{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}.reward-sequence-progress span.active{background:var(--tier);box-shadow:0 0 12px var(--tier)}.reward-sequence-kicker{font-size:.75rem;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.reward-sequence-card-shell{position:relative;width:min(68vw,300px);aspect-ratio:5/7;margin:12px auto;perspective:1700px;cursor:pointer;transform-origin:center center}.reward-sequence-card-frame{position:absolute;inset:0;overflow:hidden;border-radius:18px;border:2px solid rgba(255,255,255,.88);background:#fff;box-shadow:0 18px 40px rgba(0,0,0,.38);transform-style:preserve-3d}.reward-sequence-card-image{width:100%;height:100%;display:block;object-fit:cover}.reward-sequence-copy{min-height:100px}.reward-sequence-copy h2,.reward-sequence-copy p{margin:6px 0;opacity:0;transform:translateY(8px);transition:.25s ease}.is-revealed .reward-sequence-copy h2,.is-revealed .reward-sequence-copy p{opacity:1;transform:none}.reward-sequence-hint{font-size:.9rem;opacity:.86}.reward-sequence-next{min-width:190px;padding:11px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);color:#fff;font-weight:950;opacity:0;pointer-events:none;cursor:pointer}.is-revealed .reward-sequence-next{opacity:1;pointer-events:auto}.reward-sequence-card-shell.enter{animation:rewardEnter .36s ease both}.reward-sequence-card-shell.exit{animation:rewardExit .24s ease both}.reward-sequence-card-shell.flip{animation:rewardFlip .78s cubic-bezier(.2,.75,.2,1) both}
.reward-sequence-stage.is-charging .reward-sequence-card-shell{animation:chargeBuild var(--charge-time,1s) cubic-bezier(.22,.7,.22,1) both}.reward-sequence-stage.is-charging[data-tier=common]{--charge-time:.9s}.reward-sequence-stage.is-charging[data-tier=rare]{--charge-time:1.2s}.reward-sequence-stage.is-charging[data-tier=epic]{--charge-time:1.55s}.reward-sequence-stage.is-charging[data-tier=legendary]{--charge-time:2.15s;animation:legendaryStage 2.15s ease}.reward-sequence-stage.is-charging[data-tier=rare] .reward-tier-ring{opacity:.85;animation:ringBurst 1.2s ease}.reward-sequence-stage.is-charging[data-tier=epic] .reward-tier-ring{opacity:1;animation:ringSpin 1.55s ease}.reward-sequence-stage.is-charging[data-tier=epic] .reward-tier-stars{opacity:.75;animation:starDrift 1.55s ease}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-aura{opacity:1;animation:legendaryAura 2.15s ease}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-ring{opacity:1;animation:legendaryRing 2.15s ease}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-rays{opacity:.8;animation:raySpin 2.15s linear}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-stars{opacity:1;animation:starDrift 2.15s ease}.reward-sequence-stage.is-revealed[data-tier=rare] .reward-sequence-card-frame{box-shadow:0 0 28px #65d8ff,0 18px 40px rgba(0,0,0,.4)}.reward-sequence-stage.is-revealed[data-tier=epic] .reward-sequence-card-frame{box-shadow:0 0 35px #ff7ee1,0 0 65px rgba(135,91,255,.45),0 18px 40px rgba(0,0,0,.42)}.reward-sequence-stage.is-revealed[data-tier=legendary] .reward-sequence-card-frame{box-shadow:0 0 38px #ffe05a,0 0 85px rgba(255,105,210,.6),0 18px 45px rgba(0,0,0,.45)}
@keyframes rewardEnter{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}@keyframes rewardExit{to{opacity:0;transform:translateY(-14px) scale(.95)}}@keyframes rewardFlip{0%{transform:rotateY(0) scale(1.08)}48%{transform:rotateY(90deg) scale(1.13)}52%{transform:rotateY(-90deg) scale(1.13)}100%{transform:rotateY(0) scale(1)}}@keyframes chargeBuild{0%{transform:scale(1) translate(0,0);filter:brightness(1)}12%{transform:scale(1.015) translate(-1px,1px)}24%{transform:scale(1.03) translate(2px,-1px)}36%{transform:scale(1.045) translate(-2px,-1px)}48%{transform:scale(1.06) translate(2px,1px)}60%{transform:scale(1.075) translate(-2px,1px);filter:brightness(1.35) saturate(1.2)}72%{transform:scale(1.09) translate(2px,-2px)}84%{transform:scale(1.105) translate(-1px,1px);filter:brightness(1.65) saturate(1.35) drop-shadow(0 0 28px var(--tier))}100%{transform:scale(1.12);filter:brightness(2) saturate(1.45) drop-shadow(0 0 38px var(--tier))}}@keyframes ringBurst{from{transform:scale(.45);opacity:1}to{transform:scale(1.35);opacity:0}}@keyframes ringSpin{from{transform:scale(.45) rotate(0)}to{transform:scale(1.3) rotate(420deg);opacity:0}}@keyframes legendaryRing{0%{transform:scale(.25) rotate(0)}65%{transform:scale(1.25) rotate(620deg)}100%{transform:scale(1.65) rotate(760deg);opacity:0}}@keyframes legendaryAura{0%,20%{transform:scale(.4);opacity:0}55%{opacity:1}100%{transform:scale(1.3);opacity:0}}@keyframes raySpin{to{transform:rotate(360deg)}}@keyframes starDrift{from{transform:scale(.7) rotate(-10deg)}to{transform:scale(1.15) rotate(12deg);opacity:0}}@keyframes legendaryStage{35%{box-shadow:0 0 70px rgba(255,224,90,.9),0 0 140px rgba(255,105,210,.65)}70%{transform:scale(1.018)}}@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
  doc.head.appendChild(s);
}
function timing(t){return t==='legendary'?2150:t==='epic'?1550:t==='rare'?1200:900}
function startSounds(t){
  if(t==='legendary'){play('charge',.5);setTimeout(()=>play('analyze',.48),850);}
  else if(t==='epic'){play('charge',.46);setTimeout(()=>play('sparkle',.38),760);}
  else if(t==='rare'){play('charge',.4);}
  else play('sparkle',.24);
}
function revealSound(t){
  if(t==='legendary')play('legendary',.7);
  else if(t==='epic')play('reveal',.52);
  else if(t==='rare')play('analyze',.44);
  else play('reveal',.34);
}
export function revealRewardSequence(cards=[],options={}){
  const rewards=cards.filter(Boolean);if(!rewards.length)return Promise.resolve();
  const {win,doc}=hostContext();styles(doc);
  rewards.forEach(c=>preload(frontUrl(c)));preload(options.cardBackUrl||DEFAULT_BACK);
  return new Promise(resolve=>{
    let index=0,revealed=false,busy=false;
    const overlay=doc.createElement('div');overlay.className='reward-sequence-overlay';
    overlay.innerHTML=`<section class="reward-sequence-stage"><div class="reward-tier-aura"></div><div class="reward-tier-ring"></div><div class="reward-tier-rays"></div><div class="reward-tier-stars"></div><div class="reward-sequence-progress"></div><p class="reward-sequence-kicker"></p><div class="reward-sequence-card-shell" tabindex="0"><div class="reward-sequence-card-frame"><img class="reward-sequence-card-image" alt="Card back"></div></div><div class="reward-sequence-copy"><h2></h2><p></p><div class="reward-sequence-hint">Click the card to reveal it</div></div><button class="reward-sequence-next">Next Card</button></section>`;
    doc.body.appendChild(overlay);doc.body.style.overflow='hidden';win.requestAnimationFrame(()=>overlay.classList.add('open'));
    const st=overlay.querySelector('.reward-sequence-stage'),shell=overlay.querySelector('.reward-sequence-card-shell'),img=overlay.querySelector('img'),title=overlay.querySelector('h2'),detail=overlay.querySelector('.reward-sequence-copy p'),hint=overlay.querySelector('.reward-sequence-hint'),next=overlay.querySelector('.reward-sequence-next'),kicker=overlay.querySelector('.reward-sequence-kicker'),progress=overlay.querySelector('.reward-sequence-progress');
    progress.innerHTML=rewards.map(()=>'<span></span>').join('');const back=options.cardBackUrl||DEFAULT_BACK;
    const prep=async()=>{busy=true;revealed=false;const t=tier(rewards[index]);st.dataset.tier=t;st.classList.remove('is-charging','is-revealed');shell.className='reward-sequence-card-shell';img.src=back;title.textContent='';detail.textContent='';hint.textContent='Click the card to reveal it';kicker.textContent=`${options.title||'Booster Pack'} · Card ${index+1} of ${rewards.length}`;[...progress.children].forEach((x,i)=>x.classList.toggle('active',i<=index));next.textContent=index===rewards.length-1?'View Pack Summary':'Next Card';void shell.offsetWidth;shell.classList.add('enter');await wait(370);shell.classList.remove('enter');busy=false};
    const reveal=async()=>{if(busy||revealed)return;busy=true;const c=rewards[index],front=frontUrl(c),t=tier(c);await preload(front);st.classList.add('is-charging');startSounds(t);await wait(timing(t));shell.classList.add('flip');play('flip',.42);await wait(380);img.src=front;img.alt=c.name||'Reward card';await wait(410);shell.classList.remove('flip');st.classList.remove('is-charging');st.classList.add('is-revealed');revealSound(t);title.textContent=c.name||'Mystery Card';detail.textContent=`${c.rarity||'Common'} · ${c.seriesName||'Starlight Cards'}${c.isDuplicate?' · Duplicate':' · New Card'}`;hint.textContent=index===rewards.length-1?'Your pack is complete':'Ready for the next card';revealed=true;busy=false};
    const advance=async()=>{if(busy)return;if(!revealed)return reveal();if(index===rewards.length-1){overlay.classList.remove('open');await wait(240);overlay.remove();doc.body.style.overflow='';resolve();return}busy=true;shell.classList.add('exit');await wait(250);index++;shell.classList.remove('exit');await prep()};
    shell.onclick=reveal;shell.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();reveal()}};next.onclick=advance;prep();
  });
}
export const revealCard=card=>revealRewardSequence([card],{title:'Card Reward'});
