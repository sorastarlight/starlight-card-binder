export function slugifyAdminId(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
}

export function requirementNeedsTarget(type) {
  return ['own_rarity', 'own_series_complete', 'own_category'].includes(String(type || ''));
}

export function formatRequirementSummary(quest, pickers = {}) {
  const type = quest?.requirementType || '';
  const count = Number(quest?.requirementCount || 1);
  const target = quest?.requirementTarget || '';
  const seriesName = (pickers.series || []).find((s) => s.id === target)?.name || target;
  const categoryName = (pickers.categories || []).find((c) => c.id === target)?.name || target;

  switch (type) {
    case 'own_rarity':
      return `Own ${count} ${target || 'rarity'}`;
    case 'own_series_complete':
      return `Complete series ${seriesName || target}`;
    case 'own_unique':
      return `Own ${count} unique card${count === 1 ? '' : 's'}`;
    case 'own_category':
      return `Own ${count} from ${categoryName || target}`;
    case 'favorite_count':
      return `Favorite ${count} card${count === 1 ? '' : 's'}`;
    case 'trade_count':
      return `Complete ${count} trade${count === 1 ? '' : 's'}`;
    case 'booster_opens':
      return `Open ${count} booster${count === 1 ? '' : 's'}`;
    case 'gift_sent':
      return `Send ${count} gift${count === 1 ? '' : 's'}`;
    case 'visit_days':
      return `Visit ${count} day${count === 1 ? '' : 's'}`;
    default:
      return type || 'Requirement';
  }
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
