import { PlaceCategory, PlaceResult, PlacesOptions, PlacesProvider } from '../types';
import { calculateDistance } from '@/lib/data/distance';

export const OVERPASS_MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat: number;
    lon: number;
  };
  tags?: {
    name?: string;
    amenity?: string;
    healthcare?: string;
    emergency?: string;
    phone?: string;
    'contact:phone'?: string;
    opening_hours?: string;
    'addr:street'?: string;
    'addr:city'?: string;
    'addr:postcode'?: string;
    'addr:full'?: string;
    [key: string]: string | undefined;
  };
}

interface OverpassResponse {
  version: number;
  elements?: OverpassElement[];
}

export class OverpassPlacesProvider implements PlacesProvider {
  readonly id = 'overpass-places';
  readonly name = 'OpenStreetMap Overpass API';

  private mirrors: string[];

  constructor(mirrors: string[] = OVERPASS_MIRRORS) {
    this.mirrors = mirrors;
  }

  isConfigured(): boolean {
    return true; // Public Overpass mirrors
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusMeters: number = 8000,
    category: PlaceCategory = 'all',
    options?: PlacesOptions
  ): Promise<PlaceResult[]> {
    const amenityFilter = this.mapCategoryToAmenityFilter(category);
    const limit = options?.limit || 25;

    const overpassQuery = `
      [out:json][timeout:6];
      (
        node["amenity"~"${amenityFilter}"](around:${radiusMeters},${lat},${lng});
        way["amenity"~"${amenityFilter}"](around:${radiusMeters},${lat},${lng});
      );
      out center ${limit};
    `;

    let lastError: Error | null = null;

    // Cascade through public mirrors
    for (const mirror of this.mirrors) {
      try {
        const results = await this.queryMirror(mirror, overpassQuery, lat, lng, options?.signal);
        if (results && results.length >= 0) {
          return results.slice(0, limit);
        }
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Try next mirror
        continue;
      }
    }

    throw lastError || new Error('All Overpass API mirrors failed to respond');
  }

  private async queryMirror(
    mirrorUrl: string,
    query: string,
    originLat: number,
    originLng: number,
    signal?: AbortSignal
  ): Promise<PlaceResult[]> {
    const res = await fetch(mirrorUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'KindLink-Mutual-Aid/1.0 (https://kindlink.org)',
      },
      body: `data=${encodeURIComponent(query)}`,
      signal,
    });

    if (!res.ok) {
      throw Object.assign(new Error(`Overpass mirror ${mirrorUrl} HTTP ${res.status}`), {
        status: res.status,
      });
    }

    const data: OverpassResponse = await res.json();
    const elements = data.elements || [];

    const results: PlaceResult[] = [];

    for (const el of elements) {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (elLat === undefined || elLng === undefined) {
        continue;
      }

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Medical Facility';
      const amenity = tags.amenity || 'healthcare';
      const phone = tags.phone || tags['contact:phone'];
      const emergency = tags.emergency === 'yes' || amenity === 'hospital';
      const openingHours = tags.opening_hours;

      const addressParts = [
        tags['addr:full'],
        tags['addr:street'],
        tags['addr:city'],
        tags['addr:postcode'],
      ].filter((p): p is string => Boolean(p && p.trim().length > 0));

      const address = addressParts.length > 0 ? addressParts.join(', ') : undefined;
      const distanceKm = calculateDistance(originLat, originLng, elLat, elLng);

      results.push({
        id: `osm-${el.type}-${el.id}`,
        name,
        category: this.normalizeAmenity(amenity),
        lat: elLat,
        lng: elLng,
        address,
        phone,
        distanceKm,
        openingHours,
        emergency,
        sourceProvider: this.id,
        raw: el,
      });
    }

    // Sort by distance ascending
    return results.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }

  private mapCategoryToAmenityFilter(cat: PlaceCategory): string {
    switch (cat) {
      case 'hospital':
        return 'hospital';
      case 'clinic':
        return 'clinic';
      case 'pharmacy':
        return 'pharmacy';
      case 'blood_bank':
        return 'blood_bank';
      case 'emergency':
        return 'hospital|clinic';
      case 'healthcare':
      case 'all':
      default:
        return 'hospital|clinic|pharmacy|blood_bank';
    }
  }

  private normalizeAmenity(amenity: string): PlaceCategory {
    if (amenity === 'hospital') return 'hospital';
    if (amenity === 'clinic') return 'clinic';
    if (amenity === 'pharmacy') return 'pharmacy';
    if (amenity === 'blood_bank') return 'blood_bank';
    return 'healthcare';
  }
}

export const overpassPlacesProvider = new OverpassPlacesProvider();
