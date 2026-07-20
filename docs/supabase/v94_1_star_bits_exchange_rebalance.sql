-- V94.1 — Rebalance duplicate-card Star Bits exchange values.
-- Apply after v84_5_selective_star_bits_conversion.sql.

begin;

insert into public.star_bits_values (
    rarity,
    bits_per_duplicate
)
values
    ('Epic', 50),
    ('Legendary', 100)
on conflict (rarity)
do update set
    bits_per_duplicate = excluded.bits_per_duplicate;

commit;

