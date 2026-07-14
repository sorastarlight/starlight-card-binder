const CARD_BACK_URL = "site_assets/StarlightCard_Back_NewLogo.png";
const SFX = {
    flip: "site_assets/sfx/card-flip.wav",
    reveal: "site_assets/sfx/starlight-reveal.wav",
    charge: "site_assets/sfx/cosmic-charge.wav",
    legendary: "site_assets/sfx/legendary-reveal.wav"
};

function play(name) {
    try {
        const audio = new Audio(SFX[name]);
        audio.volume = name === "legendary" ? 0.5 : 0.42;
        audio.play().catch(() => {});
    } catch (_) {}
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;"
    })[character]);
}

function rarityClass(card) {
    return `rarity-${String(card?.rarity || "common").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

function ensureStyles() {
    if (document.getElementById("starlight-reward-reveal-styles")) return;
    const style = document.createElement("style");
    style.id = "starlight-reward-reveal-styles";
    style.textContent = `
      .reward-sequence-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 42%,rgba(139,202,255,.34),rgba(56,38,99,.88) 58%,rgba(24,23,54,.96));backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .3s ease}
      .reward-sequence-overlay.open{opacity:1;pointer-events:auto}
      .reward-sequence-stage{position:relative;width:min(94vw,520px);text-align:center;color:#fff;transform:translateY(10px) scale(.985);transition:transform .32s ease}
      .reward-sequence-overlay.open .reward-sequence-stage{transform:translateY(0) scale(1)}
      .reward-sequence-aura{position:absolute;inset:-100px;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.18),transparent 56%),conic-gradient(from 0deg,transparent,rgba(255,210,245,.23),transparent,rgba(255,239,150,.18),transparent);border-radius:50%;animation:rewardAuraSpin 9s linear infinite}
      .reward-sequence-stars{position:absolute;inset:-72px;pointer-events:none;background:radial-gradient(circle at 18% 26%,#fff 0 2px,transparent 3px),radial-gradient(circle at 78% 22%,#fff 0 2px,transparent 3px),radial-gradient(circle at 28% 78%,#ffd7f2 0 3px,transparent 4px),radial-gradient(circle at 84% 70%,#fff4b8 0 3px,transparent 4px);animation:rewardTwinkle 1.6s ease-in-out infinite alternate}
      .reward-sequence-progress{display:flex;justify-content:center;gap:8px;margin-bottom:15px}
      .reward-sequence-progress span{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.3);box-shadow:0 0 0 2px rgba(255,255,255,.1)}
      .reward-sequence-progress span.active{background:#fff1a8;box-shadow:0 0 16px rgba(255,232,120,.9)}
      .reward-sequence-kicker{margin:0 0 10px;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;font-weight:900;opacity:.86}
      .reward-sequence-card{position:relative;width:min(70vw,300px);aspect-ratio:5/7;margin:0 auto;perspective:1600px;filter:drop-shadow(0 20px 34px rgba(0,0,0,.38));cursor:pointer;transition:transform .25s ease,filter .25s ease}
      .reward-sequence-card:not(.flipped):hover{transform:translateY(-4px) scale(1.015)}
      .reward-sequence-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform .82s cubic-bezier(.2,.78,.22,1)}
      .reward-sequence-card.flipped .reward-sequence-inner{transform:rotateY(180deg)}
      .reward-sequence-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:18px;overflow:hidden;background:#fff;border:2px solid rgba(255,255,255,.82)}
      .reward-sequence-face img{width:100%;height:100%;object-fit:cover;display:block}
      .reward-sequence-front{transform:rotateY(180deg)}
      .reward-sequence-copy{min-height:105px;margin-top:19px;text-shadow:0 3px 12px rgba(0,0,0,.45)}
      .reward-sequence-copy h2{margin:0;font-size:clamp(1.45rem,5vw,2.2rem);opacity:0;transform:translateY(7px);transition:.3s ease}
      .reward-sequence-copy p{margin:7px 0 0;font-weight:900;opacity:0;transition:.3s ease .06s}
      .reward-sequence-stage.is-revealed .reward-sequence-copy h2,.reward-sequence-stage.is-revealed .reward-sequence-copy p{opacity:1;transform:none}
      .reward-sequence-hint{margin-top:9px;font-size:.9rem;opacity:.86}
      .reward-sequence-next{min-width:190px;min-height:48px;margin-top:8px;padding:10px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);color:#fff;font:inherit;font-weight:950;cursor:pointer;box-shadow:0 10px 28px rgba(255,130,200,.32);opacity:0;pointer-events:none;transform:translateY(5px);transition:.25s ease}
      .reward-sequence-stage.is-revealed .reward-sequence-next{opacity:1;pointer-events:auto;transform:none}
      .reward-sequence-stage.rarity-legendary .reward-sequence-card{filter:drop-shadow(0 0 30px rgba(255,220,80,.95)) drop-shadow(0 20px 34px rgba(0,0,0,.38))}
      .reward-sequence-stage.card-enter .reward-sequence-card{animation:rewardCardEnter .34s cubic-bezier(.2,.8,.2,1)}
      .reward-sequence-stage.card-exit .reward-sequence-card{animation:rewardCardExit .24s ease both}
      @keyframes rewardAuraSpin{to{transform:rotate(360deg)}}
      @keyframes rewardTwinkle{from{opacity:.48;transform:scale(.985)}to{opacity:1;transform:scale(1.025)}}
      @keyframes rewardCardEnter{from{opacity:0;transform:translateY(18px) scale(.94)}to{opacity:1;transform:none}}
      @keyframes rewardCardExit{to{opacity:0;transform:translateY(-10px) scale(.96)}}
      @media(prefers-reduced-motion:reduce){.reward-sequence-overlay,.reward-sequence-stage,.reward-sequence-inner,.reward-sequence-aura,.reward-sequence-stars,.reward-sequence-card{animation:none!important;transition:none!important}}
    `;
    document.head.appendChild(style);
}

function preload(cards) {
    for (const card of cards || []) {
        const image = new Image();
        image.src = card?.imageUrl || card?.thumbnailUrl || CARD_BACK_URL;
    }
}

export function revealRewardSequence(cards = [], options = {}) {
    ensureStyles();
    preload(cards);
    if (!cards.length) return Promise.resolve();

    return new Promise(resolve => {
        let index = 0;
        let revealed = false;
        const overlay = document.createElement("div");
        overlay.className = "reward-sequence-overlay";
        overlay.innerHTML = `
          <section class="reward-sequence-stage" role="dialog" aria-modal="true" aria-label="Booster card reveal">
            <div class="reward-sequence-aura" aria-hidden="true"></div>
            <div class="reward-sequence-stars" aria-hidden="true"></div>
            <div class="reward-sequence-progress"></div>
            <p class="reward-sequence-kicker"></p>
            <div class="reward-sequence-card" role="button" tabindex="0" aria-label="Reveal card">
              <div class="reward-sequence-inner">
                <div class="reward-sequence-face reward-sequence-back"><img src="${CARD_BACK_URL}" alt="Starlight card back"></div>
                <div class="reward-sequence-face reward-sequence-front"><img alt="Reward card"></div>
              </div>
            </div>
            <div class="reward-sequence-copy"><h2></h2><p></p><div class="reward-sequence-hint">Click the card to reveal it</div></div>
            <button class="reward-sequence-next" type="button">Next Card</button>
          </section>`;

        const stage = overlay.querySelector(".reward-sequence-stage");
        const cardEl = overlay.querySelector(".reward-sequence-card");
        const front = overlay.querySelector(".reward-sequence-front img");
        const title = overlay.querySelector(".reward-sequence-copy h2");
        const detail = overlay.querySelector(".reward-sequence-copy p");
        const hint = overlay.querySelector(".reward-sequence-hint");
        const next = overlay.querySelector(".reward-sequence-next");
        const kicker = overlay.querySelector(".reward-sequence-kicker");
        const progress = overlay.querySelector(".reward-sequence-progress");

        progress.innerHTML = cards.map(() => "<span></span>").join("");
        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";
        requestAnimationFrame(() => overlay.classList.add("open"));

        const loadCard = () => {
            const card = cards[index];
            revealed = false;
            stage.className = `reward-sequence-stage ${rarityClass(card)} card-enter`;
            cardEl.classList.remove("flipped");
            front.src = card.imageUrl || card.thumbnailUrl || CARD_BACK_URL;
            front.alt = `${card.name || "Reward card"} card artwork`;
            title.textContent = card.name || "Mystery Card";
            detail.textContent = `${card.rarity || "Common"} · ${card.seriesName || "Starlight Cards"}${card.isDuplicate ? " · Duplicate" : " · New Card"}`;
            kicker.textContent = `${options.title || "Booster Pack"} · Card ${index + 1} of ${cards.length}`;
            hint.textContent = "Click the card to reveal it";
            next.textContent = index === cards.length - 1 ? "View Pack Summary" : "Next Card";
            [...progress.children].forEach((dot, i) => dot.classList.toggle("active", i <= index));
            window.setTimeout(() => stage.classList.remove("card-enter"), 380);
            play("charge");
        };

        const reveal = () => {
            if (revealed) return;
            revealed = true;
            cardEl.classList.add("flipped");
            stage.classList.add("is-revealed");
            hint.textContent = index === cards.length - 1 ? "Your pack is complete" : "Ready for the next card";
            play("flip");
            window.setTimeout(() => play(String(cards[index].rarity).toLowerCase() === "legendary" ? "legendary" : "reveal"), 430);
        };

        const advance = () => {
            if (!revealed) { reveal(); return; }
            if (index >= cards.length - 1) {
                overlay.classList.remove("open");
                document.body.style.overflow = "";
                window.setTimeout(() => { overlay.remove(); resolve(); }, 280);
                return;
            }
            stage.classList.add("card-exit");
            window.setTimeout(() => {
                index += 1;
                stage.classList.remove("is-revealed", "card-exit");
                loadCard();
            }, 230);
        };

        cardEl.addEventListener("click", reveal);
        cardEl.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); reveal(); }
        });
        next.addEventListener("click", advance);
        loadCard();
    });
}

export function revealCard(card) {
    return revealRewardSequence([card], { title: "Card Reward" });
}
