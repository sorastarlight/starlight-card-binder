
import { supabase } from "./supabase-client.js";

let countdownTimer = null;

function setText(selector, value) {
  document.querySelectorAll(selector).forEach(el => { el.textContent = String(value); });
}
function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function startCountdown(dateValue) {
  if (countdownTimer) clearInterval(countdownTimer);
  const target = new Date(dateValue);
  const tick = () => {
    const remaining = target.getTime() - Date.now();
    if (remaining <= 0) {
      setText('[data-daily-countdown]', 'Available now!');
      clearInterval(countdownTimer);
      return;
    }
    setText('[data-daily-countdown]', formatCountdown(remaining));
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}
function levelFromPoints(points) {
  const thresholds = [0,25,75,150,250,400,600,850,1150,1500];
  let level = 1;
  for (let i=1;i<thresholds.length;i++) if (points >= thresholds[i]) level=i+1;
  const floor = thresholds[Math.min(level-1, thresholds.length-1)] || 0;
  const next = thresholds[level] ?? (floor + 500);
  return { level, floor, next, percent: Math.max(0,Math.min(100,Math.round(((points-floor)/(next-floor))*100))) };
}
async function loadEconomy() {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) {
    setText('[data-star-bits]', '—'); setText('[data-duplicates]', '—');
    document.querySelectorAll('[data-daily-status]').forEach(el=>el.textContent='Sign in to claim');
    document.querySelectorAll('[data-daily-cta]').forEach(el=>{el.classList.remove('is-loading','is-ready','is-claimed');el.classList.add('is-claimed');});
    setText('[data-daily-cta-label]', 'Sign In for Daily Booster');
    return;
  }
  const [{data: preview,error:previewError},{data: daily,error:dailyError},{data: rows,error:cardsError},{data: profile}] = await Promise.all([
    supabase.rpc('get_star_bits_exchange_preview'),
    supabase.rpc('get_daily_booster_status'),
    supabase.from('user_cards').select('card_id,quantity,is_favorite,cards(rarity)'),
    supabase.from('profiles').select('username,onboarding_complete').eq('id', authData.user.id).maybeSingle()
  ]);
  if (profile?.username && profile?.onboarding_complete) {
    document.querySelectorAll('[data-public-profile-link]').forEach(link => {
      link.href = `collector.html?username=${encodeURIComponent(profile.username)}`;
    });
  }
  if (!previewError && preview) {
    setText('[data-star-bits]', preview.starBitsBalance ?? 0);
    setText('[data-duplicates]', preview.totalDuplicateCopies ?? 0);
    setText('#starBitsBalance', preview.starBitsBalance ?? 0);
    setText('#duplicateCardCount', preview.totalDuplicateCopies ?? 0);
  }
  if (!dailyError && daily) {
    const ctas = document.querySelectorAll('[data-daily-cta]');
    if (daily.available) {
      document.querySelectorAll('[data-daily-status]').forEach(el=>{el.textContent='Available Now!';el.classList.remove('daily-claimed');el.classList.add('daily-ready');});
      setText('[data-daily-countdown]', 'Your free pack is ready');
      setText('[data-daily-cta-label]', '🌟 CLAIM YOUR DAILY BOOSTER');
      ctas.forEach(el=>{el.classList.remove('is-loading','is-claimed');el.classList.add('is-ready');el.setAttribute('aria-label','Daily Booster available to open now');});
    } else {
      document.querySelectorAll('[data-daily-status]').forEach(el=>{el.textContent='Claimed Today';el.classList.remove('daily-ready');el.classList.add('daily-claimed');});
      setText('[data-daily-cta-label]', 'Daily Booster Claimed');
      ctas.forEach(el=>{el.classList.remove('is-loading','is-ready');el.classList.add('is-claimed');el.setAttribute('aria-label','View Daily Booster countdown');});
      startCountdown(daily.nextClaimAt);
    }
  }
  if (!cardsError && Array.isArray(rows)) {
    const rarityPoints={Common:1,Uncommon:2,Rare:5,Epic:15,Legendary:50};
    let points=0,totalCopies=0,favorites=0;
    rows.forEach(r=>{ const q=Number(r.quantity||0); totalCopies+=q; if(r.is_favorite) favorites++; points+=(rarityPoints[r.cards?.rarity]||0)*q; });
    const level=levelFromPoints(points);
    setText('[data-collector-level]', level.level);
    setText('[data-collector-points]', points);
    setText('[data-next-level-points]', level.next);
    setText('[data-total-copies]', totalCopies);
    setText('[data-favorite-count]', favorites);
    document.querySelectorAll('[data-level-progress]').forEach(el=>el.style.width=`${level.percent}%`);
  }
}

document.addEventListener('DOMContentLoaded', loadEconomy);
window.addEventListener('starlight-cloud-ready', loadEconomy);
