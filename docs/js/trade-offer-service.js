import { supabase } from './supabase-client.js';

export async function searchTradeCollectors(query, limit = 8) {
  const { data, error } = await supabase.rpc('search_trade_collectors', {
    requested_query: String(query || '').trim(),
    requested_limit: Math.max(1, Math.min(Number(limit) || 8, 12))
  });
  if (error) throw error;
  return {
    query: data?.query || String(query || '').trim().toLowerCase(),
    results: Array.isArray(data?.results) ? data.results : []
  };
}

export async function getTradeOfferContext(username) {
  const { data, error } = await supabase.rpc('get_trade_offer_context', {
    requested_username: String(username || '').trim().toLowerCase()
  });
  if (error) throw error;
  return data;
}

export async function createTradeOffer(username, offeredItems, requestedItems, note = '') {
  const { data, error } = await supabase.rpc('create_trade_offer', {
    requested_username: String(username || '').trim().toLowerCase(),
    offered_items: offeredItems,
    requested_items: requestedItems,
    requested_note: note
  });
  if (error) throw error;
  return data;
}

export async function getMyTradeOffers() {
  const { data, error } = await supabase.rpc('get_my_trade_offers');
  if (error) throw error;
  return data;
}

export async function respondToTradeOffer(offerId, action) {
  const { data, error } = await supabase.rpc('respond_to_trade_offer', {
    requested_offer_id: offerId,
    requested_action: action
  });
  if (error) throw error;
  return data;
}
