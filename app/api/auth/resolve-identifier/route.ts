import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

// Static mapping for demo showcase accounts with primary and supported fallback emails
const DEMO_EMAIL_MAP: Record<string, { primary: string; aliases: string[] }> = {
  kind_volunteer: {
    primary: 'volunteer@kindlink.demo',
    aliases: ['volunteer@kindlink.demo', 'kind_volunteer@kindlink.demo'],
  },
  need_aid: {
    primary: 'requester@kindlink.demo',
    aliases: ['requester@kindlink.demo', 'need_aid@kindlink.demo'],
  },
  admin_kindlink: {
    primary: 'admin@kindlink.demo',
    aliases: ['admin@kindlink.demo', 'admin_kindlink@kindlink.demo'],
  },
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const identifier = (searchParams.get('username') || searchParams.get('identifier') || '').trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json({ error: 'Username or identifier parameter is required' }, { status: 400 });
    }

    // If identifier is directly an email, check if it is a known demo alias or return directly
    if (identifier.includes('@')) {
      for (const [uname, info] of Object.entries(DEMO_EMAIL_MAP)) {
        if (info.aliases.includes(identifier)) {
          return NextResponse.json({
            email: info.primary,
            fallbackEmail: info.aliases.find((a) => a !== info.primary),
            allEmails: info.aliases,
            username: uname,
          });
        }
      }
      return NextResponse.json({ email: identifier, allEmails: [identifier] });
    }

    // 1. Try Supabase RPC get_email_by_username
    let resolvedEmail = '';
    const admin = createAdminClient();

    try {
      const { data: rpcEmail, error: rpcErr } = await admin.rpc('get_email_by_username', { p_username: identifier });
      if (!rpcErr && rpcEmail && typeof rpcEmail === 'string' && rpcEmail.trim()) {
        resolvedEmail = rpcEmail.trim().toLowerCase();
      }
    } catch {
      // Fallback to table queries
    }

    // 2. Query public.profiles by username
    if (!resolvedEmail) {
      try {
        const { data: profile } = await admin
          .from('profiles')
          .select('id, email')
          .ilike('username', identifier)
          .maybeSingle();

        if (profile?.email) {
          resolvedEmail = profile.email.trim().toLowerCase();
        } else if (profile?.id) {
          // Resolve associated email from auth.users via admin service key
          const { data: authUser } = await admin.auth.admin.getUserById(profile.id);
          if (authUser?.user?.email) {
            resolvedEmail = authUser.user.email.trim().toLowerCase();
          }
        }
      } catch {
        // Fallback to demo map
      }
    }

    // 3. Fallback to demo email map if database query was empty or unavailable
    const demoInfo = DEMO_EMAIL_MAP[identifier];
    if (!resolvedEmail && demoInfo) {
      resolvedEmail = demoInfo.primary;
    }

    if (!resolvedEmail) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const fallbackEmail = demoInfo
      ? demoInfo.aliases.find((a) => a !== resolvedEmail)
      : undefined;

    return NextResponse.json({
      email: resolvedEmail,
      fallbackEmail,
      allEmails: demoInfo ? demoInfo.aliases : [resolvedEmail],
      username: identifier,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

