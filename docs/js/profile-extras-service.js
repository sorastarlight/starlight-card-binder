import { supabase } from './supabase-client.js';

export async function getMyProfileExtras(){
  const {data,error}=await supabase.rpc('get_my_profile_extras');
  if(error) throw error;
  return data;
}

export async function setMyProfileExtras({avatarUrl=null,titleId=null}={}){
  const {data,error}=await supabase.rpc('set_my_profile_extras',{
    requested_avatar_url:avatarUrl,
    requested_title_id:titleId
  });
  if(error) throw error;
  return data;
}

export async function uploadProfileImage(blob){
  const {data:userData,error:userError}=await supabase.auth.getUser();
  if(userError||!userData?.user) throw userError||new Error('You must be signed in.');
  if(blob.size>1048576) throw new Error('The finished profile image must be 1 MB or smaller.');
  const path=`${userData.user.id}/avatar.webp`;
  const {error}=await supabase.storage.from('profile-images').upload(path,blob,{
    contentType:'image/webp',
    upsert:true,
    cacheControl:'3600'
  });
  if(error) throw error;
  const {data}=supabase.storage.from('profile-images').getPublicUrl(path);
  const publicUrl=`${data.publicUrl}?v=${Date.now()}`;
  const current=await getMyProfileExtras();
  await setMyProfileExtras({avatarUrl:publicUrl,titleId:current.selectedTitleId||null});
  return publicUrl;
}

export async function getPublicProfileExtras(username){
  const {data,error}=await supabase.rpc('get_public_profile_extras',{requested_username:username});
  if(error) throw error;
  return data;
}
