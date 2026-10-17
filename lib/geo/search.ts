/**
 * KindLink Place & Address Search Engine
 * Rewired to proxy through /api/maps/geocode with multi-provider fallbacks,
 * intelligent caching, in-flight AbortController cancellation,
 * location biasing to user coordinates and India, and clean busy/loading states.
 */

export interface PlaceSearchResult {
  placeId: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  suburb?: string;
  city?: string;
  state?: string;
  sourceProvider?: string;
  isFallback?: boolean;
  isDegraded?: boolean;
}

export interface SearchPlacesOptions {
  type?: 'search' | 'autocomplete';
  biasLat?: number;
  biasLng?: number;
  limit?: number;
  signal?: AbortSignal;
}

interface CacheEntry {
  data: PlaceSearchResult[];
  timestamp: number;
}

const SEARCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_PREFIX = 'kindlink_maps_geocode_';
const LEGACY_STORAGE_PREFIX = 'kindlink_nominatim_search_';

// Global AbortController to automatically cancel stale in-flight search queries
let activeSearchAbortController: AbortController | null = null;

// Curated quick search hints for common hubs in Asansol region
export const CURATED_LOCAL_PLACES: PlaceSearchResult[] = [
  {
    placeId: 'local-aec',
    name: 'Asansol Engineering College',
    displayName: 'Asansol Engineering College, Kalyanpur, Asansol, West Bengal',
    lat: 23.6889,
    lng: 86.9661,
    city: 'Asansol',
    sourceProvider: 'curated-local',
  },
  {
    placeId: 'local-adh',
    name: 'Asansol District Hospital',
    displayName: 'Asansol District Hospital, SB Gorai Road, Asansol',
    lat: 23.6845,
    lng: 86.9742,
    city: 'Asansol',
    sourceProvider: 'curated-local',
  },
  {
    placeId: 'local-hlg',
    name: 'HLG Memorial Hospital',
    displayName: 'HLG Memorial Hospital, Sen Raleigh Road, Asansol',
    lat: 23.7012,
    lng: 86.9554,
    city: 'Asansol',
    sourceProvider: 'curated-local',
  },
  {
    placeId: 'local-burnpur',
    name: 'Burnpur Township',
    displayName: 'Burnpur, Asansol, Paschim Bardhaman, West Bengal',
    lat: 23.6642,
    lng: 86.9388,
    city: 'Asansol',
    sourceProvider: 'curated-local',
  },
  {
    placeId: 'local-ushagram',
    name: 'Ushagram Main Crossing',
    displayName: 'Ushagram, GT Road, Asansol, West Bengal',
    lat: 23.6791,
    lng: 86.9814,
    city: 'Asansol',
    sourceProvider: 'curated-local',
  },
  {
    placeId: 'local-kalla',
    name: 'ECL Kalla Hospital',
    displayName: 'ECL Central Hospital, Kalla, Asansol, West Bengal',
    lat: 23.7215,
    lng: 86.9602,
    city: 'Asansol',
    sourceProvider: 'curated-local',
  },
  {
    placeId: 'local-durgapur',
    name: 'City Centre Durgapur',
    displayName: 'City Centre, Durgapur, Paschim Bardhaman, West Bengal',
    lat: 23.5385,
    lng: 87.2941,
    city: 'Durgapur',
    sourceProvider: 'curated-local',
  },
  {
    placeId: 'local-dhanbad',
    name: 'SNMMCH Dhanbad',
    displayName: 'Saraidhela, Dhanbad, Jharkhand',
    lat: 23.8143,
    lng: 86.4412,
    city: 'Dhanbad',
    sourceProvider: 'curated-local',
  },
];

function getFromCache(query: string, type: string): PlaceSearchResult[] | null {
  const normalized = `${type}:${query.trim().toLowerCase()}`;
  const now = Date.now();
  const mem = SEARCH_CACHE.get(normalized);
  if (mem && now - mem.timestamp < CACHE_TTL_MS) {
    return mem.data;
  }

  if (typeof window !== 'undefined') {
    try {
      // 1. Check primary maps cache
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${normalized}`);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          SEARCH_CACHE.set(normalized, parsed);
          return parsed.data;
        }
      }

      // 2. Fallback check legacy prefix
      const legacyRaw = localStorage.getItem(`${LEGACY_STORAGE_PREFIX}${query.trim().toLowerCase()}`);
      if (legacyRaw) {
        const parsedLegacy: CacheEntry = JSON.parse(legacyRaw);
        if (now - parsedLegacy.timestamp < CACHE_TTL_MS) {
          SEARCH_CACHE.set(normalized, parsedLegacy);
          return parsedLegacy.data;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  return null;
}

function saveToCache(query: string, type: string, data: PlaceSearchResult[]): void {
  const normalized = `${type}:${query.trim().toLowerCase()}`;
  const entry: CacheEntry = { data, timestamp: Date.now() };
  SEARCH_CACHE.set(normalized, entry);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${normalized}`, JSON.stringify(entry));
    } catch {
      // Ignore quota exceptions
    }
  }
}

/**
 * Normalizes raw geocode payload from /api/maps/geocode
 */
function normalizeGeocodeResults(items: any[]): PlaceSearchResult[] {
  if (!Array.isArray(items)) return [];

  const results: PlaceSearchResult[] = [];
  for (const item of items) {
    if (!item) continue;
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng || item.lon);
    if (isNaN(lat) || isNaN(lng)) continue;

    const addr = item.address || {};
    const name =
      item.name ||
      item.shortLabel ||
      addr.suburb ||
      addr.neighbourhood ||
      addr.road ||
      addr.city ||
      (item.displayName || item.display_name || '').split(',')[0] ||
      'Known Location';

    const displayName = item.displayName || item.display_name || name;

    results.push({
      placeId: String(item.id || item.placeId || item.place_id || `place-${lat}-${lng}`),
      name,
      displayName,
      lat,
      lng,
      type: item.type || item.category,
      suburb: item.suburb || addr.suburb || addr.neighbourhood,
      city: item.city || addr.city || addr.town || addr.municipality,
      state: item.state || addr.state,
      sourceProvider: item.sourceProvider,
      isFallback: item.isFallback,
      isDegraded: item.isDegraded,
    });
  }

  return results;
}

/**
 * Searches /api/maps/geocode for places and addresses.
 * Triggered after 3 characters, cancellable via AbortController,
 * cached in localStorage, biased to user location / India,
 * with clean loading and empty/busy states.
 */
export async function searchPlaces(
  query: string,
  options: SearchPlacesOptions = {}
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  // Suggestions trigger after 3 characters
  if (!trimmed || trimmed.length < 3) {
    return [];
  }

  const searchType = options.type || 'search';
  const cached = getFromCache(trimmed, searchType);
  if (cached) {
    return cached;
  }

  // Cancel prior in-flight client query if no external signal provided
  if (!options.signal) {
    if (activeSearchAbortController) {
      activeSearchAbortController.abort();
    }
    activeSearchAbortController = new AbortController();
  }

  const controller = options.signal ? null : activeSearchAbortController;
  const signal = options.signal || controller?.signal;

  try {
    const params = new URLSearchParams({
      query: trimmed,
      type: searchType,
      limit: String(options.limit || 6),
    });

    // Bias to user location if provided
    if (typeof options.biasLat === 'number' && typeof options.biasLng === 'number') {
      params.set('lat', options.biasLat.toFixed(5));
      params.set('lng', options.biasLng.toFixed(5));
    }

    const res = await fetch(`/api/maps/geocode?${params.toString()}`, {
      signal,
      headers: {
        Accept: 'application/json',
      },
    });

    if (res.status === 429) {
      const errorMsg = 'Search is busy. Try again in a minute.';
      console.warn(`[KindLink Maps Geocode] ${errorMsg}`);
      // Fallback to local curated places matching the query so user isn't stranded
      const localMatches = CURATED_LOCAL_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          p.displayName.toLowerCase().includes(trimmed.toLowerCase())
      );
      if (localMatches.length > 0) return localMatches;
      throw new Error(errorMsg);
    }

    if (!res.ok) {
      throw new Error(`Geocode API returned HTTP ${res.status}`);
    }

    const payload = await res.json();
    const rawList = Array.isArray(payload)
      ? payload
      : payload.results || payload.data || [];

    const results = normalizeGeocodeResults(rawList);

    if (results.length === 0) {
      // Local curated fallback matching search text
      const matched = CURATED_LOCAL_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          p.displayName.toLowerCase().includes(trimmed.toLowerCase())
      );
      saveToCache(trimmed, searchType, matched);
      return matched;
    }

    saveToCache(trimmed, searchType, results);
    return results;
  } catch (err: unknown) {
    if ((err as Error)?.name === 'AbortError') {
      throw err;
    }

    // Offline / Network failure fallback to curated local landmarks
    const matched = CURATED_LOCAL_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        p.displayName.toLowerCase().includes(trimmed.toLowerCase())
    );
    saveToCache(trimmed, searchType, matched);
    return matched;
  }
}

/**
 * Convenience helper for search-as-you-type autocomplete suggestions
 */
export async function searchAutocomplete(
  query: string,
  options: Omit<SearchPlacesOptions, 'type'> = {}
): Promise<PlaceSearchResult[]> {
  return searchPlaces(query, { ...options, type: 'autocomplete' });
}
