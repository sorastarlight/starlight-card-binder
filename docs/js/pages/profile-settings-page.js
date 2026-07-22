import {
            getMyCollectorIdentity,
            loadOwnProfile,
            loadOwnedProfileCards,
            setProfileFavoriteCard,
            updateCollectorProfile
        } from "../profile-service.js";
        import { getMyTwitchConnection } from "../twitch-service.js";

        const form =
            document.getElementById(
                "profile-form"
            );

        const usernameInput =
            document.getElementById(
                "username"
            );

        const usernameHelp =
            document.getElementById(
                "username-help"
            );

        const twitchLinkedBadge =
            document.getElementById(
                "twitch-linked-badge"
            );

        const displayNameInput =
            document.getElementById(
                "display-name"
            );

        const bioInput =
            document.getElementById(
                "bio"
            );

        const bioCount =
            document.getElementById(
                "bio-count"
            );

        const showCollectionStatsInput =
            document.getElementById(
                "show-collection-stats"
            );

        const showFavoritesInput =
            document.getElementById(
                "show-favorites"
            );

        const showFeaturedCardsInput =
            document.getElementById(
                "show-featured-cards"
            );

        const favoriteCardSelect =
            document.getElementById(
                "favorite-card"
            );

        const favoriteCardPreview =
            document.getElementById(
                "favorite-card-preview"
            );

        const favoriteCardImage =
            document.getElementById(
                "favorite-card-image"
            );

        const favoriteCardName =
            document.getElementById(
                "favorite-card-name"
            );

        const favoriteCardDetails =
            document.getElementById(
                "favorite-card-details"
            );

        const saveButton =
            document.getElementById(
                "save-profile-button"
            );

        const viewProfileLink =
            document.getElementById(
                "view-profile-link"
            );

        const viewPublicProfileCard =
            document.getElementById(
                "view-public-profile-card"
            );

        const statusElement =
            document.getElementById(
                "profile-status"
            );

        let ownedCards = [];
        let existingProfile = null;
        let usernameLocked = false;

        const DEFAULT_USERNAME_HELP =
            "Lowercase letters, numbers, and underscores only.";
        const LOCKED_USERNAME_HELP =
            "Locked to your Twitch login";

        function applyUsernameLockState(locked) {
            usernameLocked = Boolean(locked);
            usernameInput.readOnly = usernameLocked;
            usernameInput.toggleAttribute(
                "readonly",
                usernameLocked
            );
            usernameInput.classList.toggle(
                "is-locked",
                usernameLocked
            );
            if (usernameHelp) {
                usernameHelp.textContent = usernameLocked
                    ? LOCKED_USERNAME_HELP
                    : DEFAULT_USERNAME_HELP;
            }
        }

        function setTwitchLinkedBadge(linked) {
            if (!twitchLinkedBadge) return;
            const isLinked = Boolean(linked);
            twitchLinkedBadge.hidden = !isLinked;
            twitchLinkedBadge.classList.toggle(
                "hidden",
                !isLinked
            );
        }

        function escapeHtml(value) {
            return String(value ?? "").replace(
                /[&<>"']/g,
                char =>
                    ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#039;"
                    })[char]
            );
        }

        function shellCollectorHref(username) {
            const params = new URLSearchParams();
            params.set("view", "collector");
            if (username) params.set("username", username);
            return `binder.html?${params.toString()}`;
        }

        function displayStatus(
            message,
            type = ""
        ) {
            statusElement.textContent =
                message;

            statusElement.classList.remove(
                "success",
                "error"
            );

            if (type) {
                statusElement.classList.add(
                    type
                );
            }
        }

        function setLoading(
            isLoading
        ) {
            saveButton.disabled =
                isLoading;

            saveButton.textContent =
                isLoading
                    ? "Saving..."
                    : "Save Changes";
        }

        function updateBioCount() {
            bioCount.textContent =
                String(
                    bioInput.value.length
                );
        }

        function selectedVisibility() {
            return (
                document.querySelector(
                    'input[name="profile-visibility"]:checked'
                )?.value ||
                "public"
            );
        }

        function updateProfileLink(
            username
        ) {
            const href = shellCollectorHref(username);

            if (viewPublicProfileCard) {
                viewPublicProfileCard.href = username
                    ? href
                    : "binder.html?view=profile";
                if (username) {
                    viewPublicProfileCard.dataset.shellView = "collector";
                } else {
                    viewPublicProfileCard.removeAttribute("data-shell-view");
                }
            }

            if (!viewProfileLink) return;

            if (!username) {
                viewProfileLink.classList.add(
                    "hidden"
                );

                return;
            }

            viewProfileLink.href = href;
            viewProfileLink.dataset.shellView = "collector";
            viewProfileLink.classList.remove(
                "hidden"
            );
        }

        function renderFavoriteCardPreview() {
            const selectedCard =
                ownedCards.find(card => {
                    return (
                        card.id ===
                        favoriteCardSelect.value
                    );
                });

            if (!selectedCard) {
                favoriteCardPreview.classList.add(
                    "hidden"
                );

                favoriteCardImage.src =
                    "";

                favoriteCardImage.alt =
                    "";

                return;
            }

            favoriteCardImage.src =
                selectedCard.thumbnail_url ||
                selectedCard.image_url ||
                "";

            favoriteCardImage.alt =
                `${selectedCard.name} card artwork`;

            favoriteCardName.textContent =
                `#${selectedCard.card_number} ${selectedCard.name}`;

            favoriteCardDetails.textContent =
                `${selectedCard.rarity} • ${selectedCard.series_name || selectedCard.seriesName || selectedCard.series || ("Series " + (selectedCard.series_id || ""))}`;

            favoriteCardPreview.classList.remove(
                "hidden"
            );
        }

        function fillProfileForm(
            profile
        ) {
            usernameInput.value =
                profile.username || "";

            displayNameInput.value =
                profile.display_name ||
                "";

            bioInput.value =
                profile.bio ||
                "";

            showCollectionStatsInput.checked =
                profile.show_collection_stats !==
                false;

            showFavoritesInput.checked =
                profile.show_favorites !==
                false;

            showFeaturedCardsInput.checked =
                profile.show_featured_cards !==
                false;

            const visibilityInput =
                document.querySelector(
                    `input[name="profile-visibility"][value="${profile.profile_visibility || "public"}"]`
                );

            if (visibilityInput) {
                visibilityInput.checked =
                    true;
            }

            favoriteCardSelect.value =
                profile.favorite_card_id ||
                "";

            updateBioCount();
            updateProfileLink(
                profile.onboarding_complete
                    ? profile.username
                    : ""
            );

            applyUsernameLockState(
                profile.username_locked ||
                profile.usernameLocked
            );

            renderFavoriteCardPreview();
        }

        async function refreshTwitchLinkedBadge() {
            try {
                const [identity, connection] = await Promise.all([
                    getMyCollectorIdentity().catch(() => null),
                    getMyTwitchConnection().catch(() => ({ linked: false }))
                ]);
                setTwitchLinkedBadge(
                    Boolean(
                        identity?.twitchLinked ||
                        connection?.linked
                    )
                );
                if (
                    identity?.usernameLocked != null ||
                    identity?.username_locked != null
                ) {
                    applyUsernameLockState(
                        identity.usernameLocked ??
                        identity.username_locked
                    );
                }
            } catch (error) {
                console.warn(
                    "Unable to resolve Twitch linked state:",
                    error
                );
            }
        }

        async function initializePage() {
            displayStatus(
                "Loading your collector profile..."
            );

            const [
                profileResult,
                cardsResult
            ] = await Promise.all([
                loadOwnProfile(),
                loadOwnedProfileCards()
            ]);

            if (
                profileResult.error ||
                !profileResult.user ||
                !profileResult.profile
            ) {
                console.error(
                    "Unable to load profile:",
                    profileResult.error
                );

                displayStatus(
                    "Please sign in before creating a collector profile.",
                    "error"
                );

                window.setTimeout(() => {
                    window.location.href =
                        "./login.html";
                }, 1500);

                return;
            }

            existingProfile =
                profileResult.profile;

            ownedCards =
                cardsResult.cards || [];

            favoriteCardSelect.innerHTML =
                `
                    <option value="">
                        No showcase card selected
                    </option>
                ` +
                ownedCards
                    .map(card => {
                        return `
                            <option value="${escapeHtml(card.id)}">
                                #${escapeHtml(card.card_number)}
                                ${escapeHtml(card.name)}
                                — ${escapeHtml(card.rarity)}
                            </option>
                        `;
                    })
                    .join("");

            fillProfileForm(
                existingProfile
            );

            await refreshTwitchLinkedBadge();

            displayStatus(
                existingProfile.onboarding_complete
                    ? "Your profile is ready to edit."
                    : "Choose your collector identity to finish setting up your account.",
                "success"
            );
        }

        bioInput.addEventListener(
            "input",
            updateBioCount
        );

        favoriteCardSelect.addEventListener(
            "change",
            renderFavoriteCardPreview
        );

        usernameInput.addEventListener(
            "input",
            () => {
                if (usernameLocked) {
                    usernameInput.value =
                        existingProfile?.username ||
                        usernameInput.value;
                    return;
                }

                usernameInput.value =
                    usernameInput.value
                        .toLowerCase()
                        .replace(
                            /[^a-z0-9_]/g,
                            ""
                        );
            }
        );

        form.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                displayStatus("");

                const username =
                    usernameInput.value
                        .trim()
                        .toLowerCase();

                const displayName =
                    displayNameInput.value
                        .trim();

                const bio =
                    bioInput.value
                        .trim();

                if (
                    !usernameLocked &&
                    !/^[a-z0-9_]{3,24}$/.test(
                        username
                    )
                ) {
                    displayStatus(
                        "Username must be 3–24 characters using lowercase letters, numbers, or underscores.",
                        "error"
                    );

                    usernameInput.focus();
                    return;
                }

                if (
                    !displayName ||
                    displayName.length > 40
                ) {
                    displayStatus(
                        "Display name must be between 1 and 40 characters.",
                        "error"
                    );

                    displayNameInput.focus();
                    return;
                }

                if (
                    bio.length > 240
                ) {
                    displayStatus(
                        "Bio must be 240 characters or fewer.",
                        "error"
                    );

                    bioInput.focus();
                    return;
                }

                setLoading(true);

                try {
                    const result =
                        await updateCollectorProfile({
                            username,
                            displayName,
                            bio,
                            visibility:
                                selectedVisibility(),

                            showCollectionStats:
                                showCollectionStatsInput.checked,

                            showFavorites:
                                showFavoritesInput.checked,

                            showFeaturedCards:
                                showFeaturedCardsInput.checked
                        });

                    await setProfileFavoriteCard(
                        favoriteCardSelect.value ||
                        null
                    );

                    updateProfileLink(
                        result.username
                    );

                    applyUsernameLockState(
                        result.usernameLocked ??
                        result.username_locked ??
                        usernameLocked
                    );

                    displayStatus(
                        "Your profile changes were saved.",
                        "success"
                    );
                } catch (error) {
                    console.error(
                        "Profile update failed:",
                        error
                    );

                    displayStatus(
                        error.message ||
                            "Your profile could not be saved.",
                        "error"
                    );
                } finally {
                    setLoading(false);
                }
            }
        );

        initializePage();

