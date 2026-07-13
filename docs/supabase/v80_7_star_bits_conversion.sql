-- ============================================================
-- STARLIGHT CARD BINDER
-- V80.7 SECURE STAR BITS CONVERSION
-- ============================================================

-- ------------------------------------------------------------
-- 1. CONVERT ALL DUPLICATES
--
-- Rules:
-- • One copy of every card is always preserved.
-- • Only quantity above 1 is converted.
-- • Card quantities, wallet balance, and history are updated
--   together in one atomic database transaction.
-- ------------------------------------------------------------

create or replace function public.convert_all_duplicates_to_star_bits()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid;

    converted_card_types integer := 0;
    converted_duplicate_copies integer := 0;
    star_bits_earned bigint := 0;
    new_star_bits_balance bigint := 0;

    conversion_details jsonb := '[]'::jsonb;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to convert duplicate cards.';
    end if;

    -- Ensure the user has a wallet.
    insert into public.user_wallets (
        user_id
    )
    values (
        current_user_id
    )
    on conflict (user_id)
    do nothing;

    -- Lock the wallet row so simultaneous conversion requests
    -- cannot update the same balance at the same time.
    perform 1
    from public.user_wallets
    where user_id = current_user_id
    for update;

    -- Lock every duplicate ownership row involved in the exchange.
    perform 1
    from public.user_cards
    where user_id = current_user_id
      and quantity > 1
    for update;

    -- Calculate totals from the locked rows.
    select
        count(*),
        coalesce(
            sum(
                user_cards.quantity - 1
            ),
            0
        ),
        coalesce(
            sum(
                (
                    user_cards.quantity - 1
                )
                *
                star_bits_values.bits_per_duplicate
            ),
            0
        )
    into
        converted_card_types,
        converted_duplicate_copies,
        star_bits_earned

    from public.user_cards

    join public.cards
      on cards.id =
         user_cards.card_id

    join public.star_bits_values
      on star_bits_values.rarity =
         cards.rarity

    where user_cards.user_id =
          current_user_id
      and user_cards.quantity > 1;

    if converted_duplicate_copies = 0 then
        select star_bits
        into new_star_bits_balance
        from public.user_wallets
        where user_id = current_user_id;

        return jsonb_build_object(
            'success', true,
            'nothingToConvert', true,
            'convertedCardTypes', 0,
            'convertedDuplicateCopies', 0,
            'starBitsEarned', 0,
            'newStarBitsBalance',
                coalesce(new_star_bits_balance, 0),
            'convertedCards',
                '[]'::jsonb
        );
    end if;

    -- Build a permanent record of what is about to be converted.
    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'cardId',
                    conversion_data.card_id,

                'cardNumber',
                    conversion_data.card_number,

                'name',
                    conversion_data.name,

                'rarity',
                    conversion_data.rarity,

                'duplicateQuantity',
                    conversion_data.duplicate_quantity,

                'bitsPerDuplicate',
                    conversion_data.bits_per_duplicate,

                'starBitsEarned',
                    conversion_data.star_bits_earned
            )
            order by
                conversion_data.series_sort,
                conversion_data.card_sort
        ),
        '[]'::jsonb
    )
    into conversion_details

    from (
        select
            cards.id as card_id,
            cards.card_number,
            cards.name,
            cards.rarity,
            card_series.sort_order as series_sort,
            cards.sort_order as card_sort,

            user_cards.quantity - 1
                as duplicate_quantity,

            star_bits_values.bits_per_duplicate,

            (
                user_cards.quantity - 1
            )
            *
            star_bits_values.bits_per_duplicate
                as star_bits_earned

        from public.user_cards

        join public.cards
          on cards.id =
             user_cards.card_id

        join public.card_series
          on card_series.id =
             cards.series_id

        join public.star_bits_values
          on star_bits_values.rarity =
             cards.rarity

        where user_cards.user_id =
              current_user_id
          and user_cards.quantity > 1
    ) as conversion_data;

    -- Record one transaction for each converted card type.
    insert into public.star_bits_transactions (
        user_id,
        transaction_type,
        star_bits_change,
        card_id,
        card_quantity_change,
        description,
        metadata
    )
    select
        current_user_id,
        'duplicate_conversion',
        (
            user_cards.quantity - 1
        )
        *
        star_bits_values.bits_per_duplicate,

        cards.id,

        -(
            user_cards.quantity - 1
        ),

        'Converted duplicate copies of '
        || cards.name
        || ' into Star Bits.',

        jsonb_build_object(
            'cardNumber',
                cards.card_number,

            'cardName',
                cards.name,

            'rarity',
                cards.rarity,

            'duplicatesConverted',
                user_cards.quantity - 1,

            'bitsPerDuplicate',
                star_bits_values.bits_per_duplicate
        )

    from public.user_cards

    join public.cards
      on cards.id =
         user_cards.card_id

    join public.star_bits_values
      on star_bits_values.rarity =
         cards.rarity

    where user_cards.user_id =
          current_user_id
      and user_cards.quantity > 1;

    -- Reduce each affected card to one permanent copy.
    update public.user_cards
    set
        quantity = 1,
        updated_at = now()
    where user_id = current_user_id
      and quantity > 1;

    -- Credit the wallet.
    update public.user_wallets
    set
        star_bits =
            star_bits
            +
            star_bits_earned,

        lifetime_star_bits_earned =
            lifetime_star_bits_earned
            +
            star_bits_earned,

        updated_at =
            now()

    where user_id =
          current_user_id

    returning star_bits
    into new_star_bits_balance;

    return jsonb_build_object(
        'success', true,
        'nothingToConvert', false,
        'convertedCardTypes',
            converted_card_types,
        'convertedDuplicateCopies',
            converted_duplicate_copies,
        'starBitsEarned',
            star_bits_earned,
        'newStarBitsBalance',
            new_star_bits_balance,
        'convertedCards',
            conversion_details
    );
end;
$$;

-- Remove default public execution access.
revoke all
on function public.convert_all_duplicates_to_star_bits()
from public;

revoke all
on function public.convert_all_duplicates_to_star_bits()
from anon;

-- Only signed-in users may invoke the protected function.
grant execute
on function public.convert_all_duplicates_to_star_bits()
to authenticated;