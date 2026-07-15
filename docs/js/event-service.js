import { supabase } from './supabase-client.js';
export async function getActiveEvents(){const {data,error}=await supabase.rpc('get_active_starlight_events_v88');if(error)throw error;return data||[]}
export async function getAdminEvents(){const {data,error}=await supabase.rpc('admin_get_events_v88');if(error)throw error;return data||[]}
export async function saveEvent(payload){const {data,error}=await supabase.rpc('admin_save_event_v88',{payload});if(error)throw error;return data}
export async function deleteEvent(id){const {data,error}=await supabase.rpc('admin_delete_event_v88',{requested_id:id});if(error)throw error;return data}
