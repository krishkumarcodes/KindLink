import { Coordinates, LatLngTuple, RouteOptions, RouteProvider, RouteResult, TravelMode } from '../types';
import { formatETA } from '@/lib/data/distance';
import { orsThrottle } from '../rate-limiter';

interface ORSGeoJSONResponse {
  type: string;
  features?: Array<{
    type: string;
    properties: {
      summary: {
        distance: number; // meters
        duration: number; // seconds
      };
      segments?: Array<{
        distance: number;
        duration: number;
      }>;
    };
    geometry: {
      type: string;
      coordinates: Array<[number, number]>; // [lng, lat]
    };
  }>;
}

export class ORSRouteProvider implements RouteProvider {
  readonly id = 'openrouteservice';
  readonly name = 'OpenRouteService Directions';

  private apiKey: string | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey;
    }
  }

  private getKey(): string {
    return (
      this.apiKey ||
      process.env.OPENROUTESERVICE_API_KEY ||
      process.env.ORS_API_KEY ||
      process.env.NEXT_PUBLIC_ORS_API_KEY ||
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
      throw new Error('OpenRouteService API key not configured');
    }

    const profile = this.mapTravelModeToProfile(mode);
    const url = `https://api.openrouteservice.org/v2/directions/${profile}/geojson`;

    const body = {
      coordinates: [
        [origin.lng, origin.lat],
        [destination.lng, destination.lat],
      ],
      preference: options?.preference || 'recommended',
    };

    return orsThrottle.schedule(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: key,
          'Content-Type': 'application/json',
          Accept: 'application/json, application/geo+json',
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!res.ok) {
        throw Object.assign(new Error(`OpenRouteService HTTP ${res.status}: ${res.statusText}`), {
          status: res.status,
        });
      }

      const data: ORSGeoJSONResponse = await res.json();
      const feature = data.features?.[0];

      if (!feature || !feature.geometry?.coordinates) {
        throw new Error('No route returned from OpenRouteService');
      }

      const summary = feature.properties?.summary || { distance: 0, duration: 0 };
      const distanceKm = Math.round((summary.distance / 1000) * 10) / 10;
      const durationMinutes = Math.max(1, Math.round(summary.duration / 60));

      // Convert [lng, lat] GeoJSON coordinates to Leaflet LatLngTuple [lat, lng]
      const coordinates: LatLngTuple[] = feature.geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);

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
        summary: `ORS ${profile}`,
        waypoints: [origin, destination],
        raw: feature,
      };
    });
  }

  private mapTravelModeToProfile(mode: TravelMode): string {
    switch (mode) {
      case 'car':
      case 'driving':
        return 'driving-car';
      case 'walking':
        return 'foot-walking';
      case 'bike':
      case 'cycling':
      default:
        return 'cycling-regular';
    }
  }

  private getFriendlyModeLabel(mode: TravelMode): string {
    if (mode === 'walking') return 'foot';
    if (mode === 'bike' || mode === 'cycling') return 'bike';
    return 'car';
  }
}

export const orsRouteProvider = new ORSRouteProvider();
