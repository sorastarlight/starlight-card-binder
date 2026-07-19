const DEFAULT_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';
const ALLOWED_RARITIES = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);

const prettyMeta = value => String(value || '')
  .trim()
  .replace(/[_-]+/g, ' ')
  .replace(/\b\w/g, character => character.toUpperCase());

const categoryOf = card => prettyMeta(
  card?.categoryName || card?.category_name || card?.categoryId || card?.category_id || ''
);

const subcategoryOf = card => prettyMeta(
  card?.subcategoryName || card?.subcategory_name || card?.subcategoryId || card?.subcategory_id || ''
);

function rarityKey(value) {
  const key = String(value || 'common').trim().toLowerCase();
  return ALLOWED_RARITIES.has(key) ? key : 'common';
}

function frontUrl(card) {
  return card?.imageUrl
    || card?.image_url
    || card?.thumbnailUrl
    || card?.thumbnail_url
    || DEFAULT_BACK;
}

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

function getHost() {
  try {
    if (window.top && window.top !== window && window.top.location.origin === window.location.origin) {
      return { win: window.top, doc: window.top.document };
    }
  } catch (_) {
    // Cross-origin parents cannot host the dialog, so use the current document.
  }
  return { win: window, doc: document };
}

const REVEAL_STYLESHEET_URL = new URL('../css/reward-reveal.css?v=1.0.1', import.meta.url).href;
const stylesheetLoads = new WeakMap();

function installStyles(doc) {
  if (stylesheetLoads.has(doc)) return stylesheetLoads.get(doc);

  const existing = doc.getElementById('starlight-reveal-v101');
  if (existing?.sheet) return Promise.resolve();

  const link = existing || doc.createElement('link');
  const load = new Promise(resolve => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  if (!existing) {
    link.id = 'starlight-reveal-v101';
    link.rel = 'stylesheet';
    link.href = REVEAL_STYLESHEET_URL;
    doc.head.append(link);
  }
  stylesheetLoads.set(doc, load);
  return load;
}

function createElement(doc, tagName, className, text = '') {
  const element = doc.createElement(tagName);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function createImage(doc, source, alt, fallback = DEFAULT_BACK) {
  const image = createElement(doc, 'img', 'st-reveal-image');
  image.alt = alt;
  image.loading = 'eager';
  image.decoding = 'async';
  image.src = source || fallback;
  image.addEventListener('error', () => {
    if (fallback && image.getAttribute('src') !== fallback) image.src = fallback;
  });
  return image;
}

function cardDescription(card) {
  return [prettyMeta(card.rarity), card.categoryName, card.subcategoryName]
    .filter(Boolean)
    .join(' · ');
}

export async function revealRewardSequence(cards = [], options = {}) {
  const rewards = cards.filter(Boolean).map(normalizeRevealCard);
  if (!rewards.length) return Promise.resolve();

  const { win, doc } = getHost();
  const normalizedOptions = normalizeRevealOptions(options);
  const revealTitle = normalizedOptions.title || 'Your Cards Are Ready';
  await installStyles(doc);

  return new Promise(resolve => {
    let index = 0;
    let settled = false;
    let controller = null;
    let fallbackCleanup = null;

    const overlay = createElement(doc, 'div', 'st-reveal-overlay');
    const dialog = createElement(doc, 'section', 'st-reveal-dialog');
    const header = createElement(doc, 'header', 'st-reveal-header');
    const headingGroup = createElement(doc, 'div', 'st-reveal-heading');
    const eyebrow = createElement(doc, 'p', 'st-reveal-eyebrow', 'Starlight Rewards');
    const title = createElement(doc, 'h2', 'st-reveal-title', revealTitle);
    const closeButton = createElement(doc, 'button', 'st-reveal-close', 'Close');
    const intro = createElement(doc, 'div', 'st-reveal-intro');
    const cardView = createElement(doc, 'div', 'st-reveal-card-view');
    const imageFrame = createElement(doc, 'div', 'st-reveal-image-frame');
    const cardImage = createImage(doc, DEFAULT_BACK, 'Reward card');
    const count = createElement(doc, 'p', 'st-reveal-count');
    const cardName = createElement(doc, 'h3', 'st-reveal-card-name');
    const metadata = createElement(doc, 'p', 'st-reveal-metadata');
    const badges = createElement(doc, 'div', 'st-reveal-badges');
    const progress = createElement(doc, 'div', 'st-reveal-progress');
    const actions = createElement(doc, 'div', 'st-reveal-actions');
    const previousButton = createElement(doc, 'button', 'st-reveal-button st-reveal-button-secondary', 'Previous');
    const nextButton = createElement(doc, 'button', 'st-reveal-button st-reveal-button-primary', 'Next Card');

    title.id = `st-reveal-title-${win.crypto?.randomUUID?.() || Date.now().toString(36)}`;
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close card viewer');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.tabIndex = -1;
    cardView.hidden = true;
    cardView.setAttribute('aria-live', 'polite');
    imageFrame.append(cardImage);
    actions.append(previousButton, nextButton);
    cardView.append(imageFrame, count, cardName, metadata, badges, progress, actions);
    headingGroup.append(eyebrow, title);
    header.append(headingGroup, closeButton);
    dialog.append(header, intro, cardView);
    overlay.append(dialog);
    doc.body.append(overlay);

    const progressItems = rewards.map((card, cardIndex) => {
      const item = createElement(doc, 'span', `st-reveal-progress-item rarity-${card.rarity}`);
      item.textContent = String(cardIndex + 1);
      item.setAttribute('aria-label', `Card ${cardIndex + 1}`);
      progress.append(item);
      return item;
    });

    const finish = () => {
      if (settled) return;
      settled = true;
      fallbackCleanup?.();
      overlay.remove();
      resolve();
    };

    const close = reason => {
      if (controller) controller.close(undefined, reason);
      else finish();
    };

    const showCard = (nextIndex, { focus = true } = {}) => {
      index = Math.max(0, Math.min(nextIndex, rewards.length - 1));
      const card = rewards[index];
      intro.hidden = true;
      cardView.hidden = false;
      imageFrame.className = `st-reveal-image-frame rarity-${card.rarity}`;
      cardImage.src = card.imageUrl || DEFAULT_BACK;
      cardImage.alt = `${card.name} card artwork`;
      count.textContent = `Card ${index + 1} of ${rewards.length}`;
      cardName.textContent = card.name;
      metadata.textContent = cardDescription(card) || 'Starlight Card';
      badges.replaceChildren(
        createElement(doc, 'span', `st-reveal-badge rarity-${card.rarity}`, prettyMeta(card.rarity)),
        createElement(
          doc,
          'span',
          `st-reveal-badge ${card.isDuplicate ? 'is-duplicate' : 'is-new'}`,
          card.isDuplicate ? 'Duplicate' : 'New Card'
        )
      );
      progressItems.forEach((item, itemIndex) => {
        item.classList.toggle('is-current', itemIndex === index);
        item.classList.toggle('is-complete', itemIndex < index);
        item.setAttribute('aria-current', itemIndex === index ? 'step' : 'false');
      });
      previousButton.hidden = index === 0;
      nextButton.textContent = index === rewards.length - 1 ? 'Done' : 'Next Card';
      if (focus) nextButton.focus();
    };

    if (normalizedOptions.packImageUrl) {
      const packImage = createImage(doc, normalizedOptions.packImageUrl, `${revealTitle} pack`, normalizedOptions.cardBackUrl);
      packImage.classList.add('st-reveal-pack-image');
      const introCopy = createElement(
        doc,
        'p',
        'st-reveal-intro-copy',
        `${rewards.length} ${rewards.length === 1 ? 'card is' : 'cards are'} ready to view.`
      );
      const showButton = createElement(doc, 'button', 'st-reveal-button st-reveal-button-primary', 'Show Cards');
      showButton.type = 'button';
      showButton.addEventListener('click', () => showCard(0));
      intro.append(packImage, introCopy, showButton);
    } else {
      showCard(0, { focus: false });
    }

    previousButton.type = 'button';
    nextButton.type = 'button';
    previousButton.addEventListener('click', () => showCard(index - 1));
    nextButton.addEventListener('click', () => {
      if (index >= rewards.length - 1) close('complete');
      else showCard(index + 1);
    });
    closeButton.addEventListener('click', () => close('button'));
    dialog.addEventListener('keydown', event => {
      if (cardView.hidden || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft' && index > 0) {
        event.preventDefault();
        showCard(index - 1);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (index >= rewards.length - 1) close('complete');
        else showCard(index + 1);
      }
    });

    const modalApi = win.StarlightUI || window.StarlightUI;
    controller = modalApi?.adoptModal?.(overlay, {
      dialog,
      labelledBy: title.id,
      closeOnBackdrop: false,
      initialFocus: normalizedOptions.packImageUrl ? '.st-reveal-intro .st-reveal-button' : nextButton,
      onClose: finish
    }) || null;

    if (controller) {
      controller.open();
    } else {
      const previousOverflow = doc.body.style.overflow;
      const previousFocus = doc.activeElement;
      const onKeydown = event => {
        if (event.key === 'Escape') close('escape');
      };
      doc.body.style.overflow = 'hidden';
      doc.addEventListener('keydown', onKeydown);
      fallbackCleanup = () => {
        doc.removeEventListener('keydown', onKeydown);
        doc.body.style.overflow = previousOverflow;
        previousFocus?.focus?.();
      };
      const initialButton = normalizedOptions.packImageUrl
        ? intro.querySelector('.st-reveal-button')
        : nextButton;
      initialButton?.focus();
    }
  });
}
