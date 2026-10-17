/**
 * KindLink Location & Address Search Utility
 * Rewired to proxy through /api/maps/geocode and /api/maps/reverse
 * with multi-provider fallbacks, in-memory caching, offline curated landmarks,
 * and seamless backwards compatibility for LocationModal and NewRequestWizard.
 */

import { LocationSearchResult } from './types';
import { reverseGeocode } from '@/lib/geo/reverse-geocode';

export interface SuggestedArea {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  type: 'campus' | 'hospital' | 'station' | 'residential' | 'market' | 'city';
}

// Honest curated list of prominent local hubs in Asansol and neighboring areas
export const SUGGESTED_AREAS: SuggestedArea[] = [
  {
    id: 'sug-aec',
    name: 'Asansol Engineering College',
    label: 'College Campus Hub · Kalyanpur',
    lat: 23.6889,
    lng: 86.9661,
    type: 'campus',
  },
  {
    id: 'sug-hospital',
    name: 'Asansol District Hospital / Court',
    label: 'Medical & Civic Center · SB Gorai Rd',
    lat: 23.6845,
    lng: 86.9742,
    type: 'hospital',
  },
  {
    id: 'sug-station',
    name: 'Asansol Junction Railway Station',
    label: 'Main Rail Transit Hub · Railpar',
    lat: 23.6936,
    lng: 86.9746,
    type: 'station',
  },
  {
    id: 'sug-ushagram',
    name: 'Ushagram & GT Road',
    label: 'Residential & Commercial Area',
    lat: 23.6791,
    lng: 86.9814,
    type: 'residential',
  },
  {
    id: 'sug-burnpur',
    name: 'Burnpur & IISCO Steel Town',
    label: 'Industrial Township · Riverside Rd',
    lat: 23.6642,
    lng: 86.9388,
    type: 'residential',
  },
  {
    id: 'sug-hlg',
    name: 'HLG Memorial Hospital',
    label: 'Sen Raleigh Road, Asansol',
    lat: 23.7012,
    lng: 86.9554,
    type: 'hospital',
  },
  {
    id: 'sug-raniganj',
    name: 'Raniganj Bazar',
    label: 'GT Road · Coalfield Belt',
    lat: 23.6238,
    lng: 87.1128,
    type: 'market',
  },
  {
    id: 'sug-durgapur',
    name: 'City Centre, Durgapur',
    label: 'Commercial Hub · Paschim Bardhaman',
    lat: 23.5385,
    lng: 87.2941,
    type: 'city',
  },
];

// Built-in verified landmarks in Asansol and neighboring region for instant offline search
export const KNOWN_LANDMARKS: LocationSearchResult[] = [
  {
    id: 'lm-aec',
    displayName: 'Asansol Engineering College, Kalyanpur, Asansol, West Bengal',
    shortLabel: 'Asansol Engineering College, Kalyanpur',
    lat: 23.6889,
    lng: 86.9661,
    type: 'campus',
  },
  {
    id: 'lm-hospital',
    displayName: 'Asansol District Hospital, SB Gorai Road, Asansol, West Bengal',
    shortLabel: 'Asansol District Hospital, SB Gorai Road',
    lat: 23.6845,
    lng: 86.9742,
    type: 'hospital',
  },
  {
    id: 'lm-hlg',
    displayName: 'HLG Memorial Hospital, Sen Raleigh Road, Asansol, West Bengal',
    shortLabel: 'HLG Memorial Hospital, Sen Raleigh Road',
    lat: 23.7012,
    lng: 86.9554,
    type: 'hospital',
  },
  {
    id: 'lm-ushagram',
    displayName: 'Ushagram Main Crossing, GT Road, Asansol, West Bengal',
    shortLabel: 'Ushagram & GT Road',
    lat: 23.6791,
    lng: 86.9814,
    type: 'residential',
  },
  {
    id: 'lm-burnpur',
    displayName: 'Burnpur & IISCO Steel Town, Riverside Road, Asansol, West Bengal',
    shortLabel: 'Burnpur & IISCO Steel Town',
    lat: 23.6642,
    lng: 86.9388,
    type: 'residential',
  },
  {
    id: 'lm-station',
    displayName: 'Asansol Junction Railway Station, Railpar, Asansol, West Bengal',
    shortLabel: 'Asansol Junction Railway Station',
    lat: 23.6936,
    lng: 86.9746,
    type: 'station',
  },
  {
    id: 'lm-raniganj',
    displayName: 'Raniganj Bazar, GT Road, Paschim Bardhaman, West Bengal',
    shortLabel: 'Raniganj Bazar & Coalfield Belt',
    lat: 23.6238,
    lng: 87.1128,
    type: 'market',
  },
  {
    id: 'lm-durgapur',
    displayName: 'City Centre, Durgapur, Paschim Bardhaman, West Bengal',
    shortLabel: 'City Centre, Durgapur',
    lat: 23.5385,
    lng: 87.2941,
    type: 'city',
  },
  {
    id: 'lm-dhanbad',
    displayName: 'SNMMCH Hospital Area, Dhanbad, Jharkhand',
    shortLabel: 'SNMMCH Hospital, Dhanbad',
    lat: 23.8143,
    lng: 86.4412,
    type: 'hospital',
  },
  {
    id: 'lm-kulti',
    displayName: 'Kulti, Neamatpur & Barakar Border Zone, West Bengal',
    shortLabel: 'Kulti, Neamatpur & Barakar',
    lat: 23.7314,
    lng: 86.8488,
    type: 'town',
  },
];

// In-memory cache for search queries (10 minute TTL)
interface SearchCacheEntry {
  data: LocationSearchResult[];
  timestamp: number;
}
const searchCache = new Map<string, SearchCacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Searches /api/maps/geocode for address suggestions, falling back to or augmenting with local landmarks.
 * Maintained with legacy function name searchAddressNominatim for 100% backwards compatibility
 * while fully routing through /api/maps/geocode without direct external calls.
 */
export async function searchAddressNominatim(
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

  // 1. Find local landmark matches
  const localMatches = KNOWN_LANDMARKS.filter(
    (lm) =>
      lm.displayName.toLowerCase().includes(cacheKey) ||
      lm.shortLabel.toLowerCase().includes(cacheKey)
  );

  // 2. Fetch from /api/maps/geocode (autocomplete mode)
  const serverResults: LocationSearchResult[] = [];

  try {
    const params = new URLSearchParams({
      query: cleanQuery,
      type: 'autocomplete',
      limit: '6',
    });

    const res = await fetch(`/api/maps/geocode?${params.toString()}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

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
    // If request was aborted by newer search, let caller handle
    if (signal?.aborted || (err as Error)?.name === 'AbortError') {
      throw err;
    }
    // Network or rate limit failure: rely on local matches
  }

  // Deduplicate results based on ~200m proximity
  const combined = [...localMatches, ...serverResults];
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
 * Modern alias for address search routing through /api/maps/geocode
 */
export async function searchAddress(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  return searchAddressNominatim(query, signal);
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
