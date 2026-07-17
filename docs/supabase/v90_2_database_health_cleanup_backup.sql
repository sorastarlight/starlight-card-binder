-- ============================================================
-- STARLIGHT CARD BINDER V90.2
-- Database Health, Cleanup & Backup
-- Safe to rerun after V90.1.5.
-- ============================================================

create or replace function public.admin_get_database_health_v902()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  report jsonb;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  select jsonb_build_object(
    'generatedAt', now(),
    'summary', jsonb_build_object(
      'cards', (select count(*) from public.cards),
      'publishedCards', (select count(*) from public.cards where publish_status='published'),
      'series', (select count(*) from public.card_series),
      'activeBoosters', (select count(*) from public.booster_types where is_active and not archived),
      'categories', (select count(*) from public.card_categories where is_active)
    ),
    'checks', jsonb_build_array(
      jsonb_build_object(
        'id','missing_classification','title','Cards missing Database 2.0 classification','severity','error','repairable',true,
        'count',(select count(*) from public.cards where category_id is null or variant_id is null or finish_id is null or collector_number is null or trim(coalesce(collector_number,''))=''),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'seriesId',series_id,'cardNumber',card_number) order by series_id,sort_order,id) from public.cards where category_id is null or variant_id is null or finish_id is null or collector_number is null or trim(coalesce(collector_number,''))=''),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','missing_artwork','title','Cards missing artwork','severity','error','repairable',false,
        'count',(select count(*) from public.cards where nullif(trim(coalesce(image_url,'')),'') is null or nullif(trim(coalesce(thumbnail_url,'')),'') is null),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'seriesId',series_id,'missingFront',nullif(trim(coalesce(image_url,'')),'') is null,'missingThumbnail',nullif(trim(coalesce(thumbnail_url,'')),'') is null) order by series_id,sort_order,id) from public.cards where nullif(trim(coalesce(image_url,'')),'') is null or nullif(trim(coalesce(thumbnail_url,'')),'') is null),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','duplicate_collector_numbers','title','Duplicate collector numbers within a series','severity','error','repairable',false,
        'count',(select count(*) from (select series_id,collector_number from public.cards where nullif(trim(coalesce(collector_number,'')),'') is not null group by series_id,collector_number having count(*)>1) d),
        'items',coalesce((select jsonb_agg(jsonb_build_object('seriesId',series_id,'collectorNumber',collector_number,'count',cnt,'cardIds',card_ids) order by series_id,collector_number) from (select series_id,collector_number,count(*) cnt,jsonb_agg(id order by id) card_ids from public.cards where nullif(trim(coalesce(collector_number,'')),'') is not null group by series_id,collector_number having count(*)>1) d),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','bad_slot_totals','title','Booster slots not totaling 100%','severity','error','repairable',true,
        'count',(select count(*) from (select s.id from public.booster_slots s left join public.booster_slot_rates r on r.slot_id=s.id group by s.id having abs(coalesce(sum(r.percentage),0)-100)>.001) d),
        'items',coalesce((select jsonb_agg(jsonb_build_object('slotId',slot_id,'boosterId',booster_id,'slotName',slot_name,'total',total) order by booster_id,slot_id) from (select s.id slot_id,s.booster_id,s.name slot_name,coalesce(sum(r.percentage),0) total from public.booster_slots s left join public.booster_slot_rates r on r.slot_id=s.id group by s.id,s.booster_id,s.name having abs(coalesce(sum(r.percentage),0)-100)>.001) d),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','empty_active_boosters','title','Active boosters with no eligible cards','severity','error','repairable',false,
        'count',(select count(*) from public.booster_types b where b.is_active and not b.archived and not exists(select 1 from public.cards c where public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'rewardMode',b.reward_mode,'seriesId',b.series_id) order by b.sort_order,b.id) from public.booster_types b where b.is_active and not b.archived and not exists(select 1 from public.cards c where public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','pullable_unreachable','title','Pullable cards excluded from every active booster','severity','warning','repairable',false,
        'count',(select count(*) from public.cards c where c.is_pullable and c.is_collectible and c.is_visible and c.publish_status='published' and c.pull_weight>0 and not exists(select 1 from public.booster_types b where b.is_active and not b.archived and public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'seriesId',c.series_id,'rarity',c.rarity,'categoryId',c.category_id) order by c.series_id,c.sort_order,c.id) from public.cards c where c.is_pullable and c.is_collectible and c.is_visible and c.publish_status='published' and c.pull_weight>0 and not exists(select 1 from public.booster_types b where b.is_active and not b.archived and public.card_is_booster_eligible_v90(c,b) and (b.series_id is null or c.series_id=b.series_id))),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','archived_in_active_pools','title','Archived cards referenced by active booster pools','severity','warning','repairable',true,
        'count',(select count(*) from public.booster_reward_cards rc join public.cards c on c.id=rc.card_id join public.booster_types b on b.id=rc.booster_id where c.publish_status='archived' and b.is_active and not b.archived),
        'items',coalesce((select jsonb_agg(jsonb_build_object('boosterId',rc.booster_id,'cardId',c.id,'cardName',c.name) order by rc.booster_id,c.id) from public.booster_reward_cards rc join public.cards c on c.id=rc.card_id join public.booster_types b on b.id=rc.booster_id where c.publish_status='archived' and b.is_active and not b.archived),'[]'::jsonb)
      ),
      jsonb_build_object(
        'id','invalid_availability','title','Cards with invalid availability dates','severity','warning','repairable',false,
        'count',(select count(*) from public.cards where available_from is not null and available_until is not null and available_until<=available_from),
        'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'name',name,'availableFrom',available_from,'availableUntil',available_until) order by id) from public.cards where available_from is not null and available_until is not null and available_until<=available_from),'[]'::jsonb)
      )
    )
  ) into report;
  return report;
end;
$$;

revoke all on function public.admin_get_database_health_v902() from public, anon;
grant execute on function public.admin_get_database_health_v902() to authenticated;

create or replace function public.admin_repair_database_health_v902(requested_action text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare affected integer := 0;
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;

  case requested_action
    when 'missing_classification' then
      update public.cards set
        category_id=coalesce(category_id,'character'),
        variant_id=coalesce(variant_id,'standard-art'),
        finish_id=coalesce(finish_id,'standard'),
        collector_number=coalesce(nullif(trim(collector_number),''),card_number),
        updated_at=now()
      where category_id is null or variant_id is null or finish_id is null or collector_number is null or trim(coalesce(collector_number,''))='';
      get diagnostics affected = row_count;
    when 'bad_slot_totals' then
      with totals as (
        select slot_id,sum(percentage) total from public.booster_slot_rates group by slot_id having sum(percentage)>0 and abs(sum(percentage)-100)>.001
      )
      update public.booster_slot_rates r set percentage=round((r.percentage/t.total)*100,4)
      from totals t where r.slot_id=t.slot_id;
      get diagnostics affected = row_count;
    when 'archived_in_active_pools' then
      delete from public.booster_reward_cards rc using public.cards c, public.booster_types b
      where c.id=rc.card_id and b.id=rc.booster_id and c.publish_status='archived' and b.is_active and not b.archived;
      get diagnostics affected = row_count;
    else
      raise exception 'Unknown or unsafe repair action: %', requested_action;
  end case;

  return jsonb_build_object('success',true,'action',requested_action,'affected',affected);
end;
$$;

revoke all on function public.admin_repair_database_health_v902(text) from public, anon;
grant execute on function public.admin_repair_database_health_v902(text) to authenticated;

create or replace function public.admin_export_database_backup_v902()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_content_admin() then
    raise exception 'Administrator access is required.';
  end if;
  return jsonb_build_object(
    'format','starlight-database-backup-v90.2',
    'exportedAt',now(),
    'series',coalesce((select jsonb_agg(to_jsonb(s) order by s.sort_order,s.id) from public.card_series s),'[]'::jsonb),
    'categories',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order,x.id) from public.card_categories x),'[]'::jsonb),
    'subcategories',coalesce((select jsonb_agg(to_jsonb(x) order by x.category_id,x.sort_order,x.id) from public.card_subcategories x),'[]'::jsonb),
    'variants',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order,x.id) from public.card_variants x),'[]'::jsonb),
    'finishes',coalesce((select jsonb_agg(to_jsonb(x) order by x.sort_order,x.id) from public.card_finishes x),'[]'::jsonb),
    'tags',coalesce((select jsonb_agg(to_jsonb(x) order by x.id) from public.card_tags x),'[]'::jsonb),
    'tagAssignments',coalesce((select jsonb_agg(to_jsonb(x) order by x.card_id,x.tag_id) from public.card_tag_assignments x),'[]'::jsonb),
    'cards',coalesce((select jsonb_agg(to_jsonb(c) order by c.series_id,c.sort_order,c.id) from public.cards c),'[]'::jsonb),
    'boosters',coalesce((select jsonb_agg(to_jsonb(b) order by b.sort_order,b.id) from public.booster_types b),'[]'::jsonb),
    'boosterSlots',coalesce((select jsonb_agg(to_jsonb(s) order by s.booster_id,s.sort_order,s.id) from public.booster_slots s),'[]'::jsonb),
    'boosterSlotRates',coalesce((select jsonb_agg(to_jsonb(r) order by r.slot_id,r.rarity) from public.booster_slot_rates r),'[]'::jsonb),
    'boosterRewardCards',coalesce((select jsonb_agg(to_jsonb(r) order by r.booster_id,r.sort_order,r.card_id) from public.booster_reward_cards r),'[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_export_database_backup_v902() from public, anon;
grant execute on function public.admin_export_database_backup_v902() to authenticated;
