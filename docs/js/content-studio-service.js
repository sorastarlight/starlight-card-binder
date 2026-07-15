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
  return String(url||'').includes('/storage/v1/object/public/site-assets/');
}
function isMigratableAsset(url){
  const value=String(url||'').trim();
  return Boolean(value) && !isSupabaseManagedAsset(value) && !/^(data:|blob:)/i.test(value);
}
function cleanPathname(value){
  try{return decodeURIComponent(new URL(value,window.location.href).pathname)}catch{return String(value||'')}
}
function localSourceCandidates(url){
  const value=String(url||'').trim();
  const pathname=cleanPathname(value);
  const candidates=[];
  if(pathname)candidates.push(new URL(pathname,window.location.origin).href);
  if(!/^https?:\/\//i.test(value))candidates.push(new URL(value,window.location.href).href);
  if(/^https?:\/\//i.test(value))candidates.push(value);
  return [...new Set(candidates)];
}
function extensionFromUrl(url,fallback='png'){
  const clean=String(url||'').split('?')[0].split('#')[0];
  return ((clean.match(/\.([a-z0-9]{2,5})$/i)||[])[1]||fallback).toLowerCase();
}
async function fetchImageBlob(url){
  const failures=[];
  for(const source of localSourceCandidates(url)){
    try{
      const response=await fetch(source,{cache:'no-store',credentials:'same-origin'});
      if(!response.ok){failures.push(`${source}: HTTP ${response.status}`);continue;}
      const blob=await response.blob();
      if(!blob.type.startsWith('image/')){failures.push(`${source}: ${blob.type||'unknown content type'}`);continue;}
      return {blob,source};
    }catch(error){failures.push(`${source}: ${error.message}`)}
  }
  throw new Error(`Could not download artwork. ${failures.join(' | ')}`);
}
async function verifyStorageObject(path){
  const slash=path.lastIndexOf('/');
  const folder=slash>=0?path.slice(0,slash):'';
  const name=slash>=0?path.slice(slash+1):path;
  const {data,error}=await supabase.storage.from('site-assets').list(folder,{limit:100,search:name});
  if(error)throw new Error(`Upload verification failed: ${error.message}`);
  if(!(data||[]).some(item=>item.name===name))throw new Error(`Uploaded file was not found in Storage: ${path}`);
}
async function migrateUrl(url,folder,key){
  if(!isMigratableAsset(url))return {url,changed:false};
  const {blob,source}=await fetchImageBlob(url);
  const fallback=blob.type==='image/webp'?'webp':blob.type==='image/jpeg'?'jpg':'png';
  const ext=extensionFromUrl(source||url,fallback);
  const type=blob.type||`image/${ext==='jpg'?'jpeg':ext}`;
  const path=`${folder}/migrated-${cleanName(key)}.${ext}`;
  const file=new File([blob],`${cleanName(key)}.${ext}`,{type});
  const uploaded=await uploadStudioAsset(file,folder,{path,upsert:true});
  await verifyStorageObject(path);
  return {url:uploaded.url,changed:true,path,sourceUrl:url,sourceResolved:source};
}
export async function analyzeBundledAssets(studio){
  const rows=[];
  for(const series of studio.series||[]){if(isMigratableAsset(series.boosterImageUrl))rows.push({type:'series',id:series.id,field:'boosterImageUrl',url:series.boosterImageUrl});}
  for(const card of studio.cards||[]){
    if(isMigratableAsset(card.imageUrl))rows.push({type:'card',id:card.id,field:'imageUrl',url:card.imageUrl});
    if(isMigratableAsset(card.thumbnailUrl))rows.push({type:'card',id:card.id,field:'thumbnailUrl',url:card.thumbnailUrl});
  }
  for(const booster of studio.boosters||[]){
    if(isMigratableAsset(booster.packImageUrl))rows.push({type:'booster',id:booster.id,field:'packImageUrl',url:booster.packImageUrl});
    if(isMigratableAsset(booster.cardBackUrl))rows.push({type:'booster',id:booster.id,field:'cardBackUrl',url:booster.cardBackUrl});
  }
  return rows;
}
export async function migrateBundledAssetsToSupabase(studio,onProgress=()=>{}){
  const {data:{user},error:userError}=await supabase.auth.getUser();
  if(userError||!user)throw new Error('You must be signed in before migrating artwork.');
  const candidates=await analyzeBundledAssets(studio);
  if(!candidates.length)throw new Error('No non-Supabase artwork references were found to migrate.');
  const report={startedAt:new Date().toISOString(),candidateAssets:candidates.length,updatedRecords:0,uploadedAssets:0,skipped:0,failed:[],assets:[]};
  let processed=0;
  const progress=()=>onProgress(++processed,candidates.length);
  for(const series of studio.series||[]){
    if(!isMigratableAsset(series.boosterImageUrl))continue;
    try{
      const img=await migrateUrl(series.boosterImageUrl,'series',`series-${series.id}`);
      await saveSeries({...series,boosterImageUrl:img.url});
      report.updatedRecords++;report.uploadedAssets++;report.assets.push(img);
    }catch(error){report.failed.push({type:'series',id:series.id,field:'boosterImageUrl',url:series.boosterImageUrl,error:error.message});}
    progress();
  }
  for(const card of studio.cards||[]){
    let changed=false,front=null,thumb=null;
    if(isMigratableAsset(card.imageUrl)){
      try{front=await migrateUrl(card.imageUrl,'card-fronts',`card-${card.id}-front`);report.uploadedAssets++;report.assets.push(front);}catch(error){report.failed.push({type:'card',id:card.id,field:'imageUrl',url:card.imageUrl,error:error.message});}
      progress();
    }
    if(isMigratableAsset(card.thumbnailUrl)){
      try{thumb=await migrateUrl(card.thumbnailUrl,'thumbnails',`card-${card.id}-thumb`);report.uploadedAssets++;report.assets.push(thumb);}catch(error){report.failed.push({type:'card',id:card.id,field:'thumbnailUrl',url:card.thumbnailUrl,error:error.message});}
      progress();
    }
    changed=Boolean(front?.changed||thumb?.changed);
    if(changed){
      try{await saveCard({...card,imageUrl:front?.url||card.imageUrl,thumbnailUrl:thumb?.url||card.thumbnailUrl});report.updatedRecords++;}
      catch(error){report.failed.push({type:'card',id:card.id,field:'database-update',error:error.message});}
    }
  }
  for(const booster of studio.boosters||[]){
    let pack=null,back=null;
    if(isMigratableAsset(booster.packImageUrl)){
      try{pack=await migrateUrl(booster.packImageUrl,'booster-packs',`booster-${booster.id}-pack`);report.uploadedAssets++;report.assets.push(pack);}catch(error){report.failed.push({type:'booster',id:booster.id,field:'packImageUrl',url:booster.packImageUrl,error:error.message});}
      progress();
    }
    if(isMigratableAsset(booster.cardBackUrl)){
      try{back=await migrateUrl(booster.cardBackUrl,'card-backs',`booster-${booster.id}-back`);report.uploadedAssets++;report.assets.push(back);}catch(error){report.failed.push({type:'booster',id:booster.id,field:'cardBackUrl',url:booster.cardBackUrl,error:error.message});}
      progress();
    }
    if(pack?.changed||back?.changed){
      try{await saveBooster({...booster,packImageUrl:pack?.url||booster.packImageUrl,cardBackUrl:back?.url||booster.cardBackUrl});report.updatedRecords++;}
      catch(error){report.failed.push({type:'booster',id:booster.id,field:'database-update',error:error.message});}
    }
  }
  report.finishedAt=new Date().toISOString();
  notifyCardCatalogChanged('asset-migration');
  if(report.uploadedAssets===0){
    const first=report.failed.slice(0,3).map(item=>`${item.type} ${item.id}: ${item.error}`).join(' | ');
    throw new Error(`No artwork was uploaded. ${first||'Check Storage upload permissions and browser console.'}`);
  }
  return report;
}
export async function getSystemDiagnostics(){const {data,error}=await supabase.rpc('admin_get_system_diagnostics_v87');if(error)throw error;return data;}
export async function exportAssetManifest(){const {data,error}=await supabase.rpc('admin_get_asset_manifest_v87');if(error)throw error;return data||[];}
