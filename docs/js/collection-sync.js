import {
    getCurrentUser,
    loadCloudCollection
} from "./collection-sync.js";

const COLLECTION_KEY =
    "sora-starlight-card-binder-v5-collected";

const FAVORITES_KEY =
    "sora-starlight-card-binder-v5-favorites";

/**
 * Loads app.js only after cloud synchronization has finished.
 *
 * app.js is intentionally loaded as a normal classic script because
 * the Binder uses global functions such as toggleCollected().
 */
function loadBinderApplication() {
    return new Promise((resolve, reject) => {
        if (
            document.querySelector(
                'script[data-starlight-app="true"]'
            )
        ) {
            resolve();
            return;
        }

        const script =
            document.createElement("script");

        script.src = "./js/app.js";
        script.async = false;

        script.dataset.starlightApp =
            "true";

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
 * Converts Supabase ownership rows into the same object format
 * already used by the original Binder.
 *
 * Example:
 * {
 *   "s01-003": true,
 *   "s01-008": true
 * }
 */
function createLocalStores(cloudRows) {
    const collectedCards = {};
    const favoriteCards = {};

    for (const row of cloudRows) {
        const cardId =
            String(
                row?.card_id || ""
            ).trim();

        if (!cardId) {
            continue;
        }

        collectedCards[cardId] =
            true;

        if (
            row.is_favorite === true
        ) {
            favoriteCards[cardId] =
                true;
        }
    }

    return {
        collectedCards,
        favoriteCards
    };
}

/**
 * Downloads the authenticated user's collection and mirrors it
 * into the local-storage format expected by app.js.
 */
async function synchronizeCloudCollection() {
    const {
        user,
        error: userError
    } = await getCurrentUser();

    if (
        userError ||
        !user
    ) {
        console.log(
            "[Starlight] No signed-in account. Using this browser's local collection."
        );

        return {
            signedIn: false,
            synchronized: false,
            cardCount: 0
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
    } = createLocalStores(
        cloudRows
    );

    window.localStorage.setItem(
        COLLECTION_KEY,
        JSON.stringify(
            collectedCards
        )
    );

    window.localStorage.setItem(
        FAVORITES_KEY,
        JSON.stringify(
            favoriteCards
        )
    );

    const cardCount =
        Object.keys(
            collectedCards
        ).length;

    const favoriteCount =
        Object.keys(
            favoriteCards
        ).length;

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
 * Performs cloud synchronization first, then starts the original
 * Binder application.
 *
 * If Supabase is temporarily unavailable, the Binder still starts
 * using the last local copy instead of becoming unusable.
 */
async function initializeStarlightBinder() {
    document.documentElement.classList.add(
        "starlight-cloud-loading"
    );

    try {
        await synchronizeCloudCollection();
    } catch (error) {
        console.error(
            "[Starlight] Cloud synchronization failed. Continuing with the local browser collection:",
            error
        );
    }

    try {
        await loadBinderApplication();
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