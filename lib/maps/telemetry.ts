/**
 * KindLink Maps Telemetry & Provider Usage Tracker
 * 
 * Provides unified in-memory tracking for:
 * 1. Daily usage per provider against soft limits
 * 2. Cache hit rates and estimated storage statistics
 * 3. Fallback frequency and failure reasons
 * 4. Circuit breaker integration
 * 5. Recent provider warnings & errors log
 */

import { ProviderCategory, CircuitBreakerState } from './types';
import { circuitBreaker } from './circuit-breaker';

export interface ProviderMeta {
  id: string;
  name: string;
  category: ProviderCategory;
  requiresKey: boolean;
  envKey?: string;
  altEnvKey?: string;
  softLimit: number;
  hint: string;
}

export const MAP_PROVIDERS_META: ProviderMeta[] = [
  {
    id: 'maptiler',
    name: 'MapTiler',
    category: 'tile',
    requiresKey: true,
    envKey: 'MAPTILER_API_KEY',
    altEnvKey: 'NEXT_PUBLIC_MAPTILER_API_KEY',
    softLimit: 3300, // ~100k requests/month free tier
    hint: 'Add MAPTILER_API_KEY in .env.local for vector tiles (100k/mo free).',
  },
  {
    id: 'osm',
    name: 'OpenStreetMap',
    category: 'tile',
    requiresKey: false,
    softLimit: 10000,
    hint: 'Default open-source raster tile server (no API key needed).',
  },
  {
    id: 'geoapify',
    name: 'Geoapify',
    category: 'geocode',
    requiresKey: true,
    envKey: 'GEOAPIFY_API_KEY',
    altEnvKey: 'NEXT_PUBLIC_GEOAPIFY_API_KEY',
    softLimit: 3000, // 3,000 credits/day free tier
    hint: 'Add GEOAPIFY_API_KEY in .env.local for address autocomplete & places (3k/day free).',
  },
  {
    id: 'photon',
    name: 'Komoot Photon',
    category: 'geocode',
    requiresKey: false,
    softLimit: 5000,
    hint: 'Public open-source Elasticsearch geocoder based on OSM (no key needed).',
  },
  {
    id: 'nominatim',
    name: 'OSM Nominatim',
    category: 'geocode',
    requiresKey: false,
    softLimit: 2500,
    hint: 'OSM reverse & search engine strictly queued at 1 req/s with contact email (no key needed).',
  },
  {
    id: 'ors',
    name: 'OpenRouteService',
    category: 'route',
    requiresKey: true,
    envKey: 'OPENROUTESERVICE_API_KEY',
    altEnvKey: 'ORS_API_KEY',
    softLimit: 2000, // 2,000 requests/day free tier
    hint: 'Add OPENROUTESERVICE_API_KEY in .env.local for multimodal routing (2k/day free).',
  },
  {
    id: 'osrm',
    name: 'OSRM',
    category: 'route',
    requiresKey: false,
    softLimit: 3000,
    hint: 'Public Open Source Routing Machine for driving & walking directions (no key needed).',
  },
  {
    id: 'overpass',
    name: 'Overpass API',
    category: 'places',
    requiresKey: false,
    softLimit: 1000,
    hint: 'OSM emergency healthcare amenities query engine (no key needed).',
  },
];

export interface ProviderUsageItem {
  id: string;
  name: string;
  category: ProviderCategory;
  requiresKey: boolean;
  isConfigured: boolean;
  status: 'working' | 'configured' | 'needs key' | 'degraded' | 'circuit_open';
  circuitBreakerState: CircuitBreakerState;
  dailyRequests: number;
  dailySoftLimit: number;
  percentUsed: number;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastSuccessTime?: number;
  lastFailureTime?: number;
  lastError?: string;
  hint: string;
}

export interface CacheStatistics {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  hitRatePercent: number;
  inMemoryEntries: number;
  databaseEntries: number;
  estimatedSizeBytes: number;
}

export interface FallbackStatistics {
  totalRequests: number;
  primarySuccesses: number;
  fallbackRequests: number;
  fallbackRatePercent: number;
  reasons: Record<string, number>;
}

export interface ProviderErrorLog {
  timestamp: number;
  providerId: string;
  category: ProviderCategory;
  operation: string;
  errorMessage: string;
  fallbackUsed: boolean;
  fallbackProvider?: string;
}

interface TelemetryStore {
  dayDateString: string;
  providerRequests: Map<string, number>;
  cacheHits: number;
  cacheMisses: number;
  primarySuccesses: number;
  fallbackRequests: number;
  fallbackReasons: Map<string, number>;
  recentErrors: ProviderErrorLog[];
  inMemoryCacheKeys: Set<string>;
}

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

// Global symbol to ensure singleton preservation across Next.js dev server hot-reloads
const GLOBAL_TELEMETRY_KEY = Symbol.for('kindlink.maps.telemetry');

function getGlobalStore(): TelemetryStore {
  const globalObj = globalThis as unknown as { [GLOBAL_TELEMETRY_KEY]?: TelemetryStore };
  if (!globalObj[GLOBAL_TELEMETRY_KEY]) {
    globalObj[GLOBAL_TELEMETRY_KEY] = {
      dayDateString: getTodayString(),
      providerRequests: new Map<string, number>(),
      cacheHits: 0,
      cacheMisses: 0,
      primarySuccesses: 0,
      fallbackRequests: 0,
      fallbackReasons: new Map<string, number>(),
      recentErrors: [],
      inMemoryCacheKeys: new Set<string>(),
    };
  }

  // Daily reset check
  const store = globalObj[GLOBAL_TELEMETRY_KEY]!;
  const today = getTodayString();
  if (store.dayDateString !== today) {
    store.dayDateString = today;
    store.providerRequests.clear();
    store.fallbackReasons.clear();
    store.primarySuccesses = 0;
    store.fallbackRequests = 0;
    // Retain cache keys and recent errors (pruned)
  }

  return store;
}

export class MapsTelemetry {
  /**
   * Checks whether a provider has required keys configured in environment
   */
  public isConfigured(providerId: string): boolean {
    const meta = MAP_PROVIDERS_META.find((p) => p.id === providerId);
    if (!meta) return false;
    if (!meta.requiresKey) return true;

    const val1 = meta.envKey ? process.env[meta.envKey] : undefined;
    const val2 = meta.altEnvKey ? process.env[meta.altEnvKey] : undefined;
    return Boolean((val1 && val1.trim()) || (val2 && val2.trim()));
  }

  /**
   * Records provider execution
   */
  public recordCall(params: {
    providerId: string;
    category: ProviderCategory;
    operation: string;
    success: boolean;
    isFallback?: boolean;
    fallbackReason?: string;
    fallbackProvider?: string;
    error?: unknown;
    latencyMs?: number;
  }): void {
    const store = getGlobalStore();
    const { providerId, category, operation, success, isFallback, fallbackReason, fallbackProvider, error } = params;

    // Increment provider daily requests
    const current = store.providerRequests.get(providerId) || 0;
    store.providerRequests.set(providerId, current + 1);

    if (isFallback) {
      store.fallbackRequests += 1;
      const reasonKey = fallbackReason || 'provider_error';
      const reasonCount = store.fallbackReasons.get(reasonKey) || 0;
      store.fallbackReasons.set(reasonKey, reasonCount + 1);
    } else if (success) {
      store.primarySuccesses += 1;
    }

    if (success) {
      circuitBreaker.recordSuccess(providerId, category);
    } else {
      circuitBreaker.recordFailure(providerId, error, category);
      
      const errorMessage =
        error instanceof Error
          ? error.message
          : typeof error === 'string'
          ? error
          : 'Unknown map provider error';

      const errorEntry: ProviderErrorLog = {
        timestamp: Date.now(),
        providerId,
        category,
        operation,
        errorMessage,
        fallbackUsed: Boolean(isFallback || fallbackProvider),
        fallbackProvider,
      };

      store.recentErrors.unshift(errorEntry);
      if (store.recentErrors.length > 50) {
        store.recentErrors.pop();
      }
    }
  }

  /**
   * Records a cache hit or miss
   */
  public recordCacheAccess(hit: boolean, cacheKey?: string): void {
    const store = getGlobalStore();
    if (hit) {
      store.cacheHits += 1;
    } else {
      store.cacheMisses += 1;
    }
    if (cacheKey) {
      store.inMemoryCacheKeys.add(cacheKey);
      if (store.inMemoryCacheKeys.size > 5000) {
        // Simple size cap
        const first = store.inMemoryCacheKeys.values().next().value;
        if (first) store.inMemoryCacheKeys.delete(first);
      }
    }
  }

  /**
   * Computes status and usage for each provider against daily soft limits
   */
  public getProvidersUsage(): ProviderUsageItem[] {
    const store = getGlobalStore();

    return MAP_PROVIDERS_META.map((meta) => {
      const configured = this.isConfigured(meta.id);
      const cbStatus = circuitBreaker.getStatus(meta.id, meta.category);
      const dailyReq = store.providerRequests.get(meta.id) || 0;
      const percentUsed = Math.min(100, Math.round((dailyReq / meta.softLimit) * 100));

      let status: ProviderUsageItem['status'] = 'configured';
      if (!configured && meta.requiresKey) {
        status = 'needs key';
      } else if (cbStatus.state === 'open') {
        status = 'circuit_open';
      } else if (cbStatus.consecutiveFailures > 0) {
        status = 'degraded';
      } else if (cbStatus.totalSuccesses > 0 && cbStatus.consecutiveFailures === 0) {
        status = 'working';
      } else {
        status = 'configured';
      }

      return {
        id: meta.id,
        name: meta.name,
        category: meta.category,
        requiresKey: meta.requiresKey,
        isConfigured: configured,
        status,
        circuitBreakerState: cbStatus.state,
        dailyRequests: dailyReq,
        dailySoftLimit: meta.softLimit,
        percentUsed,
        consecutiveFailures: cbStatus.consecutiveFailures,
        totalFailures: cbStatus.totalFailures,
        totalSuccesses: cbStatus.totalSuccesses,
        lastSuccessTime: cbStatus.lastSuccessTime,
        lastFailureTime: cbStatus.lastFailureTime,
        lastError: cbStatus.lastError,
        hint: meta.hint,
      };
    });
  }

  /**
   * Returns cache metrics
   */
  public getCacheStatistics(dbCount = 0): CacheStatistics {
    const store = getGlobalStore();
    const total = store.cacheHits + store.cacheMisses;
    const hitRate = total > 0 ? Math.round((store.cacheHits / total) * 100) : 0;
    const inMemCount = store.inMemoryCacheKeys.size;
    // Estimate ~1.2 KB average per cached response entry
    const estimatedSizeBytes = (inMemCount + dbCount) * 1200;

    return {
      totalQueries: total,
      cacheHits: store.cacheHits,
      cacheMisses: store.cacheMisses,
      hitRatePercent: hitRate,
      inMemoryEntries: inMemCount,
      databaseEntries: dbCount,
      estimatedSizeBytes,
    };
  }

  /**
   * Returns fallback rate and reason breakdown
   */
  public getFallbackStatistics(): FallbackStatistics {
    const store = getGlobalStore();
    const total = store.primarySuccesses + store.fallbackRequests;
    const fallbackRate = total > 0 ? Math.round((store.fallbackRequests / total) * 100) : 0;

    const reasons: Record<string, number> = {};
    store.fallbackReasons.forEach((count, r) => {
      reasons[r] = count;
    });

    return {
      totalRequests: total,
      primarySuccesses: store.primarySuccesses,
      fallbackRequests: store.fallbackRequests,
      fallbackRatePercent: fallbackRate,
      reasons,
    };
  }

  /**
   * Returns recent error logs (safe, without API keys)
   */
  public getRecentErrors(limit = 20): ProviderErrorLog[] {
    const store = getGlobalStore();
    return store.recentErrors.slice(0, limit);
  }

  /**
   * Returns whether any optional keys are missing
   */
  public getMissingOptionalKeys(): Array<{ id: string; name: string; envKey: string; hint: string }> {
    return MAP_PROVIDERS_META.filter((p) => p.requiresKey && !this.isConfigured(p.id)).map((p) => ({
      id: p.id,
      name: p.name,
      envKey: p.envKey || 'API_KEY',
      hint: p.hint,
    }));
  }
}

export const mapsTelemetry = new MapsTelemetry();
