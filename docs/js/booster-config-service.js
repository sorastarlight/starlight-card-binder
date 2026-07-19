import { supabase } from './supabase-client.js';

export async function getPublicBoosterConfig(boosterId){
  const {data:booster,error}=await supabase.from('booster_types').select('id,name,description,star_bits_cost,is_active,pack_image_url,card_back_url').eq('id',boosterId).maybeSingle();
  if(error)throw error;
  if(!booster)return null;
  const {data:slots,error:slotError}=await supabase.from('booster_slots').select('id,slot_key,name,quantity,sort_order,booster_slot_rates(rarity,percentage)').eq('booster_id',boosterId).order('sort_order');
  if(slotError)throw slotError;
  return {...booster,slots:slots||[]};
}
