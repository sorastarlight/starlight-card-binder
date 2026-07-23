/**
 * Canonical Star Bits currency icon for shell, shop, exchange, and rewards UI.
 */
export const STAR_BIT_ICON_SRC = 'site_assets/icons/star-bit.png?v=2';
export const STAR_BIT_ICON_ALT = 'Star Bits';

const SIZE_PX = Object.freeze({
  xs: 14,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 36
});

function resolveSize(size) {
  if (typeof size === 'number' && Number.isFinite(size) && size > 0) return Math.round(size);
  return SIZE_PX[size] || SIZE_PX.md;
}

/**
 * @param {(value: unknown) => string} esc
 * @param {{ className?: string, size?: 'xs'|'sm'|'md'|'lg'|'xl'|number, alt?: string }} [options]
 */
export function starBitIconHtml(esc, {
  className = 'star-bit-icon',
  size = 'md',
  alt = ''
} = {}) {
  if (typeof esc !== 'function') return '';
  const px = resolveSize(size);
  const sizeClass = typeof size === 'string' && SIZE_PX[size] ? ` star-bit-icon--${size}` : '';
  return `<img class="${esc(className)}${esc(sizeClass)}" src="${esc(STAR_BIT_ICON_SRC)}" alt="${esc(alt)}" width="${px}" height="${px}" decoding="async">`;
}

/**
 * Inline amount with currency icon, e.g. [icon] 1,200
 */
export function starBitAmountHtml(esc, amount, {
  className = 'star-bit-amount',
  iconSize = 'sm',
  suffix = '',
  showLabel = false
} = {}) {
  const n = Number(amount);
  const formatted = Number.isFinite(n) ? n.toLocaleString() : String(amount ?? '0');
  const label = showLabel ? ` ${esc(suffix || 'Star Bits')}` : (suffix ? ` ${esc(suffix)}` : '');
  return `<span class="${esc(className)}">${starBitIconHtml(esc, { size: iconSize })}${formatted}${label}</span>`;
}

/** Navigation / studio image icon descriptor for My Star Bits. */
export function starBitNavIcon() {
  return {
    type: 'image',
    url: STAR_BIT_ICON_SRC,
    path: STAR_BIT_ICON_SRC
  };
}
