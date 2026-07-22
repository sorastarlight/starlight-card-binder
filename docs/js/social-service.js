import { supabase } from './supabase-client.js';

function rpcError(error, fallback = 'Request failed.') {
  const message = error?.message || fallback;
  throw new Error(message);
}

export async function getPublicCollectorSocial(username) {
  const { data, error } = await supabase.rpc('get_public_collector_social_v1', {
    requested_username: username
  });
  if (error) rpcError(error, 'Could not load collector social profile.');
  return data;
}

export async function setProfileShowcase({
  favoriteCardId = null,
  favoriteSeriesId = null,
  favoriteCharacter = null,
  clearFavoriteCard = false,
  clearFavoriteSeries = false,
  clearFavoriteCharacter = false
} = {}) {
  const { data, error } = await supabase.rpc('set_profile_showcase_v1', {
    requested_favorite_card_id: favoriteCardId,
    requested_favorite_series_id: favoriteSeriesId,
    requested_favorite_character: favoriteCharacter,
    clear_favorite_card: clearFavoriteCard,
    clear_favorite_series: clearFavoriteSeries,
    clear_favorite_character: clearFavoriteCharacter
  });
  if (error) rpcError(error, 'Could not update showcase settings.');
  return data;
}

export async function followCollector(username) {
  const { data, error } = await supabase.rpc('follow_collector_v1', {
    requested_username: username
  });
  if (error) rpcError(error, 'Could not follow that collector.');
  return data;
}

export async function unfollowCollector(username) {
  const { data, error } = await supabase.rpc('unfollow_collector_v1', {
    requested_username: username
  });
  if (error) rpcError(error, 'Could not unfollow that collector.');
  return data;
}

export async function getPullFeed({ filter = 'everyone', limit = 40, beforeId = null } = {}) {
  const { data, error } = await supabase.rpc('get_pull_feed_v1', {
    requested_filter: filter,
    requested_limit: limit,
    requested_before_id: beforeId
  });
  if (error) rpcError(error, 'Could not load the pull feed.');
  return data;
}

export async function getCardComments(cardId, { limit = 40, beforeId = null } = {}) {
  const { data, error } = await supabase.rpc('get_card_comments_v1', {
    requested_card_id: cardId,
    requested_limit: limit,
    requested_before_id: beforeId
  });
  if (error) rpcError(error, 'Could not load card comments.');
  return data;
}

export async function postCardComment(cardId, body) {
  const { data, error } = await supabase.rpc('post_card_comment_v1', {
    requested_card_id: cardId,
    requested_body: body
  });
  if (error) rpcError(error, 'Could not post comment.');
  return data;
}

export async function deleteCardComment(commentId) {
  const { data, error } = await supabase.rpc('delete_card_comment_v1', {
    requested_comment_id: commentId
  });
  if (error) rpcError(error, 'Could not delete comment.');
  return data;
}

export async function sendPeerGift({
  username,
  giftType,
  amount = null,
  cardId = null,
  message = null
}) {
  const { data, error } = await supabase.rpc('send_peer_gift_v1', {
    requested_username: username,
    requested_gift_type: giftType,
    requested_amount: amount,
    requested_card_id: cardId,
    requested_message: message
  });
  if (error) rpcError(error, 'Could not send gift.');
  return data;
}
