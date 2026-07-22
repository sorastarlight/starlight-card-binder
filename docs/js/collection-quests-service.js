import { supabase } from './supabase-client.js';

export async function getMyCollectionQuests() {
  const { data, error } = await supabase.rpc('get_my_collection_quests');
  if (error) throw error;
  return data || { quests: [] };
}

export async function claimCollectionQuest(questId) {
  const { data, error } = await supabase.rpc('claim_collection_quest', {
    requested_quest_id: questId
  });
  if (error) throw error;
  return data;
}
