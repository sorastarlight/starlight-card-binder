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

function playFlipSound(doc) {
  if (!soundEnabled()) return;
  try {
    const audio = new Audio(new URL(FLIP_SOUND, doc.baseURI).href);
    audio.volume = 0.26;
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

function rarityColor(value) {
  switch (String(value || '').toLowerCase()) {
    case 'legendary': return '#f6c92f';
    case 'epic': return '#ef72bd';
    case 'rare': return '#ec9547';
    case 'uncommon': return '#59b9ec';
    default: return '#aab3c2';
  }
}

function installStyles(doc) {
  if (doc.getElementById('starlight-basic-reveal-v847')) return;
  const style = doc.createElement('style');
  style.id = 'starlight-basic-reveal-v847';
  style.textContent = `
    .sr847-overlay{
      position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;
      z-index:2147483640!important;display:grid!important;place-items:center!important;
      padding:clamp(14px,3vw,30px)!important;box-sizing:border-box!important;overflow:auto!important;
      background:
        radial-gradient(circle at 18% 24%,rgba(107,198,248,.50),transparent 34%),
        radial-gradient(circle at 82% 26%,rgba(255,130,200,.46),transparent 35%),
        radial-gradient(circle at 50% 88%,rgba(199,135,239,.42),transparent 42%),
        linear-gradient(135deg,rgba(25,39,96,.90),rgba(93,68,151,.84) 52%,rgba(180,79,151,.80))!important;
      backdrop-filter:blur(18px) saturate(1.25)!important;
      opacity:0;transition:opacity .18s ease;
    }
    .sr847-overlay:before,.sr847-overlay:after{
      content:"";position:absolute;inset:-15%;pointer-events:none;
    }
    .sr847-overlay:before{
      background:
        radial-gradient(circle,rgba(255,255,255,.78) 0 1px,transparent 2px) 0 0/48px 48px,
        radial-gradient(circle,rgba(255,218,243,.62) 0 1.5px,transparent 2.5px) 17px 23px/75px 75px;
      opacity:.33;animation:sr847AuraDrift 12s linear infinite;
    }
    .sr847-overlay:after{
      background:conic-gradient(from 0deg at 50% 50%,transparent,rgba(107,198,248,.24),transparent,rgba(255,130,200,.28),transparent);
      filter:blur(28px);opacity:.34;animation:sr847AuraSpin 20s linear infinite;
    }
    .sr847-overlay.is-open{opacity:1}
    .sr847-stage{
      position:relative!important;inset:auto!important;z-index:2!important;
      display:block!important;margin:auto!important;transform:none!important;
      width:min(94vw,500px)!important;padding:18px 18px 22px!important;
      border:1px solid rgba(255,255,255,.48)!important;border-radius:24px!important;
      background:radial-gradient(circle at 50% 38%,rgba(255,255,255,.14),rgba(46,52,111,.68) 58%,rgba(72,49,108,.74))!important;
      box-shadow:0 22px 58px rgba(0,0,0,.34),0 0 80px rgba(255,130,200,.16)!important;
      color:#fff!important;text-align:center!important;
    }
    .sr847-progress{display:flex;justify-content:center;gap:8px;margin:0 0 10px}
    .sr847-progress span{width:10px;height:10px;border-radius:50%;background:var(--dot,#cbd2df);border:1px solid rgba(255,255,255,.78);box-shadow:0 2px 7px rgba(0,0,0,.22);opacity:.52}
    .sr847-progress span.is-current{opacity:1;transform:scale(1.24);box-shadow:0 0 0 3px rgba(255,255,255,.19),0 0 11px var(--dot,#fff)}
    .sr847-progress span.is-complete{opacity:.88}
    .sr847-kicker{margin:0;font-size:.75rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase}
    .sr847-card{display:block;width:min(68vw,285px);aspect-ratio:5/7;margin:14px auto 12px;padding:0;border:0;border-radius:17px;background:transparent;cursor:pointer;perspective:1000px}
    .sr847-card-shell{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .62s cubic-bezier(.22,.68,.2,1);will-change:transform}
    .sr847-card.is-turning .sr847-card-shell{transform:rotateY(90deg)}
    .sr847-card.is-returning .sr847-card-shell{transform:rotateY(0deg)}
    .sr847-card img{width:100%;height:100%;display:block;object-fit:cover;border-radius:17px;border:2px solid rgba(255,255,255,.92);box-shadow:0 15px 34px rgba(0,0,0,.32);background:#fff;user-select:none;-webkit-user-drag:none}
    .sr847-copy{min-height:94px}
    .sr847-copy h2,.sr847-copy p{margin:6px 0}
    .sr847-copy h2{font-size:1.42rem}
    .sr847-copy p{opacity:.88}
    .sr847-hint{font-size:.9rem;opacity:.82;margin-top:7px}
    .sr847-next{min-width:180px;padding:11px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);color:#fff;font-weight:900;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .16s ease}
    .sr847-stage.is-revealed .sr847-next{opacity:1;pointer-events:auto}
    @keyframes sr847AuraDrift{to{transform:translate3d(48px,24px,0)}}
    @keyframes sr847AuraSpin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.sr847-overlay,.sr847-card-shell,.sr847-next{transition-duration:.01ms!important}}
  `;
  doc.head.appendChild(style);
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

    const overlay = doc.createElement('div');
    overlay.className = 'sr847-overlay';
    overlay.innerHTML = `
      <section class="sr847-stage" role="dialog" aria-modal="true" aria-label="Card reveal">
        <div class="sr847-progress"></div>
        <p class="sr847-kicker"></p>
        <button class="sr847-card" type="button" aria-label="Reveal card">
          <span class="sr847-card-shell"><img alt="Card back"></span>
        </button>
        <div class="sr847-copy">
          <h2></h2>
          <p></p>
          <div class="sr847-hint">Click the card to reveal it</div>
        </div>
        <button class="sr847-next" type="button">Next Card</button>
      </section>`;

    doc.body.appendChild(overlay);
    doc.body.style.overflow = 'hidden';
    win.requestAnimationFrame(() => overlay.classList.add('is-open'));

    const stage = overlay.querySelector('.sr847-stage');
    const cardButton = overlay.querySelector('.sr847-card');
    const shell = overlay.querySelector('.sr847-card-shell');
    const image = overlay.querySelector('.sr847-card img');
    const title = overlay.querySelector('h2');
    const detail = overlay.querySelector('.sr847-copy p');
    const hint = overlay.querySelector('.sr847-hint');
    const nextButton = overlay.querySelector('.sr847-next');
    const kicker = overlay.querySelector('.sr847-kicker');
    const progress = overlay.querySelector('.sr847-progress');

    progress.innerHTML = rewards.map(card => `<span style="--dot:${rarityColor(card.rarity)}" title="${String(card.rarity || 'Common').replace(/["<>]/g,'')}"></span>`).join('');

    const resetCard = async src => {
      shell.style.transition = 'none';
      shell.style.transform = 'rotateY(0deg)';
      image.src = src;
      await wait(30);
      shell.style.transition = '';
      shell.style.transform = '';
    };

    const prepare = async () => {
      busy = true;
      revealed = false;
      const card = rewards[index];
      await Promise.all([preload(cardBack), preload(frontUrl(card))]);
      stage.classList.remove('is-revealed');
      cardButton.classList.remove('is-turning','is-returning');
      await resetCard(cardBack);
      image.alt = 'Card back';
      title.textContent = 'Mystery Card';
      detail.textContent = 'Ready to reveal';
      hint.textContent = 'Click the card to reveal it';
      kicker.textContent = `${options.title || 'Booster Pack'} · Card ${index + 1} of ${rewards.length}`;
      nextButton.textContent = index === rewards.length - 1 ? 'View Pack Summary' : 'Next Card';
      [...progress.children].forEach((dot, dotIndex) => {
        dot.classList.toggle('is-current', dotIndex === index);
        dot.classList.toggle('is-complete', dotIndex < index);
      });
      await wait(60);
      busy = false;
    };

    const reveal = async () => {
      if (busy || revealed) return;
      busy = true;
      const card = rewards[index];
      playFlipSound(doc);
      cardButton.classList.add('is-turning');
      await wait(310);
      image.src = frontUrl(card);
      image.alt = card.name || 'Reward card';
      cardButton.classList.remove('is-turning');
      cardButton.classList.add('is-returning');
      await wait(340);
      cardButton.classList.remove('is-returning');
      title.textContent = card.name || 'Mystery Card';
      const identity = [card.rarity || 'Common', categoryOf(card), subcategoryOf(card)].filter(Boolean).join(' · ');
      detail.textContent = `${identity || 'Starlight Card'}${card.isDuplicate ? ' · Duplicate' : ' · New Card'}`;
      hint.textContent = index === rewards.length - 1 ? 'Click the card to view your pack summary' : 'Click the card or Next Card to continue';
      stage.classList.add('is-revealed');
      revealed = true;
      busy = false;
    };

    const finish = async () => {
      overlay.classList.remove('is-open');
      await wait(190);
      overlay.remove();
      doc.body.style.overflow = priorOverflow;
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
