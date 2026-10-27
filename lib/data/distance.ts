import { TravelMode } from './types';

// Travel mode average speeds in km/h for friendly travel estimates
export const TRAVEL_SPEEDS: Record<TravelMode, number> = {
  walking: 5,
  bike: 15,
  car: 30,
};

/**
 * Calculates great-circle distance between two coordinates in kilometers.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  // Round to 1 decimal place
  return Math.round(distance * 10) / 10;
}

/**
 * Calculates estimated travel time in minutes based on distance and travel mode
 */
export function calculateETA(distanceKm: number, mode: TravelMode = 'bike'): number {
  const safeDistance = typeof distanceKm === 'number' && !isNaN(distanceKm) ? Math.max(0, distanceKm) : 0;
  const speedKmh = TRAVEL_SPEEDS[mode] || 15;
  const hours = safeDistance / speedKmh;
  const minutes = Math.max(1, Math.round(hours * 60));
  return Number.isFinite(minutes) ? minutes : 1;
}

/**
 * Formats estimated time into clean friendly human-readable text
 */
export function formatETA(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 1) {
    return '1 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const rem = Math.round(minutes % 60);
  return rem === 0 ? `${hrs} hr` : `${hrs}h ${rem}m`;
}
