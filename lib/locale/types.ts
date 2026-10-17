/**
 * KindLink Server-side Locale & Geo-lookup Types
 */

export interface IpLookupResult {
  country: string;
  countryCode: string;
  source: 'api' | 'cache' | 'rate-limit' | 'circuit-breaker' | 'test-override' | 'fallback';
}

export interface LocaleDetectionResult {
  language: string;
  country: string;
  source: 'auto' | 'user' | 'bot' | 'fallback' | 'test-override';
}

export interface IpCacheEntry {
  country: string;
  timestamp: number;
}
