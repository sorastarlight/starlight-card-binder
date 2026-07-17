-- V91.0 — Card & Booster System Rebuild
-- Critical fix: use ONE random roll per rarity slot.
-- The previous query evaluated random() independently for every rarity row,
-- which heavily favored later rows such as Legendary.

create or replace function public.draw_configured_booster_cards(requested_booster_id text)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.booster_types%rowtype;
  selected_ids text[] := array[]::text[];
  slot_rec record;
  i integer;
  chosen text;
  chosen_rarity text;
  rarity_roll numeric;
  rate_total numeric;
  attempts integer;
begin
  select *
  into b
  from public.booster_types
  where id = requested_booster_id
    and is_active = true
    and archived = false;

  if not found then
    raise exception 'This booster is not active.';
  end if;

  if b.reward_mode = 'slots' then
    for slot_rec in
      select id, quantity, name
      from public.booster_slots
      where booster_id = b.id
      order by sort_order, id
    loop
      select coalesce(sum(percentage), 0)
      into rate_total
      from public.booster_slot_rates
      where slot_id = slot_rec.id
        and percentage > 0;

      if abs(rate_total - 100) > 0.001 then
        raise exception using message = format(
          'Slot "%s" totals %s%%. Every rarity slot must total exactly 100%%.',
          slot_rec.name,
          rate_total
        );
      end if;

      for i in 1..greatest(slot_rec.quantity, 1)
      loop
        attempts := 0;
        chosen := null;

        loop
          attempts := attempts + 1;
          rarity_roll := random() * 100;

          with rates as (
            select
              rarity,
              percentage,
              sum(percentage) over (
                order by case rarity
                  when 'Common' then 1
                  when 'Uncommon' then 2
                  when 'Rare' then 3
                  when 'Epic' then 4
                  when 'Legendary' then 5
                  else 99
                end
              ) as cumulative
            from public.booster_slot_rates
            where slot_id = slot_rec.id
              and percentage > 0
          )
          select rarity
          into chosen_rarity
          from rates
          where rarity_roll < cumulative
          order by cumulative
          limit 1;

          select c.id
          into chosen
          from public.cards c
          where c.rarity = chosen_rarity
            and public.card_is_booster_eligible_v90(c, b)
            and (b.series_id is null or c.series_id = b.series_id)
            and (b.allow_duplicates or not c.id = any(selected_ids))
          order by (-ln(greatest(random(), 0.0000001)) / greatest(c.pull_weight, 0.0000001))
          limit 1;

          exit when chosen is not null or attempts >= 20;
        end loop;

        if chosen is null then
          raise exception using message = format(
            'No eligible %s card is available for slot "%s".',
            coalesce(chosen_rarity, 'configured'),
            slot_rec.name
          );
        end if;

        selected_ids := array_append(selected_ids, chosen);
      end loop;
    end loop;

  elsif b.reward_mode = 'series' then
    for i in 1..greatest(b.card_count, 1)
    loop
      select c.id
      into chosen
      from public.cards c
      where c.series_id = b.series_id
        and public.card_is_booster_eligible_v90(c, b)
        and (b.allow_duplicates or not c.id = any(selected_ids))
      order by (-ln(greatest(random(), 0.0000001)) / greatest(c.pull_weight, 0.0000001))
      limit 1;

      if chosen is null then
        raise exception 'This series has no eligible cards.';
      end if;

      selected_ids := array_append(selected_ids, chosen);
    end loop;

  elsif b.reward_mode in ('exact', 'single', 'mixed') then
    for slot_rec in
      select *
      from public.booster_reward_cards
      where booster_id = b.id
      order by sort_order, card_id
    loop
      for i in 1..greatest(slot_rec.quantity, 1)
      loop
        selected_ids := array_append(selected_ids, slot_rec.card_id);
      end loop;
    end loop;

  elsif b.reward_mode = 'weighted_pool' then
    for i in 1..greatest(b.card_count, 1)
    loop
      select rc.card_id
      into chosen
      from public.booster_reward_cards rc
      join public.cards c on c.id = rc.card_id
      where rc.booster_id = b.id
        and rc.weight > 0
        and public.card_is_booster_eligible_v90(c, b)
        and (b.allow_duplicates or not c.id = any(selected_ids))
      order by (-ln(greatest(random(), 0.0000001)) / greatest(rc.weight, 0.0000001))
      limit 1;

      if chosen is null then
        raise exception 'This booster custom pool is empty.';
      end if;

      selected_ids := array_append(selected_ids, chosen);
    end loop;
  end if;

  if cardinality(selected_ids) = 0 then
    raise exception 'This booster has no card rewards configured.';
  end if;

  return selected_ids;
end;
$$;

revoke all on function public.draw_configured_booster_cards(text)
from public, anon, authenticated;

-- Admin-only simulator. Does not award cards or spend currency.
create or replace function public.admin_simulate_booster_v91(
  requested_booster_id text,
  requested_openings integer default 1000
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := greatest(1, least(coalesce(requested_openings, 1000), 10000));
  ids text[];
  cid text;
  rarity_counts jsonb := '{}'::jsonb;
  card_counts jsonb := '{}'::jsonb;
  i integer;
  rarity_name text;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  for i in 1..n
  loop
    ids := public.draw_configured_booster_cards(requested_booster_id);

    foreach cid in array ids
    loop
      select rarity into rarity_name from public.cards where id = cid;

      rarity_counts := jsonb_set(
        rarity_counts,
        array[coalesce(rarity_name, 'Unknown')],
        to_jsonb(coalesce((rarity_counts ->> coalesce(rarity_name, 'Unknown'))::integer, 0) + 1),
        true
      );

      card_counts := jsonb_set(
        card_counts,
        array[cid],
        to_jsonb(coalesce((card_counts ->> cid)::integer, 0) + 1),
        true
      );
    end loop;
  end loop;

  return jsonb_build_object(
    'boosterId', requested_booster_id,
    'openings', n,
    'rarityCounts', rarity_counts,
    'cardCounts', card_counts
  );
end;
$$;

revoke all on function public.admin_simulate_booster_v91(text, integer)
from public, anon;
grant execute on function public.admin_simulate_booster_v91(text, integer)
to authenticated;
