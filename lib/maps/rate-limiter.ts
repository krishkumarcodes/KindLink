/**
 * KindLink Maps Rate Limiting & Nominatim Serialization Engine
 * 
 * Provides:
 * 1. In-memory sliding window rate limiting per IP / User identifier.
 *    (30 req/min for geocoding, 20 req/min for routing, stricter for anonymous)
 * 2. Global serialized queue for Nominatim: strictly max 1 request per second
 *    across the entire application, injecting User-Agent with MAPS_CONTACT_EMAIL.
 * 3. Provider rate throttlers (e.g. Geoapify 5 req/s, ORS 40 req/min).
 */

export interface RateLimitConfig {
  geocode: {
    authenticated: number; // 30 req/min
    anonymous: number;     // 15 req/min
  };
  route: {
    authenticated: number; // 20 req/min
    anonymous: number;     // 10 req/min
  };
  places: {
    authenticated: number; // 20 req/min
    anonymous: number;     // 10 req/min
  };
}

export const DEFAULT_MAP_RATE_LIMITS: RateLimitConfig = {
  geocode: {
    authenticated: 30,
    anonymous: 15,
  },
  route: {
    authenticated: 20,
    anonymous: 10,
  },
  places: {
    authenticated: 20,
    anonymous: 10,
  },
};

export interface RateLimitCheckResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
}

export class InMemoryRateLimiter {
  // Key format: `${identifier}:${category}` -> array of request timestamps
  private records = new Map<string, number[]>();
  private windowMs = 60 * 1000; // 1 minute sliding window
  private limits: RateLimitConfig;
  private lastPruneTimestamp = Date.now();

  constructor(limits: RateLimitConfig = DEFAULT_MAP_RATE_LIMITS) {
    this.limits = limits;
  }

  /**
   * Checks whether the client identifier (IP or User ID) is within rate limits
   */
  public check(
    identifier: string,
    category: 'geocode' | 'route' | 'places',
    isAnonymous = false
  ): RateLimitCheckResult {
    const now = Date.now();
    this.maybePrune(now);

    const limit = isAnonymous
      ? this.limits[category].anonymous
      : this.limits[category].authenticated;

    const key = `${identifier}:${category}`;
    const windowStart = now - this.windowMs;

    const timestamps = (this.records.get(key) || []).filter((t) => t > windowStart);

    if (timestamps.length >= limit) {
      const oldest = timestamps[0];
      const resetMs = Math.max(0, oldest + this.windowMs - now);
      return {
        allowed: false,
        limit,
        remaining: 0,
        resetMs,
      };
    }

    timestamps.push(now);
    this.records.set(key, timestamps);

    return {
      allowed: true,
      limit,
      remaining: Math.max(0, limit - timestamps.length),
      resetMs: this.windowMs,
    };
  }

  /**
   * Asserts rate limit, throwing an Error with HTTP 429 semantics if exceeded
   */
  public assert(
    identifier: string,
    category: 'geocode' | 'route' | 'places',
    isAnonymous = false
  ): void {
    const result = this.check(identifier, category, isAnonymous);
    if (!result.allowed) {
      const error = Object.assign(
        new Error(
          `Rate limit exceeded for map ${category}. Max ${result.limit} req/min. Please retry in ${Math.ceil(
            result.resetMs / 1000
          )}s.`
        ),
        { status: 429, retryAfterMs: result.resetMs }
      );
      throw error;
    }
  }

  /**
   * Resets records for testing or administrative purposes
   */
  public reset(): void {
    this.records.clear();
  }

  private maybePrune(now: number): void {
    // Prune stale records every 5 minutes
    if (now - this.lastPruneTimestamp < 5 * 60 * 1000) {
      return;
    }
    this.lastPruneTimestamp = now;
    const windowStart = now - this.windowMs;

    this.records.forEach((timestamps: number[], key: string) => {
      const active = timestamps.filter((t: number) => t > windowStart);
      if (active.length === 0) {
        this.records.delete(key);
      } else {
        this.records.set(key, active);
      }
    });
  }
}

export const inMemoryRateLimiter = new InMemoryRateLimiter();

// ============================================================================
// Global Serialized Queue for OpenStreetMap Nominatim
// OSM Nominatim Usage Policy Strictly Requires:
// 1. Max 1 request per second across the entire application.
// 2. Clear identification via User-Agent and valid contact email.
// 3. NO automated autocomplete / search-as-you-type queries.
// ============================================================================

export function getNominatimContactEmail(): string {
  return (
    process.env.MAPS_CONTACT_EMAIL ||
    process.env.NEXT_PUBLIC_MAPS_CONTACT_EMAIL ||
    'support@kindlink.org'
  );
}

export function getNominatimHeaders(): Record<string, string> {
  const email = getNominatimContactEmail();
  return {
    'User-Agent': `KindLink-Mutual-Aid/1.0 (${email})`,
    Accept: 'application/json',
  };
}

class NominatimQueue {
  private lastRequestTime = 0;
  private queueTail: Promise<void> = Promise.resolve();
  private readonly minIntervalMs = 1000; // strictly 1 req / second

  /**
   * Schedules a task in the serialized Nominatim queue.
   * Guarantees at least 1,000 ms between subsequent executions.
   */
  public schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queueTail = this.queueTail
        .then(async () => {
          const now = Date.now();
          const elapsed = now - this.lastRequestTime;
          if (elapsed < this.minIntervalMs) {
            const waitTime = this.minIntervalMs - elapsed;
            await new Promise((res) => setTimeout(res, waitTime));
          }
          this.lastRequestTime = Date.now();
          return task();
        })
        .then(resolve)
        .catch(reject);
    });
  }
}

export const nominatimQueue = new NominatimQueue();

/**
 * Serialized helper to execute a fetch request through the Nominatim queue
 */
export async function fetchWithNominatimQueue(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...getNominatimHeaders(),
    ...(options.headers as Record<string, string> | undefined),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new Error('Nominatim request timed out after 5000ms'));
  }, 5000);

  const onSignalAbort = () => controller.abort();
  if (options.signal) {
    options.signal.addEventListener('abort', onSignalAbort, { once: true });
  }

  try {
    return await nominatimQueue.schedule(() =>
      fetch(url, {
        ...options,
        signal: controller.signal,
        headers,
      })
    );
  } finally {
    clearTimeout(timer);
    if (options.signal) {
      options.signal.removeEventListener('abort', onSignalAbort);
    }
  }
}

// ============================================================================
// Provider Rate Throttlers
// ============================================================================

/**
 * Throttle queue for Geoapify: strictly max 5 requests per second (200 ms interval)
 */
class SimpleThrottleQueue {
  private lastTime = 0;
  private tail: Promise<void> = Promise.resolve();
  private readonly intervalMs: number;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  public schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tail = this.tail
        .then(async () => {
          const now = Date.now();
          const elapsed = now - this.lastTime;
          if (elapsed < this.intervalMs) {
            await new Promise((res) => setTimeout(res, this.intervalMs - elapsed));
          }
          this.lastTime = Date.now();
          return task();
        })
        .then(resolve)
        .catch(reject);
    });
  }
}

// Geoapify throttle: 5 req/s -> 200ms spacing
export const geoapifyThrottle = new SimpleThrottleQueue(200);

// OpenRouteService throttle: 40 req/min -> 1500ms spacing
export const orsThrottle = new SimpleThrottleQueue(1500);
