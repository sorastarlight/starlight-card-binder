# V79.1 Tweak Notes

Targeted changes from the V79 cleanup baseline:

- Moved the right-side detail pane Holographic toggle below the Reveal and Favorite buttons.
- Simplified booster selection button text so it only shows:
  - seriesId label
  - seriesName
  - collected / total count
- Removed the series description from booster buttons.
- Reduced the default booster splash/card image sizing so the splash begins smaller and scales more comfortably as more series are added.
- Adjusted Legendary reveal styling so it uses the same reveal timing and card motion as other rarities, while keeping a stronger glow/sparkle layer and legendary SFX.

Validation:

- `node --check js/app.js` passed.
