/**
 * KindLink Place & Address Search Engine
 * Uses OpenStreetMap Nominatim with debouncing, caching, timeout protection,
 * and regional priority around Asansol, Dhanbad, and West Bengal.
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
}

interface CacheEntry {
  data: PlaceSearchResult[];
  timestamp: number;
}

const SEARCH_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_PREFIX = 'kindlink_nominatim_search_';

// Curated quick search hints for common hubs in Asansol region
const CURATED_LOCAL_PLACES: PlaceSearchResult[] = [
  {
    placeId: 'local-aec',
    name: 'Asansol Engineering College',
    displayName: 'Asansol Engineering College, Kalyanpur, Asansol, West Bengal',
    lat: 23.6889,
    lng: 86.9661,
    city: 'Asansol',
  },
  {
    placeId: 'local-adh',
    name: 'Asansol District Hospital',
    displayName: 'Asansol District Hospital, SB Gorai Road, Asansol',
    lat: 23.6845,
    lng: 86.9742,
    city: 'Asansol',
  },
  {
    placeId: 'local-hlg',
    name: 'HLG Memorial Hospital',
    displayName: 'HLG Memorial Hospital, Sen Raleigh Road, Asansol',
    lat: 23.7012,
    lng: 86.9554,
    city: 'Asansol',
  },
  {
    placeId: 'local-burnpur',
    name: 'Burnpur Township',
    displayName: 'Burnpur, Asansol, Paschim Bardhaman, West Bengal',
    lat: 23.6642,
    lng: 86.9388,
    city: 'Asansol',
  },
  {
    placeId: 'local-ushagram',
    name: 'Ushagram Main Crossing',
    displayName: 'Ushagram, GT Road, Asansol, West Bengal',
    lat: 23.6791,
    lng: 86.9814,
    city: 'Asansol',
  },
  {
    placeId: 'local-kalla',
    name: 'ECL Kalla Hospital',
    displayName: 'ECL Central Hospital, Kalla, Asansol, West Bengal',
    lat: 23.7215,
    lng: 86.9602,
    city: 'Asansol',
  },
  {
    placeId: 'local-durgapur',
    name: 'City Centre Durgapur',
    displayName: 'City Centre, Durgapur, Paschim Bardhaman, West Bengal',
    lat: 23.5385,
    lng: 87.2941,
    city: 'Durgapur',
  },
  {
    placeId: 'local-dhanbad',
    name: 'SNMMCH Dhanbad',
    displayName: 'Saraidhela, Dhanbad, Jharkhand',
    lat: 23.8143,
    lng: 86.4412,
    city: 'Dhanbad',
  },
];

function getFromCache(query: string): PlaceSearchResult[] | null {
  const normalized = query.trim().toLowerCase();
  const now = Date.now();
  const mem = SEARCH_CACHE.get(normalized);
  if (mem && now - mem.timestamp < CACHE_TTL_MS) {
    return mem.data;
  }

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}${normalized}`);
      if (raw) {
        const parsed: CacheEntry = JSON.parse(raw);
        if (now - parsed.timestamp < CACHE_TTL_MS) {
          SEARCH_CACHE.set(normalized, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Ignore
    }
  }

  return null;
}

function saveToCache(query: string, data: PlaceSearchResult[]): void {
  const normalized = query.trim().toLowerCase();
  const entry: CacheEntry = { data, timestamp: Date.now() };
  SEARCH_CACHE.set(normalized, entry);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${normalized}`, JSON.stringify(entry));
    } catch {
      // Ignore
    }
  }
}

/**
 * Searches Nominatim for places and addresses with timeout, caching, and fallback
 */
export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) {
    return [];
  }

  const cached = getFromCache(trimmed);
  if (cached) {
    return cached;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    // Search with India priority and address details
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      trimmed
    )}&countrycodes=in&limit=6&addressdetails=1`;

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

    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) {
      // Check local curated landmarks
      const matched = CURATED_LOCAL_PLACES.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
          p.displayName.toLowerCase().includes(trimmed.toLowerCase())
      );
      saveToCache(trimmed, matched);
      return matched;
    }

    const results: PlaceSearchResult[] = items.map((item: any) => {
      const addr = item.address || {};
      const name =
        item.name ||
        addr.suburb ||
        addr.neighbourhood ||
        addr.road ||
        addr.city ||
        item.display_name.split(',')[0];

      return {
        placeId: String(item.place_id),
        name,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        type: item.type,
        suburb: addr.suburb || addr.neighbourhood,
        city: addr.city || addr.town || addr.municipality,
        state: addr.state,
      };
    });

    saveToCache(trimmed, results);
    return results;
  } catch {
    clearTimeout(timeoutId);
    // Offline/throttled fallback to curated landmarks
    const matched = CURATED_LOCAL_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed.toLowerCase()) ||
        p.displayName.toLowerCase().includes(trimmed.toLowerCase())
    );
    saveToCache(trimmed, matched);
    return matched;
  }
}
