import { NextResponse } from 'next/server';
import { z } from 'zod';
import { mapsFallbackEngine } from '@/lib/maps/engine';
import { buildRouteCacheKey, getMapCache, setMapCache } from '@/lib/maps/cache';
import {
  enforceMapRateLimit,
  plainErrorResponse,
  validateSameOrigin,
} from '@/lib/maps/security';
import { RouteResult, TravelMode } from '@/lib/maps/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const routeSchema = z.object({
  originLat: z.coerce
    .number({ required_error: 'Origin latitude is required.' })
    .min(-90, 'Origin latitude must be between -90 and 90.')
    .max(90, 'Origin latitude must be between -90 and 90.'),
  originLng: z.coerce
    .number({ required_error: 'Origin longitude is required.' })
    .min(-180, 'Origin longitude must be between -180 and 180.')
    .max(180, 'Origin longitude must be between -180 and 180.'),
  destLat: z.coerce
    .number({ required_error: 'Destination latitude is required.' })
    .min(-90, 'Destination latitude must be between -90 and 90.')
    .max(90, 'Destination latitude must be between -90 and 90.'),
  destLng: z.coerce
    .number({ required_error: 'Destination longitude is required.' })
    .min(-180, 'Destination longitude must be between -180 and 180.')
    .max(180, 'Destination longitude must be between -180 and 180.'),
  mode: z
    .enum(['walking', 'cycling', 'driving', 'bike', 'car'], {
      invalid_type_error: 'Invalid travel mode. Supported: walking, cycling, driving, bike, car.',
    })
    .default('bike'),
  preference: z.enum(['recommended', 'shortest', 'fastest']).optional(),
});

/**
 * Helper to process route calculations from either GET searchParams or POST JSON body
 */
async function handleRouteCalculation(
  rawParams: Record<string, unknown>,
  req: Request
): Promise<NextResponse> {
  // 1. Same-origin security validation
  const originCheck = validateSameOrigin(req);
  if (!originCheck.allowed) {
    return plainErrorResponse(
      originCheck.reason || 'Forbidden: Cross-origin route requests not permitted.',
      403
    );
  }

  // 2. Client rate limit enforcement
  try {
    enforceMapRateLimit(req, 'route');
  } catch (rateErr) {
    const errObj = (rateErr && typeof rateErr === 'object' ? rateErr : {}) as Record<string, unknown>;
    const message =
      rateErr instanceof Error
        ? rateErr.message
        : 'Too many directions requests. Please wait a moment.';
    return plainErrorResponse(message, 429, {
      retryAfterSeconds: Math.ceil(Number(errObj.retryAfterMs || 60000) / 1000),
    });
  }

  // 3. Zod validation
  const parsed = routeSchema.safeParse(rawParams);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message || 'Invalid routing parameters.';
    return plainErrorResponse(issue, 400);
  }

  const { originLat, originLng, destLat, destLng, mode, preference } = parsed.data;

  // 4. Dual-tier cache check (6 hours TTL)
  const cacheKey = buildRouteCacheKey(originLat, originLng, destLat, destLng, mode);
  try {
    const cached = await getMapCache<RouteResult>(cacheKey);
    if (cached) {
      return NextResponse.json(
        {
          route: cached,
          cached: true,
        },
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=21600, s-maxage=21600', // 6 hours
          },
        }
      );
    }
  } catch {
    // Cache read failure does not block computation
  }

  // 5. Cascade routing engine execution
  try {
    const origin = { lat: originLat, lng: originLng };
    const destination = { lat: destLat, lng: destLng };

    const routeResult = await mapsFallbackEngine.calculateRoute(
      origin,
      destination,
      mode as TravelMode,
      { preference }
    );

    // 6. Cache route result for 6 hours
    setMapCache(cacheKey, routeResult, 'route').catch(() => {});

    return NextResponse.json(
      {
        route: routeResult,
        cached: false,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=21600, s-maxage=21600',
        },
      }
    );
  } catch (error) {
    const errObj = (error && typeof error === 'object' ? error : {}) as Record<string, unknown>;
    const status = typeof errObj.status === 'number' ? errObj.status : 502;
    const message =
      error instanceof Error
        ? error.message
        : 'Routing computation is temporarily unavailable. Please try again.';

    return plainErrorResponse(message, status);
  }
}

/**
 * GET /api/maps/route?originLat=...&originLng=...&destLat=...&destLng=...&mode=bike
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const rawParams = {
    originLat: url.searchParams.get('originLat') ?? undefined,
    originLng: url.searchParams.get('originLng') ?? undefined,
    destLat: url.searchParams.get('destLat') ?? undefined,
    destLng: url.searchParams.get('destLng') ?? undefined,
    mode: url.searchParams.get('mode') ?? undefined,
    preference: url.searchParams.get('preference') ?? undefined,
  };
  return handleRouteCalculation(rawParams, req);
}

/**
 * POST /api/maps/route
 * Body: { originLat, originLng, destLat, destLng, mode, preference }
 */
export async function POST(req: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return plainErrorResponse('Malformed JSON request body.', 400);
  }
  return handleRouteCalculation(body, req);
}
