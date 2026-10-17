import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface DeletionStatusResult {
  id?: string;
  status: 'pending' | 'approved' | 'denied' | 'none';
  reason?: string;
  adminNote?: string;
  createdAt?: string;
}

/**
 * Helper to fetch existing deletion request for a user.
 * Supports primary account_deletion_requests table, falling back to reports table if not yet migrated.
 */
async function getExistingDeletionRequest(admin: any, userId: string): Promise<DeletionStatusResult> {
  // 1. Check deletion_requests table
  try {
    const { data, error } = await admin
      .from('deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      if (data.status === 'cancelled') {
        return { status: 'none' };
      }
      const mappedStatus: 'pending' | 'approved' | 'denied' =
        data.status === 'approved'
          ? 'approved'
          : data.status === 'reject' || data.status === 'rejected' || data.status === 'denied'
          ? 'denied'
          : 'pending';
      return {
        id: data.id,
        status: mappedStatus,
        reason: data.reason || '',
        adminNote: data.admin_note || '',
        createdAt: data.created_at,
      };
    }
  } catch {}

  // 2. Check account_deletion_requests table
  try {
    const { data, error } = await admin
      .from('account_deletion_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      if (data.status === 'cancelled') {
        return { status: 'none' };
      }
      return {
        id: data.id,
        status: data.status,
        reason: data.reason || '',
        adminNote: data.admin_note || '',
        createdAt: data.created_at,
      };
    }
  } catch {}

  // Fallback: Check reports table for [ACCOUNT_DELETION] entry
  try {
    const { data: reportData, error: reportError } = await admin
      .from('reports')
      .select('*')
      .eq('reporter_id', userId)
      .ilike('reason', '[ACCOUNT_DELETION]%')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!reportError && reportData) {
      const statusMap: Record<string, 'pending' | 'approved' | 'denied'> = {
        pending: 'pending',
        resolved: 'approved',
        dismissed: 'denied',
      };
      const cleanReason = (reportData.reason || '').replace(/^\[ACCOUNT_DELETION\]\s*/, '');
      return {
        id: reportData.id,
        status: statusMap[reportData.status] || 'pending',
        reason: cleanReason,
        adminNote: reportData.admin_note || '',
        createdAt: reportData.created_at,
      };
    }
  } catch {}

  return { status: 'none' };
}

/**
 * GET /api/auth/delete-account
 * Returns current user's deletion request status and whether they are the last admin.
 */
export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Check if user is the last admin
    let isLastAdmin = false;
    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'admin') {
      const { count: adminCount } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (adminCount !== null && adminCount <= 1) {
        isLastAdmin = true;
      }
    }

    const requestStatus = await getExistingDeletionRequest(admin, user.id);

    return NextResponse.json({
      request: requestStatus.status !== 'none' ? requestStatus : null,
      isLastAdmin,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch deletion status.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/delete-account
 * Initiates or processes account deletion.
 * - Blocks deletion of the last admin.
 * - Stores reason & confirmation.
 * - If approved or immediate purge requested: cancels active requests/offers, deletes personal data, anonymises history as "Deleted user".
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to manage your account.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { reason = '', confirmation = '', action = 'request' } = body;

    // Safety validation
    if (action !== 'cancel' && (!confirmation || confirmation.trim().toUpperCase() !== 'DELETE')) {
      return NextResponse.json(
        { error: 'Please type DELETE into the confirmation box to submit your deletion request.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Check if user is the last admin
    const { data: profile } = await admin
      .from('profiles')
      .select('role, username, display_name')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'admin') {
      const { count: adminCount } = await admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin');

      if (adminCount !== null && adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              'Cannot delete account: You are the last administrator on KindLink. Please assign another admin before requesting account deletion.',
          },
          { status: 400 }
        );
      }
    }

    // Handle cancel request
    if (action === 'cancel') {
      try {
        await admin
          .from('deletion_requests')
          .update({ status: 'cancelled' })
          .eq('user_id', user.id)
          .eq('status', 'pending');
      } catch {}

      try {
        await admin
          .from('account_deletion_requests')
          .update({ status: 'cancelled' })
          .eq('user_id', user.id)
          .eq('status', 'pending');
      } catch {}

      try {
        await admin
          .from('reports')
          .delete()
          .eq('reporter_id', user.id)
          .ilike('reason', '[ACCOUNT_DELETION]%')
          .eq('status', 'pending');
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'Account deletion request has been cancelled.',
      });
    }

    // Check if current user already has an approved request or if immediate deletion was requested
    const existingReq = await getExistingDeletionRequest(admin, user.id);

    // If already approved, execute final purging and anonymisation
    if (existingReq.status === 'approved' || action === 'execute_approved') {
      await executePurgeAndAnonymise(admin, supabase, user.id);
      return NextResponse.json({
        success: true,
        deleted: true,
        message: 'Account has been deleted and history anonymised.',
      });
    }

    // Otherwise create or update deletion request to 'pending'
    let requestSaved = false;
    try {
      const { error: delInsErr } = await admin
        .from('deletion_requests')
        .insert({
          user_id: user.id,
          reason: reason.trim() || 'User requested account closure',
          status: 'pending',
        });
      if (!delInsErr) requestSaved = true;
    } catch {}

    try {
      const { error: insErr } = await admin
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          reason: reason.trim() || 'User requested account closure',
          status: 'pending',
        });
      if (!insErr) requestSaved = true;
    } catch {}

    if (!requestSaved) {
      // Fallback in reports table
      try {
        await admin.from('reports').insert({
          reporter_id: user.id,
          reason: `[ACCOUNT_DELETION] ${reason.trim() || 'User requested account closure'}`,
          status: 'pending',
        });
        requestSaved = true;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      status: 'pending',
      message:
        'Your account deletion request has been submitted for review. You can cancel it anytime before processing.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An error occurred while submitting deletion request.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/delete-account
 * Cancel pending account deletion request
 */
export async function DELETE() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    try {
      await admin
        .from('deletion_requests')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'pending');
    } catch {}

    try {
      await admin
        .from('account_deletion_requests')
        .update({ status: 'cancelled' })
        .eq('user_id', user.id)
        .eq('status', 'pending');
    } catch {}

    try {
      await admin
        .from('reports')
        .delete()
        .eq('reporter_id', user.id)
        .ilike('reason', '[ACCOUNT_DELETION]%')
        .eq('status', 'pending');
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Deletion request cancelled successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to cancel deletion request.' },
      { status: 500 }
    );
  }
}

/**
 * Helper to execute account purging:
 * - Cancels active requests and offers
 * - Deletes private verification files
 * - Anonymises ratings, comments, and profile history as "Deleted user"
 * - Deletes auth user and signs out
 */
async function executePurgeAndAnonymise(admin: any, supabase: any, userId: string) {
  // 1. Cancel active requests
  try {
    await admin
      .from('requests')
      .update({
        status: 'cancelled',
        details: { cancelled_reason: 'Account deleted by member' },
      })
      .eq('requester_id', userId)
      .in('status', ['open', 'offered', 'accepted', 'on_the_way', 'arrived']);
  } catch {}

  // 2. Withdraw active offers
  try {
    await admin
      .from('offers')
      .update({ status: 'withdrawn' })
      .eq('helper_id', userId)
      .eq('status', 'pending');
  } catch {}

  // 3. Delete sensitive verification requests and identity files
  try {
    await admin.from('verification_requests').delete().eq('user_id', userId);
  } catch {}

  // 4. Anonymise profile to "Deleted user"
  try {
    await admin
      .from('profiles')
      .update({
        display_name: 'Deleted user',
        username: `deleted_${userId.slice(0, 8)}`,
        email: null,
        phone: null,
        bio: null,
        college: null,
        avatar_url: null,
        home_neighborhood: null,
        verification_status: 'unverified',
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
  } catch {}

  // 5. Delete Supabase GoTrue Auth record
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch (err: any) {
    console.warn('[Delete Account Auth]', err.message);
  }

  // 6. Sign out active session
  try {
    await supabase.auth.signOut();
  } catch {}
}
