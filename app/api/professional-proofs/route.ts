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
    const { data: proofs, error } = await admin
      .from('professional_proofs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ proofs: [] });
    }

    return NextResponse.json({ proofs: proofs || [] });
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

    const formData = await req.formData();
    const professionType = (formData.get('professionType') as string) || '';
    const registrationNumber = (formData.get('registrationNumber') as string) || '';
    const file = formData.get('file') as File | null;

    if (!professionType || !['Doctor', 'Nurse', 'Pharmacist', 'Teacher', 'Student', 'Organisation'].includes(professionType)) {
      return NextResponse.json(
        { error: 'Valid profession type is required (Doctor, Nurse, Pharmacist, Teacher, Student, Organisation)' },
        { status: 400 }
      );
    }

    if (!registrationNumber || !registrationNumber.trim()) {
      return NextResponse.json({ error: 'Registration or identification number is required' }, { status: 400 });
    }

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Document upload is required for professional proof' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Document exceeds 5MB size limit' }, { status: 400 });
    }

    const admin = createAdminClient();
    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/prof_${Date.now()}.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await admin.storage
      .from('verification-docs')
      .upload(filePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 });
    }

    const { data: proof, error: insertError } = await admin
      .from('professional_proofs')
      .insert({
        user_id: user.id,
        profession_type: professionType,
        registration_number: registrationNumber.trim(),
        document_path: filePath,
        document_name: file.name,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, proof });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
