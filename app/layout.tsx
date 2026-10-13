import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

import { SITE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KindLink - Help is just next door',
    template: '%s | KindLink',
  },
  description:
    'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Ranked by physics, driven by trust.',
  applicationName: 'KindLink',
  authors: [{ name: 'KindLink Community Network' }],
  generator: 'Next.js',
  keywords: [
    'KindLink',
    'Asansol mutual aid',
    'blood donation Asansol',
    'emergency help',
    'community aid',
    'hyperlocal volunteer',
    'Help Gravity',
    'West Bengal aid network',
  ],
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: SITE_URL,
    siteName: 'KindLink',
    title: 'KindLink - Help is just next door',
    description:
      'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Ranked by physics, driven by trust.',
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'KindLink - Hyperlocal Mutual Aid & Community Support',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KindLink - Help is just next door',
    description:
      'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Ranked by physics, driven by trust.',
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

  return (
    <html
      lang={initialLocale}
      dir={dir}
      suppressHydrationWarning
      className={`font-sans ${dir === 'rtl' ? 'rtl-layout' : ''}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&family=Noto+Sans+Devanagari:wght@400;500;700&family=Noto+Sans+Bengali:wght@400;500;700&family=Noto+Nastaliq+Urdu:wght@400;700&display=swap"
          rel="stylesheet"
        />
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
        </Providers>

        {/* Hidden Google Translate Mount Element */}
        <div id="google_translate_element" className="hidden" aria-hidden="true" />

        {/* Google Translate Integration Script */}
        <Script
          id="google-translate-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              function googleTranslateElementInit() {
                if (window.google && window.google.translate) {
                  new window.google.translate.TranslateElement({
                    pageLanguage: 'en',
                    includedLanguages: 'en,hi,bn,bho,mai,ne,ur',
                    autoDisplay: false,
                    layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE
                  }, 'google_translate_element');
                }
              }
            `,
          }}
        />
        <Script
          src="//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
