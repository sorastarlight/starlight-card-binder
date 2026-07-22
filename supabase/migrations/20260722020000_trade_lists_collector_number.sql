-- Add collectorNumber to trade list / offer context payloads so client search can match it.
-- Forward-only; does not change trade business rules.

create or replace function public.get_my_trade_lists()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  result_cards jsonb;
  public_setting boolean := true;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;

  insert into public.user_trade_settings(user_id)
  values(uid) on conflict(user_id) do nothing;

  select public_lists into public_setting
  from public.user_trade_settings where user_id = uid;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'collectorNumber', coalesce(nullif(trim(c.collector_number), ''), c.card_number),
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'ownedQuantity', coalesce(uc.quantity,0),
    'duplicateQuantity', greatest(coalesce(uc.quantity,0)-1,0),
    'wishlisted', coalesce(p.wishlisted,false),
    'tradeQuantity', least(coalesce(p.trade_quantity,0), greatest(coalesce(uc.quantity,0)-1,0))
  ) order by s.sort_order, c.sort_order), '[]'::jsonb)
  into result_cards
  from public.cards c
  join public.card_series s on s.id = c.series_id
  left join public.user_cards uc on uc.user_id = uid and uc.card_id = c.id
  left join public.user_card_preferences p on p.user_id = uid and p.card_id = c.id
  where c.is_visible = true and c.is_collectible = true;

  return jsonb_build_object('publicLists', public_setting, 'cards', result_cards);
end;
$function$;

create or replace function public.get_public_trade_lists(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  target_user_id uuid;
  normalized_username text := lower(trim(requested_username));
  lists_are_public boolean := false;
  viewer_id uuid := auth.uid();
  wishlist_cards jsonb := '[]'::jsonb;
  trade_cards jsonb := '[]'::jsonb;
begin
  if normalized_username is null or normalized_username = '' then
    raise exception 'A collector username is required.';
  end if;

  select id into target_user_id
  from public.profiles
  where lower(username) = normalized_username
    and onboarding_complete = true
    and profile_visibility in ('public', 'unlisted')
  limit 1;

  if target_user_id is null then
    return jsonb_build_object('found', false);
  end if;

  select coalesce(public_lists, true) into lists_are_public
  from public.user_trade_settings
  where user_id = target_user_id;

  if not found then lists_are_public := true; end if;

  if lists_are_public = false and viewer_id is distinct from target_user_id then
    return jsonb_build_object('found', true, 'publicLists', false, 'wishlist', '[]'::jsonb, 'forTrade', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'collectorNumber', coalesce(nullif(trim(c.collector_number), ''), c.card_number),
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'viewerOwnsThis', case when viewer_id is null then false else exists(
      select 1 from public.user_cards vuc where vuc.user_id = viewer_id and vuc.card_id = c.id and vuc.quantity > 0
    ) end
  ) order by s.sort_order, c.sort_order), '[]'::jsonb)
  into wishlist_cards
  from public.user_card_preferences p
  join public.cards c on c.id = p.card_id
  join public.card_series s on s.id = c.series_id
  where p.user_id = target_user_id and p.wishlisted = true and c.is_visible = true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'collectorNumber', coalesce(nullif(trim(c.collector_number), ''), c.card_number),
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'tradeQuantity', least(p.trade_quantity, greatest(uc.quantity - 1, 0)),
    'viewerWantsThis', case when viewer_id is null then false else exists(
      select 1 from public.user_card_preferences vp where vp.user_id = viewer_id and vp.card_id = c.id and vp.wishlisted = true
    ) end
  ) order by s.sort_order, c.sort_order), '[]'::jsonb)
  into trade_cards
  from public.user_card_preferences p
  join public.user_cards uc on uc.user_id = target_user_id and uc.card_id = p.card_id
  join public.cards c on c.id = p.card_id
  join public.card_series s on s.id = c.series_id
  where p.user_id = target_user_id
    and p.trade_quantity > 0
    and uc.quantity > 1
    and c.is_visible = true;

  return jsonb_build_object(
    'found', true,
    'publicLists', true,
    'username', normalized_username,
    'wishlist', wishlist_cards,
    'forTrade', trade_cards
  );
end;
$function$;

create or replace function public.get_trade_offer_context(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
  target public.profiles%rowtype;
  my_cards jsonb := '[]'::jsonb;
  their_cards jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;
  select * into target from public.profiles
  where lower(username) = lower(trim(requested_username)) and onboarding_complete = true limit 1;
  if not found then raise exception 'Collector not found.'; end if;
  if target.id = uid then raise exception 'You cannot trade with yourself.'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'collectorNumber', coalesce(nullif(trim(c.collector_number), ''), c.card_number),
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesName', s.name,
    'available', greatest(uc.quantity - 1, 0),
    'wantedByOther', coalesce(tp.wishlisted, false)
  ) order by s.sort_order, c.sort_order), '[]'::jsonb)
  into my_cards
  from public.user_cards uc
  join public.cards c on c.id = uc.card_id
  join public.card_series s on s.id = c.series_id
  left join public.user_card_preferences tp on tp.user_id = target.id and tp.card_id = c.id
  where uc.user_id = uid and uc.quantity > 1;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'collectorNumber', coalesce(nullif(trim(c.collector_number), ''), c.card_number),
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesName', s.name,
    'available', greatest(uc.quantity - 1, 0),
    'onMyWishlist', coalesce(mp.wishlisted, false)
  ) order by s.sort_order, c.sort_order), '[]'::jsonb)
  into their_cards
  from public.user_cards uc
  join public.cards c on c.id = uc.card_id
  join public.card_series s on s.id = c.series_id
  left join public.user_card_preferences mp on mp.user_id = uid and mp.card_id = c.id
  where uc.user_id = target.id and uc.quantity > 1;

  return jsonb_build_object(
    'recipient', jsonb_build_object('id', target.id, 'username', target.username, 'displayName', target.display_name, 'avatarUrl', target.avatar_url),
    'myAvailableCards', my_cards,
    'theirAvailableCards', their_cards
  );
end;
$function$;

revoke all on function public.get_my_trade_lists() from public, anon;
grant execute on function public.get_my_trade_lists() to authenticated, service_role;

revoke all on function public.get_trade_offer_context(text) from public, anon;
grant execute on function public.get_trade_offer_context(text) to authenticated, service_role;

-- Public trade lists remain callable by signed-out viewers of public profiles.
grant execute on function public.get_public_trade_lists(text) to anon, authenticated, service_role;
