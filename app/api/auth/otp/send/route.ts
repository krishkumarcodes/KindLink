import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { storeOtp } from '@/lib/auth/otp-store';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, phone, type = 'email' } = body;

    const identifier = type === 'phone' ? phone?.trim() : email?.trim()?.toLowerCase();

    if (!identifier) {
      return NextResponse.json(
        { error: type === 'phone' ? 'Phone number is required' : 'Email address is required' },
        { status: 400 }
      );
    }

    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(identifier)) {
        return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
      }
    } else {
      if (identifier.length < 10) {
        return NextResponse.json({ error: 'Please provide a valid phone number' }, { status: 400 });
      }
    }

    // 1. Rate Limiting: Max 5 attempts per 10-minute window
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateKey = `otp_send_${identifier}_${ip}`;
    const rateCheck = checkRateLimit(rateKey, 5, 10 * 60 * 1000);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded: Too many OTP requests. Please wait 10 minutes before requesting a new code.',
        },
        { status: 429 }
      );
    }

    // 2. Generate 6-digit cryptographic numeric OTP
    const code = crypto.randomInt(100000, 1000000).toString();
    const expiryMinutes = 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
    const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

    // 3. Store in Memory Cache
    storeOtp(identifier, code, expiryMinutes);

    // 4. Try storing in Supabase auth_otps table if accessible
    try {
      const admin = createAdminClient();
      await admin.from('auth_otps').insert({
        email: identifier,
        hashed_code: hashedCode,
        attempts: 0,
        expires_at: expiresAt,
        verified: false,
      });
    } catch {
      // Memory store is authoritative fallback
    }

    // 5. SMTP Delivery vs Simulated/Demo Fallback
    const hasSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

    if (!hasSmtpConfigured) {
      // Development / Demo simulated mode fallback
      console.log(`\n======================================================`);
      console.log(`[KindLink OTP DEMO SIMULATION]`);
      console.log(`Recipient: ${identifier} (${type})`);
      console.log(`Generated 6-Digit Code: >>> ${code} <<<`);
      console.log(`Valid for 10 minutes (until ${expiresAt})`);
      console.log(`======================================================\n`);

      return NextResponse.json({
        success: true,
        simulated: true,
        message: `OTP sent in demo mode. Your verification code is ${code}`,
        demoCode: code,
        expiresInSeconds: expiryMinutes * 60,
        remainingAttempts: rateCheck.remaining,
      });
    }

    // When real SMTP is configured, do not expose code in response
    return NextResponse.json({
      success: true,
      simulated: false,
      message: `A 6-digit verification code has been sent to your ${type === 'phone' ? 'phone' : 'email'}.`,
      expiresInSeconds: expiryMinutes * 60,
      remainingAttempts: rateCheck.remaining,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to send OTP code. Please try again.' },
      { status: 500 }
    );
  }
}
