# V79.3 Fix Notes

- Restored card flipping in the right-side preview panel and full view by adding a missing shared `flipCardImage()` helper and hardening the two-face card CSS.
- Moved the right-side Holographic Toggle button under the Reveal/Hide and Favorite buttons in the V62 side panel render path.
- Overhauled the holographic effect so it animates again with moving aurora/rainbow foil and star twinkles instead of static white orb dots.
- Enhanced the Legendary reveal without replacing the current effect: the card silhouette now charges, glows, and pops outward during the burst/reveal moment.
