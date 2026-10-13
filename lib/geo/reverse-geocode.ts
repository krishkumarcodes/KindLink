/**
 * KindLink Reverse Geocoding Utility
 * Uses OpenStreetMap Nominatim with in-memory & localStorage caching,
 * timeout guards, and localized fallback for offline or throttled environments.
 */

export interface GeocodedLocation {
  displayName: string;
  shortLabel: string;
  neighborhood?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
}

interface CacheEntry {
  data: GeocodedLocation;
  timestamp: number;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOCAL_STORAGE_PREFIX = 'kindlink_geo_cache_';

// Known landmark references for fallback when offline or Nominatim is unreachable
const LOCAL_FALLBACK_LANDMARKS = [
  { name: 'Kalyanpur, Asansol', lat: 23.6889, lng: 86.9661, maxDistKm: 3 },
  { name: 'SB Gorai Road, Asansol', lat: 23.6845, lng: 86.9742, maxDistKm: 2.5 },
  { name: 'Burnpur, Asansol', lat: 23.6642, lng: 86.9388, maxDistKm: 3 },
  { name: 'Ushagram, Asansol', lat: 23.6791, lng: 86.9814, maxDistKm: 2.5 },
  { name: 'HLG Hospital Area, Asansol', lat: 23.7012, lng: 86.9554, maxDistKm: 3 },
  { name: 'City Centre, Durgapur', lat: 23.5385, lng: 87.2941, maxDistKm: 8 },
  { name: 'SNMMCH Area, Dhanbad', lat: 23.8143, lng: 86.4412, maxDistKm: 8 },
  { name: 'Asansol Hub, West Bengal', lat: 23.685, lng: 86.965, maxDistKm: 20 },
];

function haversineDistKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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

function getFallbackLocation(lat: number, lng: number): GeocodedLocation {
  for (const mark of LOCAL_FALLBACK_LANDMARKS) {
    const dist = haversineDistKm(lat, lng, mark.lat, mark.lng);
    if (dist <= mark.maxDistKm) {
      return {
        displayName: `${mark.name}, West Bengal, India`,
        shortLabel: mark.name,
        city: 'Asansol',
        state: 'West Bengal',
        country: 'India',
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
 * Perform reverse geocoding on coordinates using OpenStreetMap Nominatim.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedLocation> {
  const key = getCacheKey(lat, lng);
  const cached = getFromCache(key);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
      lat
    )}&lon=${encodeURIComponent(lng)}&zoom=16&addressdetails=1`;

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept-Language': 'en, hi, bn',
        'User-Agent': 'KindLink-Mutual-Aid/1.0 (https://kindlink.org)',
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Nominatim HTTP ${res.status}`);
    }

    const data = await res.json();
    const addr = data.address || {};

    const primaryArea =
      addr.suburb ||
      addr.neighbourhood ||
      addr.residential ||
      addr.village ||
      addr.road ||
      addr.quarter ||
      addr.hamlet;

    const secondaryArea =
      addr.city ||
      addr.town ||
      addr.municipality ||
      addr.city_district ||
      addr.county ||
      addr.state_district;

    let shortLabel = '';
    if (primaryArea && secondaryArea && primaryArea !== secondaryArea) {
      shortLabel = `${primaryArea}, ${secondaryArea}`;
    } else if (primaryArea) {
      shortLabel = primaryArea;
    } else if (secondaryArea) {
      shortLabel = secondaryArea;
    } else if (data.name) {
      shortLabel = data.name;
    } else {
      const parts = (data.display_name || '').split(',');
      shortLabel = parts.slice(0, 2).join(',').trim() || 'Neighborhood';
    }

    const result: GeocodedLocation = {
      displayName: data.display_name || shortLabel,
      shortLabel,
      neighborhood: addr.neighbourhood,
      suburb: addr.suburb,
      city: addr.city || addr.town,
      state: addr.state,
      country: addr.country,
    };

    saveToCache(key, result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);
    // Graceful fallback to nearest known region
    const fallback = getFallbackLocation(lat, lng);
    saveToCache(key, fallback);
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
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCAL_STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}
