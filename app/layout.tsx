import type { Metadata, Viewport } from 'next';
import {
  Inter,
  Plus_Jakarta_Sans,
  Noto_Sans_Devanagari,
  Noto_Sans_Bengali,
  Noto_Nastaliq_Urdu,
} from 'next/font/google';
import Script from 'next/script';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-heading',
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-devanagari',
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '600', '700'],
  display: 'swap',
  variable: '--font-bengali',
});

const notoUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
  variable: '--font-urdu',
});

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${plusJakartaSans.variable} ${notoDevanagari.variable} ${notoBengali.variable} ${notoUrdu.variable}`}
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
        <Providers>
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
