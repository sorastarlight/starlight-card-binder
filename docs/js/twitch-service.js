import {supabase} from './supabase-client.js';

export async function getTwitchConfig(){const {data,error}=await supabase.rpc('get_twitch_public_config_v890');if(error)throw error;return data||{};}
export async function getMyTwitchConnection(){const {data,error}=await supabase.rpc('get_my_twitch_connection_v890');if(error)throw error;return data||{linked:false};}
export async function beginTwitchLink(flow='collector'){
  const config=await getTwitchConfig();
  if(!config.workerBaseUrl)throw new Error('Twitch integration has not been configured yet.');
  const {data:{session}}=await supabase.auth.getSession();
  if(!session?.access_token)throw new Error('Please sign in first.');
  const endpoint=flow==='broadcaster'?'/oauth/broadcaster/start':'/oauth/start';
  const response=await fetch(config.workerBaseUrl+endpoint,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({returnUrl:location.href.split('#')[0]})});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(body.error||'Unable to start Twitch linking.');
  location.href=body.authorizationUrl;
}
export async function unlinkTwitch(){const {data,error}=await supabase.rpc('unlink_my_twitch_v890');if(error)throw error;return data;}
export async function getTwitchAdminDashboard(){const {data,error}=await supabase.rpc('admin_get_twitch_dashboard_v890');if(error)throw error;return data||{};}
export async function saveTwitchWorkerUrl(url){const {data,error}=await supabase.rpc('admin_save_twitch_config_v890',{requested_worker_url:url});if(error)throw error;return data;}
export async function saveTwitchRule(payload){const {data,error}=await supabase.rpc('admin_save_twitch_reward_rule_v890',{payload});if(error)throw error;return data;}
export async function deleteTwitchRule(id){const {data,error}=await supabase.rpc('admin_delete_twitch_reward_rule_v890',{requested_id:id});if(error)throw error;return data;}
export async function grantManualTwitchReward(payload){const {data,error}=await supabase.rpc('admin_manual_twitch_reward_v890',{payload});if(error)throw error;return data;}
export async function callTwitchWorker(path,body={}){const config=await getTwitchConfig();const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error('Please sign in first.');const response=await fetch(config.workerBaseUrl+path,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});const out=await response.json().catch(()=>({}));if(!response.ok)throw new Error(out.error||'Twitch request failed.');return out;}
