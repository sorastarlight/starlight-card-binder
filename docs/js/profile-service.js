import { supabase } from "./supabase-client.js";

/**
 * Returns the signed-in user's profile.
 */
export async function loadOwnProfile() {
    const {
        data: userData,
        error: userError
    } = await supabase.auth.getUser();

    if (
        userError ||
        !userData.user
    ) {
        return {
            profile: null,
            user: null,
            error:
                userError ||
                new Error(
                    "No signed-in account was found."
                )
        };
    }

    const {
        data: profile,
        error: profileError
    } = await supabase
        .from("profiles")
        .select(`
            id,
            username,
            display_name,
            bio,
            profile_visibility,
            show_collection_stats,
            show_favorites,
            show_featured_cards,
            favorite_card_id,
            onboarding_complete,
            created_at,
            updated_at
        `)
        .eq(
            "id",
            userData.user.id
        )
        .single();

    return {
        profile,
        user: userData.user,
        error: profileError
    };
}

/**
 * Updates the signed-in user's public collector profile.
 */
export async function updateCollectorProfile({
    username,
    displayName,
    bio,
    visibility,
    showCollectionStats,
    showFavorites,
    showFeaturedCards
}) {
    const {
        data,
        error
    } = await supabase.rpc(
        "update_collector_profile",
        {
            requested_username:
                username,

            requested_display_name:
                displayName,

            requested_bio:
                bio,

            requested_visibility:
                visibility,

            requested_show_collection_stats:
                showCollectionStats,

            requested_show_favorites:
                showFavorites,

            requested_show_featured_cards:
                showFeaturedCards
        }
    );

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Sets the user's main profile-showcase card.
 */
export async function setProfileFavoriteCard(
    cardId
) {
    const {
        data,
        error
    } = await supabase.rpc(
        "set_profile_favorite_card",
        {
            requested_card_id:
                cardId || null
        }
    );

    if (error) {
        throw error;
    }

    return data;
}

/**
 * Loads cards owned by the signed-in user for profile selection.
 */
export async function loadOwnedProfileCards() {
    const {
        data,
        error
    } = await supabase
        .from("user_cards")
        .select(`
            card_id,
            quantity,
            is_favorite,
            cards (
                id,
                card_number,
                name,
                rarity,
                image_url,
                thumbnail_url,
                series_id
            )
        `)
        .order(
            "first_obtained_at",
            {
                ascending: true
            }
        );

    if (error) {
        return {
            cards: [],
            error
        };
    }

    return {
        cards:
            (data || [])
                .map(row => {
                    return {
                        ...row.cards,
                        quantity:
                            row.quantity,

                        isFavorite:
                            row.is_favorite
                    };
                })
                .filter(card => {
                    return Boolean(
                        card?.id
                    );
                }),

        error: null
    };
}