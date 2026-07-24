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
  'angel-wings', 'star-crown', 'moon-orbit', 'phoenix', 'fairy', 'thorns'
]);

export const AVATAR_FRAME_EFFECTS = Object.freeze([
  'static', 'shimmer', 'pulse', 'glitter', 'breathe'
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

export function applyAvatarFrameClass(el, frame) {
  if (!el) return;
  const keep = [...el.classList].filter((name) => !name.startsWith('avatar-frame'));
  const next = avatarFrameClassName(frame);
  el.className = [...keep, ...(next ? next.split(/\s+/) : [])].filter(Boolean).join(' ');
}
