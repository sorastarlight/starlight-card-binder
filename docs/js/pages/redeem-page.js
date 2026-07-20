import { supabase } from '../supabase-client.js';
import { redeemRewardCode } from '../redemption-service.js';
import { revealRewardSequence } from '../reward-reveal.js?v=1.4.0';

const GENERIC_PACK = 'site_assets/series01_rising_star_booster.png';
const CARD_BACK = 'site_assets/StarlightCard_Back_NewLogo.png';

const form = document.getElementById('redeem-form');
const input = document.getElementById('code');
const button = document.getElementById('redeem-button');
const status = document.getElementById('status');
const rewardBox = document.getElementById('reward-box');
const rewardTitle = document.getElementById('reward-title');
const rewardDescription = document.getElementById('reward-description');

function showStatus(message, type = '') {
  status.textContent = message;
  status.className = `status ${type}`.trim();
}

function showReward(title, description) {
  rewardTitle.textContent = title;
  rewardDescription.textContent = description;
  rewardBox.classList.remove('hidden');
}

const { data: authData } = await supabase.auth.getUser();
if (!authData.user) {
  showStatus('Please sign in before redeeming a code.', 'error');
  button.disabled = true;
  window.setTimeout(() => { location.href = 'login.html'; }, 1400);
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  button.textContent = 'Redeeming…';
  rewardBox.classList.add('hidden');
  showStatus('Checking your code…');

  try {
    const result = await redeemRewardCode(input.value);
    if (!result?.success) {
      showStatus(result?.message || 'That code could not be redeemed.', 'error');
      return;
    }

    input.value = '';
    const cards = Array.isArray(result.cards) ? result.cards : [];
    const starBits = Math.max(0, Number(result.starBits) || 0);
    const label = result.label || 'Reward Redeemed!';

    if (cards.length) {
      showStatus(`Code accepted! ${cards.length} ${cards.length === 1 ? 'card was' : 'cards were'} added.`, 'success');
      await revealRewardSequence(cards, {
        title: label,
        packImageUrl: GENERIC_PACK,
        cardBackUrl: CARD_BACK
      });
      showReward(
        label,
        `${cards.length} ${cards.length === 1 ? 'card was' : 'cards were'} added directly to your collection.`
      );
      return;
    }

    if (starBits > 0) {
      const formattedAmount = starBits.toLocaleString();
      showReward(label, `${formattedAmount} Star Bits were added directly to your balance.`);
      showStatus(`Code accepted! ${formattedAmount} Star Bits added.`, 'success');
      return;
    }

    showReward(label, 'Your reward was added directly to your account.');
    showStatus('Code accepted! Reward added.', 'success');
  } catch (error) {
    showStatus(error.message || 'The code could not be redeemed.', 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Redeem Code';
  }
});
