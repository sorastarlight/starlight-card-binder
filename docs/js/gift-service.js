import {supabase} from './supabase-client.js';
export async function sendAdminGift(payload){const {data,error}=await supabase.rpc('admin_send_gift_v895',{payload});if(error)throw error;return data;}
export async function getAdminGiftHistory(limit=100){const {data,error}=await supabase.rpc('admin_get_gift_history_v895',{requested_limit:limit});if(error)throw error;return data||[];}
