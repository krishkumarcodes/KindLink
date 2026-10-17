/**
 * KindLink Location & Address Search Utility
 * Routes search through /api/maps/search (and /api/maps/geocode)
 * with multi-provider fallbacks, caching, and fallback city presets.
 */

import { LocationSearchResult } from './types';
import { reverseGeocode } from '@/lib/geo/reverse-geocode';

export interface FallbackCity {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
}

// Fallback city list when no location is known
export const FALLBACK_CITIES: FallbackCity[] = [
  { id: 'city-kolkata', name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { id: 'city-asansol', name: 'Asansol', state: 'West Bengal', lat: 23.6889, lng: 86.9661 },
  { id: 'city-durgapur', name: 'Durgapur', state: 'West Bengal', lat: 23.5204, lng: 87.3119 },
  { id: 'city-dhanbad', name: 'Dhanbad', state: 'Jharkhand', lat: 23.7957, lng: 86.4304 },
  { id: 'city-ranchi', name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096 },
  { id: 'city-patna', name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376 },
  { id: 'city-delhi', name: 'Delhi', state: 'National Capital Region', lat: 28.6139, lng: 77.2090 },
  { id: 'city-mumbai', name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
];

export interface SuggestedArea {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  type: string;
}

// Deprecated: kept empty for type compatibility, replaced by dynamic nearby places & fallback cities
export const SUGGESTED_AREAS: SuggestedArea[] = [];

// In-memory cache for search queries (10 minute TTL)
interface SearchCacheEntry {
  data: LocationSearchResult[];
  timestamp: number;
}
const searchCache = new Map<string, SearchCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Searches /api/maps/search for address and place suggestions
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  const cacheKey = cleanQuery.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  // Check matching fallback cities first for instant response
  const cityMatches: LocationSearchResult[] = FALLBACK_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(cacheKey) ||
      c.state.toLowerCase().includes(cacheKey)
  ).map((c) => ({
    id: c.id,
    displayName: `${c.name}, ${c.state}`,
    shortLabel: c.name,
    lat: c.lat,
    lng: c.lng,
    type: 'city',
  }));

  const serverResults: LocationSearchResult[] = [];

  try {
    const params = new URLSearchParams({
      query: cleanQuery,
      type: 'autocomplete',
      limit: '8',
    });

    let res = await fetch(`/api/maps/search?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    });

    // Fallback to /api/maps/geocode if /api/maps/search encounters issue
    if (!res.ok) {
      res = await fetch(`/api/maps/geocode?${params.toString()}`, {
        signal,
        headers: { Accept: 'application/json' },
      });
    }

    if (res.ok) {
      const payload = await res.json();
      const items: any[] = Array.isArray(payload)
        ? payload
        : payload.results || payload.data || [];

      for (const item of items) {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng || item.lon);
        if (isNaN(lat) || isNaN(lng)) continue;

        const addr = item.address || {};
        const primary =
          item.name ||
          item.shortLabel ||
          addr.suburb ||
          addr.neighbourhood ||
          addr.residential ||
          addr.village ||
          addr.road ||
          '';

        const secondary =
          addr.city ||
          addr.town ||
          addr.municipality ||
          addr.county ||
          addr.state ||
          item.city ||
          '';

        let shortLabel = item.shortLabel || '';
        if (!shortLabel) {
          if (primary && secondary && primary !== secondary) {
            shortLabel = `${primary}, ${secondary}`;
          } else if (primary) {
            shortLabel = primary;
          } else if (secondary) {
            shortLabel = secondary;
          } else {
            const parts = (item.displayName || item.display_name || '').split(',');
            shortLabel = parts.slice(0, 2).join(',').trim() || 'Selected Location';
          }
        }

        serverResults.push({
          id: String(item.id || item.placeId || item.place_id || `place-${lat}-${lng}`),
          displayName: item.displayName || item.display_name || shortLabel,
          shortLabel,
          lat,
          lng,
          type: item.type || item.category || 'address',
          sourceProvider: item.sourceProvider,
          isFallback: item.isFallback,
        });
      }
    }
  } catch (err: unknown) {
    if (signal?.aborted || (err as Error)?.name === 'AbortError') {
      throw err;
    }
  }

  // Deduplicate results based on ~200m proximity
  const combined = [...cityMatches, ...serverResults];
  const uniqueResults: LocationSearchResult[] = [];

  for (const item of combined) {
    const exists = uniqueResults.some(
      (u) =>
        Math.abs(u.lat - item.lat) < 0.002 &&
        Math.abs(u.lng - item.lng) < 0.002
    );
    if (!exists) {
      uniqueResults.push(item);
    }
  }

  // Cache results
  searchCache.set(cacheKey, {
    data: uniqueResults,
    timestamp: Date.now(),
  });

  return uniqueResults;
}

/**
 * Backwards compatibility alias for searchAddress
 */
export async function searchAddressNominatim(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  return searchAddress(query, signal);
}

/**
 * Reverse geocode coordinates through /api/maps/reverse
 */
export async function reverseGeocodeAddress(
  lat: number,
  lng: number
): Promise<LocationSearchResult> {
  const result = await reverseGeocode(lat, lng);
  return {
    id: `rev-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    displayName: result.displayName,
    shortLabel: result.shortLabel,
    lat,
    lng,
    type: 'address',
    sourceProvider: result.sourceProvider,
    isFallback: result.isFallback,
  };
}

export interface NearbyPlaceItem {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
  address?: string;
}

/**
 * Fetch nearby places from /api/maps/places
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  signal?: AbortSignal
): Promise<NearbyPlaceItem[]> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lng: String(lng),
      radiusMeters: String(radiusMeters),
      limit: '8',
    });

    const res = await fetch(`/api/maps/places?${params.toString()}`, {
      signal,
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) return [];

    const data = await res.json();
    const rawPlaces = data.places || [];

    return rawPlaces.map((p: any) => ({
      id: String(p.id || `nb-${p.lat}-${p.lng}`),
      name: p.name || p.displayName || 'Nearby Point of Interest',
      category: p.category || p.type || 'place',
      lat: Number(p.lat),
      lng: Number(p.lng),
      distanceMeters: p.distanceMeters,
      address: p.address,
    }));
  } catch {
    return [];
  }
}
