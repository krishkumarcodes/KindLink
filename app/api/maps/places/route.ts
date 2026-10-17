import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mapsFallbackEngine } from '@/lib/maps/engine';
import { buildPlacesCacheKey, getMapCache, setMapCache } from '@/lib/maps/cache';
import {
  enforceMapRateLimit,
  plainErrorResponse,
  validateSameOrigin,
} from '@/lib/maps/security';
import { PlaceCategory, PlaceResult } from '@/lib/maps/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const placesSchema = z.object({
  lat: z.coerce
    .number({ required_error: 'Latitude coordinate is required.' })
    .min(-90, 'Latitude must be between -90 and 90.')
    .max(90, 'Latitude must be between -90 and 90.'),
  lng: z.coerce
    .number({ required_error: 'Longitude coordinate is required.' })
    .min(-180, 'Longitude must be between -180 and 180.')
    .max(180, 'Longitude must be between -180 and 180.'),
  radiusMeters: z.coerce
    .number()
    .min(100, 'Search radius must be at least 100 meters.')
    .max(100000, 'Search radius cannot exceed 100 kilometers.')
    .default(8000),
  category: z.string().optional().default('all'),
  categories: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(15),
});

/**
 * Helper to process nearby places queries from either GET searchParams or POST JSON body
 */
async function handlePlacesSearch(
  rawParams: Record<string, unknown>,
  req: Request
): Promise<NextResponse> {
  // 1. Same-origin security check
  const originCheck = validateSameOrigin(req);
  if (!originCheck.allowed) {
    return plainErrorResponse(
      originCheck.reason || 'Forbidden: Cross-origin places access not permitted.',
      403
    );
  }

  // 2. Client rate limit enforcement
  try {
    enforceMapRateLimit(req, 'places');
  } catch (rateErr) {
    const errObj = (rateErr && typeof rateErr === 'object' ? rateErr : {}) as Record<string, unknown>;
    const message =
      rateErr instanceof Error
        ? rateErr.message
        : 'Too many nearby facility requests. Please wait a moment.';
    return plainErrorResponse(message, 429, {
      retryAfterSeconds: Math.ceil(Number(errObj.retryAfterMs || 60000) / 1000),
    });
  }

  // 3. Zod validation
  const parsed = placesSchema.safeParse(rawParams);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid parameters for nearby places.';
    return plainErrorResponse(issue, 400);
  }

  const { lat, lng, radiusMeters, category, categories, limit } = parsed.data;
  const effectiveCategory = (categories || category || 'all').trim().toLowerCase() as PlaceCategory;

  // 4. Dual-tier cache lookup (24-hour TTL)
  const cacheKey = buildPlacesCacheKey(lat, lng, radiusMeters, effectiveCategory);
  try {
    const cached = await getMapCache<PlaceResult[]>(cacheKey);
    if (cached && Array.isArray(cached)) {
      return NextResponse.json(
        {
          places: cached,
          cached: true,
          count: cached.length,
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400', // 24 hours
          },
        }
      );
    }
  } catch {
    // Cache read failure does not interrupt query
  }

  // 5. Cascade execution: Geoapify Places -> Overpass API mirrors -> Curated medical centers
  try {
    const { results, meta } = await mapsFallbackEngine.findNearbyPlaces(
      lat,
      lng,
      radiusMeters,
      effectiveCategory,
      { limit }
    );

    // 6. Cache non-empty results for 24 hours
    if (results.length > 0) {
      setMapCache(cacheKey, results, 'places').catch(() => {});
    }

    return NextResponse.json(
      {
        places: results,
        cached: false,
        count: results.length,
        meta,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
      }
    );
  } catch (error) {
    const errObj = (error && typeof error === 'object' ? error : {}) as Record<string, unknown>;
    const status = typeof errObj.status === 'number' ? errObj.status : 502;
    const message =
      error instanceof Error
        ? error.message
        : 'Facility search is temporarily unavailable. Please try again.';

    return plainErrorResponse(message, status);
  }
}

/**
 * GET /api/maps/places?lat=...&lng=...&radiusMeters=8000&categories=hospital,clinic&limit=15
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawParams = {
    lat: url.searchParams.get('lat') ?? undefined,
    lng: url.searchParams.get('lng') ?? undefined,
    radiusMeters: url.searchParams.get('radiusMeters') ?? undefined,
    category: url.searchParams.get('category') ?? undefined,
    categories: url.searchParams.get('categories') ?? undefined,
    limit: url.searchParams.get('limit') ?? undefined,
  };
  return handlePlacesSearch(rawParams, req);
}

/**
 * POST /api/maps/places
 * Body: { lat, lng, radiusMeters, categories, limit }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return plainErrorResponse('Malformed JSON request body.', 400);
  }
  return handlePlacesSearch(body, req);
}
