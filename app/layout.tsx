import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

import { SITE_URL } from '@/lib/seo';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KindLink - Help is just next door | Local Mutual Aid & Crisis Response',
    template: '%s | KindLink',
  },
  description:
    'Verified community mutual aid & emergency response network for urgent local tasks in Asansol and neighboring areas. Connect with trusted neighbours for blood donation, medical help, and urgent local support.',
  applicationName: 'KindLink',
  authors: [{ name: 'KindLink Community Network' }],
  generator: 'Next.js',
  keywords: [
    'KindLink',
    'Asansol mutual aid',
    'blood donation Asansol',
    'emergency help',
    'community aid',
    'local volunteer',
    'Local Dispatch',
    'West Bengal aid network',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'KindLink',
    title: 'KindLink - Help is just next door | Local Mutual Aid & Crisis Response',
    description:
      'Verified community mutual aid & emergency response network for urgent local tasks in Asansol and neighboring areas. Connect with trusted neighbours for blood donation, medical help, and urgent local support.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        type: 'image/png',
        alt: 'KindLink - Hyperlocal Mutual Aid & Crisis Network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KindLink - Help is just next door | Local Mutual Aid & Crisis Response',
    description:
      'Verified community mutual aid & emergency response network for urgent local tasks in Asansol and neighboring areas. Connect with trusted neighbours for blood donation, medical help, and urgent local support.',
    images: [`${SITE_URL}/og-image.png`],
  },
  verification: {
    ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : {}),
    ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? {
          other: {
            'msvalidate.01': process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
          },
        }
      : {}),
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'KindLink',
  },
};

export const viewport: Viewport = {
  themeColor: '#0D9488',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, isRTL, isValidLocale } from '@/lib/i18n';
import { AutoLanguageNotice } from '@/components/locale/AutoLanguageNotice';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const rawLocale =
    cookieStore.get(LOCALE_COOKIE_NAME)?.value ||
    cookieStore.get('kindlink_selected_lang')?.value;
  const initialLocale = rawLocale && isValidLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const dir = isRTL(initialLocale) ? 'rtl' : 'ltr';

  // Source document is in English, so lang="en" must remain fixed on <html> for Google Translate.
  // Dynamic text direction (RTL for Urdu/Arabic) and rtl-layout class are applied dynamically.
  return (
    <html
      lang="en"
      dir={dir}
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} font-sans ${dir === 'rtl' ? 'rtl-layout' : ''}`}
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="preconnect" href="https://tiles.openfreemap.org" crossOrigin="" />
        <link rel="dns-prefetch" href="https://tiles.openfreemap.org" />
        <link
          rel="alternate"
          type="text/markdown"
          href="/llms.txt"
          title="LLMs Readability Summary"
        />
        <link
          rel="alternate"
          type="text/markdown"
          href="/llms-full.txt"
          title="LLMs Full Knowledge Base"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased selection:bg-primary/20">
        <Providers initialLocale={initialLocale}>
          {children}
          <AutoLanguageNotice />
        </Providers>

        {/* Hidden Google Translate Mount Element (visually hidden, not display:none) */}
        <div
          id="google_translate_element"
          className="fixed bottom-0 left-0 opacity-0 pointer-events-none w-0 h-0 overflow-hidden -z-50"
          aria-hidden="true"
          tabIndex={-1}
        />
      </body>
    </html>
  );
}
