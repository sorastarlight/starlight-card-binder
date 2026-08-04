-- Add `shine` premium effect style for gallery cards

alter table public.cards drop constraint if exists cards_effect_style_check;
alter table public.cards
  add constraint cards_effect_style_check
  check (
    effect_style is null
    or effect_style in ('none', 'shine', 'special-art', 'holographic', 'legendary', 'rainbow')
  );

comment on column public.cards.effect_style is 'Optional premium UI effect: none, shine, special-art, holographic, legendary, rainbow';

create or replace function public.admin_save_card_v90(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cid text := lower(trim(payload->>'id'));
  sid text := payload->>'seriesId';
  tag_name text;
  tag_id_value bigint;
  requested_effect_style text := nullif(lower(trim(payload->>'effectStyle')), '');
  requested_effect_intensity smallint := nullif(trim(coalesce(payload->>'effectIntensity', '')), '')::smallint;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  if cid is null or cid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Card ID is invalid.';
  end if;
  if not exists (select 1 from public.card_series where id = sid) then
    raise exception 'Select a valid series.';
  end if;
  if requested_effect_style = 'none' then
    requested_effect_style := null;
  end if;
  if requested_effect_style is not null
     and requested_effect_style not in ('shine', 'special-art', 'holographic', 'legendary', 'rainbow') then
    raise exception 'Premium effect style is invalid.';
  end if;
  if requested_effect_intensity is not null
     and (requested_effect_intensity < 20 or requested_effect_intensity > 100) then
    raise exception 'Effect intensity must be between 20 and 100.';
  end if;

  insert into public.cards (
    id, series_id, card_number, collector_number, name, rarity,
    category_id, subcategory_id, variant_id, finish_id,
    effect_style, effect_intensity,
    image_url, thumbnail_url, card_back_url, description, artist,
    distribution_type, is_promo, is_event_exclusive,
    available_from, available_until, publish_status,
    sort_order, is_visible, is_collectible, is_pullable, pull_weight, updated_at
  )
  values (
    cid, sid, trim(payload->>'cardNumber'),
    coalesce(nullif(trim(payload->>'collectorNumber'), ''), trim(payload->>'cardNumber')),
    trim(payload->>'name'), payload->>'rarity',
    nullif(payload->>'categoryId', ''), nullif(payload->>'subcategoryId', ''),
    nullif(payload->>'variantId', ''), nullif(payload->>'finishId', ''),
    requested_effect_style, requested_effect_intensity,
    trim(payload->>'imageUrl'),
    coalesce(nullif(trim(payload->>'thumbnailUrl'), ''), trim(payload->>'imageUrl')),
    nullif(trim(payload->>'cardBackUrl'), ''),
    nullif(trim(payload->>'description'), ''), nullif(trim(payload->>'artist'), ''),
    coalesce(nullif(payload->>'distributionType', ''), 'booster_pull'),
    coalesce((payload->>'isPromo')::boolean, false),
    coalesce((payload->>'isEventExclusive')::boolean, false),
    nullif(payload->>'availableFrom', '')::timestamptz,
    nullif(payload->>'availableUntil', '')::timestamptz,
    coalesce(nullif(payload->>'publishStatus', ''), 'published'),
    coalesce((payload->>'sortOrder')::integer, 0),
    coalesce((payload->>'isVisible')::boolean, true),
    coalesce((payload->>'isCollectible')::boolean, true),
    coalesce((payload->>'isPullable')::boolean, true),
    greatest(coalesce((payload->>'pullWeight')::numeric, 1), 0),
    now()
  )
  on conflict (id) do update set
    series_id = excluded.series_id,
    card_number = excluded.card_number,
    collector_number = excluded.collector_number,
    name = excluded.name,
    rarity = excluded.rarity,
    category_id = excluded.category_id,
    subcategory_id = excluded.subcategory_id,
    variant_id = excluded.variant_id,
    finish_id = excluded.finish_id,
    effect_style = excluded.effect_style,
    effect_intensity = excluded.effect_intensity,
    image_url = excluded.image_url,
    thumbnail_url = excluded.thumbnail_url,
    card_back_url = excluded.card_back_url,
    description = excluded.description,
    artist = excluded.artist,
    distribution_type = excluded.distribution_type,
    is_promo = excluded.is_promo,
    is_event_exclusive = excluded.is_event_exclusive,
    available_from = excluded.available_from,
    available_until = excluded.available_until,
    publish_status = excluded.publish_status,
    sort_order = excluded.sort_order,
    is_visible = excluded.is_visible,
    is_collectible = excluded.is_collectible,
    is_pullable = excluded.is_pullable,
    pull_weight = excluded.pull_weight,
    updated_at = now();

  delete from public.card_tag_assignments where card_id = cid;
  if jsonb_typeof(payload->'tags') = 'array' then
    for tag_name in
      select distinct lower(trim(value))
      from jsonb_array_elements_text(payload->'tags') as value
      where trim(value) <> ''
    loop
      insert into public.card_tags (name) values (tag_name)
      on conflict (name) do nothing;
      select id into tag_id_value from public.card_tags where name = tag_name;
      insert into public.card_tag_assignments (card_id, tag_id) values (cid, tag_id_value);
    end loop;
  end if;

  return jsonb_build_object('ok', true, 'id', cid);
end;
$$;
