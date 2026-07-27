/**
 * Starlight Evolution result — embed-safe alert (collection / analyzer entry points).
 * The Evolve My Cards page uses its own in-page result modal instead.
 */

import { prestigeLabel } from './prestige-utils.js?v=1.5.0';

/**
 * @param {object} options
 * @param {string} [options.cardName]
 * @param {string} [options.toTier]
 * @param {string} [options.label]
 * @returns {Promise<void>}
 */
export async function playStarlightEvolutionReveal(options = {}) {
  const label = String(options.label || prestigeLabel(options.toTier || 'stardust')).trim();
  const cardName = String(options.cardName || 'Card').trim();
  const api = window.StarlightUI;
  if (api?.alert) {
    await api.alert({
      title: 'Evolution complete!',
      message: `${cardName} reached ${label}.`,
      buttonText: 'Continue'
    });
    return;
  }
  api?.toast?.(`${cardName} evolved to ${label}!`, 'success');
}

export default { playStarlightEvolutionReveal };
