import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

function getSupabase() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '23.6889');
    const lng = parseFloat(searchParams.get('lng') || '86.9661');
    const radiusKm = parseFloat(searchParams.get('radiusKm') || '25.0');

    const supabase = getSupabase();

    // Query active requests count
    let activeRequestsCount = 0;
    try {
      const { count } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['open', 'offered', 'accepted', 'on_the_way', 'arrived']);
      activeRequestsCount = count ?? 0;
    } catch {
      activeRequestsCount = 0;
    }

    // 1. Try PostgreSQL RPC live_stats
    let helpers = 0;
    let avgResponseMin: number | null = null;
    let requestsCompleted = 0;
    let satisfactionPct: number | null = null;
    let rpcSucceeded = false;

    try {
      // Try parameter names p_lat, p_lng, p_radius_km first, then lat, lng, radius_km
      let rpcResult = await supabase.rpc('live_stats', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radiusKm,
      } as any);

      if (rpcResult.error) {
        rpcResult = await supabase.rpc('live_stats', {
          lat,
          lng,
          radius_km: radiusKm,
        } as any);
      }

      const rpcData: any = rpcResult.data;
      if (!rpcResult.error && rpcData) {
        helpers = Number(rpcData.helpers ?? rpcData.helpers_nearby ?? 0);
        const respMin = rpcData.avg_response_min ?? rpcData.avg_response_minutes;
        avgResponseMin = respMin !== null && respMin !== undefined ? Number(respMin) : null;
        requestsCompleted = Number(rpcData.requests_completed ?? rpcData.acts_of_help ?? 0);
        const satPct = rpcData.satisfaction_pct ?? rpcData.trust_match_percentage ?? rpcData.trust_match_percent;
        satisfactionPct = satPct !== null && satPct !== undefined ? Number(satPct) : null;
        if (rpcData.active_requests !== undefined && rpcData.active_requests !== null) {
          activeRequestsCount = Number(rpcData.active_requests);
        }
        rpcSucceeded = true;
      }
    } catch {
      rpcSucceeded = false;
    }

    // 2. Direct table aggregation fallback if RPC failed
    if (!rpcSucceeded) {
      // Helpers count: verified profiles
      const { count: verifiedCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');
      helpers = verifiedCount ?? 0;

      // Completed requests count
      const { count: completedCount } = await supabase
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed');
      requestsCompleted = completedCount ?? 0;

      // Avg response time in last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: requestsWithOffers } = await supabase
        .from('requests')
        .select('id, created_at, offers (id, created_at)')
        .gte('created_at', thirtyDaysAgo);

      if (requestsWithOffers && requestsWithOffers.length > 0) {
        const durations: number[] = [];
        for (const req of requestsWithOffers as any[]) {
          if (req.offers && req.offers.length > 0) {
            const reqTime = new Date(req.created_at).getTime();
            const firstOfferTime = Math.min(
              ...req.offers.map((o: any) => new Date(o.created_at).getTime())
            );
            const diffMins = (firstOfferTime - reqTime) / (60 * 1000);
            if (diffMins >= 0 && !isNaN(diffMins)) {
              durations.push(diffMins);
            }
          }
        }

        if (durations.length >= 3) {
          durations.sort((a, b) => a - b);
          const mid = Math.floor(durations.length / 2);
          const median =
            durations.length % 2 !== 0
              ? durations[mid]
              : (durations[mid - 1] + durations[mid]) / 2;
          avgResponseMin = Math.round(median * 10) / 10;
        }
      }

      // Satisfaction / Trust match % in last 90 days
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('stars')
        .gte('created_at', ninetyDaysAgo);

      if (ratingsData && ratingsData.length >= 5) {
        const fourPlus = ratingsData.filter((r) => r.stars >= 4).length;
        satisfactionPct = Math.round((fourPlus / ratingsData.length) * 1000) / 10;
      }
    }

    return NextResponse.json(
      {
        helpers,
        avg_response_min: avgResponseMin,
        requests_completed: requestsCompleted,
        satisfaction_pct: satisfactionPct,
        active_requests: activeRequestsCount,
        live: true,
        // UI adapter backward-compatibility
        success: true,
        data: {
          helpersNearby: helpers,
          avgResponseMinutes: avgResponseMin,
          actsOfHelp: requestsCompleted,
          trustMatchPercentage: satisfactionPct,
          trustMatchPercent: satisfactionPct,
          activeRequests: activeRequestsCount,
          updatedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        helpers: 0,
        avg_response_min: null,
        requests_completed: 0,
        satisfaction_pct: null,
        active_requests: 0,
        live: true,
        success: false,
        error: error?.message || 'Error fetching live stats',
        data: {
          helpersNearby: 0,
          avgResponseMinutes: null,
          actsOfHelp: 0,
          trustMatchPercentage: null,
          trustMatchPercent: null,
          activeRequests: 0,
          updatedAt: new Date().toISOString(),
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  }
}
