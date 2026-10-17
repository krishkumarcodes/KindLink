/**
 * KindLink Client Fallback Locale Detection Endpoint
 * GET /api/locale/detect
 *
 * Requirements:
 * 1. Returns { language: 'fr', country: 'FR', source: 'auto' }.
 * 2. Skip for bots (returns English 'en', no cookie, no external lookup).
 * 3. Set Cache-Control: no-store, max-age=0.
 * 4. Fast server response (< 50ms if cached, < 600ms worst case).
 * 5. Sets kindlink_lang and kindlink_lang_source cookies for client persistence.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getClientIp,
  isBot,
  lookupCountryByIp,
  getLanguageForCountry,
  KINDLINK_LANG_COOKIE,
  KINDLINK_LANG_SOURCE_COOKIE,
  KINDLINK_LOCALE_COOKIE,
  COOKIE_MAX_AGE_SECONDS,
} from '@/lib/locale';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');

  // Skip detection for all bots: bots always get English ('en') with no cookies
  if (isBot(userAgent)) {
    return NextResponse.json(
      {
        language: 'en',
        country: 'IN',
        source: 'auto',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  }

  // Extract client IP and test headers
  const clientIp = getClientIp(request);
  const testCountryHeader = request.headers.get('x-test-country');

  // Lookup country
  const geoResult = await lookupCountryByIp(clientIp, testCountryHeader);
  const language = getLanguageForCountry(geoResult.countryCode);

  const response = NextResponse.json(
    {
      language,
      country: geoResult.countryCode,
      source: 'auto',
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );

  // Set cookies for client persistence
  const cookieOptions = {
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax' as const,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: false, // Client-side scripts must be able to read this
  };

  response.cookies.set(KINDLINK_LANG_COOKIE, language, cookieOptions);
  response.cookies.set(KINDLINK_LANG_SOURCE_COOKIE, 'auto', cookieOptions);
  response.cookies.set(KINDLINK_LOCALE_COOKIE, language, cookieOptions);

  return response;
}
