import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapsTelemetry } from '@/lib/maps/telemetry';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate user & verify admin role
    const isMock = process.env.DATA_SOURCE === 'mock';
    const isDev = process.env.NODE_ENV !== 'production';
    const hasDemoHeader = req.headers.get('x-demo-admin') === '1';
    const hasDemoParam = new URL(req.url).searchParams.get('demo') === '1';

    let isAdmin = false;
    let authUser: { id: string; email?: string } | null = null;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        authUser = user;
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profile?.role === 'admin') {
          isAdmin = true;
        }
      }
    } catch {
      // In offline / mock mode or if Supabase is unreachable
    }

    // Allow demo / test bypass in non-production mock environments
    if (!isAdmin && (isMock || isDev) && (hasDemoHeader || hasDemoParam)) {
      isAdmin = true;
    }

    if (!isAdmin) {
      if (!authUser) {
        return NextResponse.json(
          { error: 'Unauthorized: Admin authentication required' },
          { status: 401 }
        );
      }
      return NextResponse.json(
        { error: 'Forbidden: Administrator privileges required' },
        { status: 403 }
      );
    }

    // 2. Fetch usage from telemetry and optionally augment from database
    const providersUsage = mapsTelemetry.getProvidersUsage();
    let dbCacheCount = 0;

    try {
      const admin = createAdminClient();
      // Try counting database map_cache rows if table exists
      const { count } = await admin
        .from('map_cache')
        .select('*', { count: 'exact', head: true });
      if (typeof count === 'number') {
        dbCacheCount = count;
      }

      // Try fetching today's map_daily_usage rows if table exists
      const today = new Date().toISOString().slice(0, 10);
      const { data: dbUsage } = await admin
        .from('map_daily_usage')
        .select('*')
        .eq('usage_date', today);

      if (dbUsage && Array.isArray(dbUsage)) {
        for (const row of dbUsage) {
          const providerKey = (row.provider || row.provider_id || '').toLowerCase();
          const provider = providersUsage.find(
            (p) => p.id === providerKey || (providerKey === 'openrouteservice' && p.id === 'ors')
          );
          const reqCount = row.request_count ?? row.requests ?? 0;
          if (provider && reqCount > provider.dailyRequests) {
            provider.dailyRequests = reqCount;
            provider.percentUsed = Math.min(
              100,
              Math.round((reqCount / provider.dailySoftLimit) * 100)
            );
          }
        }
      }
    } catch {
      // In-memory telemetry serves as resilient standalone source of truth
    }

    const cacheStats = mapsTelemetry.getCacheStatistics(dbCacheCount);
    const fallbackStats = mapsTelemetry.getFallbackStatistics();
    const recentErrors = mapsTelemetry.getRecentErrors(30);
    const missingKeys = mapsTelemetry.getMissingOptionalKeys();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      providers: providersUsage,
      cache: cacheStats,
      fallbacks: fallbackStats,
      recentErrors,
      missingOptionalKeys: missingKeys,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown admin usage error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
