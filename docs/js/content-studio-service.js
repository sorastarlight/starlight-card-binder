import { supabase } from './supabase-client.js';
import { notifyCardCatalogChanged, fetchFreshCardCatalog } from './card-catalog-service.js';

export async function loadContentStudio(){
  const {data,error}=await supabase.rpc('admin_get_content_studio');
  if(error)throw error;
  return data||{series:[],cards:[],boosters:[],dailyMode:'daily'};
}
export async function saveSeries(payload){const {data,error}=await supabase.rpc('admin_save_series_v84',{payload});if(error)throw error;notifyCardCatalogChanged('series-saved');return data;}
export async function saveCard(payload){const {data,error}=await supabase.rpc('admin_save_card_v84',{payload});if(error)throw error;notifyCardCatalogChanged('card-saved');return data;}
export async function saveBooster(payload){const {data,error}=await supabase.rpc('admin_save_booster_v84',{payload});if(error)throw error;return data;}
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
export async function listStudioAssets(){
  const folders=['booster-packs','card-backs','card-fronts','thumbnails','series','uploads'];
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


function isSupabaseManagedAsset(url){
  const value=String(url||'').trim();
  return value.includes('/storage/v1/object/public/site-assets/');
}
function isMigratableAsset(url){
  const value=String(url||'').trim();
  if(!value || isSupabaseManagedAsset(value) || /^(data:|blob:)/i.test(value))return false;
  return true;
}
function resolveMigrationSource(url){
  const value=String(url||'').trim();
  if(!/^https?:\/\//i.test(value))return new URL(value,window.location.href).href;
  const parsed=new URL(value);
  const legacyHosts=new Set([
    'starlightcardsbinder.pages.dev',
    'sorastarlightcards.netlify.app'
  ]);
  if(legacyHosts.has(parsed.hostname)){
    return new URL(parsed.pathname + parsed.search,window.location.origin).href;
  }
  return parsed.href;
}
function extensionFromUrl(url,fallback='png'){
  const clean=String(url||'').split('?')[0].split('#')[0];
  const ext=(clean.match(/\.([a-z0-9]{2,5})$/i)||[])[1];
  return (ext||fallback).toLowerCase();
}
async function fetchBundledAsset(url){
  const sourceUrl=resolveMigrationSource(url);
  const response=await fetch(sourceUrl,{cache:'no-store',mode:'cors'});
  if(!response.ok)throw new Error(`Could not read bundled asset: ${url}`);
  return response.blob();
}
async function migrateUrl(url,folder,key){
  if(!isMigratableAsset(url))return {url,changed:false};
  const blob=await fetchBundledAsset(url);
  const ext=extensionFromUrl(url,blob.type==='image/webp'?'webp':'png');
  const file=new File([blob],`${key}.${ext}`,{type:blob.type||`image/${ext==='jpg'?'jpeg':ext}`});
  const uploaded=await uploadStudioAsset(file,folder,{path:`${folder}/migrated-${cleanName(key)}.${ext}`,upsert:true});
  return {url:uploaded.url,changed:true,path:uploaded.path};
}
export async function analyzeBundledAssets(studio){
  const rows=[];
  for(const series of studio.series||[]){if(isMigratableAsset(series.boosterImageUrl))rows.push({type:'series',id:series.id,field:'boosterImageUrl',url:series.boosterImageUrl});}
  for(const card of studio.cards||[]){if(isMigratableAsset(card.imageUrl))rows.push({type:'card',id:card.id,field:'imageUrl',url:card.imageUrl});if(isMigratableAsset(card.thumbnailUrl))rows.push({type:'card',id:card.id,field:'thumbnailUrl',url:card.thumbnailUrl});}
  for(const booster of studio.boosters||[]){if(isMigratableAsset(booster.packImageUrl))rows.push({type:'booster',id:booster.id,field:'packImageUrl',url:booster.packImageUrl});if(isMigratableAsset(booster.cardBackUrl))rows.push({type:'booster',id:booster.id,field:'cardBackUrl',url:booster.cardBackUrl});}
  return rows;
}
export async function migrateBundledAssetsToSupabase(studio,onProgress=()=>{}){
  const report={updated:0,skipped:0,failed:[],assets:[]};
  let done=0; const total=(await analyzeBundledAssets(studio)).length;
  for(const series of studio.series||[]){
    try{const img=await migrateUrl(series.boosterImageUrl,'series',`series-${series.id}`);if(img.changed){await saveSeries({...series,boosterImageUrl:img.url});report.updated++;report.assets.push(img.path);}else report.skipped++;}catch(error){report.failed.push({type:'series',id:series.id,error:error.message});}onProgress(++done,total);
  }
  for(const card of studio.cards||[]){
    try{
      const front=await migrateUrl(card.imageUrl,'card-fronts',`card-${card.id}-front`);
      const thumb=await migrateUrl(card.thumbnailUrl,'thumbnails',`card-${card.id}-thumb`);
      if(front.changed||thumb.changed){await saveCard({...card,imageUrl:front.url||card.imageUrl,thumbnailUrl:thumb.url||front.url||card.thumbnailUrl});report.updated++;if(front.path)report.assets.push(front.path);if(thumb.path)report.assets.push(thumb.path);}else report.skipped++;
    }catch(error){report.failed.push({type:'card',id:card.id,error:error.message});}onProgress(++done,total);
  }
  for(const booster of studio.boosters||[]){
    try{
      const pack=await migrateUrl(booster.packImageUrl,'booster-packs',`booster-${booster.id}-pack`);
      const back=await migrateUrl(booster.cardBackUrl,'card-backs',`booster-${booster.id}-back`);
      if(pack.changed||back.changed){await saveBooster({...booster,packImageUrl:pack.url||booster.packImageUrl,cardBackUrl:back.url||booster.cardBackUrl});report.updated++;if(pack.path)report.assets.push(pack.path);if(back.path)report.assets.push(back.path);}else report.skipped++;
    }catch(error){report.failed.push({type:'booster',id:booster.id,error:error.message});}onProgress(++done,total);
  }
  notifyCardCatalogChanged('asset-migration');
  return report;
}
export async function getSystemDiagnostics(){const {data,error}=await supabase.rpc('admin_get_system_diagnostics_v87');if(error)throw error;return data;}
export async function exportAssetManifest(){
  const {data,error}=await supabase.rpc('admin_get_asset_manifest_v87');
  if(error)throw error;
  return data||[];
}
