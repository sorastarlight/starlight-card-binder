-- Prestige CSS avatar frames (level ladder) + optional uploaded overlay art support.

insert into public.collector_avatar_frames (
  id, name, description, css_preset, effect, sort_order, is_active
) values
  ('frame_level_ember', 'Ember Ring', 'Unlocked at collector level 2 — warm bronze glow.', 'level-ember', 'static', 160, true),
  ('frame_radiance_i', 'Radiance I Ring', 'Unlocked at level 3 — pearlescent silver halo.', 'radiance-i', 'static', 161, true),
  ('frame_radiance_ii', 'Radiance II Ring', 'Unlocked at level 4 — rose-gold pulse.', 'radiance-ii', 'pulse', 162, true),
  ('frame_radiance_iii', 'Radiance III Ring', 'Unlocked at level 5 — aurora gradient ring.', 'radiance-iii', 'shimmer', 163, true),
  ('frame_level_nova', 'Nova Ring', 'Unlocked at level 6 — bright stellar spin.', 'level-nova', 'pulse', 164, true),
  ('frame_radiance_iv', 'Radiance IV Ring', 'Unlocked at level 7 — sapphire neon halo.', 'radiance-iv', 'pulse', 165, true),
  ('frame_level_apex', 'Apex Ring', 'Unlocked at level 8 — golden crown accents.', 'level-apex', 'pulse', 166, true),
  ('frame_radiance_v', 'Radiance V Ring', 'Unlocked at level 9 — prismatic conic spin.', 'radiance-v', 'shimmer', 167, true),
  ('frame_overlay_sovereign', 'Sovereign Frame', 'Upload a transparent ring PNG/SVG in admin for illustrated wings or filigree.', 'asset-ring', 'breathe', 180, true),
  ('frame_overlay_ascendant', 'Ascendant Frame', 'Hybrid asset frame — CSS ring plus optional overlay artwork.', 'radiance-v', 'breathe', 181, true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  css_preset = excluded.css_preset,
  effect = excluded.effect,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

create or replace function public.sync_my_level_avatar_frames()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  xp bigint := 0;
begin
  if uid is null then
    return;
  end if;

  select coalesce(collector_xp, 0)
  into xp
  from public.user_wallets
  where user_id = uid;

  if xp >= 25 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_level_ember', now())
    on conflict do nothing;
  end if;
  if xp >= 75 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_radiance_i', now())
    on conflict do nothing;
  end if;
  if xp >= 150 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_radiance_ii', now())
    on conflict do nothing;
  end if;
  if xp >= 250 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_radiance_iii', now())
    on conflict do nothing;
  end if;
  if xp >= 400 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_level_nova', now())
    on conflict do nothing;
  end if;
  if xp >= 600 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_radiance_iv', now())
    on conflict do nothing;
  end if;
  if xp >= 850 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_level_apex', now())
    on conflict do nothing;
  end if;
  if xp >= 1150 then
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (uid, 'frame_radiance_v', now())
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.get_my_profile_extras()
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  perform public.sync_my_achievements();
  perform public.sync_my_level_avatar_frames();

  return jsonb_build_object(
    'avatarUrl', (select avatar_url from public.profiles where id::text = uid::text),
    'bannerUrl', (select banner_url from public.profiles where id::text = uid::text),
    'selectedTitleId', (select selected_title_id from public.profiles where id::text = uid::text),
    'selectedFrameId', (select selected_frame_id from public.profiles where id::text = uid::text),
    'titles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'description', t.description
        )
        order by t.sort_order
      )
      from public.user_titles ut
      join public.collector_titles t on t.id = ut.title_id
      where ut.user_id = uid
        and t.is_active = true
    ), '[]'::jsonb),
    'frames', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'description', f.description,
          'cssPreset', f.css_preset,
          'effect', f.effect,
          'overlayImageUrl', f.overlay_image_url
        )
        order by f.sort_order, f.id
      )
      from public.user_avatar_frames uf
      join public.collector_avatar_frames f on f.id = uf.frame_id
      where uf.user_id = uid
        and f.is_active = true
    ), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', a.id,
          'name', a.name,
          'description', a.description,
          'icon', a.icon,
          'unlockedAt', ua.unlocked_at
        )
        order by a.sort_order
      )
      from public.user_achievements ua
      join public.achievement_definitions a on a.id = ua.achievement_id
      where ua.user_id = uid
        and a.is_active = true
    ), '[]'::jsonb)
  );
end;
$function$;

create or replace function public.admin_save_avatar_frame(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  frame_id text := nullif(trim(coalesce(payload->>'id', '')), '');
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if frame_id is null then
    raise exception 'Frame id is required.';
  end if;

  update public.collector_avatar_frames
  set
    name = coalesce(nullif(trim(payload->>'name'), ''), name),
    description = case
      when payload ? 'description' then nullif(trim(payload->>'description'), '')
      else description
    end,
    sort_order = coalesce((payload->>'sortOrder')::integer, sort_order),
    is_active = coalesce((payload->>'isActive')::boolean, is_active),
    overlay_image_url = case
      when payload ? 'overlayImageUrl' then nullif(trim(payload->>'overlayImageUrl'), '')
      else overlay_image_url
    end
  where id = frame_id;

  if not found then
    raise exception 'That avatar frame was not found.';
  end if;

  return jsonb_build_object('success', true, 'id', frame_id);
end;
$$;

create or replace function public.list_public_collector_rankings(
  requested_search text default null,
  requested_limit integer default 50,
  requested_offset integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  q text := lower(trim(coalesce(requested_search, '')));
  lim integer := greatest(1, least(coalesce(requested_limit, 50), 100));
  off integer := greatest(0, coalesce(requested_offset, 0));
  catalog_total integer := 0;
  total_matches integer := 0;
  results jsonb := '[]'::jsonb;
begin
  select count(*)
  into catalog_total
  from public.cards
  where is_visible = true
    and is_collectible = true;

  with ranked as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.created_at,
      p.show_collection_stats,
      p.selected_title_id,
      p.selected_frame_id,
      t.name as selected_title_name,
      f.id as frame_id,
      f.css_preset as frame_css_preset,
      f.effect as frame_effect,
      f.overlay_image_url as frame_overlay_image_url,
      coalesce(w.collector_xp, 0)::bigint as collector_xp,
      rank() over (
        order by
          coalesce(w.collector_xp, 0) desc,
          lower(coalesce(p.display_name, p.username)),
          lower(p.username)
      ) as global_rank
    from public.profiles p
    left join public.user_wallets w
      on w.user_id = p.id
    left join public.collector_titles t
      on t.id = p.selected_title_id
    left join public.collector_avatar_frames f
      on f.id = p.selected_frame_id
     and f.is_active = true
    where p.onboarding_complete = true
      and p.profile_visibility = 'public'
      and nullif(trim(p.username), '') is not null
  ),
  filtered as (
    select *
    from ranked r
    where q = ''
       or lower(r.username) like '%' || q || '%'
       or lower(coalesce(r.display_name, '')) like '%' || q || '%'
       or lower(coalesce(r.selected_title_name, '')) like '%' || q || '%'
  ),
  counted as (
    select count(*)::integer as match_count from filtered
  ),
  page as (
    select
      f.*,
      case
        when f.show_collection_stats then (
          select count(*)::integer
          from public.user_cards uc
          where uc.user_id = f.id
        )
        else null
      end as unique_cards,
      case
        when f.show_collection_stats then (
          select coalesce(sum(uc.quantity), 0)::bigint
          from public.user_cards uc
          where uc.user_id = f.id
        )
        else null
      end as total_copies
    from filtered f
    order by f.global_rank, lower(coalesce(f.display_name, f.username))
    limit lim
    offset off
  )
  select
    (select match_count from counted),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'rank', p.global_rank,
            'username', p.username,
            'displayName', p.display_name,
            'avatarUrl', p.avatar_url,
            'selectedTitleId', p.selected_title_id,
            'selectedTitle', p.selected_title_name,
            'frame', case
              when p.frame_id is not null then jsonb_build_object(
                'id', p.frame_id,
                'cssPreset', p.frame_css_preset,
                'effect', p.frame_effect,
                'overlayImageUrl', p.frame_overlay_image_url
              )
              else null
            end,
            'collectorXp', p.collector_xp,
            'memberSince', p.created_at,
            'showCollectionStats', p.show_collection_stats,
            'uniqueCards', p.unique_cards,
            'totalCopies', p.total_copies,
            'catalogTotal', catalog_total,
            'completionPercent',
              case
                when p.show_collection_stats and catalog_total > 0 and p.unique_cards is not null then
                  round((p.unique_cards::numeric / catalog_total::numeric) * 100)
                when p.show_collection_stats then 0
                else null
              end
          )
          order by p.global_rank, lower(coalesce(p.display_name, p.username))
        )
        from page p
      ),
      '[]'::jsonb
    )
  into total_matches, results;

  return jsonb_build_object(
    'total', coalesce(total_matches, 0),
    'limit', lim,
    'offset', off,
    'catalogTotal', catalog_total,
    'results', coalesce(results, '[]'::jsonb)
  );
end;
$function$;

revoke all on function public.sync_my_level_avatar_frames() from public;
grant execute on function public.sync_my_level_avatar_frames() to authenticated, service_role;

comment on function public.sync_my_level_avatar_frames() is
  'Grants CSS prestige avatar frames when collector XP crosses level thresholds.';

comment on table public.collector_avatar_frames is
  'Catalog of profile avatar frames. css_preset drives ring CSS; overlay_image_url optional transparent PNG/SVG ring art.';
