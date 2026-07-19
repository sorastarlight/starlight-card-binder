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

function playFlipSound(doc, volume = .28) {
  if (!soundEnabled()) return;
  try {
    const audio = new Audio(new URL(FLIP_SOUND, doc.baseURI).href);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (_) {}
}

function preload(src) {
  return new Promise(resolve => {
    if (!src) return resolve(false);
    const image = new Image();
    let done = false;
    const finish = value => {
      if (done) return;
      done = true;
      resolve(value);
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    image.decode?.().then(() => finish(true)).catch(() => {});
    setTimeout(() => finish(false), 4000);
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
  if (doc.getElementById('starlight-reveal-v931')) return;
  const style = doc.createElement('style');
  style.id = 'starlight-reveal-v931';
  style.textContent = `
    .sr931-overlay{
      position:fixed!important;
      inset:0!important;
      z-index:2147483640!important;
      display:grid!important;
      place-items:center!important;
      width:100vw!important;
      height:100vh!important;
      padding:16px!important;
      box-sizing:border-box!important;
      overflow:auto!important;
      background:rgba(32,40,82,.42)!important;
      backdrop-filter:blur(18px) saturate(1.18)!important;
      opacity:0;
      transition:opacity .22s ease;
    }
    .sr931-overlay.is-open{opacity:1}
    .sr931-aura{
      position:absolute;
      inset:0;
      pointer-events:none;
      background:
        radial-gradient(circle at 22% 26%,rgba(107,198,248,.34),transparent 34%),
        radial-gradient(circle at 80% 24%,rgba(255,130,200,.34),transparent 36%),
        radial-gradient(circle at 50% 82%,rgba(199,135,239,.26),transparent 42%);
      filter:blur(28px);
      animation:sr931Aura 5s ease-in-out infinite alternate;
    }
    .sr931-root{
      position:relative;
      z-index:2;
      width:min(94vw,520px);
      min-height:min(760px,calc(100vh - 32px));
      display:grid;
      place-items:center;
      align-content:center;
      gap:14px;
      margin:auto;
      color:#fff;
      text-align:center;
      box-sizing:border-box;
    }
    .sr931-pack-stage{
      position:relative;
      width:min(250px,56vw);
      height:min(360px,44vh);
      display:grid;
      place-items:center;
      perspective:1200px;
    }
    .sr931-pack{
      width:100%;
      height:100%;
      object-fit:contain;
      filter:drop-shadow(0 20px 28px rgba(0,0,0,.34));
      animation:sr931PackFloat 2.2s ease-in-out infinite;
      transform-origin:center;
    }
    .sr931-pack.is-opening{
      animation:sr931PackOpen .72s cubic-bezier(.16,.84,.28,1) forwards;
    }
    .sr931-pack-burst{
      position:absolute;
      inset:-35%;
      opacity:0;
      pointer-events:none;
      background:radial-gradient(circle,rgba(255,255,255,.94),rgba(255,214,244,.44) 30%,rgba(107,198,248,.22) 48%,transparent 70%);
      filter:blur(3px);
    }
    .sr931-pack-stage.is-bursting .sr931-pack-burst{animation:sr931Burst .72s ease-out}
    .sr931-deck{
      position:relative;
      width:min(72vw,300px);
      aspect-ratio:5/7;
      perspective:1400px;
      display:none;
    }
    .sr931-deck.is-visible{display:block}
    .sr931-card{
      position:absolute;
      inset:0;
      transform-style:preserve-3d;
      transition:transform .72s cubic-bezier(.2,.78,.24,1), opacity .28s ease, filter .28s ease;
      cursor:pointer;
      will-change:transform;
    }
    .sr931-card:nth-child(2){transform:translate(-8px,6px) rotate(-1.2deg)}
    .sr931-card:nth-child(3){transform:translate(-14px,11px) rotate(-2deg)}
    .sr931-card:nth-child(4){transform:translate(-20px,16px) rotate(-2.8deg)}
    .sr931-card:nth-child(n+5){transform:translate(-24px,20px) rotate(-3.2deg)}
    .sr931-face{
      position:absolute;
      inset:0;
      width:100%;
      height:100%;
      object-fit:cover;
      border-radius:18px;
      backface-visibility:hidden;
      -webkit-backface-visibility:hidden;
      box-shadow:0 18px 42px rgba(0,0,0,.35);
      border:2px solid rgba(255,255,255,.92);
      background:#fff;
      user-select:none;
      -webkit-user-drag:none;
    }
    .sr931-front{transform:rotateY(180deg)}
    .sr931-card.is-flipped{transform:rotateY(180deg)!important}
    .sr931-card.is-done{
      opacity:0;
      pointer-events:none;
      transform:translateX(120%) rotate(8deg) scale(.92)!important;
    }
    .sr931-card.rarity-uncommon.is-flipped{filter:drop-shadow(0 0 14px rgba(89,185,236,.7))}
    .sr931-card.rarity-rare.is-flipped{filter:drop-shadow(0 0 18px rgba(236,149,71,.78))}
    .sr931-card.rarity-epic.is-flipped{filter:drop-shadow(0 0 22px rgba(239,114,189,.92))}
    .sr931-card.rarity-legendary.is-flipped{
      filter:drop-shadow(0 0 16px #fff6aa) drop-shadow(0 0 32px #f6c92f);
      animation:sr931LegendaryGlow 1.8s ease-in-out infinite alternate;
    }
    .sr931-legendary-ring{
      position:absolute;
      inset:-22%;
      border-radius:50%;
      opacity:0;
      pointer-events:none;
      background:conic-gradient(from 0deg,transparent,rgba(246,201,47,.75),transparent,rgba(255,255,255,.9),transparent,rgba(255,130,200,.5),transparent);
      filter:blur(12px);
    }
    .sr931-card.rarity-legendary.is-flipped .sr931-legendary-ring{
      animation:sr931LegendaryRing 1.15s ease-out;
    }
    .sr931-copy{
      min-height:96px;
      display:grid;
      align-content:center;
      gap:5px;
    }
    .sr931-copy h2,.sr931-copy p{margin:0}
    .sr931-copy h2{font-size:1.45rem}
    .sr931-hint{font-size:.9rem;opacity:.86}
    .sr931-progress{display:flex;justify-content:center;gap:8px}
    .sr931-progress span{
      width:10px;height:10px;border-radius:50%;
      background:var(--dot,#cbd2df);
      border:1px solid rgba(255,255,255,.72);
      opacity:.45;
    }
    .sr931-progress span.is-current{opacity:1;transform:scale(1.24);box-shadow:0 0 12px var(--dot,#fff)}
    .sr931-progress span.is-complete{opacity:.82}
    .sr931-button{
      min-width:180px;
      min-height:44px;
      padding:10px 20px;
      border:0;
      border-radius:999px;
      background:linear-gradient(135deg,#ff82c8,#b68df5,#6bc6f8);
      color:#fff;
      font-weight:950;
      cursor:pointer;
      box-shadow:0 10px 24px rgba(45,55,105,.24);
    }
    .sr931-button[hidden]{display:none!important}
    @keyframes sr931PackFloat{
      0%,100%{transform:translateY(0) rotate(-1deg)}
      50%{transform:translateY(-10px) rotate(1deg)}
    }
    @keyframes sr931PackOpen{
      0%{transform:scale(1) rotate(0)}
      28%{transform:scale(1.08) rotate(-4deg)}
      58%{transform:scale(.92) rotate(5deg)}
      100%{transform:scale(.15) translateY(-120px);opacity:0}
    }
    @keyframes sr931Burst{
      0%{opacity:0;transform:scale(.5)}
      24%{opacity:1}
      100%{opacity:0;transform:scale(1.25)}
    }
    @keyframes sr931Aura{
      to{transform:scale(1.06)}
    }
    @keyframes sr931LegendaryGlow{
      from{filter:drop-shadow(0 0 12px #fff6aa) drop-shadow(0 0 24px #f6c92f)}
      to{filter:drop-shadow(0 0 22px #fff9cf) drop-shadow(0 0 48px #f6c92f)}
    }
    @keyframes sr931LegendaryRing{
      0%{opacity:0;transform:scale(.65) rotate(0)}
      28%{opacity:1}
      100%{opacity:0;transform:scale(1.25) rotate(110deg)}
    }
    @media(max-width:600px){
      .sr931-root{min-height:calc(100vh - 24px)}
      .sr931-pack-stage{height:min(320px,40vh)}
      .sr931-deck{width:min(78vw,286px)}
    }
    @media(prefers-reduced-motion:reduce){
      .sr931-pack,.sr931-aura,.sr931-card.rarity-legendary.is-flipped{animation-duration:.01ms!important}
    }
  `;
  doc.head.appendChild(style);
}

export function revealRewardSequence(cards = [], options = {}) {
  const rewards = cards.filter(Boolean);
  if (!rewards.length) return Promise.resolve();

  const { win, doc } = getHost();
  installStyles(doc);

  const packImage = options.packImageUrl || options.pack_image_url || '';
  const cardBack = options.cardBackUrl || DEFAULT_BACK;

  preload(cardBack);
  rewards.forEach(card => preload(frontUrl(card)));
  if (packImage) preload(packImage);

  return new Promise(resolve => {
    const priorBodyOverflow = doc.body.style.overflow;
    const priorHtmlOverflow = doc.documentElement.style.overflow;
    let index = 0;
    let opened = false;
    let flipped = false;
    let busy = false;

    const overlay = doc.createElement('div');
    overlay.className = 'sr931-overlay';
    overlay.innerHTML = `
      <div class="sr931-aura"></div>
      <div class="sr931-root" role="dialog" aria-modal="true" aria-label="Booster pack reveal">
        <div class="sr931-pack-stage">
          <div class="sr931-pack-burst"></div>
          <img class="sr931-pack" alt="Booster pack">
        </div>
        <div class="sr931-deck"></div>
        <div class="sr931-copy">
          <h2>${packImage ? 'Your Booster Pack' : 'Your Cards Are Ready'}</h2>
          <p>${packImage ? 'Click the pack to open it' : 'Click the top card to reveal it'}</p>
          <div class="sr931-hint"></div>
        </div>
        <div class="sr931-progress"></div>
        <button class="sr931-button" type="button">${packImage ? 'Open Pack' : 'Reveal Card'}</button>
      </div>`;

    doc.body.appendChild(overlay);
    doc.body.style.overflow = 'hidden';
    doc.documentElement.style.overflow = 'hidden';
    win.requestAnimationFrame(() => overlay.classList.add('is-open'));

    const root = overlay.querySelector('.sr931-root');
    const packStage = overlay.querySelector('.sr931-pack-stage');
    const pack = overlay.querySelector('.sr931-pack');
    const deck = overlay.querySelector('.sr931-deck');
    const title = overlay.querySelector('.sr931-copy h2');
    const detail = overlay.querySelector('.sr931-copy p');
    const hint = overlay.querySelector('.sr931-hint');
    const button = overlay.querySelector('.sr931-button');
    const progress = overlay.querySelector('.sr931-progress');

    pack.src = packImage || cardBack;
    pack.alt = packImage ? 'Booster pack' : 'Card back';

    progress.innerHTML = rewards.map(card =>
      `<span style="--dot:${rarityColor(card.rarity)}"></span>`
    ).join('');

    deck.innerHTML = rewards.map((card, cardIndex) => {
      const rarity = rarityKey(card.rarity);
      return `
        <div class="sr931-card rarity-${rarity}" data-index="${cardIndex}">
          <span class="sr931-legendary-ring"></span>
          <img class="sr931-face sr931-back" src="${cardBack}" alt="Card back">
          <img class="sr931-face sr931-front" src="${frontUrl(card)}" alt="${String(card.name || 'Reward card').replace(/"/g,'&quot;')}">
        </div>`;
    }).join('');

    const cardElements = [...deck.querySelectorAll('.sr931-card')];
    const currentCard = () => cardElements[index];

    const updateProgress = () => {
      [...progress.children].forEach((dot, dotIndex) => {
        dot.classList.toggle('is-current', dotIndex === index);
        dot.classList.toggle('is-complete', dotIndex < index);
      });
    };

    const showCurrentPrompt = () => {
      const card = rewards[index];
      title.textContent = 'Mystery Card';
      detail.textContent = `Card ${index + 1} of ${rewards.length}`;
      hint.textContent = 'Click the card to flip it';
      button.textContent = 'Reveal Card';
      button.hidden = false;
      updateProgress();
      flipped = false;
    };

    const openPack = async () => {
      if (busy || opened) return;
      busy = true;
      pack.classList.add('is-opening');
      packStage.classList.add('is-bursting');
      await wait(720);
      packStage.style.display = 'none';
      deck.classList.add('is-visible');
      opened = true;
      showCurrentPrompt();
      busy = false;
    };

    const flipCurrent = async () => {
      if (busy || flipped || !opened) return;
      busy = true;
      const card = rewards[index];
      const element = currentCard();
      playFlipSound(doc, rarityKey(card.rarity) === 'legendary' ? .42 : .28);
      element.classList.add('is-flipped');
      await wait(760);

      title.textContent = card.name || 'Mystery Card';
      const identity = [card.rarity || 'Common', categoryOf(card), subcategoryOf(card)].filter(Boolean).join(' · ');
      detail.textContent = `${identity || 'Starlight Card'}${card.isDuplicate ? ' · Duplicate' : ' · New Card'}`;
      hint.textContent = index === rewards.length - 1 ? 'Pack complete!' : 'Click Next Card to continue';
      button.textContent = index === rewards.length - 1 ? 'Finish Pack' : 'Next Card';
      button.hidden = false;
      flipped = true;
      busy = false;
    };

    const advance = async () => {
      if (busy) return;
      if (!opened) return openPack();
      if (!flipped) return flipCurrent();

      if (index >= rewards.length - 1) {
        overlay.classList.remove('is-open');
        await wait(220);
        overlay.remove();
        doc.body.style.overflow = priorBodyOverflow;
        doc.documentElement.style.overflow = priorHtmlOverflow;
        resolve();
        return;
      }

      const element = currentCard();
      element.classList.add('is-done');
      await wait(300);
      index += 1;
      showCurrentPrompt();
    };

    packStage.addEventListener('click', openPack);
    deck.addEventListener('click', event => {
      if (event.target.closest('.sr931-card') === currentCard()) flipCurrent();
    });
    button.addEventListener('click', advance);

    if (!packImage) {
      opened = true;
      packStage.style.display = 'none';
      deck.classList.add('is-visible');
      showCurrentPrompt();
    } else {
      hint.textContent = 'The cards are waiting inside';
    }
  });
}

export const revealCard = card => revealRewardSequence([card], { title: 'Card Reward' });
