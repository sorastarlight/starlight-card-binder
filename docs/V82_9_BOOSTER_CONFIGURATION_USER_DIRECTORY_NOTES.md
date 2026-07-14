# V82.9 — Booster Configuration & User Directory

## Database changes
- Adds `cards.pull_weight` and `cards.is_pullable`.
- Adds editable `booster_types`, `booster_slots`, and `booster_slot_rates` tables.
- Seeds the Free Daily Booster and Standard Star Bits Booster with the current 2 Common / 1 Uncommon / 1 Rare+ setup.
- Replaces both booster-opening RPCs so future pulls are driven by the tables.
- Adds protected admin RPCs for editing booster configuration and card pull settings.
- Adds a protected registered-user directory that includes email, username, display name, role, join date, and last sign-in.

## Admin pages
- `admin-boosters.html`
- `admin-users.html`

Both are linked from the Administration Hub and require Owner or Admin permissions.

## Important behavior
- Rarity percentages must total exactly 100% for each slot before they can be saved.
- Pull weights are relative among cards of the same selected rarity.
- Weight `0` or `is_pullable = false` excludes a card from random boosters.
- Existing collections and previously opened packs are not modified.
