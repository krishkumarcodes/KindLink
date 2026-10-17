/**
 * KindLink Maps Daily Quota Guard
 * 
 * Tracks daily API usage (UTC) per provider in-memory and persists to Supabase
 * PostgreSQL `map_daily_usage` via service role.
 * 
 * Automatically bypasses providers when their free-tier daily soft limit is approached
 * (>= 95% of quota) so KindLink seamlessly cascades to free/open fallback providers
 * before incurring provider bans, overage charges, or HTTP 429 errors.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { getDailySoftLimits, hasRequiredApiKey } from './config';

export interface ProviderQuotaStatus {
  providerId: string;
  utcDate: string;
  requestCount: number;
  creditCount: number;
  softLimit: number;
  percentUsed: number;
  isApproachingLimit: boolean;
  isExhausted: boolean;
  canExecute: boolean;
}

interface MemoryQuotaEntry {
  requests: number;
  credits: number;
  syncedToDbAt: number;
}

// In-memory store: Key is `${providerId}:${utcDate}`
const usageMemoryStore = new Map<string, MemoryQuotaEntry>();

// Throttle DB sync pulls to once every 5 minutes per provider
const lastDbPullTimes = new Map<string, number>();
const DB_PULL_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Returns current UTC date string in 'YYYY-MM-DD' format
 */
export function getUtcDateString(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Normalizes provider IDs so compound names (e.g. geoapify-route, openrouteservice)
 * map to their canonical quota tracking keys (geoapify, ors).
 */
export function normalizeProviderId(providerId: string): string {
  const norm = providerId.toLowerCase().trim();
  if (norm.startsWith('geoapify')) return 'geoapify';
  if (norm.startsWith('ors') || norm.startsWith('openrouteservice')) return 'ors';
  if (norm.startsWith('osrm')) return 'osrm';
  if (norm.startsWith('overpass')) return 'overpass';
  if (norm.startsWith('maptiler')) return 'maptiler';
  if (norm.startsWith('osm') || norm.startsWith('openstreetmap')) return 'osm';
  return norm;
}

/**
 * Returns the configured daily soft limit for a provider and optional category
 */
export function getProviderSoftLimit(providerId: string, category?: string): number {
  const limits = getDailySoftLimits();
  const id = normalizeProviderId(providerId);

  switch (id) {
    case 'geoapify':
      return limits.geoapify; // default 2500
    case 'ors':
      if (category === 'geocode') {
        return limits.orsGeocode; // default 900
      }
      return limits.orsDirections; // default 1800
    default:
      // Open / self-hosted / unrestricted providers (osm, photon, nominatim, osrm, overpass)
      return Infinity;
  }
}

/**
 * Checks in-memory usage for a provider on a given UTC date
 */
function getMemoryUsage(providerId: string, utcDate: string): MemoryQuotaEntry {
  const key = `${normalizeProviderId(providerId)}:${utcDate}`;
  let entry = usageMemoryStore.get(key);
  if (!entry) {
    entry = { requests: 0, credits: 0, syncedToDbAt: 0 };
    usageMemoryStore.set(key, entry);
  }
  return entry;
}

/**
 * Asynchronously pulls latest usage from Supabase if interval elapsed
 */
async function maybePullFromDatabase(providerId: string, utcDate: string): Promise<void> {
  if (process.env.DATA_SOURCE === 'mock') {
    return;
  }

  const id = providerId.toLowerCase().trim();
  const now = Date.now();
  const lastPull = lastDbPullTimes.get(id) || 0;

  if (now - lastPull < DB_PULL_INTERVAL_MS) {
    return;
  }
  lastDbPullTimes.set(id, now);

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('map_daily_usage')
      .select('request_count, credit_count')
      .eq('provider', id)
      .eq('usage_date', utcDate)
      .maybeSingle();

    if (!error && data) {
      const entry = getMemoryUsage(id, utcDate);
      // Keep whichever count is higher to avoid undercounting across serverless instances
      entry.requests = Math.max(entry.requests, data.request_count || 0);
      entry.credits = Math.max(entry.credits, data.credit_count || 0);
      entry.syncedToDbAt = now;
    }
  } catch {
    // Database unmigrated or unavailable: rely on in-memory usage
  }
}

/**
 * Returns whether a provider has approached its soft limit (>= 95% of soft limit)
 * or has reached/exceeded it.
 */
export function isSoftLimitApproached(providerId: string, category?: string): boolean {
  const limit = getProviderSoftLimit(providerId, category);
  if (limit === Infinity) {
    return false;
  }

  const today = getUtcDateString();
  const usage = getMemoryUsage(providerId, today);

  // Soft limit threshold: 95% of quota
  const threshold = Math.floor(limit * 0.95);
  return usage.credits >= threshold || usage.requests >= threshold;
}

/**
 * Returns whether a provider can be executed based on API key presence and soft limits
 */
export function canUseProvider(providerId: string, category?: string): boolean {
  // Check required credentials first
  if (!hasRequiredApiKey(providerId)) {
    return false;
  }

  // Check quota soft limit
  if (isSoftLimitApproached(providerId, category)) {
    return false;
  }

  return true;
}

/**
 * Records API usage for a provider both in-memory and persistently in Supabase
 */
export async function recordProviderUsage(
  providerId: string,
  credits = 1,
  count = 1,
  category?: string
): Promise<void> {
  const id = providerId.toLowerCase().trim();
  const today = getUtcDateString();
  const entry = getMemoryUsage(id, today);

  entry.requests += count;
  entry.credits += credits;

  if (process.env.DATA_SOURCE === 'mock') {
    return;
  }

  // Background non-blocking sync to Supabase map_daily_usage
  Promise.resolve().then(async () => {
    try {
      const admin = createAdminClient();

      // 1. Try atomic increment RPC function
      const { error: rpcError } = await admin.rpc('increment_map_usage', {
        p_provider: id,
        p_date: today,
        p_count: count,
        p_credits: credits,
      });

      if (!rpcError) {
        return;
      }

      // 2. Fallback to direct upsert if RPC is not present
      const { data: existing } = await admin
        .from('map_daily_usage')
        .select('request_count, credit_count')
        .eq('provider', id)
        .eq('usage_date', today)
        .maybeSingle();

      const newRequests = (existing?.request_count || 0) + count;
      const newCredits = (existing?.credit_count || 0) + credits;

      await admin.from('map_daily_usage').upsert(
        {
          provider: id,
          usage_date: today,
          request_count: newRequests,
          credit_count: newCredits,
        },
        { onConflict: 'provider,usage_date' }
      );
    } catch {
      // Silently ignore sync failures
    }
  });
}

/**
 * Retrieves full quota and usage status for a provider
 */
export async function getProviderQuotaStatus(
  providerId: string,
  category?: string
): Promise<ProviderQuotaStatus> {
  const id = providerId.toLowerCase().trim();
  const today = getUtcDateString();

  await maybePullFromDatabase(id, today);

  const usage = getMemoryUsage(id, today);
  const softLimit = getProviderSoftLimit(id, category);
  const percentUsed =
    softLimit === Infinity ? 0 : Math.min(100, Math.round((usage.credits / softLimit) * 100));

  const isApproachingLimit = isSoftLimitApproached(id, category);
  const isExhausted = softLimit !== Infinity && usage.credits >= softLimit;
  const canExecute = canUseProvider(id, category);

  return {
    providerId: id,
    utcDate: today,
    requestCount: usage.requests,
    creditCount: usage.credits,
    softLimit,
    percentUsed,
    isApproachingLimit,
    isExhausted,
    canExecute,
  };
}

/**
 * Returns usage reports for all known map providers
 */
export async function getAllProvidersQuotaStatus(): Promise<ProviderQuotaStatus[]> {
  const providers = ['geoapify', 'ors', 'maptiler', 'osm', 'photon', 'nominatim', 'osrm', 'overpass'];
  const statuses: ProviderQuotaStatus[] = [];

  for (const provider of providers) {
    const status = await getProviderQuotaStatus(provider);
    statuses.push(status);
  }

  return statuses;
}

/**
 * Reset in-memory usage counters (for test suites)
 */
export function resetQuotaMemoryStore(): void {
  usageMemoryStore.clear();
  lastDbPullTimes.clear();
}
