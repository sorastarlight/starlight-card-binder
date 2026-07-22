-- Emit series_complete collector activity when a collector finishes a visible series.

create or replace function public.trg_user_cards_series_complete_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  series_id text;
  series_name text;
  owned_count integer;
  total_count integer;
  actor_name text;
  already_logged boolean;
begin
  -- Only care when ownership is created or quantity rises from zero-ish grants.
  if tg_op = 'UPDATE' and new.quantity <= old.quantity then
    return new;
  end if;

  select c.series_id, s.name
    into series_id, series_name
  from public.cards c
  join public.card_series s on s.id = c.series_id
  where c.id = new.card_id
    and c.is_visible = true
    and c.is_collectible = true
    and s.is_visible = true
  limit 1;

  if series_id is null then
    return new;
  end if;

  select count(*) into total_count
  from public.cards
  where series_id = series_id
    and is_visible = true
    and is_collectible = true;

  if total_count < 1 then
    return new;
  end if;

  select count(*) into owned_count
  from public.user_cards uc
  join public.cards c on c.id = uc.card_id
  where uc.user_id = new.user_id
    and c.series_id = series_id
    and c.is_visible = true
    and c.is_collectible = true
    and uc.quantity > 0;

  if owned_count < total_count then
    return new;
  end if;

  select exists (
    select 1
    from public.collector_activity a
    where a.actor_id = new.user_id
      and a.activity_type = 'series_complete'
      and a.payload->>'seriesId' = series_id
  ) into already_logged;

  if already_logged then
    return new;
  end if;

  select coalesce(nullif(trim(display_name), ''), username, 'Collector')
    into actor_name
  from public.profiles
  where id = new.user_id;

  perform public.record_collector_activity(
    new.user_id,
    'series_complete',
    actor_name || ' completed ' || coalesce(series_name, 'a series'),
    jsonb_build_object(
      'seriesId', series_id,
      'seriesName', series_name,
      'owned', owned_count,
      'total', total_count
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_user_cards_series_complete_activity on public.user_cards;
create trigger trg_user_cards_series_complete_activity
  after insert or update of quantity on public.user_cards
  for each row
  execute function public.trg_user_cards_series_complete_activity();
