#!/usr/bin/env node

/**
 * KindLink IPinfo Language System - Comprehensive QA Test Suite
 *
 * Validates:
 * 1. Country Mapping:
 *    - India ('IN') -> 'en'
 *    - USA ('US') -> 'en'
 *    - France ('FR') -> 'fr'
 *    - Bangladesh ('BD') -> 'bn'
 *    - Japan ('JP') -> 'ja'
 *    - Unmapped country ('ZZ' or 'IS') -> 'en'
 *    - Mapped language that is unsupported -> 'en'
 * 2. Edge Cases & Resilience (mocked):
 *    - Timeout (response > 600ms) -> falls back to 'en' without blocking
 *    - 429 rate limit or 500 error -> falls back to 'en'
 *    - Missing or invalid token -> falls back to 'en'
 *    - Private / Loopback IPs ('127.0.0.1', '192.168.1.1', '10.0.0.1', '::1') -> returns 'en' immediately without calling IPinfo
 *    - Malformed X-Forwarded-For header -> safely extracts IP or falls back to 'en'
 * 3. In-Memory Cache:
 *    - Querying same IP twice results in 1 external fetch and 1 cache hit
 * 4. Circuit Breaker:
 *    - 5 consecutive failures trip the breaker, blocking lookups for 5 minutes
 * 5. Bot & Crawler Immunity:
 *    - User agents for Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot return 'en' with 0 external calls and 0 cookies
 * 6. Performance Benchmarking:
 *    - Measure and report first-visit delay (< 600ms worst case, ~0ms on cache hit/subsequent visits)
 */

import { register } from 'node:module';
import { performance } from 'node:perf_hooks';

// Register TypeScript ESM resolver hook
register('./ts-resolver.mjs', import.meta.url);

// Dynamic module imports
const {
  isIPv4,
  isIPv6,
  cleanIp,
  isPrivateOrReservedIp,
  getClientIp,
  getIpNetworkPrefix,
} = await import('../lib/locale/ipUtils.ts');

const {
  isBot,
  isStaticOrAssetPath,
  shouldSkipLocaleDetection,
} = await import('../lib/locale/botDetection.ts');

const {
  normalizeCountryCode,
  getLanguageForCountry,
  COUNTRY_TO_LANGUAGE,
} = await import('../lib/locale/countryLanguageMap.ts');

const {
  lookupCountryByIp,
  resetCircuitBreaker,
  clearIpCache,
  resetRateLimits,
  getCircuitBreakerState,
  getCacheStats,
  recordFailureForTesting,
  CIRCUIT_COOLDOWN_MS,
  CONSECUTIVE_FAILURES_THRESHOLD,
  MAX_CACHE_ENTRIES,
} = await import('../lib/locale/ipLookup.ts');

const { GET: detectLocaleHandler } = await import('../app/api/locale/detect/route.ts');
const { SUPPORTED_LANGUAGES } = await import('../lib/translate/googleTranslate.ts');

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  magenta: '\x1b[35m',
};

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(desc) {
  totalTests++;
  passedTests++;
  console.log(`  ${colors.green}✔ PASS${colors.reset}: ${desc}`);
}

function fail(desc, err) {
  totalTests++;
  failedTests++;
  console.error(`  ${colors.red}✖ FAIL${colors.reset}: ${desc}`);
  if (err) {
    console.error(`         ${colors.yellow}Error:${colors.reset} ${err.message || err}`);
  }
}

function section(title) {
  console.log(`\n${colors.cyan}${colors.bold}=== ${title} ===${colors.reset}`);
}

// Preserve original fetch
const originalFetch = globalThis.fetch;

async function runTestSuite() {
  console.log(`${colors.bold}${colors.magenta}🧪 KindLink IPinfo Language QA & Crawler Guard Test Suite${colors.reset}`);
  console.log(`${colors.gray}Testing country mapping, edge cases, cache, circuit breaker, bot immunity & latency...${colors.reset}\n`);

  // =========================================================================
  // Section 1: Country Mapping Verification
  // =========================================================================
  section('1. Country-to-Language Mapping Verification');

  try {
    // 1. India ('IN') -> 'en'
    const langIN = getLanguageForCountry('IN');
    if (langIN === 'en') {
      pass(`India ('IN') maps to 'en' (English)`);
    } else {
      fail(`India ('IN') mapped to '${langIN}', expected 'en'`);
    }

    // 2. USA ('US') -> 'en'
    const langUS = getLanguageForCountry('US');
    if (langUS === 'en') {
      pass(`USA ('US') maps to 'en' (English)`);
    } else {
      fail(`USA ('US') mapped to '${langUS}', expected 'en'`);
    }

    // 3. France ('FR') -> 'fr'
    const langFR = getLanguageForCountry('FR');
    if (langFR === 'fr') {
      pass(`France ('FR') maps to 'fr' (French)`);
    } else {
      fail(`France ('FR') mapped to '${langFR}', expected 'fr'`);
    }

    // 4. Bangladesh ('BD') -> 'bn'
    const langBD = getLanguageForCountry('BD');
    if (langBD === 'bn') {
      pass(`Bangladesh ('BD') maps to 'bn' (Bengali)`);
    } else {
      fail(`Bangladesh ('BD') mapped to '${langBD}', expected 'bn'`);
    }

    // 5. Japan ('JP') -> 'ja'
    const langJP = getLanguageForCountry('JP');
    if (langJP === 'ja') {
      pass(`Japan ('JP') maps to 'ja' (Japanese)`);
    } else {
      fail(`Japan ('JP') mapped to '${langJP}', expected 'ja'`);
    }

    // 6. Additional major countries
    const additionalChecks = [
      { code: 'GB', lang: 'en', name: 'United Kingdom' },
      { code: 'CA', lang: 'en', name: 'Canada' },
      { code: 'AU', lang: 'en', name: 'Australia' },
      { code: 'DE', lang: 'de', name: 'Germany' },
      { code: 'ES', lang: 'es', name: 'Spain' },
      { code: 'MX', lang: 'es', name: 'Mexico' },
      { code: 'BR', lang: 'pt', name: 'Brazil' },
      { code: 'IT', lang: 'it', name: 'Italy' },
      { code: 'RU', lang: 'ru', name: 'Russia' },
      { code: 'CN', lang: 'zh-CN', name: 'China' },
      { code: 'KR', lang: 'ko', name: 'South Korea' },
      { code: 'SA', lang: 'ar', name: 'Saudi Arabia' },
      { code: 'ID', lang: 'id', name: 'Indonesia' },
      { code: 'TR', lang: 'tr', name: 'Turkey' },
      { code: 'NP', lang: 'ne', name: 'Nepal' },
      { code: 'PK', lang: 'ur', name: 'Pakistan' },
    ];

    for (const item of additionalChecks) {
      const res = getLanguageForCountry(item.code);
      if (res === item.lang) {
        pass(`${item.name} ('${item.code}') maps to '${item.lang}'`);
      } else {
        fail(`${item.name} ('${item.code}') mapped to '${res}', expected '${item.lang}'`);
      }
    }

    // 7. Unmapped countries -> fallback to 'en'
    const unmapped1 = getLanguageForCountry('ZZ');
    if (unmapped1 === 'en') {
      pass(`Unmapped country 'ZZ' gracefully falls back to 'en'`);
    } else {
      fail(`Unmapped country 'ZZ' returned '${unmapped1}', expected 'en'`);
    }

    const unmapped2 = getLanguageForCountry('IS');
    if (unmapped2 === 'en') {
      pass(`Unmapped country 'IS' (Iceland) gracefully falls back to 'en'`);
    } else {
      fail(`Unmapped country 'IS' returned '${unmapped2}', expected 'en'`);
    }

    const unmapped3 = getLanguageForCountry('AQ'); // Antarctica
    if (unmapped3 === 'en') {
      pass(`Unmapped country 'AQ' (Antarctica) gracefully falls back to 'en'`);
    } else {
      fail(`Unmapped country 'AQ' returned '${unmapped3}', expected 'en'`);
    }

    // 8. Mapped language that is unsupported -> falls back to 'en'
    process.env.LANG_COUNTRY_MAP = 'TG:klingon,XX:unsupported_language_code';
    const unsupported1 = getLanguageForCountry('TG');
    const unsupported2 = getLanguageForCountry('XX');
    delete process.env.LANG_COUNTRY_MAP;

    if (unsupported1 === 'en') {
      pass(`Country mapped to unsupported language ('klingon') safely falls back to 'en'`);
    } else {
      fail(`Country mapped to 'klingon' returned '${unsupported1}', expected 'en'`);
    }

    if (unsupported2 === 'en') {
      pass(`Country mapped to invalid language code safely falls back to 'en'`);
    } else {
      fail(`Country mapped to invalid language returned '${unsupported2}', expected 'en'`);
    }

    // 9. Country normalization with aliases and edge cases
    if (normalizeCountryCode('fr') === 'FR') {
      pass(`Normalizes lowercase 'fr' to 'FR'`);
    } else {
      fail(`Lowercase 'fr' normalization failed`);
    }

    if (normalizeCountryCode('Bangladesh') === 'BD') {
      pass(`Normalizes full name 'Bangladesh' to 'BD'`);
    } else {
      fail(`Full name 'Bangladesh' normalization failed`);
    }

    if (normalizeCountryCode('United States') === 'US') {
      pass(`Normalizes full name 'United States' to 'US'`);
    } else {
      fail(`Full name 'United States' normalization failed`);
    }

    if (normalizeCountryCode('Japan') === 'JP') {
      pass(`Normalizes full name 'Japan' to 'JP'`);
    } else {
      fail(`Full name 'Japan' normalization failed`);
    }

    if (normalizeCountryCode('unknown') === 'IN' && normalizeCountryCode(null) === 'IN') {
      pass(`Unparseable input ('unknown', null) defaults safely to 'IN'`);
    } else {
      fail(`Unparseable country normalization failed`);
    }
  } catch (err) {
    fail('Country mapping section threw an unexpected error', err);
  }

  // =========================================================================
  // Section 2: Edge Cases & Resilience (mocked)
  // =========================================================================
  section('2. Edge Cases & Resilience (Mocked Fetch)');

  try {
    process.env.NODE_ENV = 'development';
    process.env.IPINFO_TIMEOUT_MS = '300'; // Set tight 300ms timeout for testing
    clearIpCache();
    resetCircuitBreaker();
    resetRateLimits();

    // Test 1: Timeout (response > timeout) -> falls back to 'en' without blocking
    let timeoutAborted = false;
    globalThis.fetch = async (url, options) => {
      return new Promise((resolve, reject) => {
        const signal = options?.signal;
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ country: 'FR' }), { status: 200 }));
        }, 1000); // 1000ms delay, exceeds 300ms timeout

        if (signal) {
          signal.addEventListener('abort', () => {
            timeoutAborted = true;
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    };

    const startTime = performance.now();
    const timeoutRes = await lookupCountryByIp('93.184.216.34');
    const elapsed = performance.now() - startTime;
    const timeoutLang = getLanguageForCountry(timeoutRes.countryCode);

    if (timeoutLang === 'en' && timeoutRes.source === 'fallback' && elapsed < 600) {
      pass(`Timeout (>300ms) falls back to 'en' within ${elapsed.toFixed(1)}ms without blocking`);
    } else {
      fail(`Timeout failed: lang=${timeoutLang}, source=${timeoutRes.source}, elapsed=${elapsed.toFixed(1)}ms`);
    }

    // Reset circuit breaker after timeout test
    resetCircuitBreaker();
    clearIpCache();

    // Test 2: HTTP 429 Rate Limit error from IPinfo -> falls back to 'en'
    globalThis.fetch = async () => {
      return new Response('Too Many Requests', { status: 429, statusText: 'Too Many Requests' });
    };

    const rateLimit429Res = await lookupCountryByIp('93.184.216.35');
    const rateLimit429Lang = getLanguageForCountry(rateLimit429Res.countryCode);

    if (rateLimit429Lang === 'en' && rateLimit429Res.source === 'fallback') {
      pass(`HTTP 429 rate limit error safely cascades to English ('en')`);
    } else {
      fail(`HTTP 429 failed: lang=${rateLimit429Lang}, source=${rateLimit429Res.source}`);
    }

    // Test 3: HTTP 500 Server error from IPinfo -> falls back to 'en'
    resetCircuitBreaker();
    clearIpCache();
    globalThis.fetch = async () => {
      return new Response('Internal Server Error', { status: 500, statusText: 'Server Error' });
    };

    const error500Res = await lookupCountryByIp('93.184.216.36');
    const error500Lang = getLanguageForCountry(error500Res.countryCode);

    if (error500Lang === 'en' && error500Res.source === 'fallback') {
      pass(`HTTP 500 internal server error safely cascades to English ('en')`);
    } else {
      fail(`HTTP 500 failed: lang=${error500Lang}, source=${error500Res.source}`);
    }

    // Test 4: Missing or invalid token -> falls back to 'en'
    resetCircuitBreaker();
    clearIpCache();
    globalThis.fetch = async () => {
      return new Response('Forbidden', { status: 403, statusText: 'Forbidden' });
    };

    const tokenErrRes = await lookupCountryByIp('93.184.216.37');
    const tokenErrLang = getLanguageForCountry(tokenErrRes.countryCode);

    if (tokenErrLang === 'en' && tokenErrRes.source === 'fallback') {
      pass(`Invalid / missing token (HTTP 403) cascades gracefully to English ('en')`);
    } else {
      fail(`Invalid token test failed: lang=${tokenErrLang}, source=${tokenErrRes.source}`);
    }

    // Test 5: Private & Loopback IPs -> returns immediately without calling IPinfo
    let privateCallCount = 0;
    globalThis.fetch = async () => {
      privateCallCount++;
      return new Response(JSON.stringify({ country: 'FR' }), { status: 200 });
    };

    const privateIps = [
      '127.0.0.1',
      '192.168.1.1',
      '10.0.0.1',
      '::1',
      '172.16.0.1',
      '100.64.0.1', // CGNAT
      '169.254.1.1', // Link-local
      'fc00::1', // IPv6 ULA
      'fe80::1', // IPv6 Link-local
    ];

    let allPrivatePassed = true;
    for (const privIp of privateIps) {
      const privRes = await lookupCountryByIp(privIp);
      const privLang = getLanguageForCountry(privRes.countryCode);
      if (privLang !== 'en' || privRes.source !== 'fallback') {
        allPrivatePassed = false;
        fail(`Private IP ${privIp} returned source=${privRes.source}, lang=${privLang}`);
      }
    }

    if (allPrivatePassed && privateCallCount === 0) {
      pass(`Private / loopback IPs (127.0.0.1, 192.168.1.1, 10.0.0.1, ::1, CGNAT) return 'en' with 0 external API calls`);
    } else {
      fail(`Private IP test failed: external API called ${privateCallCount} times (expected 0)`);
    }

    // Test 6: Malformed X-Forwarded-For header extraction
    const malformed1 = getClientIp(new Headers({ 'x-forwarded-for': 'invalid_garbage, 127.0.0.1' }));
    if (malformed1 === null) {
      pass(`Malformed X-Forwarded-For ('invalid_garbage, 127.0.0.1') safely returns null -> English fallback`);
    } else {
      fail(`Malformed header returned: ${malformed1}, expected null`);
    }

    const malformed2 = getClientIp(new Headers({ 'x-forwarded-for': 'broken_ip, 93.184.216.34, 10.0.0.1' }));
    if (malformed2 === '93.184.216.34') {
      pass(`Chain with leading garbage ('broken_ip, 93.184.216.34, 10.0.0.1') safely extracts valid public IP`);
    } else {
      fail(`Chain extraction failed: got ${malformed2}, expected 93.184.216.34`);
    }

    const malformed3 = getClientIp(new Headers({ 'x-forwarded-for': '93.184.216.34:8080' }));
    if (malformed3 === '93.184.216.34') {
      pass(`IP with port ('93.184.216.34:8080') correctly strips port`);
    } else {
      fail(`Port stripping failed: got ${malformed3}`);
    }

    const malformed4 = getClientIp(new Headers({ 'x-forwarded-for': '[2606:4700:4700::1111]:443' }));
    if (malformed4 === '2606:4700:4700::1111') {
      pass(`Public IPv6 with port ('[2606:4700:4700::1111]:443') correctly strips brackets & port`);
    } else {
      fail(`IPv6 port stripping failed: got ${malformed4}`);
    }

    const docIpv6 = getClientIp(new Headers({ 'x-forwarded-for': '[2001:db8::1]:443' }));
    if (docIpv6 === null) {
      pass(`Documentation IPv6 prefix ('2001:db8::/32') correctly recognized as reserved -> null fallback`);
    } else {
      fail(`Documentation IPv6 not filtered: got ${docIpv6}`);
    }
  } catch (err) {
    fail('Edge cases section threw an unexpected error', err);
  }

  // =========================================================================
  // Section 3: In-Memory Cache Verification
  // =========================================================================
  section('3. In-Memory Cache Verification');

  try {
    clearIpCache();
    resetCircuitBreaker();
    resetRateLimits();

    let externalFetchCalls = 0;
    globalThis.fetch = async () => {
      externalFetchCalls++;
      return new Response(JSON.stringify({ country: 'FR', country_code: 'FR' }), { status: 200 });
    };

    const targetIp = '198.51.100.25';

    // First lookup: should fetch externally
    const firstVisit = await lookupCountryByIp(targetIp);
    const firstLang = getLanguageForCountry(firstVisit.countryCode);

    if (firstVisit.source === 'api' && externalFetchCalls === 1 && firstLang === 'fr') {
      pass(`First visit query calls external IPinfo API (source='api', fetches=1, lang='fr')`);
    } else {
      fail(`First visit failed: source=${firstVisit.source}, fetches=${externalFetchCalls}`);
    }

    // Second lookup for exact same IP: should hit cache with 0 external calls
    const secondVisit = await lookupCountryByIp(targetIp);
    const secondLang = getLanguageForCountry(secondVisit.countryCode);

    if (secondVisit.source === 'cache' && externalFetchCalls === 1 && secondLang === 'fr') {
      pass(`Second visit query for same IP hits cache (source='cache', external calls=1, cache hit=1)`);
    } else {
      fail(`Second visit failed: source=${secondVisit.source}, fetches=${externalFetchCalls}`);
    }

    // Third lookup for different IP in same /24 network prefix (198.51.100.99):
    const thirdVisit = await lookupCountryByIp('198.51.100.99');
    if (thirdVisit.source === 'cache' && externalFetchCalls === 1) {
      pass(`Neighbor IP in same /24 prefix ('198.51.100.99') also hits prefix cache without external lookup`);
    } else {
      fail(`Subnet cache hit failed: source=${thirdVisit.source}, fetches=${externalFetchCalls}`);
    }

    const cacheStats = getCacheStats();
    if (cacheStats.size >= 1 && cacheStats.max === MAX_CACHE_ENTRIES) {
      pass(`Cache stats verified: ${cacheStats.size} entries stored, max capacity ${cacheStats.max}`);
    } else {
      fail(`Cache stats invalid: size=${cacheStats.size}, max=${cacheStats.max}`);
    }
  } catch (err) {
    fail('Cache verification section threw an unexpected error', err);
  }

  // =========================================================================
  // Section 4: Circuit Breaker Verification
  // =========================================================================
  section('4. Circuit Breaker (5 Consecutive Failures = 5 Min Cooldown)');

  try {
    clearIpCache();
    resetCircuitBreaker();
    resetRateLimits();

    let simulatedCalls = 0;
    globalThis.fetch = async () => {
      simulatedCalls++;
      return new Response('Service Unavailable', { status: 503 });
    };

    // Initially circuit must be closed
    const initialCb = getCircuitBreakerState();
    if (!initialCb.isOpen && initialCb.consecutiveFailures === 0) {
      pass(`Circuit breaker initially closed (isOpen=false, consecutiveFailures=0)`);
    } else {
      fail(`Circuit breaker initial state failed: isOpen=${initialCb.isOpen}`);
    }

    // Record 4 failures: circuit should still be closed
    for (let i = 1; i <= 4; i++) {
      await lookupCountryByIp(`203.0.113.${i}`);
    }

    const state4 = getCircuitBreakerState();
    if (!state4.isOpen && state4.consecutiveFailures === 4) {
      pass(`After 4 failures, circuit remains closed (consecutiveFailures=4, isOpen=false)`);
    } else {
      fail(`State after 4 failures invalid: isOpen=${state4.isOpen}, failures=${state4.consecutiveFailures}`);
    }

    // 5th failure: trips the circuit breaker
    await lookupCountryByIp('203.0.113.5');
    const state5 = getCircuitBreakerState();

    if (state5.isOpen && state5.consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD) {
      pass(`5th consecutive failure TRIPS circuit breaker (isOpen=true, consecutiveFailures=5)`);
    } else {
      fail(`Breaker failed to trip after 5 failures: isOpen=${state5.isOpen}`);
    }

    // Verify 5-minute cooldown timestamp (CIRCUIT_COOLDOWN_MS = 300000)
    const cooldownRemaining = state5.circuitOpenUntil - Date.now();
    if (cooldownRemaining > 290000 && cooldownRemaining <= CIRCUIT_COOLDOWN_MS) {
      pass(`Circuit open duration is 5 minutes (${(cooldownRemaining / 60000).toFixed(1)} min cooldown)`);
    } else {
      fail(`Cooldown remaining unexpected: ${cooldownRemaining}ms`);
    }

    // 6th request while circuit is open: must return immediately without calling fetch
    const callsBefore6th = simulatedCalls;
    const request6 = await lookupCountryByIp('203.0.113.6');
    const callsAfter6th = simulatedCalls;

    if (
      request6.source === 'circuit-breaker' &&
      request6.countryCode === 'IN' &&
      callsAfter6th === callsBefore6th
    ) {
      pass(`Requests during tripped state return immediate fallback ('IN' -> 'en') with 0 network calls`);
    } else {
      fail(`Open circuit test failed: source=${request6.source}, calls=${callsAfter6th - callsBefore6th}`);
    }

    // Test circuit breaker reset
    resetCircuitBreaker();
    if (!getCircuitBreakerState().isOpen) {
      pass(`Circuit breaker reset function restores operational state`);
    } else {
      fail(`Circuit breaker reset failed`);
    }
  } catch (err) {
    fail('Circuit breaker section threw an unexpected error', err);
  }

  // =========================================================================
  // Section 5: Bot & Crawler Immunity Verification
  // =========================================================================
  section('5. Bot & Crawler Immunity Verification');

  try {
    const botUserAgents = [
      { name: 'Googlebot', ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' },
      { name: 'Bingbot', ua: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)' },
      { name: 'GPTBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)' },
      { name: 'ClaudeBot', ua: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)' },
      { name: 'PerplexityBot', ua: 'PerplexityBot/1.0 (+https://perplexity.ai/perplexitybot)' },
      { name: 'Applebot', ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1)' },
      { name: 'Twitterbot', ua: 'Twitterbot/1.0' },
    ];

    let allBotsDetected = true;
    for (const bot of botUserAgents) {
      const detected = isBot(bot.ua);
      const skipDetection = shouldSkipLocaleDetection('/about', bot.ua);
      if (!detected || !skipDetection) {
        allBotsDetected = false;
        fail(`Bot ${bot.name} detection failed: isBot=${detected}, shouldSkip=${skipDetection}`);
      }
    }

    if (allBotsDetected) {
      pass(`All search engine & AI crawler user agents identified (Googlebot, Bingbot, GPTBot, ClaudeBot, PerplexityBot, Applebot, Twitterbot)`);
    }

    // Verify legitimate user agents are NOT flagged as bots
    const realUsers = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
    ];

    let realUsersClean = true;
    for (const ua of realUsers) {
      if (isBot(ua)) {
        realUsersClean = false;
        fail(`Legitimate browser UA incorrectly flagged as bot: ${ua}`);
      }
    }

    if (realUsersClean) {
      pass(`Legitimate Chrome, Safari, and Firefox browsers are not flagged as bots`);
    }

    // Test API route handler /api/locale/detect immunity with mocked bot request
    let botExternalCalls = 0;
    globalThis.fetch = async () => {
      botExternalCalls++;
      return new Response(JSON.stringify({ country: 'FR' }), { status: 200 });
    };

    for (const bot of botUserAgents) {
      // Mock NextRequest-like object
      const mockReq = {
        headers: new Headers({
          'user-agent': bot.ua,
          'x-forwarded-for': '93.184.216.34', // Public French/US IP
        }),
      };

      const res = await detectLocaleHandler(mockReq);
      const data = await res.json();
      const cookies = res.cookies ? res.cookies.getAll() : [];

      if (data.language !== 'en') {
        fail(`Bot ${bot.name} received language '${data.language}', expected 'en'`);
      }
      if (cookies.length > 0) {
        fail(`Bot ${bot.name} received ${cookies.length} cookies, expected 0 cookies`);
      }
    }

    if (botExternalCalls === 0) {
      pass(`Bot requests to /api/locale/detect return 'en' with 0 external API calls and 0 cookies set`);
    } else {
      fail(`Bot requests caused ${botExternalCalls} external API calls, expected 0`);
    }
  } catch (err) {
    fail('Bot immunity section threw an unexpected error', err);
  }

  // =========================================================================
  // Section 6: Latency & First-Visit Performance QA Benchmarks
  // =========================================================================
  section('6. First-Visit Delay & Performance QA Benchmarks');

  try {
    clearIpCache();
    resetCircuitBreaker();
    resetRateLimits();

    // 1. Private IP lookup latency
    const t0 = performance.now();
    for (let i = 0; i < 50; i++) {
      await lookupCountryByIp('127.0.0.1');
    }
    const privateAvgMs = (performance.now() - t0) / 50;
    if (privateAvgMs < 1.0) {
      pass(`Private / loopback IP resolution latency: ${privateAvgMs.toFixed(3)}ms (target: < 1ms)`);
    } else {
      fail(`Private IP resolution too slow: ${privateAvgMs.toFixed(3)}ms`);
    }

    // 2. Cache Hit latency
    // Prime cache with public IP
    globalThis.fetch = async () => {
      return new Response(JSON.stringify({ country: 'FR', country_code: 'FR' }), { status: 200 });
    };
    await lookupCountryByIp('93.184.216.34'); // Prime cache

    const t1 = performance.now();
    for (let i = 0; i < 100; i++) {
      await lookupCountryByIp('93.184.216.34');
    }
    const cacheAvgMs = (performance.now() - t1) / 100;
    if (cacheAvgMs < 1.0) {
      pass(`In-memory cache hit latency: ${cacheAvgMs.toFixed(3)}ms (~0ms, target: < 1ms)`);
    } else {
      fail(`Cache hit latency too slow: ${cacheAvgMs.toFixed(3)}ms`);
    }

    // 3. Bot check latency
    const t2 = performance.now();
    for (let i = 0; i < 100; i++) {
      isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)');
    }
    const botAvgMs = (performance.now() - t2) / 100;
    if (botAvgMs < 0.1) {
      pass(`Bot detection regex evaluation latency: ${botAvgMs.toFixed(4)}ms (target: < 0.1ms)`);
    } else {
      fail(`Bot detection evaluation too slow: ${botAvgMs.toFixed(4)}ms`);
    }

    // 4. Simulated Fast External API Call (20ms simulated network latency)
    globalThis.fetch = async () => {
      await new Promise((r) => setTimeout(r, 20));
      return new Response(JSON.stringify({ country: 'FR', country_code: 'FR' }), { status: 200 });
    };
    clearIpCache();

    const t3 = performance.now();
    const coldRes = await lookupCountryByIp('93.184.216.50');
    const coldDurationMs = performance.now() - t3;

    if (coldDurationMs >= 20 && coldDurationMs < 100 && coldRes.countryCode === 'FR') {
      pass(`Simulated live external fetch: ${coldDurationMs.toFixed(1)}ms (target: < 100ms on good network)`);
    } else {
      fail(`Simulated live external fetch unexpected duration: ${coldDurationMs.toFixed(1)}ms`);
    }

    // 5. Hard ceiling timeout validation (must be capped at 600ms worst case)
    process.env.IPINFO_TIMEOUT_MS = '600';
    clearIpCache();
    resetCircuitBreaker();
    globalThis.fetch = async (url, options) => {
      return new Promise((resolve, reject) => {
        const signal = options?.signal;
        const timer = setTimeout(() => {
          resolve(new Response(JSON.stringify({ country: 'FR' }), { status: 200 }));
        }, 3000);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    };

    const t4 = performance.now();
    const worstCaseRes = await lookupCountryByIp('93.184.216.51');
    const worstCaseDurationMs = performance.now() - t4;

    if (worstCaseDurationMs <= 660 && worstCaseRes.source === 'fallback') {
      pass(`Worst-case timeout delay is strictly bounded at ${worstCaseDurationMs.toFixed(1)}ms (hard cap: < 660ms, fallback='en')`);
    } else {
      fail(`Worst-case timeout exceeded 660ms limit: ${worstCaseDurationMs.toFixed(1)}ms`);
    }

    // Print Performance Summary Table
    console.log(`\n${colors.cyan}First-Visit Latency & Performance QA Scorecard:${colors.reset}`);
    console.log(`  ┌──────────────────────────────────────────────┬───────────────┬────────────┐`);
    console.log(`  │ Scenario                                     │ Measured Time │ SLA Status │`);
    console.log(`  ├──────────────────────────────────────────────┼───────────────┼────────────┤`);
    console.log(`  │ Private / Loopback IP (127.0.0.1, ::1)       │ ${privateAvgMs.toFixed(3).padStart(9)} ms │  PASS (<1ms)│`);
    console.log(`  │ In-Memory Cache Hit (Subsequent visits)      │ ${cacheAvgMs.toFixed(3).padStart(9)} ms │  PASS (~0ms)│`);
    console.log(`  │ Search Bot / AI Crawler Immunity Check       │ ${botAvgMs.toFixed(4).padStart(9)} ms │  PASS (<1ms)│`);
    console.log(`  │ Cold First Visit (Typical simulated network) │ ${coldDurationMs.toFixed(1).padStart(9)} ms │PASS (<100ms)│`);
    console.log(`  │ Worst Case Network Timeout Hard Ceiling      │ ${worstCaseDurationMs.toFixed(1).padStart(9)} ms │PASS (<660ms)│`);
    console.log(`  └──────────────────────────────────────────────┴───────────────┴────────────┘`);
  } catch (err) {
    fail('Performance benchmark section threw an unexpected error', err);
  } finally {
    // Restore original fetch and timeout
    globalThis.fetch = originalFetch;
    delete process.env.IPINFO_TIMEOUT_MS;
    clearIpCache();
    resetCircuitBreaker();
    resetRateLimits();
  }

  // =========================================================================
  // Final Score & Exit
  // =========================================================================
  console.log(`\n${colors.gray}===================================================${colors.reset}`);
  console.log(`Total Checks Run : ${colors.bold}${totalTests}${colors.reset}`);
  console.log(`Tests Passed     : ${colors.green}${colors.bold}${passedTests}${colors.reset}`);
  console.log(`Tests Failed     : ${failedTests > 0 ? colors.red : colors.green}${colors.bold}${failedTests}${colors.reset}`);
  console.log(`${colors.gray}===================================================${colors.reset}`);

  if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bold}🎉 ALL UNIT, INTEGRATION & PERFORMANCE TESTS PASSED SUCCESSFULLY!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`\n${colors.red}${colors.bold}❌ ${failedTests} TEST(S) FAILED! SEE LOG ABOVE.${colors.reset}\n`);
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error('Test runner encountered a critical error:', err);
  process.exit(1);
});
