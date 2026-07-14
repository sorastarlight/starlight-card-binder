-- ============================================================
-- STARLIGHT CARD BINDER V84.1
-- Safe content deletion controls for the Content Studio.
-- Run after V84.0.
-- ============================================================

create or replace function public.admin_delete_series_v841(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  card_total integer;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select count(*) into card_total
  from public.cards
  where series_id = requested_id;

  if card_total > 0 then
    raise exception 'This series still contains % card(s). Move or delete those cards first, or hide the series instead.', card_total;
  end if;

  delete from public.card_series where id = requested_id;
  if not found then raise exception 'Series not found.'; end if;

  return jsonb_build_object('success', true, 'deletedId', requested_id);
end;
$$;

revoke all on function public.admin_delete_series_v841(text) from public, anon;
grant execute on function public.admin_delete_series_v841(text) to authenticated;

create or replace function public.admin_delete_card_v841(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_total integer;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select count(*) into owner_total
  from public.user_cards
  where card_id = requested_id;

  if owner_total > 0 then
    raise exception 'This card is owned by % collector account(s). Archive it instead of deleting it so collections and history remain intact.', owner_total;
  end if;

  begin
    delete from public.cards where id = requested_id;
  exception when foreign_key_violation then
    raise exception 'This card is still referenced by a reward, trade, code, or historical record. Remove those references or archive the card instead.';
  end;

  if not found then raise exception 'Card not found.'; end if;
  return jsonb_build_object('success', true, 'deletedId', requested_id);
end;
$$;

revoke all on function public.admin_delete_card_v841(text) from public, anon;
grant execute on function public.admin_delete_card_v841(text) to authenticated;

create or replace function public.admin_delete_booster_v841(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if requested_id = 'free_daily' then
    raise exception 'The system Free Daily Booster cannot be deleted. Disable it or edit its configuration instead.';
  end if;

  begin
    delete from public.booster_types where id = requested_id;
  exception when foreign_key_violation then
    raise exception 'This booster has historical records that prevent deletion. Archive and deactivate it instead.';
  end;

  if not found then raise exception 'Booster not found.'; end if;
  return jsonb_build_object('success', true, 'deletedId', requested_id);
end;
$$;

revoke all on function public.admin_delete_booster_v841(text) from public, anon;
grant execute on function public.admin_delete_booster_v841(text) to authenticated;
