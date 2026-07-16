import {supabase} from './supabase-client.js';
export async function getReceivedRewards(status=null){const {data,error}=await supabase.rpc('get_my_received_rewards_v892',{requested_status:status});if(error)throw error;return data||{pendingCount:0,rewards:[]};}
export async function claimReceivedReward(id){const {data,error}=await supabase.rpc('claim_my_received_reward_v892',{requested_id:id});if(error)throw error;return data;}
export async function dismissReceivedReward(id){const {data,error}=await supabase.rpc('dismiss_my_received_reward_v892',{requested_id:id});if(error)throw error;return data;}
