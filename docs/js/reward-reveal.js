const DEFAULT_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';
const SFX_KEY = 'sora-starlight-card-binder-v7-sfx';
const FLIP_SOUND = 'site_assets/sfx/card-flip.wav';

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const frontUrl = card => card?.imageUrl || card?.image_url || card?.thumbnailUrl || card?.thumbnail_url || DEFAULT_BACK;
const prettyMeta = value => String(value || '').trim().replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const categoryOf = card => prettyMeta(card?.categoryName || card?.category_name || card?.categoryId || card?.category_id || '');
const subcategoryOf = card => prettyMeta(card?.subcategoryName || card?.subcategory_name || card?.subcategoryId || card?.subcategory_id || '');

function soundEnabled() {
  return localStorage.getItem(SFX_KEY) !== 'off';
}

function playFlipSound(doc, legendary = false) {
  if (!soundEnabled()) return;
  try {
    const audio = new Audio(new URL(FLIP_SOUND, doc.baseURI).href);
    audio.volume = legendary ? 0.42 : 0.28;
    audio.playbackRate = legendary ? 0.88 : 1;
    audio.play().catch(() => {});
  } catch (_) {}
}

function preload(src) {
  return new Promise(resolve => {
    if (!src) return resolve(false);
    const image = new Image();
    let finished = false;
    const finish = value => {
      if (finished) return;
      finished = true;
      resolve(value);
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    image.decode?.().then(() => finish(true)).catch(() => {});
    window.setTimeout(() => finish(false), 4500);
  });
}

function getHost() {
  try {
    if (window.top && window.top !== window && window.top.location.origin === window.location.origin) {
      return { win: window.top, doc: window.top.document };
    }
  } catch (_) {}
  return { win: window, doc: document };
}

function rarityKey(value) {
  const key = String(value || 'common').trim().toLowerCase();
  return ['common','uncommon','rare','epic','legendary'].includes(key) ? key : 'common';
}

function rarityColor(value) {
  return {
    common:'#aab3c2',
    uncommon:'#59b9ec',
    rare:'#ec9547',
    epic:'#ef72bd',
    legendary:'#f6c92f'
  }[rarityKey(value)];
}

function installStyles(doc) {
  if (doc.getElementById('starlight-reveal-v930')) return;
  const style = doc.createElement('style');
  style.id = 'starlight-reveal-v930';
  style.textContent = `
    .sr930-overlay{
      position:fixed!important;
      inset:0!important;
      z-index:2147483640!important;
      display:grid!important;
      place-items:center!important;
      width:100vw!important;
      height:100vh!important;
      padding:clamp(12px,2.5vw,28px)!important;
      overflow:auto!important;
      box-sizing:border-box!important;
      opacity:0;
      transition:opacity .2s ease;
      background:
        radial-gradient(circle at 18% 26%,rgba(107,198,248,.52),transparent 34%),
        radial-gradient(circle at 82% 28%,rgba(255,130,200,.47),transparent 35%),
        radial-gradient(circle at 50% 88%,rgba(199,135,239,.44),transparent 43%),
        linear-gradient(135deg,rgba(24,37,92,.94),rgba(90,63,148,.88) 52%,rgba(177,76,149,.84))!important;
      backdrop-filter:blur(18px) saturate(1.25)!important;
    }
    .sr930-overlay.is-open{opacity:1}
    .sr930-aura,.sr930-aura:before,.sr930-aura:after{
      position:absolute;
      inset:-18%;
      pointer-events:none;
      content:"";
    }
    .sr930-aura{
      background:
        radial-gradient(circle,rgba(255,255,255,.86) 0 1px,transparent 2px) 0 0/48px 48px,
        radial-gradient(circle,rgba(255,218,244,.7) 0 1.5px,transparent 2.5px) 18px 22px/78px 78px;
      opacity:.34;
      animation:sr930AuraDrift 12s linear infinite;
    }
    .sr930-aura:before{
      background:conic-gradient(from 0deg at 50% 50%,transparent,rgba(107,198,248,.25),transparent,rgba(255,130,200,.3),transparent);
      filter:blur(30px);
      opacity:.42;
      animation:sr930AuraSpin 20s linear infinite;
    }
    .sr930-aura:after{
      inset:12%;
      border-radius:50%;
      background:radial-gradient(circle,rgba(255,255,255,.16),transparent 65%);
      filter:blur(18px);
      animation:sr930AuraPulse 3.2s ease-in-out infinite;
    }
    .sr930-stage{
      --rarity:#aab3c2;
      position:relative!important;
      z-index:3!important;
      width:min(94vw,540px)!important;
      min-height:min(760px,calc(100vh - 28px))!important;
      margin:auto!important;
      padding:18px 18px 22px!important;
      box-sizing:border-box!important;
      overflow:hidden!important;
      border:1px solid rgba(255,255,255,.48)!important;
      border-radius:28px!important;
      background:
        radial-gradient(circle at 50% 37%,color-mix(in srgb,var(--rarity) 20%,transparent),transparent 46%),
        linear-gradient(160deg,rgba(51,64,129,.76),rgba(92,56,122,.72))!important;
      box-shadow:0 24px 70px rgba(0,0,0,.36),0 0 88px color-mix(in srgb,var(--rarity) 24%,transparent)!important;
      color:#fff!important;
      text-align:center!important;
    }
    .sr930-progress{display:flex;justify-content:center;gap:8px;margin:0 0 10px}
    .sr930-progress span{
      width:10px;height:10px;border-radius:50%;
      background:var(--dot,#cbd2df);
      border:1px solid rgba(255,255,255,.78);
      box-shadow:0 2px 7px rgba(0,0,0,.22);
      opacity:.5
    }
    .sr930-progress span.is-current{opacity:1;transform:scale(1.26);box-shadow:0 0 0 3px rgba(255,255,255,.2),0 0 14px var(--dot,#fff)}
    .sr930-progress span.is-complete{opacity:.88}
    .sr930-kicker{margin:0;font-size:.74rem;font-weight:950;letter-spacing:.11em;text-transform:uppercase}
    .sr930-card-zone{
      position:relative;
      display:grid;
      place-items:center;
      min-height:430px;
      margin:4px auto 8px;
      perspective:1400px;
    }
    .sr930-rings{
      position:absolute;
      width:min(390px,82vw);
      aspect-ratio:1;
      border-radius:50%;
      border:1px solid rgba(255,255,255,.30);
      box-shadow:
        0 0 0 28px rgba(255,255,255,.035),
        0 0 0 58px color-mix(in srgb,var(--rarity) 8%,transparent),
        0 0 60px color-mix(in srgb,var(--rarity) 28%,transparent);
      animation:sr930RingIdle 5s linear infinite;
    }
    .sr930-card{
      position:relative;
      z-index:4;
      width:min(68vw,286px);
      aspect-ratio:5/7;
      padding:0;
      border:0;
      background:transparent;
      cursor:pointer;
      perspective:1400px;
      transform:translateZ(0);
    }
    .sr930-shell{
      position:absolute;
      inset:0;
      transform-style:preserve-3d;
      will-change:transform,filter;
      animation:sr930CardIdle 3.2s ease-in-out infinite;
    }
    .sr930-face{
      position:absolute;
      inset:0;
      display:block;
      width:100%;
      height:100%;
      object-fit:cover;
      border:2px solid rgba(255,255,255,.94);
      border-radius:18px;
      background:#fff;
      box-shadow:0 18px 42px rgba(0,0,0,.36);
      backface-visibility:hidden;
      user-select:none;
      -webkit-user-drag:none;
    }
    .sr930-front{transform:rotateY(180deg)}
    .sr930-card.is-revealing .sr930-shell{
      animation:sr930SpinReveal 1.25s cubic-bezier(.18,.76,.18,1) forwards;
    }
    .sr930-stage.rarity-legendary .sr930-card.is-revealing .sr930-shell{
      animation:sr930LegendaryReveal 2.05s cubic-bezier(.14,.78,.12,1) forwards;
    }
    .sr930-stage.is-revealed .sr930-shell{
      animation:none;
      transform:rotateY(900deg);
    }
    .sr930-stage.rarity-legendary.is-revealed .sr930-shell{
      transform:rotateY(1620deg);
      filter:drop-shadow(0 0 18px #fff4a3) drop-shadow(0 0 44px #f6c92f);
    }
    .sr930-flash{
      position:absolute;
      inset:0;
      z-index:6;
      pointer-events:none;
      opacity:0;
      background:radial-gradient(circle,rgba(255,255,255,.98),color-mix(in srgb,var(--rarity) 65%,transparent) 30%,transparent 68%);
      mix-blend-mode:screen;
    }
    .sr930-stage.is-bursting .sr930-flash{animation:sr930Flash .7s ease-out}
    .sr930-stage.rarity-legendary.is-bursting .sr930-flash{animation:sr930LegendaryFlash 1.15s ease-out}
    .sr930-rays{
      position:absolute;
      inset:-35%;
      z-index:1;
      opacity:0;
      pointer-events:none;
      background:repeating-conic-gradient(from 0deg,rgba(255,255,255,.0) 0 8deg,color-mix(in srgb,var(--rarity) 44%,transparent) 9deg 12deg,rgba(255,255,255,0) 13deg 21deg);
      filter:blur(1px);
    }
    .sr930-stage.rarity-legendary.is-bursting .sr930-rays{
      animation:sr930LegendaryRays 1.8s ease-out;
    }
    .sr930-particles{
      position:absolute;
      inset:0;
      z-index:7;
      pointer-events:none;
      overflow:hidden;
    }
    .sr930-particle{
      position:absolute;
      left:50%;top:48%;
      width:var(--size,8px);height:var(--size,8px);
      border-radius:50%;
      background:var(--color,#fff);
      box-shadow:0 0 10px var(--color,#fff);
      opacity:0;
    }
    .sr930-stage.is-bursting .sr930-particle{
      animation:sr930Particle var(--duration,.9s) ease-out var(--delay,0s) forwards;
    }
    .sr930-copy{min-height:104px}
    .sr930-copy h2,.sr930-copy p{margin:6px 0}
    .sr930-copy h2{font-size:1.48rem}
    .sr930-copy p{opacity:.9}
    .sr930-hint{font-size:.9rem;opacity:.84;margin-top:7px}
    .sr930-next{
      min-width:180px;
      padding:11px 20px;
      border:0;
      border-radius:999px;
      background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);
      color:#fff;
      font-weight:950;
      cursor:pointer;
      opacity:0;
      pointer-events:none;
      transition:opacity .16s ease;
    }
    .sr930-stage.is-revealed .sr930-next{opacity:1;pointer-events:auto}
    .sr930-stage.rarity-legendary.is-revealed .sr930-copy h2{
      color:#fff7bd;
      text-shadow:0 0 10px #f6c92f,0 0 22px rgba(246,201,47,.65);
    }
    @keyframes sr930CardIdle{
      0%,100%{transform:rotateY(-8deg) rotateX(2deg) translateY(0)}
      50%{transform:rotateY(8deg) rotateX(-2deg) translateY(-9px)}
    }
    @keyframes sr930SpinReveal{
      0%{transform:rotateY(0deg) scale(1)}
      22%{transform:rotateY(180deg) scale(.95)}
      58%{transform:rotateY(610deg) scale(1.08)}
      82%{transform:rotateY(840deg) scale(1.03)}
      100%{transform:rotateY(900deg) scale(1)}
    }
    @keyframes sr930LegendaryReveal{
      0%{transform:rotateY(0deg) scale(1)}
      18%{transform:rotateY(300deg) scale(.9)}
      42%{transform:rotateY(810deg) scale(1.16)}
      67%{transform:rotateY(1280deg) scale(.97)}
      86%{transform:rotateY(1530deg) scale(1.12)}
      100%{transform:rotateY(1620deg) scale(1)}
    }
    @keyframes sr930Flash{
      0%{opacity:0}
      20%{opacity:1}
      100%{opacity:0}
    }
    @keyframes sr930LegendaryFlash{
      0%{opacity:0}
      15%{opacity:1}
      38%{opacity:.35}
      55%{opacity:.95}
      100%{opacity:0}
    }
    @keyframes sr930LegendaryRays{
      0%{opacity:0;transform:scale(.55) rotate(0)}
      28%{opacity:.95}
      100%{opacity:0;transform:scale(1.25) rotate(65deg)}
    }
    @keyframes sr930Particle{
      0%{opacity:0;transform:translate(-50%,-50%) scale(.2)}
      18%{opacity:1}
      100%{opacity:0;transform:translate(calc(-50% + var(--x)),calc(-50% + var(--y))) rotate(var(--r)) scale(1.3)}
    }
    @keyframes sr930RingIdle{to{transform:rotate(360deg)}}
    @keyframes sr930AuraDrift{to{transform:translate3d(48px,24px,0)}}
    @keyframes sr930AuraSpin{to{transform:rotate(360deg)}}
    @keyframes sr930AuraPulse{50%{transform:scale(1.08);opacity:.65}}
    @media(max-width:600px){
      .sr930-stage{min-height:calc(100vh - 24px)!important;padding:14px 12px 18px!important}
      .sr930-card-zone{min-height:390px}
      .sr930-card{width:min(72vw,270px)}
    }
    @media(prefers-reduced-motion:reduce){
      .sr930-overlay,.sr930-shell,.sr930-next,.sr930-aura,.sr930-aura:before,.sr930-aura:after,.sr930-rings{animation-duration:.01ms!important}
    }
  `;
  doc.head.appendChild(style);
}

function buildParticles(stage, rarity) {
  const container = stage.querySelector('.sr930-particles');
  container.replaceChildren();
  const legendary = rarity === 'legendary';
  const count = legendary ? 52 : rarity === 'epic' ? 30 : rarity === 'rare' ? 22 : 16;
  const palette = legendary ? ['#fff','#fff4a3','#f6c92f','#ff82c8','#6bc6f8'] : ['#fff',rarityColor(rarity),'#ffb7e2','#bce8ff'];
  for (let i = 0; i < count; i += 1) {
    const particle = stage.ownerDocument.createElement('span');
    particle.className = 'sr930-particle';
    const angle = (Math.PI * 2 * i / count) + Math.random() * .32;
    const distance = (legendary ? 150 : 105) + Math.random() * (legendary ? 175 : 100);
    particle.style.setProperty('--x', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--y', `${Math.sin(angle) * distance}px`);
    particle.style.setProperty('--r', `${Math.round(Math.random() * 720 - 360)}deg`);
    particle.style.setProperty('--size', `${Math.round(4 + Math.random() * (legendary ? 10 : 7))}px`);
    particle.style.setProperty('--color', palette[i % palette.length]);
    particle.style.setProperty('--delay', `${(Math.random() * (legendary ? .34 : .16)).toFixed(2)}s`);
    particle.style.setProperty('--duration', `${(.72 + Math.random() * (legendary ? .85 : .42)).toFixed(2)}s`);
    container.appendChild(particle);
  }
}

export function revealRewardSequence(cards = [], options = {}) {
  const rewards = cards.filter(Boolean);
  if (!rewards.length) return Promise.resolve();

  const { win, doc } = getHost();
  installStyles(doc);
  const cardBack = options.cardBackUrl || DEFAULT_BACK;
  preload(cardBack);
  rewards.forEach(card => preload(frontUrl(card)));

  return new Promise(resolve => {
    let index = 0;
    let revealed = false;
    let busy = false;
    const priorOverflow = doc.body.style.overflow;
    const priorHtmlOverflow = doc.documentElement.style.overflow;

    const overlay = doc.createElement('div');
    overlay.className = 'sr930-overlay';
    overlay.innerHTML = `
      <div class="sr930-aura"></div>
      <section class="sr930-stage" role="dialog" aria-modal="true" aria-label="Card reveal">
        <div class="sr930-rays"></div>
        <div class="sr930-flash"></div>
        <div class="sr930-particles"></div>
        <div class="sr930-progress"></div>
        <p class="sr930-kicker"></p>
        <div class="sr930-card-zone">
          <div class="sr930-rings"></div>
          <button class="sr930-card" type="button" aria-label="Reveal card">
            <span class="sr930-shell">
              <img class="sr930-face sr930-back" alt="Card back">
              <img class="sr930-face sr930-front" alt="Reward card">
            </span>
          </button>
        </div>
        <div class="sr930-copy">
          <h2></h2>
          <p></p>
          <div class="sr930-hint">Click the card to reveal it</div>
        </div>
        <button class="sr930-next" type="button">Next Card</button>
      </section>`;

    doc.body.appendChild(overlay);
    doc.body.style.overflow = 'hidden';
    doc.documentElement.style.overflow = 'hidden';
    win.requestAnimationFrame(() => overlay.classList.add('is-open'));

    const stage = overlay.querySelector('.sr930-stage');
    const cardButton = overlay.querySelector('.sr930-card');
    const shell = overlay.querySelector('.sr930-shell');
    const backImage = overlay.querySelector('.sr930-back');
    const frontImage = overlay.querySelector('.sr930-front');
    const title = overlay.querySelector('h2');
    const detail = overlay.querySelector('.sr930-copy p');
    const hint = overlay.querySelector('.sr930-hint');
    const nextButton = overlay.querySelector('.sr930-next');
    const kicker = overlay.querySelector('.sr930-kicker');
    const progress = overlay.querySelector('.sr930-progress');

    progress.innerHTML = rewards.map(card => `<span style="--dot:${rarityColor(card.rarity)}" title="${String(card.rarity || 'Common').replace(/["<>]/g,'')}"></span>`).join('');

    const prepare = async () => {
      busy = true;
      revealed = false;
      const card = rewards[index];
      const rarity = rarityKey(card.rarity);
      await Promise.all([preload(cardBack), preload(frontUrl(card))]);

      stage.className = `sr930-stage rarity-${rarity}`;
      stage.style.setProperty('--rarity', rarityColor(rarity));
      shell.style.animation = 'none';
      shell.style.transform = 'rotateY(0deg)';
      shell.style.filter = '';
      await wait(30);
      shell.style.animation = '';
      shell.style.transform = '';
      backImage.src = cardBack;
      frontImage.src = frontUrl(card);
      backImage.alt = 'Card back';
      frontImage.alt = card.name || 'Reward card';
      buildParticles(stage, rarity);

      title.textContent = 'Mystery Card';
      detail.textContent = 'Ready to reveal';
      hint.textContent = rarity === 'legendary' ? 'A powerful presence is waiting… click to reveal' : 'Click the card to reveal it';
      kicker.textContent = `${options.title || 'Booster Pack'} · Card ${index + 1} of ${rewards.length}`;
      nextButton.textContent = index === rewards.length - 1 ? 'Finish Pack' : 'Next Card';

      [...progress.children].forEach((dot, dotIndex) => {
        dot.classList.toggle('is-current', dotIndex === index);
        dot.classList.toggle('is-complete', dotIndex < index);
      });
      await wait(80);
      busy = false;
    };

    const reveal = async () => {
      if (busy || revealed) return;
      busy = true;
      const card = rewards[index];
      const rarity = rarityKey(card.rarity);
      const legendary = rarity === 'legendary';

      playFlipSound(doc, legendary);
      cardButton.classList.add('is-revealing');
      await wait(legendary ? 1080 : 690);
      stage.classList.add('is-bursting');
      await wait(legendary ? 1050 : 620);

      cardButton.classList.remove('is-revealing');
      stage.classList.remove('is-bursting');
      stage.classList.add('is-revealed');

      title.textContent = card.name || 'Mystery Card';
      const identity = [card.rarity || 'Common', categoryOf(card), subcategoryOf(card)].filter(Boolean).join(' · ');
      detail.textContent = `${identity || 'Starlight Card'}${card.isDuplicate ? ' · Duplicate' : ' · New Card'}`;
      hint.textContent = index === rewards.length - 1 ? 'Your pack is complete!' : 'Click the card or Next Card to continue';
      revealed = true;
      busy = false;
    };

    const finish = async () => {
      overlay.classList.remove('is-open');
      await wait(210);
      overlay.remove();
      doc.body.style.overflow = priorOverflow;
      doc.documentElement.style.overflow = priorHtmlOverflow;
      resolve();
    };

    const advance = async () => {
      if (busy) return;
      if (!revealed) return reveal();
      if (index >= rewards.length - 1) return finish();
      index += 1;
      await prepare();
    };

    cardButton.addEventListener('click', advance);
    nextButton.addEventListener('click', advance);
    prepare();
  });
}

export const revealCard = card => revealRewardSequence([card], { title: 'Card Reward' });
