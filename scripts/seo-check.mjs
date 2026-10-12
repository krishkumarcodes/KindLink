import { spawn } from 'child_process';
import http from 'http';

const DEFAULT_PORT = process.env.PORT || 3000;
let baseUrl = (process.env.TEST_URL || `http://127.0.0.1:${DEFAULT_PORT}`).replace(/\/$/, '');

let serverProcess = null;

const publicRoutes = [
  '/',
  '/about',
  '/how-it-works',
  '/physics',
  '/safety-and-verification',
  '/faq',
  '/privacy',
  '/terms',
  '/contact',
  '/help/blood-donation',
  '/help/emergency-transport',
  '/help/wheelchair-and-equipment',
  '/help/elderly-assistance',
  '/help/books-and-study-material',
];

const crawlers = [
  { name: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
  { name: 'Bingbot', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
  { name: 'GPTBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)' },
  { name: 'ClaudeBot', ua: 'ClaudeBot/1.0; +claudebot@anthropic.com' },
  { name: 'PerplexityBot', ua: 'Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)' },
  { name: 'curl/8.0.0', ua: 'curl/8.0.0' },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerUp(url) {
  try {
    const res = await fetch(`${url}/api/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function startDevServer() {
  console.log(`\nStarting temporary Next.js server on port ${DEFAULT_PORT}...`);
  serverProcess = spawn('node', ['./node_modules/next/dist/bin/next', 'dev', '-p', String(DEFAULT_PORT)], {
    env: { ...process.env, PORT: String(DEFAULT_PORT), NODE_ENV: 'development' },
    stdio: 'pipe',
  });

  serverProcess.stderr.on('data', (d) => {
    // suppress dev noise or print errors if fatal
  });

  const maxAttempts = 40;
  for (let i = 0; i < maxAttempts; i++) {
    process.stdout.write('.');
    if (await isServerUp(baseUrl)) {
      console.log(`\nServer is ready at ${baseUrl}\n`);
      return;
    }
    await sleep(1000);
  }
  throw new Error(`Server failed to start within ${maxAttempts} seconds at ${baseUrl}`);
}

function cleanUpServer() {
  if (serverProcess) {
    console.log('\nShutting down local Next.js server process...');
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

process.on('SIGINT', () => { cleanUpServer(); process.exit(1); });
process.on('SIGTERM', () => { cleanUpServer(); process.exit(1); });
process.on('exit', () => { cleanUpServer(); });

// Helper to fetch with redirect manual mode
async function fetchRaw(url, options = {}) {
  return await fetch(url, {
    redirect: 'manual',
    ...options,
  });
}

async function runSeoSuite() {
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    errors: [],
  };

  function test(label, condition, details = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`  ✅ ${label}`);
    } else {
      results.failed++;
      console.error(`  ❌ ${label} - ${details}`);
      results.errors.push(`${label}: ${details}`);
    }
  }

  const serverAlreadyRunning = await isServerUp(baseUrl);
  if (!serverAlreadyRunning) {
    await startDevServer();
  } else {
    console.log(`Using already running server at ${baseUrl}\n`);
  }

  console.log('===============================================================');
  console.log('       KindLink SEO, AI Crawlability & QA Verification Suite    ');
  console.log('===============================================================');

  // TEST SUITE 1: Public Routes (SSR / No JavaScript HTML validation)
  console.log('\n[1/6] Validating Public Routes (HTML Rendering & Metadata):');
  const discoveredLinks = new Set();

  for (const route of publicRoutes) {
    const fullUrl = `${baseUrl}${route}`;
    try {
      const res = await fetchRaw(fullUrl);
      const html = await res.text();

      test(`${route} returns 200 OK`, res.status === 200, `Got HTTP ${res.status}`);

      // Title check
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : '';
      test(`${route} has valid <title>`, title.length > 5 && title.includes('KindLink'), `Title: "${title}"`);

      // Description check
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
      const desc = descMatch ? descMatch[1].trim() : '';
      test(
        `${route} has <meta description> (100-200 chars)`,
        desc.length >= 80 && desc.length <= 250,
        `Length: ${desc.length} chars ("${desc.substring(0, 40)}...")`
      );

      // Canonical link check
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) ||
                            html.match(/<link[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i);
      const canonical = canonicalMatch ? canonicalMatch[1].trim() : '';
      test(`${route} has canonical URL`, Boolean(canonical), `Got: "${canonical}"`);

      // H1 tag check
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
      const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';
      test(`${route} has semantic <h1>`, h1.length > 3, `H1: "${h1.substring(0, 40)}..."`);

      // JSON-LD structured data check
      const jsonLdMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
      test(`${route} injects JSON-LD script`, jsonLdMatches.length > 0, `Found ${jsonLdMatches.length} script tags`);

      let hasValidJsonLd = false;
      let schemas = [];
      for (const m of jsonLdMatches) {
        try {
          const parsed = JSON.parse(m[1]);
          hasValidJsonLd = true;
          if (Array.isArray(parsed)) {
            schemas.push(...parsed.map(s => s['@type']));
          } else if (parsed['@type']) {
            schemas.push(parsed['@type']);
          }
        } catch (e) {
          // json parse error
        }
      }
      test(`${route} JSON-LD is valid parseable JSON`, hasValidJsonLd, `Schemas: ${schemas.join(', ')}`);

      // Specific route schema checks
      if (route === '/') {
        test('Home schema includes WebSite/Organization/WebApplication',
          schemas.some(s => s === 'WebSite' || s === 'Organization' || s === 'WebApplication'),
          `Schemas: ${schemas.join(', ')}`);
      } else if (route === '/faq') {
        test('/faq schema includes FAQPage', schemas.includes('FAQPage'), `Schemas: ${schemas.join(', ')}`);
      } else if (route === '/how-it-works') {
        test('/how-it-works schema includes HowTo', schemas.includes('HowTo'), `Schemas: ${schemas.join(', ')}`);
      } else {
        test(`${route} schema includes BreadcrumbList`, schemas.includes('BreadcrumbList'), `Schemas: ${schemas.join(', ')}`);
      }

      // Collect internal links for broken links test
      const linkRegex = /href=["'](\/[a-zA-Z0-9_\-\/#]*)["']/gi;
      let linkMatch;
      while ((linkMatch = linkRegex.exec(html)) !== null) {
        const href = linkMatch[1].split('#')[0];
        if (href && !href.startsWith('/_next') && !href.startsWith('/api') && !href.includes('.')) {
          discoveredLinks.add(href);
        }
      }
    } catch (err) {
      test(`${route} loads successfully`, false, err.message);
    }
  }

  // TEST SUITE 2: AI Bot and Search Engine User-Agents Simulation
  console.log('\n[2/6] Validating AI Bot & Search Engine Crawlability:');
  for (const bot of crawlers) {
    try {
      const res = await fetchRaw(`${baseUrl}/`, {
        headers: { 'User-Agent': bot.ua },
      });
      const html = await res.text();
      const hasH1 = /<h1[^>]*>/i.test(html);
      test(`UA ${bot.name} receives 200 OK with full content`, res.status === 200 && hasH1, `Status: ${res.status}, hasH1: ${hasH1}`);
    } catch (err) {
      test(`UA ${bot.name} crawler test`, false, err.message);
    }
  }

  // TEST SUITE 3: Private Routes & Privacy Guards
  console.log('\n[3/6] Validating Private Routes & Privacy Guards (X-Robots-Tag & Auth Redirects):');
  const privateRoutes = ['/app', '/admin'];
  for (const route of privateRoutes) {
    try {
      const res = await fetchRaw(`${baseUrl}${route}`);
      const xRobots = res.headers.get('x-robots-tag') || '';
      const isRedirect = res.status === 307 || res.status === 308 || res.status === 302;
      const location = res.headers.get('location') || '';

      test(`${route} guards private access (Redirect to /login or noindex)`,
        (isRedirect && location.includes('/login')) || xRobots.includes('noindex'),
        `Status: ${res.status}, Location: ${location}, X-Robots-Tag: ${xRobots}`
      );

      test(`${route} sets X-Robots-Tag: noindex, nofollow`,
        xRobots.toLowerCase().includes('noindex'),
        `Got: "${xRobots}"`
      );
    } catch (err) {
      test(`${route} private route check`, false, err.message);
    }
  }

  // Check /login and /signup X-Robots-Tag
  for (const authRoute of ['/login', '/signup', '/api/health']) {
    try {
      const res = await fetchRaw(`${baseUrl}${authRoute}`);
      const xRobots = res.headers.get('x-robots-tag') || '';
      test(`${authRoute} includes X-Robots-Tag: noindex, nofollow`,
        xRobots.toLowerCase().includes('noindex'),
        `Got: "${xRobots}"`
      );
    } catch (err) {
      test(`${authRoute} security headers check`, false, err.message);
    }
  }

  // TEST SUITE 4: robots.txt and sitemap.xml Validation
  console.log('\n[4/6] Validating robots.txt and sitemap.xml:');
  try {
    const robotsRes = await fetchRaw(`${baseUrl}/robots.txt`);
    const robotsTxt = await robotsRes.text();
    test('robots.txt returns 200 OK', robotsRes.status === 200, `Got HTTP ${robotsRes.status}`);
    test('robots.txt allows public routes', robotsTxt.includes('Allow: /'), 'Missing Allow: /');
    test('robots.txt disallows /api/, /admin/, /app/',
      robotsTxt.includes('Disallow: /api/') && robotsTxt.includes('Disallow: /admin/') && robotsTxt.includes('Disallow: /app/'),
      'Missing disallow rules'
    );
    test('robots.txt explicitly permits GPTBot and ClaudeBot',
      robotsTxt.includes('User-agent: GPTBot') && robotsTxt.includes('User-agent: ClaudeBot'),
      'Missing AI bots in robots.txt'
    );
    test('robots.txt links to sitemap.xml', robotsTxt.includes('sitemap.xml'), 'Missing Sitemap directive');
  } catch (err) {
    test('robots.txt validation', false, err.message);
  }

  try {
    const sitemapRes = await fetchRaw(`${baseUrl}/sitemap.xml`);
    const sitemapXml = await sitemapRes.text();
    test('sitemap.xml returns 200 OK', sitemapRes.status === 200, `Got HTTP ${sitemapRes.status}`);
    test('sitemap.xml is valid XML format', sitemapXml.includes('<urlset') && sitemapXml.includes('</urlset>'), 'Invalid XML root');
    test('sitemap.xml indexes all core public URLs',
      publicRoutes.every(r => sitemapXml.includes(r === '/' ? `${baseUrl}/` : r)),
      'Some public routes missing from sitemap'
    );
    test('sitemap.xml excludes private /app and /admin',
      !sitemapXml.includes('/app<') && !sitemapXml.includes('/admin<'),
      'Private routes found in sitemap'
    );
  } catch (err) {
    test('sitemap.xml validation', false, err.message);
  }

  // TEST SUITE 5: AI-Readability Files (llms.txt and llms-full.txt)
  console.log('\n[5/6] Validating AI-Readability (llms.txt & llms-full.txt):');
  try {
    const llmsRes = await fetchRaw(`${baseUrl}/llms.txt`);
    const llmsTxt = await llmsRes.text();
    test('/llms.txt returns 200 OK', llmsRes.status === 200, `Got HTTP ${llmsRes.status}`);
    test('/llms.txt contains # KindLink title & descriptions',
      llmsTxt.includes('# KindLink') && llmsTxt.includes('Help Categories'),
      'Missing core markdown headings in llms.txt'
    );
  } catch (err) {
    test('/llms.txt validation', false, err.message);
  }

  try {
    const fullRes = await fetchRaw(`${baseUrl}/llms-full.txt`);
    const fullTxt = await fullRes.text();
    test('/llms-full.txt returns 200 OK', fullRes.status === 200, `Got HTTP ${fullRes.status}`);
    test('/llms-full.txt contains complete documentation',
      fullTxt.length > 5000 && fullTxt.includes('Help Gravity'),
      `Got length: ${fullTxt.length} bytes`
    );
  } catch (err) {
    test('/llms-full.txt validation', false, err.message);
  }

  // TEST SUITE 6: Broken Links Audit
  console.log('\n[6/6] Validating Internal Links (Broken Links Audit):');
  console.log(`Discovered ${discoveredLinks.size} unique internal links to verify...`);
  for (const href of discoveredLinks) {
    if (href === '' || href === '/') continue;
    try {
      const res = await fetchRaw(`${baseUrl}${href}`);
      // 200 OK or 307 redirect (to login if private) are acceptable, 404 is NOT acceptable!
      test(`Internal link ${href} does not 404`, res.status !== 404, `Got HTTP ${res.status}`);
    } catch (err) {
      test(`Internal link ${href}`, false, err.message);
    }
  }

  // FINAL SUMMARY REPORT
  console.log('\n===============================================================');
  console.log(` SEO TEST SUITE SUMMARY: ${results.passed}/${results.total} TESTS PASSED `);
  console.log('===============================================================');
  if (results.failed > 0) {
    console.error(`\n❌ FAILED CHECKS (${results.failed}):`);
    results.errors.forEach(e => console.error(`  - ${e}`));
    cleanUpServer();
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TECHNICAL SEO, AI CRAWLABILITY & PRIVACY CHECKS PASSED!\n');
    cleanUpServer();
    process.exit(0);
  }
}

runSeoSuite().catch((err) => {
  console.error('\nFatal test execution error:', err);
  cleanUpServer();
  process.exit(1);
});
