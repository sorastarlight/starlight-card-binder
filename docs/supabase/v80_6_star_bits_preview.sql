-- ============================================================
-- STARLIGHT CARD BINDER
-- V80.6 STAR BITS PREVIEW FOUNDATION
-- ============================================================

-- ------------------------------------------------------------
-- 1. USER STAR BITS WALLET
-- ------------------------------------------------------------

create table if not exists public.user_wallets (
    user_id uuid primary key
        references auth.users(id)
        on delete cascade,

    star_bits bigint not null default 0
        check (star_bits >= 0),

    lifetime_star_bits_earned bigint not null default 0
        check (lifetime_star_bits_earned >= 0),

    lifetime_star_bits_spent bigint not null default 0
        check (lifetime_star_bits_spent >= 0),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

alter table public.user_wallets
enable row level security;

drop policy if exists
    "Users can view their own wallet"
on public.user_wallets;

create policy
    "Users can view their own wallet"
on public.user_wallets
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

-- Regular users receive no direct insert, update, or delete policy.

-- ------------------------------------------------------------
-- 2. CREATE WALLETS FOR EXISTING USERS
-- ------------------------------------------------------------

insert into public.user_wallets (
    user_id
)
select
    auth.users.id
from auth.users
on conflict (user_id)
do nothing;

-- ------------------------------------------------------------
-- 3. CREATE WALLETS FOR FUTURE USERS
-- ------------------------------------------------------------

create or replace function public.ensure_user_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.user_wallets (
        user_id
    )
    values (
        new.id
    )
    on conflict (user_id)
    do nothing;

    return new;
end;
$$;

drop trigger if exists
    on_auth_user_create_wallet
on auth.users;

create trigger
    on_auth_user_create_wallet
after insert
on auth.users
for each row
execute procedure public.ensure_user_wallet();

-- ------------------------------------------------------------
-- 4. STAR BITS VALUES
--
-- These values may be adjusted later without changing ownership.
-- ------------------------------------------------------------

create table if not exists public.star_bits_values (
    rarity text primary key,

    bits_per_duplicate integer not null
        check (bits_per_duplicate >= 0)
);

insert into public.star_bits_values (
    rarity,
    bits_per_duplicate
)
values
    ('Common', 5),
    ('Uncommon', 10),
    ('Rare', 25),
    ('Epic', 75),
    ('Legendary', 250)
on conflict (rarity)
do update set
    bits_per_duplicate =
        excluded.bits_per_duplicate;

alter table public.star_bits_values
enable row level security;

drop policy if exists
    "Star Bits values are publicly readable"
on public.star_bits_values;

create policy
    "Star Bits values are publicly readable"
on public.star_bits_values
for select
to anon, authenticated
using (true);

-- ------------------------------------------------------------
-- 5. STAR BITS EXCHANGE HISTORY
--
-- No exchange rows will be created until conversion is activated.
-- ------------------------------------------------------------

create table if not exists public.star_bits_transactions (
    id bigint generated always as identity primary key,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    transaction_type text not null
        check (
            transaction_type in (
                'duplicate_conversion',
                'admin_grant',
                'reward',
                'purchase',
                'adjustment'
            )
        ),

    star_bits_change bigint not null,

    card_id text
        references public.cards(id)
        on delete set null,

    card_quantity_change integer,

    description text,

    metadata jsonb not null
        default '{}'::jsonb,

    created_at timestamptz not null
        default now()
);

create index if not exists
    star_bits_transactions_user_id_index
on public.star_bits_transactions(user_id);

alter table public.star_bits_transactions
enable row level security;

drop policy if exists
    "Users can view their own Star Bits history"
on public.star_bits_transactions;

create policy
    "Users can view their own Star Bits history"
on public.star_bits_transactions
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

-- ------------------------------------------------------------
-- 6. SECURE STAR BITS PREVIEW FUNCTION
-- ------------------------------------------------------------

create or replace function public.get_star_bits_exchange_preview()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;

    current_balance bigint := 0;
    duplicate_card_types integer := 0;
    total_duplicate_copies integer := 0;
    total_exchange_value bigint := 0;

    duplicate_cards jsonb := '[]'::jsonb;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to view your Star Bits exchange.';
    end if;

    insert into public.user_wallets (
        user_id
    )
    values (
        current_user_id
    )
    on conflict (user_id)
    do nothing;

    select
        star_bits
    into
        current_balance
    from public.user_wallets
    where user_id =
        current_user_id;

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
        duplicate_card_types,
        total_duplicate_copies,
        total_exchange_value
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

    select coalesce(
        jsonb_agg(
            jsonb_build_object(
                'cardId',
                    duplicate_data.card_id,

                'cardNumber',
                    duplicate_data.card_number,

                'name',
                    duplicate_data.name,

                'rarity',
                    duplicate_data.rarity,

                'imageUrl',
                    duplicate_data.image_url,

                'thumbnailUrl',
                    duplicate_data.thumbnail_url,

                'seriesId',
                    duplicate_data.series_id,

                'seriesName',
                    duplicate_data.series_name,

                'totalQuantity',
                    duplicate_data.total_quantity,

                'keptQuantity',
                    1,

                'duplicateQuantity',
                    duplicate_data.duplicate_quantity,

                'bitsPerDuplicate',
                    duplicate_data.bits_per_duplicate,

                'totalBitValue',
                    duplicate_data.total_bit_value
            )
            order by
                duplicate_data.series_sort,
                duplicate_data.card_sort
        ),
        '[]'::jsonb
    )
    into duplicate_cards

    from (
        select
            cards.id as card_id,
            cards.card_number,
            cards.name,
            cards.rarity,
            cards.image_url,
            cards.thumbnail_url,
            cards.series_id,
            card_series.name as series_name,
            card_series.sort_order as series_sort,
            cards.sort_order as card_sort,

            user_cards.quantity as total_quantity,

            user_cards.quantity - 1
                as duplicate_quantity,

            star_bits_values.bits_per_duplicate,

            (
                user_cards.quantity - 1
            )
            *
            star_bits_values.bits_per_duplicate
                as total_bit_value

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
    ) as duplicate_data;

    return jsonb_build_object(
        'starBitsBalance',
            current_balance,

        'duplicateCardTypes',
            duplicate_card_types,

        'totalDuplicateCopies',
            total_duplicate_copies,

        'totalExchangeValue',
            total_exchange_value,

        'duplicateCards',
            duplicate_cards,

        'exchangeRates',
            jsonb_build_object(
                'Common', 5,
                'Uncommon', 10,
                'Rare', 25,
                'Epic', 75,
                'Legendary', 250
            )
    );
end;
$$;

grant execute
on function public.get_star_bits_exchange_preview()
to authenticated;