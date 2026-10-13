import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    const admin = createAdminClient();
    const start = Date.now();
    const { error } = await admin.rpc('public_stats');
    dbLatencyMs = Date.now() - start;

    if (!error) {
      dbStatus = 'connected';
    } else {
      // In offline/mock mode or uninitialized DB
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
      project: 'KindLink - A Physics Project (Asansol Engineering College)',
      uptime: Math.round(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
