import { supabase } from "./supabase-client.js";

export async function getDailyBoosterStatus() {
    const { data, error } = await supabase.rpc("get_daily_booster_status");
    if (error) {
        console.error("Unable to check daily booster status:", error);
        return { status: null, error };
    }
    return { status: data, error: null };
}

export async function openDailyBooster() {
    const { data, error } = await supabase.rpc("open_daily_booster");
    if (error) {
        console.error("Unable to open daily booster:", error);
        throw error;
    }
    return data;
}

export async function openStarBitsBooster() {
    const { data, error } = await supabase.rpc("open_star_bits_booster");
    if (error) {
        console.error("Unable to open Star Bits booster:", error);
        throw error;
    }
    return data;
}
