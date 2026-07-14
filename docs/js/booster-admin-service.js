import { supabase } from './supabase-client.js';

export async function getBoosterConfiguration(){
  const {data,error}=await supabase.rpc('admin_get_booster_configuration');
  if(error)throw error;
  return data||{boosters:[],cards:[],series:[],dailyMode:'daily'};
}

export async function updateBooster(payload){
  const {data,error}=await supabase.rpc('admin_update_booster_v83',{
    requested_booster_id:payload.id,
    requested_name:payload.name,
    requested_description:payload.description,
    requested_star_bits_cost:Number(payload.starBitsCost)||0,
    requested_is_active:Boolean(payload.isActive),
    requested_pack_image_url:payload.packImageUrl||null,
    requested_card_back_url:payload.cardBackUrl||null
  });
  if(error)throw error;
  return data;
}

export async function createBooster(payload){
  const {data,error}=await supabase.rpc('admin_create_booster',{
    requested_id:payload.id,
    requested_name:payload.name,
    requested_clone_from:payload.cloneFrom||null
  });
  if(error)throw error;
  if(payload.packImageUrl||payload.cardBackUrl||payload.description||payload.starBitsCost!=null){
    await updateBooster({
      id:data.id||payload.id,
      name:payload.name,
      description:payload.description||'',
      starBitsCost:Number(payload.starBitsCost)||0,
      isActive:false,
      packImageUrl:payload.packImageUrl||null,
      cardBackUrl:payload.cardBackUrl||null
    });
  }
  return data;
}

export async function updateDailyMode(mode){
  const {data,error}=await supabase.rpc('admin_set_daily_booster_mode',{requested_mode:mode});
  if(error)throw error;
  return data;
}

export async function updateBoosterSlot(slotId,quantity,rates){
  const {data,error}=await supabase.rpc('admin_update_booster_slot',{
    requested_slot_id:Number(slotId),requested_quantity:Number(quantity),requested_rates:rates
  });
  if(error)throw error;
  return data;
}

export async function updateCardPullSettings(cardId,rarity,pullWeight,isPullable,imageUrl,thumbnailUrl){
  const {data,error}=await supabase.rpc('admin_update_card_pull_settings_v83',{
    requested_card_id:cardId,requested_rarity:rarity,requested_pull_weight:Number(pullWeight),
    requested_is_pullable:Boolean(isPullable),requested_image_url:imageUrl||null,requested_thumbnail_url:thumbnailUrl||null
  });
  if(error)throw error;
  return data;
}

export async function createSeries(payload){
  const {data,error}=await supabase.rpc('admin_create_card_series_v831',{
    requested_id:payload.id,requested_name:payload.name,requested_description:payload.description||null,
    requested_booster_image_url:payload.boosterImageUrl||null,requested_sort_order:Number(payload.sortOrder)||0,
    requested_is_visible:payload.isVisible!==false
  });
  if(error)throw error;
  return data;
}

export async function createCard(payload){
  const {data,error}=await supabase.rpc('admin_create_card_v831',{
    requested_id:payload.id,requested_series_id:payload.seriesId,requested_card_number:payload.cardNumber,
    requested_name:payload.name,requested_rarity:payload.rarity,requested_image_url:payload.imageUrl,
    requested_thumbnail_url:payload.thumbnailUrl||null,requested_description:payload.description||null,
    requested_artist:payload.artist||null,requested_sort_order:Number(payload.sortOrder)||0,
    requested_is_visible:payload.isVisible!==false,requested_is_collectible:payload.isCollectible!==false,
    requested_is_pullable:payload.isPullable!==false,requested_pull_weight:Number(payload.pullWeight)||0
  });
  if(error)throw error;
  return data;
}

function safeFileName(name){return String(name||'image').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-');}
export async function uploadAdminAsset(file,folder='uploads'){
  if(!(file instanceof File))throw new Error('Choose an image file first.');
  if(!file.type.startsWith('image/'))throw new Error('Only image files can be uploaded.');
  if(file.size>5*1024*1024)throw new Error('Image must be 5 MB or smaller.');
  const ext=(file.name.split('.').pop()||'webp').toLowerCase();
  const base=safeFileName(file.name.replace(/\.[^.]+$/,''));
  const path=`${folder}/${Date.now()}-${crypto.randomUUID()}-${base}.${ext}`;
  const {error}=await supabase.storage.from('site-assets').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(error)throw error;
  const {data}=supabase.storage.from('site-assets').getPublicUrl(path);
  return data.publicUrl;
}
