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

    // Query professional_proofs with profiles
    const { data: proofs, error } = await admin
      .from('professional_proofs')
      .select(`
        id,
        user_id,
        profession_type,
        registration_number,
        document_path,
        document_name,
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
      // Table might not exist yet if migration hasn't run in this environment; return empty array gracefully
      console.warn('[Admin Professional Proofs GET] Query warning:', error.message);
      return NextResponse.json({ proofs: [] });
    }

    // Document retention check & signed URLs
    const now = new Date();
    const proofsWithUrls = await Promise.all(
      (proofs || []).map(async (item: any) => {
        let signedUrl = null;

        // Auto-delete document 30 days after decision
        if (item.document_expires_at && new Date(item.document_expires_at) < now) {
          if (item.document_path) {
            try {
              await admin.storage.from('verification-docs').remove([item.document_path]);
              await admin
                .from('professional_proofs')
                .update({ document_path: null })
                .eq('id', item.id);
              item.document_path = null;
            } catch (cleanupErr) {
              console.warn('[Admin Professional Proofs] Retention cleanup error:', cleanupErr);
            }
          }
        }

        if (item.document_path) {
          const { data: urlData } = await admin.storage
            .from('verification-docs')
            .createSignedUrl(item.document_path, 900); // 15-minute short-lived link
          signedUrl = urlData?.signedUrl || null;
        }

        return {
          ...item,
          signedUrl,
        };
      })
    );

    return NextResponse.json({ proofs: proofsWithUrls });
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
    const { proofId, action, adminNote } = body;

    if (!proofId || !['approve', 'needs_info', 'reject'].includes(action)) {
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

    const { data: proof, error: getErr } = await admin
      .from('professional_proofs')
      .select('id, user_id, status, profession_type, registration_number')
      .eq('id', proofId)
      .single();

    if (getErr || !proof) {
      return NextResponse.json({ error: 'Professional proof not found' }, { status: 404 });
    }

    // SECURITY RULE: Admins cannot approve their own requests!
    if (action === 'approve' && proof.user_id === user.id) {
      return NextResponse.json(
        { error: 'Security rule violation: Admins cannot approve their own professional proofs.' },
        { status: 403 }
      );
    }

    let newStatus: string;
    if (action === 'approve') {
      newStatus = 'verified';
    } else if (action === 'needs_info') {
      newStatus = 'needs_info';
    } else {
      newStatus = 'rejected';
    }

    const now = new Date();
    // 30 days retention policy for documents after decision
    const documentExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error: updateErr } = await admin
      .from('professional_proofs')
      .update({
        status: newStatus,
        admin_note: adminNote?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: now.toISOString(),
        document_expires_at: documentExpiresAt,
        updated_at: now.toISOString(),
      })
      .eq('id', proofId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // User notification trigger
    let notifTitle = '🎓 Professional Proof Verified!';
    let notifBody = `Your professional proof as ${proof.profession_type} has been verified.`;
    let notifType = 'professional_proof_approved';

    if (action === 'needs_info') {
      notifType = 'professional_proof_needs_info';
      notifTitle = '📋 Professional Proof Needs More Info';
      notifBody = `Regarding your ${proof.profession_type} proof: ${adminNote.trim()}`;
    } else if (action === 'reject') {
      notifType = 'professional_proof_rejected';
      notifTitle = '⚠️ Professional Proof Rejected';
      notifBody = `Your ${proof.profession_type} proof could not be verified: ${adminNote.trim()}`;
    }

    try {
      await admin.from('notifications').insert({
        user_id: proof.user_id,
        type: notifType,
        title: notifTitle,
        body: notifBody,
      });
    } catch (notifErr) {
      console.warn('[Admin Professional Proofs] Notification trigger warning:', notifErr);
    }

    // Audit log entry in admin_audit_logs
    try {
      await admin.from('admin_audit_logs').insert({
        admin_id: user.id,
        action: `professional_proof_${action}`,
        target_type: 'professional_proof',
        target_id: proofId,
        target_user_id: proof.user_id,
        reason: adminNote?.trim() || null,
        details: {
          profession_type: proof.profession_type,
          registration_number: proof.registration_number,
          previous_status: proof.status,
          new_status: newStatus,
        },
      });
    } catch (auditErr) {
      console.warn('[Admin Professional Proofs] Audit log warning:', auditErr);
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
