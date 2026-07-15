-- V88.3 Home, News & Updates
create table if not exists public.starlight_news_posts (
 id uuid primary key default gen_random_uuid(), title text not null, summary text, body text, image_url text,
 published_at timestamptz not null default now(), is_published boolean not null default true, is_pinned boolean not null default false,
 created_by uuid references auth.users(id) on delete set null, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists starlight_news_public_idx on public.starlight_news_posts(is_published,published_at desc);
alter table public.starlight_news_posts enable row level security;
drop policy if exists "Public can read published Starlight news" on public.starlight_news_posts;
create policy "Public can read published Starlight news" on public.starlight_news_posts for select to public using (is_published=true and published_at<=now());

create or replace function public.get_published_news_posts(requested_limit integer default 30) returns jsonb language sql stable security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'summary',n.summary,'body',n.body,'imageUrl',n.image_url,'publishedAt',n.published_at,'isPinned',n.is_pinned) order by n.is_pinned desc,n.published_at desc),'[]'::jsonb)
 from (select * from public.starlight_news_posts where is_published=true and published_at<=now() order by is_pinned desc,published_at desc limit greatest(1,least(coalesce(requested_limit,30),100))) n;
$$;

create or replace function public.admin_list_news_posts() returns jsonb language plpgsql security definer set search_path=public as $$
declare r text; result jsonb; begin select role::text into r from public.site_roles where user_id=auth.uid(); if coalesce(r,'') not in ('owner','admin','administrator') then raise exception 'Administrator access is required.'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'summary',n.summary,'body',n.body,'imageUrl',n.image_url,'publishedAt',n.published_at,'isPublished',n.is_published,'isPinned',n.is_pinned,'createdAt',n.created_at,'updatedAt',n.updated_at) order by n.is_pinned desc,n.published_at desc),'[]'::jsonb) into result from public.starlight_news_posts n; return result; end $$;

create or replace function public.admin_save_news_post(requested_post jsonb) returns jsonb language plpgsql security definer set search_path=public as $$
declare r text; target uuid; begin select role::text into r from public.site_roles where user_id=auth.uid(); if coalesce(r,'') not in ('owner','admin','administrator') then raise exception 'Administrator access is required.'; end if; if trim(coalesce(requested_post->>'title',''))='' then raise exception 'A title is required.'; end if; target=nullif(requested_post->>'id','')::uuid;
 if target is null then insert into public.starlight_news_posts(title,summary,body,image_url,published_at,is_published,is_pinned,created_by) values(trim(requested_post->>'title'),nullif(trim(requested_post->>'summary'),''),nullif(trim(requested_post->>'body'),''),nullif(trim(requested_post->>'imageUrl'),''),coalesce(nullif(requested_post->>'publishedAt','')::timestamptz,now()),coalesce((requested_post->>'isPublished')::boolean,true),coalesce((requested_post->>'isPinned')::boolean,false),auth.uid()) returning id into target;
 else update public.starlight_news_posts set title=trim(requested_post->>'title'),summary=nullif(trim(requested_post->>'summary'),''),body=nullif(trim(requested_post->>'body'),''),image_url=nullif(trim(requested_post->>'imageUrl'),''),published_at=coalesce(nullif(requested_post->>'publishedAt','')::timestamptz,published_at),is_published=coalesce((requested_post->>'isPublished')::boolean,is_published),is_pinned=coalesce((requested_post->>'isPinned')::boolean,is_pinned),updated_at=now() where id=target; end if; return jsonb_build_object('success',true,'id',target); end $$;

create or replace function public.admin_delete_news_post(requested_id uuid) returns jsonb language plpgsql security definer set search_path=public as $$
declare r text; begin select role::text into r from public.site_roles where user_id=auth.uid(); if coalesce(r,'') not in ('owner','admin','administrator') then raise exception 'Administrator access is required.'; end if; delete from public.starlight_news_posts where id=requested_id; return jsonb_build_object('success',true); end $$;

revoke all on function public.get_published_news_posts(integer) from public; grant execute on function public.get_published_news_posts(integer) to anon,authenticated;
revoke all on function public.admin_list_news_posts() from public; grant execute on function public.admin_list_news_posts() to authenticated;
revoke all on function public.admin_save_news_post(jsonb) from public; grant execute on function public.admin_save_news_post(jsonb) to authenticated;
revoke all on function public.admin_delete_news_post(uuid) from public; grant execute on function public.admin_delete_news_post(uuid) to authenticated;
