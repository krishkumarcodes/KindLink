/**
 * KindLink Reverse Geocoding Utility
 * Rewired to call /api/maps/reverse with server-side provider fallbacks,
 * in-memory & localStorage caching, localized fallback for offline or throttled environments,
 * and strict movement rate-throttling (>150m moved AND >30s elapsed).
 */

export interface GeocodedLocation {
  displayName: string;
  shortLabel: string;
  neighborhood?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  sourceProvider?: string;
  isFallback?: boolean;
  isDegraded?: boolean;
}

export interface ReverseGeocodeOptions {
  force?: boolean;
  signal?: AbortSignal;
}

interface CacheEntry {
  data: GeocodedLocation;
  timestamp: number;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCAL_STORAGE_PREFIX = 'kindlink_maps_reverse_';
const LEGACY_STORAGE_PREFIX = 'kindlink_geo_cache_';

// Rate throttle tracking: Only trigger if user moved > 150m and > 30s have elapsed
let lastReverseExecution: {
  lat: number;
  lng: number;
  timestamp: number;
  result: GeocodedLocation;
} | null = null;

// Known landmark references for fallback when offline or /api/maps/reverse is unreachable
export const LOCAL_FALLBACK_LANDMARKS = [
  { name: 'Kalyanpur, Asansol', lat: 23.6889, lng: 86.9661, maxDistKm: 3 },
  { name: 'SB Gorai Road, Asansol', lat: 23.6845, lng: 86.9742, maxDistKm: 2.5 },
  { name: 'Burnpur, Asansol', lat: 23.6642, lng: 86.9388, maxDistKm: 3 },
  { name: 'Ushagram, Asansol', lat: 23.6791, lng: 86.9814, maxDistKm: 2.5 },
  { name: 'HLG Hospital Area, Asansol', lat: 23.7012, lng: 86.9554, maxDistKm: 3 },
  { name: 'City Centre, Durgapur', lat: 23.5385, lng: 87.2941, maxDistKm: 8 },
  { name: 'SNMMCH Area, Dhanbad', lat: 23.8143, lng: 86.4412, maxDistKm: 8 },
  { name: 'Asansol Hub, West Bengal', lat: 23.685, lng: 86.965, maxDistKm: 20 },
];

export function geoDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getFallbackLocation(lat: number, lng: number): GeocodedLocation {
  for (const mark of LOCAL_FALLBACK_LANDMARKS) {
    const dist = geoDistanceKm(lat, lng, mark.lat, mark.lng);
    if (dist <= mark.maxDistKm) {
      return {
        displayName: `${mark.name}, West Bengal, India`,
        shortLabel: mark.name,
        city: 'Asansol',
        state: 'West Bengal',
        country: 'India',
        sourceProvider: 'curated-fallback',
        isFallback: true,
      };
    }
  }

  const rounded = `${lat.toFixed(2)}°N, ${lng.toFixed(2)}°E`;
  return {
    displayName: `${rounded}, Asansol Region`,
    shortLabel: `${rounded}`,
    city: 'Asansol Region',
    state: 'West Bengal',
    country: 'India',
    sourceProvider: 'coordinates-fallback',
    isFallback: true,
  };
}

function getCacheKey(lat: number, lng: number): string {
  // Round to ~110m resolution (3 decimal places) to maximize cache hits
  return `${lat.toFixed(3)},${lng.toFixed(3)}`;
}

function getFromCache(key: string): GeocodedLocation | null {
  const now = Date.now();

  // 1. Check memory cache
  const mem = memoryCache.get(key);
  if (mem && now - mem.timestamp < CACHE_TTL_MS) {
    return mem.data;
  }

  // 2. Check localStorage in browser
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}${key}`);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, parsed);
          return parsed.data;
        }
      }

      // Check legacy cache key
      const legacyRaw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${key}`);
      if (legacyRaw) {
        const parsedLegacy: CacheEntry = JSON.parse(legacyRaw);
        if (now - parsedLegacy.timestamp < CACHE_TTL_MS) {
          memoryCache.set(key, parsedLegacy);
          return parsedLegacy.data;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return null;
}

function saveToCache(key: string, data: GeocodedLocation): void {
  const entry: CacheEntry = { data, timestamp: Date.now() };
  memoryCache.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Ignore localStorage quotas
    }
  }
}

/**
 * Perform reverse geocoding on coordinates using /api/maps/reverse.
 * Rate throttled: Only triggers server calls if user moved > 150m AND > 30s have elapsed
 * (unless force is set or no prior call exists).
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  options: ReverseGeocodeOptions = {}
): Promise<GeocodedLocation> {
  const key = getCacheKey(lat, lng);
  const cached = getFromCache(key);
  if (cached && !options.force) {
    return cached;
  }

  // Rate throttle: Only trigger if user moved > 150m AND > 30s have elapsed
  if (lastReverseExecution && !options.force) {
    const distMeters = geoDistanceKm(lastReverseExecution.lat, lastReverseExecution.lng, lat, lng) * 1000;
    const elapsedSec = (Date.now() - lastReverseExecution.timestamp) / 1000;

    if (distMeters <= 150 || elapsedSec < 30) {
      return lastReverseExecution.result;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  const signal = options.signal || controller.signal;

  try {
    const url = `/api/maps/reverse?lat=${encodeURIComponent(lat.toFixed(5))}&lng=${encodeURIComponent(lng.toFixed(5))}`;

    const res = await fetch(url, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Reverse geocode HTTP ${res.status}`);
    }

    const payload = await res.json();
    const data = payload.location || payload.result || payload;

    const addr = data.address || {};
    const primaryArea =
      data.neighborhood ||
      data.suburb ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.village ||
      addr.road;

    const secondaryArea =
      data.city ||
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.city_district ||
      addr.county;

    let shortLabel = data.shortLabel || '';
    if (!shortLabel) {
      if (primaryArea && secondaryArea && primaryArea !== secondaryArea) {
        shortLabel = `${primaryArea}, ${secondaryArea}`;
      } else if (primaryArea) {
        shortLabel = primaryArea;
      } else if (secondaryArea) {
        shortLabel = secondaryArea;
      } else if (data.name) {
        shortLabel = data.name;
      } else {
        const parts = (data.displayName || data.display_name || '').split(',');
        shortLabel = parts.slice(0, 2).join(',').trim() || 'Neighborhood';
      }
    }

    const result: GeocodedLocation = {
      displayName: data.displayName || data.display_name || shortLabel,
      shortLabel,
      neighborhood: data.neighborhood || addr.neighbourhood,
      suburb: data.suburb || addr.suburb,
      city: data.city || addr.city || addr.town,
      state: data.state || addr.state,
      country: data.country || addr.country,
      sourceProvider: data.sourceProvider || 'api-maps-reverse',
      isFallback: Boolean(data.isFallback),
      isDegraded: Boolean(data.isDegraded),
    };

    saveToCache(key, result);
    lastReverseExecution = {
      lat,
      lng,
      timestamp: Date.now(),
      result,
    };

    return result;
  } catch (err: unknown) {
    clearTimeout(timeoutId);

    if ((err as Error)?.name === 'AbortError') {
      throw err;
    }

    // Graceful fallback to nearest known regional hub
    const fallback = getFallbackLocation(lat, lng);
    saveToCache(key, fallback);
    lastReverseExecution = {
      lat,
      lng,
      timestamp: Date.now(),
      result: fallback,
    };
    return fallback;
  }
}

/**
 * Returns a human-readable area name, e.g. "Kalyanpur, Asansol"
 */
export async function getHumanReadableLocation(lat: number, lng: number): Promise<string> {
  const result = await reverseGeocode(lat, lng);
  return result.shortLabel;
}

/**
 * Utility to clear cached geocode entries
 */
export function clearGeocodeCache(): void {
  memoryCache.clear();
  lastReverseExecution = null;
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(LOCAL_STORAGE_PREFIX) || k.startsWith(LEGACY_STORAGE_PREFIX))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}
