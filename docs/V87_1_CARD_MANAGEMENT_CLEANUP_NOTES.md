# V87.1 — Starlight Card Management Cleanup

## Renamed administration workspace

**Starlight Content Studio** is now **Starlight Card Management** throughout the active site shell and Administration Hub.

## Cleaner workspace

The management area now uses these tabs:

- Dashboard
- Series
- Cards
- Booster Packs
- Asset Library
- Maintenance

The failed legacy artwork-migration controls were removed. Existing and future editable artwork is managed directly through Supabase Storage.

## Asset Library improvements

- Search by filename, folder, or storage path
- Filter by folder
- Lazy-loaded previews
- Upload date display
- Copy public URL
- Open full image
- Delete managed Supabase asset

## Maintenance tools

- Refresh the public card catalog
- Clear local catalog-related browser cache
- Run system diagnostics
- Export the Supabase asset manifest

## Database recovery helper

`supabase/v87_1_database_schema_inventory.sql` is a read-only inventory of public tables, columns, functions, policies, indexes, foreign keys, and Storage buckets. It is intended for audits and recovery planning; it does not modify the database.
