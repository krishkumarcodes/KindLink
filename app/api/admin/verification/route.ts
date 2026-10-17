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
    // Check admin role
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // Fetch verification requests with user profiles
    const { data: requests, error } = await admin
      .from('verification_requests')
      .select(`
        id,
        user_id,
        phone,
        id_document_path,
        document_type,
        status,
        admin_note,
        created_at,
        reviewed_at,
        document_expires_at,
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
      // If table has missing columns or error, try fallback select
      console.warn('[Admin Verification GET] Primary query error, attempting fallback:', error.message);
      const { data: fallbackRequests, error: fallbackError } = await admin
        .from('verification_requests')
        .select(`
          id,
          user_id,
          phone,
          id_document_path,
          status,
          admin_note,
          created_at,
          reviewed_at,
          profiles:user_id (
            username,
            display_name
          )
        `)
        .order('created_at', { ascending: false });

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 500 });
      }

      const requestsWithUrls = await Promise.all(
        (fallbackRequests || []).map(async (item: any) => {
          let signedUrl = null;
          if (item.id_document_path) {
            const { data: urlData } = await admin.storage
              .from('verification-docs')
              .createSignedUrl(item.id_document_path, 900); // 15-minute short-lived link
            signedUrl = urlData?.signedUrl || null;
          }
          return {
            ...item,
            signedUrl,
          };
        })
      );
      return NextResponse.json({ requests: requestsWithUrls });
    }

    // Document Retention: Delete documents automatically 30 days after a decision
    const now = new Date();
    const requestsWithSignedUrls = await Promise.all(
      (requests || []).map(async (item: any) => {
        let signedUrl = null;

        // Check if document has expired (30 days after decision)
        if (item.document_expires_at && new Date(item.document_expires_at) < now) {
          if (item.id_document_path) {
            try {
              await admin.storage.from('verification-docs').remove([item.id_document_path]);
              await admin
                .from('verification_requests')
                .update({ id_document_path: null })
                .eq('id', item.id);
              item.id_document_path = null;
            } catch (cleanupErr) {
              console.warn('[Admin Verification] Retention cleanup error:', cleanupErr);
            }
          }
        }

        if (item.id_document_path) {
          // Short-lived signed URL (15 minutes = 900 seconds)
          const { data: urlData } = await admin.storage
            .from('verification-docs')
            .createSignedUrl(item.id_document_path, 900);
          signedUrl = urlData?.signedUrl || null;
        }

        return {
          ...item,
          signedUrl,
        };
      })
    );

    return NextResponse.json({ requests: requestsWithSignedUrls });
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

    // Get target verification request
    const { data: vReq, error: getErr } = await admin
      .from('verification_requests')
      .select('id, user_id, status, phone, id_document_path')
      .eq('id', requestId)
      .single();

    if (getErr || !vReq) {
      return NextResponse.json({ error: 'Verification request not found' }, { status: 404 });
    }

    // SECURITY RULE: Admins cannot approve their own requests!
    if (action === 'approve' && vReq.user_id === user.id) {
      return NextResponse.json(
        { error: 'Security rule violation: Admins cannot approve their own verification requests.' },
        { status: 403 }
      );
    }

    let newStatus: string;
    let profileStatus: string;
    if (action === 'approve') {
      newStatus = 'verified';
      profileStatus = 'verified';
    } else if (action === 'needs_info') {
      newStatus = 'needs_info';
      profileStatus = 'unverified';
    } else {
      newStatus = 'rejected';
      profileStatus = 'rejected';
    }

    const now = new Date();
    // 30 days retention policy for documents after decision
    const documentExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Update verification_requests row
    const updatePayload: Record<string, any> = {
      status: newStatus,
      admin_note: adminNote?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: now.toISOString(),
      document_expires_at: documentExpiresAt,
      updated_at: now.toISOString(),
    };

    const { error: updateReqErr } = await admin
      .from('verification_requests')
      .update(updatePayload)
      .eq('id', requestId);

    if (updateReqErr) {
      // In case optional columns don't exist yet, retry with minimal fields
      console.warn('[Admin Verification POST] Update error, trying minimal fields:', updateReqErr.message);
      const { error: retryErr } = await admin
        .from('verification_requests')
        .update({
          status: newStatus,
          admin_note: adminNote?.trim() || null,
          reviewed_by: user.id,
          reviewed_at: now.toISOString(),
        })
        .eq('id', requestId);

      if (retryErr) {
        return NextResponse.json({ error: retryErr.message }, { status: 500 });
      }
    }

    // 2. Update profiles verification_status
    await admin
      .from('profiles')
      .update({
        verification_status: profileStatus,
        updated_at: now.toISOString(),
      })
      .eq('id', vReq.user_id);

    // 3. User notification trigger
    let notifTitle = '🛡️ Identity Verified!';
    let notifBody = 'Congratulations! Your community identity has been verified. You can now offer help.';
    let notifType = 'verification_approved';

    if (action === 'needs_info') {
      notifType = 'verification_needs_info';
      notifTitle = '📝 Additional Verification Info Needed';
      notifBody = `Regarding your verification: ${adminNote.trim()}`;
    } else if (action === 'reject') {
      notifType = 'verification_rejected';
      notifTitle = '⚠️ Verification Request Update';
      notifBody = `Your verification request was not approved: ${adminNote.trim()}`;
    }

    try {
      await admin.from('notifications').insert({
        user_id: vReq.user_id,
        type: notifType,
        title: notifTitle,
        body: notifBody,
      });
    } catch (notifErr) {
      console.warn('[Admin Verification] Notification trigger warning:', notifErr);
    }

    // 4. Audit log entry in admin_audit_logs
    try {
      await admin.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: `verification_${action}`,
        target_type: 'verification_request',
        target_id: requestId,
        target_user_id: vReq.user_id,
        reason: adminNote?.trim() || null,
        details: {
          previous_status: vReq.status,
          new_status: newStatus,
        },
      });
    } catch (auditErr) {
      console.warn('[Admin Verification] Audit log warning:', auditErr);
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
