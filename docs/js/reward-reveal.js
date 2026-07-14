const DEFAULT_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';
const SFX_KEY = 'sora-starlight-card-binder-v7-sfx';
const SFX = {
  flip: 'site_assets/sfx/card-flip.wav',
  reveal: 'site_assets/sfx/starlight-reveal.wav',
  sparkle: 'site_assets/sfx/sparkle-chime.wav',
  charge: 'site_assets/sfx/cosmic-charge.wav',
  legendary: 'site_assets/sfx/legendary-reveal.wav',
  analyze: 'site_assets/sfx/card_analyze.wav'
};

const wait = (ms) => new Promise(resolve => window.setTimeout(resolve, ms));
const frontUrl = card => card?.imageUrl || card?.image_url || card?.thumbnailUrl || card?.thumbnail_url || DEFAULT_BACK;
const rarity = card => String(card?.rarity || 'Common').toLowerCase();
const tier = card => ['legendary', 'epic', 'rare'].includes(rarity(card)) ? rarity(card) : 'common';

function soundEnabled() {
  return localStorage.getItem(SFX_KEY) !== 'off';
}

function playSound(name, volume = 0.34) {
  if (!soundEnabled() || !SFX[name]) return;
  try {
    const audio = new Audio(new URL(SFX[name], document.baseURI).href);
    audio.volume = volume;
    audio.play().catch(() => {});
  } catch (_) {}
}

function loadImage(src) {
  return new Promise(resolve => {
    const image = new Image();
    let finished = false;
    const finish = ok => {
      if (finished) return;
      finished = true;
      resolve(ok);
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = src;
    image.decode?.().then(() => finish(true)).catch(() => {});
    window.setTimeout(() => finish(false), 5000);
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
  if (doc.getElementById('starlight-reveal-clean-v845')) return;
  const style = doc.createElement('style');
  style.id = 'starlight-reveal-clean-v845';
  style.textContent = `
    .sr845-overlay{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:18px;background:rgba(18,23,46,.72);opacity:0;transition:opacity .22s ease;overflow:auto}
    .sr845-overlay.is-open{opacity:1}
    .sr845-stage{--accent:#9fe8ff;position:relative;width:min(92vw,560px);padding:22px 22px 24px;border:1px solid rgba(255,255,255,.4);border-radius:26px;background:linear-gradient(155deg,#313a73 0%,#5d3e7a 100%);box-shadow:0 24px 64px rgba(0,0,0,.34);color:#fff;text-align:center;overflow:hidden;isolation:isolate}
    .sr845-stage[data-tier="rare"]{--accent:#65d8ff}
    .sr845-stage[data-tier="epic"]{--accent:#ff85e2}
    .sr845-stage[data-tier="legendary"]{--accent:#ffe26a}
    .sr845-backdrop{position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(circle at 50% 44%,color-mix(in srgb,var(--accent) 18%,transparent),transparent 56%);opacity:.9}
    .sr845-burst{position:absolute;left:50%;top:45%;width:260px;height:260px;translate:-50% -50%;border:2px solid color-mix(in srgb,var(--accent) 72%,white);border-radius:50%;opacity:0;pointer-events:none;z-index:-1}
    .sr845-stage.is-bursting .sr845-burst{animation:sr845Burst .65s ease-out both}
    .sr845-stage[data-tier="epic"].is-bursting .sr845-burst{box-shadow:0 0 24px rgba(255,133,226,.36)}
    .sr845-stage[data-tier="legendary"].is-bursting .sr845-burst{box-shadow:0 0 30px rgba(255,226,106,.42),0 0 52px rgba(255,120,210,.2)}
    .sr845-progress{display:flex;justify-content:center;gap:7px;margin-bottom:8px}
    .sr845-progress span{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.24)}
    .sr845-progress span.is-current{background:var(--accent);box-shadow:0 0 8px var(--accent)}
    .sr845-kicker{margin:0;font-size:.74rem;font-weight:900;letter-spacing:.14em;text-transform:uppercase}
    .sr845-card{position:relative;width:min(66vw,290px);aspect-ratio:5/7;margin:14px auto 12px;border-radius:18px;cursor:pointer;transform:translate3d(0,0,0) rotateY(0deg) scale(1);transform-origin:center;will-change:transform;transition:transform .42s cubic-bezier(.2,.72,.2,1),opacity .22s ease}
    .sr845-card.is-entering{animation:sr845Enter .36s ease both}
    .sr845-card.is-building{animation:sr845Build 1.15s ease-in-out both}
    .sr845-stage[data-tier="rare"] .sr845-card.is-building{animation-duration:1.35s}
    .sr845-stage[data-tier="epic"] .sr845-card.is-building{animation-duration:1.55s}
    .sr845-stage[data-tier="legendary"] .sr845-card.is-building{animation-duration:1.85s}
    .sr845-card.is-edge{transform:rotateY(90deg) scale(1.05)}
    .sr845-card.is-reset-edge{transition:none;transform:rotateY(-90deg) scale(1.05)}
    .sr845-card.is-front{transform:rotateY(0deg) scale(1)}
    .sr845-card.is-exiting{opacity:0;transform:translateY(-12px) scale(.96)}
    .sr845-card img{width:100%;height:100%;display:block;object-fit:cover;border-radius:18px;border:2px solid rgba(255,255,255,.9);background:#fff;box-shadow:0 16px 34px rgba(0,0,0,.34);user-select:none;-webkit-user-drag:none}
    .sr845-stage[data-tier="rare"].is-revealed .sr845-card img{box-shadow:0 0 13px rgba(101,216,255,.38),0 16px 34px rgba(0,0,0,.34)}
    .sr845-stage[data-tier="epic"].is-revealed .sr845-card img{box-shadow:0 0 16px rgba(255,133,226,.4),0 16px 34px rgba(0,0,0,.34)}
    .sr845-stage[data-tier="legendary"].is-revealed .sr845-card img{box-shadow:0 0 18px rgba(255,226,106,.42),0 16px 34px rgba(0,0,0,.34)}
    .sr845-copy{min-height:96px}
    .sr845-copy h2,.sr845-copy p{margin:6px 0;opacity:0;transform:translateY(7px);transition:opacity .28s ease,transform .28s ease}
    .sr845-stage.is-revealed .sr845-copy h2,.sr845-stage.is-revealed .sr845-copy p{opacity:1;transform:none}
    .sr845-hint{font-size:.9rem;opacity:.84}
    .sr845-next{min-width:184px;padding:11px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);color:#fff;font-weight:900;opacity:0;pointer-events:none;cursor:pointer;transition:opacity .2s ease}
    .sr845-stage.is-revealed .sr845-next{opacity:1;pointer-events:auto}
    @keyframes sr845Enter{from{opacity:0;transform:translateY(16px) scale(.95)}to{opacity:1;transform:none}}
    @keyframes sr845Build{0%{transform:translate3d(0,0,0) scale(1)}24%{transform:translate3d(-1px,.5px,0) scale(1.015)}48%{transform:translate3d(1px,-.5px,0) scale(1.03)}72%{transform:translate3d(-1.2px,-.6px,0) scale(1.045)}90%{transform:translate3d(1.2px,.6px,0) scale(1.055)}100%{transform:translate3d(0,0,0) scale(1.06)}}
    @keyframes sr845Burst{0%{opacity:.76;transform:scale(.38)}100%{opacity:0;transform:scale(1.35)}}
    @media(prefers-reduced-motion:reduce){.sr845-card,.sr845-overlay,.sr845-copy h2,.sr845-copy p{animation:none!important;transition-duration:.01ms!important}}
  `;
  doc.head.appendChild(style);
}

function revealSoundFor(tierName) {
  if (tierName === 'legendary') playSound('legendary', 0.52);
  else if (tierName === 'epic') playSound('reveal', 0.42);
  else if (tierName === 'rare') playSound('analyze', 0.36);
  else playSound('reveal', 0.28);
}

export function revealRewardSequence(cards = [], options = {}) {
  const rewards = cards.filter(Boolean);
  if (!rewards.length) return Promise.resolve();

  const { win, doc } = getHost();
  installStyles(doc);
  const cardBack = options.cardBackUrl || DEFAULT_BACK;
  loadImage(cardBack);
  rewards.forEach(card => loadImage(frontUrl(card)));

  return new Promise(resolve => {
    let index = 0;
    let revealed = false;
    let busy = false;

    const overlay = doc.createElement('div');
    overlay.className = 'sr845-overlay';
    overlay.innerHTML = `
      <section class="sr845-stage" role="dialog" aria-modal="true">
        <div class="sr845-backdrop"></div>
        <div class="sr845-burst"></div>
        <div class="sr845-progress"></div>
        <p class="sr845-kicker"></p>
        <button class="sr845-card" type="button" aria-label="Reveal card">
          <img alt="Card back">
        </button>
        <div class="sr845-copy">
          <h2></h2>
          <p></p>
          <div class="sr845-hint">Click the card to reveal it</div>
        </div>
        <button class="sr845-next" type="button">Next Card</button>
      </section>`;

    doc.body.appendChild(overlay);
    doc.body.style.overflow = 'hidden';
    win.requestAnimationFrame(() => overlay.classList.add('is-open'));

    const stage = overlay.querySelector('.sr845-stage');
    const cardButton = overlay.querySelector('.sr845-card');
    const image = cardButton.querySelector('img');
    const title = overlay.querySelector('h2');
    const detail = overlay.querySelector('.sr845-copy p');
    const hint = overlay.querySelector('.sr845-hint');
    const nextButton = overlay.querySelector('.sr845-next');
    const kicker = overlay.querySelector('.sr845-kicker');
    const progress = overlay.querySelector('.sr845-progress');
    progress.innerHTML = rewards.map(() => '<span></span>').join('');

    const prepare = async () => {
      busy = true;
      revealed = false;
      const card = rewards[index];
      const currentTier = tier(card);
      stage.dataset.tier = currentTier;
      stage.classList.remove('is-revealed', 'is-bursting');
      cardButton.className = 'sr845-card';
      image.src = cardBack;
      image.alt = 'Card back';
      title.textContent = '';
      detail.textContent = '';
      hint.textContent = 'Click the card to reveal it';
      kicker.textContent = `${options.title || 'Booster Pack'} · Card ${index + 1} of ${rewards.length}`;
      nextButton.textContent = index === rewards.length - 1 ? 'View Pack Summary' : 'Next Card';
      [...progress.children].forEach((dot, dotIndex) => dot.classList.toggle('is-current', dotIndex === index));
      void cardButton.offsetWidth;
      cardButton.classList.add('is-entering');
      await wait(380);
      cardButton.classList.remove('is-entering');
      busy = false;
    };

    const reveal = async () => {
      if (busy || revealed) return;
      busy = true;
      const card = rewards[index];
      const currentTier = tier(card);
      const front = frontUrl(card);
      await loadImage(front);

      cardButton.classList.add('is-building');
      playSound(currentTier === 'common' ? 'sparkle' : 'charge', currentTier === 'legendary' ? 0.42 : 0.3);
      const buildTime = currentTier === 'legendary' ? 1850 : currentTier === 'epic' ? 1550 : currentTier === 'rare' ? 1350 : 1150;
      await wait(buildTime);
      cardButton.classList.remove('is-building');

      cardButton.classList.add('is-edge');
      playSound('flip', 0.32);
      await wait(430);

      image.src = front;
      image.alt = card.name || 'Reward card';
      cardButton.classList.remove('is-edge');
      cardButton.classList.add('is-reset-edge');
      void cardButton.offsetWidth;
      cardButton.classList.remove('is-reset-edge');
      cardButton.classList.add('is-front');
      await wait(460);

      stage.classList.add('is-bursting', 'is-revealed');
      revealSoundFor(currentTier);
      title.textContent = card.name || 'Mystery Card';
      detail.textContent = `${card.rarity || 'Common'} · ${card.seriesName || 'Starlight Cards'}${card.isDuplicate ? ' · Duplicate' : ' · New Card'}`;
      hint.textContent = index === rewards.length - 1 ? 'Your pack is complete' : 'Click the card or Next Card to continue';
      revealed = true;
      busy = false;
    };

    const advance = async () => {
      if (busy) return;
      if (!revealed) {
        await reveal();
        return;
      }
      if (index === rewards.length - 1) {
        overlay.classList.remove('is-open');
        await wait(230);
        overlay.remove();
        doc.body.style.overflow = '';
        resolve();
        return;
      }
      busy = true;
      cardButton.classList.add('is-exiting');
      await wait(240);
      index += 1;
      await prepare();
    };

    cardButton.addEventListener('click', () => revealed ? advance() : reveal());
    nextButton.addEventListener('click', advance);
    prepare();
  });
}

export const revealCard = card => revealRewardSequence([card], { title: 'Card Reward' });
