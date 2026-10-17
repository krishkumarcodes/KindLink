/**
 * KindLink Maps Core Type Definitions
 * Unifies Tile, Geocoding, Routing, and Places provider contracts with
 * fallback metadata, circuit-breaker statuses, and rate limiting definitions.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

export type LatLngTuple = [number, number]; // [latitude, longitude] for Leaflet

export type BoundingBox = [number, number, number, number]; // [south, north, west, east] or [minLat, maxLat, minLng, maxLng]

/**
 * Standard travel modes supported across routing engines
 * Supports canonical modes ('walking', 'cycling', 'driving') and friendly aliases ('bike', 'car')
 */
export type TravelMode = 'walking' | 'cycling' | 'driving' | 'bike' | 'car';

export type ProviderCategory = 'tile' | 'geocode' | 'route' | 'places';

export type CircuitBreakerState = 'closed' | 'open' | 'half-open';

export interface ProviderCapability {
  providerId: string;
  category: ProviderCategory;
  name: string;
  supportsAutocomplete?: boolean;
  supportsReverse?: boolean;
  supportsRouting?: boolean;
  requiresApiKey: boolean;
  rateLimitPerSecond?: number;
  rateLimitPerMinute?: number;
}

export interface ProviderStatus {
  providerId: string;
  category: ProviderCategory;
  state: CircuitBreakerState;
  consecutiveFailures: number;
  totalFailures: number;
  totalSuccesses: number;
  lastFailureTime?: number;
  lastSuccessTime?: number;
  lastError?: string;
  circuitOpenUntil?: number;
}

/**
 * Metadata attached to degraded or fallback operations
 */
export interface EngineExecutionMeta {
  sourceProvider: string;
  isFallback: boolean;
  isDegraded: boolean;
  latencyMs?: number;
  fallbackReason?: string;
  attemptedProviders?: string[];
}

/**
 * Geocoding & Address search result
 */
export interface GeocodeResult {
  id: string;
  name: string;
  displayName: string;
  lat: number;
  lng: number;
  type?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  boundingBox?: BoundingBox;
  confidence?: number;
  sourceProvider: string;
  isFallback?: boolean;
  isDegraded?: boolean;
  raw?: unknown;
}

export interface GeocodeOptions {
  limit?: number;
  biasLat?: number;
  biasLng?: number;
  biasRadiusMeters?: number;
  countryCodes?: string[];
  language?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Routing computation result
 */
export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  formattedText: string; // e.g. "3.2 km, about 9 min by bike" or "about 4.5 km, straight line"
  coordinates: LatLngTuple[]; // [lat, lng] array ready for Leaflet Polyline
  mode: TravelMode;
  sourceProvider: string;
  isFallback: boolean;
  isDegraded: boolean;
  summary?: string;
  waypoints?: Coordinates[];
  raw?: unknown;
}

export interface RouteOptions {
  mode?: TravelMode;
  signal?: AbortSignal;
  timeoutMs?: number;
  preference?: 'recommended' | 'shortest' | 'fastest';
  avoidTolls?: boolean;
  avoidHighways?: boolean;
}

/**
 * Category of place/healthcare facility
 */
export type PlaceCategory =
  | 'hospital'
  | 'clinic'
  | 'pharmacy'
  | 'blood_bank'
  | 'emergency'
  | 'healthcare'
  | 'all';

/**
 * Nearby place or facility result (focused on emergency healthcare)
 */
export interface PlaceResult {
  id: string;
  name: string;
  category: PlaceCategory | string;
  lat: number;
  lng: number;
  address?: string;
  phone?: string;
  distanceKm?: number;
  openingHours?: string;
  emergency?: boolean;
  sourceProvider: string;
  isFallback?: boolean;
  isDegraded?: boolean;
  raw?: unknown;
}

export interface PlacesOptions {
  radiusMeters?: number;
  limit?: number;
  category?: PlaceCategory;
  signal?: AbortSignal;
  timeoutMs?: number;
}

/**
 * Tile provider configuration
 */
export interface TileProviderConfig {
  urlTemplate: string;
  attribution: string;
  maxZoom: number;
  minZoom: number;
  subdomains?: string[];
  retina?: boolean;
}

/**
 * Provider interface contracts
 */
export interface TileProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  getTileConfig(options?: { style?: string; theme?: 'light' | 'dark' }): TileProviderConfig;
  getAttribution(): string;
  getMaxZoom(): number;
  getMinZoom(): number;
}

export interface GeocodeProvider {
  readonly id: string;
  readonly name: string;
  readonly capabilities: {
    readonly autocomplete: boolean;
    readonly search: boolean;
    readonly reverse: boolean;
  };
  isConfigured(): boolean;
  search(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]>;
  autocomplete?(query: string, options?: GeocodeOptions): Promise<GeocodeResult[]>;
  reverse?(lat: number, lng: number, options?: GeocodeOptions): Promise<GeocodeResult | null>;
}

export interface RouteProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  route(
    origin: Coordinates,
    destination: Coordinates,
    mode?: TravelMode,
    options?: RouteOptions
  ): Promise<RouteResult>;
}

export interface PlacesProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  findNearby(
    lat: number,
    lng: number,
    radiusMeters?: number,
    category?: PlaceCategory,
    options?: PlacesOptions
  ): Promise<PlaceResult[]>;
}
