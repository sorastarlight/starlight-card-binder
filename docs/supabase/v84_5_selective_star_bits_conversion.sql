-- ============================================================
-- STARLIGHT CARD BINDER
-- V84.5 SELECTIVE STAR BITS CONVERSION
-- ============================================================

create or replace function public.convert_selected_duplicates_to_star_bits(
    requested_selections jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
    current_user_id uuid;
    selection jsonb;
    selected_card_id text;
    selected_quantity integer;
    available_duplicates integer;
    bits_per_copy integer;
    earned_for_card bigint;
    total_copies_converted integer := 0;
    total_star_bits_earned bigint := 0;
    new_balance bigint := 0;
    converted_cards jsonb := '[]'::jsonb;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception 'You must be signed in to convert duplicate cards.';
    end if;

    if requested_selections is null
       or jsonb_typeof(requested_selections) <> 'array'
       or jsonb_array_length(requested_selections) = 0 then
        raise exception 'Choose at least one duplicate card to convert.';
    end if;

    insert into public.user_wallets (user_id)
    values (current_user_id)
    on conflict (user_id) do nothing;

    perform 1
    from public.user_wallets
    where user_id = current_user_id
    for update;

    for selection in
        select value
        from jsonb_array_elements(requested_selections)
    loop
        selected_card_id := nullif(trim(selection ->> 'cardId'), '');
        selected_quantity := floor(coalesce((selection ->> 'quantity')::numeric, 0))::integer;

        if selected_card_id is null or selected_quantity <= 0 then
            continue;
        end if;

        select
            greatest(user_cards.quantity - 1, 0),
            star_bits_values.bits_per_duplicate
        into
            available_duplicates,
            bits_per_copy
        from public.user_cards
        join public.cards
          on cards.id = user_cards.card_id
        join public.star_bits_values
          on star_bits_values.rarity = cards.rarity
        where user_cards.user_id = current_user_id
          and user_cards.card_id = selected_card_id
        for update of user_cards;

        if not found then
            raise exception 'Card % is not owned or cannot be converted.', selected_card_id;
        end if;

        if selected_quantity > available_duplicates then
            raise exception
                'Only % duplicate copy/copies of card % are available.',
                available_duplicates,
                selected_card_id;
        end if;

        earned_for_card := selected_quantity::bigint * bits_per_copy::bigint;

        update public.user_cards
        set
            quantity = quantity - selected_quantity,
            updated_at = now()
        where user_id = current_user_id
          and card_id = selected_card_id;

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
            earned_for_card,
            cards.id,
            -selected_quantity,
            'Converted selected duplicate copies of ' || cards.name || ' into Star Bits.',
            jsonb_build_object(
                'cardNumber', cards.card_number,
                'cardName', cards.name,
                'rarity', cards.rarity,
                'duplicatesConverted', selected_quantity,
                'bitsPerDuplicate', bits_per_copy
            )
        from public.cards
        where cards.id = selected_card_id;

        converted_cards := converted_cards || jsonb_build_array(
            jsonb_build_object(
                'cardId', selected_card_id,
                'quantityConverted', selected_quantity,
                'starBitsEarned', earned_for_card
            )
        );

        total_copies_converted := total_copies_converted + selected_quantity;
        total_star_bits_earned := total_star_bits_earned + earned_for_card;
    end loop;

    if total_copies_converted <= 0 then
        raise exception 'Choose at least one duplicate card to convert.';
    end if;

    update public.user_wallets
    set
        star_bits = star_bits + total_star_bits_earned,
        lifetime_star_bits_earned = lifetime_star_bits_earned + total_star_bits_earned,
        updated_at = now()
    where user_id = current_user_id
    returning star_bits into new_balance;

    return jsonb_build_object(
        'success', true,
        'convertedDuplicateCopies', total_copies_converted,
        'starBitsEarned', total_star_bits_earned,
        'newStarBitsBalance', new_balance,
        'convertedCards', converted_cards
    );
end;
$$;

revoke all
on function public.convert_selected_duplicates_to_star_bits(jsonb)
from public, anon;

grant execute
on function public.convert_selected_duplicates_to_star_bits(jsonb)
to authenticated;
