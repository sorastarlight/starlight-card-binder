import { supabase } from "./supabase-client.js";

const LOCAL_COLLECTION_KEY =
    "sora-starlight-card-binder-v5-collected";

/**
 * Reads the old V79.9 collection from localStorage.
 *
 * Expected format:
 * {
 *   "s01-003": true,
 *   "s01-008": true
 * }
 */
export function readLegacyCollection() {
    const rawValue =
        window.localStorage.getItem(
            LOCAL_COLLECTION_KEY
        );

    if (!rawValue) {
        return {
            exists: false,
            cardIds: [],
            rawValue: null
        };
    }

    try {
        const parsedValue = JSON.parse(rawValue);

        if (
            !parsedValue ||
            typeof parsedValue !== "object" ||
            Array.isArray(parsedValue)
        ) {
            throw new Error(
                "The saved collection is not in the expected format."
            );
        }

        const cardIds = Object.entries(parsedValue)
            .filter(([, isCollected]) => {
                return isCollected === true;
            })
            .map(([cardId]) => {
                return String(cardId).trim();
            })
            .filter(Boolean)
            .filter((cardId, index, allCardIds) => {
                return allCardIds.indexOf(cardId) === index;
            })
            .sort();

        return {
            exists: true,
            cardIds,
            rawValue
        };
    } catch (error) {
        console.error(
            "Unable to read the local collection:",
            error
        );

        return {
            exists: true,
            cardIds: [],
            rawValue,
            error:
                "The browser collection exists, but it could not be read."
        };
    }
}

/**
 * Creates a repeatable SHA-256 hash for the import.
 *
 * Importing the same exact local collection twice will produce
 * the same hash, allowing Supabase to reject duplicate imports.
 */
export async function createCollectionHash(cardIds) {
    const normalizedValue =
        JSON.stringify(
            [...cardIds].sort()
        );

    const encodedValue =
        new TextEncoder().encode(
            normalizedValue
        );

    const hashBuffer =
        await window.crypto.subtle.digest(
            "SHA-256",
            encodedValue
        );

    return Array.from(
        new Uint8Array(hashBuffer)
    )
        .map(byte => {
            return byte
                .toString(16)
                .padStart(2, "0");
        })
        .join("");
}

/**
 * Returns the current authenticated user.
 */
export async function getCurrentUser() {
    const {
        data,
        error
    } = await supabase.auth.getUser();

    if (error) {
        console.error(
            "Unable to retrieve the signed-in user:",
            error
        );

        return {
            user: null,
            error
        };
    }

    return {
        user: data.user,
        error: null
    };
}

/**
 * Loads catalog details for a list of card IDs.
 */
export async function loadCatalogCards(cardIds) {
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
        return {
            cards: [],
            error: null
        };
    }

    const {
        data,
        error
    } = await supabase
        .from("cards")
        .select(`
            id,
            card_number,
            name,
            rarity,
            thumbnail_url,
            image_url,
            series_id
        `)
        .in("id", cardIds)
        .order("sort_order", {
            ascending: true
        });

    if (error) {
        console.error(
            "Unable to load card information:",
            error
        );

        return {
            cards: [],
            error
        };
    }

    return {
        cards: data || [],
        error: null
    };
}

/**
 * Imports the old browser collection through the secure
 * Supabase database function.
 */
export async function importLegacyCollection(cardIds) {
    if (!Array.isArray(cardIds)) {
        throw new Error(
            "The supplied collection is invalid."
        );
    }

    if (cardIds.length === 0) {
        throw new Error(
            "There are no collected cards to import."
        );
    }

    const importHash =
        await createCollectionHash(cardIds);

    const {
        data,
        error
    } = await supabase.rpc(
        "import_legacy_collection",
        {
            collected_card_ids: cardIds,
            requested_import_hash: importHash
        }
    );

    if (error) {
        console.error(
            "Collection import failed:",
            error
        );

        throw error;
    }

    return data;
}

/**
 * Loads all cards owned by the current signed-in user.
 */
export async function loadCloudCollection() {
    const {
        data,
        error
    } = await supabase
        .from("user_cards")
        .select(`
            card_id,
            quantity,
            is_favorite,
            prestige_tier,
            first_obtained_at,
            last_obtained_at,
            cards (
                id,
                card_number,
                name,
                rarity,
                thumbnail_url,
                image_url,
                series_id
            )
        `)
        .order("first_obtained_at", {
            ascending: true
        });

    if (error) {
        console.error(
            "Unable to load the cloud collection:",
            error
        );

        return {
            cards: [],
            error
        };
    }

    return {
        cards: data || [],
        error: null
    };
}

/**
 * Evolves a card one Starlight Evolution tier by spending duplicate extras.
 */
export async function fuseMyCard(cardId) {
    const requestedCardId = String(cardId || '').trim();
    if (!requestedCardId) {
        throw new Error('Card id is required.');
    }

    const {
        data,
        error
    } = await supabase.rpc(
        'fuse_my_card',
        {
            requested_card_id: requestedCardId
        }
    );

    if (error) {
        console.error('Starlight Evolution failed:', error);
        throw error;
    }

    return data;
}

/** Alias for fuseMyCard — product naming. */
export async function evolveMyCard(cardId) {
    return fuseMyCard(cardId);
}

/**
 * Steps a card one Starlight Evolution tier down and refunds floor(half) extras.
 */
export async function unfuseMyCard(cardId) {
    const requestedCardId = String(cardId || '').trim();
    if (!requestedCardId) {
        throw new Error('Card id is required.');
    }

    const {
        data,
        error
    } = await supabase.rpc(
        'unfuse_my_card',
        {
            requested_card_id: requestedCardId
        }
    );

    if (error) {
        console.error('Starlight Unfuse failed:', error);
        throw error;
    }

    return data;
}