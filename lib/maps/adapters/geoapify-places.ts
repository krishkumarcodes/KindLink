import { PlaceCategory, PlaceResult, PlacesOptions, PlacesProvider } from '../types';
import { calculateDistance } from '@/lib/data/distance';
import { geoapifyThrottle } from '../rate-limiter';

interface GeoapifyPlaceFeature {
  type: string;
  properties: {
    place_id?: string;
    name?: string;
    categories?: string[];
    formatted?: string;
    address_line1?: string;
    address_line2?: string;
    distance?: number; // meters from bias
    contact?: {
      phone?: string;
    };
    datasource?: {
      raw?: Record<string, unknown>;
    };
    opening_hours?: string;
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
}

interface GeoapifyPlacesResponse {
  type: string;
  features?: GeoapifyPlaceFeature[];
}

export class GeoapifyPlacesProvider implements PlacesProvider {
  readonly id = 'geoapify-places';
  readonly name = 'Geoapify Places';

  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  private getKey(): string {
    return (
      this.apiKey ||
      process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ||
      process.env.GEOAPIFY_API_KEY ||
      ''
    );
  }

  isConfigured(): boolean {
    const key = this.getKey();
    return Boolean(key && key.trim().length > 0);
  }

  async findNearby(
    lat: number,
    lng: number,
    radiusMeters: number = 8000,
    category: PlaceCategory = 'all',
    options?: PlacesOptions
  ): Promise<PlaceResult[]> {
    const key = this.getKey();
    if (!key) {
      throw new Error('Geoapify API key not configured');
    }

    const categoriesParam = this.mapCategoryToGeoapify(category);
    const limit = options?.limit || 20;

    const url = new URL('https://api.geoapify.com/v2/places');
    url.searchParams.set('categories', categoriesParam);
    url.searchParams.set('filter', `circle:${lng},${lat},${radiusMeters}`);
    url.searchParams.set('bias', `proximity:${lng},${lat}`);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('apiKey', key);

    return geoapifyThrottle.schedule(async () => {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: options?.signal,
      });

      if (!res.ok) {
        throw Object.assign(new Error(`Geoapify Places HTTP ${res.status}: ${res.statusText}`), {
          status: res.status,
        });
      }

      const data: GeoapifyPlacesResponse = await res.json();
      const features = data.features || [];

      return features.map((f, idx) => {
        const [featureLng, featureLat] = f.geometry.coordinates;
        const props = f.properties || {};
        const cats = props.categories || [];

        const normalizedCategory = this.resolveCategoryFromTags(cats, category);
        const distanceKm =
          props.distance !== undefined
            ? Math.round((props.distance / 1000) * 10) / 10
            : calculateDistance(lat, lng, featureLat, featureLng);

        const isEmergency =
          cats.includes('healthcare.hospital') ||
          cats.includes('healthcare.clinic') ||
          normalizedCategory === 'hospital';

        return {
          id: props.place_id || `geoapify-place-${featureLat}-${featureLng}-${idx}`,
          name: props.name || props.formatted?.split(',')[0]?.trim() || 'Medical Facility',
          category: normalizedCategory,
          lat: featureLat,
          lng: featureLng,
          address: props.formatted,
          phone: props.contact?.phone,
          distanceKm,
          openingHours: props.opening_hours,
          emergency: isEmergency,
          sourceProvider: this.id,
          raw: f,
        };
      });
    });
  }

  private mapCategoryToGeoapify(cat: PlaceCategory): string {
    switch (cat) {
      case 'hospital':
        return 'healthcare.hospital';
      case 'clinic':
        return 'healthcare.clinic';
      case 'pharmacy':
        return 'healthcare.pharmacy';
      case 'blood_bank':
        return 'healthcare.blood_bank,healthcare.hospital';
      case 'emergency':
        return 'healthcare.hospital,healthcare.clinic';
      case 'healthcare':
      case 'all':
      default:
        return 'healthcare';
    }
  }

  private resolveCategoryFromTags(tags: string[], fallback: PlaceCategory): PlaceCategory {
    if (tags.some((t) => t.includes('hospital'))) return 'hospital';
    if (tags.some((t) => t.includes('clinic'))) return 'clinic';
    if (tags.some((t) => t.includes('pharmacy'))) return 'pharmacy';
    if (tags.some((t) => t.includes('blood_bank'))) return 'blood_bank';
    return fallback === 'all' ? 'healthcare' : fallback;
  }
}

export const geoapifyPlacesProvider = new GeoapifyPlacesProvider();
