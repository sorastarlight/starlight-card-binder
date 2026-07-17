const DEFAULT_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';
const SFX_KEY = 'sora-starlight-card-binder-v7-sfx';
const FLIP_SOUND = 'site_assets/sfx/card-flip.wav';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const frontUrl = card => card?.imageUrl || card?.image_url || card?.thumbnailUrl || card?.thumbnail_url || DEFAULT_BACK;
const prettyMeta = value => String(value || '').trim().replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const categoryOf = card => prettyMeta(card?.categoryName || card?.category_name || card?.categoryId || card?.category_id || '');
const subcategoryOf = card => prettyMeta(card?.subcategoryName || card?.subcategory_name || card?.subcategoryId || card?.subcategory_id || '');

function soundEnabled(){ return localStorage.getItem(SFX_KEY) !== 'off'; }
function playFlipSound(doc){ if(!soundEnabled()) return; try{const audio=new Audio(new URL(FLIP_SOUND,doc.baseURI).href);audio.volume=.28;audio.play().catch(()=>{});}catch(_){} }
function preload(src){ return new Promise(resolve=>{if(!src)return resolve(false);const img=new Image();let done=false;const finish=v=>{if(done)return;done=true;resolve(v)};img.onload=()=>finish(true);img.onerror=()=>finish(false);img.src=src;img.decode?.().then(()=>finish(true)).catch(()=>{});setTimeout(()=>finish(false),4000);}); }
function getHost(){try{if(window.top&&window.top!==window&&window.top.location.origin===window.location.origin)return{win:window.top,doc:window.top.document};}catch(_){}return{win:window,doc:document};}
function rarityColor(v){switch(String(v||'').toLowerCase()){case'legendary':return'#ffd52f';case'epic':return'#ff78cb';case'rare':return'#ff9c52';case'uncommon':return'#64c9ff';default:return'#c5cfdf';}}
function rarityClass(v){return `rarity-${String(v||'common').toLowerCase()}`;}

function installStyles(doc){
  let style=doc.getElementById('starlight-reveal-v920');
  if(style)return;
  style=doc.createElement('style');
  style.id='starlight-reveal-v920';
  style.textContent=`
  .sr920-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:radial-gradient(circle at 50% 38%,rgba(88,110,207,.34),transparent 34%),rgba(20,24,55,.88);backdrop-filter:blur(13px);opacity:0;transition:opacity .2s ease;overflow:auto}
  .sr920-overlay.is-open{opacity:1}
  .sr920-stage{position:relative;width:min(96vw,720px);min-height:min(92vh,820px);display:grid;grid-template-rows:auto auto 1fr auto;place-items:center;gap:10px;padding:24px 24px 28px;border-radius:30px;overflow:hidden;color:#fff;text-align:center;background:radial-gradient(circle at 50% 42%,rgba(255,255,255,.18),transparent 28%),linear-gradient(145deg,#1d2f73,#5d3e8b 58%,#b34f9f);box-shadow:0 30px 100px rgba(0,0,0,.48),inset 0 0 80px rgba(255,255,255,.1)}
  .sr920-stage:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle,rgba(255,255,255,.75) 0 1px,transparent 1.8px);background-size:38px 38px;opacity:.28;animation:sr920Twinkle 3.8s ease-in-out infinite}
  .sr920-progress,.sr920-kicker,.sr920-copy,.sr920-next{position:relative;z-index:4}
  .sr920-progress{display:flex;justify-content:center;flex-wrap:wrap;gap:8px}
  .sr920-progress span{width:10px;height:10px;border-radius:50%;background:var(--dot);opacity:.45;border:1px solid rgba(255,255,255,.8)}
  .sr920-progress span.is-current{opacity:1;transform:scale(1.3);box-shadow:0 0 0 4px rgba(255,255,255,.12),0 0 16px var(--dot)}
  .sr920-progress span.is-complete{opacity:.9}
  .sr920-kicker{margin:0;font-size:.75rem;font-weight:950;letter-spacing:.12em;text-transform:uppercase}
  .sr920-reveal-zone{position:relative;z-index:3;width:100%;display:grid;place-items:center;min-height:500px}
  .sr920-rings{position:absolute;width:min(68vw,450px);aspect-ratio:1;border-radius:50%;border:1px solid rgba(255,255,255,.18);box-shadow:0 0 0 38px rgba(107,198,248,.06),0 0 0 78px rgba(255,130,200,.045);animation:sr920Orbit 12s linear infinite}
  .sr920-particles{position:absolute;inset:0;pointer-events:none}
  .sr920-particles i{position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;background:var(--spark,#fff);box-shadow:0 0 16px var(--spark,#fff);opacity:0}
  .sr920-card{position:relative;width:min(70vw,330px);aspect-ratio:5/7;border:0;background:transparent;perspective:1400px;cursor:pointer;z-index:3;filter:drop-shadow(0 22px 34px rgba(0,0,0,.42))}
  .sr920-shell{position:absolute;inset:0;transform-style:preserve-3d;will-change:transform}
  .sr920-shell img{width:100%;height:100%;display:block;object-fit:cover;border-radius:20px;border:3px solid rgba(255,255,255,.92);background:#fff;backface-visibility:hidden;box-shadow:0 0 0 4px rgba(255,210,56,.32),0 0 32px rgba(255,255,255,.22)}
  .sr920-card.is-spinning .sr920-shell{animation:sr920Spin .92s cubic-bezier(.18,.72,.2,1) both}
  .sr920-card.is-revealed .sr920-shell{animation:sr920Settle .62s cubic-bezier(.2,.8,.2,1) both}
  .sr920-card.is-revealed img{box-shadow:0 0 0 4px color-mix(in srgb,var(--rarity) 55%,white),0 0 38px color-mix(in srgb,var(--rarity) 72%,transparent)}
  .sr920-flash{position:absolute;inset:50% auto auto 50%;width:40px;height:40px;border-radius:50%;transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;z-index:5;pointer-events:none}
  .sr920-stage.is-flashing .sr920-flash{animation:sr920Flash .55s ease-out}
  .sr920-stage.is-flashing .sr920-particles i{animation:sr920Burst .8s ease-out forwards;animation-delay:var(--delay)}
  .sr920-copy{min-height:92px}
  .sr920-copy h2{margin:6px 0 4px;font-size:clamp(1.4rem,4vw,2rem)}
  .sr920-copy p{margin:0;opacity:.88;font-weight:800}
  .sr920-hint{margin-top:7px;font-size:.9rem;opacity:.78}
  .sr920-next{min-width:190px;padding:12px 22px;border:0;border-radius:999px;background:linear-gradient(135deg,#ffd52f,#ff82c8,#6bc6f8);color:#fff;font-weight:950;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .18s ease}
  .sr920-stage.is-revealed .sr920-next{opacity:1;pointer-events:auto}
  @keyframes sr920Spin{0%{transform:rotateZ(0) rotateY(0) scale(1)}35%{transform:rotateZ(540deg) rotateY(90deg) scale(.92)}55%{transform:rotateZ(720deg) rotateY(90deg) scale(.88)}100%{transform:rotateZ(720deg) rotateY(180deg) scale(1.02)}}
  @keyframes sr920Settle{0%{transform:rotateZ(0) rotateY(180deg) scale(1.02)}55%{transform:rotateZ(0) rotateY(360deg) scale(1.06)}100%{transform:rotateZ(0) rotateY(360deg) scale(1)}}
  @keyframes sr920Flash{0%{opacity:0;transform:translate(-50%,-50%) scale(.1)}30%{opacity:.95}100%{opacity:0;transform:translate(-50%,-50%) scale(16)}}
  @keyframes sr920Burst{0%{opacity:0;transform:translate(-50%,-50%) rotate(var(--angle)) translateX(0) scale(.4)}25%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) rotate(var(--angle)) translateX(var(--distance)) scale(1.4)}}
  @keyframes sr920Orbit{to{transform:rotate(360deg)}}
  @keyframes sr920Twinkle{50%{opacity:.46}}
  @media(max-width:600px){.sr920-stage{min-height:92vh;padding:18px 14px}.sr920-reveal-zone{min-height:430px}.sr920-card{width:min(78vw,310px)}}
  @media(prefers-reduced-motion:reduce){.sr920-overlay,.sr920-next{transition:none}.sr920-card.is-spinning .sr920-shell,.sr920-card.is-revealed .sr920-shell,.sr920-rings,.sr920-stage:before{animation-duration:.01ms!important}}
  `;
  doc.head.appendChild(style);
}

export function revealRewardSequence(cards=[],options={}){
  const rewards=cards.filter(Boolean); if(!rewards.length)return Promise.resolve();
  const{win,doc}=getHost(); installStyles(doc);
  const back=options.cardBackUrl||DEFAULT_BACK; preload(back); rewards.forEach(c=>preload(frontUrl(c)));
  return new Promise(resolve=>{
    let index=0,revealed=false,busy=false; const prior=doc.body.style.overflow;
    const overlay=doc.createElement('div'); overlay.className='sr920-overlay';
    overlay.innerHTML=`<section class="sr920-stage" role="dialog" aria-modal="true" aria-label="Card reveal"><div class="sr920-progress"></div><p class="sr920-kicker"></p><div class="sr920-reveal-zone"><div class="sr920-rings"></div><div class="sr920-particles"></div><div class="sr920-flash"></div><button class="sr920-card" type="button" aria-label="Reveal card" style="--rarity:#fff"><span class="sr920-shell"><img alt="Card back"></span></button></div><div class="sr920-copy"><h2>Mystery Card</h2><p>Ready to reveal</p><div class="sr920-hint">Click the card to reveal it</div></div><button class="sr920-next" type="button">Next Card</button></section>`;
    doc.body.appendChild(overlay); doc.body.style.overflow='hidden'; win.requestAnimationFrame(()=>overlay.classList.add('is-open'));
    const stage=overlay.querySelector('.sr920-stage'),cardButton=overlay.querySelector('.sr920-card'),image=overlay.querySelector('img'),title=overlay.querySelector('h2'),detail=overlay.querySelector('.sr920-copy p'),hint=overlay.querySelector('.sr920-hint'),next=overlay.querySelector('.sr920-next'),kicker=overlay.querySelector('.sr920-kicker'),progress=overlay.querySelector('.sr920-progress'),particles=overlay.querySelector('.sr920-particles');
    progress.innerHTML=rewards.map(c=>`<span style="--dot:${rarityColor(c.rarity)}"></span>`).join('');
    particles.innerHTML=Array.from({length:22},(_,i)=>`<i style="--angle:${i*(360/22)}deg;--distance:${140+(i%5)*24}px;--delay:${(i%6)*.025}s;--spark:${i%3===0?'#ffd52f':i%3===1?'#ff82c8':'#8ee5ff'}"></i>`).join('');
    const prepare=async()=>{busy=true;revealed=false;const card=rewards[index];await Promise.all([preload(back),preload(frontUrl(card))]);stage.classList.remove('is-revealed','is-flashing');cardButton.className='sr920-card';cardButton.style.setProperty('--rarity',rarityColor(card.rarity));image.src=back;image.alt='Card back';title.textContent='Mystery Card';detail.textContent='Ready to reveal';hint.textContent='Click the card to reveal it';kicker.textContent=`${options.title||'Booster Pack'} · Card ${index+1} of ${rewards.length}`;next.textContent=index===rewards.length-1?'Finish':'Next Card';[...progress.children].forEach((d,i)=>{d.classList.toggle('is-current',i===index);d.classList.toggle('is-complete',i<index)});await wait(80);busy=false;};
    const reveal=async()=>{if(busy||revealed)return;busy=true;const card=rewards[index];playFlipSound(doc);cardButton.classList.add('is-spinning');await wait(470);image.src=frontUrl(card);image.alt=card.name||'Reward card';stage.classList.add('is-flashing');await wait(430);cardButton.classList.remove('is-spinning');cardButton.classList.add('is-revealed');await wait(560);title.textContent=card.name||'Mystery Card';detail.textContent=[card.rarity||'Common',categoryOf(card),subcategoryOf(card),card.isDuplicate?'Duplicate':'New Card'].filter(Boolean).join(' · ');hint.textContent=index===rewards.length-1?'Click Finish to continue':'Click the card or Next Card to continue';stage.classList.add('is-revealed');revealed=true;busy=false;};
    const finish=async()=>{overlay.classList.remove('is-open');await wait(180);overlay.remove();doc.body.style.overflow=prior;resolve();};
    const advance=async()=>{if(busy)return;if(!revealed)return reveal();if(index>=rewards.length-1)return finish();index++;await prepare();};
    cardButton.addEventListener('click',advance);next.addEventListener('click',advance);prepare();
  });
}
export const revealCard=card=>revealRewardSequence([card],{title:'Card Reward'});
