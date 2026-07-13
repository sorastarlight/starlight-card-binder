# V79.2 Fix Notes

Targeted fixes from V79.1:

- Right-side selected-card panel
  - Forced action ordering so Reveal/Hide and Favorite stay first.
  - Holographic Toggle now wraps beneath them as a full-width button.

- Booster selection splash
  - Series ID and Series Name now render together on one line.
  - Booster pack tiles/images were reduced slightly again for a more compact landing view.
  - Series description remains removed from the pack button.

- Legendary reveal animation
  - Added a Legendary-only charge field with pulsing rings.
  - Added a stronger card charge/shake and a starburst magic explosion on reveal.
  - Base reveal flow remains shared with other rarities.

- Holographic effect
  - Replaced the dot/orb sparkle layer with star-shaped sparkles.
  - Kept the rainbow aurora foil behavior and avoided restoring the old shine sweep.

Validation:
- `node --check js/app.js` passed.
