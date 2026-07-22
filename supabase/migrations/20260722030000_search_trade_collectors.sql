-- Collector typeahead for trade offers: username, display name, or exact email.
-- Email is used only for matching and is never returned to the client.

create or replace function public.search_trade_collectors(
  requested_query text,
  requested_limit integer default 8
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'auth'
as $function$
declare
  uid uuid := auth.uid();
  q text := lower(trim(coalesce(requested_query, '')));
  lim integer := greatest(1, least(coalesce(requested_limit, 8), 12));
  out_json jsonb := '[]'::jsonb;
  looks_like_email boolean := false;
begin
  if uid is null then
    raise exception 'You must be signed in.';
  end if;

  if char_length(q) < 2 then
    return jsonb_build_object('query', q, 'results', '[]'::jsonb);
  end if;

  looks_like_email := position('@' in q) > 1;

  with candidates as (
    select
      p.id,
      p.username,
      p.display_name,
      p.avatar_url,
      p.profile_visibility,
      case
        when lower(p.username) = q then 0
        when lower(p.username) like q || '%' then 1
        when lower(coalesce(p.display_name, '')) = q then 2
        when lower(coalesce(p.display_name, '')) like q || '%' then 3
        when looks_like_email and exists (
          select 1
          from auth.users u
          where u.id = p.id
            and lower(coalesce(u.email, '')) = q
        ) then 4
        when lower(p.username) like '%' || q || '%' then 5
        when lower(coalesce(p.display_name, '')) like '%' || q || '%' then 6
        else 9
      end as rank_score
    from public.profiles p
    where p.onboarding_complete = true
      and p.id is distinct from uid
      and (
        lower(p.username) like '%' || q || '%'
        or lower(coalesce(p.display_name, '')) like '%' || q || '%'
        or (
          looks_like_email
          and exists (
            select 1
            from auth.users u
            where u.id = p.id
              and lower(coalesce(u.email, '')) = q
          )
        )
      )
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', c.id,
        'username', c.username,
        'displayName', c.display_name,
        'avatarUrl', c.avatar_url,
        'profileVisibility', c.profile_visibility,
        'matchedByEmail', (c.rank_score = 4)
      )
      order by c.rank_score, lower(c.username)
    ),
    '[]'::jsonb
  )
  into out_json
  from (
    select *
    from candidates
    where rank_score < 9
    order by rank_score, lower(username)
    limit lim
  ) c;

  return jsonb_build_object('query', q, 'results', out_json);
end;
$function$;

revoke all on function public.search_trade_collectors(text, integer) from public, anon;
grant execute on function public.search_trade_collectors(text, integer) to authenticated, service_role;

comment on function public.search_trade_collectors(text, integer) is
  'Signed-in collector typeahead for trade offers. Matches username/display name substrings and exact email; never returns email.';
