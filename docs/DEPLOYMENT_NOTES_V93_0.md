# V93.0 — Booster Modal & Card Reveal Rebuild

No SQL is required.

## Booster purchase modal
- Replaced the incomplete parent-document portal styling.
- Booster artwork is capped to a safe width and height.
- The complete purchase dialog fits inside the visible browser viewport.
- Mobile and desktop layouts have explicit sizing rules.
- Horizontal overflow is eliminated.

## Card reveal
- Rebuilt around a true 3D trading-card spin inspired by the supplied reference GIF.
- Card back floats before revealing.
- Standard cards spin through multiple rotations and land front-facing.
- Rare and Epic cards receive stronger glow and particle bursts.
- Legendary cards receive a longer multi-spin reveal, golden rays, two-stage flash, larger particle explosion, and persistent golden aura.
- The reveal remains centered in the top-level browser viewport.

## Suggested commit
`Rebuild booster modal and restore animated card reveals`
