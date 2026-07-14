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

function rarityClass(card) {
    return `rarity-${String(card?.rarity || "common").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function imageUrl(card) {
    return card?.imageUrl || card?.thumbnailUrl || CARD_BACK_URL;
}

function preloadImage(url) {
    return new Promise(resolve => {
        if (!url) {
            resolve(false);
            return;
        }

        const image = new Image();
        let settled = false;
        const finish = success => {
            if (settled) return;
            settled = true;
            resolve(success);
        };

        image.onload = () => finish(true);
        image.onerror = () => finish(false);
        image.src = url;

        if (image.complete) {
            finish(image.naturalWidth > 0);
        }
    });
}

function ensureStyles() {
    if (document.getElementById("starlight-reward-reveal-styles")) return;

    const style = document.createElement("style");
    style.id = "starlight-reward-reveal-styles";
    style.textContent = `
      .reward-sequence-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at 50% 42%,rgba(139,202,255,.34),rgba(56,38,99,.9) 58%,rgba(24,23,54,.97));backdrop-filter:blur(10px);opacity:0;pointer-events:none;transition:opacity .28s ease}
      .reward-sequence-overlay.open{opacity:1;pointer-events:auto}
      .reward-sequence-stage{position:relative;width:min(94vw,540px);text-align:center;color:#fff;transform:translateY(12px) scale(.985);transition:transform .3s ease}
      .reward-sequence-overlay.open .reward-sequence-stage{transform:translateY(0) scale(1)}
      .reward-sequence-aura{position:absolute;inset:-105px;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.18),transparent 56%),conic-gradient(from 0deg,transparent,rgba(255,210,245,.24),transparent,rgba(255,239,150,.2),transparent);border-radius:50%;animation:rewardAuraSpin 10s linear infinite}
      .reward-sequence-stars{position:absolute;inset:-72px;pointer-events:none;background:radial-gradient(circle at 18% 26%,#fff 0 2px,transparent 3px),radial-gradient(circle at 78% 22%,#fff 0 2px,transparent 3px),radial-gradient(circle at 28% 78%,#ffd7f2 0 3px,transparent 4px),radial-gradient(circle at 84% 70%,#fff4b8 0 3px,transparent 4px);animation:rewardTwinkle 1.7s ease-in-out infinite alternate}
      .reward-sequence-progress{display:flex;justify-content:center;gap:8px;margin-bottom:15px}
      .reward-sequence-progress span{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.3);box-shadow:0 0 0 2px rgba(255,255,255,.1);transition:.2s ease}
      .reward-sequence-progress span.active{background:#fff1a8;box-shadow:0 0 16px rgba(255,232,120,.9)}
      .reward-sequence-kicker{margin:0 0 10px;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;font-weight:900;opacity:.88}
      .reward-sequence-card-shell{position:relative;width:min(70vw,300px);aspect-ratio:5/7;margin:0 auto;perspective:1600px;filter:drop-shadow(0 20px 34px rgba(0,0,0,.38));cursor:pointer;transform-origin:center;will-change:transform,opacity,filter}
      .reward-sequence-card-shell.is-entering{animation:rewardCardEnter .38s cubic-bezier(.2,.82,.2,1) both}
      .reward-sequence-card-shell.is-exiting{animation:rewardCardExit .28s ease both;pointer-events:none}
      .reward-sequence-card-shell.is-charging{animation:rewardCharge .72s ease-in-out both}
      .reward-sequence-card-shell.is-flipping{animation:rewardHalfFlip .62s cubic-bezier(.3,.75,.2,1) both;pointer-events:none}
      .reward-sequence-card-shell.is-revealed{cursor:default}
      .reward-sequence-card-frame{position:absolute;inset:0;border-radius:19px;overflow:hidden;background:#fff;border:2px solid rgba(255,255,255,.86);box-shadow:0 0 0 1px rgba(255,255,255,.2);transform-style:preserve-3d}
      .reward-sequence-card-image{width:100%;height:100%;object-fit:cover;display:block;user-select:none;-webkit-user-drag:none}
      .reward-sequence-card-mask{position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:radial-gradient(circle at 50% 48%,rgba(255,255,255,.26),transparent 44%);opacity:0;transition:opacity .2s ease}
      .reward-sequence-card-shell.is-charging .reward-sequence-card-mask{opacity:1}
      .reward-sequence-copy{min-height:112px;margin-top:19px;text-shadow:0 3px 12px rgba(0,0,0,.45)}
      .reward-sequence-copy h2{margin:0;font-size:clamp(1.45rem,5vw,2.2rem);opacity:0;transform:translateY(8px);transition:opacity .3s ease,transform .3s ease}
      .reward-sequence-copy p{margin:7px 0 0;font-weight:900;opacity:0;transform:translateY(5px);transition:opacity .3s ease .05s,transform .3s ease .05s}
      .reward-sequence-stage.is-revealed .reward-sequence-copy h2,.reward-sequence-stage.is-revealed .reward-sequence-copy p{opacity:1;transform:none}
      .reward-sequence-hint{margin-top:9px;font-size:.9rem;opacity:.88;min-height:1.25em}
      .reward-sequence-next{min-width:190px;min-height:48px;margin-top:8px;padding:10px 20px;border:0;border-radius:999px;background:linear-gradient(135deg,#fed334,#ff82c8,#6bc6f8);color:#fff;font:inherit;font-weight:950;cursor:pointer;box-shadow:0 10px 28px rgba(255,130,200,.32);opacity:0;pointer-events:none;transform:translateY(6px);transition:opacity .22s ease,transform .22s ease,filter .2s ease}
      .reward-sequence-stage.is-revealed .reward-sequence-next{opacity:1;pointer-events:auto;transform:none}
      .reward-sequence-next:disabled{pointer-events:none;opacity:.5}
      .reward-sequence-stage.rarity-legendary .reward-sequence-card-shell{filter:drop-shadow(0 0 31px rgba(255,220,80,.96)) drop-shadow(0 20px 34px rgba(0,0,0,.38))}
      @keyframes rewardAuraSpin{to{transform:rotate(360deg)}}
      @keyframes rewardTwinkle{from{opacity:.5;transform:scale(.985)}to{opacity:1;transform:scale(1.025)}}
      @keyframes rewardCardEnter{from{opacity:0;transform:translateY(24px) scale(.91)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes rewardCardExit{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(-22px) scale(.92)}}
      @keyframes rewardCharge{0%{transform:scale(1);filter:brightness(1)}45%{transform:scale(1.045);filter:brightness(1.22)}100%{transform:scale(1);filter:brightness(1)}}
      @keyframes rewardHalfFlip{0%{transform:rotateY(0deg) scale(1)}48%{transform:rotateY(88deg) scale(1.04)}52%{transform:rotateY(-88deg) scale(1.04)}100%{transform:rotateY(0deg) scale(1)}}
      @media(prefers-reduced-motion:reduce){.reward-sequence-overlay,.reward-sequence-stage,.reward-sequence-aura,.reward-sequence-stars,.reward-sequence-card-shell,.reward-sequence-copy h2,.reward-sequence-copy p,.reward-sequence-next{animation:none!important;transition:none!important}}
    `;
    document.head.appendChild(style);
}

export function revealRewardSequence(cards = [], options = {}) {
    ensureStyles();

    const rewards = Array.isArray(cards) ? cards.filter(Boolean) : [];
    if (!rewards.length) return Promise.resolve();

    // Preload into detached Image objects only. No upcoming card is ever
    // inserted into the visible DOM before its own reveal midpoint.
    rewards.forEach(card => preloadImage(imageUrl(card)));
    preloadImage(CARD_BACK_URL);

    return new Promise(resolve => {
        let index = 0;
        let revealed = false;
        let busy = false;
        let closed = false;

        const overlay = document.createElement("div");
        overlay.className = "reward-sequence-overlay";
        overlay.innerHTML = `
          <section class="reward-sequence-stage" role="dialog" aria-modal="true" aria-label="Booster card reveal">
            <div class="reward-sequence-aura" aria-hidden="true"></div>
            <div class="reward-sequence-stars" aria-hidden="true"></div>
            <div class="reward-sequence-progress"></div>
            <p class="reward-sequence-kicker"></p>
            <div class="reward-sequence-card-shell" role="button" tabindex="0" aria-label="Reveal card">
              <div class="reward-sequence-card-frame">
                <img class="reward-sequence-card-image" src="${CARD_BACK_URL}" alt="Starlight card back">
                <div class="reward-sequence-card-mask" aria-hidden="true"></div>
              </div>
            </div>
            <div class="reward-sequence-copy">
              <h2></h2>
              <p></p>
              <div class="reward-sequence-hint">Click the card to reveal it</div>
            </div>
            <button class="reward-sequence-next" type="button">Next Card</button>
          </section>`;

        const stage = overlay.querySelector(".reward-sequence-stage");
        const cardShell = overlay.querySelector(".reward-sequence-card-shell");
        const visibleImage = overlay.querySelector(".reward-sequence-card-image");
        const title = overlay.querySelector(".reward-sequence-copy h2");
        const detail = overlay.querySelector(".reward-sequence-copy p");
        const hint = overlay.querySelector(".reward-sequence-hint");
        const next = overlay.querySelector(".reward-sequence-next");
        const kicker = overlay.querySelector(".reward-sequence-kicker");
        const progress = overlay.querySelector(".reward-sequence-progress");

        progress.innerHTML = rewards.map(() => "<span></span>").join("");
        document.body.appendChild(overlay);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        requestAnimationFrame(() => overlay.classList.add("open"));

        const setProgress = () => {
            [...progress.children].forEach((dot, dotIndex) => {
                dot.classList.toggle("active", dotIndex <= index);
            });
        };

        const prepareCard = async () => {
            busy = true;
            revealed = false;
            const card = rewards[index];

            stage.className = `reward-sequence-stage ${rarityClass(card)}`;
            cardShell.className = "reward-sequence-card-shell";
            next.disabled = true;
            next.textContent = index === rewards.length - 1 ? "View Pack Summary" : "Next Card";

            // Important: reset the only visible image to the card back before
            // the card can enter. The next front image remains detached/preloaded.
            visibleImage.src = CARD_BACK_URL;
            visibleImage.alt = "Starlight card back";
            title.textContent = "";
            detail.textContent = "";
            hint.textContent = "Click the card to reveal it";
            kicker.textContent = `${options.title || "Booster Pack"} · Card ${index + 1} of ${rewards.length}`;
            setProgress();

            // Force the reset state to paint before entry animation starts.
            void cardShell.offsetWidth;
            cardShell.classList.add("is-entering");
            await wait(400);
            cardShell.classList.remove("is-entering");
            busy = false;
            next.disabled = false;
            play("charge");
        };

        const reveal = async () => {
            if (busy || revealed || closed) return;
            busy = true;
            const card = rewards[index];
            const frontUrl = imageUrl(card);

            // Ensure the front is decoded before the midpoint swap. If it fails,
            // use the card back rather than exposing a broken or stale image.
            const loaded = await preloadImage(frontUrl);

            cardShell.classList.add("is-charging");
            play("charge");
            await wait(330);
            cardShell.classList.remove("is-charging");
            cardShell.classList.add("is-flipping");
            play("flip");

            // Swap only while the card is edge-on. There is no second front face,
            // so the next reward cannot flash before this exact moment.
            await wait(300);
            visibleImage.src = loaded ? frontUrl : CARD_BACK_URL;
            visibleImage.alt = loaded ? `${card.name || "Reward card"} card artwork` : "Starlight card back";

            await wait(340);
            cardShell.classList.remove("is-flipping");
            cardShell.classList.add("is-revealed");
            stage.classList.add("is-revealed");

            title.textContent = card.name || "Mystery Card";
            detail.textContent = `${card.rarity || "Common"} · ${card.seriesName || "Starlight Cards"}${card.isDuplicate ? " · Duplicate" : " · New Card"}`;
            hint.textContent = index === rewards.length - 1 ? "Your pack is complete" : "Ready for the next card";
            revealed = true;
            busy = false;
            next.disabled = false;

            play(String(card.rarity || "").toLowerCase() === "legendary" ? "legendary" : "reveal");
        };

        const close = async () => {
            if (closed) return;
            closed = true;
            overlay.classList.remove("open");
            document.body.style.overflow = previousOverflow;
            await wait(300);
            overlay.remove();
            resolve();
        };

        const advance = async () => {
            if (busy || closed) return;
            if (!revealed) {
                await reveal();
                return;
            }

            if (index >= rewards.length - 1) {
                await close();
                return;
            }

            busy = true;
            next.disabled = true;
            cardShell.classList.add("is-exiting");
            await wait(290);

            index += 1;
            stage.classList.remove("is-revealed");
            cardShell.classList.remove("is-exiting", "is-revealed");
            await prepareCard();
        };

        cardShell.addEventListener("click", reveal);
        cardShell.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                reveal();
            }
        });
        next.addEventListener("click", advance);

        prepareCard();
    });
}

export function revealCard(card) {
    return revealRewardSequence([card], { title: "Card Reward" });
}
