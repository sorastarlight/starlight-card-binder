# Supabase migration workflow

`supabase/migrations/` is the canonical, forward-only migration history for the Starlight Card Binder. New schema, policy, function, and production configuration changes belong here as timestamped migrations.

`docs/supabase/` is the pre-CLI archive. It contains historical migrations, hotfix variants, one-off administration helpers, inventories, and diagnostics. Keep it for reference, but do not replay the directory and do not add new migrations there.

## Production baseline

Production was created through the Supabase SQL Editor before CLI history existed. `20260720160000_production_baseline.sql` is therefore a tracking marker for the already-live database through V94.1; it intentionally does not recreate historical objects.

The migration ledger uses Supabase CLI's official `supabase_migrations.schema_migrations` schema. Once the CLI is run from a network-unrestricted terminal with production linked, run `supabase db pull production_schema` before creating or pushing another migration. That pull will generate the full post-baseline schema migration needed for clean local rebuilds. Until that snapshot exists, do not treat `supabase db reset` as a complete production reconstruction.

## Forward workflow

1. Create a migration with `supabase migration new <name>`.
2. Put all related SQL in the generated file; never edit an already-deployed migration.
3. Run `npm run validate:migrations` and the relevant local database tests.
4. Review `supabase db push --linked --dry-run` before any production push.
5. Run `supabase db push --linked` only with explicit production approval.
6. Commit the migration with the application change that depends on it.

Use `supabase/seed.sql` only for reproducible non-secret application configuration. Never put credentials, access tokens, service-role keys, or private user data in migrations or seeds.
