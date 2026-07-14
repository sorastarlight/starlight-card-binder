import { supabase } from './supabase-client.js';

export async function loadContentStudio(){
  const {data,error}=await supabase.rpc('admin_get_content_studio');
  if(error)throw error;
  return data||{series:[],cards:[],boosters:[],dailyMode:'daily'};
}
export async function saveSeries(payload){const {data,error}=await supabase.rpc('admin_save_series_v84',{payload});if(error)throw error;return data;}
export async function saveCard(payload){const {data,error}=await supabase.rpc('admin_save_card_v84',{payload});if(error)throw error;return data;}
export async function saveBooster(payload){const {data,error}=await supabase.rpc('admin_save_booster_v84',{payload});if(error)throw error;return data;}
export async function setDailyMode(mode){const {data,error}=await supabase.rpc('admin_set_daily_booster_mode',{requested_mode:mode});if(error)throw error;return data;}
function cleanName(name){return String(name||'image').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-');}
export async function uploadStudioAsset(file,folder){
  if(!(file instanceof File))throw new Error('Choose an image first.');
  if(!/^image\//.test(file.type))throw new Error('Only image files are supported.');
  if(file.size>5*1024*1024)throw new Error('Images must be 5 MB or smaller.');
  const ext=(file.name.split('.').pop()||'webp').toLowerCase();
  const base=cleanName(file.name.replace(/\.[^.]+$/,''));
  const path=`${folder}/${Date.now()}-${crypto.randomUUID()}-${base}.${ext}`;
  const {error}=await supabase.storage.from('site-assets').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
  if(error)throw error;
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
}
export async function listStudioAssets(){
  const folders=['booster-packs','card-backs','card-fronts','thumbnails','series'];
  const out=[];
  for(const folder of folders){
    const {data,error}=await supabase.storage.from('site-assets').list(folder,{limit:200,sortBy:{column:'created_at',order:'desc'}});
    if(error)continue;
    for(const item of data||[]){if(!item.id)continue;const path=`${folder}/${item.name}`;out.push({path,name:item.name,folder,url:supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl,createdAt:item.created_at});}
  }
  return out;
}
export async function deleteStudioAsset(path){const {error}=await supabase.storage.from('site-assets').remove([path]);if(error)throw error;}
export async function saveBoosterSlot(slotId,quantity,rates){const {data,error}=await supabase.rpc('admin_update_booster_slot',{requested_slot_id:Number(slotId),requested_quantity:Number(quantity),requested_rates:rates});if(error)throw error;return data;}
