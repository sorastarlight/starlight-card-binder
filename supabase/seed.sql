-- Reproducible application configuration for local resets.
-- The guard keeps the seed harmless until a full production schema snapshot
-- has been pulled after the migration-history baseline.

do $seed$
begin
    if to_regclass('public.star_bits_values') is not null then
        insert into public.star_bits_values (
            rarity,
            bits_per_duplicate
        )
        values
            ('Common', 5),
            ('Uncommon', 10),
            ('Rare', 25),
            ('Epic', 50),
            ('Legendary', 100)
        on conflict (rarity)
        do update set
            bits_per_duplicate = excluded.bits_per_duplicate;
    end if;
end
$seed$;
