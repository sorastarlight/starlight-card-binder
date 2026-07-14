-- ============================================================
-- STARLIGHT CARD BINDER V82.3.1 HOTFIX
-- PROFILE IMAGES, COLLECTOR TITLES, AND ACHIEVEMENTS
-- ============================================================

alter table public.profiles
add column if not exists avatar_url text;

alter table public.profiles
add column if not exists selected_title_id text;

create table if not exists public.collector_titles (
    id text primary key,
    name text not null,
    description text,
    sort_order integer not null default 0,
    is_active boolean not null default true
);

insert into public.collector_titles (id, name, description, sort_order)
values
    ('new_collector', 'New Starlight Collector', 'Joined the Starlight Card Binder.', 10),
    ('first_pull', 'Starry-Eyed Puller', 'Opened a first reward pack.', 20),
    ('rare_hunter', 'Rare Card Hunter', 'Collected a Rare card.', 30),
    ('legendary_light', 'Legendary Starlight', 'Collected a Legendary card.', 40),
    ('series_complete', 'Rising Star Master', 'Completed an entire visible card series.', 50),
    ('star_bits_100', 'Star Bits Alchemist', 'Earned at least 100 lifetime Star Bits.', 60)
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_active = true;

create table if not exists public.achievement_definitions (
    id text primary key,
    name text not null,
    description text not null,
    icon text not null default '✦',
    sort_order integer not null default 0,
    is_active boolean not null default true
);

insert into public.achievement_definitions (id, name, description, icon, sort_order)
values
    ('account_created', 'First Light', 'Created a Starlight collector account.', '🌟', 10),
    ('first_card', 'First Pull', 'Collected your first card.', '🃏', 20),
    ('first_rare', 'Rare Find', 'Collected your first Rare card.', '💎', 30),
    ('first_legendary', 'Legendary Arrival', 'Collected your first Legendary card.', '👑', 40),
    ('five_unique', 'Growing Binder', 'Collected five unique cards.', '📚', 50),
    ('series_complete', 'Series Complete', 'Completed a full visible card series.', '🏆', 60),
    ('star_bits_100', 'Star Bits Spark', 'Earned 100 lifetime Star Bits.', '✦', 70)
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    icon = excluded.icon,
    sort_order = excluded.sort_order,
    is_active = true;

create table if not exists public.user_achievements (
    user_id uuid not null references auth.users(id) on delete cascade,
    achievement_id text not null references public.achievement_definitions(id) on delete cascade,
    unlocked_at timestamptz not null default now(),
    primary key (user_id, achievement_id)
);

create table if not exists public.user_titles (
    user_id uuid not null references auth.users(id) on delete cascade,
    title_id text not null references public.collector_titles(id) on delete cascade,
    unlocked_at timestamptz not null default now(),
    primary key (user_id, title_id)
);

alter table public.achievement_definitions enable row level security;
alter table public.collector_titles enable row level security;
alter table public.user_achievements enable row level security;
alter table public.user_titles enable row level security;

drop policy if exists "Achievement definitions are publicly readable" on public.achievement_definitions;
create policy "Achievement definitions are publicly readable"
on public.achievement_definitions for select to anon, authenticated using (is_active = true);

drop policy if exists "Collector titles are publicly readable" on public.collector_titles;
create policy "Collector titles are publicly readable"
on public.collector_titles for select to anon, authenticated using (is_active = true);

drop policy if exists "Users can read their achievements" on public.user_achievements;
create policy "Users can read their achievements"
on public.user_achievements for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their titles" on public.user_titles;
create policy "Users can read their titles"
on public.user_titles for select to authenticated using ((select auth.uid()) = user_id);

-- Public avatar bucket, restricted to 1 MB image files.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'profile-images',
    'profile-images',
    true,
    1048576,
    array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 1048576,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Users upload their own profile images" on storage.objects;
create policy "Users upload their own profile images"
on storage.objects for insert to authenticated
with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users update their own profile images" on storage.objects;
create policy "Users update their own profile images"
on storage.objects for update to authenticated
using (
    bucket_id = 'profile-images'
    and owner_id::text = (select auth.uid())::text
)
with check (
    bucket_id = 'profile-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Users delete their own profile images" on storage.objects;
create policy "Users delete their own profile images"
on storage.objects for delete to authenticated
using (
    bucket_id = 'profile-images'
    and owner_id::text = (select auth.uid())::text
);

drop policy if exists "Profile images are publicly readable" on storage.objects;
create policy "Profile images are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'profile-images');

create or replace function public.sync_my_achievements()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
    unique_count integer := 0;
    has_rare boolean := false;
    has_legendary boolean := false;
    has_complete_series boolean := false;
    lifetime_bits bigint := 0;
begin
    if uid is null then
        raise exception 'You must be signed in.';
    end if;

    select count(*),
           bool_or(cards.rarity = 'Rare'),
           bool_or(cards.rarity = 'Legendary')
    into unique_count, has_rare, has_legendary
    from public.user_cards
    join public.cards on cards.id = user_cards.card_id
    where user_cards.user_id = uid;

    select coalesce(lifetime_star_bits_earned, 0)
    into lifetime_bits
    from public.user_wallets
    where user_id = uid;

    select exists (
        select 1
        from public.card_series s
        where s.is_visible = true
          and not exists (
              select 1
              from public.cards c
              where c.series_id = s.id
                and c.is_visible = true
                and c.is_collectible = true
                and not exists (
                    select 1 from public.user_cards uc
                    where uc.user_id = uid and uc.card_id = c.id
                )
          )
    ) into has_complete_series;

    insert into public.user_achievements (user_id, achievement_id)
    values (uid, 'account_created') on conflict do nothing;

    if unique_count >= 1 then
        insert into public.user_achievements values (uid, 'first_card', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'first_pull', now()) on conflict do nothing;
    end if;
    if has_rare then
        insert into public.user_achievements values (uid, 'first_rare', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'rare_hunter', now()) on conflict do nothing;
    end if;
    if has_legendary then
        insert into public.user_achievements values (uid, 'first_legendary', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'legendary_light', now()) on conflict do nothing;
    end if;
    if unique_count >= 5 then
        insert into public.user_achievements values (uid, 'five_unique', now()) on conflict do nothing;
    end if;
    if has_complete_series then
        insert into public.user_achievements values (uid, 'series_complete', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'series_complete', now()) on conflict do nothing;
    end if;
    if lifetime_bits >= 100 then
        insert into public.user_achievements values (uid, 'star_bits_100', now()) on conflict do nothing;
        insert into public.user_titles values (uid, 'star_bits_100', now()) on conflict do nothing;
    end if;

    insert into public.user_titles values (uid, 'new_collector', now()) on conflict do nothing;

    return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.sync_my_achievements() to authenticated;

create or replace function public.set_my_profile_extras(
    requested_avatar_url text,
    requested_title_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    uid uuid := auth.uid();
begin
    if uid is null then raise exception 'You must be signed in.'; end if;

    if requested_title_id is not null and not exists (
        select 1 from public.user_titles
        where user_id = uid and title_id = requested_title_id
    ) then
        raise exception 'That collector title is not unlocked.';
    end if;

    update public.profiles
    set avatar_url = nullif(trim(requested_avatar_url), ''),
        selected_title_id = requested_title_id,
        updated_at = now()
    where id::text = uid::text;

    return jsonb_build_object('success', true);
end;
$$;

grant execute on function public.set_my_profile_extras(text, text) to authenticated;

create or replace function public.get_my_profile_extras()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare uid uuid := auth.uid();
begin
    if uid is null then raise exception 'You must be signed in.'; end if;
    perform public.sync_my_achievements();
    return jsonb_build_object(
        'avatarUrl', (select avatar_url from public.profiles where id::text = uid::text),
        'selectedTitleId', (select selected_title_id from public.profiles where id::text = uid::text),
        'titles', coalesce((
            select jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'description', t.description) order by t.sort_order)
            from public.user_titles ut join public.collector_titles t on t.id = ut.title_id
            where ut.user_id = uid and t.is_active = true
        ), '[]'::jsonb),
        'achievements', coalesce((
            select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.name, 'description', a.description, 'icon', a.icon, 'unlockedAt', ua.unlocked_at) order by a.sort_order)
            from public.user_achievements ua join public.achievement_definitions a on a.id = ua.achievement_id
            where ua.user_id = uid and a.is_active = true
        ), '[]'::jsonb)
    );
end;
$$;

grant execute on function public.get_my_profile_extras() to authenticated;

create or replace function public.get_public_profile_extras(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    target_profile_id text;
    target_user_id uuid;
begin
    select id::text
    into target_profile_id
    from public.profiles
    where lower(username) = lower(trim(requested_username))
      and onboarding_complete = true
      and profile_visibility in ('public','unlisted')
    limit 1;

    if target_profile_id is null then
        return jsonb_build_object('found', false);
    end if;

    begin
        target_user_id := target_profile_id::uuid;
    exception when invalid_text_representation then
        return jsonb_build_object('found', false);
    end;

    return jsonb_build_object(
        'found', true,
        'avatarUrl', (
            select avatar_url
            from public.profiles
            where id::text = target_profile_id
        ),
        'title', (
            select jsonb_build_object(
                'id', t.id,
                'name', t.name,
                'description', t.description
            )
            from public.profiles p
            join public.collector_titles t
              on t.id::text = p.selected_title_id::text
            where p.id::text = target_profile_id
        ),
        'achievements', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'name', a.name,
                    'description', a.description,
                    'icon', a.icon,
                    'unlockedAt', ua.unlocked_at
                )
                order by a.sort_order
            )
            from public.user_achievements ua
            join public.achievement_definitions a
              on a.id = ua.achievement_id
            where ua.user_id = target_user_id
              and a.is_active = true
        ), '[]'::jsonb)
    );
end;
$$;

grant execute on function public.get_public_profile_extras(text) to anon, authenticated;
