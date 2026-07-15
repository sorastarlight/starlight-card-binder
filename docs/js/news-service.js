import {supabase} from './supabase-client.js';
export async function listAdminNews(){const {data,error}=await supabase.rpc('admin_list_news_posts');if(error)throw error;return data||[]}
export async function saveNews(post){const {data,error}=await supabase.rpc('admin_save_news_post',{requested_post:post});if(error)throw error;return data}
export async function deleteNews(id){const {data,error}=await supabase.rpc('admin_delete_news_post',{requested_id:id});if(error)throw error;return data}
