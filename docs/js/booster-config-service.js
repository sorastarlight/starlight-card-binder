import { supabase } from './supabase-client.js';

export async function getPublicBoosterConfig(boosterId){
  const {data:booster,error}=await supabase.from('booster_types').select('id,name,description,star_bits_cost,is_active,pack_image_url,card_back_url').eq('id',boosterId).maybeSingle();
  if(error)throw error;
  if(!booster)return null;
  const {data:slots,error:slotError}=await supabase.from('booster_slots').select('id,slot_key,name,quantity,sort_order,booster_slot_rates(rarity,percentage)').eq('booster_id',boosterId).order('sort_order');
  if(slotError)throw slotError;
  return {...booster,slots:slots||[]};
}

export function describeBoosterContents(config){
  if(!config?.slots?.length)return '';
  return config.slots.map(slot=>{
    const qty=Number(slot.quantity)||0;
    const rates=slot.booster_slot_rates||[];
    const positive=rates.filter(r=>Number(r.percentage)>0);
    const label=positive.length===1?positive[0].rarity:slot.name;
    return `${qty} ${label}${qty===1?' card':' cards'}`;
  }).join(', ').replace(/, ([^,]*)$/, ', and $1');
}
