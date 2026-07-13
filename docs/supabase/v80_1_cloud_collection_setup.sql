-- ============================================================
-- STARLIGHT CARD BINDER
-- V80.1 CLOUD COLLECTION FOUNDATION
-- ============================================================

-- ------------------------------------------------------------
-- 1. CARD SERIES
-- ------------------------------------------------------------

create table if not exists public.card_series (
    id text primary key,

    name text not null,
    description text,
    booster_image_url text,

    sort_order integer not null default 0,
    is_visible boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. CARD CATALOG
-- ------------------------------------------------------------

create table if not exists public.cards (
    id text primary key,

    series_id text not null
        references public.card_series(id)
        on delete restrict,

    card_number text not null,
    name text not null,

    rarity text not null
        check (
            rarity in (
                'Common',
                'Uncommon',
                'Rare',
                'Epic',
                'Legendary'
            )
        ),

    image_url text not null,
    thumbnail_url text,

    description text,
    artist text,

    sort_order integer not null default 0,
    is_visible boolean not null default true,
    is_collectible boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (series_id, card_number)
);

-- ------------------------------------------------------------
-- 3. USER CARD OWNERSHIP
-- ------------------------------------------------------------

create table if not exists public.user_cards (
    id bigint generated always as identity primary key,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    card_id text not null
        references public.cards(id)
        on delete restrict,

    quantity integer not null default 1
        check (quantity >= 1),

    is_favorite boolean not null default false,

    first_obtained_at timestamptz not null default now(),
    last_obtained_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    unique (user_id, card_id)
);

-- ------------------------------------------------------------
-- 4. COLLECTION IMPORT HISTORY
-- ------------------------------------------------------------

create table if not exists public.collection_imports (
    id bigint generated always as identity primary key,

    user_id uuid not null
        references auth.users(id)
        on delete cascade,

    import_version text not null,
    import_hash text not null,

    imported_card_count integer not null default 0,
    imported_favorite_count integer not null default 0,

    created_at timestamptz not null default now(),

    unique (user_id, import_hash)
);

-- ------------------------------------------------------------
-- 5. INDEXES
-- ------------------------------------------------------------

create index if not exists user_cards_user_id_index
on public.user_cards(user_id);

create index if not exists user_cards_card_id_index
on public.user_cards(card_id);

create index if not exists cards_series_id_index
on public.cards(series_id);

create index if not exists collection_imports_user_id_index
on public.collection_imports(user_id);

-- ------------------------------------------------------------
-- 6. ENABLE ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.card_series enable row level security;
alter table public.cards enable row level security;
alter table public.user_cards enable row level security;
alter table public.collection_imports enable row level security;

-- ------------------------------------------------------------
-- 7. REMOVE POLICIES IF THIS SCRIPT IS RUN AGAIN
-- ------------------------------------------------------------

drop policy if exists
    "Visible card series are public"
on public.card_series;

drop policy if exists
    "Visible cards are public"
on public.cards;

drop policy if exists
    "Users can view their own cards"
on public.user_cards;

drop policy if exists
    "Users can view their own imports"
on public.collection_imports;

-- ------------------------------------------------------------
-- 8. PUBLIC CARD CATALOG POLICIES
-- ------------------------------------------------------------

create policy "Visible card series are public"
on public.card_series
for select
to anon, authenticated
using (is_visible = true);

create policy "Visible cards are public"
on public.cards
for select
to anon, authenticated
using (is_visible = true);

-- ------------------------------------------------------------
-- 9. USER COLLECTION READ POLICIES
-- ------------------------------------------------------------

create policy "Users can view their own cards"
on public.user_cards
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

create policy "Users can view their own imports"
on public.collection_imports
for select
to authenticated
using (
    (select auth.uid()) = user_id
);

-- ------------------------------------------------------------
-- 10. SAFE LEGACY COLLECTION IMPORT FUNCTION
-- ------------------------------------------------------------

create or replace function public.import_legacy_collection(
    collected_card_ids text[],
    requested_import_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    valid_card_ids text[];
    imported_count integer := 0;
    already_imported boolean := false;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception 'You must be signed in to import a collection.';
    end if;

    if requested_import_hash is null
       or length(trim(requested_import_hash)) < 8 then
        raise exception 'The import hash is invalid.';
    end if;

    if collected_card_ids is null then
        raise exception 'No collection data was supplied.';
    end if;

    if cardinality(collected_card_ids) > 1000 then
        raise exception 'The collection import is too large.';
    end if;

    select exists (
        select 1
        from public.collection_imports
        where user_id = current_user_id
          and import_hash = requested_import_hash
    )
    into already_imported;

    if already_imported then
        return jsonb_build_object(
            'success', true,
            'alreadyImported', true,
            'importedCount', 0
        );
    end if;

    select coalesce(
        array_agg(cards.id order by cards.id),
        array[]::text[]
    )
    into valid_card_ids
    from public.cards
    where cards.id = any(collected_card_ids)
      and cards.is_visible = true
      and cards.is_collectible = true;

    insert into public.user_cards (
        user_id,
        card_id,
        quantity,
        is_favorite
    )
    select
        current_user_id,
        valid_card_id,
        1,
        false
    from unnest(valid_card_ids) as valid_card_id
    on conflict (user_id, card_id)
    do nothing;

    get diagnostics imported_count = row_count;

    insert into public.collection_imports (
        user_id,
        import_version,
        import_hash,
        imported_card_count,
        imported_favorite_count
    )
    values (
        current_user_id,
        'v79.9-local-storage',
        requested_import_hash,
        imported_count,
        0
    );

    return jsonb_build_object(
        'success', true,
        'alreadyImported', false,
        'requestedCount', cardinality(collected_card_ids),
        'validCount', cardinality(valid_card_ids),
        'importedCount', imported_count
    );
end;
$$;

-- Allow authenticated users to call only this controlled function.
grant execute
on function public.import_legacy_collection(text[], text)
to authenticated;

-- ------------------------------------------------------------
-- 11. SAFE FAVORITE UPDATE FUNCTION FOR LATER
-- ------------------------------------------------------------

create or replace function public.set_card_favorite(
    requested_card_id text,
    favorite_state boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    affected_rows integer := 0;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception 'You must be signed in.';
    end if;

    update public.user_cards
    set
        is_favorite = favorite_state,
        updated_at = now()
    where user_id = current_user_id
      and card_id = requested_card_id;

    get diagnostics affected_rows = row_count;

    if affected_rows = 0 then
        raise exception 'You do not own this card.';
    end if;

    return jsonb_build_object(
        'success', true,
        'cardId', requested_card_id,
        'isFavorite', favorite_state
    );
end;
$$;

grant execute
on function public.set_card_favorite(text, boolean)
to authenticated;

-- ============================================================
-- SERIES 001: RISING STAR
-- ============================================================

insert into public.card_series (
    id,
    name,
    description,
    booster_image_url,
    sort_order,
    is_visible
)
values (
    '001',
    'Rising Star',
    'The debut card series for the return of the Shooting-Star Idol!',
    'https://starlightcardsbinder.pages.dev/site_assets/series01_rising_star_booster.png',
    1,
    true
)
on conflict (id)
do update set
    name = excluded.name,
    description = excluded.description,
    booster_image_url = excluded.booster_image_url,
    sort_order = excluded.sort_order,
    is_visible = excluded.is_visible,
    updated_at = now();

-- ============================================================
-- SERIES 001 CARDS
-- ============================================================

insert into public.cards (
    id,
    series_id,
    card_number,
    name,
    rarity,
    image_url,
    thumbnail_url,
    description,
    artist,
    sort_order,
    is_visible,
    is_collectible
)
values
(
    's01-001',
    '001',
    '001',
    'Rising Star Card 001',
    'Common',
    'https://starlightcardsbinder.pages.dev/cards/001.png',
    'https://starlightcardsbinder.pages.dev/thumbs/001.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    1,
    true,
    true
),
(
    's01-002',
    '001',
    '002',
    'Rising Star Card 002',
    'Common',
    'https://starlightcardsbinder.pages.dev/cards/002.png',
    'https://starlightcardsbinder.pages.dev/thumbs/002.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    2,
    true,
    true
),
(
    's01-003',
    '001',
    '003',
    'Rising Star Card 003',
    'Common',
    'https://starlightcardsbinder.pages.dev/cards/003.png',
    'https://starlightcardsbinder.pages.dev/thumbs/003.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    3,
    true,
    true
),
(
    's01-004',
    '001',
    '004',
    'Rising Star Card 004',
    'Common',
    'https://starlightcardsbinder.pages.dev/cards/004.png',
    'https://starlightcardsbinder.pages.dev/thumbs/004.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    4,
    true,
    true
),
(
    's01-005',
    '001',
    '005',
    'Rising Star Card 005',
    'Uncommon',
    'https://starlightcardsbinder.pages.dev/cards/005.png',
    'https://starlightcardsbinder.pages.dev/thumbs/005.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    5,
    true,
    true
),
(
    's01-006',
    '001',
    '006',
    'Rising Star Card 006',
    'Uncommon',
    'https://starlightcardsbinder.pages.dev/cards/006.png',
    'https://starlightcardsbinder.pages.dev/thumbs/006.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    6,
    true,
    true
),
(
    's01-007',
    '001',
    '007',
    'Rising Star Card 007',
    'Uncommon',
    'https://starlightcardsbinder.pages.dev/cards/007.png',
    'https://starlightcardsbinder.pages.dev/thumbs/007.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    7,
    true,
    true
),
(
    's01-008',
    '001',
    '008',
    'Blast Processing',
    'Rare',
    'https://starlightcardsbinder.pages.dev/cards/008.png',
    'https://starlightcardsbinder.pages.dev/thumbs/008.png',
    'Part of the debut card series celebrating the return of the Shooting-Star Idol! Sora Starlight the Hedgehog was the original face behind the silly, energetic personality that started it all.',
    'Kalanit Saidon',
    8,
    true,
    true
),
(
    's01-009',
    '001',
    '009',
    'Rising Star Card 009',
    'Rare',
    'https://starlightcardsbinder.pages.dev/cards/009.png',
    'https://starlightcardsbinder.pages.dev/thumbs/009.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    9,
    true,
    true
),
(
    's01-010',
    '001',
    '010',
    'Rising Star Card 010',
    'Rare',
    'https://starlightcardsbinder.pages.dev/cards/010.png',
    'https://starlightcardsbinder.pages.dev/thumbs/010.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    10,
    true,
    true
),
(
    's01-011',
    '001',
    '011',
    'Rising Star Card 011',
    'Epic',
    'https://starlightcardsbinder.pages.dev/cards/011.png',
    'https://starlightcardsbinder.pages.dev/thumbs/011.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    11,
    true,
    true
),
(
    's01-012',
    '001',
    '012',
    'Rising Star Card 012',
    'Legendary',
    'https://starlightcardsbinder.pages.dev/cards/012.png',
    'https://starlightcardsbinder.pages.dev/thumbs/012.png',
    'A collectible Starlight card from Series 01: Rising Star.',
    'Starlight Studio',
    12,
    true,
    true
)
on conflict (id)
do update set
    series_id = excluded.series_id,
    card_number = excluded.card_number,
    name = excluded.name,
    rarity = excluded.rarity,
    image_url = excluded.image_url,
    thumbnail_url = excluded.thumbnail_url,
    description = excluded.description,
    artist = excluded.artist,
    sort_order = excluded.sort_order,
    is_visible = excluded.is_visible,
    is_collectible = excluded.is_collectible,
    updated_at = now();