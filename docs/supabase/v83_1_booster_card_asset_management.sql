-- ============================================================
-- STARLIGHT CARD BINDER
-- V83.1 BOOSTER, CARD, SERIES & ARTWORK MANAGEMENT
-- Run after V83.0.
-- ============================================================

-- GitHub Pages cannot accept runtime file uploads into the repository's
-- /site_assets directory. This public Supabase Storage bucket is the
-- editable equivalent used by the Administration Hub.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public artwork can be displayed by the site.
drop policy if exists "Public can view managed site assets" on storage.objects;
create policy "Public can view managed site assets"
on storage.objects for select
to public
using (bucket_id = 'site-assets');

-- Owner/Admin may manage artwork. Folder names are organizational only;
-- access is always checked against the database staff role.
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

create or replace function public.admin_create_card_series_v831(
  requested_id text,
  requested_name text,
  requested_description text default null,
  requested_booster_image_url text default null,
  requested_sort_order integer default 0,
  requested_is_visible boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  normalized_id text := trim(requested_id);
begin
  select sr.role into actor_role
  from public.site_roles sr
  where sr.user_id = auth.uid();

  if actor_role not in ('owner','admin') then
    raise exception 'Administrator access is required.';
  end if;

  if normalized_id is null or normalized_id !~ '^[A-Za-z0-9_-]{1,30}$' then
    raise exception 'Series ID must use letters, numbers, underscores, or hyphens.';
  end if;

  if nullif(trim(requested_name),'') is null then
    raise exception 'Series name is required.';
  end if;

  insert into public.card_series (
    id, name, description, booster_image_url,
    sort_order, is_visible, updated_at
  ) values (
    normalized_id,
    trim(requested_name),
    nullif(trim(requested_description),''),
    coalesce(nullif(trim(requested_booster_image_url),''),'site_assets/series01_rising_star_booster.png'),
    coalesce(requested_sort_order,0),
    coalesce(requested_is_visible,true),
    now()
  );

  return jsonb_build_object('success',true,'id',normalized_id);
end;
$$;

revoke all on function public.admin_create_card_series_v831(text,text,text,text,integer,boolean) from public,anon;
grant execute on function public.admin_create_card_series_v831(text,text,text,text,integer,boolean) to authenticated;

create or replace function public.admin_create_card_v831(
  requested_id text,
  requested_series_id text,
  requested_card_number text,
  requested_name text,
  requested_rarity text,
  requested_image_url text,
  requested_thumbnail_url text default null,
  requested_description text default null,
  requested_artist text default null,
  requested_sort_order integer default 0,
  requested_is_visible boolean default true,
  requested_is_collectible boolean default true,
  requested_is_pullable boolean default true,
  requested_pull_weight numeric default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  normalized_id text := lower(trim(requested_id));
begin
  select sr.role into actor_role
  from public.site_roles sr
  where sr.user_id = auth.uid();

  if actor_role not in ('owner','admin') then
    raise exception 'Administrator access is required.';
  end if;

  if normalized_id is null or normalized_id !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Card ID must use lowercase letters, numbers, underscores, or hyphens.';
  end if;

  if not exists (select 1 from public.card_series s where s.id = requested_series_id) then
    raise exception 'Selected card series does not exist.';
  end if;

  if requested_rarity not in ('Common','Uncommon','Rare','Epic','Legendary') then
    raise exception 'Invalid rarity.';
  end if;

  if nullif(trim(requested_card_number),'') is null
     or nullif(trim(requested_name),'') is null
     or nullif(trim(requested_image_url),'') is null then
    raise exception 'Card number, name, and front image are required.';
  end if;

  insert into public.cards (
    id, series_id, card_number, name, rarity,
    image_url, thumbnail_url, description, artist,
    sort_order, is_visible, is_collectible,
    pull_weight, is_pullable, updated_at
  ) values (
    normalized_id,
    requested_series_id,
    trim(requested_card_number),
    trim(requested_name),
    requested_rarity,
    trim(requested_image_url),
    coalesce(nullif(trim(requested_thumbnail_url),''),trim(requested_image_url)),
    nullif(trim(requested_description),''),
    nullif(trim(requested_artist),''),
    coalesce(requested_sort_order,0),
    coalesce(requested_is_visible,true),
    coalesce(requested_is_collectible,true),
    greatest(coalesce(requested_pull_weight,1),0),
    coalesce(requested_is_pullable,true),
    now()
  );

  return jsonb_build_object('success',true,'id',normalized_id);
end;
$$;

revoke all on function public.admin_create_card_v831(text,text,text,text,text,text,text,text,text,integer,boolean,boolean,boolean,numeric) from public,anon;
grant execute on function public.admin_create_card_v831(text,text,text,text,text,text,text,text,text,integer,boolean,boolean,boolean,numeric) to authenticated;

-- Include card-series information in the existing Administration Hub payload.
create or replace function public.admin_get_booster_configuration()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  result jsonb;
begin
  select sr.role into actor_role
  from public.site_roles sr
  where sr.user_id = auth.uid();

  if actor_role not in ('owner','admin') then
    raise exception 'Administrator access is required.';
  end if;

  select jsonb_build_object(
    'dailyMode', public.get_free_daily_booster_mode(),
    'boosters', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',b.id,
          'name',b.name,
          'description',b.description,
          'starBitsCost',b.star_bits_cost,
          'isActive',b.is_active,
          'packImageUrl',b.pack_image_url,
          'cardBackUrl',b.card_back_url,
          'slots',coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'id',s.id,
                'slotKey',s.slot_key,
                'name',s.name,
                'quantity',s.quantity,
                'percentageTotal',t.percentage_total,
                'isValid',t.is_valid,
                'rates',coalesce((
                  select jsonb_object_agg(r.rarity,r.percentage)
                  from public.booster_slot_rates r
                  where r.slot_id=s.id
                ),'{}'::jsonb)
              ) order by s.sort_order,s.id
            )
            from public.booster_slots s
            join public.booster_slot_rate_totals t on t.slot_id=s.id
            where s.booster_id=b.id
          ),'[]'::jsonb)
        ) order by b.sort_order,b.id
      )
      from public.booster_types b
    ),'[]'::jsonb),
    'cards',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',c.id,
          'cardNumber',c.card_number,
          'name',c.name,
          'rarity',c.rarity,
          'pullWeight',c.pull_weight,
          'isPullable',c.is_pullable,
          'imageUrl',c.image_url,
          'thumbnailUrl',c.thumbnail_url,
          'seriesId',c.series_id
        ) order by c.series_id,c.sort_order
      ) from public.cards c
    ),'[]'::jsonb),
    'series',coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',s.id,
          'name',s.name,
          'description',s.description,
          'boosterImageUrl',s.booster_image_url,
          'sortOrder',s.sort_order,
          'isVisible',s.is_visible
        ) order by s.sort_order,s.id
      ) from public.card_series s
    ),'[]'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_get_booster_configuration() from public,anon;
grant execute on function public.admin_get_booster_configuration() to authenticated;
