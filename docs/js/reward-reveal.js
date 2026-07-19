const DEFAULT_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';
const SFX_KEY = 'sora-starlight-card-binder-v7-sfx';
const FLIP_SOUND = 'site_assets/sfx/card-flip.wav';

const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
const frontUrl = card => card?.imageUrl || card?.image_url || card?.thumbnailUrl || card?.thumbnail_url || DEFAULT_BACK;
const prettyMeta = value => String(value || '').trim().replace(/[_-]+/g,' ').replace(/\b\w/g,m=>m.toUpperCase());
const categoryOf = card => prettyMeta(card?.categoryName || card?.category_name || card?.categoryId || card?.category_id || '');
const subcategoryOf = card => prettyMeta(card?.subcategoryName || card?.subcategory_name || card?.subcategoryId || card?.subcategory_id || '');

export function normalizeRevealCard(card = {}) {
  return {
    ...card,
    id: card.id ?? card.cardId ?? card.card_id ?? '',
    name: card.name ?? card.cardName ?? card.card_name ?? 'Mystery Card',
    rarity: rarityKey(card.rarity ?? card.rarityName ?? card.rarity_name),
    imageUrl: frontUrl(card),
    categoryName: categoryOf(card),
    subcategoryName: subcategoryOf(card),
    isDuplicate: Boolean(card.isDuplicate ?? card.is_duplicate ?? card.duplicate)
  };
}

export function normalizeRevealOptions(options = {}) {
  return {
    title: options.title || options.boosterName || options.booster_name || '',
    packImageUrl: options.packImageUrl || options.pack_image_url || '',
    cardBackUrl: options.cardBackUrl || options.card_back_url || DEFAULT_BACK
  };
}

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

const REVEAL_STYLESHEET_URL = new URL('../css/reward-reveal.css?v=1.0.0', import.meta.url).href;
const stylesheetLoads = new WeakMap();

function installStyles(doc) {
  if (stylesheetLoads.has(doc)) return stylesheetLoads.get(doc);

  const load = new Promise(resolve => {
    const existing = doc.getElementById('starlight-reveal-v100');
    if (existing?.sheet) return resolve();

    const link = existing || doc.createElement('link');
    link.id = 'starlight-reveal-v100';
    link.rel = 'stylesheet';
    link.href = REVEAL_STYLESHEET_URL;
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
    if (!existing) doc.head.appendChild(link);
    window.setTimeout(resolve, 1500);
  });
  stylesheetLoads.set(doc, load);
  return load;
}

export async function revealRewardSequence(cards = [], options = {}) {
  const rewards = cards.filter(Boolean).map(normalizeRevealCard);
  if (!rewards.length) return Promise.resolve();

  const { win, doc } = getHost();
  await installStyles(doc);

  const normalizedOptions = normalizeRevealOptions(options);
  const packImage = normalizedOptions.packImageUrl;
  const cardBack = normalizedOptions.cardBackUrl;
  const revealTitle = normalizedOptions.title || (packImage ? 'Your Booster Pack' : 'Your Cards Are Ready');

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
    let settled = false;
    let modal = null;

    const overlay = doc.createElement('div');
    overlay.className = 'sr931-overlay';
    overlay.innerHTML = `
      <div class="sr931-aura"></div>
      <div class="sr931-impact"></div>
      <div class="sr931-root" role="dialog" aria-modal="true" aria-label="Booster pack reveal" tabindex="-1">
        <div class="sr931-pack-stage">
          <div class="sr931-pack-burst"></div>
          <img class="sr931-pack" alt="Booster pack">
        </div>
        <div class="sr931-deck"></div>
        <div class="sr931-copy">
          <h2>${revealTitle}</h2>
          <p>${packImage ? 'Click the pack to open it' : 'Click the top card to reveal it'}</p>
          <div class="sr931-hint"></div>
        </div>
        <div class="sr931-progress"></div>
        <button class="sr931-button" type="button">${packImage ? 'Open Pack' : 'Reveal Card'}</button>
      </div>`;

    doc.body.appendChild(overlay);

    const root = overlay.querySelector('.sr931-root');
    const packStage = overlay.querySelector('.sr931-pack-stage');
    const pack = overlay.querySelector('.sr931-pack');
    const deck = overlay.querySelector('.sr931-deck');
    const title = overlay.querySelector('.sr931-copy h2');
    const detail = overlay.querySelector('.sr931-copy p');
    const hint = overlay.querySelector('.sr931-hint');
    const button = overlay.querySelector('.sr931-button');
    const progress = overlay.querySelector('.sr931-progress');

    const finish = () => {
      if (settled) return;
      settled = true;
      overlay.remove();
      if (!modal) {
        doc.body.style.overflow = priorBodyOverflow;
        doc.documentElement.style.overflow = priorHtmlOverflow;
      }
      resolve();
    };

    const modalApi = win.StarlightUI || window.StarlightUI;
    modal = modalApi?.adoptModal?.(overlay, {
      dialog: root,
      label: 'Booster pack reveal',
      closeOnBackdrop: false,
      onClose: finish
    }) || null;
    if (modal) {
      modal.open();
    } else {
      doc.body.style.overflow = 'hidden';
      doc.documentElement.style.overflow = 'hidden';
    }
    win.requestAnimationFrame(() => overlay.classList.add('is-open'));

    pack.src = packImage || cardBack;
    pack.alt = packImage ? 'Booster pack' : 'Card back';

    progress.innerHTML = rewards.map(card =>
      `<span style="--dot:${rarityColor(card.rarity)}"></span>`
    ).join('');

    deck.innerHTML = rewards.map((card, cardIndex) => {
      const rarity = rarityKey(card.rarity);
      return `
        <div class="sr931-card rarity-${rarity}" data-index="${cardIndex}" style="--stack:${rewards.length - cardIndex}">
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
      cardElements.forEach((element, cardIndex) => {
        element.classList.toggle('is-current', cardIndex === index);
      });
      [...overlay.classList].filter(name => name.startsWith('rarity-')).forEach(name => overlay.classList.remove(name));
      overlay.classList.add(`rarity-${rarityKey(card.rarity)}`);
      title.textContent = 'Mystery Card';
      detail.textContent = `Card ${index + 1} of ${rewards.length}`;
      hint.textContent = 'Click the card to flip it';
      button.textContent = 'Reveal Card';
      button.hidden = false;
      updateProgress();
      flipped = false;
    };

    const openPack = async () => {
      if (settled || busy || opened) return;
      busy = true;
      pack.classList.add('is-opening');
      packStage.classList.add('is-bursting');
      await wait(1080);
      packStage.style.display = 'none';
      deck.classList.add('is-visible');
      opened = true;
      showCurrentPrompt();
      busy = false;
    };

    const flipCurrent = async () => {
      if (settled || busy || flipped || !opened) return;
      busy = true;
      const card = rewards[index];
      const element = currentCard();
      const rarity = rarityKey(card.rarity);
      button.hidden = true;
      await preload(frontUrl(card));
      playFlipSound(doc, rarity === 'legendary' ? .46 : rarity === 'epic' ? .36 : .28);
      overlay.classList.remove('is-revealing');
      void overlay.offsetWidth;
      overlay.classList.add('is-revealing');
      element.classList.add('is-flipped');
      await wait(rarity === 'legendary' ? 1250 : rarity === 'epic' ? 900 : rarity === 'rare' ? 760 : 720);

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
      if (settled || busy) return;
      if (!opened) return openPack();
      if (!flipped) return flipCurrent();

      if (index >= rewards.length - 1) {
        overlay.classList.remove('is-open');
        await wait(220);
        if (modal) modal.close(undefined, 'complete');
        else finish();
        return;
      }

      const element = currentCard();
      element.classList.remove('is-current');
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
