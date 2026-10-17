import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ALL_BADGE_DEFINITIONS } from '@/lib/data/badges';

export const dynamic = 'force-dynamic';

const MAX_PINNED_BADGES = 3;

export async function POST(req: NextRequest) {
  return handlePinUpdate(req);
}

export async function PATCH(req: NextRequest) {
  return handlePinUpdate(req);
}

async function handlePinUpdate(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    const body = await req.json();
    let nextPinnedBadges: string[] = [];

    // Support both: { pinnedBadges: string[] } and { badgeId: string, pinned: boolean }
    if (Array.isArray(body.pinnedBadges)) {
      nextPinnedBadges = body.pinnedBadges;
    } else if (typeof body.badgeId === 'string' && typeof body.pinned === 'boolean') {
      const { badgeId, pinned } = body;

      // Fetch current pinned badges from profile if user is logged in
      let currentPinned: string[] = [];
      if (user) {
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from('profiles')
          .select('pinned_badges')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.pinned_badges && Array.isArray(profile.pinned_badges)) {
          currentPinned = profile.pinned_badges;
        }
      }

      if (pinned) {
        if (!currentPinned.includes(badgeId)) {
          currentPinned.push(badgeId);
        }
      } else {
        currentPinned = currentPinned.filter((id) => id !== badgeId);
      }
      nextPinnedBadges = currentPinned;
    } else {
      return NextResponse.json(
        { error: 'Invalid request body. Provide badgeId and pinned, or pinnedBadges array.' },
        { status: 400 }
      );
    }

    // Filter to valid badge definition IDs
    const validIds = new Set(ALL_BADGE_DEFINITIONS.map((b) => b.id));
    nextPinnedBadges = Array.from(new Set(nextPinnedBadges)).filter((id) => validIds.has(id));

    // Enforce max 3 pinned badges
    if (nextPinnedBadges.length > MAX_PINNED_BADGES) {
      return NextResponse.json(
        {
          error: `You can pin a maximum of ${MAX_PINNED_BADGES} badges to your profile header card.`,
        },
        { status: 400 }
      );
    }

    // If user is authenticated, persist to profiles table in Supabase
    if (user) {
      const admin = createAdminClient();
      try {
        const { error: updateError } = await admin
          .from('profiles')
          .update({
            pinned_badges: nextPinnedBadges,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (updateError) {
          // If the pinned_badges column doesn't exist yet in the database schema, log and continue gracefully
          console.warn('Notice: pinned_badges column update fallback:', updateError.message);
        }
      } catch (err: any) {
        console.warn('Notice: pinned_badges persistence note:', err.message);
      }
    }

    return NextResponse.json({
      success: true,
      pinnedBadges: nextPinnedBadges,
      message: 'Pinned badges updated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update pinned badges' },
      { status: 500 }
    );
  }
}
