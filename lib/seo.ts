import type { Metadata } from 'next';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kindlink-gd8e.onrender.com'
).replace(/\/$/, '');

export const SITE_NAME = 'KindLink';
export const SITE_TAGLINE = 'Help is just next door';
export const SITE_TITLE = 'KindLink - Help is just next door';
export const SITE_DESCRIPTION =
  'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Ranked by physics, driven by trust.';

export interface MetadataOptions {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
}

export function constructMetadata({
  title,
  description = SITE_DESCRIPTION,
  path = '',
  image = '/og-image.png',
  noIndex = false,
}: MetadataOptions = {}): Metadata {
  const fullUrl = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const fullImageUrl = image.startsWith('http')
    ? image
    : `${SITE_URL}${image.startsWith('/') ? image : `/${image}`}`;

  return {
    title: title ? `${title} | ${SITE_NAME}` : SITE_TITLE,
    description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical: fullUrl,
    },
    openGraph: {
      title: title ? `${title} | ${SITE_NAME}` : SITE_TITLE,
      description,
      url: fullUrl,
      siteName: SITE_NAME,
      locale: 'en_IN',
      type: 'website',
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: title ? `${title} | ${SITE_NAME}` : SITE_TITLE,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: title ? `${title} | ${SITE_NAME}` : SITE_TITLE,
      description,
      images: [fullImageUrl],
    },
    ...(noIndex && {
      robots: {
        index: false,
        follow: false,
      },
    }),
  };
}
