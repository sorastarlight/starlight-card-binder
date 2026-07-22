import { supabase } from './supabase-client.js';

export async function getMyProfileExtras() {
  const { data, error } = await supabase.rpc('get_my_profile_extras');
  if (error) throw error;
  return data;
}

export async function setMyProfileExtras({
  avatarUrl = undefined,
  titleId = undefined,
  bannerUrl = undefined
} = {}) {
  const payload = {};
  if (avatarUrl !== undefined) payload.requested_avatar_url = avatarUrl;
  if (titleId !== undefined) payload.requested_title_id = titleId;
  if (bannerUrl !== undefined) payload.requested_banner_url = bannerUrl;

  const { data, error } = await supabase.rpc('set_my_profile_extras', payload);
  if (error) throw error;
  return data;
}

async function uploadProfileAsset(blob, { pathSuffix, maxBytes, setUrl }) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) throw userError || new Error('You must be signed in.');
  if (blob.size > maxBytes) {
    throw new Error(`The finished image must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);
  }
  const path = `${userData.user.id}/${pathSuffix}`;
  const { error } = await supabase.storage.from('profile-images').upload(path, blob, {
    contentType: 'image/webp',
    upsert: true,
    cacheControl: '3600'
  });
  if (error) throw error;
  const { data } = supabase.storage.from('profile-images').getPublicUrl(path);
  const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
  await setUrl(publicUrl);
  return publicUrl;
}

export async function uploadProfileImage(blob) {
  return uploadProfileAsset(blob, {
    pathSuffix: 'avatar.webp',
    maxBytes: 1048576,
    setUrl: async (publicUrl) => {
      await setMyProfileExtras({ avatarUrl: publicUrl });
    }
  });
}

export async function uploadProfileBanner(blob) {
  return uploadProfileAsset(blob, {
    pathSuffix: 'banner.webp',
    maxBytes: 2097152,
    setUrl: async (publicUrl) => {
      await setMyProfileExtras({ bannerUrl: publicUrl });
    }
  });
}

export async function getPublicProfileExtras(username) {
  const { data, error } = await supabase.rpc('get_public_profile_extras', {
    requested_username: username
  });
  if (error) throw error;
  return data;
}
