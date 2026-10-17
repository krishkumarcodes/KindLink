import { Coordinates, LatLngTuple, RouteOptions, RouteProvider, RouteResult, TravelMode } from '../types';
import { formatETA } from '@/lib/data/distance';
import { geoapifyThrottle } from '../rate-limiter';

interface GeoapifyRoutingFeature {
  type: string;
  properties: {
    mode?: string;
    distance: number; // meters
    time: number; // seconds
  };
  geometry: {
    type: 'LineString' | 'MultiLineString';
    coordinates: Array<[number, number]> | Array<Array<[number, number]>>;
  };
}

interface GeoapifyRoutingResponse {
  type: string;
  features?: GeoapifyRoutingFeature[];
}

export class GeoapifyRouteProvider implements RouteProvider {
  readonly id = 'geoapify-route';
  readonly name = 'Geoapify Routing';

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

  async route(
    origin: Coordinates,
    destination: Coordinates,
    mode: TravelMode = 'bike',
    options?: RouteOptions
  ): Promise<RouteResult> {
    const key = this.getKey();
    if (!key) {
      throw new Error('Geoapify API key not configured');
    }

    const geoMode = this.mapTravelModeToGeoapify(mode);
    const url = new URL('https://api.geoapify.com/v1/routing');
    url.searchParams.set('waypoints', `${origin.lat},${origin.lng}|${destination.lat},${destination.lng}`);
    url.searchParams.set('mode', geoMode);
    url.searchParams.set('apiKey', key);

    return geoapifyThrottle.schedule(async () => {
      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: options?.signal,
      });

      if (!res.ok) {
        throw Object.assign(new Error(`Geoapify Routing HTTP ${res.status}: ${res.statusText}`), {
          status: res.status,
        });
      }

      const data: GeoapifyRoutingResponse = await res.json();
      const feature = data.features?.[0];

      if (!feature || !feature.geometry?.coordinates) {
        throw new Error('No route returned from Geoapify Routing');
      }

      const distanceKm = Math.round((feature.properties.distance / 1000) * 10) / 10;
      const durationMinutes = Math.max(1, Math.round(feature.properties.time / 60));

      const rawCoords = feature.geometry.coordinates;
      const flatPoints: Array<[number, number]> =
        feature.geometry.type === 'MultiLineString'
          ? (rawCoords as Array<Array<[number, number]>>).flat()
          : (rawCoords as Array<[number, number]>);

      // Convert [lng, lat] to Leaflet [lat, lng]
      const coordinates: LatLngTuple[] = flatPoints.map(([lng, lat]) => [lat, lng]);

      const modeLabel = this.getFriendlyModeLabel(mode);
      const formattedText = `${distanceKm.toFixed(1)} km, about ${formatETA(durationMinutes)} by ${modeLabel}`;

      return {
        distanceKm,
        durationMinutes,
        formattedText,
        coordinates,
        mode,
        sourceProvider: this.id,
        isFallback: false,
        isDegraded: false,
        summary: `Geoapify ${geoMode}`,
        waypoints: [origin, destination],
        raw: feature,
      };
    });
  }

  private mapTravelModeToGeoapify(mode: TravelMode): string {
    switch (mode) {
      case 'car':
      case 'driving':
        return 'drive';
      case 'walking':
        return 'walk';
      case 'bike':
      case 'cycling':
      default:
        return 'bicycle';
    }
  }

  private getFriendlyModeLabel(mode: TravelMode): string {
    if (mode === 'walking') return 'foot';
    if (mode === 'bike' || mode === 'cycling') return 'bike';
    return 'car';
  }
}

export const geoapifyRouteProvider = new GeoapifyRouteProvider();
