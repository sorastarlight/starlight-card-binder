import { supabase } from './supabase-client.js';

export async function getMyTradeLists(){
  const {data,error}=await supabase.rpc('get_my_trade_lists');
  if(error) throw error;
  return data;
}
export async function setCardTradePreference(cardId,wishlisted,tradeQuantity){
  const {data,error}=await supabase.rpc('set_card_trade_preference',{
    requested_card_id:cardId,
    requested_wishlisted:Boolean(wishlisted),
    requested_trade_quantity:Number(tradeQuantity)||0
  });
  if(error) throw error;
  return data;
}
export async function setTradeListVisibility(isPublic){
  const {data,error}=await supabase.rpc('set_trade_list_visibility',{requested_public:Boolean(isPublic)});
  if(error) throw error;
  return data;
}
