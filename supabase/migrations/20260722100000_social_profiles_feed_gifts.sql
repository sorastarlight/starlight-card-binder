-- V2 social foundation: profile highlights, follows, pull feed, card comments, peer gifts.

-- ---------------------------------------------------------------------------
-- Profile showcase fields
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists favorite_series_id text,
  add column if not exists favorite_character text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_favorite_series_id_fkey'
  ) then
    alter table public.profiles
      add constraint profiles_favorite_series_id_fkey
      foreign key (favorite_series_id) references public.card_series(id) on delete set null;
  end if;
end $$;

alter table public.profiles
  drop constraint if exists profiles_favorite_character_length_check;

alter table public.profiles
  add constraint profiles_favorite_character_length_check
  check (favorite_character is null or char_length(favorite_character) between 1 and 64);

-- Allow peer gift ledger entries
alter table public.star_bits_transactions
  drop constraint if exists star_bits_transactions_transaction_type_check;

alter table public.star_bits_transactions
  add constraint star_bits_transactions_transaction_type_check
  check (transaction_type = any (array[
    'duplicate_conversion'::text,
    'admin_grant'::text,
    'reward'::text,
    'purchase'::text,
    'adjustment'::text,
    'peer_gift'::text
  ]));

-- ---------------------------------------------------------------------------
-- Follows
-- ---------------------------------------------------------------------------
create table if not exists public.user_follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint user_follows_no_self check (follower_id <> following_id)
);

create index if not exists user_follows_following_idx on public.user_follows (following_id, created_at desc);
create index if not exists user_follows_follower_idx on public.user_follows (follower_id, created_at desc);

alter table public.user_follows enable row level security;

drop policy if exists user_follows_select_authenticated on public.user_follows;
create policy user_follows_select_authenticated
  on public.user_follows for select to authenticated
  using (true);

drop policy if exists user_follows_insert_own on public.user_follows;
create policy user_follows_insert_own
  on public.user_follows for insert to authenticated
  with check (follower_id = auth.uid());

drop policy if exists user_follows_delete_own on public.user_follows;
create policy user_follows_delete_own
  on public.user_follows for delete to authenticated
  using (follower_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Activity / Pull Feed
-- ---------------------------------------------------------------------------
create table if not exists public.collector_activity (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete cascade,
  activity_type text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint collector_activity_type_check check (
    activity_type = any (array[
      'pull'::text,
      'trade'::text,
      'series_complete'::text,
      'redeem'::text,
      'gift_sent'::text,
      'gift_received'::text,
      'follow'::text
    ])
  )
);

create index if not exists collector_activity_created_idx
  on public.collector_activity (created_at desc, id desc);

create index if not exists collector_activity_actor_created_idx
  on public.collector_activity (actor_id, created_at desc);

alter table public.collector_activity enable row level security;

drop policy if exists collector_activity_select_authenticated on public.collector_activity;
create policy collector_activity_select_authenticated
  on public.collector_activity for select to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Card comments
-- ---------------------------------------------------------------------------
create table if not exists public.card_comments (
  id bigint generated always as identity primary key,
  card_id text not null references public.cards(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_deleted boolean not null default false,
  constraint card_comments_body_length check (char_length(trim(body)) between 1 and 280)
);

create index if not exists card_comments_card_created_idx
  on public.card_comments (card_id, created_at desc)
  where is_deleted = false;

alter table public.card_comments enable row level security;

drop policy if exists card_comments_select_public on public.card_comments;
create policy card_comments_select_public
  on public.card_comments for select to authenticated
  using (is_deleted = false);

drop policy if exists card_comments_insert_own on public.card_comments;
create policy card_comments_insert_own
  on public.card_comments for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists card_comments_update_own on public.card_comments;
create policy card_comments_update_own
  on public.card_comments for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.rarity_rank(requested_rarity text)
returns integer
language sql
immutable
as $$
  select case requested_rarity
    when 'Legendary' then 5
    when 'Epic' then 4
    when 'Rare' then 3
    when 'Uncommon' then 2
    when 'Common' then 1
    else 0
  end;
$$;

create or replace function public.record_collector_activity(
  requested_actor_id uuid,
  requested_type text,
  requested_summary text,
  requested_payload jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  new_id bigint;
begin
  if requested_actor_id is null then
    return null;
  end if;
  if nullif(trim(requested_summary), '') is null then
    return null;
  end if;

  insert into public.collector_activity(actor_id, activity_type, summary, payload)
  values (
    requested_actor_id,
    requested_type,
    left(trim(requested_summary), 240),
    coalesce(requested_payload, '{}'::jsonb)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.compute_pull_streak_days(requested_user_id uuid)
returns integer
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  streak integer := 0;
  cursor_date date;
  expected date;
begin
  select max(claim_date) into cursor_date
  from public.daily_booster_claims
  where user_id = requested_user_id;

  if cursor_date is null then
    return 0;
  end if;

  -- Streak must include today or yesterday (America/New_York calendar).
  expected := timezone('America/New_York', now())::date;
  if cursor_date < expected - 1 then
    return 0;
  end if;

  while exists (
    select 1 from public.daily_booster_claims
    where user_id = requested_user_id and claim_date = cursor_date
  ) loop
    streak := streak + 1;
    cursor_date := cursor_date - 1;
  end loop;

  return streak;
end;
$$;

create or replace function public.activity_highlight_from_cards(cards_json jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  best jsonb := null;
  entry jsonb;
  card_row public.cards%rowtype;
  card_id text;
begin
  if cards_json is null or jsonb_typeof(cards_json) <> 'array' then
    return null;
  end if;

  for entry in select value from jsonb_array_elements(cards_json) loop
    card_id := coalesce(entry->>'id', entry->>'cardId', entry->>'card_id');
    if card_id is null then
      continue;
    end if;
    select * into card_row from public.cards where id = card_id limit 1;
    if not found then
      continue;
    end if;
    if best is null
       or public.rarity_rank(card_row.rarity) > public.rarity_rank(best->>'rarity') then
      best := jsonb_build_object(
        'id', card_row.id,
        'name', card_row.name,
        'rarity', card_row.rarity,
        'imageUrl', card_row.image_url,
        'thumbnailUrl', card_row.thumbnail_url
      );
    end if;
  end loop;

  return best;
end;
$$;

create or replace function public.trg_record_pull_activity_from_daily()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  highlight jsonb;
  actor_name text;
  summary text;
begin
  highlight := public.activity_highlight_from_cards(new.cards_awarded);
  select coalesce(nullif(trim(display_name), ''), username, 'Collector')
    into actor_name
  from public.profiles where id = new.user_id;

  if highlight is not null then
    summary := actor_name || ' pulled ⭐ ' || (highlight->>'rarity') || ' ' || (highlight->>'name');
  else
    summary := actor_name || ' opened a Daily Booster';
  end if;

  perform public.record_collector_activity(
    new.user_id,
    'pull',
    summary,
    jsonb_build_object('source', 'daily', 'highlight', highlight, 'cards', new.cards_awarded)
  );
  return new;
end;
$$;

drop trigger if exists trg_daily_booster_claims_activity on public.daily_booster_claims;
create trigger trg_daily_booster_claims_activity
  after insert on public.daily_booster_claims
  for each row execute function public.trg_record_pull_activity_from_daily();

create or replace function public.trg_record_pull_activity_from_shop()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  highlight jsonb;
  actor_name text;
  summary text;
begin
  if new.cards_awarded is null or new.cards_awarded = '[]'::jsonb then
    return new;
  end if;
  -- WHEN cannot reference TG_OP; skip no-op updates here.
  if tg_op = 'UPDATE' and old.cards_awarded is not distinct from new.cards_awarded then
    return new;
  end if;

  highlight := public.activity_highlight_from_cards(new.cards_awarded);
  select coalesce(nullif(trim(display_name), ''), username, 'Collector')
    into actor_name
  from public.profiles where id = new.user_id;

  if highlight is not null then
    summary := actor_name || ' pulled ⭐ ' || (highlight->>'rarity') || ' ' || (highlight->>'name');
  else
    summary := actor_name || ' opened a Shop pack';
  end if;

  perform public.record_collector_activity(
    new.user_id,
    'pull',
    summary,
    jsonb_build_object('source', 'shop', 'boosterId', new.booster_id, 'highlight', highlight, 'cards', new.cards_awarded)
  );
  return new;
end;
$$;

drop trigger if exists trg_shop_purchases_activity on public.star_bits_booster_purchases;
create trigger trg_shop_purchases_activity
  after insert or update of cards_awarded on public.star_bits_booster_purchases
  for each row
  when (new.cards_awarded is not null and new.cards_awarded <> '[]'::jsonb)
  execute function public.trg_record_pull_activity_from_shop();

-- ---------------------------------------------------------------------------
-- Profile showcase settings + social profile payload
-- ---------------------------------------------------------------------------
create or replace function public.set_profile_showcase_v1(
  requested_favorite_card_id text default null,
  requested_favorite_series_id text default null,
  requested_favorite_character text default null,
  clear_favorite_card boolean default false,
  clear_favorite_series boolean default false,
  clear_favorite_character boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  next_card text;
  next_series text;
  next_character text;
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  select favorite_card_id, favorite_series_id, favorite_character
    into next_card, next_series, next_character
  from public.profiles
  where id = uid;

  if clear_favorite_card then
    next_card := null;
  elsif requested_favorite_card_id is not null then
    if not exists (
      select 1 from public.user_cards
      where user_id = uid and card_id = requested_favorite_card_id
    ) then
      raise exception 'You do not own that card.';
    end if;
    next_card := requested_favorite_card_id;
  end if;

  if clear_favorite_series then
    next_series := null;
  elsif requested_favorite_series_id is not null then
    if not exists (select 1 from public.card_series where id = requested_favorite_series_id) then
      raise exception 'That series does not exist.';
    end if;
    next_series := requested_favorite_series_id;
  end if;

  if clear_favorite_character then
    next_character := null;
  elsif requested_favorite_character is not null then
    next_character := left(trim(requested_favorite_character), 64);
    if next_character = '' then
      next_character := null;
    end if;
  end if;

  update public.profiles
  set
    favorite_card_id = next_card,
    favorite_series_id = next_series,
    favorite_character = next_character,
    updated_at = now()
  where id = uid;

  return jsonb_build_object(
    'success', true,
    'favoriteCardId', next_card,
    'favoriteSeriesId', next_series,
    'favoriteCharacter', next_character
  );
end;
$$;

create or replace function public.get_public_collector_social_v1(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  target public.profiles%rowtype;
  normalized text := lower(trim(requested_username));
  viewer uuid := auth.uid();
  favorite_series jsonb := null;
  most_rare jsonb := null;
  newest jsonb := null;
  streak integer := 0;
  follower_count integer := 0;
  following_count integer := 0;
  is_following boolean := false;
  is_self boolean := false;
begin
  if normalized is null or normalized = '' then
    raise exception 'A collector username is required.';
  end if;

  select * into target
  from public.profiles
  where lower(username) = normalized and onboarding_complete = true
  limit 1;

  if not found then
    return jsonb_build_object('found', false);
  end if;

  if target.profile_visibility = 'private' and target.id is distinct from viewer then
    return jsonb_build_object('found', true, 'private', true, 'username', target.username);
  end if;

  is_self := viewer is not null and viewer = target.id;

  if target.favorite_series_id is not null then
    select jsonb_build_object('id', s.id, 'name', s.name, 'boosterImageUrl', s.booster_image_url)
      into favorite_series
    from public.card_series s
    where s.id = target.favorite_series_id;
  end if;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesName', cs.name,
    'obtainedAt', uc.first_obtained_at
  )
  into most_rare
  from public.user_cards uc
  join public.cards c on c.id = uc.card_id
  left join public.card_series cs on cs.id = c.series_id
  where uc.user_id = target.id
    and c.is_visible = true
  order by public.rarity_rank(c.rarity) desc, uc.first_obtained_at desc nulls last, c.name
  limit 1;

  select jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'rarity', c.rarity,
    'imageUrl', c.image_url,
    'thumbnailUrl', c.thumbnail_url,
    'seriesName', cs.name,
    'obtainedAt', coalesce(uc.last_obtained_at, uc.first_obtained_at)
  )
  into newest
  from public.user_cards uc
  join public.cards c on c.id = uc.card_id
  left join public.card_series cs on cs.id = c.series_id
  where uc.user_id = target.id
    and c.is_visible = true
  order by coalesce(uc.last_obtained_at, uc.first_obtained_at) desc nulls last, c.name
  limit 1;

  streak := public.compute_pull_streak_days(target.id);

  select count(*) into follower_count from public.user_follows where following_id = target.id;
  select count(*) into following_count from public.user_follows where follower_id = target.id;

  if viewer is not null and not is_self then
    select exists (
      select 1 from public.user_follows
      where follower_id = viewer and following_id = target.id
    ) into is_following;
  end if;

  return jsonb_build_object(
    'found', true,
    'private', false,
    'isSelf', is_self,
    'profile', jsonb_build_object(
      'username', target.username,
      'displayName', target.display_name,
      'memberSince', target.created_at,
      'favoriteCardId', target.favorite_card_id,
      'favoriteSeriesId', target.favorite_series_id,
      'favoriteCharacter', target.favorite_character,
      'showFeaturedCards', target.show_featured_cards,
      'showCollectionStats', target.show_collection_stats
    ),
    'favoriteSeries', favorite_series,
    'favoriteCharacter', target.favorite_character,
    'mostRarePull', most_rare,
    'newestPull', newest,
    'pullStreakDays', streak,
    'follow', jsonb_build_object(
      'following', is_following,
      'followerCount', follower_count,
      'followingCount', following_count
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Follow RPCs
-- ---------------------------------------------------------------------------
create or replace function public.follow_collector_v1(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  target_id uuid;
  target_username text;
  actor_name text;
begin
  if uid is null then raise exception 'You must be signed in to follow collectors.'; end if;

  select id, username into target_id, target_username
  from public.profiles
  where lower(username) = lower(trim(requested_username))
    and onboarding_complete = true
  limit 1;

  if target_id is null then raise exception 'Collector not found.'; end if;
  if target_id = uid then raise exception 'You cannot follow yourself.'; end if;

  insert into public.user_follows(follower_id, following_id)
  values (uid, target_id)
  on conflict do nothing;

  select coalesce(nullif(trim(display_name), ''), username, 'Collector')
    into actor_name from public.profiles where id = uid;

  perform public.record_collector_activity(
    uid,
    'follow',
    actor_name || ' followed @' || target_username,
    jsonb_build_object('targetUsername', target_username, 'targetUserId', target_id)
  );

  return jsonb_build_object('success', true, 'following', true, 'username', target_username);
end;
$$;

create or replace function public.unfollow_collector_v1(requested_username text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  target_id uuid;
  target_username text;
begin
  if uid is null then raise exception 'You must be signed in.'; end if;

  select id, username into target_id, target_username
  from public.profiles
  where lower(username) = lower(trim(requested_username))
  limit 1;

  if target_id is null then raise exception 'Collector not found.'; end if;

  delete from public.user_follows
  where follower_id = uid and following_id = target_id;

  return jsonb_build_object('success', true, 'following', false, 'username', coalesce(target_username, lower(trim(requested_username))));
end;
$$;

-- ---------------------------------------------------------------------------
-- Pull feed
-- ---------------------------------------------------------------------------
create or replace function public.get_pull_feed_v1(
  requested_filter text default 'everyone',
  requested_limit integer default 40,
  requested_before_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  filter_mode text := lower(coalesce(nullif(trim(requested_filter), ''), 'everyone'));
  lim integer := greatest(1, least(coalesce(requested_limit, 40), 80));
  rows jsonb := '[]'::jsonb;
begin
  if filter_mode not in ('everyone', 'friends', 'you') then
    filter_mode := 'everyone';
  end if;

  if filter_mode in ('friends', 'you') and uid is null then
    raise exception 'Sign in to view that feed filter.';
  end if;

  with visible_actors as (
    select p.id, p.username, p.display_name, p.avatar_url, p.profile_visibility
    from public.profiles p
    where p.onboarding_complete = true
      and (
        p.profile_visibility = 'public'
        or p.id = uid
      )
  ),
  scoped as (
    select a.*
    from public.collector_activity a
    join visible_actors v on v.id = a.actor_id
    where (requested_before_id is null or a.id < requested_before_id)
      and (
        filter_mode = 'everyone'
        or (filter_mode = 'you' and a.actor_id = uid)
        or (
          filter_mode = 'friends'
          and exists (
            select 1 from public.user_follows f
            where f.follower_id = uid and f.following_id = a.actor_id
          )
        )
      )
    order by a.created_at desc, a.id desc
    limit lim
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'type', s.activity_type,
      'summary', s.summary,
      'payload', s.payload,
      'createdAt', s.created_at,
      'actor', jsonb_build_object(
        'id', v.id,
        'username', v.username,
        'displayName', v.display_name,
        'avatarUrl', v.avatar_url
      )
    )
    order by s.created_at desc, s.id desc
  ), '[]'::jsonb)
  into rows
  from scoped s
  join visible_actors v on v.id = s.actor_id;

  return jsonb_build_object(
    'success', true,
    'filter', filter_mode,
    'items', rows
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Card comments
-- ---------------------------------------------------------------------------
create or replace function public.get_card_comments_v1(
  requested_card_id text,
  requested_limit integer default 40,
  requested_before_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  lim integer := greatest(1, least(coalesce(requested_limit, 40), 80));
  rows jsonb;
begin
  if nullif(trim(requested_card_id), '') is null then
    raise exception 'A card id is required.';
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'body', c.body,
      'createdAt', c.created_at,
      'isOwn', c.user_id = auth.uid(),
      'author', jsonb_build_object(
        'username', p.username,
        'displayName', p.display_name,
        'avatarUrl', p.avatar_url
      )
    )
    order by c.created_at desc, c.id desc
  ), '[]'::jsonb)
  into rows
  from (
    select *
    from public.card_comments
    where card_id = requested_card_id
      and is_deleted = false
      and (requested_before_id is null or id < requested_before_id)
    order by created_at desc, id desc
    limit lim
  ) c
  join public.profiles p on p.id = c.user_id;

  return jsonb_build_object('success', true, 'cardId', requested_card_id, 'comments', rows);
end;
$$;

create or replace function public.post_card_comment_v1(
  requested_card_id text,
  requested_body text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  cleaned text := trim(requested_body);
  saved public.card_comments%rowtype;
  author public.profiles%rowtype;
begin
  if uid is null then raise exception 'You must be signed in to comment.'; end if;
  if nullif(trim(requested_card_id), '') is null then raise exception 'A card id is required.'; end if;
  if cleaned is null or cleaned = '' or char_length(cleaned) > 280 then
    raise exception 'Comments must be 1–280 characters.';
  end if;
  if not exists (select 1 from public.cards where id = requested_card_id and is_visible = true) then
    raise exception 'That card was not found.';
  end if;

  insert into public.card_comments(card_id, user_id, body)
  values (requested_card_id, uid, cleaned)
  returning * into saved;

  select * into author from public.profiles where id = uid;

  return jsonb_build_object(
    'success', true,
    'comment', jsonb_build_object(
      'id', saved.id,
      'body', saved.body,
      'createdAt', saved.created_at,
      'isOwn', true,
      'author', jsonb_build_object(
        'username', author.username,
        'displayName', author.display_name,
        'avatarUrl', author.avatar_url
      )
    )
  );
end;
$$;

create or replace function public.delete_card_comment_v1(requested_comment_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'You must be signed in.'; end if;

  update public.card_comments
  set is_deleted = true, updated_at = now()
  where id = requested_comment_id
    and user_id = uid
    and is_deleted = false;

  if not found then
    raise exception 'Comment not found.';
  end if;

  return jsonb_build_object('success', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Peer gifts (Star Bits or duplicate cards via Received Rewards mailbox)
-- ---------------------------------------------------------------------------
create or replace function public.send_peer_gift_v1(
  requested_username text,
  requested_gift_type text,
  requested_amount integer default null,
  requested_card_id text default null,
  requested_message text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  uid uuid := auth.uid();
  target public.profiles%rowtype;
  gift_type text := lower(trim(requested_gift_type));
  note text := nullif(left(trim(coalesce(requested_message, '')), 160), '');
  amount integer := coalesce(requested_amount, 0);
  available integer := 0;
  balance bigint := 0;
  queued jsonb;
  actor_name text;
  title text;
  body text;
  payload jsonb;
  reward_type text;
begin
  if uid is null then raise exception 'You must be signed in to send a gift.'; end if;

  select * into target
  from public.profiles
  where lower(username) = lower(trim(requested_username))
    and onboarding_complete = true
  limit 1;

  if not found then raise exception 'Collector not found.'; end if;
  if target.id = uid then raise exception 'You cannot gift yourself.'; end if;
  if target.profile_visibility = 'private' then raise exception 'That collector profile is private.'; end if;

  select coalesce(nullif(trim(display_name), ''), username, 'Collector')
    into actor_name from public.profiles where id = uid;

  insert into public.user_wallets(user_id) values (uid) on conflict (user_id) do nothing;
  insert into public.user_wallets(user_id) values (target.id) on conflict (user_id) do nothing;

  if gift_type = 'star_bits' then
    if amount < 1 or amount > 50000 then
      raise exception 'Star Bits gifts must be between 1 and 50,000.';
    end if;

    select star_bits into balance from public.user_wallets where user_id = uid for update;
    if coalesce(balance, 0) < amount then
      raise exception 'You do not have enough Star Bits.';
    end if;

    update public.user_wallets
    set star_bits = star_bits - amount,
        lifetime_star_bits_spent = lifetime_star_bits_spent + amount,
        updated_at = now()
    where user_id = uid;

    insert into public.star_bits_transactions(user_id, transaction_type, star_bits_change, description, metadata)
    values (
      uid,
      'peer_gift',
      -amount,
      'Gifted Star Bits to @' || target.username,
      jsonb_build_object('recipientId', target.id, 'recipientUsername', target.username)
    );

    reward_type := 'star_bits';
    payload := jsonb_build_object('amount', amount);
    title := 'Star Bits gift from ' || actor_name;
    body := coalesce(note, actor_name || ' sent you ' || amount || ' Star Bits.');

  elsif gift_type = 'card' then
    if nullif(trim(requested_card_id), '') is null then
      raise exception 'Pick a card to gift.';
    end if;

    select greatest(quantity - 1, 0) into available
    from public.user_cards
    where user_id = uid and card_id = requested_card_id
    for update;

    if coalesce(available, 0) < 1 then
      raise exception 'You need a duplicate copy to gift that card.';
    end if;

    update public.user_cards
    set quantity = quantity - 1, updated_at = now()
    where user_id = uid and card_id = requested_card_id;

    reward_type := 'single_card';
    payload := jsonb_build_object('cardId', requested_card_id, 'quantity', 1);
    title := 'Card gift from ' || actor_name;
    body := coalesce(note, actor_name || ' sent you a card gift.');

  else
    raise exception 'Gift type must be star_bits or card.';
  end if;

  queued := public.queue_received_reward_v892(
    target.id,
    'gift',
    'peer:' || uid::text || ':' || extract(epoch from now())::bigint::text || ':' || gift_type,
    title,
    body,
    reward_type,
    payload,
    uid,
    jsonb_build_object(
      'fromUserId', uid,
      'fromUsername', (select username from public.profiles where id = uid),
      'note', note,
      'peerGift', true
    ),
    null
  );

  perform public.record_collector_activity(
    uid,
    'gift_sent',
    actor_name || ' sent a gift to @' || target.username,
    jsonb_build_object('giftType', gift_type, 'recipientUsername', target.username, 'amount', amount, 'cardId', requested_card_id)
  );

  return jsonb_build_object(
    'success', true,
    'queuedRewardId', queued->>'id',
    'giftType', gift_type,
    'recipientUsername', target.username
  );
end;
$$;

-- Grants
revoke all on function public.record_collector_activity(uuid, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.compute_pull_streak_days(uuid) from public, anon, authenticated;
revoke all on function public.activity_highlight_from_cards(jsonb) from public, anon, authenticated;
revoke all on function public.rarity_rank(text) from public, anon;

grant execute on function public.rarity_rank(text) to authenticated, service_role;
grant execute on function public.set_profile_showcase_v1(text, text, text, boolean, boolean, boolean) to authenticated, service_role;
grant execute on function public.get_public_collector_social_v1(text) to authenticated, service_role;
grant execute on function public.follow_collector_v1(text) to authenticated, service_role;
grant execute on function public.unfollow_collector_v1(text) to authenticated, service_role;
grant execute on function public.get_pull_feed_v1(text, integer, bigint) to authenticated, service_role;
grant execute on function public.get_card_comments_v1(text, integer, bigint) to authenticated, service_role;
grant execute on function public.post_card_comment_v1(text, text) to authenticated, service_role;
grant execute on function public.delete_card_comment_v1(bigint) to authenticated, service_role;
grant execute on function public.send_peer_gift_v1(text, text, integer, text, text) to authenticated, service_role;

revoke all on function public.set_profile_showcase_v1(text, text, text, boolean, boolean, boolean) from public, anon;
revoke all on function public.get_public_collector_social_v1(text) from public, anon;
revoke all on function public.follow_collector_v1(text) from public, anon;
revoke all on function public.unfollow_collector_v1(text) from public, anon;
revoke all on function public.get_pull_feed_v1(text, integer, bigint) from public, anon;
revoke all on function public.get_card_comments_v1(text, integer, bigint) from public, anon;
revoke all on function public.post_card_comment_v1(text, text) from public, anon;
revoke all on function public.delete_card_comment_v1(bigint) from public, anon;
revoke all on function public.send_peer_gift_v1(text, text, integer, text, text) from public, anon;
