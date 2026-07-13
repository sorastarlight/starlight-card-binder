-- ============================================================
-- STARLIGHT CARD BINDER
-- V80.3 COLLECTOR PROFILE FOUNDATION
-- ============================================================

-- ------------------------------------------------------------
-- 1. ADD PROFILE FIELDS
-- ------------------------------------------------------------

alter table public.profiles
add column if not exists show_collection_stats boolean
not null default true;

alter table public.profiles
add column if not exists show_favorites boolean
not null default true;

alter table public.profiles
add column if not exists show_featured_cards boolean
not null default true;

alter table public.profiles
add column if not exists favorite_card_id text
references public.cards(id)
on delete set null;

alter table public.profiles
add column if not exists updated_at timestamptz
not null default now();

-- ------------------------------------------------------------
-- 2. VALIDATE PROFILE VISIBILITY
-- ------------------------------------------------------------

alter table public.profiles
drop constraint if exists profiles_profile_visibility_check;

alter table public.profiles
add constraint profiles_profile_visibility_check
check (
    profile_visibility in (
        'public',
        'unlisted',
        'private'
    )
);

-- ------------------------------------------------------------
-- 3. USERNAME FORMAT
-- ------------------------------------------------------------

alter table public.profiles
drop constraint if exists profiles_username_format_check;

alter table public.profiles
add constraint profiles_username_format_check
check (
    username ~ '^[a-z0-9_]{3,24}$'
);

-- ------------------------------------------------------------
-- 4. DISPLAY NAME AND BIO LIMITS
-- ------------------------------------------------------------

alter table public.profiles
drop constraint if exists profiles_display_name_length_check;

alter table public.profiles
add constraint profiles_display_name_length_check
check (
    display_name is null
    or char_length(display_name) between 1 and 40
);

alter table public.profiles
drop constraint if exists profiles_bio_length_check;

alter table public.profiles
add constraint profiles_bio_length_check
check (
    bio is null
    or char_length(bio) <= 240
);

-- ------------------------------------------------------------
-- 5. RESERVED USERNAMES
-- ------------------------------------------------------------

create table if not exists public.reserved_usernames (
    username text primary key
);

insert into public.reserved_usernames (username)
values
    ('admin'),
    ('administrator'),
    ('api'),
    ('auth'),
    ('binder'),
    ('cards'),
    ('checklist'),
    ('collection'),
    ('collector'),
    ('help'),
    ('login'),
    ('logout'),
    ('moderator'),
    ('profile'),
    ('redeem'),
    ('settings'),
    ('sora'),
    ('sorastarlight'),
    ('staff'),
    ('starbits'),
    ('support'),
    ('system')
on conflict (username)
do nothing;

alter table public.reserved_usernames
enable row level security;

drop policy if exists
    "Reserved usernames are publicly readable"
on public.reserved_usernames;

create policy
    "Reserved usernames are publicly readable"
on public.reserved_usernames
for select
to anon, authenticated
using (true);

-- ------------------------------------------------------------
-- 6. REMOVE THE OLD GENERAL UPDATE POLICY
-- ------------------------------------------------------------

drop policy if exists
    "Users can update their own profile"
on public.profiles;

-- ------------------------------------------------------------
-- 7. SAFE PROFILE UPDATE FUNCTION
-- ------------------------------------------------------------

create or replace function public.update_collector_profile(
    requested_username text,
    requested_display_name text,
    requested_bio text,
    requested_visibility text,
    requested_show_collection_stats boolean,
    requested_show_favorites boolean,
    requested_show_featured_cards boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
    normalized_username text;
    normalized_display_name text;
    normalized_bio text;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in to update your profile.';
    end if;

    normalized_username :=
        lower(trim(requested_username));

    normalized_display_name :=
        nullif(trim(requested_display_name), '');

    normalized_bio :=
        nullif(trim(requested_bio), '');

    if normalized_username !~
       '^[a-z0-9_]{3,24}$' then
        raise exception
            'Username must be 3–24 characters using lowercase letters, numbers, or underscores.';
    end if;

    if exists (
        select 1
        from public.reserved_usernames
        where username = normalized_username
    ) then
        raise exception
            'That username is reserved.';
    end if;

    if exists (
        select 1
        from public.profiles
        where lower(username) =
              normalized_username
          and id <> current_user_id
    ) then
        raise exception
            'That username is already taken.';
    end if;

    if normalized_display_name is null
       or char_length(normalized_display_name) > 40 then
        raise exception
            'Display name must be between 1 and 40 characters.';
    end if;

    if normalized_bio is not null
       and char_length(normalized_bio) > 240 then
        raise exception
            'Bio must be 240 characters or fewer.';
    end if;

    if requested_visibility not in (
        'public',
        'unlisted',
        'private'
    ) then
        raise exception
            'Invalid profile visibility.';
    end if;

    update public.profiles
    set
        username =
            normalized_username,

        display_name =
            normalized_display_name,

        bio =
            normalized_bio,

        profile_visibility =
            requested_visibility,

        show_collection_stats =
            coalesce(
                requested_show_collection_stats,
                true
            ),

        show_favorites =
            coalesce(
                requested_show_favorites,
                true
            ),

        show_featured_cards =
            coalesce(
                requested_show_featured_cards,
                true
            ),

        onboarding_complete =
            true,

        updated_at =
            now()

    where id =
        current_user_id;

    return jsonb_build_object(
        'success', true,
        'username', normalized_username,
        'displayName', normalized_display_name,
        'bio', normalized_bio,
        'visibility', requested_visibility
    );
end;
$$;

grant execute
on function public.update_collector_profile(
    text,
    text,
    text,
    text,
    boolean,
    boolean,
    boolean
)
to authenticated;

-- ------------------------------------------------------------
-- 8. SAFE FAVORITE-CARD PROFILE FUNCTION
-- ------------------------------------------------------------

create or replace function public.set_profile_favorite_card(
    requested_card_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid;
begin
    current_user_id := auth.uid();

    if current_user_id is null then
        raise exception
            'You must be signed in.';
    end if;

    if requested_card_id is not null
       and not exists (
            select 1
            from public.user_cards
            where user_id =
                  current_user_id
              and card_id =
                  requested_card_id
       ) then
        raise exception
            'You do not own that card.';
    end if;

    update public.profiles
    set
        favorite_card_id =
            requested_card_id,

        updated_at =
            now()

    where id =
        current_user_id;

    return jsonb_build_object(
        'success', true,
        'favoriteCardId', requested_card_id
    );
end;
$$;

grant execute
on function public.set_profile_favorite_card(text)
to authenticated;
-- ============================================================
-- V80.3 PROFILE READ POLICIES
-- ============================================================

alter table public.profiles
enable row level security;

drop policy if exists
    "Public profiles can be viewed"
on public.profiles;

drop policy if exists
    "Users can read their own profile"
on public.profiles;

create policy
    "Users can read their own profile"
on public.profiles
for select
to authenticated
using (
    (select auth.uid()) = id
);

create policy
    "Public and unlisted profiles can be viewed"
on public.profiles
for select
to anon, authenticated
using (
    onboarding_complete = true
    and profile_visibility in (
        'public',
        'unlisted'
    )
);