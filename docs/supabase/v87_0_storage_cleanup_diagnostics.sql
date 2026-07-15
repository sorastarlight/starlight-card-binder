-- ============================================================
-- STARLIGHT CARD BINDER
-- V87.0 STORAGE, CLEANUP & DIAGNOSTICS FOUNDATION
-- Run after V86.0.
-- ============================================================

-- Editable site artwork lives in Supabase Storage. GitHub remains the
-- application host and contains permanent default/fallback assets.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets', 'site-assets', true, 5242880,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists "Public can view managed site assets" on storage.objects;
create policy "Public can view managed site assets"
on storage.objects for select
to public
using (bucket_id = 'site-assets');

drop policy if exists "Administrators can upload managed site assets" on storage.objects;
create policy "Administrators can upload managed site assets"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'site-assets'
  and exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  )
);

drop policy if exists "Administrators can update managed site assets" on storage.objects;
create policy "Administrators can update managed site assets"
on storage.objects for update
to authenticated
using (
  bucket_id = 'site-assets'
  and exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  )
)
with check (
  bucket_id = 'site-assets'
  and exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  )
);

drop policy if exists "Administrators can delete managed site assets" on storage.objects;
create policy "Administrators can delete managed site assets"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'site-assets'
  and exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  )
);

-- Registry used for backup manifests and easier cleanup. Storage itself
-- remains the authority for whether a file physically exists.
create table if not exists public.site_asset_manifest (
  path text primary key,
  original_name text,
  mime_type text,
  file_size bigint,
  public_url text not null,
  folder text,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.site_asset_manifest enable row level security;

drop policy if exists "Administrators can read site asset manifest" on public.site_asset_manifest;
create policy "Administrators can read site asset manifest"
on public.site_asset_manifest for select
to authenticated
using (
  exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  )
);

create index if not exists site_asset_manifest_folder_idx
on public.site_asset_manifest(folder);

create or replace function public.admin_register_site_asset_v87(
  asset_path text,
  original_name text,
  mime_type text,
  file_size bigint,
  public_url text,
  asset_folder text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  insert into public.site_asset_manifest (
    path, original_name, mime_type, file_size, public_url,
    folder, uploaded_by, created_at, updated_at
  ) values (
    asset_path, original_name, mime_type, file_size, public_url,
    asset_folder, auth.uid(), now(), now()
  )
  on conflict (path) do update set
    original_name = excluded.original_name,
    mime_type = excluded.mime_type,
    file_size = excluded.file_size,
    public_url = excluded.public_url,
    folder = excluded.folder,
    uploaded_by = auth.uid(),
    updated_at = now();

  return jsonb_build_object('success', true, 'path', asset_path);
end;
$$;

revoke all on function public.admin_register_site_asset_v87(text,text,text,bigint,text,text) from public, anon;
grant execute on function public.admin_register_site_asset_v87(text,text,text,bigint,text,text) to authenticated;

create or replace function public.admin_unregister_site_asset_v87(asset_path text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  delete from public.site_asset_manifest where path = asset_path;
  return jsonb_build_object('success', true, 'path', asset_path);
end;
$$;

revoke all on function public.admin_unregister_site_asset_v87(text) from public, anon;
grant execute on function public.admin_unregister_site_asset_v87(text) to authenticated;

create or replace function public.admin_get_asset_manifest_v87()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  select coalesce(jsonb_agg(to_jsonb(m) order by m.folder, m.path), '[]'::jsonb)
  into result
  from public.site_asset_manifest m;

  return result;
end;
$$;

revoke all on function public.admin_get_asset_manifest_v87() from public, anon;
grant execute on function public.admin_get_asset_manifest_v87() to authenticated;

create or replace function public.admin_get_system_diagnostics_v87()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cards_count bigint;
  series_count bigint;
  boosters_count bigint;
  users_count bigint;
  manifest_count bigint;
  storage_count bigint;
  last_card_update timestamptz;
begin
  if not exists (
    select 1 from public.site_roles sr
    where sr.user_id = auth.uid()
      and sr.role in ('owner','admin')
  ) then
    raise exception 'Administrator access is required.';
  end if;

  select count(*), max(updated_at) into cards_count, last_card_update from public.cards;
  select count(*) into series_count from public.card_series;
  select count(*) into boosters_count from public.booster_types;
  select count(*) into users_count from auth.users;
  select count(*) into manifest_count from public.site_asset_manifest;
  select count(*) into storage_count from storage.objects where bucket_id = 'site-assets';

  return jsonb_build_object(
    'siteVersion', 'V87.0',
    'databaseConnected', true,
    'siteAssetsBucketExists', exists(select 1 from storage.buckets where id = 'site-assets'),
    'cards', cards_count,
    'series', series_count,
    'boosters', boosters_count,
    'registeredUsers', users_count,
    'registeredManagedAssets', manifest_count,
    'physicalStorageObjects', storage_count,
    'lastCardUpdate', last_card_update,
    'checkedAt', now()
  );
end;
$$;

revoke all on function public.admin_get_system_diagnostics_v87() from public, anon;
grant execute on function public.admin_get_system_diagnostics_v87() to authenticated;

-- Helpful indexes for the most common catalog and ownership queries.
create index if not exists cards_visible_series_sort_idx
on public.cards(is_visible, series_id, sort_order);

create index if not exists cards_pull_pool_idx
on public.cards(is_pullable, rarity, series_id)
where is_pullable = true;

create index if not exists user_cards_user_quantity_idx
on public.user_cards(user_id, quantity);

create index if not exists daily_booster_claims_user_date_idx
on public.daily_booster_claims(user_id, claim_date);
