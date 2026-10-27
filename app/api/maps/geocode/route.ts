import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mapsFallbackEngine } from '@/lib/maps/engine';
import { buildGeocodeCacheKey, getMapCache, setMapCache } from '@/lib/maps/cache';
import {
  enforceMapRateLimit,
  plainErrorResponse,
  validateSameOrigin,
} from '@/lib/maps/security';
import { GeocodeResult } from '@/lib/maps/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const geocodeSchema = z.object({
  query: z
    .string({ required_error: 'Search query is required.' })
    .trim()
    .min(1, 'Search query cannot be empty.')
    .max(200, 'Search query cannot exceed 200 characters.'),
  type: z.enum(['search', 'autocomplete']).default('search'),
  lat: z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90).optional(),
  lng: z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(5),
  language: z.string().max(10).optional(),
});

/**
 * GET /api/maps/geocode?query=...&type=search|autocomplete&lat=...&lng=...&limit=5
 * 
 * Geocodes an address query or provides live suggestions with dual-tier caching,
 * cascading fallbacks, and rate limiting.
 */
export async function GET(req: Request) {
  // 1. Same-origin validation
  const originCheck = validateSameOrigin(req);
  if (!originCheck.allowed) {
    return plainErrorResponse(
      originCheck.reason || 'Forbidden: Cross-origin access not permitted.',
      403
    );
  }

  // 2. Rate limiting (per IP/user)
  try {
    enforceMapRateLimit(req, 'geocode');
  } catch (rateErr) {
    const errObj = (rateErr && typeof rateErr === 'object' ? rateErr : {}) as Record<string, unknown>;
    const message = rateErr instanceof Error ? rateErr.message : 'Too many search requests. Please wait a moment.';
    return plainErrorResponse(message, 429, {
      retryAfterSeconds: Math.ceil(Number(errObj.retryAfterMs || 60000) / 1000),
    });
  }

  // 3. Query string validation
  const url = new URL(req.url);
  const rawParams = {
    query: url.searchParams.get('query') ?? '',
    type: url.searchParams.get('type') ?? 'search',
    lat: url.searchParams.get('lat') ?? undefined,
    lng: url.searchParams.get('lng') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
    language: url.searchParams.get('language') ?? undefined,
  };

  const parsed = geocodeSchema.safeParse(rawParams);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid geocode parameters.';
    return plainErrorResponse(issue, 400);
  }

  const { query, type, lat, lng, limit, language } = parsed.data;

  // 4. Dual-tier cache lookup
  const cacheKey = buildGeocodeCacheKey(query, type, lat, lng);
  try {
    const cached = await getMapCache<GeocodeResult[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return NextResponse.json(
        {
          results: cached,
          cached: true,
          count: cached.length,
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=86400',
          },
        }
      );
    }
  } catch {
    // Cache read failure does not interrupt live search
  }

  // 5. Engine cascade execution
  try {
    const engineOpts = {
      limit,
      biasLat: lat,
      biasLng: lng,
      language,
    };

    const execution =
      type === 'autocomplete'
        ? await mapsFallbackEngine.autocomplete(query, engineOpts)
        : await mapsFallbackEngine.geocode(query, engineOpts);

    const { results, meta } = execution;

    // 6. Cache successful non-empty results
    if (results.length > 0) {
      setMapCache(cacheKey, results, 'search').catch(() => {});
    }

    return NextResponse.json(
      {
        results,
        cached: false,
        count: results.length,
        meta,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    const errObj = (error && typeof error === 'object' ? error : {}) as Record<string, unknown>;
    const status = typeof errObj.status === 'number' ? errObj.status : 502;
    const message =
      error instanceof Error
        ? error.message
        : 'Search service is temporarily busy. Please try again in a few moments.';

    return plainErrorResponse(message, status);
  }
}
