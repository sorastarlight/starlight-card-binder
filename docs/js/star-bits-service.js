import { supabase } from "./supabase-client.js";

/**
 * Loads the signed-in user's Star Bits balance and duplicate-card
 * exchange preview.
 */
export async function getStarBitsExchangePreview() {
    const {
        data,
        error
    } = await supabase.rpc(
        "get_star_bits_exchange_preview"
    );

    if (error) {
        console.error(
            "Unable to load Star Bits exchange preview:",
            error
        );

        return {
            preview: null,
            error
        };
    }

    return {
        preview: data,
        error: null
    };
}

/**
 * Securely converts every duplicate card copy into Star Bits.
 *
 * Supabase keeps one permanent copy of every card and performs
 * quantity updates, wallet crediting, and transaction logging
 * together inside the database.
 */
export async function convertAllDuplicatesToStarBits() {
    const {
        data,
        error
    } = await supabase.rpc(
        "convert_all_duplicates_to_star_bits"
    );

    if (error) {
        console.error(
            "Unable to convert duplicate cards:",
            error
        );

        throw error;
    }

    return data;
}