import { supabase } from "./supabase-client.js";

export async function redeemRewardCode(code) {
    const { data, error } = await supabase.rpc(
        "redeem_reward_code",
        { requested_code: String(code || "") }
    );

    if (error) {
        console.error("Unable to redeem reward code:", error);
        throw error;
    }

    return data;
}

export async function isSiteAdmin() {
    const { data, error } = await supabase.rpc("is_site_admin");
    return { isAdmin: data === true, error };
}

export async function createRewardCode(config) {
    const { data, error } = await supabase.rpc(
        "admin_create_reward_code",
        {
            requested_code: config.code,
            requested_label: config.label,
            requested_reward_type: config.rewardType,
            requested_card_id: config.cardId || null,
            requested_card_quantity: config.cardQuantity || null,
            requested_booster_card_ids: config.boosterCardIds || null,
            requested_star_bits_amount: config.starBitsAmount || null,
            requested_max_uses: config.maxUses || null,
            requested_starts_at: config.startsAt || null,
            requested_expires_at: config.expiresAt || null
        }
    );

    if (error) throw error;
    return data;
}

export async function listRewardCodes() {
    const { data, error } = await supabase.rpc("admin_list_reward_codes");
    if (error) throw error;
    return data || [];
}

export async function setRewardCodeActive(codeId, active) {
    const { data, error } = await supabase.rpc(
        "admin_set_reward_code_active",
        {
            requested_code_id: codeId,
            requested_active: Boolean(active)
        }
    );
    if (error) throw error;
    return data;
}

export async function loadAdminCardCatalog() {
    const { data, error } = await supabase
        .from("cards")
        .select("id, card_number, name, rarity, series_id")
        .eq("is_visible", true)
        .eq("is_collectible", true)
        .order("sort_order", { ascending: true });

    if (error) throw error;
    return data || [];
}
