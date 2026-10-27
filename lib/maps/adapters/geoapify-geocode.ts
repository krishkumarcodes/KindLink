import { GeocodeOptions, GeocodeProvider, GeocodeResult } from '../types';
import { geoapifyThrottle } from '../rate-limiter';

interface GeoapifyFeature {
  type: string;
  properties: {
    place_id?: string;
    name?: string;
    formatted?: string;
    result_type?: string;
    suburb?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    lon?: number;
    lat?: number;
    rank?: {
      confidence?: number;
    };
  };
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
}

interface GeoapifyResponse {
  type: string;
  features?: GeoapifyFeature[];
}

export class GeoapifyGeocodeProvider implements GeocodeProvider {
  readonly id = 'geoapify';
  readonly name = 'Geoapify Geocoding';
  readonly capabilities = {
    autocomplete: true,
    search: true,
    reverse: true,
  } as const;

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

  async autocomplete(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]> {
    return this.request('autocomplete', query, options);
  }

  async search(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]> {
    return this.request('search', query, options);
  }

  async reverse(lat: number, lng: number, options?: GeocodeOptions): Promise<GeocodeResult | null> {
    const key = this.getKey();
    if (!key) {
      throw new Error('Geoapify API key not configured');
    }

    const url = new URL('https://api.geoapify.com/v1/geocode/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('apiKey', key);
    if (options?.language) {
      url.searchParams.set('lang', options.language);
    }

    const results = await this.executeFetch(url.toString(), options?.signal);
    return results[0] || null;
  }

  private async request(
    endpoint: 'autocomplete' | 'search',
    query: string,
    options?: GeocodeOptions
  ): Promise<GeocodeResult[]> {
    const key = this.getKey();
    if (!key) {
      throw new Error('Geoapify API key not configured');
    }

    const url = new URL(`https://api.geoapify.com/v1/geocode/${endpoint}`);
    url.searchParams.set('text', query.trim());
    url.searchParams.set('apiKey', key);
    url.searchParams.set('limit', String(options?.limit || 5));

    if (options?.biasLat !== undefined && options?.biasLng !== undefined) {
      url.searchParams.set('bias', `proximity:${options.biasLng},${options.biasLat}`);
    }

    if (options?.countryCodes && options.countryCodes.length > 0) {
      url.searchParams.set('filter', `countrycode:${options.countryCodes.join(',').toLowerCase()}`);
    }

    if (options?.language) {
      url.searchParams.set('lang', options.language);
    }

    return this.executeFetch(url.toString(), options?.signal);
  }

  private async executeFetch(urlString: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new Error('Geoapify request timed out after 5000ms'));
    }, 5000);

    const onSignalAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', onSignalAbort, { once: true });
    }

    try {
      return await geoapifyThrottle.schedule(async () => {
        const res = await fetch(urlString, {
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });

        if (!res.ok) {
          throw Object.assign(new Error(`Geoapify HTTP ${res.status}: ${res.statusText}`), {
            status: res.status,
          });
        }

        const data: GeoapifyResponse = await res.json();
        const features = data.features || [];

        return features.map((f, idx) => {
          const [lng, lat] = f.geometry.coordinates;
          const props = f.properties || {};
          const fallbackName = props.formatted?.split(',')[0]?.trim() || 'Location';

          return {
            id: props.place_id || `geoapify-${lat}-${lng}-${idx}`,
            name: props.name || fallbackName,
            displayName: props.formatted || fallbackName,
            lat,
            lng,
            type: props.result_type,
            suburb: props.suburb || props.district,
            city: props.city,
            state: props.state,
            country: props.country,
            postcode: props.postcode,
            boundingBox: f.bbox ? [f.bbox[1], f.bbox[3], f.bbox[0], f.bbox[2]] : undefined,
            confidence: props.rank?.confidence,
            sourceProvider: this.id,
            raw: f,
          };
        });
      });
    } finally {
      clearTimeout(timeout);
      if (signal) {
        signal.removeEventListener('abort', onSignalAbort);
      }
    }
  }
}

export const geoapifyGeocodeProvider = new GeoapifyGeocodeProvider();
