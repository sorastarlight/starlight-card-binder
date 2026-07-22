/**
 * Star Bits conversion celebration: selected card art scatters into star bits,
 * then a results summary is shown.
 */

const STYLE_ID = 'starlight-star-bits-convert-style';

const CSS = `
.sb-convert-overlay{
  position:fixed;inset:0;z-index:12000;display:grid;place-items:center;
  padding:20px;background:rgba(28,36,62,.55);backdrop-filter:blur(8px);
}
.sb-convert-dialog{
  width:min(100%,520px);border-radius:24px;padding:22px;
  background:linear-gradient(160deg,#fff,#f7fbff);border:2px solid rgba(107,198,248,.4);
  box-shadow:0 28px 70px rgba(40,55,100,.28);color:#30344f;
}
.sb-convert-dialog h2{margin:0 0 8px;color:#405fa1}
.sb-convert-dialog p{margin:0;line-height:1.5;color:#6d7692}
.sb-convert-stage{
  position:relative;height:220px;margin:18px 0;border-radius:18px;overflow:hidden;
  background:radial-gradient(circle at 50% 70%,rgba(255,130,200,.18),transparent 55%),
    linear-gradient(160deg,#eef7ff,#fff5fb);
}
.sb-convert-card{
  position:absolute;width:72px;height:100px;border-radius:10px;object-fit:cover;
  box-shadow:0 10px 24px rgba(50,65,105,.28);left:50%;top:42%;
  transform:translate(-50%,-50%) rotate(var(--rot,0deg));
  transition:transform .9s cubic-bezier(.2,.8,.2,1),opacity .8s ease;
}
.sb-convert-card.is-scatter{
  transform:translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--spin)) scale(.35);
  opacity:0;
}
.sb-convert-bit{
  position:absolute;left:50%;top:48%;width:14px;height:14px;border-radius:50%;
  background:linear-gradient(135deg,#ffd76a,#ff82c8);box-shadow:0 0 12px rgba(255,215,106,.8);
  transform:translate(-50%,-50%) scale(0);opacity:0;
}
.sb-convert-bit.is-burst{
  animation:sb-bit-burst .85s ease forwards;
  animation-delay:var(--delay,.1s);
}
@keyframes sb-bit-burst{
  0%{transform:translate(-50%,-50%) scale(.2);opacity:0}
  35%{opacity:1;transform:translate(calc(-50% + var(--bx)*.4), calc(-50% + var(--by)*.4)) scale(1.15)}
  100%{opacity:0;transform:translate(calc(-50% + var(--bx)), calc(-50% + var(--by))) scale(.4)}
}
.sb-convert-results{display:grid;gap:10px;text-align:center;padding:8px 0 4px}
.sb-convert-results strong{display:block;font-size:1.8rem;color:#405fa1}
.sb-convert-actions{display:flex;justify-content:center;margin-top:14px}
.sb-convert-actions button{
  border:0;border-radius:999px;padding:11px 22px;font:inherit;font-weight:900;cursor:pointer;
  background:linear-gradient(135deg,#6bc6f8,#ff82c8);color:#fff;
}
@media (prefers-reduced-motion:reduce){
  .sb-convert-card,.sb-convert-bit{transition:none!important;animation:none!important}
}
`;

function ensureStyles(doc = document) {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  doc.head.append(style);
}

function pickArt(card) {
  return card?.thumbnailUrl || card?.imageUrl || card?.art || '';
}

/**
 * @param {object} options
 * @param {Array<{name?:string,thumbnailUrl?:string,imageUrl?:string,quantity?:number}>} options.cards
 * @param {number} options.convertedCopies
 * @param {number} options.starBitsEarned
 * @param {string} [options.title]
 */
export async function playStarBitsConvertReveal(options = {}) {
  ensureStyles();
  const cards = Array.isArray(options.cards) ? options.cards.filter(Boolean) : [];
  const convertedCopies = Number(options.convertedCopies || 0);
  const starBitsEarned = Number(options.starBitsEarned || 0);
  const title = options.title || 'Duplicates Converted!';
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'sb-convert-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);

    const dialog = document.createElement('div');
    dialog.className = 'sb-convert-dialog';
    dialog.innerHTML = `
      <h2>${title}</h2>
      <p>Turning extra copies into sparkly Star Bits…</p>
      <div class="sb-convert-stage" data-stage></div>
      <div class="sb-convert-results" hidden data-results>
        <div><strong data-copies>${convertedCopies}</strong><span>cards converted</span></div>
        <div><strong data-bits>★ ${starBitsEarned.toLocaleString()}</strong><span>Star Bits gained</span></div>
      </div>
      <div class="sb-convert-actions" hidden data-actions>
        <button type="button" data-done>Nice!</button>
      </div>
    `;

    overlay.append(dialog);
    document.body.append(overlay);

    const stage = dialog.querySelector('[data-stage]');
    const results = dialog.querySelector('[data-results]');
    const actions = dialog.querySelector('[data-actions]');
    const done = dialog.querySelector('[data-done]');

    const visuals = (cards.length ? cards : [{ name: 'Card' }]).slice(0, 8);
    const cardEls = visuals.map((card, index) => {
      const img = document.createElement('img');
      img.className = 'sb-convert-card';
      img.alt = card.name || 'Duplicate card';
      img.src = pickArt(card) || 'site_assets/card_back.png';
      img.style.setProperty('--rot', `${(index - visuals.length / 2) * 8}deg`);
      img.style.zIndex = String(10 + index);
      img.onerror = () => { img.src = 'site_assets/card_back.png'; };
      stage.append(img);
      return img;
    });

    const finish = () => {
      overlay.remove();
      resolve({ convertedCopies, starBitsEarned });
    };

    done?.addEventListener('click', finish);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay && !results.hidden) finish();
    });

    const showResults = () => {
      stage.hidden = true;
      results.hidden = false;
      actions.hidden = false;
      done?.focus();
    };

    if (reduceMotion) {
      showResults();
      return;
    }

    requestAnimationFrame(() => {
      cardEls.forEach((el, index) => {
        const angle = (Math.PI * 2 * index) / Math.max(cardEls.length, 1);
        const dist = 120 + (index % 3) * 28;
        el.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
        el.style.setProperty('--dy', `${Math.sin(angle) * dist - 40}px`);
        el.style.setProperty('--spin', `${(index % 2 ? 1 : -1) * (140 + index * 20)}deg`);
        el.classList.add('is-scatter');
      });

      for (let i = 0; i < 18; i += 1) {
        const bit = document.createElement('span');
        bit.className = 'sb-convert-bit';
        const angle = (Math.PI * 2 * i) / 18;
        const dist = 90 + (i % 4) * 30;
        bit.style.setProperty('--bx', `${Math.cos(angle) * dist}px`);
        bit.style.setProperty('--by', `${Math.sin(angle) * dist}px`);
        bit.style.setProperty('--delay', `${0.12 + (i % 6) * 0.05}s`);
        stage.append(bit);
        requestAnimationFrame(() => bit.classList.add('is-burst'));
      }

      window.setTimeout(showResults, 1050);
    });
  });
}
