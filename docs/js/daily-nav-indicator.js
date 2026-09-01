/** Toggle daily-pack READY badge in shell navigation. */
export function applyDailyNavReadyState(available) {
  document.querySelectorAll('[data-daily-nav-badge]').forEach((el) => {
    el.hidden = !available;
    if (available) el.textContent = 'READY';
  });
}
