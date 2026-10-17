/**
 * KindLink Server-Side IPinfo Lite Client & Country Resolver
 *
 * Requirements:
 * 1. Call IPinfo Lite from SERVER ONLY:
 *    GET https://api.ipinfo.io/lite/<ip>?token=<IPINFO_TOKEN>
 * 2. Token from process.env.IPINFO_TOKEN (fallback to '3bceff41ceb2e5' if present).
 * 3. Hard timeout of 600ms (configurable via process.env.IPINFO_TIMEOUT_MS). Use AbortController.
 * 4. On timeout or failure: return { country: 'IN', countryCode: 'IN' } (or null/English fallback).
 *    Do NOT retry on the same request.
 * 5. Response parsing: Handle both country_code and country fields safely.
 *    Normalize to 2-letter uppercase country code (e.g. 'FR', 'US', 'IN').
 * 6. In-memory cache (2000 entries, 24-hour TTL) keyed by IP network prefix (/24 for IPv4, /48 for IPv6).
 * 7. Circuit breaker: After 5 consecutive failures, pause lookups for 5 minutes (CIRCUIT_COOLDOWN_MS = 300000).
 * 8. Rate limiting: Max 10 requests per minute per IP.
 * 9. Privacy Invariant: NEVER store the IP in a database, cookie, analytics, or persistent logs.
 *    Only use inside that request to get the country code.
 * 10. Test Helper: When outside production or ALLOW_TEST_COUNTRY=true, support DEV_FORCE_COUNTRY
 *     or x-test-country header. Must be strictly impossible to trigger in production
 *     (NODE_ENV === 'production' && !process.env.ALLOW_TEST_COUNTRY).
 */

import type { IpLookupResult, IpCacheEntry } from './types';
import { cleanIp, getIpNetworkPrefix, isPrivateOrReservedIp } from './ipUtils';
import { normalizeCountryCode } from './countryLanguageMap';

// Circuit breaker constants
export const CIRCUIT_COOLDOWN_MS = 300000; // 5 minutes (300,000 ms)
export const CONSECUTIVE_FAILURES_THRESHOLD = 5;

// Cache constants
export const MAX_CACHE_ENTRIES = 2000;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (86,400,000 ms)

// Rate limit constants
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
export const MAX_REQUESTS_PER_MINUTE = 10;

// Default fallback on timeout / error / private IP
export const DEFAULT_FALLBACK: IpLookupResult = {
  country: 'IN',
  countryCode: 'IN',
  source: 'fallback',
};

// --- In-Memory State ---

// Cache keyed by IP network prefix (/24 for IPv4, /48 for IPv6)
const prefixCache = new Map<string, IpCacheEntry>();

// Rate limiter state: IP -> timestamps[]
const rateLimitMap = new Map<string, number[]>();

// Circuit breaker state
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
let halfOpenProbeInFlight = false;

/**
 * Checks if the circuit breaker allows a request.
 */
function canAttemptApiRequest(): boolean {
  const now = Date.now();
  if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
    if (now < circuitOpenUntil) {
      return false; // Circuit is open
    }
    // Half-open: allow 1 probe request
    if (halfOpenProbeInFlight) {
      return false;
    }
    halfOpenProbeInFlight = true;
    return true;
  }
  return true;
}

/**
 * Records a successful API lookup in circuit breaker.
 */
function recordApiSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
  halfOpenProbeInFlight = false;
}

/**
 * Records an API lookup failure in circuit breaker.
 */
function recordApiFailure(): void {
  halfOpenProbeInFlight = false;
  consecutiveFailures += 1;
  if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  }
}

/**
 * Checks whether an IP has exceeded the rate limit of 10 requests / minute.
 * Stores timestamps in transient memory only; never persisted or logged.
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const history = rateLimitMap.get(ip) || [];
  const recent = history.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_REQUESTS_PER_MINUTE) {
    rateLimitMap.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);

  // Prune map if size grows beyond 5000
  if (rateLimitMap.size > 5000) {
    for (const [k, timestamps] of rateLimitMap.entries()) {
      if (timestamps.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) {
        rateLimitMap.delete(k);
      }
    }
  }

  return false;
}

/**
 * Resolves test country override when allowed by environment.
 * Must be strictly impossible to trigger in production unless ALLOW_TEST_COUNTRY is 'true'.
 */
function getTestOverride(testHeaderCountry?: string | null): string | null {
  const isProduction = process.env.NODE_ENV === 'production';
  const allowTest = process.env.ALLOW_TEST_COUNTRY === 'true';

  if (isProduction && !allowTest) {
    return null;
  }

  const candidate = (testHeaderCountry || process.env.DEV_FORCE_COUNTRY)?.trim();
  if (candidate) {
    return normalizeCountryCode(candidate);
  }

  return null;
}

/**
 * Main IP Lookup Function:
 * Resolves client country code using IPinfo Lite API with caching, circuit breaker,
 * rate limiting, and private IP filtering.
 *
 * @param clientIp Raw client IP (e.g. from x-forwarded-for or x-real-ip)
 * @param testHeaderCountry Optional header value (x-test-country) for testing
 */
export async function lookupCountryByIp(
  clientIp: string | null | undefined,
  testHeaderCountry?: string | null
): Promise<IpLookupResult> {
  // 1. Test helper override (strictly impossible in production unless ALLOW_TEST_COUNTRY === 'true')
  const testCountry = getTestOverride(testHeaderCountry);
  if (testCountry) {
    return {
      country: testCountry,
      countryCode: testCountry,
      source: 'test-override',
    };
  }

  // 2. Validate IP presence & filter private/loopback/CGNAT addresses
  if (!clientIp) {
    return DEFAULT_FALLBACK;
  }

  const cleaned = cleanIp(clientIp);
  if (isPrivateOrReservedIp(cleaned)) {
    return DEFAULT_FALLBACK;
  }

  // 3. Rate limiting: Max 10 requests per minute per IP
  if (isRateLimited(cleaned)) {
    return {
      country: 'IN',
      countryCode: 'IN',
      source: 'rate-limit',
    };
  }

  // 4. Compute network prefix (/24 for IPv4, /48 for IPv6)
  const prefix = getIpNetworkPrefix(cleaned);

  // 5. In-memory Cache Check (24-hour TTL, max 2000 entries)
  const now = Date.now();
  const cached = prefixCache.get(prefix);
  if (cached) {
    if (now - cached.timestamp < CACHE_TTL_MS) {
      return {
        country: cached.country,
        countryCode: cached.country,
        source: 'cache',
      };
    }
    // Expired
    prefixCache.delete(prefix);
  }

  // 6. Circuit breaker check
  if (!canAttemptApiRequest()) {
    return {
      country: 'IN',
      countryCode: 'IN',
      source: 'circuit-breaker',
    };
  }

  // 7. Make request to IPinfo Lite with hard timeout
  const token = process.env.IPINFO_TOKEN || '3bceff41ceb2e5';
  const timeoutMs = parseInt(process.env.IPINFO_TIMEOUT_MS || '600', 10);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `https://api.ipinfo.io/lite/${encodeURIComponent(cleaned)}?token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'KindLink/3.5 (Locale Resolver)',
      },
    });

    if (!res.ok) {
      recordApiFailure();
      return DEFAULT_FALLBACK;
    }

    const data = (await res.json()) as {
      country?: string;
      country_code?: string;
      countryCode?: string;
      bogon?: boolean;
    };

    if (data.bogon) {
      recordApiFailure();
      return DEFAULT_FALLBACK;
    }

    // Safely parse country_code or country
    const rawCountry = data.country_code || data.countryCode || data.country;
    if (!rawCountry || typeof rawCountry !== 'string') {
      recordApiFailure();
      return DEFAULT_FALLBACK;
    }

    const resolvedCountry = normalizeCountryCode(rawCountry);

    recordApiSuccess();

    // Store in prefix cache (bounded at MAX_CACHE_ENTRIES)
    if (prefixCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = prefixCache.keys().next().value;
      if (oldestKey) prefixCache.delete(oldestKey);
    }

    prefixCache.set(prefix, {
      country: resolvedCountry,
      timestamp: Date.now(),
    });

    return {
      country: resolvedCountry,
      countryCode: resolvedCountry,
      source: 'api',
    };
  } catch {
    // Timeout or network error
    recordApiFailure();
    return DEFAULT_FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}

// --- Diagnostic & Testing Utilities (Non-production helpers) ---

export function resetCircuitBreaker(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
  halfOpenProbeInFlight = false;
}

export function clearIpCache(): void {
  prefixCache.clear();
}

export function resetRateLimits(): void {
  rateLimitMap.clear();
}

export function getCircuitBreakerState(): {
  consecutiveFailures: number;
  circuitOpenUntil: number;
  isOpen: boolean;
} {
  return {
    consecutiveFailures,
    circuitOpenUntil,
    isOpen: consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD && Date.now() < circuitOpenUntil,
  };
}

export function recordFailureForTesting(): void {
  recordApiFailure();
}

export function getCacheStats(): { size: number; max: number } {
  return {
    size: prefixCache.size,
    max: MAX_CACHE_ENTRIES,
  };
}
