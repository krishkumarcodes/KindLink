import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'You must be signed in to manage sessions.' },
        { status: 401 }
      );
    }

    // Supabase GoTrue supports scope: 'others' to revoke other refresh tokens
    const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });

    if (signOutError) {
      return NextResponse.json(
        { error: signOutError.message || 'Could not revoke other sessions.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All other device sessions have been revoked successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Internal server error revoking sessions.' },
      { status: 500 }
    );
  }
}
