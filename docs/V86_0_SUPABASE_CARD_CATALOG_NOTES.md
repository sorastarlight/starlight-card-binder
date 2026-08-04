# V86.0 — Supabase Card Catalog Source of Truth

## Purpose

Card and series information edited in the Administration Hub now updates the Binder and all app.js-driven views from one live Supabase catalog.

## Changes

- Removed Google Sheets as the primary card-data source.
- Added `get_public_card_catalog_v1()`.
- Added `js/card-catalog-service.js`.
- Supabase data now controls names, descriptions, artists, rarity, full artwork, thumbnails, series information, and sorting.
- The browser cache is temporary and automatically revalidated.
- Card/series saves and deletes broadcast a catalog refresh to open site pages.
- Added a manual **Refresh Site Catalog** button to Content Studio.
- Static JSON remains only as an emergency offline fallback.

## Premium card effects (`effectStyle`)

Optional catalog fields for interactive perspective cards:

| Field | Type | Values |
| --- | --- | --- |
| `effectStyle` | string | `none`, `shine`, `special-art`, `holographic`, `legendary`, `rainbow` |
| `effectIntensity` | number | `20`–`100` (defaults to `65` when omitted) |

Example JSON / Google Sheets row:

```json
{
  "id": "s01-012",
  "name": "Example Legendary Card",
  "rarity": "Legendary",
  "holographic": "Y",
  "effectStyle": "special-art",
  "effectIntensity": 75
}
```

Notes:

- Cards **without** `effectStyle` render exactly as before.
- The legacy `holographic` finish field is unchanged and independent of `effectStyle`.
- Supabase Content Studio and the offline `docs/data/cards.json` fallback both accept these columns.
- Implementation: `docs/js/starlight-perspective-card.js`, `docs/css/starlight-perspective-card.css`, and `docs/css/starlight-gallery.css`.
- Apply migrations `20260724180000_card_premium_effects.sql` and `20260724190000_card_effect_shine_gallery.sql` on production Supabase before expecting live catalog data.
- Premium tilt/shine runs only on **collected** cards; unowned slots use the album-slot presentation without heavy effects.

## Install

Run:

`docs/supabase/v86_0_supabase_card_catalog_source.sql`

Then replace the included website files.
