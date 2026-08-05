/**
 * Config-driven binder themes for My Card Album Binder.
 * Additional themes can be registered here or merged from CMS / Supabase later.
 */
(function initStarlightBinderThemes(global) {
  const STORAGE_KEY = 'sora-starlight-binder-theme-v1';

  /** @type {ReadonlyArray<{id:string,label:string,minLevel:number,description:string}>} */
  const THEMES = Object.freeze([
    {
      id: 'classic-starlight',
      label: 'Classic Starlight',
      minLevel: 1,
      description: 'Soft celestial blue and pink ring binder with starlit pockets.'
    },
    {
      id: 'midnight-starlight',
      label: 'Midnight Starlight',
      minLevel: 10,
      description: 'Deep indigo spread with violet ring accents.'
    },
    {
      id: 'sakura-bloom',
      label: 'Sakura Bloom',
      minLevel: 20,
      description: 'Cherry blossom pink binder with golden pocket trim.'
    }
  ]);

  function readStoredThemeId() {
    try {
      return String(global.localStorage?.getItem(STORAGE_KEY) || '').trim() || null;
    } catch {
      return null;
    }
  }

  function writeStoredThemeId(themeId) {
    try {
      if (themeId) global.localStorage?.setItem(STORAGE_KEY, themeId);
    } catch {
      // ignore quota / privacy mode
    }
  }

  function listThemes(collectorLevel = 1) {
    const level = Math.max(1, Number(collectorLevel) || 1);
    return THEMES.filter(theme => level >= theme.minLevel);
  }

  function resolveThemeId({ storedId, collectorLevel = 1, fallback = 'classic-starlight' } = {}) {
    const available = listThemes(collectorLevel).map(theme => theme.id);
    const candidate = storedId || readStoredThemeId();
    if (candidate && available.includes(candidate)) return candidate;
    if (available.includes(fallback)) return fallback;
    return available[0] || 'classic-starlight';
  }

  function getTheme(themeId) {
    return THEMES.find(theme => theme.id === themeId) || THEMES[0];
  }

  function applyTheme(root, themeId, { updateBadge = true } = {}) {
    if (!root) return;
    const theme = getTheme(themeId);
    root.dataset.binderTheme = theme.id;
    if (updateBadge) {
      const badge = global.document?.querySelector('.card-album-theme-badge');
      if (badge) badge.textContent = theme.label;
    }
  }

  function mergeRemoteThemes(remoteThemes = []) {
    if (!Array.isArray(remoteThemes) || !remoteThemes.length) return THEMES;
    const byId = new Map(THEMES.map(theme => [theme.id, theme]));
    remoteThemes.forEach(entry => {
      const id = String(entry?.id || '').trim();
      if (!id) return;
      byId.set(id, {
        id,
        label: String(entry.label || id).trim(),
        minLevel: Math.max(1, Number(entry.minLevel ?? entry.min_level) || 1),
        description: String(entry.description || '').trim()
      });
    });
    return Object.freeze([...byId.values()]);
  }

  global.StarlightBinderThemes = {
    STORAGE_KEY,
    THEMES,
    listThemes,
    resolveThemeId,
    getTheme,
    applyTheme,
    readStoredThemeId,
    writeStoredThemeId,
    mergeRemoteThemes
  };
})(typeof window !== 'undefined' ? window : globalThis);
