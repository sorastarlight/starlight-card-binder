-- ============================================================
-- STARLIGHT CARD BINDER
-- V82.8 STAR BITS BOOSTER SHOP
-- ============================================================

create table if not exists public.star_bits_booster_purchases (
    id bigint generated always as identity primary key,
    user_id uuid not null references auth.users(id) on delete cascade,
    star_bits_cost integer not null check (star_bits_cost > 0),
    cards_awarded jsonb not null default '[]'::jsonb,
    purchased_at timestamptz not null default now()
);

create index if not exists star_bits_booster_purchases_user_index
on public.star_bits_booster_purchases(user_id, purchased_at desc);

alter table public.star_bits_booster_purchases enable row level security;

drop policy if exists "Users can view their own Star Bits booster purchases"
on public.star_bits_booster_purchases;

create policy "Users can view their own Star Bits booster purchases"
on public.star_bits_booster_purchases
for select to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.open_star_bits_booster()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    booster_cost integer := 100;
    current_balance bigint;
    purchase_id bigint;
    common_card_one text;
    common_card_two text;
    uncommon_card text;
    rare_plus_card text;
    rare_plus_roll numeric;
    selected_card_ids text[];
    reward_cards jsonb;
    new_balance bigint;
begin
    if current_user_id is null then
        raise exception 'You must be signed in to open a Star Bits booster.';
    end if;

    insert into public.user_wallets(user_id)
    values (current_user_id)
    on conflict (user_id) do nothing;

    select star_bits
    into current_balance
    from public.user_wallets
    where user_id = current_user_id
    for update;

    if coalesce(current_balance, 0) < booster_cost then
        raise exception 'You need % Star Bits to open this booster. Your balance is %.', booster_cost, coalesce(current_balance, 0);
    end if;

    select id into common_card_one
    from public.cards
    where rarity = 'Common' and is_visible = true and is_collectible = true
    order by random() limit 1;

    select id into common_card_two
    from public.cards
    where rarity = 'Common' and is_visible = true and is_collectible = true
    order by random() limit 1;

    select id into uncommon_card
    from public.cards
    where rarity = 'Uncommon' and is_visible = true and is_collectible = true
    order by random() limit 1;

    rare_plus_roll := random();
    if rare_plus_roll < 0.70 then
        select id into rare_plus_card from public.cards
        where rarity = 'Rare' and is_visible = true and is_collectible = true
        order by random() limit 1;
    elsif rare_plus_roll < 0.90 then
        select id into rare_plus_card from public.cards
        where rarity = 'Epic' and is_visible = true and is_collectible = true
        order by random() limit 1;
    else
        select id into rare_plus_card from public.cards
        where rarity = 'Legendary' and is_visible = true and is_collectible = true
        order by random() limit 1;
    end if;

    if rare_plus_card is null then
        select id into rare_plus_card from public.cards
        where rarity in ('Rare','Epic','Legendary')
          and is_visible = true and is_collectible = true
        order by random() limit 1;
    end if;

    if common_card_one is null or common_card_two is null or uncommon_card is null or rare_plus_card is null then
        raise exception 'The booster card pool is not configured correctly.';
    end if;

    selected_card_ids := array[common_card_one, common_card_two, uncommon_card, rare_plus_card];

    update public.user_wallets
    set star_bits = star_bits - booster_cost,
        lifetime_star_bits_spent = lifetime_star_bits_spent + booster_cost,
        updated_at = now()
    where user_id = current_user_id
    returning star_bits into new_balance;

    insert into public.user_cards(
        user_id, card_id, quantity, is_favorite,
        first_obtained_at, last_obtained_at, updated_at
    )
    select current_user_id, grouped.card_id, grouped.qty, false, now(), now(), now()
    from (
        select card_id, count(*)::integer as qty
        from unnest(selected_card_ids) as card_id
        group by card_id
    ) grouped
    on conflict (user_id, card_id)
    do update set
        quantity = public.user_cards.quantity + excluded.quantity,
        last_obtained_at = now(),
        updated_at = now();

    select jsonb_agg(
        jsonb_build_object(
            'id', cards.id,
            'cardNumber', cards.card_number,
            'name', cards.name,
            'rarity', cards.rarity,
            'imageUrl', cards.image_url,
            'thumbnailUrl', cards.thumbnail_url,
            'seriesId', cards.series_id,
            'seriesName', card_series.name,
            'artist', cards.artist,
            'description', cards.description,
            'quantity', user_cards.quantity,
            'isDuplicate', user_cards.quantity > 1
        ) order by selected.pack_position
    ) into reward_cards
    from unnest(selected_card_ids) with ordinality as selected(card_id, pack_position)
    join public.cards on cards.id = selected.card_id
    join public.card_series on card_series.id = cards.series_id
    join public.user_cards on user_cards.user_id = current_user_id and user_cards.card_id = cards.id;

    insert into public.star_bits_booster_purchases(user_id, star_bits_cost, cards_awarded)
    values (current_user_id, booster_cost, reward_cards)
    returning id into purchase_id;

    insert into public.star_bits_transactions(
        user_id, transaction_type, star_bits_change, description, metadata
    ) values (
        current_user_id,
        'purchase',
        -booster_cost,
        'Opened a Standard Booster with Star Bits.',
        jsonb_build_object('purchaseId', purchase_id, 'boosterType', 'standard', 'cardsAwarded', reward_cards)
    );

    return jsonb_build_object(
        'success', true,
        'purchaseId', purchase_id,
        'starBitsSpent', booster_cost,
        'newStarBitsBalance', new_balance,
        'cards', reward_cards
    );
end;
$$;

revoke all on function public.open_star_bits_booster() from public;
revoke all on function public.open_star_bits_booster() from anon;
grant execute on function public.open_star_bits_booster() to authenticated;
