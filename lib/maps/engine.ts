/**
 * KindLink Unified Maps Fallback Engine
 * 
 * Orchestrates:
 * - Cascading fallbacks across Tile, Geocoding, Routing, and Places providers.
 * - Circuit breaker health checks before dispatching requests.
 * - Enforcing a 5-second timeout per provider attempt.
 * - At most 1 retry per provider for transient errors.
 * - Decorating results with degraded execution metadata (isFallback, isDegraded).
 */

import {
  Coordinates,
  EngineExecutionMeta,
  GeocodeOptions,
  GeocodeResult,
  PlaceCategory,
  PlaceResult,
  PlacesOptions,
  ProviderCategory,
  ProviderStatus,
  RouteOptions,
  RouteResult,
  TileProviderConfig,
  TravelMode,
} from './types';
import { circuitBreaker } from './circuit-breaker';
import { mapTilerTileProvider } from './adapters/maptiler-tile';
import { osmTileProvider } from './adapters/osm-tile';
import { geoapifyGeocodeProvider } from './adapters/geoapify-geocode';
import { photonGeocodeProvider } from './adapters/photon-geocode';
import { nominatimGeocodeProvider } from './adapters/nominatim-geocode';
import { geoapifyPlacesProvider } from './adapters/geoapify-places';
import { overpassPlacesProvider } from './adapters/overpass-places';
import { orsRouteProvider } from './adapters/ors-route';
import { geoapifyRouteProvider } from './adapters/geoapify-route';
import { osrmRouteProvider } from './adapters/osrm-route';
import { straightLineRouteProvider } from './adapters/straight-line-route';
import { ASANSOL_CURATED_MEDICAL_HUBS } from '@/lib/geo/hospitals';
import { calculateDistance } from '@/lib/data/distance';

export const DEFAULT_TIMEOUT_MS = 5000; // 5-second short timeout per attempt
export const MAX_RETRIES_PER_PROVIDER = 1; // at most 1 retry (2 attempts total)

interface ProviderTask<T> {
  providerId: string;
  category: ProviderCategory;
  isConfigured: () => boolean;
  execute: (signal: AbortSignal) => Promise<T>;
}

export class MapsFallbackEngine {
  /**
   * 1. Tile Provider Cascade:
   * MapTiler (if configured) -> OSM Standard Tile Provider
   */
  public getTileConfig(options?: { style?: string; theme?: 'light' | 'dark' }): {
    config: TileProviderConfig;
    meta: EngineExecutionMeta;
  } {
    const attempted: string[] = [];

    // Check MapTiler
    if (mapTilerTileProvider.isConfigured()) {
      attempted.push('maptiler');
      if (circuitBreaker.canExecute('maptiler', 'tile')) {
        return {
          config: mapTilerTileProvider.getTileConfig(options),
          meta: {
            sourceProvider: 'maptiler',
            isFallback: false,
            isDegraded: false,
            attemptedProviders: attempted,
          },
        };
      }
    }

    // Fallback to OSM
    attempted.push('osm');
    return {
      config: osmTileProvider.getTileConfig(options),
      meta: {
        sourceProvider: 'osm',
        isFallback: attempted.length > 1 || !mapTilerTileProvider.isConfigured(),
        isDegraded: false,
        attemptedProviders: attempted,
        fallbackReason: 'MapTiler not configured or circuit breaker open',
      },
    };
  }

  /**
   * 2. Geocoding Autocomplete Cascade:
   * Geoapify (if configured) -> Photon
   * (OSM Nominatim strictly excluded from autocomplete to respect policy)
   */
  public async autocomplete(
    query: string,
    options?: GeocodeOptions
  ): Promise<{ results: GeocodeResult[]; meta: EngineExecutionMeta }> {
    const tasks: ProviderTask<GeocodeResult[]>[] = [
      {
        providerId: 'geoapify',
        category: 'geocode',
        isConfigured: () => geoapifyGeocodeProvider.isConfigured(),
        execute: (signal) => geoapifyGeocodeProvider.autocomplete(query, { ...options, signal }),
      },
      {
        providerId: 'photon',
        category: 'geocode',
        isConfigured: () => photonGeocodeProvider.isConfigured(),
        execute: (signal) => photonGeocodeProvider.autocomplete(query, { ...options, signal }),
      },
    ];

    const { result, meta } = await this.runCascade(tasks, options?.timeoutMs, options?.signal);
    const results = result.map((r) => ({
      ...r,
      isFallback: meta.isFallback,
      isDegraded: meta.isDegraded,
      sourceProvider: meta.sourceProvider,
    }));

    return { results, meta };
  }

  /**
   * 3. Geocoding Search Cascade:
   * Geoapify (if configured) -> Photon -> Nominatim (1 req/s queue)
   */
  public async geocode(
    query: string,
    options?: GeocodeOptions
  ): Promise<{ results: GeocodeResult[]; meta: EngineExecutionMeta }> {
    const tasks: ProviderTask<GeocodeResult[]>[] = [
      {
        providerId: 'geoapify',
        category: 'geocode',
        isConfigured: () => geoapifyGeocodeProvider.isConfigured(),
        execute: (signal) => geoapifyGeocodeProvider.search(query, { ...options, signal }),
      },
      {
        providerId: 'photon',
        category: 'geocode',
        isConfigured: () => photonGeocodeProvider.isConfigured(),
        execute: (signal) => photonGeocodeProvider.search(query, { ...options, signal }),
      },
      {
        providerId: 'nominatim',
        category: 'geocode',
        isConfigured: () => nominatimGeocodeProvider.isConfigured(),
        execute: (signal) => nominatimGeocodeProvider.search(query, { ...options, signal }),
      },
    ];

    const { result, meta } = await this.runCascade(tasks, options?.timeoutMs, options?.signal);
    const results = result.map((r) => ({
      ...r,
      isFallback: meta.isFallback,
      isDegraded: meta.isDegraded,
      sourceProvider: meta.sourceProvider,
    }));

    return { results, meta };
  }

  /**
   * 4. Reverse Geocoding Cascade:
   * Geoapify (if configured) -> Photon -> Nominatim
   */
  public async reverseGeocode(
    lat: number,
    lng: number,
    options?: GeocodeOptions
  ): Promise<{ result: GeocodeResult | null; meta: EngineExecutionMeta }> {
    const tasks: ProviderTask<GeocodeResult | null>[] = [
      {
        providerId: 'geoapify',
        category: 'geocode',
        isConfigured: () => geoapifyGeocodeProvider.isConfigured(),
        execute: (signal) => geoapifyGeocodeProvider.reverse(lat, lng, { ...options, signal }),
      },
      {
        providerId: 'photon',
        category: 'geocode',
        isConfigured: () => photonGeocodeProvider.isConfigured(),
        execute: (signal) => photonGeocodeProvider.reverse(lat, lng, { ...options, signal }),
      },
      {
        providerId: 'nominatim',
        category: 'geocode',
        isConfigured: () => nominatimGeocodeProvider.isConfigured(),
        execute: (signal) => nominatimGeocodeProvider.reverse(lat, lng, { ...options, signal }),
      },
    ];

    const { result, meta } = await this.runCascade(tasks, options?.timeoutMs, options?.signal);
    if (!result) {
      return { result: null, meta };
    }

    const decorated: GeocodeResult = {
      ...result,
      isFallback: meta.isFallback,
      isDegraded: meta.isDegraded,
      sourceProvider: meta.sourceProvider,
    };

    return { result: decorated, meta };
  }

  /**
   * 5. Routing Cascade:
   * OpenRouteService (if configured) -> Geoapify (if configured) -> OSRM -> Straight-line geodesic
   */
  public async calculateRoute(
    origin: Coordinates,
    destination: Coordinates,
    mode: TravelMode = 'bike',
    options?: RouteOptions
  ): Promise<RouteResult> {
    const tasks: ProviderTask<RouteResult>[] = [
      {
        providerId: 'openrouteservice',
        category: 'route',
        isConfigured: () => orsRouteProvider.isConfigured(),
        execute: (signal) => orsRouteProvider.route(origin, destination, mode, { ...options, signal }),
      },
      {
        providerId: 'geoapify-route',
        category: 'route',
        isConfigured: () => geoapifyRouteProvider.isConfigured(),
        execute: (signal) => geoapifyRouteProvider.route(origin, destination, mode, { ...options, signal }),
      },
      {
        providerId: 'osrm-route',
        category: 'route',
        isConfigured: () => osrmRouteProvider.isConfigured(),
        execute: (signal) => osrmRouteProvider.route(origin, destination, mode, { ...options, signal }),
      },
      {
        providerId: 'straight-line',
        category: 'route',
        isConfigured: () => straightLineRouteProvider.isConfigured(),
        execute: (signal) =>
          straightLineRouteProvider.route(origin, destination, mode, { ...options, signal }),
      },
    ];

    const { result, meta } = await this.runCascade(tasks, options?.timeoutMs, options?.signal);

    return {
      ...result,
      sourceProvider: meta.sourceProvider,
      isFallback: meta.isFallback,
      isDegraded: meta.isDegraded || result.sourceProvider === 'straight-line',
    };
  }

  /**
   * 6. Nearby Healthcare Amenities Cascade:
   * Geoapify Places (if configured) -> Overpass API (with 3 public mirrors) -> Curated Asansol medical hubs
   */
  public async findNearbyPlaces(
    lat: number,
    lng: number,
    radiusMeters: number = 8000,
    category: PlaceCategory = 'all',
    options?: PlacesOptions
  ): Promise<{ results: PlaceResult[]; meta: EngineExecutionMeta }> {
    const tasks: ProviderTask<PlaceResult[]>[] = [
      {
        providerId: 'geoapify-places',
        category: 'places',
        isConfigured: () => geoapifyPlacesProvider.isConfigured(),
        execute: (signal) =>
          geoapifyPlacesProvider.findNearby(lat, lng, radiusMeters, category, { ...options, signal }),
      },
      {
        providerId: 'overpass-places',
        category: 'places',
        isConfigured: () => overpassPlacesProvider.isConfigured(),
        execute: (signal) =>
          overpassPlacesProvider.findNearby(lat, lng, radiusMeters, category, { ...options, signal }),
      },
      {
        providerId: 'curated-offline',
        category: 'places',
        isConfigured: () => true,
        execute: async () => this.getCuratedPlacesFallback(lat, lng, category, options?.limit || 15),
      },
    ];

    const { result, meta } = await this.runCascade(tasks, options?.timeoutMs, options?.signal);
    const results = result.map((p) => ({
      ...p,
      isFallback: meta.isFallback,
      isDegraded: meta.isDegraded || meta.sourceProvider === 'curated-offline',
      sourceProvider: meta.sourceProvider,
    }));

    return { results, meta };
  }

  public getProviderStatuses(): ProviderStatus[] {
    return circuitBreaker.getAllStatuses();
  }

  public resetCircuitBreaker(providerId?: string): void {
    circuitBreaker.reset(providerId);
  }

  /**
   * Generic cascade executor implementing:
   * 1. Skipping unconfigured providers
   * 2. Circuit breaker check
   * 3. 5-second timeout per attempt
   * 4. At most 1 retry per provider on transient failures (unless HTTP 429)
   * 5. Fallback tracking and degraded metadata calculation
   */
  private async runCascade<T>(
    tasks: ProviderTask<T>[],
    timeoutMs = DEFAULT_TIMEOUT_MS,
    parentSignal?: AbortSignal
  ): Promise<{ result: T; meta: EngineExecutionMeta }> {
    const attemptedProviders: string[] = [];
    let firstConfiguredProviderId: string | null = null;
    let lastError: unknown = null;
    const startTime = Date.now();

    for (const task of tasks) {
      if (!task.isConfigured()) {
        continue;
      }

      if (!firstConfiguredProviderId) {
        firstConfiguredProviderId = task.providerId;
      }

      attemptedProviders.push(task.providerId);

      // Check circuit breaker
      if (!circuitBreaker.canExecute(task.providerId, task.category)) {
        continue;
      }

      // Execute with at most MAX_RETRIES_PER_PROVIDER retries
      let attempt = 0;
      while (attempt <= MAX_RETRIES_PER_PROVIDER) {
        attempt += 1;

        // Compose AbortController with timeout and parent signal
        const controller = new AbortController();
        const timer = setTimeout(() => {
          controller.abort(new Error(`Timeout after ${timeoutMs}ms for provider ${task.providerId}`));
        }, timeoutMs);

        const onParentAbort = () => controller.abort();
        if (parentSignal) {
          parentSignal.addEventListener('abort', onParentAbort, { once: true });
        }

        try {
          const res = await task.execute(controller.signal);
          clearTimeout(timer);
          if (parentSignal) {
            parentSignal.removeEventListener('abort', onParentAbort);
          }

          circuitBreaker.recordSuccess(task.providerId, task.category);

          const isFallback = task.providerId !== firstConfiguredProviderId;
          const isDegraded =
            task.providerId === 'straight-line' || task.providerId === 'curated-offline';

          return {
            result: res,
            meta: {
              sourceProvider: task.providerId,
              isFallback,
              isDegraded,
              latencyMs: Date.now() - startTime,
              attemptedProviders,
              fallbackReason: isFallback ? `Fallback after primary provider` : undefined,
            },
          };
        } catch (err: unknown) {
          clearTimeout(timer);
          if (parentSignal) {
            parentSignal.removeEventListener('abort', onParentAbort);
          }

          lastError = err;
          const errObj = (err && typeof err === 'object' ? err : {}) as Record<string, unknown>;
          const isHttp429 = errObj.status === 429;

          // If rate limited (HTTP 429), trip circuit breaker immediately and do not retry
          if (isHttp429) {
            circuitBreaker.recordFailure(task.providerId, err, task.category);
            break;
          }

          // If more retries allowed, do a tiny backoff before retrying
          if (attempt <= MAX_RETRIES_PER_PROVIDER) {
            await new Promise((resolve) => setTimeout(resolve, 150));
            continue;
          }

          // All attempts failed for this provider
          circuitBreaker.recordFailure(task.providerId, err, task.category);
          break;
        }
      }
    }

    throw (
      lastError ||
      new Error(`All maps providers failed in cascade: [${attemptedProviders.join(', ')}]`)
    );
  }

  private getCuratedPlacesFallback(
    lat: number,
    lng: number,
    category: PlaceCategory,
    limit: number
  ): PlaceResult[] {
    const filtered = ASANSOL_CURATED_MEDICAL_HUBS.filter((h) => {
      // Only return curated offline fallback if coordinates are actually near the curated area (within 35 km)
      const dist = calculateDistance(lat, lng, h.latitude, h.longitude);
      if (dist > 35) return false;

      if (category === 'all' || category === 'healthcare') return true;
      if (category === 'emergency') return h.emergency || h.type === 'hospital';
      return h.type === category;
    });

    return filtered
      .map((h, idx) => ({
        id: `curated-${h.id || idx}`,
        name: h.name,
        category: h.type,
        lat: h.latitude,
        lng: h.longitude,
        address: h.address,
        phone: h.phone,
        distanceKm: calculateDistance(lat, lng, h.latitude, h.longitude),
        openingHours: h.openingHours,
        emergency: h.emergency,
        sourceProvider: 'curated-offline',
        isFallback: true,
        isDegraded: true,
      }))
      .sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0))
      .slice(0, limit);
  }
}

export const mapsFallbackEngine = new MapsFallbackEngine();
