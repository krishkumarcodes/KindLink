/**
 * KindLink Maps Security, Origin Protection & Request Guards
 * 
 * Ensures:
 * 1. Strict same-origin protection: only requests from KindLink frontends
 *    (or local development) are permitted. Prevents external websites from
 *    leeching KindLink geocoding / routing proxies.
 * 2. Client identification (IP and authentication state) for rate limiting.
 * 3. Clean, uniform, plain-English error responses.
 */

import { NextResponse } from 'next/server';
import { inMemoryRateLimiter } from './rate-limiter';

/**
 * Extracts and normalizes hostname from a header URL or host string
 */
function extractHostname(val: string | null | undefined): string | null {
  if (!val) return null;
  try {
    if (val.startsWith('http://') || val.startsWith('https://')) {
      return new URL(val).hostname.toLowerCase();
    }
    // Might be 'localhost:3000' or 'kindlink.onrender.com'
    return val.split(':')[0].toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Validates that the incoming HTTP request originates from KindLink itself.
 * Rejects foreign origins and cross-site requests with clear plain-English messages.
 */
export function validateSameOrigin(req: Request): { allowed: boolean; reason?: string } {
  // Always permit in development or when testing in offline mock mode
  if (process.env.NODE_ENV === 'development' || process.env.DATA_SOURCE === 'mock') {
    return { allowed: true };
  }

  const hostHeader = req.headers.get('host');
  const originHeader = req.headers.get('origin');
  const refererHeader = req.headers.get('referer');
  const secFetchSite = req.headers.get('sec-fetch-site');

  const expectedHost = extractHostname(hostHeader);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const expectedSiteHost = extractHostname(siteUrl);

  // If Sec-Fetch-Site indicates explicit cross-site, reject immediately
  if (secFetchSite && secFetchSite === 'cross-site') {
    return {
      allowed: false,
      reason: 'Cross-site map access is forbidden. Please access maps through the KindLink application.',
    };
  }

  // Check Origin header if present
  if (originHeader) {
    const originHost = extractHostname(originHeader);
    const matchesHost = originHost && expectedHost && originHost === expectedHost;
    const matchesSite = originHost && expectedSiteHost && originHost === expectedSiteHost;
    const isLocal = originHost === 'localhost' || originHost === '127.0.0.1';

    if (!matchesHost && !matchesSite && !isLocal) {
      return {
        allowed: false,
        reason: 'Forbidden: Origin not authorized to use KindLink map services.',
      };
    }
  }

  // Check Referer header if present
  if (refererHeader) {
    const refererHost = extractHostname(refererHeader);
    const matchesHost = refererHost && expectedHost && refererHost === expectedHost;
    const matchesSite = refererHost && expectedSiteHost && refererHost === expectedSiteHost;
    const isLocal = refererHost === 'localhost' || refererHost === '127.0.0.1';

    if (!matchesHost && !matchesSite && !isLocal) {
      return {
        allowed: false,
        reason: 'Forbidden: Referer not authorized to use KindLink map services.',
      };
    }
  }

  return { allowed: true };
}

/**
 * Resolves client identifier (IP + authentication state) for rate limiting
 */
export function getClientInfo(req: Request): { identifier: string; isAnonymous: boolean } {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const clientIp = forwarded ? forwarded.split(',')[0].trim() : realIp || '127.0.0.1';

  const cookie = req.headers.get('cookie') || '';
  const authHeader = req.headers.get('authorization') || '';
  const isAnonymous = !cookie.includes('auth-token') && !authHeader.startsWith('Bearer ');

  return {
    identifier: clientIp,
    isAnonymous,
  };
}

/**
 * Checks rate limits and throws HTTP 429 error if quota exceeded
 */
export function enforceMapRateLimit(
  req: Request,
  category: 'geocode' | 'route' | 'places'
): void {
  const { identifier, isAnonymous } = getClientInfo(req);
  inMemoryRateLimiter.assert(identifier, category, isAnonymous);
}

/**
 * Formats a clean, plain-English JSON error response
 */
export function plainErrorResponse(
  message: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    },
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
