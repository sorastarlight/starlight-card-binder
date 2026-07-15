-- ============================================================
-- STARLIGHT CARD BINDER V88.0
-- Events & Seasonal Content Framework
-- Corrected / rerunnable version
-- ============================================================

create table if not exists public.starlight_events (
  id text primary key,
  name text not null,
  description text,
  banner_image_url text,
  accent_color text not null default '#ff82c8',
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_active boolean not null default true,
  is_hidden boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at)
);

alter table public.cards
  add column if not exists event_id text
  references public.starlight_events(id)
  on delete set null;

alter table public.cards
  add column if not exists is_event_exclusive boolean not null default false;

alter table public.booster_types
  add column if not exists event_id text
  references public.starlight_events(id)
  on delete set null;

alter table public.booster_types
  add column if not exists visible_from timestamptz;

alter table public.booster_types
  add column if not exists visible_until timestamptz;

create table if not exists public.event_achievements (
  id bigint generated always as identity primary key,
  event_id text not null references public.starlight_events(id) on delete cascade,
  achievement_key text not null,
  name text not null,
  description text,
  requirement_type text not null default 'collect_event_cards',
  requirement_value integer not null default 1 check (requirement_value >= 1),
  reward_star_bits integer not null default 0 check (reward_star_bits >= 0),
  reward_title text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, achievement_key)
);

create index if not exists starlight_events_active_dates_idx
  on public.starlight_events(is_active, is_hidden, start_at, end_at);

create index if not exists cards_event_id_idx
  on public.cards(event_id);

create index if not exists booster_types_event_id_idx
  on public.booster_types(event_id);

alter table public.starlight_events enable row level security;
alter table public.event_achievements enable row level security;

drop policy if exists "Public can view visible events"
  on public.starlight_events;

create policy "Public can view visible events"
  on public.starlight_events
  for select
  to anon, authenticated
  using (is_hidden = false);

drop policy if exists "Public can view active event achievements"
  on public.event_achievements;

create policy "Public can view active event achievements"
  on public.event_achievements
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.starlight_events e
      where e.id = event_id
        and e.is_hidden = false
    )
  );

-- ------------------------------------------------------------
-- ADMIN: LOAD ALL EVENTS
-- ------------------------------------------------------------
create or replace function public.admin_get_events_v88()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'bannerImageUrl', e.banner_image_url,
        'accentColor', e.accent_color,
        'startAt', e.start_at,
        'endAt', e.end_at,
        'isActive', e.is_active,
        'isHidden', e.is_hidden,
        'sortOrder', e.sort_order,
        'boosterCount', (
          select count(*)
          from public.booster_types b
          where b.event_id = e.id
        ),
        'cardCount', (
          select count(*)
          from public.cards c
          where c.event_id = e.id
        ),
        'cardIds', (
          select coalesce(
            jsonb_agg(c.id order by c.sort_order, c.id),
            '[]'::jsonb
          )
          from public.cards c
          where c.event_id = e.id
        ),
        'boosterIds', (
          select coalesce(
            jsonb_agg(b.id order by b.sort_order, b.id),
            '[]'::jsonb
          )
          from public.booster_types b
          where b.event_id = e.id
        ),
        'achievements', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', a.id,
                'key', a.achievement_key,
                'name', a.name,
                'description', a.description,
                'requirementType', a.requirement_type,
                'requirementValue', a.requirement_value,
                'rewardStarBits', a.reward_star_bits,
                'rewardTitle', a.reward_title,
                'isActive', a.is_active,
                'sortOrder', a.sort_order
              )
              order by a.sort_order, a.id
            ),
            '[]'::jsonb
          )
          from public.event_achievements a
          where a.event_id = e.id
        )
      )
      order by e.sort_order, e.start_at desc
    ),
    '[]'::jsonb
  )
  into result
  from public.starlight_events e;

  return result;
end;
$$;

revoke all on function public.admin_get_events_v88() from public, anon;
grant execute on function public.admin_get_events_v88() to authenticated;

-- ------------------------------------------------------------
-- ADMIN: CREATE OR UPDATE EVENT
-- ------------------------------------------------------------
create or replace function public.admin_save_event_v88(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  eid text := lower(trim(payload ->> 'id'));
  ach jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if eid is null or eid !~ '^[a-z0-9_-]{3,60}$' then
    raise exception 'Event ID is invalid.';
  end if;

  if nullif(trim(payload ->> 'name'), '') is null then
    raise exception 'Event name is required.';
  end if;

  insert into public.starlight_events (
    id,
    name,
    description,
    banner_image_url,
    accent_color,
    start_at,
    end_at,
    is_active,
    is_hidden,
    sort_order,
    updated_at
  )
  values (
    eid,
    trim(payload ->> 'name'),
    nullif(trim(payload ->> 'description'), ''),
    nullif(trim(payload ->> 'bannerImageUrl'), ''),
    coalesce(nullif(payload ->> 'accentColor', ''), '#ff82c8'),
    (payload ->> 'startAt')::timestamptz,
    (payload ->> 'endAt')::timestamptz,
    coalesce((payload ->> 'isActive')::boolean, true),
    coalesce((payload ->> 'isHidden')::boolean, false),
    coalesce((payload ->> 'sortOrder')::integer, 0),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    banner_image_url = excluded.banner_image_url,
    accent_color = excluded.accent_color,
    start_at = excluded.start_at,
    end_at = excluded.end_at,
    is_active = excluded.is_active,
    is_hidden = excluded.is_hidden,
    sort_order = excluded.sort_order,
    updated_at = now();

  update public.cards
  set event_id = null,
      is_event_exclusive = false
  where event_id = eid;

  update public.booster_types
  set event_id = null
  where event_id = eid;

  update public.cards
  set event_id = eid,
      is_event_exclusive = true
  where id in (
    select jsonb_array_elements_text(
      coalesce(payload -> 'cardIds', '[]'::jsonb)
    )
  );

  update public.booster_types
  set event_id = eid
  where id in (
    select jsonb_array_elements_text(
      coalesce(payload -> 'boosterIds', '[]'::jsonb)
    )
  );

  delete from public.event_achievements
  where event_id = eid;

  for ach in
    select value
    from jsonb_array_elements(
      coalesce(payload -> 'achievements', '[]'::jsonb)
    )
  loop
    insert into public.event_achievements (
      event_id,
      achievement_key,
      name,
      description,
      requirement_type,
      requirement_value,
      reward_star_bits,
      reward_title,
      is_active,
      sort_order
    )
    values (
      eid,
      lower(trim(ach ->> 'key')),
      trim(ach ->> 'name'),
      nullif(trim(ach ->> 'description'), ''),
      coalesce(ach ->> 'requirementType', 'collect_event_cards'),
      greatest(coalesce((ach ->> 'requirementValue')::integer, 1), 1),
      greatest(coalesce((ach ->> 'rewardStarBits')::integer, 0), 0),
      nullif(trim(ach ->> 'rewardTitle'), ''),
      coalesce((ach ->> 'isActive')::boolean, true),
      coalesce((ach ->> 'sortOrder')::integer, 0)
    );
  end loop;

  return jsonb_build_object('success', true, 'id', eid);
end;
$$;

revoke all on function public.admin_save_event_v88(jsonb) from public, anon;
grant execute on function public.admin_save_event_v88(jsonb) to authenticated;

-- ------------------------------------------------------------
-- ADMIN: DELETE EVENT
-- ------------------------------------------------------------
create or replace function public.admin_delete_event_v88(requested_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  if exists (
    select 1 from public.cards where event_id = requested_id
  ) or exists (
    select 1 from public.booster_types where event_id = requested_id
  ) then
    raise exception 'Remove this event from linked cards and boosters before deleting it.';
  end if;

  delete from public.starlight_events
  where id = requested_id;

  return jsonb_build_object('success', true);
end;
$$;

revoke all on function public.admin_delete_event_v88(text) from public, anon;
grant execute on function public.admin_delete_event_v88(text) to authenticated;

-- ------------------------------------------------------------
-- PUBLIC: ACTIVE EVENTS
-- ------------------------------------------------------------
create or replace function public.get_active_starlight_events_v88()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'name', e.name,
        'description', e.description,
        'bannerImageUrl', e.banner_image_url,
        'accentColor', e.accent_color,
        'startAt', e.start_at,
        'endAt', e.end_at,
        'boosters', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', b.id,
                'name', b.name,
                'description', b.description,
                'packImageUrl', b.pack_image_url,
                'starBitsCost', b.star_bits_cost
              )
              order by b.sort_order, b.id
            ),
            '[]'::jsonb
          )
          from public.booster_types b
          where b.event_id = e.id
            and b.is_active = true
            and coalesce(b.archived, false) = false
            and (b.visible_from is null or now() >= b.visible_from)
            and (b.visible_until is null or now() <= b.visible_until)
        ),
        'cards', (
          select count(*)
          from public.cards c
          where c.event_id = e.id
            and c.is_visible = true
        ),
        'achievements', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'name', a.name,
                'description', a.description,
                'rewardStarBits', a.reward_star_bits,
                'rewardTitle', a.reward_title
              )
              order by a.sort_order, a.id
            ),
            '[]'::jsonb
          )
          from public.event_achievements a
          where a.event_id = e.id
            and a.is_active = true
        )
      )
      order by e.sort_order, e.start_at
    ),
    '[]'::jsonb
  )
  from public.starlight_events e
  where e.is_active = true
    and e.is_hidden = false
    and now() between e.start_at and e.end_at;
$$;

revoke all on function public.get_active_starlight_events_v88() from public;
grant execute on function public.get_active_starlight_events_v88() to anon, authenticated;
