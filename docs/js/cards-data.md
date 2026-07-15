# Card catalog source

The live Starlight Card Binder card catalog is loaded from Supabase.

- `public.cards` stores card names, numbers, rarity, artwork, thumbnail, artist, description, visibility, collectibility, pullability, weight, and series assignment.
- `public.card_series` stores series name, description, ordering, visibility, and booster artwork.
- `public.get_public_card_catalog_v1()` provides the public catalog used by the Binder.
- `js/card-catalog-service.js` maintains a temporary browser cache for fast first paint, then revalidates against Supabase whenever the site starts.

The files under `docs/data/` are now emergency/static reference files only. Editing them does not update the live site.

Saving or deleting a card or series in **Administration Hub → Starlight Content Studio** invalidates the browser catalog cache and broadcasts a refresh to open Binder pages.
