-- ============================================================
-- STARLIGHT CARD BINDER
-- V80.5 DAILY BOOSTER FOUNDATION
-- ============================================================

-- ------------------------------------------------------------
-- 1. DAILY BOOSTER CLAIM HISTORY
-- ------------------------------------------------------------

create table if not exists public.daily_booster_claims (
    id bigint generated always as identity primary key,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    claim_date date not null,

    cards_awarded jsonb not null
        default '[]'::jsonb,

    claimed_at timestamptz not null
        default now(),

    unique (
        user_id,
        claim_date
    )
);

create index if not exists
    daily_booster_claims_user_id_index
on public.daily_booster_claims(user_id);

create index if not exists
    daily_booster_claims_claim_date_index
on public.daily_booster_claims(claim_date);

alter table public.daily_booster_claims
enable row level security;

drop policy if exists
    "Users can view their own daily claims"
on public.daily_booster_claims;

create policy
    "Users can view their own daily claims"
on public.daily_booster_claims
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

-- ------------------------------------------------------------
-- 2. DAILY BOOSTER STATUS FUNCTION
-- ------------------------------------------------------------

create or replace function public.get_daily_booster_status()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    current_claim_date date;
    next_claim_at timestamptz;
    existing_claim public.daily_booster_claims%rowtype;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to check your daily booster.';
    end if;

    /*
     * Daily rewards reset at midnight in America/New_York.
     */
    current_claim_date :=
        timezone(
            'America/New_York',
            now()
        )::date;

    next_claim_at :=
        (
            (
                current_claim_date + 1
            )::timestamp
            at time zone
            'America/New_York'
        );

    select *
    into existing_claim
    from public.daily_booster_claims
    where user_id = current_user_id
      and claim_date = current_claim_date
    limit 1;

    if found then
        return jsonb_build_object(
            'available',
                false,

            'claimDate',
                current_claim_date,

            'claimedAt',
                existing_claim.claimed_at,

            'nextClaimAt',
                next_claim_at,

            'cardsAwarded',
                existing_claim.cards_awarded
        );
    end if;

    return jsonb_build_object(
        'available',
            true,

        'claimDate',
            current_claim_date,

        'claimedAt',
            null,

        'nextClaimAt',
            next_claim_at,

        'cardsAwarded',
            '[]'::jsonb
    );
end;
$$;

grant execute
on function public.get_daily_booster_status()
to authenticated;

-- ------------------------------------------------------------
-- 3. SECURE DAILY BOOSTER OPENING FUNCTION
-- ------------------------------------------------------------

create or replace function public.open_daily_booster()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    current_claim_date date;
    next_claim_at timestamptz;

    claim_id bigint;

    common_card_one text;
    common_card_two text;
    uncommon_card text;
    rare_plus_card text;

    rare_plus_roll numeric;

    selected_card_ids text[];
    reward_cards jsonb;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to open a daily booster.';
    end if;

    current_claim_date :=
        timezone(
            'America/New_York',
            now()
        )::date;

    next_claim_at :=
        (
            (
                current_claim_date + 1
            )::timestamp
            at time zone
            'America/New_York'
        );

    /*
     * Insert the claim before awarding anything.
     *
     * The unique constraint prevents two simultaneous requests
     * from opening two packs for the same account and date.
     */
    insert into public.daily_booster_claims (
        user_id,
        claim_date,
        cards_awarded
    )
    values (
        current_user_id,
        current_claim_date,
        '[]'::jsonb
    )
    on conflict (
        user_id,
        claim_date
    )
    do nothing
    returning id
    into claim_id;

    if claim_id is null then
        return jsonb_build_object(
            'success',
                false,

            'alreadyClaimed',
                true,

            'message',
                'Today''s daily booster has already been opened.',

            'nextClaimAt',
                next_claim_at
        );
    end if;

    -- --------------------------------------------------------
    -- COMMON CARD ONE
    -- --------------------------------------------------------

    select cards.id
    into common_card_one
    from public.cards
    where rarity = 'Common'
      and is_visible = true
      and is_collectible = true
    order by random()
    limit 1;

    -- --------------------------------------------------------
    -- COMMON CARD TWO
    -- --------------------------------------------------------

    select cards.id
    into common_card_two
    from public.cards
    where rarity = 'Common'
      and is_visible = true
      and is_collectible = true
    order by random()
    limit 1;

    -- --------------------------------------------------------
    -- UNCOMMON CARD
    -- --------------------------------------------------------

    select cards.id
    into uncommon_card
    from public.cards
    where rarity = 'Uncommon'
      and is_visible = true
      and is_collectible = true
    order by random()
    limit 1;

    -- --------------------------------------------------------
    -- RARE-OR-BETTER CARD
    --
    -- 70% Rare
    -- 20% Epic
    -- 10% Legendary
    -- --------------------------------------------------------

    rare_plus_roll := random();

    if rare_plus_roll < 0.70 then
        select cards.id
        into rare_plus_card
        from public.cards
        where rarity = 'Rare'
          and is_visible = true
          and is_collectible = true
        order by random()
        limit 1;

    elsif rare_plus_roll < 0.90 then
        select cards.id
        into rare_plus_card
        from public.cards
        where rarity = 'Epic'
          and is_visible = true
          and is_collectible = true
        order by random()
        limit 1;

    else
        select cards.id
        into rare_plus_card
        from public.cards
        where rarity = 'Legendary'
          and is_visible = true
          and is_collectible = true
        order by random()
        limit 1;
    end if;

    /*
     * Fallback if a selected rarity currently has no eligible cards.
     */
    if rare_plus_card is null then
        select cards.id
        into rare_plus_card
        from public.cards
        where rarity in (
            'Rare',
            'Epic',
            'Legendary'
        )
          and is_visible = true
          and is_collectible = true
        order by random()
        limit 1;
    end if;

    if common_card_one is null
       or common_card_two is null
       or uncommon_card is null
       or rare_plus_card is null then

        delete from public.daily_booster_claims
        where id = claim_id;

        raise exception
            'The daily booster card pool is not configured correctly.';
    end if;

    selected_card_ids := array[
        common_card_one,
        common_card_two,
        uncommon_card,
        rare_plus_card
    ];

    -- --------------------------------------------------------
    -- AWARD CARDS
    --
    -- Repeated cards within a pack are grouped together.
    -- Existing cards gain quantity.
    -- New cards begin at quantity 1.
    -- --------------------------------------------------------

    insert into public.user_cards (
        user_id,
        card_id,
        quantity,
        is_favorite,
        first_obtained_at,
        last_obtained_at,
        updated_at
    )
    select
        current_user_id,
        selected_cards.card_id,
        selected_cards.awarded_quantity,
        false,
        now(),
        now(),
        now()

    from (
        select
            selected_card_id as card_id,
            count(*)::integer as awarded_quantity

        from unnest(
            selected_card_ids
        ) as selected_card_id

        group by selected_card_id
    ) as selected_cards

    on conflict (
        user_id,
        card_id
    )
    do update set
        quantity =
            public.user_cards.quantity
            +
            excluded.quantity,

        last_obtained_at =
            now(),

        updated_at =
            now();

    -- --------------------------------------------------------
    -- BUILD ORDERED REWARD RESULTS
    -- --------------------------------------------------------

    select jsonb_agg(
        jsonb_build_object(
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

            'artist',
                cards.artist,

            'description',
                cards.description,

            'quantity',
                user_cards.quantity,

            'isDuplicate',
                user_cards.quantity > 1
        )
        order by selected_cards.pack_position
    )
    into reward_cards

    from unnest(
        selected_card_ids
    )
    with ordinality
    as selected_cards(
        card_id,
        pack_position
    )

    join public.cards
      on cards.id =
         selected_cards.card_id

    join public.card_series
      on card_series.id =
         cards.series_id

    join public.user_cards
      on user_cards.user_id =
         current_user_id
     and user_cards.card_id =
         cards.id;

    update public.daily_booster_claims
    set cards_awarded =
        reward_cards
    where id =
        claim_id;

    return jsonb_build_object(
        'success',
            true,

        'alreadyClaimed',
            false,

        'claimDate',
            current_claim_date,

        'claimedAt',
            now(),

        'nextClaimAt',
            next_claim_at,

        'cards',
            reward_cards
    );
end;
$$;

grant execute
on function public.open_daily_booster()
to authenticated;