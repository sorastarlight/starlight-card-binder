/** Shared collector level progression from lifetime collector XP. */

export const COLLECTOR_LEVEL_THRESHOLDS = Object.freeze([
  0, 25, 75, 150, 250, 400, 600, 850, 1150, 1500
]);

const POST_LEVEL_STEP = 500;

/**
 * Convert lifetime collector XP into level progress.
 * Levels 1–10 use fixed thresholds; beyond level 10 each +500 XP grants another level.
 */
export function levelFromPoints(points) {
  const xp = Math.max(0, Number(points) || 0);
  const thresholds = COLLECTOR_LEVEL_THRESHOLDS;
  let level = 1;

  for (let i = 1; i < thresholds.length; i += 1) {
    if (xp >= thresholds[i]) level = i + 1;
  }

  let floor = thresholds[Math.min(level - 1, thresholds.length - 1)] || 0;
  let next = thresholds[level];

  if (next == null) {
    const post = Math.max(0, xp - thresholds[thresholds.length - 1]);
    const extra = Math.floor(post / POST_LEVEL_STEP);
    level = thresholds.length + extra;
    floor = thresholds[thresholds.length - 1] + extra * POST_LEVEL_STEP;
    next = floor + POST_LEVEL_STEP;
  }

  const span = Math.max(1, next - floor);
  const percent = Math.max(0, Math.min(100, Math.round(((xp - floor) / span) * 100)));

  return { level, floor, next, percent, xp };
}
