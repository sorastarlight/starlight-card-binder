/** Toggle daily-pack ready indicators in shell navigation (READY badge or rainbow link). */
export function applyDailyNavReadyState(available) {
  document.querySelectorAll('[data-daily-nav-badge]').forEach((el) => {
    el.hidden = !available;
    if (available) el.textContent = 'READY';
  });
  document.querySelectorAll('[data-daily-nav-rainbow]').forEach((el) => {
    el.classList.toggle('is-daily-ready', available);
  });
}
