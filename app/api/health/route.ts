import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * KindLink System Health Endpoint
 * GET /api/health
 *
 * Default: Ultra-lightweight health probe with 0 DB calls.
 * Returns HTTP 200 in < 5ms for Uptime monitors, Docker checks, and Render keepalive.
 *
 * Deep probe: Add ?deep=1 to run database connectivity and latency verification.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const isDeep = searchParams.get('deep') === '1' || searchParams.get('deep') === 'true';

  const defaultHeaders = {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Content-Type': 'application/json',
  };

  // Ultra-light health check: zero DB queries, immediate 200 response
  if (!isDeep) {
    return NextResponse.json(
      {
        status: 'healthy',
        service: 'KindLink',
        project: 'KindLink - Community Mutual Aid Platform',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: defaultHeaders,
      }
    );
  }

  // Deep probe (?deep=1): verifies database connection & latency with 3-second hard timeout
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    const admin = createAdminClient();
    const start = Date.now();

    // 3-second timeout protection for DB probe
    const probePromise = admin.rpc('public_stats');
    const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error('Database probe timeout')), 3000)
    );

    const { error } = (await Promise.race([probePromise, timeoutPromise])) as {
      error: Error | null;
    };
    dbLatencyMs = Date.now() - start;

    if (!error) {
      dbStatus = 'connected';
    } else {
      dbStatus = 'degraded';
    }
  } catch {
    dbStatus = 'unavailable';
  }

  const isHealthy = dbStatus === 'connected' || process.env.DATA_SOURCE === 'mock';

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'KindLink',
      project: 'KindLink - Community Mutual Aid Platform',
      uptime: Math.round(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: defaultHeaders,
    }
  );
}
