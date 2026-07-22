import { supabase } from './supabase-client.js';
import { mergeShellNavigation, sanitizeShellNavigation } from './shell-navigation-model.js';

export { mergeShellNavigation, sanitizeShellNavigation };

export async function getShellNavigation() {
  const { data, error } = await supabase.rpc('get_shell_navigation');
  if (error) throw error;
  return mergeShellNavigation(data?.navigation || data);
}

export async function saveShellNavigation(navigation) {
  const payload = sanitizeShellNavigation(navigation);
  const { data, error } = await supabase.rpc('admin_save_shell_navigation', {
    requested_navigation: payload
  });
  if (error) throw error;
  return mergeShellNavigation(data?.navigation || payload);
}

export async function resetShellNavigation() {
  const { data, error } = await supabase.rpc('admin_reset_shell_navigation');
  if (error) throw error;
  return mergeShellNavigation(data?.navigation);
}