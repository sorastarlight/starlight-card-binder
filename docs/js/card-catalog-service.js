import { supabase } from "./supabase-client.js";

const CACHE_KEY = "sora-starlight-card-binder-v86-supabase-card-catalog";
const LEGACY_CACHE_KEY = "sora-starlight-card-binder-v66-card-cache";
const CHANGE_KEY = "sora-starlight-card-binder-card-catalog-change";
const CHANNEL_NAME = "starlight-card-catalog";
const CACHE_VERSION = 2;

let channel = null;
try {
    channel = new BroadcastChannel(CHANNEL_NAME);
} catch (_) {}

function cleanText(value) {
    return String(value ?? "").trim();
}

function normalizeCatalogCard(row, index = 0) {
    const series = row?.series || row?.card_series || {};
    const seriesId = cleanText(row?.seriesId ?? row?.series_id ?? series?.id);
    const seriesName = cleanText(row?.seriesName ?? row?.series_name ?? series?.name);
    const cardNumber = cleanText(row?.number ?? row?.cardNumber ?? row?.card_number).padStart(3, "0");

    return {
        id: cleanText(row?.id),
        number: cardNumber || String(index + 1).padStart(3, "0"),
        name: cleanText(row?.name),
        seriesId,
        seriesName,
        seriesSort: Number(row?.seriesSort ?? row?.series_sort ?? series?.sort_order ?? 0),
        seriesDescription: cleanText(row?.seriesDescription ?? row?.series_description ?? series?.description),
        boosterImageUrl: cleanText(row?.boosterImageUrl ?? row?.booster_image_url ?? series?.booster_image_url),
        rarity: cleanText(row?.rarity) || "Common",
        categoryId: cleanText(row?.categoryId ?? row?.category_id),
        categoryName: cleanText(row?.categoryName ?? row?.category_name ?? row?.category?.name),
        subcategoryId: cleanText(row?.subcategoryId ?? row?.subcategory_id),
        subcategoryName: cleanText(row?.subcategoryName ?? row?.subcategory_name ?? row?.subcategory?.name),
        variantId: cleanText(row?.variantId ?? row?.variant_id),
        variantName: cleanText(row?.variantName ?? row?.variant_name ?? row?.variant?.name),
        finishId: cleanText(row?.finishId ?? row?.finish_id),
        finishName: cleanText(row?.finishName ?? row?.finish_name ?? row?.finish?.name),
        collectorNumber: cleanText(row?.collectorNumber ?? row?.collector_number ?? cardNumber),
        distributionType: cleanText(row?.distributionType ?? row?.distribution_type ?? 'booster_pull'),
        publishStatus: cleanText(row?.publishStatus ?? row?.publish_status ?? 'published'),
        tags: Array.isArray(row?.tags) ? row.tags : [],
        isPromo: row?.isPromo ?? row?.is_promo ?? false,
        isEventExclusive: row?.isEventExclusive ?? row?.is_event_exclusive ?? false,
        availableFrom: cleanText(row?.availableFrom ?? row?.available_from),
        availableUntil: cleanText(row?.availableUntil ?? row?.available_until),
        imageUrl: cleanText(row?.imageUrl ?? row?.image_url),
        thumbnailUrl: cleanText(row?.thumbnailUrl ?? row?.thumbnail_url ?? row?.imageUrl ?? row?.image_url),
        cardDescription: cleanText(row?.cardDescription ?? row?.description),
        artist: cleanText(row?.artist),
        sortOrder: Number(row?.sortOrder ?? row?.sort_order ?? index),
        isVisible: row?.isVisible ?? row?.is_visible ?? true,
        isCollectible: row?.isCollectible ?? row?.is_collectible ?? true,
        isPullable: row?.isPullable ?? row?.is_pullable ?? true,
        pullWeight: Number(row?.pullWeight ?? row?.pull_weight ?? 1),
        updatedAt: cleanText(row?.updatedAt ?? row?.updated_at)
    };
}

function normalizePayload(payload) {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.cards)
            ? payload.cards
            : [];

    return {
        generatedAt: payload?.generatedAt || payload?.generated_at || new Date().toISOString(),
        catalogUpdatedAt: payload?.catalogUpdatedAt || payload?.catalog_updated_at || null,
        cards: rows
            .map(normalizeCatalogCard)
            .filter(card => card.id && card.number)
            .sort((a, b) =>
                (a.seriesSort - b.seriesSort) ||
                a.sortOrder - b.sortOrder ||
                a.number.localeCompare(b.number, undefined, { numeric: true })
            )
    };
}

export function getCachedCardCatalog() {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.version !== CACHE_VERSION || !Array.isArray(parsed?.cards)) return null;
        return parsed;
    } catch (_) {
        return null;
    }
}

function saveCache(payload) {
    const normalized = normalizePayload(payload);
    const cached = {
        version: CACHE_VERSION,
        fetchedAt: Date.now(),
        generatedAt: normalized.generatedAt,
        catalogUpdatedAt: normalized.catalogUpdatedAt,
        cards: normalized.cards
    };
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch (_) {}
    return cached;
}

async function fetchViaRpc() {
    const { data, error } = await supabase.rpc("get_public_card_catalog_v1");
    if (error) throw error;
    return data;
}

async function fetchViaTables() {
    const { data, error } = await supabase
        .from("cards")
        .select(`
            id,
            series_id,
            card_number,
            name,
            rarity,
            category_id,
            subcategory_id,
            variant_id,
            finish_id,
            collector_number,
            distribution_type,
            publish_status,
            is_promo,
            is_event_exclusive,
            available_from,
            available_until,
            image_url,
            thumbnail_url,
            description,
            artist,
            sort_order,
            is_visible,
            is_collectible,
            is_pullable,
            pull_weight,
            updated_at,
            card_series (
                id,
                name,
                description,
                booster_image_url,
                sort_order,
                is_visible,
                updated_at
            )
        `)
        .eq("is_visible", true)
        .order("series_id", { ascending: true })
        .order("sort_order", { ascending: true });

    if (error) throw error;
    return { cards: data || [] };
}

export async function fetchFreshCardCatalog() {
    let payload;
    try {
        payload = await fetchViaRpc();
    } catch (rpcError) {
        console.warn("[Starlight] Catalog RPC unavailable; using direct Supabase query.", rpcError);
        payload = await fetchViaTables();
    }

    const cached = saveCache(payload);
    window.dispatchEvent(new CustomEvent("starlight-card-catalog-loaded", {
        detail: { source: "supabase", cardCount: cached.cards.length }
    }));
    return cached;
}

export function clearCardCatalogCache() {
    try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch (_) {}
}

export function notifyCardCatalogChanged(reason = "admin-update") {
    clearCardCatalogCache();
    const message = { type: "catalog-changed", reason, at: Date.now() };
    try { localStorage.setItem(CHANGE_KEY, JSON.stringify(message)); } catch (_) {}
    try { channel?.postMessage(message); } catch (_) {}
    try { window.parent?.postMessage({ type: "starlight-card-catalog-changed", ...message }, window.location.origin); } catch (_) {}
    window.dispatchEvent(new CustomEvent("starlight-card-catalog-updated", { detail: message }));
}

function receiveChange(message) {
    if (!message || message.type !== "catalog-changed") return;
    clearCardCatalogCache();
    window.dispatchEvent(new CustomEvent("starlight-card-catalog-updated", { detail: message }));
}

channel?.addEventListener("message", event => receiveChange(event.data));
window.addEventListener("storage", event => {
    if (event.key !== CHANGE_KEY || !event.newValue) return;
    try { receiveChange(JSON.parse(event.newValue)); } catch (_) {}
});
window.addEventListener("message", event => {
    if (event.origin !== window.location.origin) return;
    if (event.data?.type === "starlight-card-catalog-changed") receiveChange(event.data);
});

window.StarlightCardCatalog = {
    getCached: getCachedCardCatalog,
    fetchFresh: fetchFreshCardCatalog,
    clear: clearCardCatalogCache,
    notifyChanged: notifyCardCatalogChanged
};
