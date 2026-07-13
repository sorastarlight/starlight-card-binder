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
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#039;",
        '"': "&quot;"
    })[character]);
}

function rarityClass(card) {
    return `rarity-${String(card?.rarity || "common")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")}`;
}

function ensureStyles() {
    if (document.getElementById("starlight-reward-reveal-styles")) return;
    const style = document.createElement("style");
    style.id = "starlight-reward-reveal-styles";
    style.textContent = `
        .reward-reveal-overlay{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at center,rgba(120,190,255,.28),rgba(31,34,72,.88));backdrop-filter:blur(8px);opacity:0;pointer-events:none;transition:opacity .25s ease}
        .reward-reveal-overlay.open{opacity:1;pointer-events:auto}
        .reward-reveal-stage{position:relative;width:min(92vw,440px);text-align:center;color:white}
        .reward-reveal-stars{position:absolute;inset:-70px;pointer-events:none;background:radial-gradient(circle at 20% 30%,#fff 0 2px,transparent 3px),radial-gradient(circle at 78% 24%,#fff 0 2px,transparent 3px),radial-gradient(circle at 32% 82%,#ffd7f2 0 3px,transparent 4px),radial-gradient(circle at 84% 74%,#fff4b8 0 3px,transparent 4px);animation:rewardTwinkle 1.4s infinite alternate}
        .reward-reveal-card{position:relative;width:min(72vw,300px);aspect-ratio:5/7;margin:0 auto;perspective:1400px;filter:drop-shadow(0 20px 34px rgba(0,0,0,.38))}
        .reward-reveal-inner{position:absolute;inset:0;transform-style:preserve-3d;transition:transform 1s cubic-bezier(.2,.8,.2,1)}
        .reward-reveal-card.flipped .reward-reveal-inner{transform:rotateY(180deg)}
        .reward-reveal-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:18px;overflow:hidden;background:#fff}
        .reward-reveal-face img{width:100%;height:100%;object-fit:cover;display:block}
        .reward-reveal-front{transform:rotateY(180deg)}
        .reward-reveal-copy{margin-top:22px;text-shadow:0 3px 12px rgba(0,0,0,.45)}
        .reward-reveal-copy h2{margin:0;font-size:clamp(1.5rem,5vw,2.4rem)}
        .reward-reveal-copy p{margin:8px 0 0;font-weight:900}
        .reward-reveal-stage.rarity-legendary .reward-reveal-card{filter:drop-shadow(0 0 26px rgba(255,220,80,.95)) drop-shadow(0 20px 34px rgba(0,0,0,.38))}
        .reward-reveal-close{position:absolute;right:-10px;top:-55px;width:44px;height:44px;border:0;border-radius:50%;background:white;color:#405fa1;font-size:1.6rem;font-weight:900;cursor:pointer}
        .reward-reveal-hint{margin-top:14px;font-size:.9rem;opacity:.85}
        @keyframes rewardTwinkle{from{opacity:.45;transform:scale(.98) rotate(-1deg)}to{opacity:1;transform:scale(1.03) rotate(1deg)}}
        @media(prefers-reduced-motion:reduce){.reward-reveal-inner,.reward-reveal-overlay,.reward-reveal-stars{animation:none!important;transition:none!important}}
    `;
    document.head.appendChild(style);
}

function revealCard(card) {
    ensureStyles();
    return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.className = "reward-reveal-overlay";
        overlay.innerHTML = `
            <section class="reward-reveal-stage ${rarityClass(card)}" role="dialog" aria-modal="true" aria-label="Card reward reveal">
                <button class="reward-reveal-close" type="button" aria-label="Close reveal">×</button>
                <div class="reward-reveal-stars" aria-hidden="true"></div>
                <div class="reward-reveal-card">
                    <div class="reward-reveal-inner">
                        <div class="reward-reveal-face reward-reveal-back"><img src="${CARD_BACK_URL}" alt="Starlight card back"></div>
                        <div class="reward-reveal-face reward-reveal-front"><img src="${escapeHtml(card.imageUrl || card.thumbnailUrl || CARD_BACK_URL)}" alt="${escapeHtml(card.name || "Reward card")}"></div>
                    </div>
                </div>
                <div class="reward-reveal-copy">
                    <h2>Card of Starlight... RELEASE!</h2>
                    <p>${escapeHtml(card.name || "Mystery Card")} · ${escapeHtml(card.rarity || "Common")}</p>
                    <div class="reward-reveal-hint">Click anywhere to continue</div>
                </div>
            </section>`;

        document.body.appendChild(overlay);
        document.body.style.overflow = "hidden";
        requestAnimationFrame(() => overlay.classList.add("open"));
        play("charge");

        const cardElement = overlay.querySelector(".reward-reveal-card");
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            overlay.classList.remove("open");
            document.body.style.overflow = "";
            window.setTimeout(() => {
                overlay.remove();
                resolve();
            }, 220);
        };

        window.setTimeout(() => {
            cardElement.classList.add("flipped");
            play("flip");
            window.setTimeout(() => play(String(card.rarity).toLowerCase() === "legendary" ? "legendary" : "reveal"), 500);
        }, 900);

        window.setTimeout(() => {
            overlay.addEventListener("click", finish, { once: true });
        }, 1200);
        overlay.querySelector(".reward-reveal-close").addEventListener("click", event => {
            event.stopPropagation();
            finish();
        });
    });
}

export async function revealRewardSequence(cards = []) {
    for (const card of cards) {
        await revealCard(card);
    }
}

export { revealCard };
