# Current Deployment Notes — V90.2

1. Run `supabase/v90_2_database_health_cleanup_backup.sql` in Supabase SQL Editor.
2. Deploy the full `docs` folder.
3. Hard-refresh the site with `Ctrl + F5`.
4. Open **Administration Hub → Database Health & Backup**.
5. Download a backup before using repair actions.

The backup contains content configuration (cards, sets, categories, tags, boosters and pull rules). It intentionally does not export user authentication secrets.
