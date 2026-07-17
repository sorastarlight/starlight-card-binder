# V90.1 — Booster Repair & Management Polish

## Install
1. Run `supabase/v90_1_booster_repair_management_polish.sql` in Supabase SQL Editor.
2. Replace the included site files.
3. Hard-refresh the browser.

## Booster repair tools
Existing boosters now provide:
- Inspect References
- Rename Booster ID
- Detach From Card Shop
- Archive Booster
- Delete Booster Safely

`Rename Booster ID` creates the replacement booster record, repoints foreign-key references, repairs known JSON metadata links, and removes the old ID in one database transaction.

`Detach From Card Shop` sets the Star Bits price to 0 and disables the booster while preserving the pack for historical data or later editing.

`Delete Booster Safely` refuses deletion while protected references remain.

## Interface polish
- Category and finish filters now use selectable chips.
- Added Select All, Clear All, and selection summaries.
- Active, Archived, Exclude Promos, Allow Duplicates, and Advanced Mode now use consistent slider controls.
