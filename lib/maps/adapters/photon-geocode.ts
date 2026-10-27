import { BoundingBox, GeocodeOptions, GeocodeProvider, GeocodeResult } from '../types';

interface PhotonFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: [number, number]; // [lng, lat]
  };
  properties: {
    osm_id?: number | string;
    osm_type?: string;
    osm_key?: string;
    osm_value?: string;
    name?: string;
    housenumber?: string;
    street?: string;
    suburb?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    extent?: [number, number, number, number]; // [minLng, maxLat, maxLng, minLat]
  };
}

interface PhotonResponse {
  type: string;
  features?: PhotonFeature[];
}

export class PhotonGeocodeProvider implements GeocodeProvider {
  readonly id = 'photon';
  readonly name = 'Komoot Photon';
  readonly capabilities = {
    autocomplete: true,
    search: true,
    reverse: true,
  } as const;

  isConfigured(): boolean {
    return true; // Open-source public geocoder, no API key required
  }

  async autocomplete(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]> {
    return this.query(query, options);
  }

  async search(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]> {
    return this.query(query, options);
  }

  async reverse(lat: number, lng: number, options?: GeocodeOptions): Promise<GeocodeResult | null> {
    const url = new URL('https://photon.komoot.io/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    if (options?.language) {
      url.searchParams.set('lang', options.language);
    }

    const results = await this.executeFetch(url.toString(), options?.signal);
    return results[0] || null;
  }

  private async query(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const url = new URL('https://photon.komoot.io/api/');
    url.searchParams.set('q', cleanQuery);
    url.searchParams.set('limit', String(options?.limit || 5));

    if (options?.biasLat !== undefined && options?.biasLng !== undefined) {
      url.searchParams.set('lat', options.biasLat.toString());
      url.searchParams.set('lon', options.biasLng.toString());
    }

    if (options?.language) {
      url.searchParams.set('lang', options.language);
    }

    return this.executeFetch(url.toString(), options?.signal);
  }

  private async executeFetch(urlString: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort(new Error('Photon request timed out after 5000ms'));
    }, 5000);

    const onSignalAbort = () => controller.abort();
    if (signal) {
      signal.addEventListener('abort', onSignalAbort, { once: true });
    }

    try {
      const res = await fetch(urlString, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'KindLink-Mutual-Aid/1.0',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw Object.assign(new Error(`Photon HTTP ${res.status}: ${res.statusText}`), {
          status: res.status,
        });
      }

      const data: PhotonResponse = await res.json();
      const features = data.features || [];

    return features.map((f, idx) => {
      const [lng, lat] = f.geometry.coordinates;
      const props = f.properties || {};

      const name = props.name || props.street || props.city || 'Location';
      const addressParts = [
        props.name,
        props.housenumber ? `${props.housenumber} ${props.street || ''}`.trim() : props.street,
        props.suburb || props.district,
        props.city,
        props.state,
        props.postcode,
        props.country,
      ].filter((p): p is string => Boolean(p && p.trim().length > 0));

      // Remove consecutive duplicates in address parts
      const uniqueParts: string[] = [];
      for (const part of addressParts) {
        if (!uniqueParts.includes(part)) {
          uniqueParts.push(part);
        }
      }
      const displayName = uniqueParts.join(', ') || name;

      let boundingBox: BoundingBox | undefined = undefined;
      if (props.extent && props.extent.length === 4) {
        // Photon extent: [minLng, maxLat, maxLng, minLat]
        // KindLink BoundingBox: [south, north, west, east] = [minLat, maxLat, minLng, maxLng]
        const [minLng, maxLat, maxLng, minLat] = props.extent;
        boundingBox = [minLat, maxLat, minLng, maxLng];
      }

      return {
        id: props.osm_id ? `osm-${props.osm_type || 'N'}-${props.osm_id}` : `photon-${lat}-${lng}-${idx}`,
        name,
        displayName,
        lat,
        lng,
        type: props.osm_value || props.osm_key,
        suburb: props.suburb || props.district,
        city: props.city,
        state: props.state,
        country: props.country,
        postcode: props.postcode,
        boundingBox,
        sourceProvider: this.id,
        raw: f,
      };
    });
  } finally {
    clearTimeout(timeout);
    if (signal) {
      signal.removeEventListener('abort', onSignalAbort);
    }
  }
}
}

export const photonGeocodeProvider = new PhotonGeocodeProvider();
