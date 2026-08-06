/**
 * Customize Binder modal — theme previews (coming soon) and piece color swatches.
 */
(function initStarlightBinderCustomize(global) {
  const themes = () => global.StarlightBinderThemes;
  let activeModal = null;

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, character => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function binderRoot() {
    return global.document?.querySelector('#collectionGrid .card-album-binder')
      || global.document?.querySelector('#collectionGrid');
  }

  function themeCardsHtml(collectorLevel) {
    const api = themes();
    if (!api?.THEMES) return '';
    return api.THEMES.map(theme => {
      const vars = api.THEME_VARS?.[theme.id] || api.THEME_VARS?.['starlight-classic'] || {};
      const coverA = vars['--binder-cover-a'] || '#eaf6ff';
      const coverB = vars['--binder-cover-b'] || '#ffd9ef';
      return `<article class="binder-customize-theme is-locked" aria-disabled="true">
        <div class="binder-customize-theme-preview" style="background:linear-gradient(135deg, ${escapeHtml(coverA)}, ${escapeHtml(coverB)})" aria-hidden="true"></div>
        <div class="binder-customize-theme-copy">
          <strong>${escapeHtml(theme.label)}</strong>
          <span>${escapeHtml(theme.description)}</span>
        </div>
        <span class="binder-customize-soon">Coming soon</span>
      </article>`;
    }).join('');
  }

  function swatchRowHtml(piece, collectorLevel, selectedValue) {
    const api = themes();
    const swatches = api?.COLOR_SWATCHES || [];
    const buttons = swatches.map(swatch => {
      const locked = collectorLevel < swatch.minLevel;
      const active = !locked && selectedValue === swatch.value;
      return `<button type="button"
        class="binder-customize-swatch${active ? ' is-active' : ''}${locked ? ' is-locked' : ''}"
        data-binder-color-piece="${escapeHtml(piece.key)}"
        data-binder-color-value="${escapeHtml(swatch.value)}"
        data-binder-color-min-level="${swatch.minLevel}"
        style="--swatch-color:${escapeHtml(swatch.value)}"
        ${locked ? 'disabled aria-disabled="true"' : ''}
        aria-label="${escapeHtml(swatch.label)}${locked ? ` — unlocks at level ${swatch.minLevel}` : ''}"
        title="${locked ? `Unlocks at Lv. ${swatch.minLevel}` : escapeHtml(swatch.label)}">
        ${locked ? '<span class="binder-customize-lock" aria-hidden="true">🔒</span>' : ''}
      </button>`;
    }).join('');
    return `<div class="binder-customize-piece">
      <div class="binder-customize-piece-head">
        <strong>${escapeHtml(piece.label)}</strong>
        <button type="button" class="binder-customize-reset-piece" data-binder-reset-piece="${escapeHtml(piece.key)}">Reset</button>
      </div>
      <div class="binder-customize-swatches" role="listbox" aria-label="${escapeHtml(piece.label)} colors">${buttons}</div>
    </div>`;
  }

  function modalContentHtml(collectorLevel) {
    const api = themes();
    const pieces = api?.CUSTOMIZABLE_PIECES || [];
    const custom = api?.readCustomColors?.() || {};
    const pieceRows = pieces.map(piece => swatchRowHtml(piece, collectorLevel, custom[piece.key] || '')).join('');
    return `<div class="binder-customize-modal">
      <section class="binder-customize-section" aria-labelledby="binder-customize-themes-title">
        <div class="binder-customize-section-head">
          <h3 id="binder-customize-themes-title">Binder themes</h3>
          <p>Full theme presets are on the way. More unlock as you level up.</p>
        </div>
        <div class="binder-customize-themes">${themeCardsHtml(collectorLevel)}</div>
      </section>
      <section class="binder-customize-section" aria-labelledby="binder-customize-colors-title">
        <div class="binder-customize-section-head">
          <h3 id="binder-customize-colors-title">Album colors</h3>
          <p>Pick colors for each part of your binder. Additional palettes unlock through progression.</p>
        </div>
        ${pieceRows}
        <div class="binder-customize-foot">
          <button type="button" class="binder-customize-reset-all" data-binder-reset-colors>Reset all colors</button>
        </div>
      </section>
    </div>`;
  }

  function applyLivePreview() {
    const root = binderRoot();
    const api = themes();
    if (!root || !api?.applyTheme) return;
    const level = Number(global.document?.querySelector('[data-collector-level]')?.textContent) || 1;
    const themeId = api.resolveThemeId({ collectorLevel: level });
    api.applyTheme(root, themeId, { updateBadge: true });
  }

  function bindModalInteractions(modalRoot, { onApplied } = {}) {
    const api = themes();
    if (!modalRoot || !api) return;

    modalRoot.addEventListener('click', event => {
      const swatch = event.target.closest('[data-binder-color-piece]');
      if (swatch && !swatch.disabled) {
        event.preventDefault();
        const piece = swatch.dataset.binderColorPiece;
        const value = swatch.dataset.binderColorValue;
        const colors = { ...api.readCustomColors(), [piece]: value };
        api.writeCustomColors(colors);
        modalRoot.querySelectorAll(`[data-binder-color-piece="${piece}"]`).forEach(btn => {
          btn.classList.toggle('is-active', btn.dataset.binderColorValue === value);
        });
        applyLivePreview();
        onApplied?.();
        return;
      }

      const resetPiece = event.target.closest('[data-binder-reset-piece]');
      if (resetPiece) {
        event.preventDefault();
        const piece = resetPiece.dataset.binderResetPiece;
        const colors = api.readCustomColors();
        delete colors[piece];
        api.writeCustomColors(colors);
        modalRoot.querySelectorAll(`[data-binder-color-piece="${piece}"]`).forEach(btn => btn.classList.remove('is-active'));
        applyLivePreview();
        onApplied?.();
        return;
      }

      if (event.target.closest('[data-binder-reset-colors]')) {
        event.preventDefault();
        api.writeCustomColors({});
        modalRoot.querySelectorAll('.binder-customize-swatch.is-active').forEach(btn => btn.classList.remove('is-active'));
        applyLivePreview();
        onApplied?.();
      }
    });
  }

  function openModal({ collectorLevel = 1, onApplied } = {}) {
    const ui = global.StarlightUI;
    if (!ui?.createModal) return null;
    if (activeModal?.isOpen) return activeModal;

    const level = Math.max(1, Number(collectorLevel) || 1);
    const modal = ui.createModal({
      title: 'Customize Binder',
      message: '',
      className: 'st-dialog--xl binder-customize-dialog',
      content: modalContentHtml(level),
      closeLabel: 'Close'
    });
    activeModal = modal;
    bindModalInteractions(modal.element, { onApplied });
    modal.open({ initialFocus: '.binder-customize-swatch:not([disabled])' });
    return modal;
  }

  global.StarlightBinderCustomize = {
    openModal,
    applyLivePreview
  };
})(typeof window !== 'undefined' ? window : globalThis);
