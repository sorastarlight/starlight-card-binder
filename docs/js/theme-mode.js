/** Light / dark theme preference for shell and embedded views. */
export const THEME_STORAGE_KEY = 'starlight-theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(theme = getStoredTheme()) {
  const mode = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  return mode;
}

export function setStoredTheme(theme) {
  const mode = theme === 'dark' ? 'dark' : 'light';
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
  applyTheme(mode);
  window.dispatchEvent(new CustomEvent('starlight-theme-changed', { detail: { theme: mode } }));
  return mode;
}

export function toggleTheme() {
  return setStoredTheme(getStoredTheme() === 'dark' ? 'light' : 'dark');
}

export function syncThemeToggleControl(input) {
  if (!input) return;
  const dark = getStoredTheme() === 'dark';
  input.value = dark ? '1' : '0';
  input.setAttribute('aria-valuetext', dark ? 'Dark mode on' : 'Dark mode off');
  input.closest('.shell-theme-toggle')?.classList.toggle('is-dark', dark);
}

export function initThemeMode({ input } = {}) {
  applyTheme();
  syncThemeToggleControl(input);
  if (!input || input.dataset.themeReady === '1') return;
  input.dataset.themeReady = '1';
  input.addEventListener('input', () => {
    setStoredTheme(Number(input.value) >= 1 ? 'dark' : 'light');
    syncThemeToggleControl(input);
    broadcastThemeToChildren(getStoredTheme());
  });
}

export function broadcastThemeToChildren(theme = getStoredTheme()) {
  document.getElementById('shellViewIframe')?.contentWindow?.postMessage(
    { type: 'starlight-theme-changed', theme },
    location.origin
  );
}

export function listenForShellThemeMessages() {
  window.addEventListener('message', (event) => {
    if (event.origin !== location.origin) return;
    if (event.data?.type !== 'starlight-theme-changed') return;
    setStoredTheme(event.data.theme);
  });
}
