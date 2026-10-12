import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit, validateUsername } from '@/lib/auth/rate-limit';

const SignUpSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  username: z.string(),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  confirmPassword: z.string(),
  displayName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

export async function POST(req: NextRequest) {
  try {
    // 1. Basic IP Rate Limiting (5 signups per 15 min window)
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = checkRateLimit(`signup_${ip}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // 2. Validate input body
    const body = await req.json();
    const parsed = SignUpSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid registration data.' },
        { status: 400 }
      );
    }

    const { email, username, password, displayName } = parsed.data;

    // 3. Username Validation
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { error: usernameValidation.reason || 'Invalid username.' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const admin = createAdminClient();

    // 4. Ensure username is case-insensitive unique
    const { data: existingUser } = await admin
      .from('profiles')
      .select('id')
      .ilike('username', cleanUsername)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: 'This username is already taken. Please choose another.' },
        { status: 400 }
      );
    }

    // 5. Create user in Supabase Auth directly with auto-confirm (no emails sent)
    const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username: cleanUsername,
        display_name: displayName?.trim() || cleanUsername,
      },
    });

    if (createError) {
      return NextResponse.json(
        { error: createError.message || 'Failed to create account.' },
        { status: 400 }
      );
    }

    // 6. Sign in with session cookies immediately so user is logged in right away
    const supabaseServer = createClient();
    const { data: sessionData, error: signInError } = await supabaseServer.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return NextResponse.json(
        { error: 'Account created, but failed to establish immediate session. Please sign in.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createdUser.user?.id,
        email,
        username: cleanUsername,
        displayName: displayName || cleanUsername,
      },
      session: sessionData.session,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred during registration.' },
      { status: 500 }
    );
  }
}
