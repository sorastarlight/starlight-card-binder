# Starlight Card Binder V79 Cleanup Pass

Baseline: V78 stable package.

## Cleanup completed
- Removed the older overwritten binder renderer code path and unused helper functions from `js/app.js`.
- Kept the V61/V78 sheet-driven series/booster renderer as the active binder system.
- Replaced the old all-at-once image preloader with a smaller critical warmup plus idle, batched image loading.
- Reduced first-load image pressure by avoiding eager front-card loads for hidden cards.
- Consolidated the reveal flow around the existing `startRevealAnimation` / `runRevealAnimation` / `completeReveal` path.
- Kept the stable `flipCardImage` path and removed the duplicate legacy binder flip/reveal pathway that was no longer used.
- Removed obsolete V72-V76 holographic foil CSS layers and replaced their shared foundation with a single V79 foundation block.
- Preserved the V77 no-sweep aurora holographic effect and V78 booster scaling behavior.
- Removed older unused `rarity-glow` holographic override sections that were superseded by the current `holo-foil-active` system.
- Updated the holographic button text to `Toggle Holographic` while preserving the active/muted button behavior.

## Validation
- `node --check js/app.js` passes.
- File structure and data files were preserved.

## Notes
- The CSS file still contains some older base layout styles because they are intertwined with the V78 visual baseline. I only removed the obviously superseded holographic systems and unused binder/reveal CSS layers to avoid changing the stable look.
