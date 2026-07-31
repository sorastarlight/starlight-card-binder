const LOCAL_COLLECTION_KEY =
    "sora-starlight-card-binder-v5-collected";

const LOCAL_QUANTITIES_KEY =
    "sora-starlight-card-binder-v80-quantities";

function getStorage() {
    return globalThis.localStorage ?? null;
}

function readLocalStoreObject(key) {
    try {
        const storage = getStorage();
        if (!storage) return {};
        const rawValue = storage.getItem(key);
        if (!rawValue) return {};
        const parsedValue = JSON.parse(rawValue);
        if (
            !parsedValue ||
            typeof parsedValue !== "object" ||
            Array.isArray(parsedValue)
        ) {
            return {};
        }
        return parsedValue;
    } catch (error) {
        console.error(`[Starlight] Unable to read ${key}:`, error);
        return {};
    }
}

function writeLocalStoreObject(key, value) {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(key, JSON.stringify(value));
}

function awardedCardId(card = {}) {
    return String(card?.id ?? card?.cardId ?? card?.card_id ?? "").trim();
}

/**
 * Mirrors freshly awarded cards into the browser stores used by app.js
 * without waiting for a full cloud resync.
 */
export function applyAwardedCardsToLocalStore(awardedCards = []) {
    if (!Array.isArray(awardedCards) || awardedCards.length === 0) {
        return { updatedCardIds: [] };
    }

    const collected = readLocalStoreObject(LOCAL_COLLECTION_KEY);
    const quantities = readLocalStoreObject(LOCAL_QUANTITIES_KEY);
    const increments = new Map();
    const updatedCardIds = [];

    for (const card of awardedCards) {
        const cardId = awardedCardId(card);
        if (!cardId) continue;

        collected[cardId] = true;

        const quantityFromApi = Number(card?.quantity);
        if (Number.isFinite(quantityFromApi) && quantityFromApi > 0) {
            quantities[cardId] = Math.max(1, quantityFromApi);
        } else {
            increments.set(cardId, (increments.get(cardId) || 0) + 1);
        }

        if (!updatedCardIds.includes(cardId)) {
            updatedCardIds.push(cardId);
        }
    }

    for (const [cardId, delta] of increments.entries()) {
        quantities[cardId] = Math.max(
            1,
            Number(quantities[cardId] || 0) + delta
        );
    }

    writeLocalStoreObject(LOCAL_COLLECTION_KEY, collected);
    writeLocalStoreObject(LOCAL_QUANTITIES_KEY, quantities);

    return { updatedCardIds };
}
