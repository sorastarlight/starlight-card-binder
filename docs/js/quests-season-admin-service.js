import { supabase } from './supabase-client.js';

export {
  slugifyAdminId,
  requirementNeedsTarget,
  formatRequirementSummary,
  toDatetimeLocalValue,
  fromDatetimeLocalValue
} from './quests-season-admin-utils.js';

export async function getQuestsSeasonAdmin() {
  const { data, error } = await supabase.rpc('admin_get_quests_season_admin');
  if (error) throw error;
  return data || { quests: [], seasons: [], titles: [], pickers: {} };
}

export async function listCollectionQuestsAdmin() {
  const { data, error } = await supabase.rpc('admin_list_collection_quests');
  if (error) throw error;
  return data || [];
}

export async function listSeasonsAdmin() {
  const { data, error } = await supabase.rpc('admin_list_seasons');
  if (error) throw error;
  return data || [];
}

export async function listCollectorTitlesAdmin() {
  const { data, error } = await supabase.rpc('admin_list_collector_titles');
  if (error) throw error;
  return data || [];
}

export async function saveCollectionQuest(payload) {
  const { data, error } = await supabase.rpc('admin_save_collection_quest', { payload });
  if (error) throw error;
  return data;
}

export async function saveSeason(payload) {
  const { data, error } = await supabase.rpc('admin_save_season', { payload });
  if (error) throw error;
  return data;
}

export async function saveSeasonTier(payload) {
  const { data, error } = await supabase.rpc('admin_save_season_tier', { payload });
  if (error) throw error;
  return data;
}

export async function saveCollectorTitle(payload) {
  const { data, error } = await supabase.rpc('admin_save_collector_title', { payload });
  if (error) throw error;
  return data;
}

export async function deleteSeasonTier(tierId) {
  const { data, error } = await supabase.rpc('admin_delete_season_tier', { tier_id: tierId });
  if (error) throw error;
  return data;
}
