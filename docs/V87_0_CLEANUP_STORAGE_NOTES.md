# V87.0 — Stabilization, Storage Migration & Diagnostics

## Asset ownership map

- **GitHub Pages:** application code, CSS, JavaScript, sounds, permanent default/fallback graphics.
- **Supabase Database:** card/series/booster metadata and all user/game data.
- **Supabase Storage `site-assets`:** editable card fronts, thumbnails, booster art, card backs, series and event images.
- **Supabase Storage `profile-images`:** user profile photos.

## Safe migration workflow

Open **Administration Hub → Starlight Content Studio → Overview**.

1. Click **Analyze Assets**.
2. Click **Migrate to Supabase**.
3. The browser copies currently linked GitHub-hosted artwork into Supabase Storage.
4. The related card, series and booster records are updated with public Supabase URLs.
5. A JSON migration report downloads automatically.
6. Existing GitHub files remain as emergency fallbacks and may be removed in a later release after verification.

## Cleanup decisions

- The old `docs/data` files are retained as emergency reference only.
- Supabase is the live catalog source; editing those fallback files does not change the live site.
- Legacy localStorage catalog keys are cleared by the current catalog service.
- Storage uploads are recorded in `site_asset_manifest` for backup and portability.

## Recovery

Keep backups of:

- The GitHub repository.
- Supabase database exports.
- The Content Studio asset manifest JSON.
- A Supabase Storage bucket export.
