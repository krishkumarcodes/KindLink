import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '23.6889');
    const lng = parseFloat(searchParams.get('lng') || '86.9661');
    const radiusKm = parseFloat(searchParams.get('radiusKm') || '25.0');

    const isMock =
      process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock' ||
      process.env.DATA_SOURCE === 'mock';

    if (isMock) {
      return NextResponse.json({
        success: true,
        data: {
          helpersNearby: 4,
          avgResponseMinutes: 12,
          actsOfHelp: 15,
          trustMatchPercentage: 96.5,
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const supabase = createAdminClient();

    // 1. Try PostgreSQL RPC live_stats
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('live_stats', {
        lat,
        lng,
        radius_km: radiusKm,
      });

      if (!rpcError && rpcData) {
        return NextResponse.json({
          success: true,
          data: {
            helpersNearby: Number(rpcData.helpers_nearby ?? 0),
            avgResponseMinutes:
              rpcData.avg_response_minutes !== null && rpcData.avg_response_minutes !== undefined
                ? Number(rpcData.avg_response_minutes)
                : null,
            actsOfHelp: Number(rpcData.acts_of_help ?? 0),
            trustMatchPercentage:
              rpcData.trust_match_percentage !== null && rpcData.trust_match_percentage !== undefined
                ? Number(rpcData.trust_match_percentage)
                : null,
            updatedAt: new Date().toISOString(),
          },
        });
      }
    } catch {
      // Proceed to direct table fallback
    }

    // 2. Fallback: Aggregate directly across Supabase tables
    // 2a. Verified helpers count
    const { count: verifiedCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified');

    // 2b. Acts of help (completed requests)
    const { count: completedCount } = await supabase
      .from('requests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // 2c. Median response time from request creation to first offer in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: requestsWithOffers } = await supabase
      .from('requests')
      .select('id, created_at, offers (id, created_at)')
      .gte('created_at', thirtyDaysAgo);

    let avgResponseMinutes: number | null = null;
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

      // Shows '-' if < 3 requests
      if (durations.length >= 3) {
        durations.sort((a, b) => a - b);
        const mid = Math.floor(durations.length / 2);
        const median =
          durations.length % 2 !== 0
            ? durations[mid]
            : (durations[mid - 1] + durations[mid]) / 2;
        avgResponseMinutes = Math.round(median * 10) / 10;
      }
    }

    // 2d. Trust match: % of 4+ star ratings in last 90 days (shows '-' if < 5 ratings)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: ratingsData } = await supabase
      .from('ratings')
      .select('stars')
      .gte('created_at', ninetyDaysAgo);

    let trustMatchPercentage: number | null = null;
    if (ratingsData && ratingsData.length >= 5) {
      const fourPlus = ratingsData.filter((r) => r.stars >= 4).length;
      trustMatchPercentage = Math.round((fourPlus / ratingsData.length) * 1000) / 10;
    }

    return NextResponse.json({
      success: true,
      data: {
        helpersNearby: verifiedCount ?? 0,
        avgResponseMinutes,
        actsOfHelp: completedCount ?? 0,
        trustMatchPercentage,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error calculating stats',
        data: {
          helpersNearby: 0,
          avgResponseMinutes: null,
          actsOfHelp: 0,
          trustMatchPercentage: null,
          updatedAt: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
