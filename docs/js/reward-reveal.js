const DEFAULT_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';
const SFX_KEY = 'sora-starlight-card-binder-v7-sfx';
const FLIP_SOUND = 'site_assets/sfx/card-flip.wav';

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const frontUrl = card => card?.imageUrl || card?.image_url || card?.thumbnailUrl || card?.thumbnail_url || DEFAULT_BACK;
const rarityName = card => String(card?.rarity || 'Common').trim().toLowerCase();

function soundEnabled() {
  return localStorage.getItem(SFX_KEY) !== 'off';
}

function playFlipSound() {
  if (!soundEnabled()) return;
  try {
    const audio = new Audio(new URL(FLIP_SOUND, document.baseURI).href);
    audio.volume = 0.3;
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
    window.setTimeout(() => finish(false), 4000);
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

function installStyles(doc) {
  if (doc.getElementById('starlight-basic-reveal-v846')) return;
  const style = doc.createElement('style');
  style.id = 'starlight-basic-reveal-v846';
  style.textContent = `
    .sr846-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(18,23,46,.76);opacity:0;transition:opacity .18s ease;overflow:auto}
    .sr846-overlay.is-open{opacity:1}
    .sr846-stage{width:min(94vw,520px);padding:20px 20px 22px;border:1px solid rgba(255,255,255,.42);border-radius:24px;background:linear-gradient(160deg,#344278,#5a4179);box-shadow:0 24px 65px rgba(0,0,0,.38);color:#fff;text-align:center}
    .sr846-progress{display:flex;justify-content:center;gap:8px;margin:0 0 10px}
    .sr846-progress span{width:10px;height:10px;border-radius:50%;background:var(--dot,#cbd2df);border:1px solid rgba(255,255,255,.72);box-shadow:0 2px 7px rgba(0,0,0,.24);opacity:.55}
    .sr846-progress span.is-current{opacity:1;transform:scale(1.22);box-shadow:0 0 0 3px rgba(255,255,255,.2),0 0 11px var(--dot,#fff)}
    .sr846-progress span.is-complete{opacity:.9}
    .sr846-kicker{margin:0;font-size:.76rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
    .sr846-card{display:block;width:min(68vw,285px);aspect-ratio:5/7;margin:14px auto 12px;padding:0;border:0;border-radius:17px;background:transparent;cursor:pointer;perspective:1100px}
    .sr846-card-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .68s cubic-bezier(.22,.7,.2,1);will-change:transform}
    .sr846-card.is-revealed .sr846-card-inner{transform:rotateY(180deg)}
    .sr846-face{position:absolute;inset:0;display:block;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:17px;overflow:hidden;background:#fff;box-shadow:0 16px 36px rgba(0,0,0,.34)}
    .sr846-face.front{transform:rotateY(180deg)}
    .sr846-face img{width:100%;height:100%;display:block;object-fit:cover;border-radius:17px;border:2px solid rgba(255,255,255,.92);user-select:none;-webkit-user-drag:none}
    .sr846-copy{min-height:96px}
    .sr846-copy h2,.sr846-copy p{margin:6px 0}
    .sr846-copy h2{font-size:1.45rem}
    .sr846-copy p{opacity:.88}
    .sr846-hint{font-size:.9rem;opacity:.82;margin-top:7px}
    .sr846-next{min-width:180px;padding:11px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);color:#fff;font-weight:900;cursor:pointer;opacity:0;pointer-events:none;transition:opacity .16s ease}
    .sr846-stage.is-revealed .sr846-next{opacity:1;pointer-events:auto}
    @media(prefers-reduced-motion:reduce){.sr846-overlay,.sr846-card-inner,.sr846-next{transition-duration:.01ms!important}}
  `;
  doc.head.appendChild(style);
}

function rarityColor(value) {
  switch (String(value || '').toLowerCase()) {
    case 'legendary': return '#fed334';
    case 'epic': return '#ff82c8';
    case 'rare': return '#f5a35b';
    case 'uncommon': return '#6bc6f8';
    default: return '#c4cad6';
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

    const overlay = doc.createElement('div');
    overlay.className = 'sr846-overlay';
    overlay.innerHTML = `
      <section class="sr846-stage" role="dialog" aria-modal="true" aria-label="Card reveal">
        <div class="sr846-progress"></div>
        <p class="sr846-kicker"></p>
        <button class="sr846-card" type="button" aria-label="Reveal card">
          <span class="sr846-card-inner">
            <span class="sr846-face back"><img alt="Card back"></span>
            <span class="sr846-face front"><img alt="Reward card"></span>
          </span>
        </button>
        <div class="sr846-copy">
          <h2></h2>
          <p></p>
          <div class="sr846-hint">Click the card to reveal it</div>
        </div>
        <button class="sr846-next" type="button">Next Card</button>
      </section>`;

    doc.body.appendChild(overlay);
    doc.body.style.overflow = 'hidden';
    win.requestAnimationFrame(() => overlay.classList.add('is-open'));

    const stage = overlay.querySelector('.sr846-stage');
    const cardButton = overlay.querySelector('.sr846-card');
    const backImage = overlay.querySelector('.sr846-face.back img');
    const frontImage = overlay.querySelector('.sr846-face.front img');
    const title = overlay.querySelector('h2');
    const detail = overlay.querySelector('.sr846-copy p');
    const hint = overlay.querySelector('.sr846-hint');
    const nextButton = overlay.querySelector('.sr846-next');
    const kicker = overlay.querySelector('.sr846-kicker');
    const progress = overlay.querySelector('.sr846-progress');

    progress.innerHTML = rewards.map(card => `<span style="--dot:${rarityColor(card.rarity)}" title="${String(card.rarity || 'Common').replace(/["<>]/g,'')}"></span>`).join('');

    const prepare = async () => {
      busy = true;
      revealed = false;
      const card = rewards[index];
      await Promise.all([preload(cardBack), preload(frontUrl(card))]);
      stage.classList.remove('is-revealed');
      cardButton.classList.remove('is-revealed');
      backImage.src = cardBack;
      frontImage.src = frontUrl(card);
      backImage.alt = 'Card back';
      frontImage.alt = card.name || 'Reward card';
      title.textContent = 'Mystery Card';
      detail.textContent = 'Ready to reveal';
      hint.textContent = 'Click the card to reveal it';
      kicker.textContent = `${options.title || 'Booster Pack'} · Card ${index + 1} of ${rewards.length}`;
      nextButton.textContent = index === rewards.length - 1 ? 'View Pack Summary' : 'Next Card';
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
      playFlipSound();
      cardButton.classList.add('is-revealed');
      await wait(700);
      title.textContent = card.name || 'Mystery Card';
      detail.textContent = `${card.rarity || 'Common'} · ${card.seriesName || 'Starlight Cards'}${card.isDuplicate ? ' · Duplicate' : ' · New Card'}`;
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
      busy = true;
      index += 1;
      await prepare();
    };

    cardButton.addEventListener('click', advance);
    nextButton.addEventListener('click', advance);
    prepare();
  });
}

export const revealCard = card => revealRewardSequence([card], { title: 'Card Reward' });
