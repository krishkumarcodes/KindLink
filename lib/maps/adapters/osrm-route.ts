import { Coordinates, LatLngTuple, RouteOptions, RouteProvider, RouteResult, TravelMode } from '../types';
import { formatETA } from '@/lib/data/distance';

interface OSRMRouteResponse {
  code: string;
  routes?: Array<{
    distance: number; // meters
    duration: number; // seconds
    geometry: {
      type: 'LineString';
      coordinates: Array<[number, number]>; // [lng, lat]
    };
  }>;
}

export class OSRMRouteProvider implements RouteProvider {
  readonly id = 'osrm-route';
  readonly name = 'OSRM Routing (Public)';

  isConfigured(): boolean {
    return true; // Public OSRM demo API
  }

  async route(
    origin: Coordinates,
    destination: Coordinates,
    mode: TravelMode = 'bike',
    options?: RouteOptions
  ): Promise<RouteResult> {
    const service = this.mapTravelModeToOSRMService(mode);
    const url = `https://router.project-osrm.org/route/v1/${service}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KindLink-Mutual-Aid/1.0',
      },
      signal: options?.signal,
    });

    if (!res.ok) {
      throw Object.assign(new Error(`OSRM HTTP ${res.status}: ${res.statusText}`), {
        status: res.status,
      });
    }

    const data: OSRMRouteResponse = await res.json();
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM routing failed with code: ${data.code || 'unknown'}`);
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;

    // Calculate realistic mode-based duration:
    // If walking: average ~5 km/h; if bike: average ~15 km/h; if driving: use OSRM duration
    let durationMinutes = Math.max(1, Math.round(route.duration / 60));
    if (mode === 'walking') {
      durationMinutes = Math.max(1, Math.round((distanceKm / 5) * 60));
    } else if (mode === 'bike' || mode === 'cycling') {
      durationMinutes = Math.max(1, Math.round((distanceKm / 15) * 60));
    }

    // Convert [lng, lat] GeoJSON coordinates to Leaflet [lat, lng]
    const coordinates: LatLngTuple[] = route.geometry.coordinates.map(([lng, lat]) => [
      lat,
      lng,
    ]);

    // Ensure origin and destination are present
    if (coordinates.length < 2) {
      coordinates.unshift([origin.lat, origin.lng]);
      coordinates.push([destination.lat, destination.lng]);
    }

    const modeLabel = this.getFriendlyModeLabel(mode);
    const formattedText = `${distanceKm.toFixed(1)} km, about ${formatETA(durationMinutes)} by ${modeLabel}`;

    return {
      distanceKm,
      durationMinutes,
      formattedText,
      coordinates,
      mode,
      sourceProvider: this.id,
      isFallback: true, // OSRM public demo server is considered a fallback in KindLink
      isDegraded: false,
      summary: `OSRM ${service}`,
      waypoints: [origin, destination],
      raw: route,
    };
  }

  private mapTravelModeToOSRMService(mode: TravelMode): string {
    switch (mode) {
      case 'car':
      case 'driving':
        return 'routed-car';
      case 'walking':
        return 'routed-foot';
      case 'bike':
      case 'cycling':
      default:
        return 'routed-bike';
    }
  }

  private getFriendlyModeLabel(mode: TravelMode): string {
    if (mode === 'walking') return 'foot';
    if (mode === 'bike' || mode === 'cycling') return 'bike';
    return 'car';
  }
}

export const osrmRouteProvider = new OSRMRouteProvider();
