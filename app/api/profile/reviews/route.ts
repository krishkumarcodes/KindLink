import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const searchParams = req.nextUrl.searchParams;
    const targetUserId = searchParams.get('userId') || user?.id;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Unauthorized or missing user identifier' },
        { status: 401 }
      );
    }

    const client = user ? supabase : createAdminClient();

    const { data: ratings, error } = await client
      .from('ratings')
      .select(`
        id,
        stars,
        comment,
        created_at,
        request_id,
        rater_id,
        ratee_id,
        requests:request_id (
          id,
          title,
          category,
          requester_id,
          accepted_helper_id
        ),
        rater:rater_id (
          id,
          display_name,
          username,
          avatar_url,
          verification_status
        )
      `)
      .eq('ratee_id', targetUserId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const allRatings = ratings || [];

    const formatReview = (r: any, role: 'volunteer' | 'requester') => {
      const reqData = Array.isArray(r.requests) ? r.requests[0] : r.requests;
      const raterProfile = Array.isArray(r.rater) ? r.rater[0] : r.rater;
      return {
        id: r.id,
        stars: r.stars,
        comment: r.comment || '',
        createdAt: r.created_at,
        role,
        requestId: r.request_id,
        requestTitle: reqData?.title || 'Community Mutual Aid Request',
        category: (reqData?.category === 'elderly_help' ? 'elderly' : reqData?.category || 'blood') as string,
        rater: {
          id: raterProfile?.id || r.rater_id,
          name: raterProfile?.display_name || raterProfile?.username || 'Community Neighbor',
          username: raterProfile?.username,
          avatarUrl: raterProfile?.avatar_url,
          isVerified: raterProfile?.verification_status === 'verified',
        },
      };
    };

    const asVolunteerList: any[] = [];
    const asRequesterList: any[] = [];

    allRatings.forEach((r: any) => {
      const reqData = Array.isArray(r.requests) ? r.requests[0] : r.requests;
      if (reqData?.requester_id === targetUserId) {
        asRequesterList.push(formatReview(r, 'requester'));
      } else {
        asVolunteerList.push(formatReview(r, 'volunteer'));
      }
    });

    const helperAvg =
      asVolunteerList.length > 0
        ? Math.round(
            (asVolunteerList.reduce((acc, r) => acc + r.stars, 0) /
              asVolunteerList.length) *
              10
          ) / 10
        : null;

    const requesterAvg =
      asRequesterList.length > 0
        ? Math.round(
            (asRequesterList.reduce((acc, r) => acc + r.stars, 0) /
              asRequesterList.length) *
              10
          ) / 10
        : null;

    const overallAvg =
      allRatings.length > 0
        ? Math.round(
            (allRatings.reduce((acc: number, r: any) => acc + r.stars, 0) /
              allRatings.length) *
              10
          ) / 10
        : null;

    return NextResponse.json(
      {
        success: true,
        stats: {
          trustScore: allRatings.length >= 5 ? overallAvg : overallAvg,
          totalReviewsCount: allRatings.length,
          hasEnoughForScore: allRatings.length >= 5,
          helperRating: helperAvg,
          helperCount: asVolunteerList.length,
          requesterRating: requesterAvg,
          requesterCount: asRequesterList.length,
        },
        asVolunteer: asVolunteerList,
        asRequester: asRequesterList,
        allReviews: [...asVolunteerList, ...asRequesterList].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
      },
      {
        headers: {
          'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }
}
