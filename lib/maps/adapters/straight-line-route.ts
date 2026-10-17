import { Coordinates, LatLngTuple, RouteOptions, RouteProvider, RouteResult, TravelMode } from '../types';
import { calculateDistance, formatETA } from '@/lib/data/distance';

export class StraightLineRouteProvider implements RouteProvider {
  readonly id = 'straight-line';
  readonly name = 'Straight Line Geodesic';

  isConfigured(): boolean {
    return true; // Always available as emergency zero-network fallback
  }

  async route(
    origin: Coordinates,
    destination: Coordinates,
    mode: TravelMode = 'bike',
    _options?: RouteOptions
  ): Promise<RouteResult> {
    const dist = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    const speedKmh = this.getSpeedForMode(mode);
    const durationMinutes = Math.max(1, Math.round((dist / speedKmh) * 60));

    const coordinates: LatLngTuple[] = [
      [origin.lat, origin.lng],
      [destination.lat, destination.lng],
    ];

    const modeLabel = this.getFriendlyModeLabel(mode);
    const formattedText = `about ${dist.toFixed(1)} km, straight line (${formatETA(durationMinutes)} by ${modeLabel})`;

    return {
      distanceKm: dist,
      durationMinutes,
      formattedText,
      coordinates,
      mode,
      sourceProvider: this.id,
      isFallback: true,
      isDegraded: true,
      summary: 'Haversine Geodesic Direct',
      waypoints: [origin, destination],
    };
  }

  private getSpeedForMode(mode: TravelMode): number {
    switch (mode) {
      case 'walking':
        return 5;
      case 'car':
      case 'driving':
        return 30;
      case 'bike':
      case 'cycling':
      default:
        return 15;
    }
  }

  private getFriendlyModeLabel(mode: TravelMode): string {
    if (mode === 'walking') return 'foot';
    if (mode === 'bike' || mode === 'cycling') return 'bike';
    return 'car';
  }
}

export const straightLineRouteProvider = new StraightLineRouteProvider();
