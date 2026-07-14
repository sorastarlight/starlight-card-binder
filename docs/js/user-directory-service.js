import { supabase } from './supabase-client.js';
function timeout(ms){return new Promise((_,reject)=>setTimeout(()=>reject(new Error('The user directory request timed out. Please try again.')),ms));}
export async function listUserDirectory(search='',limit=500){
  const request=supabase.rpc('admin_list_user_directory',{requested_search:search||null,requested_limit:limit});
  const {data,error}=await Promise.race([request,timeout(12000)]);
  if(error)throw error;return Array.isArray(data)?data:[];
}
