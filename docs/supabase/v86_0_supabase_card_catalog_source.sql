-- ============================================================
-- STARLIGHT CARD BINDER
-- V86.0 SUPABASE CARD CATALOG SOURCE OF TRUTH
-- ============================================================
-- The public website now loads all visible card metadata from
-- Supabase instead of Google Sheets/static JSON files.

create or replace function public.get_public_card_catalog_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
    select jsonb_build_object(
        'generatedAt', now(),
        'catalogUpdatedAt', greatest(
            coalesce((select max(updated_at) from public.cards), 'epoch'::timestamptz),
            coalesce((select max(updated_at) from public.card_series), 'epoch'::timestamptz)
        ),
        'cards', coalesce((
            select jsonb_agg(
                jsonb_build_object(
                    'id', c.id,
                    'number', c.card_number,
                    'name', c.name,
                    'seriesId', s.id,
                    'seriesName', s.name,
                    'seriesSort', s.sort_order,
                    'seriesDescription', s.description,
                    'boosterImageUrl', s.booster_image_url,
                    'rarity', c.rarity,
                    'imageUrl', c.image_url,
                    'thumbnailUrl', coalesce(c.thumbnail_url, c.image_url),
                    'cardDescription', c.description,
                    'artist', c.artist,
                    'sortOrder', c.sort_order,
                    'isVisible', c.is_visible,
                    'isCollectible', c.is_collectible,
                    'isPullable', coalesce(c.is_pullable, true),
                    'pullWeight', coalesce(c.pull_weight, 1),
                    'updatedAt', c.updated_at
                )
                order by s.sort_order, c.sort_order, c.card_number, c.id
            )
            from public.cards c
            join public.card_series s on s.id = c.series_id
            where c.is_visible = true
              and s.is_visible = true
        ), '[]'::jsonb)
    );
$$;

revoke all on function public.get_public_card_catalog_v1() from public;
grant execute on function public.get_public_card_catalog_v1() to anon, authenticated;
