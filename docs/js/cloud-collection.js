import { supabase } from "./supabase-client.js";
import "./card-catalog-service.js";

import {
    getCurrentUser,
    loadCloudCollection
} from "./collection-sync.js";

const COLLECTION_KEY =
    "sora-starlight-card-binder-v5-collected";

const FAVORITES_KEY =
    "sora-starlight-card-binder-v5-favorites";

const QUANTITIES_KEY =
    "sora-starlight-card-binder-v80-quantities";

const FAVORITE_CHECK_INTERVAL_MS = 1500;

let currentUser = null;
let favoriteMonitorTimer = null;
let previousFavoriteStore = {};
let favoriteSyncQueue = Promise.resolve();

/**
 * Safely reads one of the Binder's object-based localStorage values.
 */
function readLocalObject(key) {
    try {
        const rawValue =
            window.localStorage.getItem(key);

        if (!rawValue) {
            return {};
        }

        const parsedValue =
            JSON.parse(rawValue);

        if (
            !parsedValue ||
            typeof parsedValue !== "object" ||
            Array.isArray(parsedValue)
        ) {
            return {};
        }

        return parsedValue;
    } catch (error) {
        console.error(
            `[Starlight] Unable to read ${key}:`,
            error
        );

        return {};
    }
}

/**
 * Writes one of the Binder's object-based localStorage values.
 */
function writeLocalObject(key, value) {
    window.localStorage.setItem(
        key,
        JSON.stringify(value)
    );
}

/**
 * Converts Supabase ownership rows into the formats already used
 * by the original Binder.
 */
function createLocalStores(cloudRows) {
    const collectedCards = {};
    const favoriteCards = {};
    const quantities = {};

    for (const row of cloudRows) {
        const cardId =
            String(row?.card_id || "").trim();

        if (!cardId) {
            continue;
        }

        collectedCards[cardId] = true;
        quantities[cardId] = Math.max(1, Number(row.quantity || 1));

        if (row.is_favorite === true) {
            favoriteCards[cardId] = true;
        }
    }

    return {
        collectedCards,
        favoriteCards,
        quantities
    };
}

/**
 * Downloads the signed-in user's cloud collection and mirrors it
 * into the localStorage keys used by app.js.
 */
async function synchronizeCloudCollection() {
    const {
        user,
        error: userError
    } = await getCurrentUser();

    if (userError || !user) {
        currentUser = null;

        console.log(
            "[Starlight] No signed-in account. Using the browser collection."
        );

        return {
            signedIn: false,
            synchronized: false
        };
    }

    currentUser = user;

    console.log(
        "[Starlight] Signed in as:",
        user.email
    );

    const {
        cards,
        error: collectionError
    } = await loadCloudCollection();

    if (collectionError) {
        throw collectionError;
    }

    const cloudRows =
        Array.isArray(cards)
            ? cards
            : [];

    const {
        collectedCards,
        favoriteCards,
        quantities
    } = createLocalStores(cloudRows);

    writeLocalObject(
        COLLECTION_KEY,
        collectedCards
    );

    writeLocalObject(
        FAVORITES_KEY,
        favoriteCards
    );

    writeLocalObject(
        QUANTITIES_KEY,
        quantities
    );

    previousFavoriteStore = {
        ...favoriteCards
    };

    const cardCount =
        Object.keys(collectedCards).length;

    const favoriteCount =
        Object.keys(favoriteCards).length;

    console.log(
        `[Starlight] Cloud synchronization complete: ${cardCount} collected card(s), ${favoriteCount} favorite card(s).`
    );

    return {
        signedIn: true,
        synchronized: true,
        cardCount,
        favoriteCount
    };
}

/**
 * Saves one favorite change through the protected Supabase
 * database function.
 */
async function saveFavoriteToCloud(
    cardId,
    favoriteState,
    previousState
) {
    const {
        data,
        error
    } = await supabase.rpc(
        "set_card_favorite",
        {
            requested_card_id: cardId,
            favorite_state: favoriteState
        }
    );

    if (error) {
        console.error(
            `[Starlight] Favorite sync failed for ${cardId}:`,
            error
        );

        /*
         * Roll the browser state back if Supabase rejects the change.
         * This normally happens if the account does not own the card.
         */
        const correctedStore =
            readLocalObject(FAVORITES_KEY);

        if (previousState) {
            correctedStore[cardId] = true;
        } else {
            delete correctedStore[cardId];
        }

        previousFavoriteStore = {
            ...correctedStore
        };

        writeLocalObject(
            FAVORITES_KEY,
            correctedStore
        );

        if (
            typeof window.renderAll ===
            "function"
        ) {
            window.renderAll();
        }

        return;
    }

    console.log(
        `[Starlight] Favorite synchronized: ${cardId} = ${favoriteState}`,
        data
    );
}

/**
 * Detects changes made by app.js to the local favorites object and
 * sends those changes to Supabase.
 */
function checkForFavoriteChanges() {
    if (document.hidden) {
        return;
    }

    if (!currentUser) {
        return;
    }

    const latestFavoriteStore =
        readLocalObject(FAVORITES_KEY);

    const allCardIds =
        new Set([
            ...Object.keys(previousFavoriteStore),
            ...Object.keys(latestFavoriteStore)
        ]);

    const changes = [];

    for (const cardId of allCardIds) {
        const previousState =
            previousFavoriteStore[cardId] === true;

        const latestState =
            latestFavoriteStore[cardId] === true;

        if (previousState === latestState) {
            continue;
        }

        changes.push({
            cardId,
            previousState,
            latestState
        });
    }

    if (changes.length === 0) {
        return;
    }

    /*
     * Update our snapshot immediately so the same UI change is not
     * submitted repeatedly while the network request is running.
     */
    previousFavoriteStore = {
        ...latestFavoriteStore
    };

    for (const change of changes) {
        favoriteSyncQueue =
            favoriteSyncQueue
                .then(() => {
                    return saveFavoriteToCloud(
                        change.cardId,
                        change.latestState,
                        change.previousState
                    );
                })
                .catch(error => {
                    console.error(
                        "[Starlight] Favorite synchronization queue failed:",
                        error
                    );
                });
    }
}

/**
 * Watches the favorite storage object for changes made by app.js.
 */
function startFavoriteMonitor() {
    if (
        !currentUser ||
        favoriteMonitorTimer
    ) {
        return;
    }

    previousFavoriteStore =
        readLocalObject(FAVORITES_KEY);

    favoriteMonitorTimer =
        window.setInterval(
            checkForFavoriteChanges,
            FAVORITE_CHECK_INTERVAL_MS
        );

    console.log(
        "[Starlight] Cloud favorite synchronization enabled."
    );
}

/**
 * Loads the original Binder application after cloud sync.
 */
async function loadBinderApplication() {
    const existingScript =
        document.querySelector(
            'script[data-starlight-app="true"]'
        );

    if (existingScript) {
        return;
    }

    window.StarlightCardFilters = await import('./card-filter-utils.js?v=1.0.0');
    window.StarlightFavoriteUtils = await import('./favorite-utils.js?v=1.0.0');

    return new Promise((resolve, reject) => {
        const script =
            document.createElement("script");

        script.src = "./js/app.js?v=1.5.3";
        script.async = false;
        script.dataset.starlightApp = "true";

        script.addEventListener(
            "load",
            () => {
                console.log(
                    "[Starlight] Binder application loaded."
                );

                resolve();
            },
            {
                once: true
            }
        );

        script.addEventListener(
            "error",
            () => {
                reject(
                    new Error(
                        "The Binder application could not be loaded."
                    )
                );
            },
            {
                once: true
            }
        );

        document.body.appendChild(script);
    });
}

/**
 * app.js normally initializes through DOMContentLoaded. Because it
 * loads after cloud synchronization, we send a replacement event.
 */
function startBinderApplication() {
    if (document.readyState === "loading") {
        return;
    }

    console.log(
        "[Starlight] Starting Binder application."
    );

    document.dispatchEvent(
        new Event("DOMContentLoaded")
    );
}

/**
 * Synchronizes cloud ownership, starts the original Binder, and
 * then begins monitoring favorites.
 */
async function initializeStarlightBinder() {
    document.documentElement.classList.add(
        "starlight-cloud-loading"
    );

    try {
        await synchronizeCloudCollection();
    } catch (error) {
        console.error(
            "[Starlight] Cloud synchronization failed. Continuing with the browser collection:",
            error
        );
    }

    try {
        await loadBinderApplication();

        startBinderApplication();

        startFavoriteMonitor();
    } catch (error) {
        console.error(
            "[Starlight] Binder startup failed:",
            error
        );
    } finally {
        document.documentElement.classList.remove(
            "starlight-cloud-loading"
        );

        window.dispatchEvent(
            new CustomEvent(
                "starlight-cloud-ready"
            )
        );
    }
}

initializeStarlightBinder();
