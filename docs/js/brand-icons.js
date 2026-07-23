/**
 * Shared brand icons for shell navigation, socials, and auth surfaces.
 * Values may be brand ids (`twitch`), tokens (`brand:youtube`), or asset paths.
 */

export const BRAND_ICON_IDS = Object.freeze(['twitch', 'youtube', 'x', 'star-bit']);

export const BRAND_ICONS = Object.freeze({
  twitch: {
    id: 'twitch',
    label: 'Twitch',
    emoji: '💜',
    file: 'site_assets/icons/twitch.svg'
  },
  youtube: {
    id: 'youtube',
    label: 'YouTube',
    emoji: '▶️',
    file: 'site_assets/icons/youtube.svg'
  },
  x: {
    id: 'x',
    label: 'X',
    emoji: '𝕏',
    file: 'site_assets/icons/x.svg'
  },
  'star-bit': {
    id: 'star-bit',
    label: 'Star Bits',
    emoji: '✦',
    file: 'site_assets/icons/star-bit.png?v=2'
  }
});

const FILE_TO_ID = Object.freeze(
  Object.fromEntries(Object.values(BRAND_ICONS).map((icon) => [String(icon.file).split('?')[0], icon.id]))
);

export function brandIconToken(id) {
  const icon = BRAND_ICONS[id];
  return icon ? `brand:${icon.id}` : '';
}

export function resolveBrandIcon(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const lowered = raw.toLowerCase();
  if (BRAND_ICONS[lowered]) return BRAND_ICONS[lowered];

  const tokenMatch = lowered.match(/^brand:([a-z0-9_-]+)$/);
  if (tokenMatch && BRAND_ICONS[tokenMatch[1]]) return BRAND_ICONS[tokenMatch[1]];

  const path = raw.replace(/^\.\//, '').split('?')[0];
  const byFile = FILE_TO_ID[path] || FILE_TO_ID[path.replace(/^\/+/, '')];
  if (byFile) return BRAND_ICONS[byFile];

  return null;
}

export function isBrandIconValue(value) {
  return Boolean(resolveBrandIcon(value));
}

export function brandIconSrc(value) {
  return resolveBrandIcon(value)?.file || '';
}

/**
 * Escape-safe img markup for a brand icon. Caller must pass an esc() helper.
 */
export function brandIconImgHtml(value, esc, {
  className = 'brand-icon',
  size = 20,
  alt = ''
} = {}) {
  const brand = resolveBrandIcon(value);
  if (!brand || typeof esc !== 'function') return '';
  return `<img class="${esc(className)}" src="${esc(brand.file)}" alt="${esc(alt)}" width="${Number(size) || 20}" height="${Number(size) || 20}" decoding="async">`;
}

export function renderIconMarkup(value, esc, options = {}) {
  const brandHtml = brandIconImgHtml(value, esc, options);
  if (brandHtml) return brandHtml;
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/\.(svg|png|webp|jpe?g)(\?|$)/i.test(raw) || raw.startsWith('site_assets/')) {
    const size = Number(options.size) || 20;
    const className = options.className || 'brand-icon';
    return `<img class="${esc(className)}" src="${esc(raw)}" alt="${esc(options.alt || '')}" width="${size}" height="${size}" decoding="async">`;
  }
  return `<span aria-hidden="true">${esc(raw)}</span>`;
}
