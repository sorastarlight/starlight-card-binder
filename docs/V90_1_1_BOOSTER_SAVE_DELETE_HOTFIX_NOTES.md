# V90.1.1 Booster Save/Delete Hotfix

## Install

1. Run `docs/supabase/v90_1_1_booster_save_delete_hotfix.sql` in Supabase SQL Editor.
2. Replace the matching deployed files.
3. Hard-refresh the site.

## Fixes

- Saves the booster record before saving slots, fixing new-pack foreign-key failures.
- Saves booster settings, slots, and rarity rates through one atomic admin RPC.
- Removes slot-by-slot save ordering problems.
- Deletes associated Twitch booster rules before deleting a booster.
- Detaches optional Star Bits purchase-history references.
- Cancels pending Received Gifts that point to a deleted booster.
- Adds visible Saving/Deleting button states and detailed console errors.
