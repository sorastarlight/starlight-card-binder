/**
 * CSS class helpers for unlockable profile avatar frames.
 */
export const AVATAR_FRAME_PRESETS = Object.freeze([
  // Basic solid rings
  'sky', 'rose', 'gold', 'violet', 'emerald', 'crimson', 'midnight',
  'coral', 'amber', 'teal', 'slate', 'lavender', 'mint', 'peach', 'onyx',
  // Gradient and animated rings (ring-safe masked gradients)
  'sunset', 'ocean', 'rainbow', 'aurora', 'holofoil', 'prism', 'nebula', 'eclipse', 'candy',
  // Sparkle / halo presets
  'glitter', 'celestial',
  // Creative ornament frames
  'angel-wings', 'star-crown', 'moon-orbit', 'phoenix', 'fairy', 'thorns',
  // Prestige level / Radiance ladder (CSS-only)
  'radiance-i', 'radiance-ii', 'radiance-iii', 'radiance-iv', 'radiance-v',
  'level-ember', 'level-nova', 'level-apex',
  // Asset overlay host (ring + optional uploaded PNG/SVG)
  'asset-ring'
]);

export const AVATAR_FRAME_EFFECTS = Object.freeze([
  'static', 'shimmer', 'pulse', 'glitter', 'breathe'
]);

/** Collector XP thresholds that auto-unlock prestige CSS frames (matches sync_my_level_avatar_frames). */
export const LEVEL_AVATAR_FRAME_UNLOCKS = Object.freeze([
  { frameId: 'frame_level_ember', minXp: 25, cssPreset: 'level-ember' },
  { frameId: 'frame_radiance_i', minXp: 75, cssPreset: 'radiance-i' },
  { frameId: 'frame_radiance_ii', minXp: 150, cssPreset: 'radiance-ii' },
  { frameId: 'frame_radiance_iii', minXp: 250, cssPreset: 'radiance-iii' },
  { frameId: 'frame_level_nova', minXp: 400, cssPreset: 'level-nova' },
  { frameId: 'frame_radiance_iv', minXp: 600, cssPreset: 'radiance-iv' },
  { frameId: 'frame_level_apex', minXp: 850, cssPreset: 'level-apex' },
  { frameId: 'frame_radiance_v', minXp: 1150, cssPreset: 'radiance-v' }
]);

export function normalizeAvatarFramePreset(preset) {
  const value = String(preset || '').trim().toLowerCase();
  return AVATAR_FRAME_PRESETS.includes(value) ? value : '';
}

export function normalizeAvatarFrameEffect(effect) {
  const value = String(effect || '').trim().toLowerCase();
  return AVATAR_FRAME_EFFECTS.includes(value) ? value : 'static';
}

/**
 * @param {{ overlayImageUrl?: string, overlay_image_url?: string }|string|null} frame
 */
export function avatarFrameOverlayUrl(frame) {
  if (!frame || typeof frame === 'string') return '';
  return String(frame.overlayImageUrl || frame.overlay_image_url || '').trim();
}

/**
 * Build class list for an avatar frame host element.
 * @param {{ cssPreset?: string, effect?: string }|string|null} frame
 */
export function avatarFrameClassName(frame) {
  if (!frame) return '';
  const preset = normalizeAvatarFramePreset(
    typeof frame === 'string' ? frame : (frame.cssPreset || frame.css_preset || frame.preset)
  );
  if (!preset) return '';
  const effect = normalizeAvatarFrameEffect(
    typeof frame === 'string' ? 'static' : (frame.effect || 'static')
  );
  const classes = ['avatar-frame', `avatar-frame-${preset}`];
  if (effect !== 'static') classes.push(`avatar-frame-effect-${effect}`);
  return classes.join(' ');
}

function removeAvatarFrameOverlay(el) {
  el.querySelector('.avatar-frame-overlay')?.remove();
}

function mountAvatarFrameOverlay(el, url) {
  removeAvatarFrameOverlay(el);
  if (!url || typeof document === 'undefined') return;

  const img = document.createElement('img');
  img.className = 'avatar-frame-overlay';
  img.src = url;
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.decoding = 'async';
  el.appendChild(img);
}

export function applyAvatarFrameClass(el, frame) {
  if (!el) return;

  const keep = [...el.classList].filter((name) => (
    !name.startsWith('avatar-frame') && name !== 'avatar-frame-has-overlay'
  ));
  removeAvatarFrameOverlay(el);

  const next = avatarFrameClassName(frame);
  const overlayUrl = avatarFrameOverlayUrl(frame);
  const classes = [...keep, ...(next ? next.split(/\s+/) : [])];
  if (overlayUrl) classes.push('avatar-frame-has-overlay');
  el.className = classes.filter(Boolean).join(' ');

  if (overlayUrl) mountAvatarFrameOverlay(el, overlayUrl);
}

/** Build static overlay markup for server-rendered avatars (rankings, admin previews). */
export function avatarFrameOverlayMarkup(frame, esc = (value) => String(value ?? '')) {
  const url = avatarFrameOverlayUrl(frame);
  if (!url) return '';
  return `<img class="avatar-frame-overlay" src="${esc(url)}" alt="" aria-hidden="true" decoding="async">`;
}
