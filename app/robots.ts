import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  const aiBots = [
    'Googlebot',
    'Bingbot',
    'GPTBot',
    'OAI-SearchBot',
    'ChatGPT-User',
    'ClaudeBot',
    'Claude-User',
    'PerplexityBot',
    'Google-Extended',
    'Applebot',
    'CCBot',
  ];

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/app/', '/u/'],
      },
      {
        userAgent: aiBots,
        allow: '/',
        disallow: ['/api/', '/admin/', '/app/', '/u/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
