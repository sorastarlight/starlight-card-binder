import { supabase } from './supabase-client.js';
export async function listUserDirectory(search='',limit=500){
  const {data,error}=await supabase.rpc('admin_list_user_directory',{requested_search:search||null,requested_limit:limit});
  if(error)throw error;return data||[];
}
