/**
 * Config-driven binder themes for My Card Album Binder.
 * Themes apply CSS custom properties to the 3D binder scene.
 */
(function initStarlightBinderThemes(global) {
  const STORAGE_KEY = 'sora-starlight-binder-theme-v1';
  const COLOR_STORAGE_KEY = 'sora-starlight-binder-colors-v1';

  const THEME_VARS = Object.freeze({
    'starlight-classic': {
      '--binder-cover-a': '#eaf6ff',
      '--binder-cover-b': '#ffd9ef',
      '--binder-page-a': '#fffefb',
      '--binder-page-b': '#f3f9ff',
      '--binder-spine': '#9ed4ff',
      '--binder-ring': '#dfefff',
      '--binder-ring-metal': '#c8e8ff',
      '--binder-pocket': 'rgba(255,255,255,0.42)',
      '--binder-pocket-edge': 'rgba(107,198,248,0.45)',
      '--binder-glow': 'rgba(255,186,228,0.35)',
      '--binder-accent': '#6bc6f8',
      '--binder-accent-soft': '#ffb4da',
      '--binder-text': '#405fa1'
    },
    'classic-starlight': null,
    'midnight-starlight': {
      '--binder-cover-a': '#2a3568',
      '--binder-cover-b': '#4a3f82',
      '--binder-page-a': '#eef1ff',
      '--binder-page-b': '#dfe6ff',
      '--binder-spine': '#6f7fd4',
      '--binder-ring': '#c8d0ff',
      '--binder-ring-metal': '#9aa8ff',
      '--binder-pocket': 'rgba(255,255,255,0.28)',
      '--binder-pocket-edge': 'rgba(186,170,255,0.5)',
      '--binder-glow': 'rgba(140,120,255,0.28)',
      '--binder-accent': '#9aa8ff',
      '--binder-accent-soft': '#c8b4ff',
      '--binder-text': '#dce8ff'
    },
    'sakura-bloom': {
      '--binder-cover-a': '#fff5fa',
      '--binder-cover-b': '#ffe8f2',
      '--binder-page-a': '#fffefb',
      '--binder-page-b': '#fff0f7',
      '--binder-spine': '#ffb8d9',
      '--binder-ring': '#ffe4f0',
      '--binder-ring-metal': '#ffd0e8',
      '--binder-pocket': 'rgba(255,255,255,0.5)',
      '--binder-pocket-edge': 'rgba(255,170,210,0.45)',
      '--binder-glow': 'rgba(255,196,220,0.35)',
      '--binder-accent': '#ff9ec8',
      '--binder-accent-soft': '#ffd27a',
      '--binder-text': '#8b4a72'
    }
  });
  THEME_VARS['classic-starlight'] = THEME_VARS['starlight-classic'];

  const THEMES = Object.freeze([
    {
      id: 'starlight-classic',
      label: 'Starlight Classic',
      minLevel: 1,
      description: 'Light blue, pink, and lavender celestial ring binder with iridescent pockets.'
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

  const CUSTOMIZABLE_PIECES = Object.freeze([
    { key: '--binder-cover-a', label: 'Cover (light)' },
    { key: '--binder-cover-b', label: 'Cover (accent)' },
    { key: '--binder-page-a', label: 'Page (light)' },
    { key: '--binder-page-b', label: 'Page (shade)' },
    { key: '--binder-spine', label: 'Spine' },
    { key: '--binder-ring-metal', label: 'Rings' },
    { key: '--binder-pocket-edge', label: 'Pocket trim' },
    { key: '--binder-accent', label: 'Accent' }
  ]);

  const COLOR_SWATCHES = Object.freeze([
    { id: 'starlight-blue', label: 'Starlight Blue', value: '#6bc6f8', minLevel: 1 },
    { id: 'sky-mist', label: 'Sky Mist', value: '#9ed4ff', minLevel: 1 },
    { id: 'blossom-pink', label: 'Blossom Pink', value: '#ffb4da', minLevel: 1 },
    { id: 'lavender', label: 'Lavender', value: '#c8b4ff', minLevel: 1 },
    { id: 'mint-glow', label: 'Mint Glow', value: '#8ee4c8', minLevel: 5 },
    { id: 'sunset-gold', label: 'Sunset Gold', value: '#ffc84a', minLevel: 10 },
    { id: 'midnight-indigo', label: 'Midnight Indigo', value: '#4a3f82', minLevel: 15 },
    { id: 'sakura-rose', label: 'Sakura Rose', value: '#ff9ec8', minLevel: 20 }
  ]);

  function readCustomColors() {
    try {
      const raw = global.localStorage?.getItem(COLOR_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function writeCustomColors(colors = {}) {
    try {
      const next = colors && typeof colors === 'object' ? colors : {};
      const hasValues = Object.values(next).some(Boolean);
      if (!hasValues) global.localStorage?.removeItem(COLOR_STORAGE_KEY);
      else global.localStorage?.setItem(COLOR_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function applyCustomColors(root, colors = readCustomColors()) {
    if (!root || !colors) return;
    Object.entries(colors).forEach(([key, value]) => {
      if (!value || !String(key).startsWith('--binder-')) return;
      root.style.setProperty(key, value);
    });
  }

  function normalizeThemeId(themeId) {
    const id = String(themeId || '').trim();
    if (id === 'classic-starlight') return 'starlight-classic';
    return id || 'starlight-classic';
  }

  function readStoredThemeId() {
    try {
      return normalizeThemeId(global.localStorage?.getItem(STORAGE_KEY));
    } catch {
      return 'starlight-classic';
    }
  }

  function writeStoredThemeId(themeId) {
    try {
      if (themeId) global.localStorage?.setItem(STORAGE_KEY, normalizeThemeId(themeId));
    } catch {
      // ignore
    }
  }

  function listThemes(collectorLevel = 1) {
    const level = Math.max(1, Number(collectorLevel) || 1);
    return THEMES.filter(theme => level >= theme.minLevel);
  }

  function resolveThemeId({ storedId, collectorLevel = 1, fallback = 'starlight-classic' } = {}) {
    const available = listThemes(collectorLevel).map(theme => theme.id);
    const candidate = normalizeThemeId(storedId || readStoredThemeId());
    if (available.includes(candidate)) return candidate;
    const normalizedFallback = normalizeThemeId(fallback);
    if (available.includes(normalizedFallback)) return normalizedFallback;
    return available[0] || 'starlight-classic';
  }

  function getTheme(themeId) {
    const id = normalizeThemeId(themeId);
    return THEMES.find(theme => theme.id === id) || THEMES[0];
  }

  function applyThemeVars(root, themeId) {
    if (!root) return;
    const id = normalizeThemeId(themeId);
    const vars = THEME_VARS[id] || THEME_VARS['starlight-classic'];
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
    applyCustomColors(root);
  }

  function applyTheme(root, themeId, { updateBadge = true } = {}) {
    if (!root) return;
    const theme = getTheme(themeId);
    root.dataset.binderTheme = theme.id;
    applyThemeVars(root, theme.id);
    if (updateBadge) {
      const badge = global.document?.querySelector('.card-album-theme-badge');
      if (badge) badge.textContent = theme.label;
    }
  }

  function mergeRemoteThemes(remoteThemes = []) {
    if (!Array.isArray(remoteThemes) || !remoteThemes.length) return THEMES;
    const byId = new Map(THEMES.map(theme => [theme.id, theme]));
    remoteThemes.forEach(entry => {
      const id = normalizeThemeId(entry?.id);
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
    COLOR_STORAGE_KEY,
    THEMES,
    THEME_VARS,
    CUSTOMIZABLE_PIECES,
    COLOR_SWATCHES,
    listThemes,
    resolveThemeId,
    getTheme,
    applyTheme,
    applyThemeVars,
    applyCustomColors,
    readCustomColors,
    writeCustomColors,
    normalizeThemeId,
    readStoredThemeId,
    writeStoredThemeId,
    mergeRemoteThemes
  };
})(typeof window !== 'undefined' ? window : globalThis);
