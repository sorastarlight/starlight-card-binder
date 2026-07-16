import {supabase} from './supabase-client.js';

export async function getTwitchConfig(){const {data,error}=await supabase.rpc('get_twitch_public_config_v890');if(error)throw error;return data||{};}
export async function getMyTwitchConnection(){const {data,error}=await supabase.rpc('get_my_twitch_connection_v890');if(error)throw error;return data||{linked:false};}
export async function beginTwitchLink(flow='collector'){
  // Twitch refuses to render inside the Binder iframe. Open a real popup
  // immediately from the click event so browsers do not block it.
  const popupName=flow==='broadcaster'?'starlightTwitchBroadcaster':'starlightTwitchCollector';
  const popup=window.open('about:blank',popupName,'popup=yes,width=620,height=760,resizable=yes,scrollbars=yes');
  if(popup){
    try{
      popup.document.title='Connecting to Twitch…';
      popup.document.body.innerHTML='<main style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:90vh;text-align:center;color:#405fa1"><div><h1>Connecting to Twitch…</h1><p>Please wait while the secure sign-in page opens.</p></div></main>';
    }catch(_){ }
  }
  try{
    const config=await getTwitchConfig();
    if(!config.workerBaseUrl)throw new Error('Twitch integration has not been configured yet.');
    const {data:{session}}=await supabase.auth.getSession();
    if(!session?.access_token)throw new Error('Please sign in first.');
    const endpoint=flow==='broadcaster'?'/oauth/broadcaster/start':'/oauth/start';
    const completeUrl=new URL('twitch-oauth-complete.html',window.location.href);
    completeUrl.searchParams.set('flow',flow);
    const response=await fetch(config.workerBaseUrl.replace(/\/$/,'')+endpoint,{
      method:'POST',
      headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},
      body:JSON.stringify({returnUrl:completeUrl.href})
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(body.error||'Unable to start Twitch linking.');
    if(!body.authorizationUrl)throw new Error('The Worker did not return a Twitch authorization URL.');
    if(popup&&!popup.closed){
      popup.location.replace(body.authorizationUrl);
      popup.focus();
      return {popup};
    }
    // Popup blockers are rare here because the window is opened synchronously,
    // but use the top-level browsing context as a safe fallback.
    window.top.location.assign(body.authorizationUrl);
    return {popup:null};
  }catch(error){
    if(popup&&!popup.closed)popup.close();
    throw error;
  }
}
export async function unlinkTwitch(){const {data,error}=await supabase.rpc('unlink_my_twitch_v890');if(error)throw error;return data;}
export async function getTwitchAdminDashboard(){const {data,error}=await supabase.rpc('admin_get_twitch_dashboard_v890');if(error)throw error;return data||{};}
export async function saveTwitchWorkerUrl(url){const {data,error}=await supabase.rpc('admin_save_twitch_config_v890',{requested_worker_url:url});if(error)throw error;return data;}
export async function saveTwitchRule(payload){const {data,error}=await supabase.rpc('admin_save_twitch_reward_rule_v890',{payload});if(error)throw error;return data;}
export async function deleteTwitchRule(id){const {data,error}=await supabase.rpc('admin_delete_twitch_reward_rule_v890',{requested_id:id});if(error)throw error;return data;}
export async function grantManualTwitchReward(payload){const {data,error}=await supabase.rpc('admin_manual_twitch_reward_v890',{payload});if(error)throw error;return data;}
export async function callTwitchWorker(path,body={}){const config=await getTwitchConfig();const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new Error('Please sign in first.');const response=await fetch(config.workerBaseUrl+path,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});const out=await response.json().catch(()=>({}));if(!response.ok)throw new Error(out.error||'Twitch request failed.');return out;}

export async function getTwitchCustomRewards(){return callTwitchWorker('/admin/custom-rewards');}
