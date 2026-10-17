/**
 * KindLink Dual-Tier Map Cache Engine
 * 
 * Provides ultra-fast low-latency in-memory caching backed by Supabase PostgreSQL
 * persistent storage (public.map_cache) via service-role administration.
 * 
 * Cache Keys:
 * - Coordinates rounded to 4 decimals (~11m resolution) for maximum cache reuse
 * - Search text normalized (trimmed, lowercase)
 * - Automatic background garbage collection of expired records
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { MAP_CACHE_TTLS, MapCacheCategory } from './config';

interface MemoryCacheEntry<T> {
  data: T;
  expiresAt: number;
  category: string;
}

// In-memory Level 1 Cache
const memoryCache = new Map<string, MemoryCacheEntry<unknown>>();

// Throttle database cleanup to at most once every 30 minutes
let lastDbCleanupTimestamp = 0;
const DB_CLEANUP_INTERVAL_MS = 30 * 60 * 1000;

// ============================================================================
// Normalization & Key Generation Helpers
// ============================================================================

export function roundCoordinate(coord: number): number {
  return Math.round(coord * 10000) / 10000;
}

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Creates standardized cache key for geocoding / search queries
 */
export function buildGeocodeCacheKey(
  query: string,
  type: 'search' | 'autocomplete' = 'search',
  biasLat?: number,
  biasLng?: number
): string {
  const normQuery = normalizeQuery(query);
  if (biasLat !== undefined && biasLng !== undefined) {
    const lat = roundCoordinate(biasLat);
    const lng = roundCoordinate(biasLng);
    return `geo:${type}:${normQuery}:${lat},${lng}`;
  }
  return `geo:${type}:${normQuery}`;
}

/**
 * Creates standardized cache key for reverse geocoding queries
 */
export function buildReverseCacheKey(lat: number, lng: number): string {
  const rLat = roundCoordinate(lat);
  const rLng = roundCoordinate(lng);
  return `rev:${rLat},${rLng}`;
}

/**
 * Creates standardized cache key for route calculations
 */
export function buildRouteCacheKey(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  mode: string
): string {
  const oLat = roundCoordinate(originLat);
  const oLng = roundCoordinate(originLng);
  const dLat = roundCoordinate(destLat);
  const dLng = roundCoordinate(destLng);
  const normMode = mode.toLowerCase().trim();
  return `route:${normMode}:${oLat},${oLng}->${dLat},${dLng}`;
}

/**
 * Creates standardized cache key for nearby places / medical facilities
 */
export function buildPlacesCacheKey(
  lat: number,
  lng: number,
  radiusMeters: number,
  category = 'all'
): string {
  const rLat = roundCoordinate(lat);
  const rLng = roundCoordinate(lng);
  const normCat = category.toLowerCase().trim();
  const roundedRadius = Math.round(radiusMeters / 100) * 100; // Round to nearest 100m
  return `places:${normCat}:${rLat},${rLng}:r${roundedRadius}`;
}

// ============================================================================
// Dual-Tier Cache Accessors (Get / Set / Invalidate)
// ============================================================================

/**
 * Retrieves a cached item from Level 1 (memory) or Level 2 (Supabase map_cache)
 */
export async function getMapCache<T>(key: string): Promise<T | null> {
  const now = Date.now();

  // Tier 1: Check In-Memory Map
  const memEntry = memoryCache.get(key) as MemoryCacheEntry<T> | undefined;
  if (memEntry) {
    if (memEntry.expiresAt > now) {
      return memEntry.data;
    }
    // Expired in memory
    memoryCache.delete(key);
  }

  // Tier 2: Check Supabase PostgreSQL map_cache table (if not in offline mock mode)
  if (process.env.DATA_SOURCE === 'mock') {
    return null;
  }

  try {
    const admin = createAdminClient();
    const isoNow = new Date(now).toISOString();

    const { data, error } = await admin
      .from('map_cache')
      .select('data, expires_at, category')
      .eq('key', key)
      .gt('expires_at', isoNow)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const expiresAt = new Date(data.expires_at).getTime();

    // Populate Tier 1 cache for fast subsequent hits
    memoryCache.set(key, {
      data: data.data,
      expiresAt,
      category: data.category,
    });

    return data.data as T;
  } catch {
    // Database connection failure or unmigrated table: degrade silently
    return null;
  }
}

/**
 * Writes data to both Level 1 (memory) and Level 2 (Supabase map_cache)
 */
export async function setMapCache<T>(
  key: string,
  data: T,
  category: MapCacheCategory,
  customTtlMs?: number
): Promise<void> {
  const now = Date.now();
  const ttlMs = customTtlMs ?? MAP_CACHE_TTLS[category] ?? MAP_CACHE_TTLS.search;
  const expiresAt = now + ttlMs;

  // Level 1: Save to In-Memory Map
  memoryCache.set(key, {
    data,
    expiresAt,
    category,
  });

  // Level 2: Async persist to Supabase map_cache
  if (process.env.DATA_SOURCE !== 'mock') {
    // Fire in background so response latency is not delayed
    Promise.resolve().then(async () => {
      try {
        const admin = createAdminClient();
        await admin.from('map_cache').upsert({
          key,
          data,
          category,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date(now).toISOString(),
        });

        // Trigger periodic DB cleanup in background
        triggerBackgroundDbCleanup(admin);
      } catch {
        // Silently ignore DB errors on cache write
      }
    });
  }
}

/**
 * Deletes a key from both cache tiers
 */
export async function deleteMapCache(key: string): Promise<void> {
  memoryCache.delete(key);

  if (process.env.DATA_SOURCE !== 'mock') {
    try {
      const admin = createAdminClient();
      await admin.from('map_cache').delete().eq('key', key);
    } catch {
      // Ignore
    }
  }
}

// ============================================================================
// Cache Cleanup & Maintenance
// ============================================================================

/**
 * Removes expired records from in-memory cache
 */
export function cleanupExpiredMemoryCache(): number {
  const now = Date.now();
  let deletedCount = 0;

  memoryCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      memoryCache.delete(key);
      deletedCount++;
    }
  });

  return deletedCount;
}

/**
 * Periodically deletes expired cache records from Supabase PostgreSQL
 */
function triggerBackgroundDbCleanup(admin: ReturnType<typeof createAdminClient>): void {
  const now = Date.now();
  if (now - lastDbCleanupTimestamp < DB_CLEANUP_INTERVAL_MS) {
    return;
  }
  lastDbCleanupTimestamp = now;

  Promise.resolve().then(async () => {
    try {
      // First try calling the RPC cleanup function if Subagent 3 created it
      const { error: rpcError } = await admin.rpc('cleanup_expired_map_cache');
      if (rpcError) {
        // Fallback to direct DELETE statement
        await admin
          .from('map_cache')
          .delete()
          .lt('expires_at', new Date().toISOString());
      }
    } catch {
      // Silently ignore cleanup errors
    }
  });
}

/**
 * Returns cache diagnostics for health/admin inspection
 */
export function getMemoryCacheStats() {
  const now = Date.now();
  let active = 0;
  let expired = 0;

  memoryCache.forEach((entry) => {
    if (entry.expiresAt > now) {
      active++;
    } else {
      expired++;
    }
  });

  return {
    totalEntries: memoryCache.size,
    activeEntries: active,
    expiredEntries: expired,
  };
}
