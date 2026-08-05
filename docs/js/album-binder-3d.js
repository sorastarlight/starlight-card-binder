/**
 * Interactive 3D album binder — two-page spreads, page turns, themed pockets.
 */
(function initStarlightAlbumBinder3D(global) {
  const ORGANIZE_KEY = 'sora-starlight-binder-organize-v1';
  const TURN_MS = 520;
  let animating = false;

  function motionReduced() {
    return Boolean(
      global.StarlightBrowser?.reducedMotion
      || global.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    );
  }

  function readOrganize() {
    try {
      return String(global.localStorage?.getItem(ORGANIZE_KEY) || 'numberAsc').trim() || 'numberAsc';
    } catch {
      return 'numberAsc';
    }
  }

  function writeOrganize(value) {
    try {
      if (value) global.localStorage?.setItem(ORGANIZE_KEY, value);
    } catch {
      // ignore
    }
  }

  function rarityRank(card = {}) {
    const map = { Legendary: 5, Epic: 4, Rare: 3, Uncommon: 2, Common: 1 };
    return map[String(card.rarity || 'Common').trim()] || 0;
  }

  function sortOwnedCards(list, organizeBy = 'numberAsc', helpers = {}) {
    const source = Array.isArray(list) ? list.slice() : [];
    const isFavorite = helpers.isFavorite || (() => false);
    const num = card => String(card?.collectorNumber || card?.number || '').padStart(8, '0');

    switch (organizeBy) {
      case 'numberDesc':
        source.sort((a, b) => num(b).localeCompare(num(a)));
        break;
      case 'series':
        source.sort((a, b) => String(a.series || '').localeCompare(String(b.series || '')) || num(a).localeCompare(num(b)));
        break;
      case 'rarityDesc':
        source.sort((a, b) => rarityRank(b) - rarityRank(a) || num(a).localeCompare(num(b)));
        break;
      case 'favorites':
        source.sort((a, b) => Number(isFavorite(b.id)) - Number(isFavorite(a.id)) || num(a).localeCompare(num(b)));
        break;
      case 'nameAsc':
        source.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        break;
      default:
        source.sort((a, b) => num(a).localeCompare(num(b)));
    }
    return source;
  }

  function renderPockets(cards, ctx, side) {
    const tile = global.StarlightCardTile;
    return cards.map((card, index) => {
      if (tile?.renderBinderPocket) return tile.renderBinderPocket(ctx, card, index, { side });
      if (!card) {
        return `<div class="album-binder-3d-pocket is-empty" data-pocket-side="${side}" data-pocket-slot="${index}"><span class="album-binder-3d-pocket-star" aria-hidden="true">✦</span><span class="visually-hidden">Empty pocket</span></div>`;
      }
      return `<div class="album-binder-3d-pocket is-filled" data-pocket-side="${side}" data-pocket-slot="${index}"><button type="button" class="album-binder-3d-card" data-album-card="${ctx.esc(card.id)}">${ctx.displayName(card)}</button></div>`;
    }).join('');
  }

  function renderPage(cards, ctx, side, pageNum) {
    return `<div class="album-binder-3d-page album-binder-3d-page--${side}" data-binder-page="${pageNum}">
      <div class="album-binder-3d-page-inner">
        <div class="album-binder-3d-rings" aria-hidden="true"></div>
        <div class="album-binder-3d-pocket-grid">${renderPockets(cards, ctx, side)}</div>
        <button type="button" class="album-binder-3d-corner album-binder-3d-corner--${side === 'left' ? 'left' : 'right'}" data-turn-corner="${side === 'left' ? 'prev' : 'next'}" aria-label="${side === 'left' ? 'Turn to previous page' : 'Turn to next page'}"></button>
      </div>
    </div>`;
  }

  function renderSceneHtml({ spreadData, ctx, themeId, pagerHtml = '' }) {
    const { left, right, leftPageNum, rightPageNum } = spreadData;
    return `<div class="album-binder-3d-scene" data-binder-theme="${themeId || 'starlight-classic'}">
      <div class="album-binder-3d-atmosphere" aria-hidden="true"><span class="album-binder-3d-starfield"></span></div>
      <div class="album-binder-3d-stage" style="--binder-tilt-x:0; --binder-tilt-y:0;">
        <div class="album-binder-3d-shell">
          <div class="album-binder-3d-cover album-binder-3d-cover--back" aria-hidden="true"></div>
          <div class="album-binder-3d-book">
            <div class="album-binder-3d-spine" aria-hidden="true"></div>
            <div class="album-binder-3d-spread is-ready" data-spread-state="idle">
              ${renderPage(left, ctx, 'left', leftPageNum)}
              ${renderPage(right, ctx, 'right', rightPageNum)}
            </div>
            <div class="album-binder-3d-flip-sheet" hidden aria-hidden="true">
              <div class="album-binder-3d-flip-front"></div>
              <div class="album-binder-3d-flip-back"></div>
            </div>
          </div>
          <div class="album-binder-3d-cover album-binder-3d-cover--front" aria-hidden="true"></div>
        </div>
      </div>
      ${pagerHtml}
    </div>`;
  }

  function bindDragCorners(root, { onTurn, canTurn } = {}) {
    const reduced = motionReduced();
    if (!root || reduced) return;
    const spread = root.querySelector('.album-binder-3d-spread');
    if (!spread) return;

    root.querySelectorAll('[data-turn-corner]').forEach(corner => {
      if (corner.dataset.dragCornerReady === '1') return;
      corner.dataset.dragCornerReady = '1';
      const direction = corner.dataset.turnCorner;
      const page = corner.closest('.album-binder-3d-page');
      let dragging = false;
      let startX = 0;
      let startY = 0;

      const setProgress = value => {
        const clamped = Math.max(0, Math.min(1, value));
        spread.style.setProperty('--page-drag-progress', String(clamped));
        page?.style.setProperty('--page-drag-progress', String(clamped));
      };

      const resetDrag = () => {
        dragging = false;
        corner.classList.remove('is-dragging');
        spread.classList.remove('is-dragging-page');
        page?.classList.remove('is-page-dragging');
        spread.style.removeProperty('--page-drag-progress');
        page?.style.removeProperty('--page-drag-progress');
      };

      corner.addEventListener('pointerdown', event => {
        if (animating || event.button !== 0) return;
        if (canTurn && !canTurn(direction)) return;
        dragging = true;
        startX = event.clientX;
        startY = event.clientY;
        corner.classList.add('is-dragging');
        spread.classList.add('is-dragging-page');
        page?.classList.add('is-page-dragging');
        corner.setPointerCapture(event.pointerId);
        event.preventDefault();
      });

      corner.addEventListener('pointermove', event => {
        if (!dragging) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        const distance = direction === 'next'
          ? Math.max(0, (-dx - dy * 0.35) / 130)
          : Math.max(0, (dx - dy * 0.35) / 130);
        setProgress(distance);
      });

      const finishDrag = (event, commit) => {
        if (!dragging) return;
        const progress = Number.parseFloat(spread.style.getPropertyValue('--page-drag-progress') || '0');
        const moved = Math.hypot(event.clientX - startX, event.clientY - startY);
        try {
          corner.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }
        resetDrag();
        if (!commit || animating) return;
        if (progress >= 0.42 || moved < 8) onTurn?.(direction);
      };

      corner.addEventListener('pointerup', event => finishDrag(event, true));
      corner.addEventListener('pointercancel', event => finishDrag(event, false));
    });
  }

  function bindScene(root, { onTurn, onTilt, playSfx, canTurn } = {}) {
    if (!root || root.dataset.binder3dBound === '1') return;
    root.dataset.binder3dBound = '1';
    const stage = root.querySelector('.album-binder-3d-stage');
    const reduced = motionReduced();

    root.querySelectorAll('[data-album-spread]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (animating || btn.disabled) return;
        onTurn?.(btn.dataset.albumSpread);
      });
    });

    bindDragCorners(root, { onTurn, canTurn });

    if (stage && !reduced && global.matchMedia?.('(pointer: fine)').matches) {
      stage.addEventListener('pointermove', event => {
        const rect = stage.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        stage.style.setProperty('--binder-tilt-x', `${(-y * 3).toFixed(2)}deg`);
        stage.style.setProperty('--binder-tilt-y', `${(x * 4).toFixed(2)}deg`);
        onTilt?.({ x, y });
      });
      stage.addEventListener('pointerleave', () => {
        stage.style.setProperty('--binder-tilt-x', '0deg');
        stage.style.setProperty('--binder-tilt-y', '0deg');
      });
    }
  }

  function animateTurn(root, direction, callback) {
    const spread = root?.querySelector('.album-binder-3d-spread');
    if (!spread || animating) return callback?.();
    animating = true;
    root.classList.add('is-turning');
    const reduced = motionReduced();
    spread.classList.remove('is-ready');
    spread.classList.add(direction === 'prev' ? 'is-turning-back' : 'is-turning-forward');
    if (!reduced) {
      const sheet = root.querySelector('.album-binder-3d-flip-sheet');
      sheet?.removeAttribute('hidden');
      sheet?.classList.add('is-active');
    }
    global.setTimeout(() => {
      spread.classList.remove('is-turning-forward', 'is-turning-back');
      root.classList.remove('is-turning');
      const sheet = root.querySelector('.album-binder-3d-flip-sheet');
      sheet?.setAttribute('hidden', '');
      sheet?.classList.remove('is-active');
      animating = false;
      callback?.();
    }, reduced ? 160 : TURN_MS);
  }

  function isAnimating() {
    return animating;
  }

  global.StarlightAlbumBinder3D = {
    ORGANIZE_KEY,
    readOrganize,
    writeOrganize,
    sortOwnedCards,
    renderSceneHtml,
    bindScene,
    bindDragCorners,
    animateTurn,
    isAnimating
  };
})(typeof window !== 'undefined' ? window : globalThis);
