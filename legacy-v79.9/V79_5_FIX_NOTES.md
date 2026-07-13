# V79.5 Fix Notes

## Fixed

- Fixed mirrored card backs during flip by restoring the card to a true two-face flip.
  - The front image is no longer swapped to the card-back image during the flip.
  - The back face now remains its own surface and is revealed by rotation only.

- Rebuilt preview/full-view card flip behavior.
  - Uses a simple rotating flip/spin feel.
  - Applies consistently to the right-side preview pane and full-view overlay.

- Overhauled holographic visuals again.
  - Replaced the weak/missing holo layer with a gold/colorful animated foil overlay.
  - Added animated star sparkles over the card art.
  - Added a pink glow around holographic cards.
  - Holo effects still hide when viewing the card back so the back stays clean.

- Reworked the booster splash selection button under the pack image.
  - Slimmer, cleaner, less bulky.
  - Keeps the title and collected count readable without the old fat pill look.

## Files changed

- `js/app.js`
- `css/style.css`

## Validation

- `node --check js/app.js` passed.
