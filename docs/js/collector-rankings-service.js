import { supabase } from './supabase-client.js';

/**
 * Load public collector rankings (security-definer RPC).
 * @param {{ search?: string, limit?: number, offset?: number }} [options]
 */
export async function listPublicCollectorRankings({
  search = '',
  limit = 50,
  offset = 0
} = {}) {
  const { data, error } = await supabase.rpc('list_public_collector_rankings', {
    requested_search: search || null,
    requested_limit: limit,
    requested_offset: offset
  });

  if (error) throw error;

  const payload = data && typeof data === 'object' ? data : {};
  return {
    total: Number(payload.total || 0),
    limit: Number(payload.limit || limit),
    offset: Number(payload.offset || offset),
    catalogTotal: Number(payload.catalogTotal || 0),
    results: Array.isArray(payload.results) ? payload.results : []
  };
}
