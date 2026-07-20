# Supabase migration workflow

`supabase/migrations/` is the canonical, forward-only migration history for the Starlight Card Binder. New schema, policy, function, and production configuration changes belong here as timestamped migrations.

`docs/supabase/` is the pre-CLI archive. It contains historical migrations, hotfix variants, one-off administration helpers, inventories, and diagnostics. Keep it for reference, but do not replay the directory and do not add new migrations there.

## Production baseline

Production was created through the Supabase SQL Editor before CLI history existed. `20260720160000_production_baseline.sql` is therefore a tracking marker for the already-live database through V94.1; it intentionally does not recreate historical objects.

`20260720180926_production_schema.sql` is the full post-baseline schema snapshot pulled from the linked production project. Together, the baseline marker, schema snapshot, and `seed.sql` provide the canonical starting point for clean local rebuilds and all future forward migrations.

The production migration ledger uses Supabase CLI's official `supabase_migrations.schema_migrations` schema and is synchronized with both canonical migration files. Do not regenerate, rename, or edit either applied migration; add a new timestamped migration for every subsequent change.

## Forward workflow

1. Create a migration with `supabase migration new <name>`.
2. Put all related SQL in the generated file; never edit an already-deployed migration.
3. Run `npm run validate:migrations` and the relevant local database tests.
4. Review `supabase db push --linked --dry-run` before any production push.
5. Run `supabase db push --linked` only with explicit production approval.
6. Commit the migration with the application change that depends on it.

Use `supabase/seed.sql` only for reproducible non-secret application configuration. Never put credentials, access tokens, service-role keys, or private user data in migrations or seeds.
