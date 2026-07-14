import { supabase } from './supabase-client.js';

export async function getBoosterConfiguration(){
  const {data,error}=await supabase.rpc('admin_get_booster_configuration');
  if(error)throw error;return data||{boosters:[],cards:[]};
}
export async function updateBooster({id,name,description,starBitsCost,isActive}){
  const {data,error}=await supabase.rpc('admin_update_booster',{
    requested_booster_id:id,requested_name:name,requested_description:description,
    requested_star_bits_cost:Number(starBitsCost)||0,requested_is_active:Boolean(isActive)
  });if(error)throw error;return data;
}
export async function updateBoosterSlot(slotId,quantity,rates){
  const {data,error}=await supabase.rpc('admin_update_booster_slot',{
    requested_slot_id:Number(slotId),requested_quantity:Number(quantity),requested_rates:rates
  });if(error)throw error;return data;
}
export async function updateCardPullSettings(cardId,rarity,pullWeight,isPullable){
  const {data,error}=await supabase.rpc('admin_update_card_pull_settings',{
    requested_card_id:cardId,requested_rarity:rarity,requested_pull_weight:Number(pullWeight),requested_is_pullable:Boolean(isPullable)
  });if(error)throw error;return data;
}
