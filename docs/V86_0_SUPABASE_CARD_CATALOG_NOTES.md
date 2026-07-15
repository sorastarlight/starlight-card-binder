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

## Install

Run:

`docs/supabase/v86_0_supabase_card_catalog_source.sql`

Then replace the included website files.
