/**
 * Shared card tile markup for gallery hub, album binder, and list views.
 * Callers supply helpers (esc, perspectiveArt, etc.) from app.js.
 */
(function initStarlightCardTile(global) {
  function copySection(ctx, key) {
    return ctx.websiteBinderLanding || ctx.websiteSection?.('binderLanding') || {};
  }

  function renderGalleryTile(ctx, card, index) {
    const got = ctx.isCollected(card.id);
    const img = got ? card.imageUrl : ctx.cardBackUrl;
    const numberLabel = ctx.cardDisplayNumber?.(card)
      || String(card.collectorNumber || card.number || '');
    const qty = ctx.getCardQuantity?.(card.id) || 0;
    const prestigeClass = got ? (ctx.prestigeFrameClass?.(card.id) || '') : '';
    const stateClass = got ? 'is-owned' : 'is-unowned';
    const favorited = ctx.isFavorite?.(card.id);
    const landing = copySection(ctx);
    const status = got
      ? ctx.fillWebsiteTokens?.(landing.ownedLabel || 'Owned ×{qty}', { qty }) || `Owned ×${qty}`
      : (landing.notCollectedLabel || 'Not Collected');
    const raritySuffix = got ? ` · ${card.rarity || ''}` : '';
    return `<article class="card-gallery-item ${ctx.rarityClass(card)} ${stateClass} ${prestigeClass}${favorited ? ' is-favorite' : ''}" style="--i:${index}">
    <button class="card-gallery-btn" type="button" data-v61-card="${ctx.esc(card.id)}" aria-label="View ${ctx.esc(ctx.getVisibleName(card))}">
      <span class="card-gallery-art">${ctx.perspectiveArt(card, { imageUrl: img, alt: ctx.getVisibleName(card), visible: ctx.perspectiveArtVisible(card, got) })}${got ? ctx.prestigeFrameOverlayHtml(card.id) : ''}</span>
      <span class="card-gallery-number">${ctx.esc(numberLabel)}</span>
      ${favorited ? '<span class="card-gallery-fav" aria-hidden="true">★</span>' : ''}
    </button>
    <span class="card-gallery-status">${ctx.esc(status)}${got ? ctx.esc(raritySuffix) : ''}</span>
  </article>`;
  }

  function renderAlbumTile(ctx, card, index) {
    const got = ctx.isCollected(card.id);
    const numberLabel = ctx.cardDisplayNumber?.(card)
      || String(card.collectorNumber || card.number || '');
    const qty = ctx.getCardQuantity?.(card.id) || 1;
    const prestigeClass = ctx.prestigeFrameClass?.(card.id) || '';
    return `<article class="card-album-slot ${ctx.rarityClass(card)} ${prestigeClass}" style="--i:${index}">
    <button class="card-album-btn" type="button" data-album-card="${ctx.esc(card.id)}" aria-label="Open ${ctx.esc(ctx.displayName(card))} full view">
      <span class="card-album-art">${ctx.perspectiveArt(card, { imageUrl: card.imageUrl, alt: ctx.displayName(card), visible: ctx.perspectiveArtVisible(card, got) })}${ctx.prestigeFrameOverlayHtml(card.id)}</span>
      <span class="card-album-number">${ctx.esc(numberLabel)}</span>
    </button>
    <span class="card-album-meta"><strong>${ctx.esc(ctx.displayName(card))}</strong><span class="card-album-qty">×${qty}</span></span>
  </article>`;
  }

  function renderListTile(ctx, card, mode) {
    const got = ctx.isCollected(card.id);
    const quantity = ctx.getCardQuantity?.(card.id) || 0;
    const favorited = ctx.isFavorite?.(card.id);
    return `<article class="card-album-list-card ${ctx.rarityClass(card)}" data-id="${ctx.esc(card.id)}" data-open-collection-card="${ctx.esc(card.id)}" role="button" tabindex="0" aria-label="Open ${ctx.esc(ctx.getVisibleName(card))} full view">
    <div class="card-album-list-art">${ctx.perspectiveArt(card, { imageUrl: ctx.getVisibleImage(card), alt: ctx.getVisibleName(card), visible: ctx.perspectiveArtVisible(card, got) })}${got ? ctx.prestigeFrameOverlayHtml(card.id) : ''}</div>
    <h3>${ctx.esc(ctx.getVisibleName(card))}</h3>
    <p class="card-album-list-sub">${ctx.esc(card.collectorNumber || card.number)} · ${ctx.esc(card.series)}</p>
    <div class="card-meta-chips compact">${ctx.cardIdentityChips(card, { hidden: !got })}</div>
    ${mode === 'duplicates' ? `<p class="duplicate-copy-summary"><strong>${quantity}</strong> total · <strong>${quantity - 1}</strong> exchangeable</p>` : ''}
    <div class="card-album-list-actions">
      <span class="ownership-status owned">×${quantity}</span>
      ${got ? `<button class="icon-btn" type="button" data-toggle-favorite="${ctx.esc(card.id)}" aria-label="${favorited ? 'Remove from favorites' : 'Add to favorites'}" aria-pressed="${favorited ? 'true' : 'false'}">${favorited ? '★' : '☆'}</button>` : ''}
    </div>
  </article>`;
  }

  function wrapGalleryGrid(tilesHtml) {
    return `<div class="card-gallery-grid">${tilesHtml}</div>`;
  }

  function wrapAlbumGrid(tilesHtml, { listClass = 'card-album-grid' } = {}) {
    return `<div class="${listClass}">${tilesHtml}</div>`;
  }

  global.StarlightCardTile = {
    renderGalleryTile,
    renderAlbumTile,
    renderListTile,
    wrapGalleryGrid,
    wrapAlbumGrid
  };
})(typeof window !== 'undefined' ? window : globalThis);
