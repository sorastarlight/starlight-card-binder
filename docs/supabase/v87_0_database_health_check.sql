-- Read-only V87 database health report.
-- Run whenever you need a quick inventory of the live Supabase project.

select 'tables' as section, jsonb_agg(table_name order by table_name) as details
from information_schema.tables
where table_schema = 'public'
union all
select 'functions', jsonb_agg(routine_name order by routine_name)
from information_schema.routines
where routine_schema = 'public'
union all
select 'rls_enabled_tables', jsonb_agg(tablename order by tablename)
from pg_tables
where schemaname = 'public' and rowsecurity = true
union all
select 'storage_buckets', jsonb_agg(jsonb_build_object(
  'id', id,
  'public', public,
  'file_size_limit', file_size_limit,
  'allowed_mime_types', allowed_mime_types
) order by id)
from storage.buckets;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname in ('public','storage')
order by schemaname, tablename, policyname;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
order by p.proname;
