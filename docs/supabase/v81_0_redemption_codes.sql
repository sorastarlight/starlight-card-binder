-- ============================================================
-- STARLIGHT CARD BINDER
-- V81.0 SECURE REDEMPTION CODES + ADMIN FOUNDATION
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. SITE ROLES
-- ------------------------------------------------------------

create table if not exists public.site_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('admin', 'moderator')),
    created_at timestamptz not null default now()
);

alter table public.site_roles enable row level security;

-- No public policies. Access occurs through protected functions.

-- ------------------------------------------------------------
-- 2. REWARD CODES
-- ------------------------------------------------------------

create table if not exists public.reward_codes (
    id uuid primary key default gen_random_uuid(),
    code_hash text not null unique,
    code_preview text not null,
    label text not null,
    active boolean not null default true,
    max_uses integer check (max_uses is null or max_uses > 0),
    current_uses integer not null default 0 check (current_uses >= 0),
    starts_at timestamptz,
    expires_at timestamptz,
    created_by uuid not null references auth.users(id) on delete restrict,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create index if not exists reward_codes_active_index
on public.reward_codes(active);

alter table public.reward_codes enable row level security;

-- ------------------------------------------------------------
-- 3. REWARD CONFIGURATION
-- ------------------------------------------------------------

create table if not exists public.reward_code_rewards (
    code_id uuid primary key references public.reward_codes(id) on delete cascade,
    reward_type text not null check (reward_type in ('single_card', 'booster', 'star_bits')),
    card_id text references public.cards(id) on delete restrict,
    card_quantity integer check (card_quantity is null or card_quantity > 0),
    booster_card_ids text[],
    star_bits_amount bigint check (star_bits_amount is null or star_bits_amount > 0),
    created_at timestamptz not null default now(),
    check (
        (reward_type = 'single_card' and card_id is not null and card_quantity is not null and booster_card_ids is null and star_bits_amount is null)
        or
        (reward_type = 'booster' and booster_card_ids is not null and cardinality(booster_card_ids) > 0 and card_id is null and card_quantity is null and star_bits_amount is null)
        or
        (reward_type = 'star_bits' and star_bits_amount is not null and card_id is null and card_quantity is null and booster_card_ids is null)
    )
);

alter table public.reward_code_rewards enable row level security;

-- ------------------------------------------------------------
-- 4. REDEMPTION HISTORY
-- ------------------------------------------------------------

create table if not exists public.reward_code_redemptions (
    id bigint generated always as identity primary key,
    code_id uuid not null references public.reward_codes(id) on delete restrict,
    user_id uuid not null references auth.users(id) on delete cascade,
    reward_snapshot jsonb not null default '{}'::jsonb,
    redeemed_at timestamptz not null default now(),
    unique (code_id, user_id)
);

create index if not exists reward_code_redemptions_user_index
on public.reward_code_redemptions(user_id);

alter table public.reward_code_redemptions enable row level security;

create policy "Users can view their own code redemptions"
on public.reward_code_redemptions
for select
to authenticated
using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------
-- 5. ADMIN CHECK HELPER
-- ------------------------------------------------------------

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.site_roles
        where user_id = auth.uid()
          and role = 'admin'
    );
$$;

grant execute on function public.is_site_admin() to authenticated;

-- ------------------------------------------------------------
-- 6. CREATE A REWARD CODE (ADMIN ONLY)
-- ------------------------------------------------------------

create or replace function public.admin_create_reward_code(
    requested_code text,
    requested_label text,
    requested_reward_type text,
    requested_card_id text default null,
    requested_card_quantity integer default null,
    requested_booster_card_ids text[] default null,
    requested_star_bits_amount bigint default null,
    requested_max_uses integer default null,
    requested_starts_at timestamptz default null,
    requested_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    normalized_code text;
    generated_hash text;
    new_code_id uuid;
begin
    if current_user_id is null or not public.is_site_admin() then
        raise exception 'Administrator access is required.';
    end if;

    normalized_code := regexp_replace(upper(trim(requested_code)), '[^A-Z0-9]', '', 'g');

    if char_length(normalized_code) < 6 or char_length(normalized_code) > 40 then
        raise exception 'Code must contain 6 to 40 letters or numbers.';
    end if;

    if nullif(trim(requested_label), '') is null then
        raise exception 'A label is required.';
    end if;

    if requested_reward_type not in ('single_card', 'booster', 'star_bits') then
        raise exception 'Invalid reward type.';
    end if;

    if requested_max_uses is not null and requested_max_uses < 1 then
        raise exception 'Maximum uses must be at least 1.';
    end if;

    if requested_expires_at is not null
       and requested_starts_at is not null
       and requested_expires_at <= requested_starts_at then
        raise exception 'Expiration must be after the start time.';
    end if;

    if requested_reward_type = 'single_card' then
        if requested_card_id is null or coalesce(requested_card_quantity, 0) < 1 then
            raise exception 'Single-card rewards require a valid card and quantity.';
        end if;
        if not exists (select 1 from public.cards where id = requested_card_id and is_collectible = true) then
            raise exception 'The selected card is not collectible.';
        end if;
    elsif requested_reward_type = 'booster' then
        if requested_booster_card_ids is null or cardinality(requested_booster_card_ids) < 1 then
            raise exception 'Booster rewards require at least one card.';
        end if;
        if exists (
            select 1
            from unnest(requested_booster_card_ids) supplied(card_id)
            left join public.cards on cards.id = supplied.card_id and cards.is_collectible = true
            where cards.id is null
        ) then
            raise exception 'One or more booster cards are invalid.';
        end if;
    elsif requested_reward_type = 'star_bits' then
        if coalesce(requested_star_bits_amount, 0) < 1 then
            raise exception 'Star Bits rewards must be at least 1.';
        end if;
    end if;

    generated_hash := encode(digest(normalized_code, 'sha256'), 'hex');

    insert into public.reward_codes (
        code_hash,
        code_preview,
        label,
        max_uses,
        starts_at,
        expires_at,
        created_by
    ) values (
        generated_hash,
        right(normalized_code, 4),
        trim(requested_label),
        requested_max_uses,
        requested_starts_at,
        requested_expires_at,
        current_user_id
    ) returning id into new_code_id;

    insert into public.reward_code_rewards (
        code_id,
        reward_type,
        card_id,
        card_quantity,
        booster_card_ids,
        star_bits_amount
    ) values (
        new_code_id,
        requested_reward_type,
        case when requested_reward_type = 'single_card' then requested_card_id else null end,
        case when requested_reward_type = 'single_card' then requested_card_quantity else null end,
        case when requested_reward_type = 'booster' then requested_booster_card_ids else null end,
        case when requested_reward_type = 'star_bits' then requested_star_bits_amount else null end
    );

    return jsonb_build_object(
        'success', true,
        'id', new_code_id,
        'code', normalized_code,
        'label', trim(requested_label),
        'rewardType', requested_reward_type
    );
exception
    when unique_violation then
        raise exception 'That redemption code already exists.';
end;
$$;

revoke all on function public.admin_create_reward_code(text,text,text,text,integer,text[],bigint,integer,timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_create_reward_code(text,text,text,text,integer,text[],bigint,integer,timestamptz,timestamptz) to authenticated;

-- ------------------------------------------------------------
-- 7. LIST REWARD CODES (ADMIN ONLY)
-- ------------------------------------------------------------

create or replace function public.admin_list_reward_codes()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null or not public.is_site_admin() then
        raise exception 'Administrator access is required.';
    end if;

    return coalesce((
        select jsonb_agg(
            jsonb_build_object(
                'id', reward_codes.id,
                'label', reward_codes.label,
                'codePreview', reward_codes.code_preview,
                'active', reward_codes.active,
                'maxUses', reward_codes.max_uses,
                'currentUses', reward_codes.current_uses,
                'startsAt', reward_codes.starts_at,
                'expiresAt', reward_codes.expires_at,
                'createdAt', reward_codes.created_at,
                'rewardType', reward_code_rewards.reward_type,
                'cardId', reward_code_rewards.card_id,
                'cardQuantity', reward_code_rewards.card_quantity,
                'boosterCardIds', reward_code_rewards.booster_card_ids,
                'starBitsAmount', reward_code_rewards.star_bits_amount
            ) order by reward_codes.created_at desc
        )
        from public.reward_codes
        join public.reward_code_rewards on reward_code_rewards.code_id = reward_codes.id
    ), '[]'::jsonb);
end;
$$;

grant execute on function public.admin_list_reward_codes() to authenticated;

-- ------------------------------------------------------------
-- 8. TOGGLE CODE ACTIVE STATE (ADMIN ONLY)
-- ------------------------------------------------------------

create or replace function public.admin_set_reward_code_active(
    requested_code_id uuid,
    requested_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
    if auth.uid() is null or not public.is_site_admin() then
        raise exception 'Administrator access is required.';
    end if;

    update public.reward_codes
    set active = requested_active, updated_at = now()
    where id = requested_code_id;

    if not found then
        raise exception 'Reward code not found.';
    end if;

    return jsonb_build_object('success', true, 'active', requested_active);
end;
$$;

grant execute on function public.admin_set_reward_code_active(uuid, boolean) to authenticated;

-- ------------------------------------------------------------
-- 9. REDEEM A CODE
-- ------------------------------------------------------------

create or replace function public.redeem_reward_code(requested_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    normalized_code text;
    generated_hash text;
    selected_code public.reward_codes%rowtype;
    selected_reward public.reward_code_rewards%rowtype;
    awarded_card_ids text[] := array[]::text[];
    awarded_cards jsonb := '[]'::jsonb;
    star_bits_awarded bigint := 0;
    built_reward_snapshot jsonb;
    inserted_redemption_id bigint;
begin
    if current_user_id is null then
        raise exception 'You must be signed in to redeem a code.';
    end if;

    normalized_code := regexp_replace(upper(trim(requested_code)), '[^A-Z0-9]', '', 'g');
    if normalized_code = '' then
        raise exception 'Enter a redemption code.';
    end if;

    generated_hash := encode(digest(normalized_code, 'sha256'), 'hex');

    select * into selected_code
    from public.reward_codes
    where code_hash = generated_hash
    for update;

    if not found then
        return jsonb_build_object('success', false, 'reason', 'invalid', 'message', 'That redemption code is not valid.');
    end if;

    if selected_code.active is not true then
        return jsonb_build_object('success', false, 'reason', 'inactive', 'message', 'That redemption code is no longer active.');
    end if;

    if selected_code.starts_at is not null and now() < selected_code.starts_at then
        return jsonb_build_object('success', false, 'reason', 'not_started', 'message', 'That redemption code is not active yet.');
    end if;

    if selected_code.expires_at is not null and now() >= selected_code.expires_at then
        return jsonb_build_object('success', false, 'reason', 'expired', 'message', 'That redemption code has expired.');
    end if;

    if selected_code.max_uses is not null and selected_code.current_uses >= selected_code.max_uses then
        return jsonb_build_object('success', false, 'reason', 'used_up', 'message', 'That redemption code has reached its maximum number of uses.');
    end if;

    insert into public.reward_code_redemptions (code_id, user_id)
    values (selected_code.id, current_user_id)
    on conflict (code_id, user_id) do nothing
    returning id into inserted_redemption_id;

    if inserted_redemption_id is null then
        return jsonb_build_object('success', false, 'reason', 'already_redeemed', 'message', 'You have already redeemed this code.');
    end if;

    select * into selected_reward
    from public.reward_code_rewards
    where code_id = selected_code.id;

    if selected_reward.reward_type = 'single_card' then
        awarded_card_ids := array_fill(selected_reward.card_id, array[selected_reward.card_quantity]);
    elsif selected_reward.reward_type = 'booster' then
        awarded_card_ids := selected_reward.booster_card_ids;
    elsif selected_reward.reward_type = 'star_bits' then
        star_bits_awarded := selected_reward.star_bits_amount;
    end if;

    if cardinality(awarded_card_ids) > 0 then
        insert into public.user_cards (
            user_id, card_id, quantity, is_favorite,
            first_obtained_at, last_obtained_at, updated_at
        )
        select current_user_id, grouped.card_id, grouped.quantity, false, now(), now(), now()
        from (
            select card_id, count(*)::integer quantity
            from unnest(awarded_card_ids) card_id
            group by card_id
        ) grouped
        on conflict (user_id, card_id)
        do update set
            quantity = public.user_cards.quantity + excluded.quantity,
            last_obtained_at = now(),
            updated_at = now();

        select coalesce(jsonb_agg(
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
            ) order by supplied.position
        ), '[]'::jsonb)
        into awarded_cards
        from unnest(awarded_card_ids) with ordinality supplied(card_id, position)
        join public.cards on cards.id = supplied.card_id
        join public.card_series on card_series.id = cards.series_id
        join public.user_cards on user_cards.user_id = current_user_id and user_cards.card_id = cards.id;
    end if;

    if star_bits_awarded > 0 then
        insert into public.user_wallets (user_id)
        values (current_user_id)
        on conflict (user_id) do nothing;

        update public.user_wallets
        set star_bits = star_bits + star_bits_awarded,
            lifetime_star_bits_earned = lifetime_star_bits_earned + star_bits_awarded,
            updated_at = now()
        where user_id = current_user_id;

        insert into public.star_bits_transactions (
            user_id, transaction_type, star_bits_change, description, metadata
        ) values (
            current_user_id,
            'reward',
            star_bits_awarded,
            'Redeemed reward code: ' || selected_code.label,
            jsonb_build_object('rewardCodeId', selected_code.id, 'label', selected_code.label)
        );
    end if;

    update public.reward_codes
    set current_uses = current_uses + 1,
        updated_at = now()
    where id = selected_code.id;

    built_reward_snapshot := jsonb_build_object(
        'label', selected_code.label,
        'rewardType', selected_reward.reward_type,
        'cards', awarded_cards,
        'starBits', star_bits_awarded
    );

    update public.reward_code_redemptions
    set reward_snapshot = built_reward_snapshot
    where id = inserted_redemption_id;

    return jsonb_build_object(
        'success', true,
        'label', selected_code.label,
        'rewardType', selected_reward.reward_type,
        'cards', awarded_cards,
        'starBits', star_bits_awarded
    );
end;
$$;

revoke all on function public.redeem_reward_code(text) from public, anon;
grant execute on function public.redeem_reward_code(text) to authenticated;
