import { supabase } from "./supabase-client.js";

export async function getStarBitsExchangePreview() {
    const { data, error } = await supabase.rpc("get_star_bits_exchange_preview");
    if (error) {
        console.error("Unable to load Star Bits exchange preview:", error);
        return { preview: null, error };
    }
    return { preview: data, error: null };
}

export async function convertAllDuplicatesToStarBits() {
    const { data, error } = await supabase.rpc("convert_all_duplicates_to_star_bits");
    if (error) {
        console.error("Unable to convert duplicate cards:", error);
        throw error;
    }
    return data;
}

/**
 * Converts only the duplicate quantities selected by the user.
 * selections must be an array like:
 * [{ cardId: "s01-001", quantity: 2 }]
 */
export async function convertSelectedDuplicatesToStarBits(selections) {
    const cleanSelections = (Array.isArray(selections) ? selections : [])
        .map(item => ({
            cardId: String(item?.cardId || "").trim(),
            quantity: Math.max(0, Math.floor(Number(item?.quantity || 0)))
        }))
        .filter(item => item.cardId && item.quantity > 0);

    if (!cleanSelections.length) {
        throw new Error("Choose at least one duplicate card to convert.");
    }

    const { data, error } = await supabase.rpc(
        "convert_selected_duplicates_to_star_bits",
        { requested_selections: cleanSelections }
    );

    if (error) {
        console.error("Unable to convert selected duplicate cards:", error);
        throw error;
    }

    return data;
}
