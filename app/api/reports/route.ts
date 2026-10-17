import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to submit a report.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      reportedUserId,
      reportedUsername,
      reason,
      details,
      requestId,
    } = body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Please select a reason for your report.' },
        { status: 400 }
      );
    }

    const reportSummary = [
      reportedUsername ? `[Reported User: @${reportedUsername}]` : '',
      reportedUserId ? `[User ID: ${reportedUserId}]` : '',
      `Reason: ${reason.trim()}`,
      details ? `Details: ${details.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const admin = createAdminClient();

    const { error: insertError } = await admin.from('reports').insert({
      reporter_id: user.id,
      request_id: requestId || null,
      reason: reportSummary,
      status: 'pending',
    });

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || 'Failed to submit report.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report submitted for community review. Our team will audit this profile within 24 hours.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error submitting report.' },
      { status: 500 }
    );
  }
}
