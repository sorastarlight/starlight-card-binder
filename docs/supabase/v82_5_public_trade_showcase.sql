-- ============================================================
-- STARLIGHT CARD BINDER V82.5
-- PUBLIC WISHLIST + TRADE SHOWCASE
-- ============================================================

create or replace function public.get_public_trade_lists(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    and profile_visibility in ('public','unlisted')
  limit 1;

  if target_user_id is null then
    return jsonb_build_object('found',false);
  end if;

  select coalesce(public_lists,true) into lists_are_public
  from public.user_trade_settings
  where user_id = target_user_id;

  if not found then lists_are_public := true; end if;

  if lists_are_public = false and viewer_id is distinct from target_user_id then
    return jsonb_build_object('found',true,'publicLists',false,'wishlist','[]'::jsonb,'forTrade','[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'viewerOwnsThis', case when viewer_id is null then false else exists(
      select 1 from public.user_cards vuc where vuc.user_id = viewer_id and vuc.card_id = c.id and vuc.quantity > 0
    ) end
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
  into wishlist_cards
  from public.user_card_preferences p
  join public.cards c on c.id = p.card_id
  join public.card_series s on s.id = c.series_id
  where p.user_id = target_user_id and p.wishlisted = true and c.is_visible = true;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'cardNumber', c.card_number,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesId', c.series_id,
    'seriesName', s.name,
    'tradeQuantity', least(p.trade_quantity,greatest(uc.quantity-1,0)),
    'viewerWantsThis', case when viewer_id is null then false else exists(
      select 1 from public.user_card_preferences vp where vp.user_id = viewer_id and vp.card_id = c.id and vp.wishlisted = true
    ) end
  ) order by s.sort_order,c.sort_order),'[]'::jsonb)
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
    'found',true,
    'publicLists',true,
    'username',normalized_username,
    'wishlist',wishlist_cards,
    'forTrade',trade_cards
  );
end;
$$;

revoke all on function public.get_public_trade_lists(text) from public;
grant execute on function public.get_public_trade_lists(text) to anon, authenticated;
