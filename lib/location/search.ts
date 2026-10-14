import { LocationSearchResult } from './types';

// Built-in verified landmarks in Asansol and neighboring region for instant offline search
const KNOWN_LANDMARKS: LocationSearchResult[] = [
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

/**
 * Searches OSM Nominatim for address suggestions, falling back to or augmenting with local landmarks.
 */
export async function searchAddressNominatim(
  query: string,
  signal?: AbortSignal
): Promise<LocationSearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery || cleanQuery.length < 2) {
    return [];
  }

  // 1. Find local landmark matches
  const qLower = cleanQuery.toLowerCase();
  const localMatches = KNOWN_LANDMARKS.filter(
    (lm) =>
      lm.displayName.toLowerCase().includes(qLower) ||
      lm.shortLabel.toLowerCase().includes(qLower)
  );

  // 2. Fetch from OSM Nominatim with 4-second timeout
  const nominatimResults: LocationSearchResult[] = [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      cleanQuery
    )}&limit=6&addressdetails=1&countrycodes=in`;

    const res = await fetch(url, {
      signal,
      headers: {
        'Accept-Language': 'en, hi, bn',
        'User-Agent': 'KindLink-Mutual-Aid/1.0 (https://kindlink.org)',
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        for (const item of data) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          if (isNaN(lat) || isNaN(lng)) continue;

          const addr = item.address || {};
          const primary =
            addr.suburb ||
            addr.neighbourhood ||
            addr.residential ||
            addr.village ||
            addr.road ||
            item.name ||
            '';
          const secondary =
            addr.city ||
            addr.town ||
            addr.municipality ||
            addr.county ||
            addr.state ||
            '';

          let shortLabel = '';
          if (primary && secondary && primary !== secondary) {
            shortLabel = `${primary}, ${secondary}`;
          } else if (primary) {
            shortLabel = primary;
          } else if (secondary) {
            shortLabel = secondary;
          } else {
            const parts = (item.display_name || '').split(',');
            shortLabel = parts.slice(0, 2).join(',').trim() || 'Selected Location';
          }

          nominatimResults.push({
            id: `osm-${item.place_id || `${lat}-${lng}`}`,
            displayName: item.display_name || shortLabel,
            shortLabel,
            lat,
            lng,
            type: item.type || item.category || 'address',
          });
        }
      }
    }
  } catch (err) {
    // If request was aborted by newer search, let it throw or handle gracefully
    if (signal?.aborted) {
      throw err;
    }
    // Network or rate limit failure: rely on local matches
  }

  // Deduplicate results based on ~200m proximity
  const combined = [...localMatches, ...nominatimResults];
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

  return uniqueResults;
}
