# V87.3 — Backup & Integrity Center

- Added a client-side Content Integrity Audit to Starlight Card Management.
- Checks duplicate card/series/booster IDs, duplicate numbering within a series, orphaned cards, missing artwork, legacy external URLs, negative pull weights, and empty active booster pools.
- Added a Full Content Backup export containing series, cards, boosters, daily mode, asset manifest, diagnostics, version, and export timestamp.
- Kept the focused Asset Manifest export.
- Added recovery guidance for the existing database schema inventory query.
- No database migration is required.
