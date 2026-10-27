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

export interface HourlyStat {
  hour: string;
  hourNumber: number;
  requests: number;
  helps: number;
}

export interface Last24HoursData {
  totalRequests: number;
  totalHelps: number;
  avgResponseMinutes: number | null;
  hourly: HourlyStat[];
  hasActivity: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Initialize 24 hourly buckets (from 23 hours ago to current hour)
    const buckets: HourlyStat[] = [];
    for (let i = 23; i >= 0; i--) {
      const bucketTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourNum = bucketTime.getHours();
      const hourLabel = bucketTime.toLocaleTimeString([], { hour: 'numeric', hour12: true });
      buckets.push({
        hour: hourLabel,
        hourNumber: hourNum,
        requests: 0,
        helps: 0,
      });
    }

    let totalRequests = 0;
    let totalHelps = 0;
    const responseTimes: number[] = [];

    // 1. Fetch requests created or completed in last 24 hours
    try {
      const { data: requestsData, error: reqError } = await supabase
        .from('requests')
        .select('id, created_at, status, accepted_at, completed_at, offers (id, created_at)')
        .or(`created_at.gte.${twentyFourHoursAgo.toISOString()},completed_at.gte.${twentyFourHoursAgo.toISOString()}`);

      if (!reqError && requestsData) {
        requestsData.forEach((req: any) => {
          if (req.created_at) {
            const reqDate = new Date(req.created_at);
            if (reqDate >= twentyFourHoursAgo && reqDate <= now) {
              totalRequests++;
              const hoursDiff = Math.floor((now.getTime() - reqDate.getTime()) / (60 * 60 * 1000));
              const bucketIdx = 23 - Math.min(23, Math.max(0, hoursDiff));
              if (buckets[bucketIdx]) {
                buckets[bucketIdx].requests++;
              }
            }
          }

          // Check for completed helps
          if (req.status === 'completed' && req.completed_at) {
            const compDate = new Date(req.completed_at);
            if (compDate >= twentyFourHoursAgo && compDate <= now) {
              totalHelps++;
              const hoursDiff = Math.floor((now.getTime() - compDate.getTime()) / (60 * 60 * 1000));
              const bucketIdx = 23 - Math.min(23, Math.max(0, hoursDiff));
              if (buckets[bucketIdx]) {
                buckets[bucketIdx].helps++;
              }
            }
          }

          // Measure response time to first offer
          if (req.created_at && req.offers && Array.isArray(req.offers) && req.offers.length > 0) {
            const reqTime = new Date(req.created_at).getTime();
            const firstOfferTime = Math.min(...req.offers.map((o: any) => new Date(o.created_at).getTime()));
            const diffMins = (firstOfferTime - reqTime) / (60 * 1000);
            if (diffMins >= 0 && diffMins <= 1440) {
              responseTimes.push(diffMins);
            }
          }
        });
      }
    } catch {
      // In case of table query failure, continue with defaults
    }

    // 2. Fetch completed offers if separate
    try {
      const { data: offersData, error: offError } = await supabase
        .from('offers')
        .select('id, created_at, status')
        .eq('status', 'accepted')
        .gte('created_at', twentyFourHoursAgo.toISOString());

      if (!offError && offersData && offersData.length > 0 && totalHelps === 0) {
        offersData.forEach((offer: any) => {
          totalHelps++;
          const offDate = new Date(offer.created_at);
          const hoursDiff = Math.floor((now.getTime() - offDate.getTime()) / (60 * 60 * 1000));
          const bucketIdx = 23 - Math.min(23, Math.max(0, hoursDiff));
          if (buckets[bucketIdx]) {
            buckets[bucketIdx].helps++;
          }
        });
      }
    } catch {
      // Ignore
    }

    let avgResponseMinutes: number | null = null;
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      const mid = Math.floor(responseTimes.length / 2);
      const median =
        responseTimes.length % 2 !== 0
          ? responseTimes[mid]
          : (responseTimes[mid - 1] + responseTimes[mid]) / 2;
      avgResponseMinutes = Math.round(median * 10) / 10;
    }

    const hasActivity = totalRequests > 0 || totalHelps > 0;

    const data: Last24HoursData = {
      totalRequests,
      totalHelps,
      avgResponseMinutes,
      hourly: buckets,
      hasActivity,
    };

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch 24-hour activity',
        data: {
          totalRequests: 0,
          totalHelps: 0,
          avgResponseMinutes: null,
          hourly: Array.from({ length: 24 }, (_, i) => ({
            hour: `${i}:00`,
            hourNumber: i,
            requests: 0,
            helps: 0,
          })),
          hasActivity: false,
        },
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
