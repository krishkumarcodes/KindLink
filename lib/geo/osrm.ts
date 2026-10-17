/**
 * KindLink Road Routing & Distance Engine
 * Rewired to call /api/maps/route proxy with cascade through OpenRouteService,
 * Geoapify, OSRM, and straight-line geodesic fallback.
 * Includes in-memory & localStorage caching, in-flight deduplication, and
 * fallback/degraded straight-line labeling ("about X km, straight line").
 */

import { calculateDistance, calculateETA, formatETA } from '@/lib/data/distance';
import { TravelMode } from '@/lib/data/types';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RoadRouteResult {
  distanceKm: number;
  durationMinutes: number;
  formattedText: string; // e.g. "3.2 km, about 9 min by bike" or "about 4.5 km, straight line"
  coordinates: [number, number][]; // [lat, lng] array ready for Leaflet Polyline
  source: 'osrm' | 'straight-line' | 'ors' | 'geoapify' | 'road';
  mode: TravelMode;
  sourceProvider?: string;
  isFallback?: boolean;
  isDegraded?: boolean;
}

interface CacheEntry {
  data: RoadRouteResult;
  timestamp: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const STORAGE_PREFIX = 'kindlink_maps_route_';
const LEGACY_STORAGE_PREFIX = 'kindlink_osrm_cache_';
const IN_FLIGHT_REQUESTS = new Map<string, Promise<RoadRouteResult>>();

function getCacheKey(origin: LatLng, destination: LatLng, mode: TravelMode): string {
  // Round to ~110m (3 decimals) to maximize cache hits while remaining navigation-accurate
  const oLat = origin.lat.toFixed(3);
  const oLng = origin.lng.toFixed(3);
  const dLat = destination.lat.toFixed(3);
  const dLng = destination.lng.toFixed(3);
  return `${oLat},${oLng}->${dLat},${dLng}:${mode}`;
}

function getFromCache(key: string): RoadRouteResult | null {
  const now = Date.now();
  const mem = MEMORY_CACHE.get(key);
  if (mem && now - mem.timestamp < CACHE_TTL_MS) {
    return mem.data;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          MEMORY_CACHE.set(key, parsed);
          return parsed.data;
        }
      }

      // Check legacy cache
      const legacyRaw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${key}`);
      if (legacyRaw) {
        const parsedLegacy: CacheEntry = JSON.parse(legacyRaw);
        if (now - parsedLegacy.timestamp < CACHE_TTL_MS) {
          MEMORY_CACHE.set(key, parsedLegacy);
          return parsedLegacy.data;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return null;
}

function saveToCache(key: string, data: RoadRouteResult): void {
  const entry: CacheEntry = { data, timestamp: Date.now() };
  MEMORY_CACHE.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Ignore quota exceptions
    }
  }
}

/**
 * Creates straight-line fallback route when route calculation is degraded or offline
 */
export function getStraightLineFallback(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode = 'bike'
): RoadRouteResult {
  const dist = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const duration = calculateETA(dist, mode);
  const roundedDist = Math.round(dist * 10) / 10;

  return {
    distanceKm: roundedDist,
    durationMinutes: Math.max(1, duration),
    formattedText: `about ${roundedDist.toFixed(1)} km, straight line`,
    coordinates: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
    source: 'straight-line',
    mode,
    sourceProvider: 'straight-line',
    isFallback: true,
    isDegraded: true,
  };
}

/**
 * Fetch road route from /api/maps/route or fall back gracefully to straight line.
 * If fallback or degraded, returns the standardized "about X km, straight line" label.
 */
export async function getRoadRoute(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode = 'bike'
): Promise<RoadRouteResult> {
  // Validate coordinates
  if (
    !origin ||
    !destination ||
    isNaN(origin.lat) ||
    isNaN(origin.lng) ||
    isNaN(destination.lat) ||
    isNaN(destination.lng)
  ) {
    return getStraightLineFallback(
      origin || { lat: 23.6889, lng: 86.9661 },
      destination || { lat: 23.6889, lng: 86.9661 },
      mode
    );
  }

  // Quick return if origin and destination are virtually identical (< 50m)
  const directDist = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  if (directDist < 0.05) {
    return {
      distanceKm: Math.round(directDist * 10) / 10,
      durationMinutes: 1,
      formattedText: 'At location (< 50m)',
      coordinates: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      source: 'straight-line',
      mode,
      sourceProvider: 'immediate',
      isFallback: false,
      isDegraded: false,
    };
  }

  const cacheKey = getCacheKey(origin, destination, mode);
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  // Deduplicate concurrent in-flight requests for the exact same route
  const existingInFlight = IN_FLIGHT_REQUESTS.get(cacheKey);
  if (existingInFlight) {
    return existingInFlight;
  }

  const fetchPromise = (async (): Promise<RoadRouteResult> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const params = new URLSearchParams({
        originLat: origin.lat.toFixed(5),
        originLng: origin.lng.toFixed(5),
        destLat: destination.lat.toFixed(5),
        destLng: destination.lng.toFixed(5),
        mode,
      });

      const res = await fetch(`/api/maps/route?${params.toString()}`, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Route API returned HTTP ${res.status}`);
      }

      const payload = await res.json();
      const routeData = payload.route || payload.data || payload;

      const isFallback = Boolean(routeData.isFallback);
      const isDegraded = Boolean(routeData.isDegraded);
      const distanceKm =
        typeof routeData.distanceKm === 'number'
          ? Math.round(routeData.distanceKm * 10) / 10
          : Math.round(directDist * 10) / 10;

      const durationMinutes =
        typeof routeData.durationMinutes === 'number'
          ? Math.max(1, Math.round(routeData.durationMinutes))
          : calculateETA(distanceKm, mode);

      const rawCoords: [number, number][] = Array.isArray(routeData.coordinates)
        ? routeData.coordinates
        : [];

      // Ensure at least origin and destination are present
      const coordinates: [number, number][] =
        rawCoords.length >= 2
          ? rawCoords
          : [
              [origin.lat, origin.lng],
              [destination.lat, destination.lng],
            ];

      const sourceProvider = routeData.sourceProvider || 'road';
      const isStraight = isFallback || isDegraded || sourceProvider === 'straight-line';

      const modeLabel = mode === 'walking' ? 'foot' : mode;
      // If fallback or degraded, show straight-line label ("about X km, straight line")
      const formattedText = isStraight
        ? `about ${distanceKm.toFixed(1)} km, straight line`
        : routeData.formattedText ||
          `${distanceKm.toFixed(1)} km, about ${formatETA(durationMinutes)} by ${modeLabel}`;

      const result: RoadRouteResult = {
        distanceKm,
        durationMinutes,
        formattedText,
        coordinates,
        source: isStraight ? 'straight-line' : 'osrm',
        mode,
        sourceProvider,
        isFallback,
        isDegraded,
      };

      saveToCache(cacheKey, result);
      return result;
    } catch {
      clearTimeout(timeoutId);
      const fallback = getStraightLineFallback(origin, destination, mode);
      saveToCache(cacheKey, fallback);
      return fallback;
    } finally {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
    }
  })();

  IN_FLIGHT_REQUESTS.set(cacheKey, fetchPromise);
  return fetchPromise;
}
