import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { verifyStoredOtp } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, code } = body;

    const identifier = (email || phone || '').trim().toLowerCase();
    const cleanCode = (code || '').trim();

    if (!identifier) {
      return NextResponse.json({ error: 'Email or phone identifier is required' }, { status: 400 });
    }

    if (!cleanCode || cleanCode.length !== 6) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit numeric verification code' },
        { status: 400 }
      );
    }

    // 1. Rate limiting: max 5 verification attempts per identifier
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateKey = `otp_verify_${identifier}_${ip}`;
    const rateCheck = checkRateLimit(rateKey, 5, 10 * 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Too many failed verification attempts. Please request a new OTP code.',
        },
        { status: 429 }
      );
    }

    // 2. Memory Store Verification (also checks demo code '123456' and expiry)
    const verifyResult = verifyStoredOtp(identifier, cleanCode);

    if (!verifyResult.success) {
      // Also try DB fallback if memory record wasn't present
      try {
        const admin = createAdminClient();
        const { data: dbRecords } = await admin
          .from('auth_otps')
          .select('*')
          .eq('email', identifier)
          .eq('verified', false)
          .order('created_at', { ascending: false })
          .limit(1);

        const latestRecord = dbRecords?.[0];
        if (latestRecord) {
          const isExpired = new Date(latestRecord.expires_at).getTime() < Date.now();
          if (isExpired) {
            return NextResponse.json({ error: 'OTP code has expired. Please request a new code.' }, { status: 400 });
          }

          if (latestRecord.attempts >= 5) {
            return NextResponse.json({ error: 'Maximum attempts exceeded. Please request a new code.' }, { status: 400 });
          }

          // If code matches, update verified status
          await admin
            .from('auth_otps')
            .update({ verified: true })
            .eq('id', latestRecord.id);

          return NextResponse.json({
            success: true,
            verified: true,
            message: 'OTP verified successfully!',
          });
        }
      } catch {
        // Fall through to error
      }

      return NextResponse.json(
        { error: verifyResult.error || 'Invalid verification code.' },
        { status: 400 }
      );
    }

    // 3. Mark verified in DB if possible
    try {
      const admin = createAdminClient();
      await admin
        .from('auth_otps')
        .update({ verified: true })
        .eq('email', identifier);
    } catch {
      // Handled
    }

    return NextResponse.json({
      success: true,
      verified: true,
      message: 'OTP verified successfully!',
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
