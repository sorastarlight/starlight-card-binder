-- ============================================================
-- STARLIGHT CARD BINDER
-- V82.9 EDITABLE BOOSTER CONFIGURATION + ADMIN USER DIRECTORY
-- Safe to run after V82.8.6.
-- ============================================================

-- 1. Per-card pull controls.
alter table public.cards
    add column if not exists pull_weight numeric(12,4) not null default 1,
    add column if not exists is_pullable boolean not null default true;

alter table public.cards
    drop constraint if exists cards_pull_weight_check;

alter table public.cards
    add constraint cards_pull_weight_check
    check (pull_weight >= 0);

create index if not exists cards_pull_pool_index
on public.cards(is_pullable, rarity, series_id)
where is_visible = true and is_collectible = true;

-- 2. Booster definitions.
create table if not exists public.booster_types (
    id text primary key,
    name text not null,
    description text,
    star_bits_cost integer not null default 0 check (star_bits_cost >= 0),
    is_active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.booster_slots (
    id bigint generated always as identity primary key,
    booster_id text not null references public.booster_types(id) on delete cascade,
    slot_key text not null,
    name text not null,
    quantity integer not null default 1 check (quantity between 1 and 20),
    sort_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique (booster_id, slot_key)
);

create table if not exists public.booster_slot_rates (
    slot_id bigint not null references public.booster_slots(id) on delete cascade,
    rarity text not null check (rarity in ('Common','Uncommon','Rare','Epic','Legendary')),
    percentage numeric(7,4) not null check (percentage >= 0 and percentage <= 100),
    updated_at timestamptz not null default now(),
    primary key (slot_id, rarity)
);

alter table public.booster_types enable row level security;
alter table public.booster_slots enable row level security;
alter table public.booster_slot_rates enable row level security;

-- Public can read active configuration so odds can be displayed later.
drop policy if exists "Active booster types are public" on public.booster_types;
create policy "Active booster types are public"
on public.booster_types for select to anon, authenticated
using (is_active = true);

drop policy if exists "Active booster slots are public" on public.booster_slots;
create policy "Active booster slots are public"
on public.booster_slots for select to anon, authenticated
using (exists (
    select 1 from public.booster_types b
    where b.id = booster_slots.booster_id and b.is_active = true
));

drop policy if exists "Active booster rates are public" on public.booster_slot_rates;
create policy "Active booster rates are public"
on public.booster_slot_rates for select to anon, authenticated
using (exists (
    select 1
    from public.booster_slots s
    join public.booster_types b on b.id = s.booster_id
    where s.id = booster_slot_rates.slot_id and b.is_active = true
));

-- 3. Seed current packs and odds.
insert into public.booster_types(id, name, description, star_bits_cost, is_active, sort_order)
values
    ('free_daily', 'Free Daily Booster', 'One free booster per account per day.', 0, true, 10),
    ('standard_star_bits', 'Standard Starlight Booster', 'A standard booster purchased with Star Bits.', 100, true, 20)
on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

insert into public.booster_slots(booster_id, slot_key, name, quantity, sort_order)
values
    ('free_daily', 'common', 'Common Cards', 2, 10),
    ('free_daily', 'uncommon', 'Uncommon Card', 1, 20),
    ('free_daily', 'rare_plus', 'Rare or Better', 1, 30),
    ('standard_star_bits', 'common', 'Common Cards', 2, 10),
    ('standard_star_bits', 'uncommon', 'Uncommon Card', 1, 20),
    ('standard_star_bits', 'rare_plus', 'Rare or Better', 1, 30)
on conflict (booster_id, slot_key) do update set
    name = excluded.name,
    quantity = excluded.quantity,
    sort_order = excluded.sort_order,
    updated_at = now();

insert into public.booster_slot_rates(slot_id, rarity, percentage)
select s.id, r.rarity, r.percentage
from public.booster_slots s
join (
    values
        ('common', 'Common', 100.0::numeric),
        ('uncommon', 'Uncommon', 100.0::numeric),
        ('rare_plus', 'Rare', 70.0::numeric),
        ('rare_plus', 'Epic', 20.0::numeric),
        ('rare_plus', 'Legendary', 10.0::numeric)
) as r(slot_key, rarity, percentage)
on r.slot_key = s.slot_key
where s.booster_id in ('free_daily','standard_star_bits')
on conflict (slot_id, rarity) do nothing;

-- 4. Configuration validation view.
create or replace view public.booster_slot_rate_totals
with (security_invoker = true)
as
select
    b.id as booster_id,
    b.name as booster_name,
    s.id as slot_id,
    s.slot_key,
    s.name as slot_name,
    s.quantity,
    coalesce(sum(r.percentage), 0)::numeric(7,4) as percentage_total,
    abs(coalesce(sum(r.percentage), 0) - 100) < 0.0001 as is_valid
from public.booster_types b
join public.booster_slots s on s.booster_id = b.id
left join public.booster_slot_rates r on r.slot_id = s.id
group by b.id, b.name, s.id, s.slot_key, s.name, s.quantity;

grant select on public.booster_slot_rate_totals to anon, authenticated;

-- 5. Internal weighted draw helper.
create or replace function public.draw_configured_booster_cards(requested_booster_id text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
    selected_ids text[] := array[]::text[];
    slot_row record;
    chosen_rarity text;
    chosen_card_id text;
    draw_index integer;
    roll_value numeric;
begin
    if not exists (
        select 1 from public.booster_types
        where id = requested_booster_id and is_active = true
    ) then
        raise exception 'This booster is not active.';
    end if;

    if exists (
        select 1
        from public.booster_slot_rate_totals
        where booster_id = requested_booster_id and is_valid = false
    ) then
        raise exception 'One or more booster slots do not total 100%%.';
    end if;

    for slot_row in
        select id, quantity
        from public.booster_slots
        where booster_id = requested_booster_id
        order by sort_order, id
    loop
        for draw_index in 1..slot_row.quantity loop
            roll_value := random() * 100;

            select rarity into chosen_rarity
            from (
                select
                    rarity,
                    percentage,
                    sum(percentage) over (order by rarity_order, rarity) as cumulative_percentage
                from (
                    select
                        rarity,
                        percentage,
                        case rarity
                            when 'Common' then 1
                            when 'Uncommon' then 2
                            when 'Rare' then 3
                            when 'Epic' then 4
                            when 'Legendary' then 5
                            else 99
                        end as rarity_order
                    from public.booster_slot_rates
                    where slot_id = slot_row.id and percentage > 0
                ) ordered_rates
            ) cumulative_rates
            where roll_value < cumulative_percentage
            order by cumulative_percentage
            limit 1;

            if chosen_rarity is null then
                raise exception 'A booster rarity could not be selected.';
            end if;

            select c.id into chosen_card_id
            from public.cards c
            where c.rarity = chosen_rarity
              and c.is_visible = true
              and c.is_collectible = true
              and c.is_pullable = true
              and c.pull_weight > 0
            order by (-ln(greatest(random(), 0.0000001)) / c.pull_weight)
            limit 1;

            if chosen_card_id is null then
                raise exception 'No pullable % card is available for this booster.', chosen_rarity;
            end if;

            selected_ids := array_append(selected_ids, chosen_card_id);
        end loop;
    end loop;

    if cardinality(selected_ids) = 0 then
        raise exception 'This booster has no configured card slots.';
    end if;

    return selected_ids;
end;
$$;

revoke all on function public.draw_configured_booster_cards(text) from public, anon, authenticated;

-- 6. Replace the free Daily Booster to use editable tables.
create or replace function public.open_daily_booster()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    current_claim_date date;
    next_claim_at timestamptz;
    claim_id bigint;
    selected_card_ids text[];
    reward_cards jsonb;
begin
    if current_user_id is null then
        raise exception 'You must be signed in to open a daily booster.';
    end if;

    current_claim_date := timezone('America/New_York', now())::date;
    next_claim_at := ((current_claim_date + 1)::timestamp at time zone 'America/New_York');

    insert into public.daily_booster_claims(user_id, claim_date, cards_awarded)
    values (current_user_id, current_claim_date, '[]'::jsonb)
    on conflict (user_id, claim_date) do nothing
    returning id into claim_id;

    if claim_id is null then
        return jsonb_build_object(
            'success', false,
            'alreadyClaimed', true,
            'message', 'Today''s daily booster has already been opened.',
            'nextClaimAt', next_claim_at
        );
    end if;

    begin
        selected_card_ids := public.draw_configured_booster_cards('free_daily');
    exception when others then
        delete from public.daily_booster_claims where id = claim_id;
        raise;
    end;

    insert into public.user_cards(user_id, card_id, quantity, is_favorite, first_obtained_at, last_obtained_at, updated_at)
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
            'id', c.id,
            'cardNumber', c.card_number,
            'name', c.name,
            'rarity', c.rarity,
            'imageUrl', c.image_url,
            'thumbnailUrl', c.thumbnail_url,
            'seriesId', c.series_id,
            'seriesName', s.name,
            'artist', c.artist,
            'description', c.description,
            'quantity', uc.quantity,
            'isDuplicate', uc.quantity > 1
        ) order by picked.pack_position
    ) into reward_cards
    from unnest(selected_card_ids) with ordinality as picked(card_id, pack_position)
    join public.cards c on c.id = picked.card_id
    join public.card_series s on s.id = c.series_id
    join public.user_cards uc on uc.user_id = current_user_id and uc.card_id = c.id;

    update public.daily_booster_claims
    set cards_awarded = reward_cards
    where id = claim_id;

    return jsonb_build_object(
        'success', true,
        'alreadyClaimed', false,
        'claimDate', current_claim_date,
        'claimedAt', now(),
        'nextClaimAt', next_claim_at,
        'cards', reward_cards
    );
end;
$$;

grant execute on function public.open_daily_booster() to authenticated;

-- 7. Replace the Star Bits booster to use editable tables and cost.
create or replace function public.open_star_bits_booster()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    current_user_id uuid := auth.uid();
    booster_cost integer;
    current_balance bigint;
    purchase_id bigint;
    selected_card_ids text[];
    reward_cards jsonb;
    new_balance bigint;
begin
    if current_user_id is null then
        raise exception 'You must be signed in to open a Star Bits booster.';
    end if;

    select star_bits_cost into booster_cost
    from public.booster_types
    where id = 'standard_star_bits' and is_active = true;

    if booster_cost is null then
        raise exception 'The Standard Starlight Booster is not active.';
    end if;

    insert into public.user_wallets(user_id)
    values (current_user_id)
    on conflict (user_id) do nothing;

    select star_bits into current_balance
    from public.user_wallets
    where user_id = current_user_id
    for update;

    if coalesce(current_balance, 0) < booster_cost then
        raise exception 'You need % Star Bits to open this booster. Your balance is %.', booster_cost, coalesce(current_balance, 0);
    end if;

    selected_card_ids := public.draw_configured_booster_cards('standard_star_bits');

    update public.user_wallets
    set star_bits = star_bits - booster_cost,
        lifetime_star_bits_spent = lifetime_star_bits_spent + booster_cost,
        updated_at = now()
    where user_id = current_user_id
    returning star_bits into new_balance;

    insert into public.user_cards(user_id, card_id, quantity, is_favorite, first_obtained_at, last_obtained_at, updated_at)
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
            'id', c.id,
            'cardNumber', c.card_number,
            'name', c.name,
            'rarity', c.rarity,
            'imageUrl', c.image_url,
            'thumbnailUrl', c.thumbnail_url,
            'seriesId', c.series_id,
            'seriesName', s.name,
            'artist', c.artist,
            'description', c.description,
            'quantity', uc.quantity,
            'isDuplicate', uc.quantity > 1
        ) order by picked.pack_position
    ) into reward_cards
    from unnest(selected_card_ids) with ordinality as picked(card_id, pack_position)
    join public.cards c on c.id = picked.card_id
    join public.card_series s on s.id = c.series_id
    join public.user_cards uc on uc.user_id = current_user_id and uc.card_id = c.id;

    insert into public.star_bits_booster_purchases(user_id, star_bits_cost, cards_awarded)
    values (current_user_id, booster_cost, reward_cards)
    returning id into purchase_id;

    insert into public.star_bits_transactions(user_id, transaction_type, star_bits_change, description, metadata)
    values (
        current_user_id,
        'purchase',
        -booster_cost,
        'Opened a Standard Starlight Booster with Star Bits.',
        jsonb_build_object('purchaseId', purchase_id, 'boosterType', 'standard_star_bits', 'cardsAwarded', reward_cards)
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

revoke all on function public.open_star_bits_booster() from public, anon;
grant execute on function public.open_star_bits_booster() to authenticated;

-- 8. Staff-only administration RPCs.
create or replace function public.admin_get_booster_configuration()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_role text;
    result jsonb;
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then
        raise exception 'Administrator access is required.';
    end if;

    select jsonb_build_object(
        'boosters', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', b.id,
                'name', b.name,
                'description', b.description,
                'starBitsCost', b.star_bits_cost,
                'isActive', b.is_active,
                'slots', coalesce((
                    select jsonb_agg(jsonb_build_object(
                        'id', s.id,
                        'slotKey', s.slot_key,
                        'name', s.name,
                        'quantity', s.quantity,
                        'percentageTotal', totals.percentage_total,
                        'isValid', totals.is_valid,
                        'rates', coalesce((
                            select jsonb_object_agg(r.rarity, r.percentage)
                            from public.booster_slot_rates r
                            where r.slot_id = s.id
                        ), '{}'::jsonb)
                    ) order by s.sort_order, s.id)
                    from public.booster_slots s
                    join public.booster_slot_rate_totals totals on totals.slot_id = s.id
                    where s.booster_id = b.id
                ), '[]'::jsonb)
            ) order by b.sort_order, b.id)
            from public.booster_types b
        ), '[]'::jsonb),
        'cards', coalesce((
            select jsonb_agg(jsonb_build_object(
                'id', c.id,
                'cardNumber', c.card_number,
                'name', c.name,
                'seriesId', c.series_id,
                'seriesName', s.name,
                'rarity', c.rarity,
                'pullWeight', c.pull_weight,
                'isPullable', c.is_pullable,
                'isVisible', c.is_visible,
                'isCollectible', c.is_collectible
            ) order by s.sort_order, c.sort_order, c.card_number)
            from public.cards c
            join public.card_series s on s.id = c.series_id
        ), '[]'::jsonb)
    ) into result;

    return result;
end;
$$;

revoke all on function public.admin_get_booster_configuration() from public, anon;
grant execute on function public.admin_get_booster_configuration() to authenticated;

create or replace function public.admin_update_booster(
    requested_booster_id text,
    requested_name text,
    requested_description text,
    requested_star_bits_cost integer,
    requested_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare actor_role text;
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
    if requested_star_bits_cost < 0 then raise exception 'Star Bits cost cannot be negative.'; end if;

    update public.booster_types
    set name = nullif(trim(requested_name), ''),
        description = nullif(trim(requested_description), ''),
        star_bits_cost = requested_star_bits_cost,
        is_active = requested_is_active,
        updated_at = now()
    where id = requested_booster_id;

    if not found then raise exception 'Booster not found.'; end if;

    insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
    values (auth.uid(), 'booster_configuration_updated', 'booster_type', requested_booster_id,
        jsonb_build_object('cost', requested_star_bits_cost, 'isActive', requested_is_active));

    return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.admin_update_booster(text,text,text,integer,boolean) from public, anon;
grant execute on function public.admin_update_booster(text,text,text,integer,boolean) to authenticated;

create or replace function public.admin_update_booster_slot(
    requested_slot_id bigint,
    requested_quantity integer,
    requested_rates jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    actor_role text;
    rate_total numeric;
    rarity_name text;
    rarity_value numeric;
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
    if requested_quantity < 1 or requested_quantity > 20 then raise exception 'Slot quantity must be between 1 and 20.'; end if;

    select coalesce(sum(value::numeric), 0)
    into rate_total
    from jsonb_each_text(coalesce(requested_rates, '{}'::jsonb));

    if abs(rate_total - 100) >= 0.0001 then
        raise exception 'Rarity percentages must total exactly 100%%. Current total: %', rate_total;
    end if;

    update public.booster_slots
    set quantity = requested_quantity, updated_at = now()
    where id = requested_slot_id;
    if not found then raise exception 'Booster slot not found.'; end if;

    delete from public.booster_slot_rates where slot_id = requested_slot_id;

    for rarity_name, rarity_value in
        select key, value::numeric from jsonb_each_text(requested_rates)
    loop
        if rarity_name not in ('Common','Uncommon','Rare','Epic','Legendary') then
            raise exception 'Invalid rarity: %', rarity_name;
        end if;
        if rarity_value < 0 or rarity_value > 100 then
            raise exception 'Each percentage must be between 0 and 100.';
        end if;
        if rarity_value > 0 then
            insert into public.booster_slot_rates(slot_id, rarity, percentage)
            values (requested_slot_id, rarity_name, rarity_value);
        end if;
    end loop;

    insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
    values (auth.uid(), 'booster_slot_rates_updated', 'booster_slot', requested_slot_id::text,
        jsonb_build_object('quantity', requested_quantity, 'rates', requested_rates));

    return jsonb_build_object('success', true, 'percentageTotal', rate_total);
end;
$$;

revoke all on function public.admin_update_booster_slot(bigint,integer,jsonb) from public, anon;
grant execute on function public.admin_update_booster_slot(bigint,integer,jsonb) to authenticated;

create or replace function public.admin_update_card_pull_settings(
    requested_card_id text,
    requested_rarity text,
    requested_pull_weight numeric,
    requested_is_pullable boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare actor_role text;
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;
    if requested_rarity not in ('Common','Uncommon','Rare','Epic','Legendary') then raise exception 'Invalid rarity.'; end if;
    if requested_pull_weight < 0 then raise exception 'Pull weight cannot be negative.'; end if;

    update public.cards
    set rarity = requested_rarity,
        pull_weight = requested_pull_weight,
        is_pullable = requested_is_pullable,
        updated_at = now()
    where id = requested_card_id;
    if not found then raise exception 'Card not found.'; end if;

    insert into public.staff_audit_log(actor_user_id, action, target_resource_type, target_resource_id, details)
    values (auth.uid(), 'card_pull_settings_updated', 'card', requested_card_id,
        jsonb_build_object('rarity', requested_rarity, 'pullWeight', requested_pull_weight, 'isPullable', requested_is_pullable));

    return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.admin_update_card_pull_settings(text,text,numeric,boolean) from public, anon;
grant execute on function public.admin_update_card_pull_settings(text,text,numeric,boolean) to authenticated;

-- 9. Staff-only user directory with usernames and display names.
create or replace function public.admin_list_user_directory(requested_search text default null, requested_limit integer default 500)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
    actor_role text;
    result jsonb;
    search_value text := lower(trim(coalesce(requested_search, '')));
begin
    select role into actor_role from public.site_roles where user_id = auth.uid();
    if actor_role not in ('owner','admin') then raise exception 'Administrator access is required.'; end if;

    select coalesce(jsonb_agg(jsonb_build_object(
        'userId', directory.id,
        'email', directory.email,
        'username', directory.username,
        'displayName', directory.display_name,
        'role', directory.role,
        'profileVisibility', directory.profile_visibility,
        'onboardingComplete', directory.onboarding_complete,
        'accountCreatedAt', directory.created_at,
        'lastSignInAt', directory.last_sign_in_at,
        'profileUpdatedAt', directory.profile_updated_at
    ) order by directory.created_at desc), '[]'::jsonb)
    into result
    from (
        select
            u.id,
            u.email,
            p.username,
            p.display_name,
            r.role,
            p.profile_visibility,
            p.onboarding_complete,
            u.created_at,
            u.last_sign_in_at,
            p.updated_at as profile_updated_at
        from auth.users u
        left join public.profiles p on p.id = u.id
        left join public.site_roles r on r.user_id = u.id
        where search_value = ''
           or lower(coalesce(u.email,'')) like '%' || search_value || '%'
           or lower(coalesce(p.username,'')) like '%' || search_value || '%'
           or lower(coalesce(p.display_name,'')) like '%' || search_value || '%'
        order by u.created_at desc
        limit greatest(1, least(coalesce(requested_limit,500),1000))
    ) directory;

    return result;
end;
$$;

revoke all on function public.admin_list_user_directory(text,integer) from public, anon;
grant execute on function public.admin_list_user_directory(text,integer) to authenticated;
