import { NextRequest, NextResponse } from 'next/server';
import { circuitBreaker } from '@/lib/maps/circuit-breaker';
import { mapsTelemetry, MAP_PROVIDERS_META } from '@/lib/maps/telemetry';
import { hasRequiredApiKey } from '@/lib/maps/config';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface ProviderHealthReport {
  id: string;
  name: string;
  category: string;
  requiresKey: boolean;
  configured: boolean;
  status: 'working' | 'configured' | 'needs key' | 'degraded' | 'circuit_open';
  circuitBreaker: 'closed' | 'open' | 'half-open';
  consecutiveFailures: number;
  totalSuccesses: number;
  totalFailures: number;
  lastSuccess: string | null;
  lastFailure: string | null;
  lastError: string | null;
  hint: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const shouldProbe = searchParams.get('probe') === 'true' || searchParams.get('probe') === '1';

    // Optional quick lightweight probe for diagnostics
    if (shouldProbe) {
      await probeLightweightProviders();
    }

    const providerReports: ProviderHealthReport[] = MAP_PROVIDERS_META.map((meta) => {
      const configured = hasRequiredApiKey(meta.id);
      const cbStatus = circuitBreaker.getStatus(meta.id, meta.category);

      let status: ProviderHealthReport['status'] = 'configured';
      if (!configured && meta.requiresKey) {
        status = 'needs key';
      } else if (cbStatus.state === 'open') {
        status = 'circuit_open';
      } else if (cbStatus.consecutiveFailures > 0) {
        status = 'degraded';
      } else if (cbStatus.totalSuccesses > 0 && cbStatus.consecutiveFailures === 0) {
        status = 'working';
      } else {
        status = 'configured';
      }

      // Sanitize any error message to strictly prevent accidental key leaks
      const sanitizedError = cbStatus.lastError
        ? cbStatus.lastError.replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=REDACTED').replace(/api[-_]?key=[a-zA-Z0-9_\-]+/gi, 'api_key=REDACTED')
        : null;

      return {
        id: meta.id,
        name: meta.name,
        category: meta.category,
        requiresKey: meta.requiresKey,
        configured,
        status,
        circuitBreaker: cbStatus.state,
        consecutiveFailures: cbStatus.consecutiveFailures,
        totalSuccesses: cbStatus.totalSuccesses,
        totalFailures: cbStatus.totalFailures,
        lastSuccess: cbStatus.lastSuccessTime ? new Date(cbStatus.lastSuccessTime).toISOString() : null,
        lastFailure: cbStatus.lastFailureTime ? new Date(cbStatus.lastFailureTime).toISOString() : null,
        lastError: sanitizedError,
        hint: meta.hint,
      };
    });

    const configuredCount = providerReports.filter((p) => p.configured).length;
    const workingCount = providerReports.filter((p) => p.status === 'working').length;
    const needsKeyCount = providerReports.filter((p) => p.status === 'needs key').length;
    const degradedCount = providerReports.filter((p) => p.status === 'degraded' || p.status === 'circuit_open').length;

    // KindLink always has full open-source fallback coverage
    const systemStatus = degradedCount > 2 ? 'degraded' : needsKeyCount > 0 ? 'functional_with_fallbacks' : 'healthy';

    const responseData = {
      status: systemStatus,
      timestamp: new Date().toISOString(),
      summary: {
        totalProviders: providerReports.length,
        configured: configuredCount,
        needsKey: needsKeyCount,
        recentlyWorking: workingCount,
        degradedOrOpen: degradedCount,
        fallbacksAvailable: true,
        message:
          needsKeyCount > 0
            ? `${needsKeyCount} optional provider keys not set. Operating normally on open-source fallbacks.`
            : 'All providers configured and healthy.',
      },
      providers: providerReports,
      missingOptionalKeys: mapsTelemetry.getMissingOptionalKeys(),
    };

    return NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown health check error';
    return NextResponse.json(
      {
        status: 'error',
        error: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Lightweight probe for active providers with a strict 2.5s timeout.
 * Updates circuit breaker and telemetry without blocking standard queries.
 */
async function probeLightweightProviders() {
  const probes = [
    // Photon geocode ping
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch('https://photon.komoot.io/api/?q=Asansol&limit=1', {
          signal: controller.signal,
          headers: { 'User-Agent': 'KindLink-HealthCheck/1.0' },
        });
        clearTimeout(timeout);
        if (res.ok) {
          circuitBreaker.recordSuccess('photon', 'geocode');
        } else {
          circuitBreaker.recordFailure('photon', new Error(`HTTP ${res.status}`), 'geocode');
        }
      } catch (err) {
        circuitBreaker.recordFailure('photon', err, 'geocode');
      }
    })(),

    // OSM tile server ping
    (async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const res = await fetch('https://tile.openstreetmap.org/12/3037/1778.png', {
          method: 'HEAD',
          signal: controller.signal,
          headers: { 'User-Agent': 'KindLink-HealthCheck/1.0' },
        });
        clearTimeout(timeout);
        if (res.ok) {
          circuitBreaker.recordSuccess('osm', 'tile');
        } else {
          circuitBreaker.recordFailure('osm', new Error(`HTTP ${res.status}`), 'tile');
        }
      } catch (err) {
        circuitBreaker.recordFailure('osm', err, 'tile');
      }
    })(),
  ];

  await Promise.allSettled(probes);
}
