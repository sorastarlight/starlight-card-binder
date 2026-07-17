import { supabase } from './supabase-client.js';

async function rpc(name,args={}){
  const {data,error}=await supabase.rpc(name,args);
  if(error) throw error;
  return data;
}
export const getDatabaseHealth=()=>rpc('admin_get_database_health_v902');
export const repairDatabaseHealth=(action)=>rpc('admin_repair_database_health_v902',{requested_action:action});
export const exportDatabaseBackup=()=>rpc('admin_export_database_backup_v902');
export function downloadJson(data,filename){
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
}
