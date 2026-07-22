import {
            loadOwnProfile,
            loadOwnedProfileCards,
            loadPublicCollectorProfile
        } from "../profile-service.js";
        import {
            followCollector,
            getPublicCollectorSocial,
            sendPeerGift,
            unfollowCollector
        } from "../social-service.js";
        import { supabase } from "../supabase-client.js";

        const loadingState =
            document.getElementById(
                "loading-state"
            );

        const missingState =
            document.getElementById(
                "missing-state"
            );

        const privateState =
            document.getElementById(
                "private-state"
            );

        const errorState =
            document.getElementById(
                "error-state"
            );

        const errorMessage =
            document.getElementById(
                "error-message"
            );

        const retryButton =
            document.getElementById(
                "retry-button"
            );

        const profileContent =
            document.getElementById(
                "profile-content"
            );

        const displayNameElement =
            document.getElementById(
                "collector-display-name"
            );

        const usernameElement =
            document.getElementById(
                "collector-username"
            );

        const bioElement =
            document.getElementById(
                "collector-bio"
            );

        const memberElement =
            document.getElementById(
                "collector-member"
            );

        const avatarElement =
            document.getElementById(
                "collector-avatar"
            );

        const statsSection =
            document.getElementById(
                "stats-section"
            );

        const showcaseSection =
            document.getElementById(
                "showcase-section"
            );

        const raritySection =
            document.getElementById(
                "rarity-section"
            );

        const seriesSection =
            document.getElementById(
                "series-section"
            );

        const favoritesSection =
            document.getElementById(
                "favorites-section"
            );

        const uniqueCardCount =
            document.getElementById(
                "unique-card-count"
            );

        const totalCopyCount =
            document.getElementById(
                "total-copy-count"
            );

        const catalogTotal =
            document.getElementById(
                "catalog-total"
            );

        const completionPercent =
            document.getElementById(
                "completion-percent"
            );

        const showcaseCardImage =
            document.getElementById(
                "showcase-card-image"
            );

        const showcaseCardName =
            document.getElementById(
                "showcase-card-name"
            );

        const showcaseCardDetails =
            document.getElementById(
                "showcase-card-details"
            );

        const showcaseCardDescription =
            document.getElementById(
                "showcase-card-description"
            );

        const showcaseCardArtist =
            document.getElementById(
                "showcase-card-artist"
            );

        const rarityGrid =
            document.getElementById(
                "rarity-grid"
            );

        const seriesList =
            document.getElementById(
                "series-list"
            );

        const favoriteGrid =
            document.getElementById(
                "favorite-grid"
            );

        const highlightsSection =
            document.getElementById("highlights-section");
        const highlightGrid =
            document.getElementById("highlight-grid");
        const followMeta =
            document.getElementById("collector-follow-meta");
        const socialActions =
            document.getElementById("collector-social-actions");
        const followButton =
            document.getElementById("follow-button");
        const giftButton =
            document.getElementById("gift-button");
        const giftDialog =
            document.getElementById("gift-dialog");
        const giftForm =
            document.getElementById("gift-form");
        const giftType =
            document.getElementById("gift-type");
        const giftAmountWrap =
            document.getElementById("gift-amount-wrap");
        const giftCardWrap =
            document.getElementById("gift-card-wrap");
        const giftStatus =
            document.getElementById("gift-status");
        const giftCardSelect =
            document.getElementById("gift-card-id");
        const giftAmountInput =
            document.getElementById("gift-amount");
        const giftBalanceHint =
            document.getElementById("gift-balance-hint");
        const giftCardHint =
            document.getElementById("gift-card-hint");
        const giftRecipientLabel =
            document.getElementById("gift-recipient-label");
        const giftSendButton =
            document.getElementById("gift-send-button");
        const giftPresets =
            document.getElementById("gift-presets");

        let activeUsername = "";
        let followState = false;
        let starBitsBalance = 0;

        function escapeHtml(value) {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;");
        }

        function syncGiftTypeUi() {
            const isCard = giftType?.value === "card";
            if (giftAmountWrap) giftAmountWrap.hidden = isCard;
            if (giftCardWrap) giftCardWrap.hidden = !isCard;
        }

        async function prepareGiftDialog() {
            if (giftRecipientLabel) {
                giftRecipientLabel.textContent = activeUsername
                    ? `@${activeUsername}`
                    : "this collector";
            }
            if (giftStatus) giftStatus.textContent = "";
            if (giftBalanceHint) giftBalanceHint.textContent = "Loading your Star Bits balance…";
            if (giftCardSelect) {
                giftCardSelect.innerHTML = `<option value="">Loading duplicates…</option>`;
                giftCardSelect.disabled = true;
            }
            if (giftSendButton) giftSendButton.disabled = true;
            syncGiftTypeUi();

            const [{ data: auth }, cardsResult] = await Promise.all([
                supabase.auth.getUser(),
                loadOwnedProfileCards()
            ]);

            if (!auth?.user) {
                if (giftStatus) giftStatus.textContent = "Sign in to send a gift.";
                if (giftBalanceHint) giftBalanceHint.textContent = "Sign in required.";
                if (giftCardSelect) {
                    giftCardSelect.innerHTML = `<option value="">Sign in to gift cards</option>`;
                }
                return;
            }

            const { data: wallet } = await supabase
                .from("user_wallets")
                .select("star_bits")
                .eq("user_id", auth.user.id)
                .maybeSingle();

            starBitsBalance = Number(wallet?.star_bits || 0);
            if (giftBalanceHint) {
                giftBalanceHint.textContent = `You have ${starBitsBalance.toLocaleString()} Star Bits available.`;
            }
            if (giftAmountInput) {
                const current = Number(giftAmountInput.value || 100);
                giftAmountInput.max = String(Math.max(1, starBitsBalance || 1));
                if (current > starBitsBalance && starBitsBalance > 0) {
                    giftAmountInput.value = String(Math.min(100, starBitsBalance));
                }
            }

            const duplicates = (cardsResult.cards || [])
                .filter((card) => Number(card.quantity || 0) > 1)
                .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));

            if (giftCardSelect) {
                if (!duplicates.length) {
                    giftCardSelect.innerHTML = `<option value="">No duplicate cards available</option>`;
                    giftCardSelect.disabled = true;
                    if (giftCardHint) {
                        giftCardHint.textContent = "Open packs to build extras you can gift.";
                    }
                } else {
                    giftCardSelect.innerHTML =
                        `<option value="">Select a duplicate…</option>` +
                        duplicates.map((card) => {
                            const extras = Math.max(0, Number(card.quantity || 0) - 1);
                            return `<option value="${escapeHtml(card.id)}">#${escapeHtml(card.card_number)} ${escapeHtml(card.name)} — ${escapeHtml(card.rarity)} (×${extras} extra${extras === 1 ? "" : "s"})</option>`;
                        }).join("");
                    giftCardSelect.disabled = false;
                    if (giftCardHint) {
                        giftCardHint.textContent = `${duplicates.length} duplicate card${duplicates.length === 1 ? "" : "s"} ready to gift.`;
                    }
                }
            }

            if (giftSendButton) giftSendButton.disabled = false;
        }

        const username =
            new URLSearchParams(
                window.location.search
            )
                .get("username")
                ?.trim()
                .toLowerCase() ||
            "";

        function hideAllStates() {
            loadingState.classList.add(
                "hidden"
            );

            missingState.classList.add(
                "hidden"
            );

            privateState.classList.add(
                "hidden"
            );

            errorState.classList.add(
                "hidden"
            );

            profileContent.classList.add(
                "hidden"
            );
        }

        function formatMemberDate(value) {
            if (!value) {
                return "";
            }

            const date =
                new Date(value);

            if (
                Number.isNaN(
                    date.getTime()
                )
            ) {
                return "";
            }

            return date.toLocaleDateString(
                undefined,
                {
                    year: "numeric",
                    month: "long"
                }
            );
        }

        function getInitial(
            displayName
        ) {
            const firstCharacter =
                String(displayName || "")
                    .trim()
                    .charAt(0)
                    .toUpperCase();

            return firstCharacter || "✦";
        }

        function renderRarityCounts(
            rarityCounts
        ) {
            const rarityOrder = [
                "Common",
                "Uncommon",
                "Rare",
                "Epic",
                "Legendary"
            ];

            rarityGrid.replaceChildren();

            for (const rarity of rarityOrder) {
                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    `rarity-count rarity-${rarity.toLowerCase()}`;

                const label =
                    document.createElement(
                        "span"
                    );

                label.textContent =
                    rarity;

                const count =
                    document.createElement(
                        "strong"
                    );

                count.textContent =
                    String(
                        rarityCounts?.[rarity] ??
                        0
                    );

                item.append(
                    label,
                    count
                );

                rarityGrid.append(item);
            }
        }

        function renderSeriesProgress(
            seriesProgress
        ) {
            seriesList.replaceChildren();

            for (
                const series of
                seriesProgress || []
            ) {
                const owned =
                    Number(series.owned || 0);

                const total =
                    Number(series.total || 0);

                const percent =
                    total > 0
                        ? Math.round(
                            (
                                owned /
                                total
                            ) * 100
                        )
                        : 0;

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "series-row";

                const header =
                    document.createElement(
                        "div"
                    );

                header.className =
                    "series-row-header";

                const name =
                    document.createElement(
                        "span"
                    );

                name.textContent =
                    `Series ${series.seriesId}: ${series.seriesName}`;

                const count =
                    document.createElement(
                        "span"
                    );

                count.textContent =
                    `${owned} / ${total}`;

                header.append(
                    name,
                    count
                );

                const bar =
                    document.createElement(
                        "div"
                    );

                bar.className =
                    "series-bar";

                const fill =
                    document.createElement(
                        "span"
                    );

                fill.style.width =
                    `${percent}%`;

                bar.append(fill);

                row.append(
                    header,
                    bar
                );

                seriesList.append(row);
            }
        }

        function renderFavoriteCards(
            cards
        ) {
            favoriteGrid.replaceChildren();

            for (const card of cards || []) {
                const article =
                    document.createElement(
                        "article"
                    );

                article.className =
                    "favorite-card";

                const image =
                    document.createElement(
                        "img"
                    );

                image.src =
                    card.thumbnailUrl ||
                    card.imageUrl ||
                    "";

                image.alt =
                    `${card.name} card artwork`;

                image.loading =
                    "lazy";

                const name =
                    document.createElement(
                        "h3"
                    );

                name.textContent =
                    `#${card.cardNumber} ${card.name}`;

                const details =
                    document.createElement(
                        "p"
                    );

                details.textContent =
                    `${card.rarity} • ${card.seriesName}`;

                article.append(
                    image,
                    name,
                    details
                );

                favoriteGrid.append(
                    article
                );
            }
        }

        function cardTile(card, eyebrow) {
            if (!card) return "";
            const image = card.thumbnailUrl || card.imageUrl || "";
            return `<article class="highlight-card">
              <p class="eyebrow">${eyebrow}</p>
              ${image ? `<img src="${image.replaceAll('"','&quot;')}" alt="">` : '<div class="highlight-fallback">✦</div>'}
              <strong>${String(card.name || "").replaceAll("<","&lt;")}</strong>
              <span>${String(card.rarity || "")}${card.seriesName ? ` · ${card.seriesName}` : ""}</span>
            </article>`;
        }

        function renderSocialHighlights(social) {
            if (!highlightsSection || !highlightGrid) return;
            highlightGrid.replaceChildren();
            highlightsSection.classList.add("hidden");
            if (!social || social.private || !social.found) {
                if (followMeta) followMeta.hidden = true;
                if (socialActions) socialActions.hidden = true;
                return;
            }

            activeUsername = social.profile?.username || username;
            followState = Boolean(social.follow?.following);
            const followers = Number(social.follow?.followerCount || 0);
            const following = Number(social.follow?.followingCount || 0);
            if (followMeta) {
                followMeta.hidden = false;
                followMeta.textContent = `${followers} follower${followers === 1 ? "" : "s"} · ${following} following`;
            }
            if (socialActions) {
                socialActions.hidden = Boolean(social.isSelf);
            }
            if (followButton) {
                followButton.textContent = followState ? "Following" : "Follow";
                followButton.setAttribute("aria-pressed", followState ? "true" : "false");
            }

            const parts = [];
            if (social.favoriteSeries?.name) {
                parts.push(`<article class="highlight-card"><p class="eyebrow">Favorite Series</p><strong>${String(social.favoriteSeries.name).replaceAll("<","&lt;")}</strong><span>Chosen showcase series</span></article>`);
            }
            if (social.favoriteCharacter) {
                parts.push(`<article class="highlight-card"><p class="eyebrow">Favorite Character</p><strong>${String(social.favoriteCharacter).replaceAll("<","&lt;")}</strong><span>Collector favorite</span></article>`);
            }
            if (social.mostRarePull) parts.push(cardTile(social.mostRarePull, "Most Rare Pull"));
            if (social.newestPull) parts.push(cardTile(social.newestPull, "Newest Pull"));
            const streak = Number(social.pullStreakDays || 0);
            if (streak > 0) {
                parts.push(`<article class="highlight-card"><p class="eyebrow">Pull Streak</p><strong>Opened packs ${streak} day${streak === 1 ? "" : "s"} in a row</strong><span>Daily Booster streak</span></article>`);
            }
            if (social.profile?.memberSince) {
                const joined = formatMemberDate(social.profile.memberSince);
                if (joined) {
                    parts.push(`<article class="highlight-card"><p class="eyebrow">Joined</p><strong>${joined}</strong><span>Member since</span></article>`);
                }
            }

            if (!parts.length) return;
            highlightGrid.innerHTML = parts.join("");
            highlightsSection.classList.remove("hidden");
        }

        function renderProfile(result) {
            const profile =
                result.profile;

            const collection =
                result.collection;

            const showcaseCard =
                result.showcaseCard;

            const favoriteCards =
                result.favoriteCards || [];

            document.title =
                `${profile.displayName} | Starlight Card Binder`;

            displayNameElement.textContent =
                profile.displayName ||
                profile.username;

            usernameElement.textContent =
                `@${profile.username}`;

            const proposeTradeButton = document.getElementById('propose-trade-button');
            const reportProfileButton = document.getElementById('report-profile-button');
            const tradeSelfNote = document.getElementById('trade-self-note');
            const isSelf = Boolean(result.isSelf);
            if (proposeTradeButton && profile.username) {
                if (isSelf) {
                    proposeTradeButton.hidden = true;
                    proposeTradeButton.removeAttribute('href');
                } else {
                    proposeTradeButton.hidden = false;
                    const tradeUrl = `binder.html?view=offers&username=${encodeURIComponent(profile.username)}`;
                    proposeTradeButton.href = tradeUrl;
                    proposeTradeButton.onclick = event => {
                        if (window.parent !== window) {
                            event.preventDefault();
                            window.parent.postMessage({
                                type: 'starlight-navigate',
                                view: 'offers',
                                params: { username: profile.username }
                            }, window.location.origin);
                        }
                    };
                }
            }
            if (tradeSelfNote) tradeSelfNote.classList.toggle('hidden', !isSelf);
            if (reportProfileButton && profile.username) {
                if (isSelf) {
                    reportProfileButton.hidden = true;
                } else {
                    reportProfileButton.hidden = false;
                    const reportUrl = `binder.html?view=report&username=${encodeURIComponent(profile.username)}`;
                    reportProfileButton.href = reportUrl;
                    reportProfileButton.onclick = event => {
                        if (window.parent !== window) {
                            event.preventDefault();
                            window.parent.postMessage({
                                type: 'starlight-navigate',
                                view: 'report',
                                params: { username: profile.username }
                            }, window.location.origin);
                        }
                    };
                }
            }

            bioElement.textContent =
                profile.bio ||
                "A Starlight Card collector.";

            const memberDate =
                formatMemberDate(
                    profile.memberSince
                );

            memberElement.textContent =
                memberDate
                    ? `Joined ${memberDate}`
                    : "";

            avatarElement.textContent = '✦';
            avatarElement.classList.remove('has-photo');

            renderSocialHighlights(result.social || null);

            if (
                profile.showCollectionStats &&
                collection
            ) {
                uniqueCardCount.textContent =
                    String(
                        collection.uniqueCards ??
                        0
                    );

                totalCopyCount.textContent =
                    String(
                        collection.totalCopies ??
                        0
                    );

                catalogTotal.textContent =
                    String(
                        collection.catalogTotal ??
                        0
                    );

                completionPercent.textContent =
                    `${collection.completionPercent ?? 0}%`;

                renderRarityCounts(
                    collection.rarityCounts
                );

                renderSeriesProgress(
                    collection.seriesProgress
                );

                statsSection.classList.remove(
                    "hidden"
                );

                raritySection.classList.remove(
                    "hidden"
                );

                seriesSection.classList.remove(
                    "hidden"
                );
            }

            if (
                profile.showFeaturedCards &&
                showcaseCard
            ) {
                showcaseCardImage.src =
                    showcaseCard.imageUrl ||
                    showcaseCard.thumbnailUrl ||
                    "";

                showcaseCardImage.alt =
                    `${showcaseCard.name} card artwork`;

                showcaseCardName.textContent =
                    `#${showcaseCard.cardNumber} ${showcaseCard.name}`;

                showcaseCardDetails.textContent =
                    `${showcaseCard.rarity} • ${showcaseCard.seriesName}`;

                showcaseCardDescription.textContent =
                    showcaseCard.description ||
                    "";

                showcaseCardArtist.textContent =
                    showcaseCard.artist
                        ? `Artwork by ${showcaseCard.artist}`
                        : "";

                showcaseSection.classList.remove(
                    "hidden"
                );
            }

            if (
                profile.showFavorites &&
                favoriteCards.length > 0
            ) {
                renderFavoriteCards(
                    favoriteCards
                );

                favoritesSection.classList.remove(
                    "hidden"
                );
            }

            profileContent.classList.remove(
                "hidden"
            );
        }

        async function loadProfile() {
            hideAllStates();

            loadingState.classList.remove(
                "hidden"
            );

            if (!username) {
                hideAllStates();

                missingState.classList.remove(
                    "hidden"
                );

                return;
            }

            const {
                result,
                error
            } =
                await loadPublicCollectorProfile(
                    username
                );

            let social = null;
            try {
                social = await getPublicCollectorSocial(username);
            } catch (socialError) {
                console.warn("[Starlight] Social profile unavailable", socialError);
            }

            let isSelf = Boolean(social?.isSelf);
            if (!isSelf) {
                try {
                    const own = await loadOwnProfile();
                    const ownUsername = String(own?.profile?.username || '').trim().toLowerCase();
                    isSelf = Boolean(ownUsername && ownUsername === String(username).trim().toLowerCase());
                } catch {
                    isSelf = false;
                }
            }

            hideAllStates();

            if (error) {
                errorMessage.textContent =
                    error.message ||
                    "Something went wrong while loading this profile.";

                errorState.classList.remove(
                    "hidden"
                );

                return;
            }

            if (result) {
                result.isSelf = isSelf;
                result.social = social;
            }

            if (
                !result ||
                result.found !== true
            ) {
                missingState.classList.remove(
                    "hidden"
                );

                return;
            }

            if (result.private === true) {
                privateState.classList.remove(
                    "hidden"
                );

                return;
            }

            renderProfile(result);
        }

        followButton?.addEventListener("click", async () => {
            if (!activeUsername) return;
            followButton.disabled = true;
            try {
                if (followState) {
                    await unfollowCollector(activeUsername);
                    followState = false;
                } else {
                    await followCollector(activeUsername);
                    followState = true;
                }
                followButton.textContent = followState ? "Following" : "Follow";
                followButton.setAttribute("aria-pressed", followState ? "true" : "false");
                const social = await getPublicCollectorSocial(activeUsername);
                renderSocialHighlights(social);
            } catch (error) {
                alert(error.message || "Could not update follow.");
            } finally {
                followButton.disabled = false;
            }
        });

        giftButton?.addEventListener("click", async () => {
            if (!giftDialog) return;
            giftDialog.showModal();
            try {
                await prepareGiftDialog();
            } catch (error) {
                if (giftStatus) giftStatus.textContent = error.message || "Could not prepare gift form.";
            }
        });

        giftType?.addEventListener("change", syncGiftTypeUi);

        giftPresets?.addEventListener("click", (event) => {
            const button = event.target.closest("[data-gift-preset]");
            if (!button || !giftAmountInput) return;
            const amount = Number(button.dataset.giftPreset || 0);
            if (!amount) return;
            giftAmountInput.value = String(
                starBitsBalance > 0 ? Math.min(amount, starBitsBalance) : amount
            );
        });

        giftForm?.addEventListener("submit", async (event) => {
            const submitter = event.submitter;
            if (submitter?.value === "cancel") return;
            event.preventDefault();
            if (!activeUsername) return;
            const type = giftType?.value || "star_bits";
            const amount = Number(giftAmountInput?.value || 0);
            const cardId = giftCardSelect?.value || null;

            if (type === "star_bits") {
                if (!amount || amount < 1) {
                    if (giftStatus) giftStatus.textContent = "Enter a Star Bits amount.";
                    return;
                }
                if (amount > starBitsBalance) {
                    if (giftStatus) giftStatus.textContent = "That amount is higher than your balance.";
                    return;
                }
            }
            if (type === "card" && !cardId) {
                if (giftStatus) giftStatus.textContent = "Choose a duplicate card to gift.";
                return;
            }

            if (giftStatus) giftStatus.textContent = "Sending gift…";
            if (giftSendButton) giftSendButton.disabled = true;
            try {
                await sendPeerGift({
                    username: activeUsername,
                    giftType: type,
                    amount,
                    cardId,
                    message: document.getElementById("gift-message")?.value || null
                });
                if (giftStatus) giftStatus.textContent = "Gift sent! It will appear in their Received Gifts.";
                setTimeout(() => giftDialog?.close(), 900);
            } catch (error) {
                if (giftStatus) giftStatus.textContent = error.message || "Could not send gift.";
                if (giftSendButton) giftSendButton.disabled = false;
            }
        });

        retryButton.addEventListener(
            "click",
            loadProfile
        );

        loadProfile();

