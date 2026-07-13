import {
    getCurrentUser,
    loadCloudCollection
} from "./collection-sync.js";

const COLLECTION_KEY =
    "sora-starlight-card-binder-v5-collected";

const FAVORITES_KEY =
    "sora-starlight-card-binder-v5-favorites";

async function bootstrapCloudCollection() {
    try {
        const { user } =
            await getCurrentUser();

        if (!user) {
            return;
        }

        const {
            cards,
            error
        } = await loadCloudCollection();

        if (error) {
            console.error(
                "Unable to load cloud collection:",
                error
            );
            return;
        }

        const collectedCards = {};
        const favoriteCards = {};

        for (const entry of cards) {
            if (!entry?.card_id) {
                continue;
            }

            collectedCards[
                entry.card_id
            ] = true;

            if (
                entry.is_favorite === true
            ) {
                favoriteCards[
                    entry.card_id
                ] = true;
            }
        }

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

        console.log(
            "[Starlight] Cloud collection synchronized:",
            Object.keys(
                collectedCards
            ).length,
            "cards"
        );
    }
    catch (error) {
        console.error(
            "[Starlight] Cloud bootstrap failed:",
            error
        );
    }
}

await bootstrapCloudCollection();

window.dispatchEvent(
    new CustomEvent(
        "starlight-cloud-ready"
    )
);