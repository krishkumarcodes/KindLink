import { NextRequest, NextResponse } from 'next/server';

/**
 * KindLink Privacy-Preserving Core Web Vitals Ingest & Summary API
 *
 * Requirements:
 * - Accepts sampled Core Web Vitals (LCP, INP, CLS, TTFB, FCP).
 * - Strictly zero PII, zero IP logging, zero cookies, zero user identifiers.
 * - Aggregates metrics in-memory for real-time monitoring and reporting.
 */

export const dynamic = 'force-dynamic';

interface IncomingVital {
  name: string;
  value: number;
  rating?: string;
  path?: string;
  connection?: string;
  deviceClass?: string;
  timestamp?: number;
}

interface MetricSummary {
  count: number;
  min: number;
  max: number;
  sum: number;
  avg: number;
  goodCount: number;
  needsImprovementCount: number;
  poorCount: number;
  recentValues: number[];
}

// In-memory aggregates ring buffer (zero persistent personal tracking)
const MAX_RECENT_SAMPLES = 100;
const memoryStore: Record<string, MetricSummary> = {
  LCP: createEmptySummary(),
  INP: createEmptySummary(),
  CLS: createEmptySummary(),
  TTFB: createEmptySummary(),
  FCP: createEmptySummary(),
};

let totalSubmissions = 0;

function createEmptySummary(): MetricSummary {
  return {
    count: 0,
    min: Infinity,
    max: 0,
    sum: 0,
    avg: 0,
    goodCount: 0,
    needsImprovementCount: 0,
    poorCount: 0,
    recentValues: [],
  };
}

function sanitizePath(rawPath?: string): string {
  if (!rawPath || typeof rawPath !== 'string') return '/';
  const clean = rawPath.split('?')[0].split('#')[0].trim();
  return clean.slice(0, 64) || '/';
}

function recordVital(item: IncomingVital) {
  const name = item.name?.toUpperCase();
  if (!name || !(name in memoryStore)) return;

  const val = Number(item.value);
  if (!Number.isFinite(val) || val < 0) return;

  const target = memoryStore[name];
  target.count += 1;
  target.sum += val;
  target.min = Math.min(target.min, val);
  target.max = Math.max(target.max, val);
  target.avg = Math.round((target.sum / target.count) * 100) / 100;

  const rating = item.rating?.toLowerCase();
  if (rating === 'good') target.goodCount += 1;
  else if (rating === 'needs-improvement') target.needsImprovementCount += 1;
  else if (rating === 'poor') target.poorCount += 1;

  // Maintain circular buffer for p75 estimation
  if (target.recentValues.length >= MAX_RECENT_SAMPLES) {
    target.recentValues.shift();
  }
  target.recentValues.push(val);
}

function calculateP75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(0.75 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: IncomingVital[] = Array.isArray(body) ? body : [body];

    for (const item of items) {
      if (item && typeof item === 'object') {
        recordVital({
          name: item.name,
          value: item.value,
          rating: item.rating,
          path: sanitizePath(item.path),
          connection: typeof item.connection === 'string' ? item.connection.slice(0, 16) : 'unknown',
          deviceClass: typeof item.deviceClass === 'string' ? item.deviceClass.slice(0, 16) : 'unknown',
          timestamp: Date.now(),
        });
      }
    }

    totalSubmissions += items.length;

    return NextResponse.json(
      { ok: true, received: items.length },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid metrics payload' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function GET() {
  const summaryResult: Record<string, {
    count: number;
    min: number;
    max: number;
    avg: number;
    p75: number;
    distribution: { good: number; needsImprovement: number; poor: number };
  }> = {};

  for (const [key, metric] of Object.entries(memoryStore)) {
    summaryResult[key] = {
      count: metric.count,
      min: metric.count > 0 ? metric.min : 0,
      max: metric.max,
      avg: metric.avg,
      p75: calculateP75(metric.recentValues),
      distribution: {
        good: metric.goodCount,
        needsImprovement: metric.needsImprovementCount,
        poor: metric.poorCount,
      },
    };
  }

  return NextResponse.json(
    {
      ok: true,
      totalSubmissions,
      metrics: summaryResult,
      timestamp: Date.now(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}
