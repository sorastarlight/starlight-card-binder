# V93.2 — Reliable Booster Reveal & Pack Artwork Fix

No SQL is required.

## What changed
- Fixed the reveal deck stacking order so the visible top card is always the active, clickable card.
- Disabled pointer events on queued cards to prevent a hidden card from intercepting the reveal click.
- Daily Free Booster and Card Shop openings now pass their configured booster artwork into the shared reveal engine.
- Received Gifts now forwards pack and card-back artwork when those values are available in the reward snapshot.
- Slowed the pack wobble and burst so the opening has a clearer build-up.
- Kept Common and Uncommon flips restrained, added stronger Rare and Epic impact effects, and gave Legendary pulls a longer double-flash and persistent gold aura.
- Preloads each card front immediately before its flip to reduce blank or card-back-only reveals.
- Updated reveal cache-busting references to `v=93.2`.

## Validation
- JavaScript syntax check passes for `docs/js/reward-reveal.js`.
- Browser test confirmed the configured pack artwork opens first.
- Browser test confirmed cards 1–3 become the actual top clickable card in order.
- Browser test confirmed the card front, title, progress action, Legendary class, and cleanup state all complete successfully.

## Suggested commit
`Fix booster reveal stacking and pack artwork`
