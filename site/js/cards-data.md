# Starlight Card Binder Data Schema

The site loads card metadata from the Google Apps Script JSON endpoint in `js/app.js`.
If the endpoint fails, it falls back to `data/cards.json`.

Official columns:

- `id`
- `number`
- `name`
- `series`
- `seriesDescription`
- `rarity`
- `imageUrl`
- `thumbnailUrl`
- `cardDescription`
- `artist`

The `artist` column is permanent and used for creator credit in the detail panel, Full View analyzer, checklist, and search.
