import { supabase } from './supabase-client.js';
import { notifyCardCatalogChanged, fetchFreshCardCatalog } from './card-catalog-service.js';

export async function loadContentStudio(){
  const {data,error}=await supabase.rpc('admin_get_content_studio');
  if(error)throw error;
  return data||{series:[],cards:[],boosters:[],dailyMode:'daily'};
}
export async function saveSeries(payload){const {data,error}=await supabase.rpc('admin_save_series_v84',{payload});if(error)throw error;notifyCardCatalogChanged('series-saved');return data;}
export async function saveCard(payload){const {data,error}=await supabase.rpc('admin_save_card_v90',{payload});if(error)throw error;notifyCardCatalogChanged('card-saved');return data;}
export async function saveBooster(payload){const {data,error}=await supabase.rpc('admin_save_booster_v90',{payload});if(error)throw error;return data;}
export async function cloneBooster(sourceId,newId,newName){const {data,error}=await supabase.rpc('admin_clone_booster_v897',{requested_source_id:sourceId,requested_new_id:newId,requested_new_name:newName});if(error)throw error;return data;}
export async function createBoosterFromTemplate(templateId,newId,newName){const {data,error}=await supabase.rpc('admin_create_booster_from_template_v897',{requested_template_id:templateId,requested_new_id:newId,requested_new_name:newName});if(error)throw error;return data;}
export async function deleteSeries(id){const {data,error}=await supabase.rpc('admin_delete_series_v841',{requested_id:id});if(error)throw error;notifyCardCatalogChanged('series-deleted');return data;}
export async function deleteCard(id){const {data,error}=await supabase.rpc('admin_delete_card_v841',{requested_id:id});if(error)throw error;notifyCardCatalogChanged('card-deleted');return data;}
export async function deleteBooster(id){const {data,error}=await supabase.rpc('admin_delete_booster_v841',{requested_id:id});if(error)throw error;return data;}
export async function setDailyMode(mode){const {data,error}=await supabase.rpc('admin_set_daily_booster_mode',{requested_mode:mode});if(error)throw error;return data;}
function cleanName(name){return String(name||'image').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/-+/g,'-');}
export function storagePathFromUrl(url){
  const value=String(url||'');
  const marker='/storage/v1/object/public/site-assets/';
  const index=value.indexOf(marker);
  return index>=0?decodeURIComponent(value.slice(index+marker.length)):'';
}
export async function uploadStudioAsset(file,folder,options={}){
  if(!(file instanceof File))throw new Error('Choose an image first.');
  if(!/^image\//.test(file.type))throw new Error('Only image files are supported.');
  if(file.size>5*1024*1024)throw new Error('Images must be 5 MB or smaller.');
  const ext=(file.name.split('.').pop()||'webp').toLowerCase();
  const base=cleanName(file.name.replace(/\.[^.]+$/,''));
  const path=options.path || `${folder}/${Date.now()}-${crypto.randomUUID()}-${base}.${ext}`;
  const {error}=await supabase.storage.from('site-assets').upload(path,file,{cacheControl:'31536000',upsert:options.upsert===true,contentType:file.type});
  if(error)throw error;
  const url=supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
  try{await supabase.rpc('admin_register_site_asset_v87',{asset_path:path,original_name:file.name,mime_type:file.type,file_size:file.size,public_url:url,asset_folder:folder});}catch(_){}
  return {url,path,name:file.name,size:file.size};
}

export async function uploadCardArtworkPair(file,baseFilename,{upsert=false}={}){
  if(!(file instanceof File))throw new Error('Choose a card image first.');
  const ext=(file.name.split('.').pop()||'png').toLowerCase();
  const stem=cleanName(String(baseFilename||'card').replace(/\.[^.]+$/,''));
  const filename=`${stem}.${ext}`;
  const frontPath=`card-fronts/${filename}`;
  const thumbPath=`thumbnails/${filename}`;
  const uploaded=[];
  try{
    const front=await uploadStudioAsset(file,'card-fronts',{path:frontPath,upsert});
    uploaded.push(frontPath);
    const thumb=await uploadStudioAsset(file,'thumbnails',{path:thumbPath,upsert});
    uploaded.push(thumbPath);
    return {frontUrl:front.url,thumbnailUrl:thumb.url,frontPath,thumbnailPath:thumbPath,filename};
  }catch(error){
    if(uploaded.length)await supabase.storage.from('site-assets').remove(uploaded).catch(()=>{});
    throw error;
  }
}
export async function listStudioAssets(){
  const folders=['booster-packs','card-backs','card-fronts','thumbnails','series','events','uploads'];
  const out=[];
  for(const folder of folders){
    const {data,error}=await supabase.storage.from('site-assets').list(folder,{limit:300,sortBy:{column:'created_at',order:'desc'}});
    if(error)continue;
    for(const item of data||[]){if(!item.id)continue;const path=`${folder}/${item.name}`;out.push({path,name:item.name,folder,url:supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl,createdAt:item.created_at});}
  }
  return out;
}
export async function deleteStudioAsset(path){if(!path)throw new Error('This is a bundled site asset and cannot be deleted from Supabase. Upload a replacement instead.');const {error}=await supabase.storage.from('site-assets').remove([path]);if(error)throw error;try{await supabase.rpc('admin_unregister_site_asset_v87',{asset_path:path});}catch(_){}}
export async function saveBoosterSlot(slotId,quantity,rates){const {data,error}=await supabase.rpc('admin_update_booster_slot',{requested_slot_id:Number(slotId),requested_quantity:Number(quantity),requested_rates:rates});if(error)throw error;return data;}

export async function refreshPublicCardCatalog(){notifyCardCatalogChanged('manual-refresh');return fetchFreshCardCatalog();}



export async function getSystemDiagnostics(){const {data,error}=await supabase.rpc('admin_get_system_diagnostics_v87');if(error)throw error;return data;}
export async function exportAssetManifest(){const {data,error}=await supabase.rpc('admin_get_asset_manifest_v87');if(error)throw error;return data||[];}

export { getAdminEvents, saveEvent, deleteEvent } from './event-service.js';
