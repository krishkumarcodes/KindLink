import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Static mapping for demo showcase accounts
const DEMO_EMAIL_MAP: Record<string, string> = {
  kind_volunteer: 'kind_volunteer@kindlink.demo',
  need_aid: 'need_aid@kindlink.demo',
  admin_kindlink: 'admin_kindlink@kindlink.demo',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const username = (searchParams.get('username') || '').trim().toLowerCase();

    if (!username) {
      return NextResponse.json({ error: 'Username parameter is required' }, { status: 400 });
    }

    // 1. Check quick showcase accounts
    if (DEMO_EMAIL_MAP[username]) {
      return NextResponse.json({ email: DEMO_EMAIL_MAP[username] });
    }

    // 2. Query profiles by username
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 3. Resolve associated email from auth.users via admin service key
    const { data: authUser, error: authErr } = await admin.auth.admin.getUserById(profile.id);
    if (authErr || !authUser?.user?.email) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    return NextResponse.json({ email: authUser.user.email });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
