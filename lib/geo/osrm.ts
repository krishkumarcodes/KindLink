/**
 * KindLink OSRM Road Routing & Distance Engine
 * Computes actual road geometry, driving/cycling/walking distances and durations
 * using the public Open Source Routing Machine (OSRM) API.
 * Includes in-memory & localStorage caching, in-flight deduplication, and
 * graceful straight-line geodesic fallback.
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
  formattedText: string; // e.g. "3.2 km, about 9 min by bike"
  coordinates: [number, number][]; // [lat, lng] array ready for Leaflet Polyline
  source: 'osrm' | 'straight-line';
  mode: TravelMode;
}

interface CacheEntry {
  data: RoadRouteResult;
  timestamp: number;
}

const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const STORAGE_PREFIX = 'kindlink_osrm_cache_';
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
 * Creates straight-line fallback route when OSRM is offline or unreachable
 */
export function getStraightLineFallback(
  origin: LatLng,
  destination: LatLng,
  mode: TravelMode = 'bike'
): RoadRouteResult {
  const dist = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  const duration = calculateETA(dist, mode);
  const modeLabel = mode === 'walking' ? 'foot' : mode;

  return {
    distanceKm: dist,
    durationMinutes: duration,
    formattedText: `${dist.toFixed(1)} km (direct), about ${formatETA(duration)} by ${modeLabel}`,
    coordinates: [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ],
    source: 'straight-line',
    mode,
  };
}

/**
 * Fetch road route from OSRM API or fall back to straight line
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

  // Quick return if origin and destination are virtually identical
  const directDist = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
  if (directDist < 0.05) {
    return {
      distanceKm: directDist,
      durationMinutes: 1,
      formattedText: 'At location (< 50m)',
      coordinates: [
        [origin.lat, origin.lng],
        [destination.lat, destination.lng],
      ],
      source: 'straight-line',
      mode,
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

  const fetchPromise = (async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      // The public project-osrm.org router provides standard driving network.
      // We calculate realistic mode durations (bike: 15 km/h, walk: 5 km/h, car: OSRM duration).
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng.toFixed(6)},${origin.lat.toFixed(6)};${destination.lng.toFixed(6)},${destination.lat.toFixed(6)}?overview=full&geometries=geojson`;

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`OSRM HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.code !== 'Ok' || !data.routes || !data.routes.length) {
        throw new Error('OSRM No route found');
      }

      const primaryRoute = data.routes[0];
      const roadDistanceKm = Math.round((primaryRoute.distance / 1000) * 10) / 10;

      // Calculate duration according to travel mode
      let durationMinutes = 1;
      if (mode === 'car') {
        durationMinutes = Math.max(1, Math.round(primaryRoute.duration / 60));
      } else {
        durationMinutes = calculateETA(roadDistanceKm, mode);
      }

      // GeoJSON coordinates in OSRM are [lng, lat], convert to Leaflet's [lat, lng]
      const rawCoords: [number, number][] = primaryRoute.geometry.coordinates || [];
      const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);

      // If OSRM returned too few points, ensure origin and destination are present
      if (coordinates.length < 2) {
        coordinates.unshift([origin.lat, origin.lng]);
        coordinates.push([destination.lat, destination.lng]);
      }

      const modeLabel = mode === 'walking' ? 'foot' : mode;
      const formattedText = `${roadDistanceKm.toFixed(1)} km, about ${formatETA(durationMinutes)} by ${modeLabel}`;

      const result: RoadRouteResult = {
        distanceKm: roadDistanceKm,
        durationMinutes,
        formattedText,
        coordinates,
        source: 'osrm',
        mode,
      };

      saveToCache(cacheKey, result);
      return result;
    } catch {
      clearTimeout(timeoutId);
      const fallback = getStraightLineFallback(origin, destination, mode);
      // Cache fallback with short-lived TTL to avoid spamming failed endpoint
      saveToCache(cacheKey, fallback);
      return fallback;
    } finally {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
    }
  })();

  IN_FLIGHT_REQUESTS.set(cacheKey, fetchPromise);
  return fetchPromise;
}
