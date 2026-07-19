const DEFAULT_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';
const ALLOWED_RARITIES = new Set(['common', 'uncommon', 'rare', 'epic', 'legendary']);
const MAX_VISUAL_STACK_DEPTH = 8;

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

export function createRevealStackLayout(cardCount) {
  const count = Math.max(0, Math.floor(Number(cardCount) || 0));
  return Array.from({ length: count }, (_, index) => {
    const depth = Math.min(index, MAX_VISUAL_STACK_DEPTH - 1);
    return {
      depth,
      x: depth === 0 ? 0 : depth * -3,
      y: depth * 4,
      rotation: depth === 0 ? 0 : (depth % 2 ? -.45 : .45),
      zIndex: count - index
    };
  });
}

export function summarizeRevealCards(cards = []) {
  const normalized = cards.filter(Boolean).map(normalizeRevealCard);
  const duplicates = normalized.filter(card => card.isDuplicate).length;
  return {
    total: normalized.length,
    newCards: normalized.length - duplicates,
    duplicates
  };
}

function getHost() {
  try {
    if (window.top && window.top !== window && window.top.location.origin === window.location.origin) {
      return { win: window.top, doc: window.top.document };
    }
  } catch (_) {
    // Cross-origin parents cannot host the reveal, so use the current document.
  }
  return { win: window, doc: document };
}

const REVEAL_STYLESHEET_URL = new URL('../css/reward-reveal.css?v=1.1.0', import.meta.url).href;
const stylesheetLoads = new WeakMap();

function installStyles(doc) {
  if (stylesheetLoads.has(doc)) return stylesheetLoads.get(doc);

  const existing = doc.getElementById('starlight-reveal-v110');
  if (existing?.sheet) return Promise.resolve();

  const link = existing || doc.createElement('link');
  const load = new Promise(resolve => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  if (!existing) {
    link.id = 'starlight-reveal-v110';
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

function createImage(doc, source, alt, fallback = DEFAULT_BACK, className = 'st-reveal-image') {
  const image = createElement(doc, 'img', className);
  image.alt = alt;
  image.loading = 'eager';
  image.decoding = 'async';
  image.src = source || fallback;
  image.addEventListener('error', () => {
    if (!fallback || image.dataset.fallbackApplied === 'true') return;
    image.dataset.fallbackApplied = 'true';
    image.src = fallback;
  });
  return image;
}

function nextPaint(win) {
  return new Promise(resolve => {
    win.requestAnimationFrame(() => win.requestAnimationFrame(resolve));
  });
}

async function waitForMotion(element, win) {
  if (win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  await nextPaint(win);
  const animations = element.getAnimations?.({ subtree: true }) || [];
  const finiteAnimations = animations.filter(animation => animation.effect?.getTiming?.().iterations !== Infinity);
  await Promise.allSettled(finiteAnimations.map(animation => animation.finished));
}

async function prepareImage(image) {
  if (image.complete) {
    await image.decode?.().catch(() => {});
    return;
  }
  await new Promise(resolve => {
    image.addEventListener('load', resolve, { once: true });
    image.addEventListener('error', resolve, { once: true });
  });
  await image.decode?.().catch(() => {});
}

function cardDescription(card) {
  return [prettyMeta(card.rarity), card.categoryName, card.subcategoryName]
    .filter(Boolean)
    .join(' · ');
}

function createEffectLayer(doc) {
  const layer = createElement(doc, 'div', 'st-reveal-flash');
  layer.setAttribute('aria-hidden', 'true');
  const ring = createElement(doc, 'span', 'st-reveal-flash-ring');
  const ribbons = createElement(doc, 'span', 'st-reveal-ribbons');
  for (let index = 0; index < 8; index += 1) {
    const ribbon = createElement(doc, 'i', 'st-reveal-ribbon');
    ribbon.style.setProperty('--ribbon-index', String(index));
    ribbons.append(ribbon);
  }
  const sparkles = createElement(doc, 'span', 'st-reveal-sparkles');
  for (let index = 0; index < 12; index += 1) {
    const sparkle = createElement(doc, 'i', 'st-reveal-sparkle');
    sparkle.style.setProperty('--sparkle-index', String(index));
    sparkles.append(sparkle);
  }
  layer.append(ring, ribbons, sparkles);
  return layer;
}

export async function revealRewardSequence(cards = [], options = {}) {
  const rewards = cards.filter(Boolean).map(normalizeRevealCard);
  if (!rewards.length) return;

  const { win, doc } = getHost();
  const normalizedOptions = normalizeRevealOptions(options);
  const revealTitle = normalizedOptions.title || 'Your Booster Pack';
  const packArtwork = normalizedOptions.packImageUrl || normalizedOptions.cardBackUrl;
  const summary = summarizeRevealCards(rewards);
  await installStyles(doc);

  return new Promise(resolve => {
    let index = 0;
    let phase = 'pack';
    let settled = false;
    let controller = null;
    let fallbackCleanup = null;

    const overlay = createElement(doc, 'div', 'st-reveal-overlay');
    const backdrop = createImage(doc, packArtwork, '', normalizedOptions.cardBackUrl, 'st-reveal-backdrop-image');
    const dialog = createElement(doc, 'section', 'st-reveal-dialog');
    const header = createElement(doc, 'header', 'st-reveal-header');
    const headingGroup = createElement(doc, 'div', 'st-reveal-heading');
    const eyebrow = createElement(doc, 'p', 'st-reveal-eyebrow', 'Starlight Booster');
    const title = createElement(doc, 'h2', 'st-reveal-title', revealTitle);
    const closeButton = createElement(doc, 'button', 'st-reveal-close', '×');
    const liveStatus = createElement(doc, 'p', 'st-reveal-live', `${rewards.length} cards ready.`);
    const stage = createElement(doc, 'div', 'st-reveal-stage');
    const packStage = createElement(doc, 'section', 'st-reveal-pack-stage');
    const packBurst = createElement(doc, 'div', 'st-reveal-pack-burst');
    const packRing = createElement(doc, 'span', 'st-reveal-pack-ring');
    const packButton = createElement(doc, 'button', 'st-reveal-pack-button');
    const packImage = createImage(doc, packArtwork, `${revealTitle} pack`, normalizedOptions.cardBackUrl, 'st-reveal-pack-image');
    const packPrompt = createElement(doc, 'p', 'st-reveal-pack-prompt', 'Click the pack to open it');
    const packCount = createElement(
      doc,
      'span',
      'st-reveal-pack-count',
      `${rewards.length} ${rewards.length === 1 ? 'card' : 'cards'}`
    );
    const stackStage = createElement(doc, 'section', 'st-reveal-stack-stage');
    const stackShell = createElement(doc, 'div', 'st-reveal-stack-shell');
    const stack = createElement(doc, 'div', 'st-reveal-stack');
    const effectLayer = createEffectLayer(doc);
    const revealCopy = createElement(doc, 'div', 'st-reveal-copy');
    const cardCount = createElement(doc, 'p', 'st-reveal-count');
    const cardName = createElement(doc, 'h3', 'st-reveal-card-name', 'Mystery Card');
    const metadata = createElement(doc, 'p', 'st-reveal-metadata', 'Choose the top card');
    const badges = createElement(doc, 'div', 'st-reveal-badges');
    const progress = createElement(doc, 'div', 'st-reveal-progress');
    const stackActions = createElement(doc, 'div', 'st-reveal-actions');
    const revealButton = createElement(doc, 'button', 'st-reveal-button st-reveal-button-primary', 'Reveal Top Card');
    const nextButton = createElement(doc, 'button', 'st-reveal-button st-reveal-button-primary', 'Next Card');
    const resultsStage = createElement(doc, 'section', 'st-reveal-results');
    const resultsHeading = createElement(doc, 'div', 'st-reveal-results-heading');
    const resultsTitle = createElement(doc, 'h3', '', 'Your Cards');
    const resultsSummary = createElement(
      doc,
      'p',
      '',
      `${summary.total} total · ${summary.newCards} new · ${summary.duplicates} duplicate${summary.duplicates === 1 ? '' : 's'}`
    );
    const resultsGrid = createElement(doc, 'div', 'st-reveal-results-grid');
    const doneButton = createElement(doc, 'button', 'st-reveal-button st-reveal-button-primary', 'Done');

    title.id = `st-reveal-title-${win.crypto?.randomUUID?.() || Date.now().toString(36)}`;
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close booster reveal');
    liveStatus.setAttribute('role', 'status');
    liveStatus.setAttribute('aria-live', 'polite');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', title.id);
    dialog.dataset.phase = phase;
    dialog.tabIndex = -1;
    packStage.setAttribute('aria-label', 'Booster pack opening');
    packButton.type = 'button';
    packButton.setAttribute('aria-label', `Open ${revealTitle}`);
    packBurst.setAttribute('aria-hidden', 'true');
    packBurst.append(packRing);
    packButton.append(packImage, packCount);
    packStage.append(packBurst, packButton, packPrompt);
    stackStage.hidden = true;
    stackStage.setAttribute('aria-label', 'Card reveal stack');
    stackShell.append(stack, effectLayer);
    revealButton.type = 'button';
    nextButton.type = 'button';
    nextButton.hidden = true;
    stackActions.append(revealButton, nextButton);
    revealCopy.append(cardCount, cardName, metadata, badges, progress, stackActions);
    stackStage.append(stackShell, revealCopy);
    resultsStage.hidden = true;
    resultsStage.setAttribute('aria-label', 'Booster results');
    resultsHeading.append(resultsTitle, resultsSummary);
    doneButton.type = 'button';
    resultsStage.append(resultsHeading, resultsGrid, doneButton);
    stage.append(packStage, stackStage, resultsStage);
    headingGroup.append(eyebrow, title);
    header.append(headingGroup, closeButton);
    dialog.append(header, liveStatus, stage);
    overlay.append(backdrop, dialog);
    doc.body.append(overlay);

    const stackCards = rewards.map((card, cardIndex) => {
      const button = createElement(doc, 'button', `st-reveal-stack-card rarity-${card.rarity}`);
      const inner = createElement(doc, 'span', 'st-reveal-card-inner');
      const back = createElement(doc, 'span', 'st-reveal-card-face st-reveal-card-back');
      const front = createElement(doc, 'span', 'st-reveal-card-face st-reveal-card-front');
      const backImage = createImage(doc, normalizedOptions.cardBackUrl, '', DEFAULT_BACK, 'st-reveal-card-image');
      const frontImage = createImage(doc, card.imageUrl, '', DEFAULT_BACK, 'st-reveal-card-image');
      button.type = 'button';
      button.disabled = cardIndex !== 0;
      button.tabIndex = cardIndex === 0 ? 0 : -1;
      button.dataset.cardIndex = String(cardIndex);
      button.setAttribute('aria-label', `Reveal card ${cardIndex + 1} of ${rewards.length}`);
      backImage.alt = '';
      frontImage.alt = '';
      back.append(backImage);
      front.append(frontImage);
      inner.append(back, front);
      button.append(inner);
      stack.append(button);
      return { button, inner, frontImage, card };
    });

    const progressItems = rewards.map((card, cardIndex) => {
      const item = createElement(doc, 'span', `st-reveal-progress-item rarity-${card.rarity}`);
      item.textContent = String(cardIndex + 1);
      item.setAttribute('aria-label', `Card ${cardIndex + 1}`);
      progress.append(item);
      return item;
    });

    rewards.forEach((card, cardIndex) => {
      const item = createElement(doc, 'article', `st-reveal-result-card rarity-${card.rarity}`);
      item.style.setProperty('--result-index', String(Math.min(cardIndex, 12)));
      const image = createImage(doc, card.imageUrl, `${card.name} card artwork`, DEFAULT_BACK, 'st-reveal-result-image');
      const copy = createElement(doc, 'div', 'st-reveal-result-copy');
      const name = createElement(doc, 'h4', '', card.name);
      const detail = createElement(doc, 'p', '', cardDescription(card) || 'Starlight Card');
      const status = createElement(
        doc,
        'span',
        `st-reveal-result-status ${card.isDuplicate ? 'is-duplicate' : 'is-new'}`,
        card.isDuplicate ? 'Duplicate' : 'New'
      );
      copy.append(name, detail, status);
      item.append(image, copy);
      resultsGrid.append(item);
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

    const setPhase = nextPhase => {
      phase = nextPhase;
      dialog.dataset.phase = nextPhase;
    };

    const updateStackLayout = () => {
      const layout = createRevealStackLayout(rewards.length - index);
      stackCards.forEach((entry, cardIndex) => {
        if (cardIndex < index) return;
        const position = layout[cardIndex - index];
        entry.button.style.setProperty('--stack-x', `${position.x}px`);
        entry.button.style.setProperty('--stack-y', `${position.y}px`);
        entry.button.style.setProperty('--stack-rotate', `${position.rotation}deg`);
        entry.button.style.setProperty('--stack-z', String(position.zIndex));
        entry.button.style.setProperty('--deal-delay', `${Math.min(cardIndex - index, 8) * 38}ms`);
      });
    };

    const updateProgress = () => {
      progressItems.forEach((item, itemIndex) => {
        item.classList.toggle('is-current', itemIndex === index);
        item.classList.toggle('is-complete', itemIndex < index);
        item.setAttribute('aria-current', itemIndex === index ? 'step' : 'false');
      });
    };

    const setCurrentCard = () => {
      const current = stackCards[index];
      effectLayer.className = 'st-reveal-flash';
      stackCards.forEach((entry, cardIndex) => {
        const isCurrent = cardIndex === index;
        entry.button.disabled = !isCurrent;
        entry.button.tabIndex = isCurrent ? 0 : -1;
        entry.button.classList.toggle('is-current', isCurrent);
      });
      current.button.setAttribute('aria-label', `Reveal card ${index + 1} of ${rewards.length}`);
      cardCount.textContent = `Card ${index + 1} of ${rewards.length}`;
      cardName.textContent = 'Mystery Card';
      metadata.textContent = 'Click the top card to reveal it';
      badges.replaceChildren();
      revealButton.hidden = false;
      revealButton.disabled = false;
      nextButton.hidden = true;
      updateStackLayout();
      updateProgress();
      liveStatus.textContent = `Card ${index + 1} of ${rewards.length} is ready to reveal.`;
    };

    const showResults = async () => {
      if (phase !== 'revealed') return;
      setPhase('results');
      stackStage.hidden = true;
      resultsStage.hidden = false;
      resultsStage.classList.add('is-visible');
      liveStatus.textContent = `Reveal complete. ${resultsSummary.textContent}`;
      await waitForMotion(resultsStage, win);
      doneButton.focus({ preventScroll: true });
      overlay.scrollTop = 0;
      stage.scrollTop = 0;
    };

    const advance = async () => {
      if (phase !== 'revealed') return;
      if (index >= rewards.length - 1) {
        await showResults();
        return;
      }

      setPhase('advancing');
      const current = stackCards[index];
      nextButton.disabled = true;
      current.button.classList.add('is-dismissing');
      await waitForMotion(current.button, win);
      current.button.hidden = true;
      index += 1;
      setPhase('stack');
      setCurrentCard();
      stackCards[index].button.focus();
    };

    const revealCurrent = async () => {
      if (phase !== 'stack') return;
      setPhase('lifting');
      const current = stackCards[index];
      revealButton.disabled = true;
      current.button.disabled = true;
      liveStatus.textContent = `Revealing card ${index + 1} of ${rewards.length}.`;
      await prepareImage(current.frontImage);
      current.button.classList.add('is-lifting');
      await waitForMotion(current.button, win);
      current.button.classList.remove('is-lifting');
      current.button.classList.add('is-lifted');
      effectLayer.className = `st-reveal-flash rarity-${current.card.rarity} is-active`;
      current.inner.classList.add('is-flipping');
      await waitForMotion(current.inner, win);
      current.inner.classList.remove('is-flipping');
      current.button.classList.add('is-revealed');
      current.button.setAttribute('aria-label', `${current.card.name}, ${prettyMeta(current.card.rarity)}`);
      cardName.textContent = current.card.name;
      metadata.textContent = cardDescription(current.card) || 'Starlight Card';
      badges.replaceChildren(
        createElement(doc, 'span', `st-reveal-badge rarity-${current.card.rarity}`, prettyMeta(current.card.rarity)),
        createElement(
          doc,
          'span',
          `st-reveal-badge ${current.card.isDuplicate ? 'is-duplicate' : 'is-new'}`,
          current.card.isDuplicate ? 'Duplicate' : 'New Card'
        )
      );
      revealButton.hidden = true;
      nextButton.hidden = false;
      nextButton.disabled = false;
      nextButton.textContent = index === rewards.length - 1 ? 'View Results' : 'Next Card';
      liveStatus.textContent = `${current.card.name}, ${prettyMeta(current.card.rarity)}. ${current.card.isDuplicate ? 'Duplicate card.' : 'New card.'}`;
      setPhase('revealed');
      nextButton.focus();
    };

    const openPack = async () => {
      if (phase !== 'pack') return;
      setPhase('opening');
      packButton.disabled = true;
      liveStatus.textContent = `Opening ${revealTitle}.`;
      packStage.classList.add('is-opening');
      await waitForMotion(packStage, win);
      packStage.hidden = true;
      stackStage.hidden = false;
      stackStage.classList.add('is-entering');
      setPhase('dealing');
      setCurrentCard();
      await waitForMotion(stackStage, win);
      stackStage.classList.remove('is-entering');
      setPhase('stack');
      stackCards[0].button.focus();
    };

    updateStackLayout();
    packButton.addEventListener('click', openPack);
    stackCards.forEach((entry, cardIndex) => {
      entry.button.addEventListener('click', () => {
        if (cardIndex === index) revealCurrent();
      });
    });
    revealButton.addEventListener('click', revealCurrent);
    nextButton.addEventListener('click', advance);
    doneButton.addEventListener('click', () => close('complete'));
    closeButton.addEventListener('click', () => close('button'));

    dialog.addEventListener('keydown', event => {
      if (event.altKey || event.ctrlKey || event.metaKey || phase === 'opening' || phase === 'lifting' || phase === 'advancing') return;
      if ((event.key === 'Enter' || event.key === ' ') && phase === 'stack' && doc.activeElement === stackCards[index].button) {
        event.preventDefault();
        revealCurrent();
      }
      if (event.key === 'ArrowRight' && phase === 'revealed') {
        event.preventDefault();
        advance();
      }
    });

    const modalApi = win.StarlightUI || window.StarlightUI;
    controller = modalApi?.adoptModal?.(overlay, {
      dialog,
      labelledBy: title.id,
      closeOnBackdrop: false,
      initialFocus: packButton,
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
      packButton.focus();
    }
  });
}
