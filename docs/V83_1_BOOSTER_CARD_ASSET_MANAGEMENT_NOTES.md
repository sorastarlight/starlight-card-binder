# V83.1 Booster, Card & Asset Management

- Renames the sidebar entry to **My Star Bits**.
- Renames the setting to **Free Daily Booster Availability**.
- Adds thumbnail previews and Browse/Upload controls for booster packs and card backs.
- Adds a public Supabase Storage bucket named `site-assets` for runtime-managed artwork.
- Adds Card Series creation.
- Adds new Card creation with front art, thumbnail art, rarity, pull weight and visibility controls.
- Keeps the original repository assets as defaults.

Runtime uploads cannot be written directly into a GitHub Pages repository. Uploaded assets are stored in Supabase Storage and their public URLs are saved to the card/booster records.
