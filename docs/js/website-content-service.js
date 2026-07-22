import { supabase } from './supabase-client.js';
import { cloneDefaultWebsiteContent } from './website-content-defaults.js';
import { mergeWebsiteContent, sanitizeWebsiteContent } from './website-content-model.js';

export async function getWebsiteContent() {
  const { data, error } = await supabase.rpc('get_website_content');
  if (error) throw error;
  return mergeWebsiteContent(data?.content || data);
}

export async function saveWebsiteContent(content) {
  const payload = sanitizeWebsiteContent(content);
  const { data, error } = await supabase.rpc('admin_save_website_content', {
    requested_content: payload
  });
  if (error) throw error;
  return mergeWebsiteContent(data?.content || payload);
}

export async function resetWebsiteContent() {
  const { data, error } = await supabase.rpc('admin_reset_website_content');
  if (error) throw error;
  return mergeWebsiteContent(data?.content || cloneDefaultWebsiteContent());
}
