-- ============================================================
-- STARLIGHT CARD BINDER
-- V84.2 LIFETIME COLLECTOR XP
-- ============================================================
-- Collector levels now use lifetime XP. XP increases when card
-- copies are earned, but never decreases when duplicates are
-- traded or converted into Star Bits.

alter table public.user_wallets
add column if not exists collector_xp bigint not null default 0
check (collector_xp >= 0);

-- Backfill each existing account using its current card quantities.
-- Only wallets still at zero are initialized, making this safe to rerun.
update public.user_wallets as wallets
set collector_xp = calculated.total_xp,
    updated_at = now()
from (
    select
        uc.user_id,
        coalesce(sum(
            uc.quantity *
            case c.rarity
                when 'Common' then 1
                when 'Uncommon' then 2
                when 'Rare' then 5
                when 'Epic' then 15
                when 'Legendary' then 50
                else 0
            end
        ), 0)::bigint as total_xp
    from public.user_cards uc
    join public.cards c on c.id = uc.card_id
    group by uc.user_id
) as calculated
where wallets.user_id = calculated.user_id
  and wallets.collector_xp = 0;

create or replace function public.award_collector_xp_from_card_quantity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    gained_quantity integer := 0;
    rarity_points integer := 0;
begin
    if tg_op = 'INSERT' then
        gained_quantity := greatest(coalesce(new.quantity, 0), 0);
    elsif tg_op = 'UPDATE' then
        gained_quantity := greatest(
            coalesce(new.quantity, 0) - coalesce(old.quantity, 0),
            0
        );
    end if;

    if gained_quantity <= 0 then
        return new;
    end if;

    select case rarity
        when 'Common' then 1
        when 'Uncommon' then 2
        when 'Rare' then 5
        when 'Epic' then 15
        when 'Legendary' then 50
        else 0
    end
    into rarity_points
    from public.cards
    where id = new.card_id;

    insert into public.user_wallets (
        user_id,
        collector_xp
    )
    values (
        new.user_id,
        gained_quantity * coalesce(rarity_points, 0)
    )
    on conflict (user_id)
    do update set
        collector_xp = public.user_wallets.collector_xp
            + excluded.collector_xp,
        updated_at = now();

    return new;
end;
$$;

drop trigger if exists user_cards_award_collector_xp
on public.user_cards;

create trigger user_cards_award_collector_xp
after insert or update of quantity
on public.user_cards
for each row
execute function public.award_collector_xp_from_card_quantity();

revoke all
on function public.award_collector_xp_from_card_quantity()
from public, anon, authenticated;
