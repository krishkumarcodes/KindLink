import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase/client';

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

  // Public allowed guest pages and AI crawlers
  const isGuestAllowed =
    path === '/' ||
    path === '/about' ||
    path === '/how-it-works' ||
    path === '/physics' ||
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
    path.startsWith('/help');

  // Support offline mock mode bypass (still setting X-Robots-Tag above)
  if (process.env.DATA_SOURCE === 'mock' || process.env.NEXT_PUBLIC_DATA_SOURCE === 'mock') {
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
    return redirectResponse;
  }

  // If user is already authenticated and visits /login or /signup, redirect to /app
  if (user && (path === '/login' || path === '/signup')) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/app';
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
