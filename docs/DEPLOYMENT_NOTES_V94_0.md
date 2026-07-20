# V94.0 — Stable Reveal Foundation

No SQL migration, dependency installation, or configuration change is required.

## Stable checkpoint

- Establishes the current `main` branch as the stable V94.0 checkpoint.
- Keeps `docs/js/reward-reveal.js` as the canonical reveal engine for Daily Boosters, Shop packs, Twitch rewards, redemption, and Received Gifts.
- Locks the approved reveal presentation and motion baseline at `v1.5.5` with regression coverage.
- Preserves the centered booster opening, animated card pile, rarity-specific reveals, and rarity/result sound effects.
- Prevents horizontal and vertical page scrollbars while a reveal is open and restores the prior page state when it closes.
- Keeps the reveal backdrop translucent, removes the visible top-left booster label, and provides a polished, consistently sized result layout.
- Allows a left-click on empty result-screen space to return to the site while keeping result cards, summary information, and the Done button interactive.

## Validation

- Full JavaScript syntax validation passes.
- CSS structure validation passes.
- Foundation architecture checks pass.
- Booster configuration validation passes.
- The complete Node test suite passes.
- Reveal behavior was previously verified at desktop and 390 × 844 mobile viewport sizes with no overlay overflow or browser console warnings.

## Rollback

- No database rollback is required.
- Restore the commit immediately preceding the `v94.0` tag to remove this checkpoint note; the checkpoint does not alter runtime behavior.

## Release commit

`Document V94.0 stable reveal checkpoint`
