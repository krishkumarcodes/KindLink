import { HelpCategory, TravelMode } from './types';

// Category Type Weights for Newton-inspired Help Gravity
export const CATEGORY_WEIGHTS: Record<HelpCategory, number> = {
  blood: 10,
  transport: 9,
  elderly: 6,
  equipment: 5, // Wheelchair & medical equipment
  books: 2,
};

export const CATEGORY_NAMES: Record<HelpCategory, string> = {
  blood: 'Blood Donation',
  transport: 'Emergency Transport',
  elderly: 'Elderly Care',
  equipment: 'Medical Equipment / Wheelchair',
  books: 'Books & Study Material',
};

// Travel mode speeds in km/h
export const TRAVEL_SPEEDS: Record<TravelMode, number> = {
  walking: 5,
  bike: 15,
  car: 30,
};

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula
 */
export function calculateHaversineDistance(
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
 * Calculates Estimated Time of Arrival (ETA) in minutes based on distance and travel mode
 */
export function calculateETA(distanceKm: number, mode: TravelMode = 'bike'): number {
  const speedKmh = TRAVEL_SPEEDS[mode];
  const hours = distanceKm / speedKmh;
  const minutes = Math.max(1, Math.round(hours * 60));
  return minutes;
}

/**
 * Formats ETA minutes into clean human-readable text
 */
export function formatETA(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hrs} hr` : `${hrs}h ${rem}m`;
}

/**
 * Calculates Help Gravity urgency score:
 * Score = typeWeight * (1 + 0.05 * waitingMinutes) / (1 + distanceKm)^2
 */
export function calculateHelpGravity(
  category: HelpCategory,
  waitingMinutes: number,
  distanceKm: number
): number {
  const typeWeight = CATEGORY_WEIGHTS[category] || 5;
  const timeFactor = 1 + 0.05 * Math.max(0, waitingMinutes);
  const distanceFactor = Math.pow(1 + Math.max(0, distanceKm), 2);
  const rawScore = (typeWeight * timeFactor) / distanceFactor;

  // Round to 2 decimal places
  return Math.round(rawScore * 100) / 100;
}

/**
 * Provides a structured breakdown explaining "Why this rank?" in simple terms
 */
export function explainHelpGravity(
  category: HelpCategory,
  waitingMinutes: number,
  distanceKm: number
) {
  const weight = CATEGORY_WEIGHTS[category] || 5;
  const timeFactor = 1 + 0.05 * Math.max(0, waitingMinutes);
  const distDenominator = Math.pow(1 + Math.max(0, distanceKm), 2);
  const score = calculateHelpGravity(category, waitingMinutes, distanceKm);

  return {
    score,
    typeWeight: weight,
    categoryName: CATEGORY_NAMES[category],
    waitingMinutes,
    timeFactor: Math.round(timeFactor * 100) / 100,
    distanceKm,
    distanceDenominator: Math.round(distDenominator * 100) / 100,
    explanation: `This request received a Help Gravity score of ${score}. Blood and emergency transport carry the highest inherent priority (weight ${weight}/10). Because the requester has been waiting ${waitingMinutes} min, time amplified the urgency by ${Math.round((timeFactor - 1) * 100)}%. The closer distance of ${distanceKm} km yields a high gravitational pull, matching nearby helpers rapidly.`,
  };
}
