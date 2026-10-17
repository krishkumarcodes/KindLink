import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    const searchParams = req.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId') || user?.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Unauthorized or missing user identifier' },
        { status: 401 }
      );
    }

    // Use admin client if reading public stats for another profile or if session cookie is missing in SSR
    const client = user ? supabase : createAdminClient();

    // 1. Fetch user's completed helps, requests made, and offers made
    const [requestsRes, offersRes, ratingsRes, profileRes] = await Promise.all([
      client
        .from('requests')
        .select(`
          id,
          title,
          description,
          category,
          urgency,
          status,
          address_text,
          location,
          requester_id,
          accepted_helper_id,
          created_at,
          accepted_at,
          completed_at,
          details,
          requester:requester_id (
            id,
            display_name,
            username,
            avatar_url,
            verification_status,
            rating_average
          ),
          helper:accepted_helper_id (
            id,
            display_name,
            username,
            avatar_url,
            verification_status,
            rating_average
          )
        `)
        .or(`requester_id.eq.${targetUserId},accepted_helper_id.eq.${targetUserId}`)
        .order('created_at', { ascending: false }),

      client
        .from('offers')
        .select(`
          id,
          request_id,
          helper_id,
          message,
          status,
          created_at,
          requests (
            id,
            title,
            category,
            urgency,
            status,
            address_text,
            requester:requester_id (
              id,
              display_name,
              username,
              avatar_url,
              verification_status,
              rating_average
            )
          )
        `)
        .eq('helper_id', targetUserId)
        .order('created_at', { ascending: false }),

      client
        .from('ratings')
        .select(`
          id,
          request_id,
          rater_id,
          ratee_id,
          stars,
          comment,
          created_at,
          requests (
            id,
            title,
            category,
            requester_id,
            accepted_helper_id
          )
        `)
        .eq('ratee_id', targetUserId)
        .order('created_at', { ascending: false }),

      client
        .from('profiles')
        .select('id, display_name, username, rating_average, rating_count, verification_status, home_location')
        .eq('id', targetUserId)
        .maybeSingle(),
    ]);

    const allRequests = requestsRes.data || [];
    const allOffers = offersRes.data || [];
    const allRatings = ratingsRes.data || [];
    const profile = profileRes.data || null;

    // Completed helps where target user was the accepted helper
    const completedHelps = allRequests.filter(
      (r) => r.accepted_helper_id === targetUserId && r.status === 'completed'
    );

    // Requests created by target user
    const myRequests = allRequests.filter(
      (r) => r.requester_id === targetUserId
    );

    // Open / active requests created by target user
    const openRequests = myRequests.filter((r) =>
      ['open', 'offered', 'accepted', 'on_the_way', 'arrived'].includes(r.status)
    );

    // Offers created by target user
    const myOffers = allOffers;

    // Try calling DB RPC if available
    let rpcSummary: any = null;
    try {
      const { data, error } = await client.rpc('get_profile_summary', {
        p_user_id: targetUserId,
      });
      if (!error && data) {
        rpcSummary = data;
      }
    } catch {
      // RPC fallback handled below
    }

    // Calculate Hours Active: sum of duration in hours (minimum 1.0 hr per completed help)
    let totalHours = 0;
    completedHelps.forEach((h) => {
      if (h.completed_at && h.accepted_at) {
        const diffMs = new Date(h.completed_at).getTime() - new Date(h.accepted_at).getTime();
        const hrs = diffMs / (1000 * 60 * 60);
        totalHours += Math.max(1.0, Math.round(hrs * 10) / 10);
      } else {
        totalHours += 1.5;
      }
    });

    // Calculate Neighbours Supported: distinct count of requesters helped
    const distinctRequesters = new Set(
      completedHelps.map((h) => h.requester_id).filter(Boolean)
    );
    const neighboursSupported = distinctRequesters.size;

    // Calculate Distance Covered: sum in km
    let distanceCovered = 0;
    completedHelps.forEach((h) => {
      const explicitDist = h.details?.distance_km;
      if (typeof explicitDist === 'number' && explicitDist > 0) {
        distanceCovered += explicitDist;
      } else {
        distanceCovered += 2.4; // Average hyperlocal transit
      }
    });
    distanceCovered = Math.round(distanceCovered * 10) / 10;

    // Ratings breakdown
    const helperRatings = allRatings.filter((r: any) => {
      const req = r.requests;
      return req?.accepted_helper_id === targetUserId;
    });

    const requesterRatings = allRatings.filter((r: any) => {
      const req = r.requests;
      return req?.requester_id === targetUserId;
    });

    const helperAvg =
      helperRatings.length > 0
        ? Math.round(
            (helperRatings.reduce((acc: number, r: any) => acc + r.stars, 0) /
              helperRatings.length) *
              10
          ) / 10
        : null;

    const requesterAvg =
      requesterRatings.length > 0
        ? Math.round(
            (requesterRatings.reduce((acc: number, r: any) => acc + r.stars, 0) /
              requesterRatings.length) *
              10
          ) / 10
        : null;

    const totalRatingsCount = allRatings.length;
    const overallAvg =
      totalRatingsCount > 0
        ? Math.round(
            (allRatings.reduce((acc: number, r: any) => acc + r.stars, 0) /
              totalRatingsCount) *
              10
          ) / 10
        : profile?.rating_average ?? null;

    // Trust Score: available when >= 5 reviews exist (or average if available)
    const trustScore = totalRatingsCount >= 5 ? overallAvg : (overallAvg ?? null);

    // Streaks calculation: consecutive active days with completed helps
    const activityDates = Array.from(
      new Set(
        completedHelps
          .map((h) => (h.completed_at ? h.completed_at.slice(0, 10) : null))
          .filter(Boolean) as string[]
      )
    ).sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    let bestStreak = 0;
    if (activityDates.length > 0) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);

      // Check if streak is active (today or yesterday)
      if (activityDates[0] === todayStr || activityDates[0] === yesterdayStr) {
        let expected = new Date(activityDates[0]);
        for (let i = 0; i < activityDates.length; i++) {
          const checkDate = new Date(activityDates[i]);
          const diffDays = Math.round(
            (expected.getTime() - checkDate.getTime()) / (1000 * 3600 * 24)
          );
          if (diffDays === 0) {
            currentStreak++;
            expected.setDate(expected.getDate() - 1);
          } else {
            break;
          }
        }
      }

      // Compute best historical streak
      let tempStreak = 1;
      bestStreak = 1;
      for (let i = 0; i < activityDates.length - 1; i++) {
        const cur = new Date(activityDates[i]);
        const next = new Date(activityDates[i + 1]);
        const diff = Math.round((cur.getTime() - next.getTime()) / (1000 * 3600 * 24));
        if (diff === 1) {
          tempStreak++;
          if (tempStreak > bestStreak) bestStreak = tempStreak;
        } else {
          tempStreak = 1;
        }
      }
    }

    // Category breakdown
    const categoryBreakdown: Record<string, number> = {
      blood: 0,
      equipment: 0,
      elderly: 0,
      books: 0,
      transport: 0,
    };
    completedHelps.forEach((h) => {
      const cat = h.category === 'elderly_help' ? 'elderly' : h.category;
      if (categoryBreakdown[cat] !== undefined) {
        categoryBreakdown[cat]++;
      }
    });

    // Monthly Activity for last 6 calendar months
    const monthlyActivity: Array<{ month: string; year: number; count: number }> = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = d.toLocaleDateString('en-US', { month: 'short' });
      const yVal = d.getFullYear();
      const mStart = new Date(yVal, d.getMonth(), 1).getTime();
      const mEnd = new Date(yVal, d.getMonth() + 1, 1).getTime();

      const count = completedHelps.filter((h) => {
        if (!h.completed_at) return false;
        const time = new Date(h.completed_at).getTime();
        return time >= mStart && time < mEnd;
      }).length;

      monthlyActivity.push({
        month: mStr,
        year: yVal,
        count,
      });
    }

    // GUARANTEE 100% AGREEMENT between summary numbers and Activity list rows:
    // We bind stats exactly to the counts of items returned in the lists!
    const helpsGivenCount = completedHelps.length;
    const requestsMadeCount = myRequests.length;
    const openRequestsCount = openRequests.length;
    const totalOffersCount = myOffers.length;

    // Map rows for clean client rendering
    const formattedCompletedHelps = completedHelps.map((h: any) => {
      const requester = Array.isArray(h.requester) ? h.requester[0] : h.requester;
      return {
        id: h.id,
        type: 'help' as const,
        requestId: h.id,
        category: (h.category === 'elderly_help' ? 'elderly' : h.category) as any,
        title: h.title,
        status: h.status,
        date: h.completed_at || h.created_at,
        distanceKm: h.details?.distance_km ?? 1.8,
        otherPerson: {
          id: h.requester_id,
          name: requester?.display_name || requester?.username || 'Community Neighbor',
          username: requester?.username,
          avatarUrl: requester?.avatar_url,
          rating: requester?.rating_average,
          isVerified: requester?.verification_status === 'verified',
          role: 'Requester',
        },
      };
    });

    const formattedMyRequests = myRequests.map((r: any) => {
      const helper = Array.isArray(r.helper) ? r.helper[0] : r.helper;
      return {
        id: r.id,
        type: 'request' as const,
        requestId: r.id,
        category: (r.category === 'elderly_help' ? 'elderly' : r.category) as any,
        title: r.title,
        status: r.status,
        date: r.created_at,
        distanceKm: r.details?.distance_km ?? 0.5,
        otherPerson: helper
          ? {
              id: r.accepted_helper_id,
              name: helper?.display_name || helper?.username || 'Matched Volunteer',
              username: helper?.username,
              avatarUrl: helper?.avatar_url,
              rating: helper?.rating_average,
              isVerified: helper?.verification_status === 'verified',
              role: 'Helper',
            }
          : undefined,
      };
    });

    const formattedMyOffers = myOffers.map((o: any) => {
      const req = Array.isArray(o.requests) ? o.requests[0] : o.requests;
      const requester = req?.requester ? (Array.isArray(req.requester) ? req.requester[0] : req.requester) : null;
      return {
        id: o.id,
        type: 'offer' as const,
        offerId: o.id,
        requestId: o.request_id,
        category: (req?.category === 'elderly_help' ? 'elderly' : req?.category || 'blood') as any,
        title: req?.title || 'Volunteer Assistance Offer',
        message: o.message,
        status: o.status,
        date: o.created_at,
        distanceKm: req?.details?.distance_km ?? 1.5,
        otherPerson: requester
          ? {
              id: req?.requester_id,
              name: requester.display_name || requester.username || 'Community Neighbor',
              username: requester.username,
              avatarUrl: requester.avatar_url,
              rating: requester.rating_average,
              isVerified: requester.verification_status === 'verified',
              role: 'Requester',
            }
          : undefined,
      };
    });

    const finalSummary = {
      helpsGiven: helpsGivenCount,
      requestsMade: requestsMadeCount,
      openRequests: openRequestsCount,
      totalOffers: totalOffersCount,
      hoursActive: rpcSummary?.hours_volunteered ? Number(rpcSummary.hours_volunteered) : Math.round(totalHours * 10) / 10,
      neighboursSupported: rpcSummary?.neighbours_supported ?? neighboursSupported,
      distanceCovered: rpcSummary?.distance_covered_km ? Number(rpcSummary.distance_covered_km) : distanceCovered,
      trustScore: trustScore,
      ratingsCount: totalRatingsCount,
      requesterRating: requesterAvg,
      requesterRatingsCount: requesterRatings.length,
      helperRating: helperAvg,
      helperRatingsCount: helperRatings.length,
      currentStreak: rpcSummary?.current_streak ?? rpcSummary?.current_streak_days ?? currentStreak,
      bestStreak: rpcSummary?.best_streak ?? rpcSummary?.best_streak_days ?? Math.max(bestStreak, currentStreak),
      categoryBreakdown: rpcSummary?.category_breakdown ?? categoryBreakdown,
      monthlyActivity: rpcSummary?.monthly_activity ?? monthlyActivity,
    };

    return NextResponse.json({
      success: true,
      stats: finalSummary,
      activity: {
        completedHelps: formattedCompletedHelps,
        myRequests: formattedMyRequests,
        myOffers: formattedMyOffers,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
