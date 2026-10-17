import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  calculateBadgesForUser,
  getBadgesSummary,
  ALL_BADGE_DEFINITIONS,
  UserBadgeStats,
} from '@/lib/data/badges';
import { UserProfile } from '@/lib/data/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const searchParams = req.nextUrl.searchParams;
    const requestedUserId = searchParams.get('userId') || user?.id;

    // Fallback default profile if no user is authenticated
    let userProfile: UserProfile = {
      id: requestedUserId || 'guest',
      name: 'Community Member',
      username: 'member',
      displayName: 'Community Member',
      email: '',
      phone: '',
      college: '',
      homeNeighborhood: 'Asansol',
      rating: 5.0,
      ratingCount: 0,
      helpsCount: 0,
      requestsCount: 0,
      hoursVolunteered: 0,
      kilometersTraveled: 0,
      verificationState: 'unverified',
      badges: [],
      pinnedBadges: [],
    };

    const statsOverride: Partial<UserBadgeStats> = {};

    if (requestedUserId) {
      const admin = createAdminClient();

      // 1. Fetch user's profile record
      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('id', requestedUserId)
        .maybeSingle();

      if (profile) {
        userProfile = {
          id: profile.id,
          name: profile.display_name || profile.username,
          displayName: profile.display_name || profile.username,
          username: profile.username,
          email: profile.email || '',
          phone: profile.phone || '',
          college: profile.college || '',
          homeNeighborhood: profile.home_neighborhood || '',
          rating: Number(profile.rating_average) || 5.0,
          ratingCount: profile.rating_count || 0,
          helpsCount: profile.rating_count || 0,
          requestsCount: 0,
          verificationState: profile.verification_status || 'unverified',
          badges: profile.verification_status === 'verified' ? ['Identity Verified'] : [],
          pinnedBadges: Array.isArray(profile.pinned_badges) ? profile.pinned_badges : [],
          createdAt: profile.created_at || '',
        };

        // 2. Fetch completed helps count
        const { count: completedHelpsCount } = await admin
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('accepted_helper_id', profile.id)
          .eq('status', 'completed');

        if (completedHelpsCount !== null && completedHelpsCount !== undefined) {
          userProfile.helpsCount = completedHelpsCount;
          statsOverride.helpsCount = completedHelpsCount;
        }

        // 3. Count emergency / blood helps if available
        const { count: bloodHelpsCount } = await admin
          .from('requests')
          .select('id', { count: 'exact', head: true })
          .eq('accepted_helper_id', profile.id)
          .eq('status', 'completed')
          .eq('category', 'blood');

        if (bloodHelpsCount !== null && bloodHelpsCount !== undefined) {
          statsOverride.bloodHelps = bloodHelpsCount;
        }

        // 4. Count fast offers made
        const { count: offersCount } = await admin
          .from('offers')
          .select('id', { count: 'exact', head: true })
          .eq('helper_id', profile.id);

        if (offersCount !== null && offersCount !== undefined) {
          statsOverride.quickOffers = offersCount;
        }
      }
    }

    const badges = calculateBadgesForUser(userProfile, statsOverride);
    const summary = getBadgesSummary(badges);

    return NextResponse.json({
      success: true,
      badges,
      summary,
      catalogTotal: ALL_BADGE_DEFINITIONS.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch user badges',
      },
      { status: 500 }
    );
  }
}
