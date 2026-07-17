-- ============================================================
-- STARLIGHT CARD BINDER V90.1.3
-- Booster Save/Delete Repair
-- Run after V90.1 / V90.1.2. Safe to rerun.
-- ============================================================

create or replace function public.admin_save_booster_complete_v9013(
  payload jsonb,
  requested_slots jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  bid text := lower(trim(payload->>'id'));
  reward_mode text := coalesce(nullif(payload->>'rewardMode', ''), 'slots');
  slot_item jsonb;
  slot_id_value bigint;
  slot_key_value text;
  slot_name_value text;
  rate_pair record;
  rate_total numeric;
  kept_keys text[] := array[]::text[];
  saved_slot_count integer := 0;
  result jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if bid is null or bid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Booster ID is invalid.';
  end if;

  if nullif(trim(payload->>'name'), '') is null then
    raise exception 'Booster name is required.';
  end if;

  -- Save the parent record and its exact/custom reward-card rows first.
  result := public.admin_save_booster_v90(payload);

  if reward_mode = 'slots' then
    if jsonb_typeof(coalesce(requested_slots, '[]'::jsonb)) <> 'array'
       or jsonb_array_length(coalesce(requested_slots, '[]'::jsonb)) = 0 then
      raise exception 'This booster uses rarity slots, but no slots were provided.';
    end if;

    for slot_item in
      select value
      from jsonb_array_elements(coalesce(requested_slots, '[]'::jsonb))
    loop
      slot_key_value := lower(
        regexp_replace(
          coalesce(
            nullif(trim(slot_item->>'slotKey'), ''),
            'slot_' || (saved_slot_count + 1)::text
          ),
          '[^a-z0-9_-]+',
          '_',
          'g'
        )
      );

      if slot_key_value = any(kept_keys) then
        raise exception using message = format(
          'Two rarity slots use the same key "%s". Give each slot a unique name.',
          slot_key_value
        );
      end if;

      slot_name_value := coalesce(
        nullif(trim(slot_item->>'name'), ''),
        initcap(replace(slot_key_value, '_', ' '))
      );

      select coalesce(sum(value::numeric), 0)
      into rate_total
      from jsonb_each_text(coalesce(slot_item->'rates', '{}'::jsonb));

      if abs(rate_total - 100) > 0.001 then
        raise exception using message = format(
          'Slot "%s" totals %s%%. Every rarity slot must total exactly 100%%.',
          slot_name_value,
          trim(to_char(rate_total, 'FM999999990.####'))
        );
      end if;

      kept_keys := array_append(kept_keys, slot_key_value);
      saved_slot_count := saved_slot_count + 1;

      insert into public.booster_slots (
        booster_id,
        slot_key,
        name,
        quantity,
        sort_order,
        updated_at
      )
      values (
        bid,
        slot_key_value,
        slot_name_value,
        greatest(coalesce((slot_item->>'quantity')::integer, 1), 1),
        coalesce((slot_item->>'sortOrder')::integer, (saved_slot_count - 1) * 10),
        now()
      )
      on conflict (booster_id, slot_key)
      do update set
        name = excluded.name,
        quantity = excluded.quantity,
        sort_order = excluded.sort_order,
        updated_at = now()
      returning id into slot_id_value;

      delete from public.booster_slot_rates
      where slot_id = slot_id_value;

      for rate_pair in
        select key, value
        from jsonb_each_text(coalesce(slot_item->'rates', '{}'::jsonb))
      loop
        if rate_pair.key not in ('Common', 'Uncommon', 'Rare', 'Epic', 'Legendary') then
          raise exception using message = format(
            'Slot "%s" contains the unsupported rarity "%s".',
            slot_name_value,
            rate_pair.key
          );
        end if;

        if rate_pair.value::numeric < 0 or rate_pair.value::numeric > 100 then
          raise exception using message = format(
            'The %s rate in slot "%s" must be between 0 and 100.',
            rate_pair.key,
            slot_name_value
          );
        end if;

        insert into public.booster_slot_rates (
          slot_id,
          rarity,
          percentage,
          updated_at
        )
        values (
          slot_id_value,
          rate_pair.key,
          rate_pair.value::numeric,
          now()
        );
      end loop;
    end loop;

    delete from public.booster_slots
    where booster_id = bid
      and not (slot_key = any(kept_keys));
  else
    -- Non-slot packs should not retain stale rarity-slot configuration.
    delete from public.booster_slots
    where booster_id = bid;
  end if;

  return coalesce(result, '{}'::jsonb) || jsonb_build_object(
    'success', true,
    'id', bid,
    'slotCount', saved_slot_count
  );
end;
$$;

revoke all on function public.admin_save_booster_complete_v9013(jsonb, jsonb)
from public, anon;

grant execute on function public.admin_save_booster_complete_v9013(jsonb, jsonb)
to authenticated;


create or replace function public.admin_safe_delete_booster_v9013(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_id text := lower(trim(requested_id));
  affected bigint := 0;
  cleanup jsonb := '[]'::jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if normalized_id is null or normalized_id = '' then
    raise exception 'Choose a booster to delete.';
  end if;

  if normalized_id = 'free_daily' then
    raise exception 'The system Daily Free Booster cannot be deleted.';
  end if;

  if not exists (
    select 1 from public.booster_types where id = normalized_id
  ) then
    raise exception using message = format(
      'Booster "%s" does not exist.',
      normalized_id
    );
  end if;

  -- These operational references may safely be removed or detached.
  if to_regclass('public.twitch_reward_rules') is not null then
    delete from public.twitch_reward_rules where booster_id = normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(
      jsonb_build_object('table', 'twitch_reward_rules', 'action', 'deleted', 'count', affected)
    );
  end if;

  if to_regclass('public.star_bits_booster_purchases') is not null then
    update public.star_bits_booster_purchases
    set booster_id = null
    where booster_id = normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(
      jsonb_build_object('table', 'star_bits_booster_purchases', 'action', 'detached', 'count', affected)
    );
  end if;

  if to_regclass('public.received_rewards') is not null then
    update public.received_rewards
    set status = case when status = 'pending' then 'cancelled' else status end,
        metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
          'deletedBoosterId', normalized_id
        )
    where booster_id = normalized_id;
    get diagnostics affected = row_count;
    cleanup := cleanup || jsonb_build_array(
      jsonb_build_object('table', 'received_rewards', 'action', 'cancelled/detached', 'count', affected)
    );
  end if;

  -- Child configuration tables use ON DELETE CASCADE.
  delete from public.booster_types
  where id = normalized_id;

  return jsonb_build_object(
    'success', true,
    'deletedId', normalized_id,
    'cleanup', cleanup
  );
exception
  when foreign_key_violation then
    raise exception using message = format(
      'Booster "%s" is still referenced elsewhere. Use Inspect References, detach those records, and try again.',
      normalized_id
    );
end;
$$;

revoke all on function public.admin_safe_delete_booster_v9013(text)
from public, anon;

grant execute on function public.admin_safe_delete_booster_v9013(text)
to authenticated;
