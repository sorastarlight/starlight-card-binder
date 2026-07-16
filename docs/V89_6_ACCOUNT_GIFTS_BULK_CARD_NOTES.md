# V89.6 — Account, Gifts & Bulk Card Management

## Install
1. Run `docs/supabase/v89_6_account_gifts_bulk_card_management.sql`.
2. Replace matching files in your deployed `docs` folder.
3. Commit and deploy.
4. Hard refresh once.

## Highlights
- Continue with Twitch clears stale local Supabase sessions before OAuth and displays the returned Twitch identity.
- Linked Viewers → Grant now opens Send Gifts with the collector preselected.
- Send Gifts is registered in embedded routing.
- Owner/admin permanent user deletion is available in Registered User Directory.
- New-card artwork is selected once and uploaded to both `card-fronts/` and `thumbnails/`.
- IDs and filenames follow the selected series: `001` → `s01_001`; `002` → `s02_001`.
- Mass Upload Set accepts multiple files, assigns sequential IDs, uploads both image copies, and reports partial failures.
