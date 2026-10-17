import React from 'react';
import { SITE_URL } from '@/lib/seo';

export function JsonLd({
  data,
  id,
}: {
  data: Record<string, any> | Array<Record<string, any>>;
  id?: string;
}) {
  return (
    <script
      id={id || 'json-ld-structured-data'}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export function buildOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'KindLink',
    url: SITE_URL,
    logo: `${SITE_URL}/logo.svg`,
    image: `${SITE_URL}/og-image.png`,
    description:
      'Verified community mutual aid platform for urgent tasks in Asansol and neighboring areas. Driven by urgency, distance, and community trust.',
    sameAs: [
      'https://github.com/krishkumarcodes/KindLink',
      'https://twitter.com/KindLinkHQ',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'Community Emergency Aid Support',
        email: 'help@kindlink.org',
        areaServed: 'IN',
        availableLanguage: ['English', 'Hindi', 'Bengali'],
      },
    ],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Asansol',
      addressRegion: 'West Bengal',
      addressCountry: 'IN',
    },
  };
}

export function buildWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'KindLink',
    alternateName: ['Kind Link', 'KindLink Community Aid'],
    url: SITE_URL,
    description:
      'Verified community mutual aid network for Asansol. Connect urgent help requests with nearby verified volunteers.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/help?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildWebApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'KindLink Mutual Aid App',
    url: `${SITE_URL}/app`,
    applicationCategory: 'SocialNetworkingApplication',
    operatingSystem: 'All modern browsers (PWA supported)',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    featureList: [
      'Three-key community urgency ranking algorithm',
      'Verified volunteer badge security',
      'SOS emergency alerts',
      'Local radius filtering within 1-15 km',
      'Multi-language interface (29 Indian and International languages)',
    ],
    description:
      'Progressive web application enabling instantaneous, verified community mutual aid across Asansol and neighboring districts.',
  };
}

export function buildBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.path.startsWith('http')
        ? item.path
        : `${SITE_URL}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
    })),
  };
}

export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

export function buildHowToSchema({
  name,
  description,
  steps,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string; image?: string; url?: string }[];
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    totalTime: 'PT5M',
    step: steps.map((step, idx) => ({
      '@type': 'HowToStep',
      position: idx + 1,
      name: step.name,
      text: step.text,
      ...(step.url && {
        url: step.url.startsWith('http') ? step.url : `${SITE_URL}${step.url}`,
      }),
      ...(step.image && {
        image: step.image.startsWith('http')
          ? step.image
          : `${SITE_URL}${step.image}`,
      }),
    })),
  };
}
