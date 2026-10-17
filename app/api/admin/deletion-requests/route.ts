import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const { data: requests, error } = await admin
      .from('deletion_requests')
      .select(`
        id,
        user_id,
        reason,
        status,
        admin_note,
        created_at,
        reviewed_at,
        profiles:user_id (
          username,
          display_name,
          email,
          phone,
          college,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Admin Deletion Requests GET] Query warning:', error.message);
      return NextResponse.json({ requests: [] });
    }

    return NextResponse.json({ requests: requests || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    const body = await req.json();
    const { requestId, action, adminNote } = body;

    if (!requestId || !['approve', 'needs_info', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid parameters: action must be approve, needs_info, or reject' },
        { status: 400 }
      );
    }

    // Require reason/note for needs_info and reject
    if ((action === 'needs_info' || action === 'reject') && (!adminNote || !adminNote.trim())) {
      return NextResponse.json(
        { error: 'A note or reason is required when requesting more info or rejecting.' },
        { status: 400 }
      );
    }

    const { data: delReq, error: getErr } = await admin
      .from('deletion_requests')
      .select('id, user_id, status, reason')
      .eq('id', requestId)
      .single();

    if (getErr || !delReq) {
      return NextResponse.json({ error: 'Deletion request not found' }, { status: 404 });
    }

    // SECURITY RULE: Admins cannot approve their own requests!
    if (action === 'approve' && delReq.user_id === user.id) {
      return NextResponse.json(
        { error: 'Security rule violation: Admins cannot approve their own deletion requests.' },
        { status: 403 }
      );
    }

    const now = new Date();

    if (action === 'approve') {
      // 1. Record in audit logs BEFORE removing records
      try {
        await admin.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'deletion_approved',
          target_type: 'deletion_request',
          target_id: requestId,
          target_user_id: delReq.user_id,
          reason: adminNote?.trim() || 'Approved user requested account deletion',
          details: {
            user_id: delReq.user_id,
            previous_status: delReq.status,
            user_reason: delReq.reason,
          },
        });
      } catch (auditErr) {
        console.warn('[Admin Deletion] Audit log error:', auditErr);
      }

      // 2. Mark deletion request as approved
      await admin
        .from('deletion_requests')
        .update({
          status: 'approved',
          admin_note: adminNote?.trim() || 'Account deletion approved and processed',
          reviewed_by: user.id,
          reviewed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('id', requestId);

      // 3. Purge user data safely
      const targetUserId = delReq.user_id;

      // Clean up storage files in verification-docs
      try {
        const { data: vFiles } = await admin.storage
          .from('verification-docs')
          .list(targetUserId);
        if (vFiles && vFiles.length > 0) {
          const filePaths = vFiles.map((f: any) => `${targetUserId}/${f.name}`);
          await admin.storage.from('verification-docs').remove(filePaths);
        }
      } catch (storageErr) {
        console.warn('[Admin Deletion] Storage cleanup warning:', storageErr);
      }

      // Clean requests, offers, notifications, and profile
      try {
        await admin.from('offers').delete().eq('helper_id', targetUserId);
      } catch {}
      try {
        await admin.from('requests').delete().eq('requester_id', targetUserId);
      } catch {}
      try {
        await admin.from('verification_requests').delete().eq('user_id', targetUserId);
      } catch {}
      try {
        await admin.from('professional_proofs').delete().eq('user_id', targetUserId);
      } catch {}
      try {
        await admin.from('notifications').delete().eq('user_id', targetUserId);
      } catch {}
      try {
        await admin.from('profiles').delete().eq('id', targetUserId);
      } catch {}

      // Delete from Supabase Auth
      try {
        await admin.auth.admin.deleteUser(targetUserId);
      } catch (authErr: any) {
        console.warn('[Admin Deletion] Auth deleteUser warning:', authErr?.message);
      }

      return NextResponse.json({
        success: true,
        status: 'approved',
        message: 'Account deletion successfully processed and audited.',
      });
    }

    // Handle 'needs_info' or 'reject'
    const newStatus = action === 'needs_info' ? 'needs_info' : 'rejected';

    const { error: updateErr } = await admin
      .from('deletion_requests')
      .update({
        status: newStatus,
        admin_note: adminNote?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq('id', requestId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Trigger notification
    let notifTitle = 'ℹ️ Account Deletion Request Update';
    let notifBody = `Regarding your deletion request: ${adminNote.trim()}`;
    let notifType = 'deletion_needs_info';

    if (action === 'reject') {
      notifType = 'deletion_rejected';
      notifTitle = '🚫 Deletion Request Rejected';
      notifBody = `Your account deletion request was rejected: ${adminNote.trim()}`;
    }

    try {
      await admin.from('notifications').insert({
        user_id: delReq.user_id,
        type: notifType,
        title: notifTitle,
        body: notifBody,
      });
    } catch (notifErr) {
      console.warn('[Admin Deletion] Notification error:', notifErr);
    }

    // Audit log
    try {
      await admin.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: `deletion_${action}`,
        target_type: 'deletion_request',
        target_id: requestId,
        target_user_id: delReq.user_id,
        reason: adminNote?.trim() || null,
        details: {
          previous_status: delReq.status,
          new_status: newStatus,
        },
      });
    } catch (auditErr) {
      console.warn('[Admin Deletion] Audit log error:', auditErr);
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
