/**
 * KindLink Maps Configuration & Environment Manager
 * 
 * Manages provider cascade hierarchy, API keys, daily quota soft limits,
 * cache TTLs, and public map settings (MapTiler keys, style IDs, bounds).
 * Automatically skips providers whose required credentials are not configured.
 */

import { ProviderCategory } from './types';

// ============================================================================
// India Geocoding & Viewport Bounds
// ============================================================================
export const INDIA_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 68.0],   // Southwest corner (Southern tip of India / Arabian Sea)
  [35.5, 97.5],  // Northeast corner (Kashmir / Arunachal Pradesh border)
];

export const ASANSOL_DEFAULT_CENTER = {
  lat: 23.6889,
  lng: 86.9661,
  city: 'Asansol',
  state: 'West Bengal',
  country: 'India',
};

// ============================================================================
// Cache TTLs (Milliseconds)
// ============================================================================
export const MAP_CACHE_TTLS = {
  search: 30 * 24 * 60 * 60 * 1000,   // 30 days
  reverse: 7 * 24 * 60 * 60 * 1000,   // 7 days
  route: 6 * 60 * 60 * 1000,          // 6 hours
  places: 24 * 60 * 60 * 1000,        // 24 hours
} as const;

export type MapCacheCategory = keyof typeof MAP_CACHE_TTLS;

// ============================================================================
// Daily Soft Limits
// ============================================================================
export function getDailySoftLimits() {
  return {
    geoapify: Number(process.env.GEOAPIFY_DAILY_SOFT_LIMIT) || 2500,
    orsDirections: Number(process.env.ORS_DIRECTIONS_DAILY_SOFT_LIMIT) || 1800,
    orsGeocode: Number(process.env.ORS_GEOCODE_DAILY_SOFT_LIMIT) || 900,
  };
}

// ============================================================================
// API Key Helpers (Server-side & Public)
// ============================================================================
export function getMapTilerKey(): string {
  return (
    process.env.MAPTILER_API_KEY ||
    process.env.NEXT_PUBLIC_MAPTILER_API_KEY ||
    ''
  ).trim();
}

export function getGeoapifyKey(): string {
  return (
    process.env.GEOAPIFY_API_KEY ||
    process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY ||
    ''
  ).trim();
}

export function getOrsKey(): string {
  return (
    process.env.ORS_API_KEY ||
    process.env.OPENROUTESERVICE_API_KEY ||
    ''
  ).trim();
}

/**
 * Checks whether the required API credentials exist for a given provider.
 * Providers that require no API keys (osm, photon, nominatim, osrm, overpass, straight-line)
 * always return true.
 */
export function hasRequiredApiKey(providerId: string): boolean {
  const normalized = providerId.toLowerCase().trim();
  switch (normalized) {
    case 'maptiler':
      return getMapTilerKey().length > 0;
    case 'geoapify':
      return getGeoapifyKey().length > 0;
    case 'ors':
    case 'openrouteservice':
      return getOrsKey().length > 0;
    case 'osm':
    case 'openstreetmap':
    case 'photon':
    case 'nominatim':
    case 'osrm':
    case 'overpass':
    case 'straight-line':
      return true;
    default:
      return true;
  }
}

// ============================================================================
// Provider Order Parsing & Filtering
// ============================================================================
const DEFAULT_PROVIDER_ORDER: Record<ProviderCategory, string[]> = {
  tile: ['maptiler', 'osm'],
  geocode: ['geoapify', 'photon', 'nominatim'],
  route: ['ors', 'geoapify', 'osrm', 'straight-line'],
  places: ['geoapify', 'overpass'],
};

function parseProviderList(envVal: string | undefined, defaultList: string[]): string[] {
  if (!envVal || typeof envVal !== 'string') {
    return defaultList;
  }
  const parsed = envVal
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : defaultList;
}

/**
 * Returns raw configured providers from environment variables without key validation
 */
export function getConfiguredProviders(category: ProviderCategory): string[] {
  switch (category) {
    case 'tile':
      return parseProviderList(process.env.MAP_TILE_PROVIDERS, DEFAULT_PROVIDER_ORDER.tile);
    case 'geocode':
      return parseProviderList(process.env.GEOCODE_PROVIDERS, DEFAULT_PROVIDER_ORDER.geocode);
    case 'route':
      return parseProviderList(process.env.ROUTE_PROVIDERS, DEFAULT_PROVIDER_ORDER.route);
    case 'places':
      return parseProviderList(process.env.PLACES_PROVIDERS, DEFAULT_PROVIDER_ORDER.places);
    default:
      return [];
  }
}

/**
 * Returns active providers for a category, automatically skipping any provider
 * whose required API key is missing.
 */
export function getActiveProviders(category: ProviderCategory): string[] {
  const configured = getConfiguredProviders(category);
  return configured.filter((providerId) => hasRequiredApiKey(providerId));
}

// ============================================================================
// Public Map Configuration (Safe for client exposure via /api/maps/config)
// ============================================================================
export function getPublicMapConfig() {
  const maptilerKey = getMapTilerKey();
  const hasMaptiler = maptilerKey.length > 0;

  return {
    provider: hasMaptiler ? 'maptiler' : 'osm',
    maptilerApiKey: maptilerKey || null,
    styleLight: process.env.MAPTILER_STYLE_LIGHT || 'streets-v2',
    styleDark: process.env.MAPTILER_STYLE_DARK || 'dataviz-dark',
    attribution: {
      maptiler: '© MapTiler © OpenStreetMap contributors',
      osm: '© OpenStreetMap contributors',
    },
    bounds: INDIA_BOUNDS,
    defaultCenter: [ASANSOL_DEFAULT_CENTER.lat, ASANSOL_DEFAULT_CENTER.lng] as [number, number],
    minZoom: 4,
    maxZoom: 19,
    fallbackAvailable: true,
  };
}
