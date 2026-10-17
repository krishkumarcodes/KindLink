import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mapsFallbackEngine } from '@/lib/maps/engine';
import { buildReverseCacheKey, getMapCache, setMapCache } from '@/lib/maps/cache';
import {
  enforceMapRateLimit,
  plainErrorResponse,
  validateSameOrigin,
} from '@/lib/maps/security';
import { GeocodeResult } from '@/lib/maps/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const reverseSchema = z.object({
  lat: z.coerce
    .number({ required_error: 'Latitude coordinate is required.' })
    .min(-90, 'Latitude must be between -90 and 90.')
    .max(90, 'Latitude must be between -90 and 90.'),
  lng: z.coerce
    .number({ required_error: 'Longitude coordinate is required.' })
    .min(-180, 'Longitude must be between -180 and 180.')
    .max(180, 'Longitude must be between -180 and 180.'),
  language: z.string().max(10).optional(),
});

/**
 * GET /api/maps/reverse?lat=...&lng=...&language=en
 * 
 * Performs reverse geocoding to resolve a human-readable address from coordinates.
 * Coordinates are rounded to 4 decimals for 7-day dual-tier cache reuse.
 */
export async function GET(req: Request) {
  // 1. Same-origin security check
  const originCheck = validateSameOrigin(req);
  if (!originCheck.allowed) {
    return plainErrorResponse(
      originCheck.reason || 'Forbidden: Cross-origin access not permitted.',
      403
    );
  }

  // 2. Client rate-limit enforcement
  try {
    enforceMapRateLimit(req, 'geocode');
  } catch (rateErr) {
    const errObj = (rateErr && typeof rateErr === 'object' ? rateErr : {}) as Record<string, unknown>;
    const message =
      rateErr instanceof Error
        ? rateErr.message
        : 'Too many location lookup requests. Please wait a moment.';
    return plainErrorResponse(message, 429, {
      retryAfterSeconds: Math.ceil(Number(errObj.retryAfterMs || 60000) / 1000),
    });
  }

  // 3. Zod coordinate validation
  const url = new URL(req.url);
  const rawParams = {
    lat: url.searchParams.get('lat') ?? undefined,
    lng: url.searchParams.get('lng') ?? undefined,
    language: url.searchParams.get('language') ?? undefined,
  };

  const parsed = reverseSchema.safeParse(rawParams);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid coordinates for reverse geocode.';
    return plainErrorResponse(issue, 400);
  }

  const { lat, lng, language } = parsed.data;

  // 4. Dual-tier cache lookup (4 decimal places ~11m)
  const cacheKey = buildReverseCacheKey(lat, lng);
  try {
    const cached = await getMapCache<GeocodeResult>(cacheKey);
    if (cached) {
      return NextResponse.json(
        {
          result: cached,
          cached: true,
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=604800, s-maxage=604800', // 7 days
          },
        }
      );
    }
  } catch {
    // Cache read failure does not interrupt lookup
  }

  // 5. Cascade reverse geocoding execution
  try {
    const { result, meta } = await mapsFallbackEngine.reverseGeocode(lat, lng, { language });

    if (result) {
      // 6. Cache successful result for 7 days
      setMapCache(cacheKey, result, 'reverse').catch(() => {});
    }

    return NextResponse.json(
      {
        result,
        cached: false,
        meta,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      }
    );
  } catch (error) {
    const errObj = (error && typeof error === 'object' ? error : {}) as Record<string, unknown>;
    const status = typeof errObj.status === 'number' ? errObj.status : 502;
    const message =
      error instanceof Error
        ? error.message
        : 'Location reverse lookup is temporarily busy. Please try again.';

    return plainErrorResponse(message, status);
  }
}
