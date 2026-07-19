import {
            getCurrentUser,
            importLegacyCollection,
            loadCatalogCards,
            loadCloudCollection,
            readLegacyCollection
        } from "../collection-sync.js";

        const accountStatus =
            document.getElementById(
                "account-status"
            );

        const localSummary =
            document.getElementById(
                "local-summary"
            );

        const localSummaryText =
            document.getElementById(
                "local-summary-text"
            );

        const localCardGrid =
            document.getElementById(
                "local-card-grid"
            );

        const noLocalCollection =
            document.getElementById(
                "no-local-collection"
            );

        const cloudSummary =
            document.getElementById(
                "cloud-summary"
            );

        const cloudSummaryText =
            document.getElementById(
                "cloud-summary-text"
            );

        const cloudCardGrid =
            document.getElementById(
                "cloud-card-grid"
            );

        const importButton =
            document.getElementById(
                "import-button"
            );

        const refreshButton =
            document.getElementById(
                "refresh-button"
            );

        const signInLink =
            document.getElementById(
                "sign-in-link"
            );

        const pageStatus =
            document.getElementById(
                "page-status"
            );

        let currentUser = null;
        let localCardIds = [];

        function displayStatus(
            message,
            type = ""
        ) {
            pageStatus.textContent = message;

            pageStatus.classList.remove(
                "success",
                "error"
            );

            if (type) {
                pageStatus.classList.add(type);
            }
        }

        function createCardElement(card) {
            const article =
                document.createElement(
                    "article"
                );

            article.className =
                "card-item";

            const image =
                document.createElement(
                    "img"
                );

            image.src =
                card.thumbnail_url ||
                card.image_url ||
                "";

            image.alt =
                `${card.name} card artwork`;

            image.loading = "lazy";

            const name =
                document.createElement(
                    "p"
                );

            name.className =
                "card-name";

            name.textContent =
                `#${card.card_number} ${card.name}`;

            const rarity =
                document.createElement(
                    "p"
                );

            rarity.className =
                "card-rarity";

            rarity.textContent =
                card.rarity;

            article.append(
                image,
                name,
                rarity
            );

            return article;
        }

        function renderCards(
            container,
            cards
        ) {
            container.replaceChildren();

            for (const card of cards) {
                container.append(
                    createCardElement(card)
                );
            }
        }

        async function loadLocalCollectionPreview() {
            const localCollection =
                readLegacyCollection();

            if (localCollection.error) {
                noLocalCollection.classList.remove(
                    "hidden"
                );

                displayStatus(
                    localCollection.error,
                    "error"
                );

                return;
            }

            localCardIds =
                localCollection.cardIds;

            if (
                !localCollection.exists ||
                localCardIds.length === 0
            ) {
                noLocalCollection.classList.remove(
                    "hidden"
                );

                importButton.classList.add(
                    "hidden"
                );

                return;
            }

            const {
                cards,
                error
            } = await loadCatalogCards(
                localCardIds
            );

            if (error) {
                displayStatus(
                    "The local collection was found, but its card information could not be loaded.",
                    "error"
                );

                return;
            }

            localSummaryText.textContent =
                `${localCardIds.length} collected card${
                    localCardIds.length === 1
                        ? ""
                        : "s"
                } found in this browser.`;

            renderCards(
                localCardGrid,
                cards
            );

            localSummary.classList.remove(
                "hidden"
            );

            if (currentUser) {
                importButton.classList.remove(
                    "hidden"
                );
            }
        }

        /**
         * Loads the cloud collection.
         *
         * announceResult controls whether the function changes the
         * page status message after loading. Importing calls this with
         * false so the import result remains visible.
         */
        async function refreshCloudCollection(
            announceResult = true
        ) {
            if (!currentUser) {
                cloudSummary.classList.add(
                    "hidden"
                );

                if (announceResult) {
                    displayStatus(
                        "Please sign in before loading a cloud collection.",
                        "error"
                    );
                }

                return;
            }

            refreshButton.disabled = true;

            if (announceResult) {
                displayStatus(
                    "Loading your cloud collection..."
                );
            }

            try {
                const {
                    cards,
                    error
                } =
                    await loadCloudCollection();

                if (error) {
                    throw error;
                }

                const catalogCards =
                    cards
                        .map(item => {
                            return item.cards;
                        })
                        .filter(Boolean);

                cloudSummaryText.textContent =
                    `${catalogCards.length} card${
                        catalogCards.length === 1
                            ? ""
                            : "s"
                    } currently saved to your account.`;

                renderCards(
                    cloudCardGrid,
                    catalogCards
                );

                cloudSummary.classList.remove(
                    "hidden"
                );

                if (announceResult) {
                    displayStatus(
                        "Cloud collection loaded.",
                        "success"
                    );
                }
            } catch (error) {
                console.error(
                    "Cloud collection refresh failed:",
                    error
                );

                displayStatus(
                    error.message ||
                        "The cloud collection could not be loaded.",
                    "error"
                );

                throw error;
            } finally {
                refreshButton.disabled = false;
            }
        }

        async function handleImport() {
            if (!currentUser) {
                displayStatus(
                    "Please sign in before importing your collection.",
                    "error"
                );

                signInLink.classList.remove(
                    "hidden"
                );

                return;
            }

            if (localCardIds.length === 0) {
                displayStatus(
                    "No collected cards were found in this browser.",
                    "error"
                );

                return;
            }

            importButton.disabled = true;
            refreshButton.disabled = true;

            importButton.textContent =
                "Importing...";

            displayStatus(
                "Securely importing your collection..."
            );

            try {
                const result =
                    await importLegacyCollection(
                        localCardIds
                    );

                let finalMessage = "";

                if (result?.alreadyImported) {
                    finalMessage =
                        "This exact browser collection was already imported. Nothing was duplicated.";
                } else {
                    const importedCount =
                        result?.importedCount ?? 0;

                    const validCount =
                        result?.validCount ?? 0;

                    finalMessage =
                        `Import complete! ${importedCount} new card${
                            importedCount === 1
                                ? ""
                                : "s"
                        } added. ${validCount} valid card${
                            validCount === 1
                                ? ""
                                : "s"
                        } were recognized.`;
                }

                /*
                 * Refresh the card display without replacing the
                 * final import result message.
                 */
                await refreshCloudCollection(false);

                displayStatus(
                    finalMessage,
                    "success"
                );
            } catch (error) {
                console.error(
                    "Import failed:",
                    error
                );

                displayStatus(
                    error.message ||
                        "The collection could not be imported.",
                    "error"
                );
            } finally {
                importButton.disabled = false;
                refreshButton.disabled = false;

                importButton.textContent =
                    "Import My Collection";
            }
        }

        async function initializePage() {
            displayStatus(
                "Checking your account and browser collection..."
            );

            const {
                user,
                error
            } = await getCurrentUser();

            if (error || !user) {
                currentUser = null;

                accountStatus.textContent =
                    "You are not currently signed in.";

                signInLink.classList.remove(
                    "hidden"
                );

                importButton.classList.add(
                    "hidden"
                );

                displayStatus(
                    "You can preview the browser collection, but you must sign in before importing it.",
                    "error"
                );
            } else {
                currentUser = user;

                accountStatus.textContent =
                    `Signed in as ${user.email}`;

                signInLink.classList.add(
                    "hidden"
                );
            }

            await loadLocalCollectionPreview();

            if (currentUser) {
                await refreshCloudCollection();
            }
        }

        importButton.addEventListener(
            "click",
            handleImport
        );

        refreshButton.addEventListener(
            "click",
            () => {
                refreshCloudCollection(true);
            }
        );

        initializePage();

