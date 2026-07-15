import { supabase } from './supabase-client.js';

export async function getMyNotifications(limit = 60) {
  const { data, error } = await supabase.rpc('get_my_notifications_v881', { requested_limit: limit });
  if (error) throw error;
  return data || { notifications: [], unreadCount: 0 };
}
export async function markNotificationRead(id) {
  const { data, error } = await supabase.rpc('mark_notification_read_v881', { requested_id: id });
  if (error) throw error; return data;
}
export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc('mark_all_notifications_read_v881');
  if (error) throw error; return data;
}
export async function deleteNotification(id) {
  const { data, error } = await supabase.rpc('delete_notification_v881', { requested_id: id });
  if (error) throw error; return data;
}
export async function deleteReadNotifications() {
  const { data, error } = await supabase.rpc('delete_read_notifications_v881');
  if (error) throw error; return data;
}
export async function adminBroadcastNotification(payload) {
  const { data, error } = await supabase.rpc('admin_broadcast_notification_v881', { payload });
  if (error) throw error; return data;
}

export async function getNotificationPreferences() {
  const { data, error } = await supabase.rpc('get_notification_preferences_v882');
  if (error) throw error;
  return data || {};
}
export async function saveNotificationPreferences(preferences) {
  const { data, error } = await supabase.rpc('save_notification_preferences_v882', { requested_preferences: preferences || {} });
  if (error) throw error;
  return data;
}
