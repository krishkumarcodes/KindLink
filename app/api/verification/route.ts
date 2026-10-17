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
    const { data: vReq } = await admin
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ verification: vReq || null });
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

    const contentType = req.headers.get('content-type') || '';
    let phone = '';
    let documentType = 'Student ID Card';
    let uploadedFilePath: string | null = null;
    let originalFileName: string | null = null;

    const admin = createAdminClient();

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      phone = (formData.get('phone') as string) || '';
      documentType = (formData.get('documentType') as string) || 'Student ID Card';
      const file = formData.get('file') as File | null;

      if (file && file.size > 0) {
        if (file.size > 5 * 1024 * 1024) {
          return NextResponse.json({ error: 'File exceeds 5MB size limit' }, { status: 400 });
        }
        originalFileName = file.name;
        const fileExt = file.name.split('.').pop() || 'png';
        uploadedFilePath = `${user.id}/${Date.now()}_id.${fileExt}`;

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const { error: uploadError } = await admin.storage
          .from('verification-docs')
          .upload(uploadedFilePath, buffer, {
            contentType: file.type || 'application/octet-stream',
            upsert: true,
          });

        if (uploadError) {
          return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
        }
      }
    } else {
      const body = await req.json().catch(() => ({}));
      phone = body.phone || '';
      documentType = body.documentType || 'Student ID Card';
      uploadedFilePath = body.idDocumentPath || null;
      originalFileName = body.idDocumentName || null;
    }

    // Clean and validate phone if provided
    const cleanDigits = phone.replace(/\D/g, '');
    if (cleanDigits.length < 10) {
      return NextResponse.json(
        { error: 'A valid 10-digit Indian mobile number is required to request verification.' },
        { status: 400 }
      );
    }

    let formattedPhone = phone.trim();
    if (cleanDigits.length === 10) {
      formattedPhone = `+91 ${cleanDigits.slice(0, 5)} ${cleanDigits.slice(5)}`;
    } else if (cleanDigits.length === 12 && cleanDigits.startsWith('91')) {
      formattedPhone = `+91 ${cleanDigits.slice(2, 7)} ${cleanDigits.slice(7)}`;
    }

    const now = new Date().toISOString();

    // Insert verification request
    const { data: newReq, error: insertError } = await admin
      .from('verification_requests')
      .insert({
        user_id: user.id,
        phone: formattedPhone,
        id_document_path: uploadedFilePath,
        document_type: documentType,
        status: 'pending',
        created_at: now,
      })
      .select()
      .single();

    if (insertError) {
      // In case optional columns aren't in schema, try standard insert
      const { data: retryReq, error: retryErr } = await admin
        .from('verification_requests')
        .insert({
          user_id: user.id,
          phone: formattedPhone,
          id_document_path: uploadedFilePath || 'no-document',
          status: 'pending',
          created_at: now,
        })
        .select()
        .single();

      if (retryErr) {
        return NextResponse.json({ error: retryErr.message }, { status: 500 });
      }
    }

    // Update profile
    await admin
      .from('profiles')
      .update({
        phone: formattedPhone,
        verification_status: 'pending',
        updated_at: now,
      })
      .eq('id', user.id);

    return NextResponse.json({
      success: true,
      status: 'pending',
      phone: formattedPhone,
      documentPath: uploadedFilePath,
      documentName: originalFileName,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Get current verification request
    const { data: vReq } = await admin
      .from('verification_requests')
      .select('id, id_document_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vReq && vReq.id_document_path) {
      try {
        await admin.storage.from('verification-docs').remove([vReq.id_document_path]);
      } catch (err) {
        console.warn('[Verification Delete Doc] Storage error:', err);
      }

      await admin
        .from('verification_requests')
        .update({
          id_document_path: null,
          document_type: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vReq.id);
    }

    return NextResponse.json({ success: true, message: 'ID document removed.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
