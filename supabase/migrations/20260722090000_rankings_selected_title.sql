-- Add selected title names to public collector rankings.

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
      t.name as selected_title_name,
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

revoke all on function public.list_public_collector_rankings(text, integer, integer) from public;
grant execute on function public.list_public_collector_rankings(text, integer, integer) to anon, authenticated, service_role;

comment on function public.list_public_collector_rankings(text, integer, integer) is
  'Browse and search public collector profiles ranked by collector XP / level. Includes selected title. Collection stats respect show_collection_stats.';
