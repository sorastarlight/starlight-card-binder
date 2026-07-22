import { supabase } from './supabase-client.js';

export async function getMySeasonPass() {
  const { data, error } = await supabase.rpc('get_my_season_pass');
  if (error) throw error;
  return data || { found: false };
}

export async function claimSeasonPassTier(tierId) {
  const { data, error } = await supabase.rpc('claim_season_pass_tier', {
    requested_tier_id: tierId
  });
  if (error) throw error;
  return data;
}
