-- Staff RPCs to list / grant / revoke collector titles and avatar frames per user.

create or replace function public.admin_list_user_unlockables(requested_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
begin
  select role into actor_role from public.site_roles where user_id = auth.uid();
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if requested_user_id is null then
    raise exception 'User id is required.';
  end if;

  if not exists (select 1 from auth.users where id = requested_user_id) then
    raise exception 'That user was not found.';
  end if;

  return jsonb_build_object(
    'userId', requested_user_id,
    'selectedTitleId', (
      select p.selected_title_id from public.profiles p where p.id = requested_user_id
    ),
    'selectedFrameId', (
      select p.selected_frame_id from public.profiles p where p.id = requested_user_id
    ),
    'ownedTitleIds', coalesce((
      select jsonb_agg(ut.title_id order by ut.title_id)
      from public.user_titles ut
      where ut.user_id = requested_user_id
    ), '[]'::jsonb),
    'ownedFrameIds', coalesce((
      select jsonb_agg(uf.frame_id order by uf.frame_id)
      from public.user_avatar_frames uf
      where uf.user_id = requested_user_id
    ), '[]'::jsonb),
    'titles', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'name', t.name,
          'description', t.description,
          'sortOrder', t.sort_order,
          'isActive', t.is_active,
          'owned', exists (
            select 1 from public.user_titles ut
            where ut.user_id = requested_user_id and ut.title_id = t.id
          )
        )
        order by t.sort_order, t.id
      )
      from public.collector_titles t
    ), '[]'::jsonb),
    'frames', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', f.id,
          'name', f.name,
          'description', f.description,
          'cssPreset', f.css_preset,
          'effect', f.effect,
          'sortOrder', f.sort_order,
          'isActive', f.is_active,
          'owned', exists (
            select 1 from public.user_avatar_frames uf
            where uf.user_id = requested_user_id and uf.frame_id = f.id
          )
        )
        order by f.sort_order, f.id
      )
      from public.collector_avatar_frames f
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_grant_user_unlockable(
  requested_user_id uuid,
  unlock_kind text,
  unlock_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  kind text := lower(trim(coalesce(unlock_kind, '')));
  item_id text := nullif(trim(coalesce(unlock_id, '')), '');
begin
  select role into actor_role from public.site_roles where user_id = actor_id;
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if requested_user_id is null then
    raise exception 'User id is required.';
  end if;

  if not exists (select 1 from auth.users where id = requested_user_id) then
    raise exception 'That user was not found.';
  end if;

  if item_id is null then
    raise exception 'Unlock id is required.';
  end if;

  if kind = 'title' then
    if not exists (select 1 from public.collector_titles where id = item_id) then
      raise exception 'That title was not found.';
    end if;
    insert into public.user_titles (user_id, title_id, unlocked_at)
    values (requested_user_id, item_id, now())
    on conflict do nothing;
  elsif kind = 'frame' then
    if not exists (select 1 from public.collector_avatar_frames where id = item_id) then
      raise exception 'That avatar frame was not found.';
    end if;
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (requested_user_id, item_id, now())
    on conflict do nothing;
  else
    raise exception 'Unlock kind must be title or frame.';
  end if;

  insert into public.staff_audit_log (
    actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
  ) values (
    actor_id,
    'user_unlockable_granted',
    requested_user_id,
    kind,
    item_id,
    jsonb_build_object('kind', kind, 'id', item_id, 'userId', requested_user_id)
  );

  return jsonb_build_object('success', true, 'kind', kind, 'id', item_id, 'userId', requested_user_id);
end;
$$;

create or replace function public.admin_revoke_user_unlockable(
  requested_user_id uuid,
  unlock_kind text,
  unlock_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  kind text := lower(trim(coalesce(unlock_kind, '')));
  item_id text := nullif(trim(coalesce(unlock_id, '')), '');
  cleared_selected boolean := false;
begin
  select role into actor_role from public.site_roles where user_id = actor_id;
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if requested_user_id is null then
    raise exception 'User id is required.';
  end if;

  if not exists (select 1 from auth.users where id = requested_user_id) then
    raise exception 'That user was not found.';
  end if;

  if item_id is null then
    raise exception 'Unlock id is required.';
  end if;

  if kind = 'title' then
    delete from public.user_titles
    where user_id = requested_user_id and title_id = item_id;

    update public.profiles
    set selected_title_id = null
    where id = requested_user_id
      and selected_title_id = item_id;
    cleared_selected := found;
  elsif kind = 'frame' then
    delete from public.user_avatar_frames
    where user_id = requested_user_id and frame_id = item_id;

    update public.profiles
    set selected_frame_id = null
    where id = requested_user_id
      and selected_frame_id = item_id;
    cleared_selected := found;
  else
    raise exception 'Unlock kind must be title or frame.';
  end if;

  insert into public.staff_audit_log (
    actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
  ) values (
    actor_id,
    'user_unlockable_revoked',
    requested_user_id,
    kind,
    item_id,
    jsonb_build_object(
      'kind', kind,
      'id', item_id,
      'userId', requested_user_id,
      'clearedSelected', cleared_selected
    )
  );

  return jsonb_build_object(
    'success', true,
    'kind', kind,
    'id', item_id,
    'userId', requested_user_id,
    'clearedSelected', cleared_selected
  );
end;
$$;

create or replace function public.admin_set_user_unlockables(
  requested_user_id uuid,
  requested_title_ids text[] default '{}'::text[],
  requested_frame_ids text[] default '{}'::text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  title_ids text[] := coalesce(requested_title_ids, '{}'::text[]);
  frame_ids text[] := coalesce(requested_frame_ids, '{}'::text[]);
  granted_titles text[] := '{}'::text[];
  revoked_titles text[] := '{}'::text[];
  granted_frames text[] := '{}'::text[];
  revoked_frames text[] := '{}'::text[];
  item_id text;
  cleared_title boolean := false;
  cleared_frame boolean := false;
begin
  select role into actor_role from public.site_roles where user_id = actor_id;
  if actor_role not in ('owner', 'admin') then
    raise exception 'Administrator access is required.';
  end if;

  if requested_user_id is null then
    raise exception 'User id is required.';
  end if;

  if not exists (select 1 from auth.users where id = requested_user_id) then
    raise exception 'That user was not found.';
  end if;

  -- Normalize empty strings out of arrays (empty SELECT yields NULL → '{}').
  title_ids := coalesce(array(
    select distinct nullif(trim(x), '')
    from unnest(title_ids) as x
    where nullif(trim(x), '') is not null
  ), '{}'::text[]);
  frame_ids := coalesce(array(
    select distinct nullif(trim(x), '')
    from unnest(frame_ids) as x
    where nullif(trim(x), '') is not null
  ), '{}'::text[]);

  if exists (
    select 1
    from unnest(title_ids) as tid
    where not exists (select 1 from public.collector_titles t where t.id = tid)
  ) then
    raise exception 'One or more titles were not found.';
  end if;

  if exists (
    select 1
    from unnest(frame_ids) as fid
    where not exists (select 1 from public.collector_avatar_frames f where f.id = fid)
  ) then
    raise exception 'One or more avatar frames were not found.';
  end if;

  for item_id in
    select t.id
    from unnest(title_ids) as t(id)
    where not exists (
      select 1 from public.user_titles ut
      where ut.user_id = requested_user_id and ut.title_id = t.id
    )
  loop
    insert into public.user_titles (user_id, title_id, unlocked_at)
    values (requested_user_id, item_id, now())
    on conflict do nothing;
    granted_titles := array_append(granted_titles, item_id);
  end loop;

  for item_id in
    select ut.title_id
    from public.user_titles ut
    where ut.user_id = requested_user_id
      and not (ut.title_id = any (title_ids))
  loop
    delete from public.user_titles
    where user_id = requested_user_id and title_id = item_id;
    revoked_titles := array_append(revoked_titles, item_id);
  end loop;

  for item_id in
    select f.id
    from unnest(frame_ids) as f(id)
    where not exists (
      select 1 from public.user_avatar_frames uf
      where uf.user_id = requested_user_id and uf.frame_id = f.id
    )
  loop
    insert into public.user_avatar_frames (user_id, frame_id, unlocked_at)
    values (requested_user_id, item_id, now())
    on conflict do nothing;
    granted_frames := array_append(granted_frames, item_id);
  end loop;

  for item_id in
    select uf.frame_id
    from public.user_avatar_frames uf
    where uf.user_id = requested_user_id
      and not (uf.frame_id = any (frame_ids))
  loop
    delete from public.user_avatar_frames
    where user_id = requested_user_id and frame_id = item_id;
    revoked_frames := array_append(revoked_frames, item_id);
  end loop;

  update public.profiles
  set selected_title_id = null
  where id = requested_user_id
    and selected_title_id is not null
    and not exists (
      select 1 from public.user_titles ut
      where ut.user_id = requested_user_id and ut.title_id = profiles.selected_title_id
    );
  cleared_title := found;

  update public.profiles
  set selected_frame_id = null
  where id = requested_user_id
    and selected_frame_id is not null
    and not exists (
      select 1 from public.user_avatar_frames uf
      where uf.user_id = requested_user_id and uf.frame_id = profiles.selected_frame_id
    );
  cleared_frame := found;

  insert into public.staff_audit_log (
    actor_user_id, action, target_user_id, target_resource_type, target_resource_id, details
  ) values (
    actor_id,
    'user_unlockables_set',
    requested_user_id,
    'user',
    requested_user_id::text,
    jsonb_build_object(
      'grantedTitles', to_jsonb(granted_titles),
      'revokedTitles', to_jsonb(revoked_titles),
      'grantedFrames', to_jsonb(granted_frames),
      'revokedFrames', to_jsonb(revoked_frames),
      'clearedSelectedTitle', cleared_title,
      'clearedSelectedFrame', cleared_frame
    )
  );

  return jsonb_build_object(
    'success', true,
    'userId', requested_user_id,
    'grantedTitles', to_jsonb(granted_titles),
    'revokedTitles', to_jsonb(revoked_titles),
    'grantedFrames', to_jsonb(granted_frames),
    'revokedFrames', to_jsonb(revoked_frames),
    'clearedSelectedTitle', cleared_title,
    'clearedSelectedFrame', cleared_frame
  );
end;
$$;

revoke all on function public.admin_list_user_unlockables(uuid) from public, anon;
revoke all on function public.admin_grant_user_unlockable(uuid, text, text) from public, anon;
revoke all on function public.admin_revoke_user_unlockable(uuid, text, text) from public, anon;
revoke all on function public.admin_set_user_unlockables(uuid, text[], text[]) from public, anon;

grant execute on function public.admin_list_user_unlockables(uuid) to authenticated;
grant execute on function public.admin_grant_user_unlockable(uuid, text, text) to authenticated;
grant execute on function public.admin_revoke_user_unlockable(uuid, text, text) to authenticated;
grant execute on function public.admin_set_user_unlockables(uuid, text[], text[]) to authenticated;
