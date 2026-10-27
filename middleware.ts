import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';
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

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const path = request.nextUrl.pathname;

  // Set HTTP header X-Robots-Tag: noindex, nofollow on /app, /admin, /api/*, /login, /signup
  const isPrivateOrRestricted =
    path.startsWith('/app') ||
    path.startsWith('/admin') ||
    path.startsWith('/api') ||
    path === '/login' ||
    path === '/signup';

  if (isPrivateOrRestricted) {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  // Ensure private user API endpoints are never cached by browsers or CDNs
  const isPrivateApi =
    path.startsWith('/api/auth') ||
    path.startsWith('/api/admin') ||
    path.startsWith('/api/profile') ||
    path.startsWith('/api/saved-places') ||
    path.startsWith('/api/badges/pin') ||
    path.startsWith('/api/reports') ||
    path.startsWith('/api/verification') ||
    path.startsWith('/api/professional-proofs') ||
    path.startsWith('/api/deletion-requests') ||
    path.startsWith('/api/sos');

  if (isPrivateApi) {
    response.headers.set('Cache-Control', 'private, no-cache, no-store, max-age=0, must-revalidate');
  }

  // Allow static files, manifests, icons, and API routes
  if (
    path.startsWith('/_next') ||
    path.startsWith('/api') ||
    path === '/favicon.ico' ||
    path === '/manifest.json' ||
    path.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json)$/)
  ) {
    return response;
  }

  // Locale Detection on First HTML Request
  // 1. Bots always get English ('en'), no cookie, zero external lookups.
  // 2. Only run when no kindlink_lang cookie exists.
  let newLocaleCookies: { name: string; value: string; options: CookieOptions }[] | null = null;
  const userAgent = request.headers.get('user-agent');
  const hasLangCookie = request.cookies.has(KINDLINK_LANG_COOKIE);

  if (!hasLangCookie && !isBot(userAgent)) {
    const clientIp = getClientIp(request);
    const testHeaderCountry = request.headers.get('x-test-country');
    const geo = await lookupCountryByIp(clientIp, testHeaderCountry);
    const lang = getLanguageForCountry(geo.countryCode);

    const cookieOptions: CookieOptions = {
      maxAge: COOKIE_MAX_AGE_SECONDS,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // client needs to read it
    };

    newLocaleCookies = [
      { name: KINDLINK_LANG_COOKIE, value: lang, options: cookieOptions },
      { name: KINDLINK_LANG_SOURCE_COOKIE, value: 'auto', options: cookieOptions },
      { name: KINDLINK_LOCALE_COOKIE, value: lang, options: cookieOptions },
    ];

    // Seed request cookies so downstream SSR components have access immediately
    request.cookies.set(KINDLINK_LANG_COOKIE, lang);
    request.cookies.set(KINDLINK_LANG_SOURCE_COOKIE, 'auto');
    request.cookies.set(KINDLINK_LOCALE_COOKIE, lang);
  }

  const applyLocaleCookies = (res: NextResponse) => {
    if (newLocaleCookies) {
      for (const cookie of newLocaleCookies) {
        res.cookies.set(cookie.name, cookie.value, cookie.options);
      }
    }
  };

  // Public allowed guest pages and AI crawlers
  const isGuestAllowed =
    path === '/' ||
    path === '/about' ||
    path === '/how-it-works' ||
    path === '/safety-and-verification' ||
    path === '/faq' ||
    path === '/privacy' ||
    path === '/terms' ||
    path === '/contact' ||
    path === '/welcome' ||
    path === '/llms.txt' ||
    path === '/llms-full.txt' ||
    path === '/robots.txt' ||
    path === '/sitemap.xml' ||
    path.startsWith('/sos') ||
    path.startsWith('/help');

  // Support offline mock mode bypass (still setting X-Robots-Tag above)
  if (process.env.DATA_SOURCE === 'mock' || process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock') {
    applyLocaleCookies(response);
    return response;
  }

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        if (isPrivateOrRestricted) {
          response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        response.cookies.set({ name, value, ...options });
        applyLocaleCookies(response);
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        if (isPrivateOrRestricted) {
          response.headers.set('X-Robots-Tag', 'noindex, nofollow');
        }
        response.cookies.set({ name, value: '', ...options });
        applyLocaleCookies(response);
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Protect /app, /admin, and private routes: redirect unauthenticated requests to /login?redirect=...
  if (!user && !isGuestAllowed && path !== '/login' && path !== '/signup') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.searchParams.set('redirect', path);
    const redirectResponse = NextResponse.redirect(redirectUrl);
    redirectResponse.headers.set('X-Robots-Tag', 'noindex, nofollow');
    applyLocaleCookies(redirectResponse);
    return redirectResponse;
  }

  // If user is already authenticated and visits /login or /signup, redirect to /app
  if (user && (path === '/login' || path === '/signup')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/app';
    const redirectResponse = NextResponse.redirect(redirectUrl);
    applyLocaleCookies(redirectResponse);
    return redirectResponse;
  }

  applyLocaleCookies(response);
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
