-- Premium card perspective effects (effect_style / effect_intensity)

alter table public.cards
  add column if not exists effect_style text,
  add column if not exists effect_intensity smallint;

alter table public.cards drop constraint if exists cards_effect_style_check;
alter table public.cards
  add constraint cards_effect_style_check
  check (
    effect_style is null
    or effect_style in ('none', 'special-art', 'holographic', 'legendary', 'rainbow')
  );

alter table public.cards drop constraint if exists cards_effect_intensity_check;
alter table public.cards
  add constraint cards_effect_intensity_check
  check (
    effect_intensity is null
    or (effect_intensity >= 20 and effect_intensity <= 100)
  );

comment on column public.cards.effect_style is 'Optional premium UI effect: none, special-art, holographic, legendary, rainbow';
comment on column public.cards.effect_intensity is 'Premium effect strength from 20 to 100; defaults client-side when null';

update public.cards
set
  effect_style = 'special-art',
  effect_intensity = 75,
  updated_at = now()
where id = 's01-012';

create or replace function public.get_public_card_catalog_v1()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
select jsonb_build_object(
  'generatedAt', now(),
  'catalogUpdatedAt', greatest(
    coalesce((select max(updated_at) from public.cards), 'epoch'::timestamptz),
    coalesce((select max(updated_at) from public.card_series), 'epoch'::timestamptz)
  ),
  'cards', coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'number', c.card_number,
        'collectorNumber', c.collector_number,
        'name', c.name,
        'seriesId', s.id,
        'seriesName', s.name,
        'seriesSort', s.sort_order,
        'seriesDescription', s.description,
        'boosterImageUrl', s.booster_image_url,
        'rarity', c.rarity,
        'categoryId', c.category_id,
        'categoryName', cat.name,
        'subcategoryId', c.subcategory_id,
        'variantId', c.variant_id,
        'finishId', c.finish_id,
        'effectStyle', c.effect_style,
        'effectIntensity', c.effect_intensity,
        'distributionType', c.distribution_type,
        'publishStatus', c.publish_status,
        'tags', coalesce((
          select jsonb_agg(t.name order by t.name)
          from public.card_tag_assignments a
          join public.card_tags t on t.id = a.tag_id
          where a.card_id = c.id
        ), '[]'::jsonb),
        'imageUrl', c.image_url,
        'thumbnailUrl', coalesce(c.thumbnail_url, c.image_url),
        'cardDescription', c.description,
        'artist', c.artist,
        'sortOrder', c.sort_order,
        'isVisible', c.is_visible,
        'isCollectible', c.is_collectible,
        'isPullable', c.is_pullable,
        'pullWeight', c.pull_weight,
        'updatedAt', c.updated_at
      )
      order by s.sort_order, c.sort_order, c.card_number, c.id
    )
    from public.cards c
    join public.card_series s on s.id = c.series_id
    left join public.card_categories cat on cat.id = c.category_id
    where c.is_visible = true
      and c.publish_status = 'published'
      and s.is_visible = true
  ), '[]'::jsonb)
);
$$;

revoke all on function public.get_public_card_catalog_v1() from public;
grant execute on function public.get_public_card_catalog_v1() to anon, authenticated;

create or replace function public.admin_get_content_studio()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  return jsonb_build_object(
    'dailyMode', public.get_free_daily_booster_mode(),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'description', description, 'color', color,
        'sortOrder', sort_order, 'isActive', is_active
      ) order by sort_order, name)
      from public.card_categories
    ), '[]'::jsonb),
    'subcategories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'categoryId', category_id, 'name', name, 'description', description,
        'sortOrder', sort_order, 'isActive', is_active
      ) order by category_id, sort_order, name)
      from public.card_subcategories
    ), '[]'::jsonb),
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'sortOrder', sort_order, 'isActive', is_active
      ) order by sort_order, name)
      from public.card_variants
    ), '[]'::jsonb),
    'finishes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'sortOrder', sort_order, 'isActive', is_active
      ) order by sort_order, name)
      from public.card_finishes
    ), '[]'::jsonb),
    'series', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'name', s.name, 'description', s.description,
        'boosterImageUrl', s.booster_image_url, 'sortOrder', s.sort_order,
        'isVisible', s.is_visible,
        'cardCount', (select count(*) from public.cards c where c.series_id = s.id)
      ) order by s.sort_order, s.id)
      from public.card_series s
    ), '[]'::jsonb),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'seriesId', c.series_id, 'cardNumber', c.card_number,
        'collectorNumber', c.collector_number, 'name', c.name, 'rarity', c.rarity,
        'categoryId', c.category_id, 'subcategoryId', c.subcategory_id,
        'variantId', c.variant_id, 'finishId', c.finish_id,
        'effectStyle', c.effect_style, 'effectIntensity', c.effect_intensity,
        'description', c.description, 'artist', c.artist,
        'imageUrl', c.image_url, 'thumbnailUrl', c.thumbnail_url, 'cardBackUrl', c.card_back_url,
        'distributionType', c.distribution_type, 'isPromo', c.is_promo,
        'isEventExclusive', c.is_event_exclusive,
        'availableFrom', c.available_from, 'availableUntil', c.available_until,
        'publishStatus', c.publish_status,
        'sortOrder', c.sort_order, 'isVisible', c.is_visible,
        'isCollectible', c.is_collectible, 'isPullable', c.is_pullable, 'pullWeight', c.pull_weight,
        'tags', coalesce((
          select jsonb_agg(t.name order by t.name)
          from public.card_tag_assignments a
          join public.card_tags t on t.id = a.tag_id
          where a.card_id = c.id
        ), '[]'::jsonb)
      ) order by c.series_id, c.sort_order, c.id)
      from public.cards c
    ), '[]'::jsonb),
    'boosters', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', b.id, 'name', b.name, 'description', b.description,
        'starBitsCost', b.star_bits_cost, 'isActive', b.is_active, 'sortOrder', b.sort_order,
        'packImageUrl', b.pack_image_url, 'cardBackUrl', b.card_back_url,
        'rewardMode', b.reward_mode, 'seriesId', b.series_id, 'cardCount', b.card_count,
        'bonusStarBits', b.bonus_star_bits, 'archived', b.archived,
        'builderMode', b.builder_mode, 'oddsPreset', b.odds_preset,
        'categoryIds', to_jsonb(b.category_ids), 'finishIds', to_jsonb(b.finish_ids),
        'excludePromos', b.exclude_promos, 'allowDuplicates', b.allow_duplicates,
        'rewardCards', coalesce((
          select jsonb_agg(jsonb_build_object(
            'cardId', rc.card_id, 'quantity', rc.quantity, 'weight', rc.weight,
            'guaranteed', rc.guaranteed, 'sortOrder', rc.sort_order
          ) order by rc.sort_order, rc.card_id)
          from public.booster_reward_cards rc
          where rc.booster_id = b.id
        ), '[]'::jsonb),
        'slots', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', sl.id, 'slotKey', sl.slot_key, 'name', sl.name, 'quantity', sl.quantity,
            'sortOrder', sl.sort_order,
            'rates', coalesce((
              select jsonb_object_agg(r.rarity, r.percentage)
              from public.booster_slot_rates r
              where r.slot_id = sl.id
            ), '{}'::jsonb)
          ) order by sl.sort_order, sl.id)
          from public.booster_slots sl
          where sl.booster_id = b.id
        ), '[]'::jsonb)
      ) order by b.sort_order, b.id)
      from public.booster_types b
    ), '[]'::jsonb)
  );
end;
$$;

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
     and requested_effect_style not in ('special-art', 'holographic', 'legendary', 'rainbow') then
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
  for tag_name in
    select trim(value)
    from jsonb_array_elements_text(coalesce(payload->'tags', '[]'::jsonb))
  loop
    if tag_name <> '' then
      insert into public.card_tags (name, slug)
      values (
        tag_name,
        lower(regexp_replace(tag_name, '[^a-zA-Z0-9]+', '-', 'g'))
      )
      on conflict (name) do update set name = excluded.name
      returning id into tag_id_value;
      insert into public.card_tag_assignments (card_id, tag_id)
      values (cid, tag_id_value)
      on conflict do nothing;
    end if;
  end loop;

  return jsonb_build_object('success', true, 'id', cid);
end;
$$;
