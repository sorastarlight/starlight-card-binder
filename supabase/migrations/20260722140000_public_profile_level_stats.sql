-- Extend public collector profiles with level XP and collection summary fields
-- matching My Card Collection / User Rankings progression.

CREATE OR REPLACE FUNCTION public.get_public_collector_profile(requested_username text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    target_profile public.profiles%rowtype;
    normalized_username text;

    total_catalog_cards integer := 0;
    unique_cards_owned integer := 0;
    total_copies_owned integer := 0;
    favorite_cards_count integer := 0;
    extra_copies_owned integer := 0;
    collector_xp_value bigint := 0;

    rarity_counts jsonb := '{}'::jsonb;
    series_progress jsonb := '[]'::jsonb;
    favorite_cards jsonb := '[]'::jsonb;
    showcase_card jsonb := null;
begin
    normalized_username :=
        lower(trim(requested_username));

    if normalized_username is null
       or normalized_username = '' then
        raise exception 'A collector username is required.';
    end if;

    select *
    into target_profile
    from public.profiles
    where lower(username) = normalized_username
      and onboarding_complete = true
    limit 1;

    if not found then
        return jsonb_build_object(
            'found', false
        );
    end if;

    /*
     * Private profiles reveal only that the profile exists
     * and is private.
     */
    if target_profile.profile_visibility = 'private'
       and target_profile.id is distinct from auth.uid() then
        return jsonb_build_object(
            'found', true,
            'private', true,
            'username', target_profile.username
        );
    end if;

    select count(*)
    into total_catalog_cards
    from public.cards
    where is_visible = true
      and is_collectible = true;

    select coalesce(
        (
            select w.collector_xp
            from public.user_wallets w
            where w.user_id = target_profile.id
        ),
        0
    )
    into collector_xp_value;

    if target_profile.show_collection_stats then
        select
            count(*),
            coalesce(sum(quantity), 0)
        into
            unique_cards_owned,
            total_copies_owned
        from public.user_cards
        where user_id = target_profile.id;

        select
            count(*) filter (where is_favorite = true),
            coalesce(sum(greatest(quantity - 1, 0)), 0)
        into
            favorite_cards_count,
            extra_copies_owned
        from public.user_cards
        where user_id = target_profile.id;


        select jsonb_build_object(
            'Common',
                count(*) filter (
                    where cards.rarity = 'Common'
                ),

            'Uncommon',
                count(*) filter (
                    where cards.rarity = 'Uncommon'
                ),

            'Rare',
                count(*) filter (
                    where cards.rarity = 'Rare'
                ),

            'Epic',
                count(*) filter (
                    where cards.rarity = 'Epic'
                ),

            'Legendary',
                count(*) filter (
                    where cards.rarity = 'Legendary'
                )
        )
        into rarity_counts
        from public.user_cards
        join public.cards
          on cards.id = user_cards.card_id
        where user_cards.user_id = target_profile.id;

        select coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'seriesId',
                        series_data.series_id,

                    'seriesName',
                        series_data.series_name,

                    'owned',
                        series_data.owned_count,

                    'total',
                        series_data.total_count
                )
                order by series_data.sort_order
            ),
            '[]'::jsonb
        )
        into series_progress
        from (
            select
                card_series.id as series_id,
                card_series.name as series_name,
                card_series.sort_order,

                count(cards.id) filter (
                    where cards.is_visible = true
                      and cards.is_collectible = true
                ) as total_count,

                count(user_cards.card_id) as owned_count

            from public.card_series

            left join public.cards
              on cards.series_id = card_series.id
             and cards.is_visible = true
             and cards.is_collectible = true

            left join public.user_cards
              on user_cards.card_id = cards.id
             and user_cards.user_id = target_profile.id

            where card_series.is_visible = true

            group by
                card_series.id,
                card_series.name,
                card_series.sort_order
        ) as series_data;
    end if;

    if target_profile.show_favorites then
        select coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id',
                        favorite_data.id,

                    'cardNumber',
                        favorite_data.card_number,

                    'name',
                        favorite_data.name,

                    'rarity',
                        favorite_data.rarity,

                    'imageUrl',
                        favorite_data.image_url,

                    'thumbnailUrl',
                        favorite_data.thumbnail_url,

                    'seriesId',
                        favorite_data.series_id,

                    'seriesName',
                        favorite_data.series_name
                )
                order by favorite_data.sort_order
            ),
            '[]'::jsonb
        )
        into favorite_cards
        from (
            select
                cards.id,
                cards.card_number,
                cards.name,
                cards.rarity,
                cards.image_url,
                cards.thumbnail_url,
                cards.series_id,
                card_series.name as series_name,
                cards.sort_order

            from public.user_cards

            join public.cards
              on cards.id = user_cards.card_id

            join public.card_series
              on card_series.id = cards.series_id

            where user_cards.user_id = target_profile.id
              and user_cards.is_favorite = true
              and cards.is_visible = true

            limit 12
        ) as favorite_data;
    end if;

    if target_profile.show_featured_cards
       and target_profile.favorite_card_id is not null then
        select jsonb_build_object(
            'id',
                cards.id,

            'cardNumber',
                cards.card_number,

            'name',
                cards.name,

            'rarity',
                cards.rarity,

            'imageUrl',
                cards.image_url,

            'thumbnailUrl',
                cards.thumbnail_url,

            'seriesId',
                cards.series_id,

            'seriesName',
                card_series.name,

            'description',
                cards.description,

            'artist',
                cards.artist
        )
        into showcase_card
        from public.cards

        join public.card_series
          on card_series.id = cards.series_id

        join public.user_cards
          on user_cards.card_id = cards.id
         and user_cards.user_id = target_profile.id

        where cards.id = target_profile.favorite_card_id
          and cards.is_visible = true

        limit 1;
    end if;

    return jsonb_build_object(
        'found',
            true,

        'private',
            false,

        'profile',
            jsonb_build_object(
                'username',
                    target_profile.username,

                'displayName',
                    target_profile.display_name,

                'bio',
                    target_profile.bio,

                'visibility',
                    target_profile.profile_visibility,

                'memberSince',
                    target_profile.created_at,

                'showCollectionStats',
                    target_profile.show_collection_stats,

                'showFavorites',
                    target_profile.show_favorites,

                'showFeaturedCards',
                    target_profile.show_featured_cards
            ),

        'collection',
            case
                when target_profile.show_collection_stats then
                    jsonb_build_object(
                        'uniqueCards',
                            unique_cards_owned,

                        'totalCopies',
                            total_copies_owned,

                        'favoriteCount',
                            favorite_cards_count,

                        'extraCopies',
                            extra_copies_owned,

                        'catalogTotal',
                            total_catalog_cards,

                        'completionPercent',
                            case
                                when total_catalog_cards > 0 then
                                    round(
                                        (
                                            unique_cards_owned::numeric
                                            /
                                            total_catalog_cards::numeric
                                        ) * 100
                                    )
                                else 0
                            end,

                        'rarityCounts',
                            rarity_counts,

                        'seriesProgress',
                            series_progress
                    )
                else null
            end,

        'collectorXp',
            collector_xp_value,

        'showcaseCard',
            showcase_card,

        'favoriteCards',
            favorite_cards
    );
end;
$function$
;

grant execute on function public.get_public_collector_profile(text) to anon, authenticated;
