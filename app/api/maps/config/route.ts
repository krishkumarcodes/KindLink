import { NextResponse } from 'next/server';
import { getPublicMapConfig } from '@/lib/maps/config';
import { plainErrorResponse, validateSameOrigin } from '@/lib/maps/security';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/maps/config
 * 
 * Returns public raster tile configuration, light & dark theme style IDs,
 * attribution requirements, and geographic bounds. Never leaks private server secrets.
 * Protected against unauthorized cross-origin embedding.
 */
export async function GET(req: Request) {
  // 1. Validate same-origin
  const originValidation = validateSameOrigin(req);
  if (!originValidation.allowed) {
    return plainErrorResponse(
      originValidation.reason || 'Forbidden: Unauthorized map request origin.',
      403
    );
  }

  try {
    const config = getPublicMapConfig();
    return NextResponse.json(config, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve map configuration';
    return plainErrorResponse(message, 500);
  }
}
