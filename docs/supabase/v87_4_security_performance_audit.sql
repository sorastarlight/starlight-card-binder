-- ============================================================
-- Starlight Card Binder V87.4
-- READ-ONLY SECURITY & PERFORMANCE AUDIT
-- This file does not create, alter, or delete anything.
-- Run each section in Supabase SQL Editor and export the results.
-- ============================================================

-- 1) Public tables and RLS status
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced,
  pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public', 'storage')
order by n.nspname, c.relname;

-- 2) RLS policies
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 3) Security-definer functions and search_path settings
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  coalesce(array_to_string(p.proconfig, ', '), '(not explicitly set)') as function_settings,
  pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef = true
order by p.proname;

-- 4) Grants on public functions
select
  routine_schema,
  routine_name,
  grantee,
  privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
order by routine_name, grantee, privilege_type;

-- 5) Index inventory and usage statistics
select
  schemaname,
  relname as table_name,
  indexrelname as index_name,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
from pg_stat_user_indexes
order by schemaname, relname, indexrelname;

-- 6) Tables with sequential scans and their approximate row counts
select
  schemaname,
  relname as table_name,
  n_live_tup as approximate_rows,
  seq_scan,
  idx_scan,
  case when seq_scan + idx_scan = 0 then null
       else round(100.0 * seq_scan / (seq_scan + idx_scan), 2)
  end as sequential_scan_percent
from pg_stat_user_tables
order by sequential_scan_percent desc nulls last, n_live_tup desc;

-- 7) Foreign keys and delete/update behavior
select
  tc.table_schema,
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.update_rule,
  rc.delete_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.constraint_schema = kcu.constraint_schema
join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.constraint_schema = tc.constraint_schema
join information_schema.referential_constraints rc
  on rc.constraint_name = tc.constraint_name
 and rc.constraint_schema = tc.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, tc.constraint_name;

-- 8) Storage bucket configuration
select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
from storage.buckets
order by id;

-- 9) Storage object totals by bucket and folder
select
  bucket_id,
  split_part(name, '/', 1) as top_folder,
  count(*) as object_count,
  pg_size_pretty(sum((metadata->>'size')::bigint)) as total_size
from storage.objects
where metadata ? 'size'
group by bucket_id, split_part(name, '/', 1)
order by bucket_id, top_folder;

-- 10) Duplicate card numbers within a series
select
  series_id,
  card_number,
  count(*) as duplicate_count,
  array_agg(id order by id) as card_ids
from public.cards
group by series_id, card_number
having count(*) > 1
order by series_id, card_number;

-- 11) Cards with missing or legacy artwork
select
  id,
  name,
  image_url,
  thumbnail_url
from public.cards
where coalesce(image_url, '') = ''
   or coalesce(thumbnail_url, '') = ''
   or image_url ilike '%pages.dev%'
   or thumbnail_url ilike '%pages.dev%'
order by id;

-- 12) Orphaned user-card rows, if any
select
  uc.card_id,
  count(*) as affected_rows
from public.user_cards uc
left join public.cards c on c.id = uc.card_id
where c.id is null
group by uc.card_id
order by uc.card_id;

-- 13) Negative or suspicious balances/quantities
select 'user_cards_negative_quantity' as check_name, count(*) as issue_count
from public.user_cards where quantity < 0
union all
select 'cards_negative_pull_weight', count(*)
from public.cards where pull_weight < 0
union all
select 'wallet_negative_star_bits', count(*)
from public.user_wallets where star_bits < 0;
