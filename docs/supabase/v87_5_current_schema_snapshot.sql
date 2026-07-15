-- ============================================================
-- STARLIGHT CARD BINDER V87.5
-- CURRENT DATABASE SCHEMA SNAPSHOT / RECOVERY INVENTORY
-- READ-ONLY: this script does not modify the project.
-- Run in Supabase SQL Editor and export each result grid.
-- ============================================================

-- 1. Public tables, columns, defaults and nullability.
select
  c.table_schema,
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema in ('public','storage')
order by c.table_schema,c.table_name,c.ordinal_position;

-- 2. Primary/unique/foreign/check constraints.
select
  n.nspname as schema_name,
  cls.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  pg_get_constraintdef(con.oid,true) as definition
from pg_constraint con
join pg_class cls on cls.oid=con.conrelid
join pg_namespace n on n.oid=cls.relnamespace
where n.nspname='public'
order by cls.relname,con.conname;

-- 3. Index definitions.
select schemaname,tablename,indexname,indexdef
from pg_indexes
where schemaname='public'
order by tablename,indexname;

-- 4. RLS status.
select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','storage') and c.relkind='r'
order by n.nspname,c.relname;

-- 5. RLS policy definitions.
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_policies
where schemaname in ('public','storage')
order by schemaname,tablename,policyname;

-- 6. Function definitions. Export this result as CSV/JSON for recovery.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as identity_arguments,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
order by p.proname,identity_arguments;

-- 7. Triggers.
select
  event_object_schema,
  event_object_table,
  trigger_name,
  action_timing,
  event_manipulation,
  action_statement
from information_schema.triggers
where trigger_schema='public'
order by event_object_table,trigger_name,event_manipulation;

-- 8. Storage buckets and managed object totals.
select b.id,b.name,b.public,b.file_size_limit,b.allowed_mime_types,count(o.id) as object_count
from storage.buckets b
left join storage.objects o on o.bucket_id=b.id
group by b.id,b.name,b.public,b.file_size_limit,b.allowed_mime_types
order by b.id;

-- 9. Current content totals.
select jsonb_build_object(
  'generated_at',now(),
  'series',(select count(*) from public.card_series),
  'cards',(select count(*) from public.cards),
  'boosters',(select count(*) from public.booster_types),
  'users',(select count(*) from auth.users),
  'user_cards',(select count(*) from public.user_cards),
  'storage_objects',(select count(*) from storage.objects)
) as snapshot_summary;
