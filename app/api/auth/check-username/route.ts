import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateUsername } from '@/lib/auth/rate-limit';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username') || '';

    const validation = validateUsername(username);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        reason: validation.reason,
      });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', username.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      // In offline/mock mode or DB error, fall back to valid format
      return NextResponse.json({ available: true });
    }

    if (data) {
      return NextResponse.json({
        available: false,
        reason: 'This username is already taken.',
      });
    }

    return NextResponse.json({ available: true });
  } catch (err: any) {
    return NextResponse.json(
      { available: false, reason: 'Failed to verify username availability.' },
      { status: 500 }
    );
  }
}
