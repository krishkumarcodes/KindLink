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

    // Fetch verification requests
    const { data: requests, error } = await admin
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate signed URLs for document inspection (valid for 60 minutes)
    const requestsWithSignedUrls = await Promise.all(
      (requests || []).map(async (item: any) => {
        let signedUrl = null;
        if (item.id_document_path) {
          const { data: urlData } = await admin.storage
            .from('verification-docs')
            .createSignedUrl(item.id_document_path, 3600);
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
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    if (!requestId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'verified' : 'rejected';

    // Get target verification request
    const { data: vReq, error: getErr } = await admin
      .from('verification_requests')
      .select('user_id')
      .eq('id', requestId)
      .single();

    if (getErr || !vReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // 1. Update verification_requests row
    const { error: updateReqErr } = await admin
      .from('verification_requests')
      .update({
        status: newStatus,
        admin_note: adminNote || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (updateReqErr) {
      return NextResponse.json({ error: updateReqErr.message }, { status: 500 });
    }

    // 2. Update profiles verification_status
    await admin
      .from('profiles')
      .update({
        verification_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', vReq.user_id);

    // 3. Notify user
    await admin.from('notifications').insert({
      user_id: vReq.user_id,
      type: action === 'approve' ? 'verification_approved' : 'verification_rejected',
      title: action === 'approve' ? '🛡️ Identity Verified!' : '⚠️ Verification Update',
      body:
        action === 'approve'
          ? 'Congratulations! Your community identity has been verified. You can now offer help.'
          : `Your verification request was not approved: ${adminNote || 'Please re-submit clear ID.'}`,
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
