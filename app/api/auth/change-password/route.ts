import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createSupabaseRawClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';

const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Please enter your current password.'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long.'),
  confirmPassword: z.string(),
  signOutOthers: z.boolean().optional(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'New passwords do not match.',
  path: ['confirmPassword'],
});

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json({ error: 'You must be signed in to change your password.' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = ChangePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message || 'Invalid password data.' },
        { status: 400 }
      );
    }

    const { oldPassword, newPassword, signOutOthers } = parsed.data;

    // 1. Verify OLD password using a separate client that does NOT persist session
    const separateClient = createSupabaseRawClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { error: verifyError } = await separateClient.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    });

    if (verifyError) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 400 });
    }

    // 2. Update to new password on active session
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password.' },
        { status: 500 }
      );
    }

    // 3. Handle "Sign out of other devices"
    if (signOutOthers) {
      await supabase.auth.signOut({ scope: 'others' });
    }

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'An error occurred while changing password.' },
      { status: 500 }
    );
  }
}
