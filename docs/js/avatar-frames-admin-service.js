import { supabase } from './supabase-client.js';

export async function adminListAvatarFrames() {
  const { data, error } = await supabase.rpc('admin_list_avatar_frames');
  if (error) throw error;
  return data || { frames: [], quests: [], seasonTiers: [] };
}

export async function adminSaveAvatarFrame(payload) {
  const { data, error } = await supabase.rpc('admin_save_avatar_frame', { payload });
  if (error) throw error;
  return data;
}

export async function adminSetRewardFrame(targetKind, targetId, frameId = null) {
  const { data, error } = await supabase.rpc('admin_set_reward_frame', {
    target_kind: targetKind,
    target_id: targetId,
    requested_frame_id: frameId
  });
  if (error) throw error;
  return data;
}
