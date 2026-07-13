import {
    getCurrentUser,
    loadCloudCollection
} from "./collection-sync.js";

const COLLECTION_KEY =
    "sora-starlight-card-binder-v5-collected";

const FAVORITES_KEY =
    "sora-starlight-card-binder-v5-favorites";

/**
 * Converts Supabase ownership rows into the object format used
 * by the original Starlight Card Binder.
 */
function createLocalStores(cloudRows) {
    const collectedCards = {};
    const favoriteCards = {};

    for (const row of cloudRows) {
        const cardId =
            String(row?.card_id || "").trim();

        if (!cardId) {
            continue;
        }

        collectedCards[cardId] = true;

        if (row.is_favorite === true) {
            favoriteCards[cardId] = true;
        }
    }

    return {
        collectedCards,
        favoriteCards
    };
}

/**
 * Downloads the signed-in user's cloud collection and mirrors
 * it into the localStorage keys already used by app.js.
 */
async function synchronizeCloudCollection() {
    const {
        user,
        error: userError
    } = await getCurrentUser();

    if (userError || !user) {
        console.log(
            "[Starlight] No signed-in account. Using the browser collection."
        );

        return {
            signedIn: false,
            synchronized: false
        };
    }

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
        favoriteCards
    } = createLocalStores(cloudRows);

    window.localStorage.setItem(
        COLLECTION_KEY,
        JSON.stringify(collectedCards)
    );

    window.localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(favoriteCards)
    );

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
 * Loads the original Binder application after cloud sync.
 */
function loadBinderApplication() {
    return new Promise((resolve, reject) => {
        const existingScript =
            document.querySelector(
                'script[data-starlight-app="true"]'
            );

        if (existingScript) {
            resolve();
            return;
        }

        const script =
            document.createElement("script");

        script.src = "./js/app.js";
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
 * app.js normally initializes through DOMContentLoaded.
 *
 * Because we intentionally load app.js after cloud sync, the real
 * DOMContentLoaded event may already have happened. This sends a
 * replacement event so the existing Binder startup code runs.
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
 * Synchronizes the cloud collection first, then loads and starts
 * the original Binder.
 *
 * If Supabase is unavailable, the Binder still starts using the
 * most recent browser copy.
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