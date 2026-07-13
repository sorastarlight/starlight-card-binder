import { supabase } from "./supabase-client.js";

/**
 * Returns the current daily-booster status.
 */
export async function getDailyBoosterStatus() {
    const {
        data,
        error
    } = await supabase.rpc(
        "get_daily_booster_status"
    );

    if (error) {
        console.error(
            "Unable to check daily booster status:",
            error
        );

        return {
            status: null,
            error
        };
    }

    return {
        status: data,
        error: null
    };
}

/**
 * Opens today's daily booster.
 *
 * All eligibility checks, card selection, and quantity updates
 * happen securely inside Supabase.
 */
export async function openDailyBooster() {
    const {
        data,
        error
    } = await supabase.rpc(
        "open_daily_booster"
    );

    if (error) {
        console.error(
            "Unable to open daily booster:",
            error
        );

        throw error;
    }

    return data;
}