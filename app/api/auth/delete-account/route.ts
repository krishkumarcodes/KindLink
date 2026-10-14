import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'You must be signed in to delete your account.' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { confirmation } = body;

    // Safety confirmation: Must type DELETE or user ID
    if (!confirmation || (confirmation !== 'DELETE' && confirmation !== user.id)) {
      return NextResponse.json(
        { error: 'Please type DELETE into the confirmation box to permanently delete your account.' },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // 1. Delete user requests & associated data
    try {
      await admin.from('requests').delete().eq('requester_id', user.id);
    } catch {}

    // 2. Delete verification requests
    try {
      await admin.from('verification_requests').delete().eq('user_id', user.id);
    } catch {}

    // 3. Delete profile
    try {
      await admin.from('profiles').delete().eq('id', user.id);
    } catch {}

    // 4. Delete user in Supabase GoTrue Auth
    try {
      await admin.auth.admin.deleteUser(user.id);
    } catch (err: any) {
      console.warn('[Delete Account Auth]', err.message);
    }

    // 5. Sign out of current session
    try {
      await supabase.auth.signOut();
    } catch {}

    return NextResponse.json({
      success: true,
      message: 'Your KindLink account and data have been permanently deleted.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An error occurred during account deletion.' },
      { status: 500 }
    );
  }
}
