import { BoundingBox, GeocodeOptions, GeocodeProvider, GeocodeResult } from '../types';
import { fetchWithNominatimQueue } from '../rate-limiter';

interface NominatimAddress {
  suburb?: string;
  neighbourhood?: string;
  residential?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

interface NominatimItem {
  place_id: number;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
  type?: string;
  importance?: number;
  boundingbox?: [string, string, string, string]; // [minLat, maxLat, minLng, maxLng]
  address?: NominatimAddress;
}

export class NominatimGeocodeProvider implements GeocodeProvider {
  readonly id = 'nominatim';
  readonly name = 'OpenStreetMap Nominatim';
  readonly capabilities = {
    autocomplete: false,
    search: true,
    reverse: true,
  } as const;

  isConfigured(): boolean {
    return true; // Public OSM Nominatim service
  }

  /**
   * Nominatim usage policy strictly disallows search-as-you-type / autocomplete queries.
   * Throws an explicit error to prevent policy violations.
   */
  async autocomplete(): Promise<GeocodeResult[]> {
    throw new Error(
      'Nominatim usage policy strictly disallows autocomplete / search-as-you-type queries. Use Geoapify or Photon for autocomplete.'
    );
  }

  async search(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]> {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return [];
    }

    const url = new URL('https://nominatim.openstreetmap.org/search');
    url.searchParams.set('q', cleanQuery);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', String(options?.limit || 5));

    if (options?.countryCodes && options.countryCodes.length > 0) {
      url.searchParams.set('countrycodes', options.countryCodes.join(',').toLowerCase());
    }

    if (options?.language) {
      url.searchParams.set('accept-language', options.language);
    }

    if (options?.biasLat !== undefined && options?.biasLng !== undefined) {
      // Nominatim bounded viewbox around coordinates
      const delta = (options.biasRadiusMeters || 10000) / 111320; // approximate deg
      const left = options.biasLng - delta;
      const right = options.biasLng + delta;
      const top = options.biasLat + delta;
      const bottom = options.biasLat - delta;
      url.searchParams.set('viewbox', `${left},${top},${right},${bottom}`);
    }

    const res = await fetchWithNominatimQueue(url.toString(), {
      signal: options?.signal,
    });

    if (!res.ok) {
      throw Object.assign(new Error(`Nominatim HTTP ${res.status}: ${res.statusText}`), {
        status: res.status,
      });
    }

    const items: NominatimItem[] = await res.json();
    return items.map((item) => this.mapToGeocodeResult(item));
  }

  async reverse(lat: number, lng: number, options?: GeocodeOptions): Promise<GeocodeResult | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('addressdetails', '1');

    if (options?.language) {
      url.searchParams.set('accept-language', options.language);
    }

    const res = await fetchWithNominatimQueue(url.toString(), {
      signal: options?.signal,
    });

    if (!res.ok) {
      throw Object.assign(new Error(`Nominatim HTTP ${res.status}: ${res.statusText}`), {
        status: res.status,
      });
    }

    const item: NominatimItem = await res.json();
    if (!item || !item.lat || !item.lon) {
      return null;
    }

    return this.mapToGeocodeResult(item);
  }

  private mapToGeocodeResult(item: NominatimItem): GeocodeResult {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lon);
    const addr = item.address || {};
    const city = addr.city || addr.town || addr.village;
    const suburb = addr.suburb || addr.neighbourhood || addr.residential;

    let boundingBox: BoundingBox | undefined = undefined;
    if (item.boundingbox && item.boundingbox.length === 4) {
      // Nominatim boundingbox: [minLat, maxLat, minLng, maxLng]
      // KindLink BoundingBox: [south, north, west, east] = [minLat, maxLat, minLng, maxLng]
      boundingBox = [
        parseFloat(item.boundingbox[0]),
        parseFloat(item.boundingbox[1]),
        parseFloat(item.boundingbox[2]),
        parseFloat(item.boundingbox[3]),
      ];
    }

    return {
      id: `nominatim-${item.osm_type}-${item.osm_id}`,
      name: item.name || item.display_name.split(',')[0]?.trim() || 'Location',
      displayName: item.display_name,
      lat,
      lng,
      type: item.type,
      suburb,
      city,
      state: addr.state,
      country: addr.country,
      postcode: addr.postcode,
      boundingBox,
      confidence: item.importance,
      sourceProvider: this.id,
      raw: item,
    };
  }
}

export const nominatimGeocodeProvider = new NominatimGeocodeProvider();
