import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import Script from 'next/script';
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
    default: 'KindLink - Help is just next door',
    template: '%s | KindLink',
  },
  description:
    'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Driven by urgency, distance, and community trust.',
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
    title: 'KindLink - Help is just next door',
    description:
      'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Driven by urgency, distance, and community trust.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'KindLink - Local Mutual Aid & Community Support',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KindLink - Help is just next door',
    description:
      'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Driven by urgency, distance, and community trust.',
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

        {/* Google Translate Integration Script */}
        <Script
          id="google-translate-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.googleTranslateElementInit = function() {
                if (window.__googleTranslateInitialized) return;
                function init() {
                  var el = document.getElementById('google_translate_element');
                  if (!el) {
                    setTimeout(init, 50);
                    return;
                  }
                  try {
                    if (window.google && window.google.translate && window.google.translate.TranslateElement) {
                      new window.google.translate.TranslateElement({
                        pageLanguage: 'en',
                        includedLanguages: 'en,hi,bn,bho,mai,ne,ur,sat,or,as,mr,gu,pa,ta,te,kn,ml,fr,es,de,pt,it,ru,zh-CN,ja,ko,ar,id,tr',
                        autoDisplay: false,
                        layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
                      }, 'google_translate_element');
                      window.__googleTranslateInitialized = true;
                    }
                  } catch (e) {
                    console.error('[Google Translate Init Error]', e);
                  }
                }
                init();
              };
            `,
          }}
        />
        <Script
          id="google-translate-script"
          src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
