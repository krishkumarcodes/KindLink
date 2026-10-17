/**
 * KindLink Bot & Crawler Detection and Route Filtering
 *
 * Requirements:
 * 1. Skip detection for all bots: Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, Applebot, Twitterbot, etc.
 * 2. Bots always get English ('en'), no cookie, and zero external lookups.
 * 3. Skip static assets (/_next, /images, /icons, /favicon, etc.) and API routes (/api/*).
 */

const KNOWN_BOT_PATTERNS = [
  'googlebot',
  'bingbot',
  'slurp',
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'sogou',
  'exabot',
  'facebot',
  'facebookexternalhit',
  'gptbot',
  'chatgpt-user',
  'claudebot',
  'claude-web',
  'anthropic-ai',
  'perplexitybot',
  'applebot',
  'twitterbot',
  'linkedinbot',
  'pinterest',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'skypeuripreview',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'bytespider',
  'ccbot',
  'cohere-ai',
  'amazonbot',
  'diffbot',
  'omgilibot',
  'facebookbot',
  'google-extended',
  'ahrefsbot',
  'semrushbot',
  'dotbot',
  'mj12bot',
  'petalbot',
  'bot',
  'crawler',
  'spider',
];

const BOT_REGEX = new RegExp(KNOWN_BOT_PATTERNS.join('|'), 'i');

/**
 * Checks whether the given User-Agent string belongs to a search engine bot,
 * AI crawler, social preview generator, or automated scraper.
 */
export function isBot(userAgent: string | null | undefined): boolean {
  if (!userAgent || typeof userAgent !== 'string') {
    return false;
  }
  return BOT_REGEX.test(userAgent.trim());
}

/**
 * Determines whether locale detection should be skipped based on path or bot status.
 *
 * Skips:
 * 1. Static assets: /_next, /images, /icons, /favicon, etc.
 * 2. Static file extensions (.svg, .png, .jpg, .ico, .txt, .xml, .json, etc.)
 * 3. API routes (/api/*) when checked in middleware
 * 4. Bot user agents
 */
export function isStaticOrAssetPath(pathname: string): boolean {
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/fonts') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/icon.svg' ||
    pathname === '/manifest.json' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/llms.txt' ||
    pathname === '/llms-full.txt' ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|txt|xml|json|css|js|woff|woff2|ttf|otf|map)$/i)
  ) {
    return true;
  }
  return false;
}

/**
 * Complete check for middleware: should we bypass locale detection?
 */
export function shouldSkipLocaleDetection(
  pathname: string,
  userAgent?: string | null
): boolean {
  if (isStaticOrAssetPath(pathname)) return true;
  if (pathname.startsWith('/api')) return true;
  if (isBot(userAgent)) return true;
  return false;
}
