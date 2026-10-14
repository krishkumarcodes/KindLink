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
  const speedKmh = TRAVEL_SPEEDS[mode] || 15;
  const hours = distanceKm / speedKmh;
  const minutes = Math.max(1, Math.round(hours * 60));
  return minutes;
}

/**
 * Formats estimated time into clean friendly human-readable text
 */
export function formatETA(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs}h ${rem}m`;
}
