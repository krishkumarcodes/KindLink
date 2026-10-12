import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/auth/rate-limit';

const LoginSchema = z.object({
  identifier: z.string().min(1, 'Please enter your email or username.'),
  password: z.string().min(1, 'Please enter your password.'),
});

const GENERIC_ERROR = 'Wrong email, username or password';

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting (10 login attempts per 15 min window)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`login_${ip}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please wait a few minutes before trying again.' },
        { status: 429 }
      );
    }

    // 2. Validate request body
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const { identifier, password } = parsed.data;
    const cleanId = identifier.trim();

    let targetEmail = '';

    if (cleanId.includes('@')) {
      // Direct email login
      targetEmail = cleanId.toLowerCase();
    } else {
      // Resolve username to email on SERVER ONLY using Service Role Key
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from('profiles')
        .select('id')
        .ilike('username', cleanId.toLowerCase())
        .maybeSingle();

      if (!profile) {
        // Return same generic error to prevent username discovery
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
      }

      // Query auth.users via admin API to find associated email
      const { data: authUser, error: authUserErr } = await admin.auth.admin.getUserById(profile.id);
      if (authUserErr || !authUser?.user?.email) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
      }

      targetEmail = authUser.user.email;
    }

    // 3. Authenticate with Supabase Auth (writes SSR session cookies)
    const supabase = createClient();
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password,
    });

    if (signInError || !sessionData.user) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // 4. Return safe session details (Never expose emails in response when username was provided)
    return NextResponse.json({
      success: true,
      user: {
        id: sessionData.user.id,
        username: sessionData.user.user_metadata?.username || cleanId,
        displayName: sessionData.user.user_metadata?.display_name || cleanId,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }
}
