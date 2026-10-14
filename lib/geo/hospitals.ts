/**
 * KindLink Nearest Hospitals, Clinics, Pharmacies & Blood Banks Engine
 * Queries OpenStreetMap Overpass API for emergency healthcare amenities
 * with strict rate limiting, in-memory & localStorage caching,
 * and reliable fallback to curated Asansol-Dhanbad-Durgapur medical centers.
 */

import { calculateDistance } from '@/lib/data/distance';

export type MedicalAmenityType = 'hospital' | 'clinic' | 'pharmacy' | 'blood_bank';

export interface MedicalFacility {
  id: string;
  name: string;
  type: MedicalAmenityType;
  latitude: number;
  longitude: number;
  distanceKm: number;
  address?: string;
  phone?: string;
  emergency?: boolean;
  openingHours?: string;
  isCuratedFallback?: boolean;
}

interface CacheEntry {
  data: MedicalFacility[];
  timestamp: number;
}

// Memory cache and rate limiting guards
const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour TTL
const STORAGE_PREFIX = 'kindlink_medical_cache_';
const IN_FLIGHT_REQUESTS = new Map<string, Promise<MedicalFacility[]>>();
let lastOverpassCallTimestamp = 0;
const MIN_OVERPASS_INTERVAL_MS = 2000; // Polite rate limiting between Overpass calls

/**
 * Curated reference database of major medical hubs in Asansol and adjoining regions
 * Ensures zero-downtime medical assistance even if Overpass API is rate limited or offline.
 */
export const ASANSOL_CURATED_MEDICAL_HUBS: Omit<MedicalFacility, 'distanceKm'>[] = [
  {
    id: 'hosp-asansol-district',
    name: 'Asansol District Hospital',
    type: 'hospital',
    latitude: 23.6845,
    longitude: 86.9742,
    address: 'SB Gorai Road, Asansol, West Bengal 713301',
    phone: '+91 341 225 2222',
    emergency: true,
    openingHours: '24/7 Emergency & Trauma',
    isCuratedFallback: true,
  },
  {
    id: 'hosp-hlg-memorial',
    name: 'HLG Memorial Hospital',
    type: 'hospital',
    latitude: 23.7012,
    longitude: 86.9554,
    address: 'Sen Raleigh Road, Asansol, West Bengal 713305',
    phone: '+91 341 225 3333',
    emergency: true,
    openingHours: '24/7 Critical Care & ICU',
    isCuratedFallback: true,
  },
  {
    id: 'hosp-burnpur-sail',
    name: 'Burnpur Hospital (SAIL-ISP)',
    type: 'hospital',
    latitude: 23.6642,
    longitude: 86.9388,
    address: 'Burnpur Township, Asansol, West Bengal 713325',
    phone: '+91 341 224 0212',
    emergency: true,
    openingHours: '24/7',
    isCuratedFallback: true,
  },
  {
    id: 'hosp-ecl-kalla',
    name: 'ECL Central Hospital Kalla',
    type: 'hospital',
    latitude: 23.7215,
    longitude: 86.9602,
    address: 'Kalla, Asansol, West Bengal 713340',
    phone: '+91 341 227 0051',
    emergency: true,
    openingHours: '24/7 Super Speciality & Emergency',
    isCuratedFallback: true,
  },
  {
    id: 'blood-asansol-subdiv',
    name: 'Asansol Sub-Divisional Blood Bank',
    type: 'blood_bank',
    latitude: 23.6848,
    longitude: 86.974,
    address: 'District Hospital Campus, SB Gorai Road, Asansol',
    phone: '+91 341 225 2223',
    emergency: true,
    openingHours: '24/7 Blood Storage & Component Separation',
    isCuratedFallback: true,
  },
  {
    id: 'blood-lifeline-asansol',
    name: 'Life Line Blood Centre & Diagnostics',
    type: 'blood_bank',
    latitude: 23.6865,
    longitude: 86.971,
    address: 'GT Road, Near Court More, Asansol 713304',
    phone: '+91 94341 88990',
    emergency: true,
    openingHours: '24/7',
    isCuratedFallback: true,
  },
  {
    id: 'clinic-sanjeevani-asansol',
    name: 'Sanjeevani Day Care & Medical Clinic',
    type: 'clinic',
    latitude: 23.689,
    longitude: 86.969,
    address: 'Court Road, Asansol, West Bengal 713304',
    phone: '+91 94340 12345',
    emergency: false,
    openingHours: '08:00 - 21:00',
    isCuratedFallback: true,
  },
  {
    id: 'pharm-apollo-ushagram',
    name: 'Apollo Pharmacy Asansol',
    type: 'pharmacy',
    latitude: 23.6791,
    longitude: 86.9814,
    address: 'GT Road, Ushagram, Asansol 713303',
    phone: '+91 341 230 4567',
    emergency: false,
    openingHours: '24/7 Medicine Delivery',
    isCuratedFallback: true,
  },
  {
    id: 'pharm-medplus-kalyanpur',
    name: 'MedPlus Pharmacy Kalyanpur',
    type: 'pharmacy',
    latitude: 23.6889,
    longitude: 86.9661,
    address: 'Kalyanpur Housing Sector 2, Asansol 713305',
    phone: '+91 98322 11223',
    emergency: false,
    openingHours: '07:00 - 23:00',
    isCuratedFallback: true,
  },
  {
    id: 'clinic-mission-outreach',
    name: 'The Mission Clinic & Diagnostic Outreach',
    type: 'clinic',
    latitude: 23.683,
    longitude: 86.978,
    address: 'SB Gorai Road, Near Hutton Road Crossing, Asansol',
    phone: '+91 343 253 5555',
    emergency: false,
    openingHours: '09:00 - 20:00',
    isCuratedFallback: true,
  },
  {
    id: 'hosp-snmmch-dhanbad',
    name: 'SNMMCH Medical College & Hospital (Dhanbad)',
    type: 'hospital',
    latitude: 23.8143,
    longitude: 86.4412,
    address: 'Saraidhela, Dhanbad, Jharkhand 828127',
    phone: '+91 326 223 0465',
    emergency: true,
    openingHours: '24/7 Trauma & Emergency',
    isCuratedFallback: true,
  },
  {
    id: 'hosp-mission-durgapur',
    name: 'The Mission Hospital Durgapur',
    type: 'hospital',
    latitude: 23.5385,
    longitude: 87.2941,
    address: 'Sector 2C, Bidhannagar, Durgapur, West Bengal 713212',
    phone: '+91 343 253 5555',
    emergency: true,
    openingHours: '24/7 Super Speciality',
    isCuratedFallback: true,
  },
];

function getCacheKey(lat: number, lng: number, radiusMeters: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}:${radiusMeters}`;
}

function getFromCache(key: string): MedicalFacility[] | null {
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

function saveToCache(key: string, data: MedicalFacility[]): void {
  const entry: CacheEntry = { data, timestamp: Date.now() };
  MEMORY_CACHE.set(key, entry);

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch {
      // Ignore quota errors
    }
  }
}

/**
 * Returns curated fallback medical hubs sorted by distance to the given coordinates
 */
export function getCuratedMedicalFacilities(
  lat: number,
  lng: number,
  typeFilter?: MedicalAmenityType
): MedicalFacility[] {
  return ASANSOL_CURATED_MEDICAL_HUBS.filter((h) => !typeFilter || h.type === typeFilter)
    .map((h) => ({
      ...h,
      distanceKm: calculateDistance(lat, lng, h.latitude, h.longitude),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Queries Overpass API for nearest hospitals, clinics, pharmacies, and blood banks
 * with timeout, polite rate limiting, in-flight deduplication, and curated fallback.
 */
export async function getNearestMedicalFacilities(options: {
  lat: number;
  lng: number;
  radiusMeters?: number;
  typeFilter?: MedicalAmenityType;
  limit?: number;
}): Promise<MedicalFacility[]> {
  const { lat, lng, radiusMeters = 8000, typeFilter, limit = 10 } = options;

  if (isNaN(lat) || isNaN(lng)) {
    return getCuratedMedicalFacilities(23.6889, 86.9661, typeFilter).slice(0, limit);
  }

  const cacheKey = getCacheKey(lat, lng, radiusMeters);
  const cached = getFromCache(cacheKey);
  if (cached) {
    const filtered = typeFilter ? cached.filter((f) => f.type === typeFilter) : cached;
    return filtered.slice(0, limit);
  }

  // Deduplicate concurrent in-flight requests
  const existingInFlight = IN_FLIGHT_REQUESTS.get(cacheKey);
  if (existingInFlight) {
    const list = await existingInFlight;
    const filtered = typeFilter ? list.filter((f) => f.type === typeFilter) : list;
    return filtered.slice(0, limit);
  }

  const fetchPromise = (async (): Promise<MedicalFacility[]> => {
    // Enforce polite rate limit: wait if another call was made recently
    const elapsed = Date.now() - lastOverpassCallTimestamp;
    if (elapsed < MIN_OVERPASS_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_OVERPASS_INTERVAL_MS - elapsed));
    }
    lastOverpassCallTimestamp = Date.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const overpassQuery = `
        [out:json][timeout:8];
        (
          node["amenity"~"hospital|clinic|pharmacy|blood_bank"](around:${radiusMeters},${lat},${lng});
          way["amenity"~"hospital|clinic|pharmacy|blood_bank"](around:${radiusMeters},${lat},${lng});
        );
        out center 35;
      `;

      const endpoint = 'https://overpass-api.de/api/interpreter';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'KindLink-Mutual-Aid/1.0 (https://kindlink.org)',
        },
        body: `data=${encodeURIComponent(overpassQuery)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Overpass HTTP ${res.status}`);
      }

      const data = await res.json();
      const elements: any[] = data.elements || [];

      if (!elements.length) {
        throw new Error('No Overpass elements returned');
      }

      const results: MedicalFacility[] = [];

      for (const el of elements) {
        const itemLat = el.lat || (el.center && el.center.lat);
        const itemLng = el.lon || (el.center && el.center.lon);
        if (!itemLat || !itemLng) continue;

        const tags = el.tags || {};
        let amenityType: MedicalAmenityType = 'clinic';

        if (
          tags.amenity === 'hospital' ||
          tags.healthcare === 'hospital'
        ) {
          amenityType = 'hospital';
        } else if (
          tags.amenity === 'blood_bank' ||
          tags.healthcare === 'blood_bank' ||
          (tags.name && tags.name.toLowerCase().includes('blood'))
        ) {
          amenityType = 'blood_bank';
        } else if (
          tags.amenity === 'pharmacy' ||
          tags.healthcare === 'pharmacy'
        ) {
          amenityType = 'pharmacy';
        } else {
          amenityType = 'clinic';
        }

        const name =
          tags.name ||
          tags['name:en'] ||
          tags['name:hi'] ||
          tags['name:bn'] ||
          `Local ${amenityType.replace('_', ' ')}`;

        const phone =
          tags.phone ||
          tags['contact:phone'] ||
          tags['contact:mobile'] ||
          tags.mobile;

        const addressParts = [
          tags['addr:street'],
          tags['addr:suburb'] || tags['addr:neighbourhood'],
          tags['addr:city'],
        ].filter(Boolean);

        const address =
          addressParts.length > 0 ? addressParts.join(', ') : tags['addr:full'];

        const distanceKm = calculateDistance(lat, lng, itemLat, itemLng);

        results.push({
          id: `osm-${el.type}-${el.id}`,
          name,
          type: amenityType,
          latitude: itemLat,
          longitude: itemLng,
          distanceKm,
          address,
          phone,
          emergency: tags.emergency === 'yes' || amenityType === 'hospital' || amenityType === 'blood_bank',
          openingHours: tags.opening_hours,
          isCuratedFallback: false,
        });
      }

      // Sort ascending by distance
      results.sort((a, b) => a.distanceKm - b.distanceKm);

      saveToCache(cacheKey, results);
      return results;
    } catch {
      clearTimeout(timeoutId);
      // Fallback gracefully to curated local healthcare facilities
      const curated = getCuratedMedicalFacilities(lat, lng);
      saveToCache(cacheKey, curated);
      return curated;
    } finally {
      IN_FLIGHT_REQUESTS.delete(cacheKey);
    }
  })();

  IN_FLIGHT_REQUESTS.set(cacheKey, fetchPromise);
  const finalResults = await fetchPromise;
  const filtered = typeFilter ? finalResults.filter((f) => f.type === typeFilter) : finalResults;
  return filtered.slice(0, limit);
}
