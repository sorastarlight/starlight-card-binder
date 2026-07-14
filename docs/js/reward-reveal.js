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
function soundEnabled(){return localStorage.getItem(SFX_KEY)!=='off'}
function play(name,volume=.38){
  if(!soundEnabled()||!SFX[name])return;
  try{
    const audio=new Audio(new URL(SFX[name],document.baseURI).href);
    audio.volume=volume;
    audio.play().catch(()=>{});
  }catch{}
}
function preload(src){
  return new Promise(resolve=>{
    const image=new Image();let done=false;
    const finish=value=>{if(done)return;done=true;resolve(value)};
    image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=src;
    image.decode?.().then(()=>finish(true)).catch(()=>{});
    setTimeout(()=>finish(false),5000);
  });
}
function hostContext(){
  try{
    if(window.top&&window.top!==window&&window.top.location.origin===window.location.origin){return{win:window.top,doc:window.top.document};}
  }catch{}
  return{win:window,doc:document};
}
function styles(doc){
  if(doc.getElementById('starlight-reveal-v844'))return;
  const style=doc.createElement('style');
  style.id='starlight-reveal-v844';
  style.textContent=`
.reward-sequence-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(19,25,54,.68);opacity:0;transition:opacity .28s ease;overflow:auto}.reward-sequence-overlay.open{opacity:1}.reward-sequence-stage{--tier:#aee8ff;position:relative;width:min(94vw,590px);padding:22px;border-radius:28px;background:linear-gradient(165deg,rgba(47,55,104,.98),rgba(86,51,111,.98));border:2px solid rgba(255,255,255,.38);box-shadow:0 24px 68px rgba(0,0,0,.34);color:#fff;text-align:center;overflow:hidden;isolation:isolate;contain:layout paint}.reward-sequence-stage[data-tier=rare]{--tier:#65d8ff}.reward-sequence-stage[data-tier=epic]{--tier:#ff7ee1}.reward-sequence-stage[data-tier=legendary]{--tier:#ffe05a}.reward-tier-aura,.reward-tier-ring,.reward-tier-rays,.reward-tier-stars{position:absolute;inset:0;pointer-events:none;opacity:0;z-index:-1;will-change:transform,opacity}.reward-tier-aura{background:radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--tier) 42%,transparent),transparent 60%)}.reward-tier-ring{inset:14%;border:2px solid color-mix(in srgb,var(--tier) 80%,white);border-radius:50%;box-shadow:0 0 22px color-mix(in srgb,var(--tier) 55%,transparent)}.reward-tier-rays{background:repeating-conic-gradient(from 0deg,transparent 0 16deg,color-mix(in srgb,var(--tier) 28%,transparent) 17deg 19deg,transparent 20deg 32deg);mask:radial-gradient(circle,transparent 0 31%,#000 33% 68%,transparent 70%)}.reward-tier-stars{background-image:radial-gradient(circle,#fff 0 1.5px,transparent 2.5px),radial-gradient(circle,var(--tier) 0 1.5px,transparent 2.5px);background-size:64px 67px,91px 85px;background-position:10px 20px,37px 8px}.reward-sequence-progress{display:flex;justify-content:center;gap:7px}.reward-sequence-progress span{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}.reward-sequence-progress span.active{background:var(--tier);box-shadow:0 0 9px var(--tier)}.reward-sequence-kicker{font-size:.75rem;font-weight:950;letter-spacing:.16em;text-transform:uppercase}.reward-sequence-card-shell{position:relative;width:min(68vw,300px);aspect-ratio:5/7;margin:12px auto;perspective:1500px;cursor:pointer;transform-origin:center;will-change:transform}.reward-sequence-card-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform 1.08s cubic-bezier(.2,.72,.18,1);will-change:transform}.reward-sequence-card-shell.flip .reward-sequence-card-inner{transform:rotateY(180deg)}.reward-sequence-face{position:absolute;inset:0;overflow:hidden;border-radius:18px;border:2px solid rgba(255,255,255,.86);background:#fff;box-shadow:0 16px 34px rgba(0,0,0,.34);backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:translateZ(0)}.reward-sequence-face.front{transform:rotateY(180deg)}.reward-sequence-card-image{width:100%;height:100%;display:block;object-fit:cover}.reward-sequence-copy{min-height:100px}.reward-sequence-copy h2,.reward-sequence-copy p{margin:6px 0;opacity:0;transform:translateY(8px);transition:opacity .3s ease,transform .3s ease}.is-revealed .reward-sequence-copy h2,.is-revealed .reward-sequence-copy p{opacity:1;transform:none}.reward-sequence-hint{font-size:.9rem;opacity:.86}.reward-sequence-next{min-width:190px;padding:11px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);color:#fff;font-weight:950;opacity:0;pointer-events:none;cursor:pointer;transition:opacity .25s ease}.is-revealed .reward-sequence-next{opacity:1;pointer-events:auto}.reward-sequence-card-shell.enter{animation:rewardEnter .44s ease both}.reward-sequence-card-shell.exit{animation:rewardExit .3s ease both}.reward-sequence-stage.is-charging .reward-sequence-card-shell{animation:chargeBuild var(--charge-time,1.4s) cubic-bezier(.2,.68,.22,1) both}.reward-sequence-stage.is-charging[data-tier=common]{--charge-time:1.12s}.reward-sequence-stage.is-charging[data-tier=rare]{--charge-time:1.5s}.reward-sequence-stage.is-charging[data-tier=epic]{--charge-time:1.94s}.reward-sequence-stage.is-charging[data-tier=legendary]{--charge-time:2.69s}.reward-sequence-stage.is-charging[data-tier=rare] .reward-tier-ring{opacity:.7;animation:ringBurst 1.5s ease}.reward-sequence-stage.is-charging[data-tier=epic] .reward-tier-ring{opacity:.82;animation:ringSpin 1.94s ease}.reward-sequence-stage.is-charging[data-tier=epic] .reward-tier-stars{opacity:.58;animation:starDrift 1.94s ease}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-aura{opacity:.82;animation:legendaryAura 2.69s ease}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-ring{opacity:.88;animation:legendaryRing 2.69s ease}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-rays{opacity:.52;animation:raySpin 2.69s linear}.reward-sequence-stage.is-charging[data-tier=legendary] .reward-tier-stars{opacity:.72;animation:starDrift 2.69s ease}.reward-sequence-stage.is-revealed[data-tier=rare] .reward-sequence-face.front{box-shadow:0 0 14px rgba(101,216,255,.5),0 16px 34px rgba(0,0,0,.35)}.reward-sequence-stage.is-revealed[data-tier=epic] .reward-sequence-face.front{box-shadow:0 0 17px rgba(255,126,225,.52),0 0 30px rgba(135,91,255,.18),0 16px 34px rgba(0,0,0,.36)}.reward-sequence-stage.is-revealed[data-tier=legendary] .reward-sequence-face.front{box-shadow:0 0 19px rgba(255,224,90,.56),0 0 34px rgba(255,105,210,.2),0 16px 36px rgba(0,0,0,.38)}
@keyframes rewardEnter{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}@keyframes rewardExit{to{opacity:0;transform:translateY(-14px) scale(.95)}}@keyframes chargeBuild{0%{transform:translate3d(0,0,0) scale(1)}18%{transform:translate3d(-.6px,.5px,0) scale(1.012)}36%{transform:translate3d(.8px,-.6px,0) scale(1.025)}54%{transform:translate3d(-1px,-.7px,0) scale(1.04)}70%{transform:translate3d(1.1px,.8px,0) scale(1.055)}84%{transform:translate3d(-1.2px,.9px,0) scale(1.067)}94%{transform:translate3d(1px,-.8px,0) scale(1.075)}100%{transform:translate3d(0,0,0) scale(1.08)}}@keyframes ringBurst{from{transform:scale(.5);opacity:.8}to{transform:scale(1.28);opacity:0}}@keyframes ringSpin{from{transform:scale(.5) rotate(0);opacity:.8}to{transform:scale(1.24) rotate(300deg);opacity:0}}@keyframes legendaryRing{0%{transform:scale(.35) rotate(0);opacity:.45}65%{transform:scale(1.12) rotate(430deg);opacity:.85}100%{transform:scale(1.42) rotate(540deg);opacity:0}}@keyframes legendaryAura{0%,18%{transform:scale(.55);opacity:0}55%{opacity:.82}100%{transform:scale(1.22);opacity:0}}@keyframes raySpin{to{transform:rotate(270deg)}}@keyframes starDrift{from{transform:scale(.78) rotate(-7deg)}to{transform:scale(1.08) rotate(8deg);opacity:0}}@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
`;
  doc.head.appendChild(style);
}
function timing(t){return t==='legendary'?2690:t==='epic'?1940:t==='rare'?1500:1120}
function startSounds(t){
  if(t==='legendary'){play('charge',.42);setTimeout(()=>play('analyze',.34),1100);}
  else if(t==='epic'){play('charge',.38);setTimeout(()=>play('sparkle',.3),900);}
  else if(t==='rare')play('charge',.34);
  else play('sparkle',.2);
}
function revealSound(t){
  if(t==='legendary')play('legendary',.58);
  else if(t==='epic')play('reveal',.45);
  else if(t==='rare')play('analyze',.38);
  else play('reveal',.28);
}
export function revealRewardSequence(cards=[],options={}){
  const rewards=cards.filter(Boolean);if(!rewards.length)return Promise.resolve();
  const {win,doc}=hostContext();styles(doc);
  rewards.forEach(card=>preload(frontUrl(card)));preload(options.cardBackUrl||DEFAULT_BACK);
  return new Promise(resolve=>{
    let index=0,revealed=false,busy=false;
    const overlay=doc.createElement('div');overlay.className='reward-sequence-overlay';
    overlay.innerHTML=`<section class="reward-sequence-stage"><div class="reward-tier-aura"></div><div class="reward-tier-ring"></div><div class="reward-tier-rays"></div><div class="reward-tier-stars"></div><div class="reward-sequence-progress"></div><p class="reward-sequence-kicker"></p><div class="reward-sequence-card-shell" tabindex="0"><div class="reward-sequence-card-inner"><div class="reward-sequence-face back"><img class="reward-sequence-card-image reward-card-back" alt="Card back"></div><div class="reward-sequence-face front"><img class="reward-sequence-card-image reward-card-front" alt="Reward card"></div></div></div><div class="reward-sequence-copy"><h2></h2><p></p><div class="reward-sequence-hint">Click the card to reveal it</div></div><button class="reward-sequence-next">Next Card</button></section>`;
    doc.body.appendChild(overlay);doc.body.style.overflow='hidden';win.requestAnimationFrame(()=>overlay.classList.add('open'));
    const stage=overlay.querySelector('.reward-sequence-stage');
    const shell=overlay.querySelector('.reward-sequence-card-shell');
    const backImage=overlay.querySelector('.reward-card-back');
    const frontImage=overlay.querySelector('.reward-card-front');
    const title=overlay.querySelector('h2');
    const detail=overlay.querySelector('.reward-sequence-copy p');
    const hint=overlay.querySelector('.reward-sequence-hint');
    const next=overlay.querySelector('.reward-sequence-next');
    const kicker=overlay.querySelector('.reward-sequence-kicker');
    const progress=overlay.querySelector('.reward-sequence-progress');
    progress.innerHTML=rewards.map(()=>'<span></span>').join('');
    const back=options.cardBackUrl||DEFAULT_BACK;
    backImage.src=back;
    const prep=async()=>{
      busy=true;revealed=false;
      const card=rewards[index],currentTier=tier(card),front=frontUrl(card);
      await preload(front);
      stage.dataset.tier=currentTier;stage.classList.remove('is-charging','is-revealed');
      shell.className='reward-sequence-card-shell';frontImage.src=front;frontImage.alt=card.name||'Reward card';
      title.textContent='';detail.textContent='';hint.textContent='Click the card to reveal it';
      kicker.textContent=`${options.title||'Booster Pack'} · Card ${index+1} of ${rewards.length}`;
      [...progress.children].forEach((dot,i)=>dot.classList.toggle('active',i<=index));
      next.textContent=index===rewards.length-1?'View Pack Summary':'Next Card';
      void shell.offsetWidth;shell.classList.add('enter');await wait(450);shell.classList.remove('enter');busy=false;
    };
    const reveal=async()=>{
      if(busy||revealed)return;busy=true;
      const card=rewards[index],currentTier=tier(card);
      stage.classList.add('is-charging');startSounds(currentTier);
      await wait(timing(currentTier));
      stage.classList.remove('is-charging');shell.classList.add('flip');play('flip',.34);
      await wait(1080);
      stage.classList.add('is-revealed');revealSound(currentTier);
      title.textContent=card.name||'Mystery Card';
      detail.textContent=`${card.rarity||'Common'} · ${card.seriesName||'Starlight Cards'}${card.isDuplicate?' · Duplicate':' · New Card'}`;
      hint.textContent=index===rewards.length-1?'Your pack is complete':'Click the card or Next Card to continue';
      revealed=true;busy=false;
    };
    const advance=async()=>{
      if(busy)return;if(!revealed)return reveal();
      if(index===rewards.length-1){overlay.classList.remove('open');await wait(280);overlay.remove();doc.body.style.overflow='';resolve();return;}
      busy=true;shell.classList.add('exit');await wait(310);index++;shell.classList.remove('exit');await prep();
    };
    shell.onclick=()=>revealed?advance():reveal();
    shell.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();revealed?advance():reveal();}};
    next.onclick=advance;prep();
  });
}
export const revealCard=card=>revealRewardSequence([card],{title:'Card Reward'});
