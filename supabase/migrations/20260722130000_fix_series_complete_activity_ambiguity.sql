-- Fix ambiguous series_id references that abort every pack open when the
-- series-complete activity trigger runs inside user_cards award transactions.

create or replace function public.trg_user_cards_series_complete_activity()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  completed_series_id text;
  completed_series_name text;
  owned_count integer;
  total_count integer;
  actor_name text;
  already_logged boolean;
begin
  -- Only care when ownership is created or quantity rises.
  if tg_op = 'UPDATE' and new.quantity <= old.quantity then
    return new;
  end if;

  select c.series_id, s.name
    into completed_series_id, completed_series_name
  from public.cards c
  join public.card_series s on s.id = c.series_id
  where c.id = new.card_id
    and c.is_visible = true
    and c.is_collectible = true
    and s.is_visible = true
  limit 1;

  if completed_series_id is null then
    return new;
  end if;

  select count(*) into total_count
  from public.cards c
  where c.series_id = completed_series_id
    and c.is_visible = true
    and c.is_collectible = true;

  if total_count < 1 then
    return new;
  end if;

  select count(*) into owned_count
  from public.user_cards uc
  join public.cards c on c.id = uc.card_id
  where uc.user_id = new.user_id
    and c.series_id = completed_series_id
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
      and a.payload->>'seriesId' = completed_series_id
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
    coalesce(actor_name, 'Collector') || ' completed ' || coalesce(completed_series_name, 'a series'),
    jsonb_build_object(
      'seriesId', completed_series_id,
      'seriesName', completed_series_name,
      'owned', owned_count,
      'total', total_count
    )
  );

  return new;
end;
$$;
