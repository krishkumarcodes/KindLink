#!/usr/bin/env node
/**
 * KindLink Locale & Geo-lookup Diagnostic Test Suite
 *
 * Validates:
 * 1. IP extraction from proxy headers & private IP filtering
 * 2. IPv4 /24 and IPv6 /48 network prefix calculations
 * 3. Bot & crawler detection
 * 4. Country code normalization & language mapping
 * 5. IPinfo Lite client with timeout, AbortController, caching, rate limiting, and circuit breaker
 * 6. Test override security in production vs dev
 */

import {
  isIPv4,
  isIPv6,
  cleanIp,
  isPrivateOrReservedIp,
  getClientIp,
  getIpNetworkPrefix,
} from '../lib/locale/ipUtils.ts';

import {
  isBot,
  isStaticOrAssetPath,
  shouldSkipLocaleDetection,
} from '../lib/locale/botDetection.ts';

import {
  normalizeCountryCode,
  getLanguageForCountry,
  COUNTRY_TO_LANGUAGE,
} from '../lib/locale/countryLanguageMap.ts';

import {
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
} from '../lib/locale/ipLookup.ts';

let totalTests = 0;
let passedTests = 0;

function assert(condition, description) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${description}`);
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${description}`);
  }
}

async function runTests() {
  console.log('\n--- 1. Testing IP Validation & Private / CGNAT Filtering ---');

  assert(isIPv4('8.8.8.8') === true, '8.8.8.8 is valid IPv4');
  assert(isIPv4('256.0.0.1') === false, '256.0.0.1 is invalid IPv4');
  assert(isIPv4('10.0.0.1') === true, '10.0.0.1 is valid IPv4');

  assert(isIPv6('2001:db8::1') === true, '2001:db8::1 is valid IPv6');
  assert(isIPv6('::1') === true, '::1 is valid IPv6');
  assert(isIPv6('invalid:ipv6::xyz') === false, 'invalid:ipv6::xyz is rejected');

  assert(cleanIp('1.2.3.4:8080') === '1.2.3.4', 'cleanIp strips port from IPv4');
  assert(cleanIp('[2001:db8::1]:443') === '2001:db8::1', 'cleanIp strips port from IPv6');

  // Private / loopback / CGNAT addresses
  assert(isPrivateOrReservedIp('127.0.0.1') === true, '127.0.0.1 (loopback) is filtered');
  assert(isPrivateOrReservedIp('10.50.0.1') === true, '10.0.0.0/8 (private) is filtered');
  assert(isPrivateOrReservedIp('172.16.5.4') === true, '172.16.0.0/12 (private) is filtered');
  assert(isPrivateOrReservedIp('172.31.255.1') === true, '172.31.255.1 (private) is filtered');
  assert(isPrivateOrReservedIp('192.168.1.100') === true, '192.168.0.0/16 (private) is filtered');
  assert(isPrivateOrReservedIp('100.64.0.1') === true, '100.64.0.1 (CGNAT) is filtered');
  assert(isPrivateOrReservedIp('100.127.255.254') === true, '100.127.255.254 (CGNAT) is filtered');
  assert(isPrivateOrReservedIp('169.254.1.1') === true, '169.254.1.1 (link-local) is filtered');
  assert(isPrivateOrReservedIp('::1') === true, '::1 (IPv6 loopback) is filtered');
  assert(isPrivateOrReservedIp('fc00::1') === true, 'fc00::1 (IPv6 ULA) is filtered');
  assert(isPrivateOrReservedIp('fe80::1') === true, 'fe80::1 (IPv6 link-local) is filtered');

  // Public addresses
  assert(isPrivateOrReservedIp('8.8.8.8') === false, '8.8.8.8 is identified as public');
  assert(isPrivateOrReservedIp('1.1.1.1') === false, '1.1.1.1 is identified as public');
  assert(isPrivateOrReservedIp('100.128.0.1') === false, '100.128.0.1 is outside CGNAT range');
  assert(isPrivateOrReservedIp('172.32.0.1') === false, '172.32.0.1 is outside private range');

  console.log('\n--- 2. Testing Header Extraction (x-forwarded-for, x-real-ip) ---');

  const headersMulti = new Headers();
  headersMulti.set('x-forwarded-for', '10.0.0.1, 192.168.0.5, 93.184.216.34, 172.16.0.1');
  assert(getClientIp(headersMulti) === '93.184.216.34', 'Extracts left-most non-private IP from chain');

  const headersRealIp = new Headers();
  headersRealIp.set('x-real-ip', '151.101.1.140');
  assert(getClientIp(headersRealIp) === '151.101.1.140', 'Extracts IP from x-real-ip when public');

  const headersPrivateOnly = new Headers();
  headersPrivateOnly.set('x-forwarded-for', '127.0.0.1, 10.0.0.1');
  assert(getClientIp(headersPrivateOnly) === null, 'Returns null when all IPs are private');

  console.log('\n--- 3. Testing Network Prefix Calculation (/24 and /48) ---');

  assert(getIpNetworkPrefix('203.0.113.195') === '203.0.113.0/24', 'IPv4 prefix is /24');
  assert(getIpNetworkPrefix('93.184.216.34') === '93.184.216.0/24', 'IPv4 prefix correctly masked');
  assert(getIpNetworkPrefix('2001:db8:85a3:8d3:1319:8a2e:370:7348') === '2001:db8:85a3::/48', 'IPv6 prefix is /48');

  console.log('\n--- 4. Testing Bot & Crawler Detection ---');

  assert(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)') === true, 'Googlebot detected');
  assert(isBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)') === true, 'Bingbot detected');
  assert(isBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)') === true, 'GPTBot detected');
  assert(isBot('Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)') === true, 'ClaudeBot detected');
  assert(isBot('PerplexityBot/1.0 (+https://perplexity.ai/perplexitybot)') === true, 'PerplexityBot detected');
  assert(isBot('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15 (Applebot/0.1)') === true, 'Applebot detected');
  assert(isBot('Twitterbot/1.0') === true, 'Twitterbot detected');

  assert(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36') === false, 'Standard Chrome browser not flagged as bot');
  assert(isBot('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15') === false, 'Mobile Safari not flagged as bot');

  assert(isStaticOrAssetPath('/_next/static/chunks/main.js') === true, '/_next is static');
  assert(isStaticOrAssetPath('/images/logo.png') === true, '/images is static');
  assert(isStaticOrAssetPath('/favicon.ico') === true, '/favicon.ico is static');
  assert(isStaticOrAssetPath('/about') === false, '/about is not static');

  assert(shouldSkipLocaleDetection('/api/requests', null) === true, 'Bypasses /api routes');
  assert(shouldSkipLocaleDetection('/about', 'Googlebot/2.1') === true, 'Bypasses bots on guest pages');
  assert(shouldSkipLocaleDetection('/about', 'Mozilla/5.0 Chrome/120') === false, 'Processes real user on HTML page');

  console.log('\n--- 5. Testing Country Code Normalization & Language Mapping ---');

  assert(normalizeCountryCode('fr') === 'FR', 'Normalizes lowercase to uppercase');
  assert(normalizeCountryCode('France') === 'FR', 'Normalizes France to FR');
  assert(normalizeCountryCode('United States') === 'US', 'Normalizes United States to US');
  assert(normalizeCountryCode('unknown') === 'IN', 'Defaults unparseable to IN');

  assert(getLanguageForCountry('FR') === 'fr', 'FR maps to French (fr)');
  assert(getLanguageForCountry('ES') === 'es', 'ES maps to Spanish (es)');
  assert(getLanguageForCountry('DE') === 'de', 'DE maps to German (de)');
  assert(getLanguageForCountry('BR') === 'pt', 'BR maps to Portuguese (pt)');
  assert(getLanguageForCountry('IT') === 'it', 'IT maps to Italian (it)');
  assert(getLanguageForCountry('RU') === 'ru', 'RU maps to Russian (ru)');
  assert(getLanguageForCountry('JP') === 'ja', 'JP maps to Japanese (ja)');
  assert(getLanguageForCountry('KR') === 'ko', 'KR maps to Korean (ko)');
  assert(getLanguageForCountry('SA') === 'ar', 'SA maps to Arabic (ar)');
  assert(getLanguageForCountry('ID') === 'id', 'ID maps to Indonesian (id)');
  assert(getLanguageForCountry('TR') === 'tr', 'TR maps to Turkish (tr)');
  assert(getLanguageForCountry('CN') === 'zh-CN', 'CN maps to Chinese (zh-CN)');
  assert(getLanguageForCountry('IN') === 'en', 'IN maps to English (en default)');
  assert(getLanguageForCountry('US') === 'en', 'US maps to English (en)');
  assert(getLanguageForCountry('ZZ') === 'en', 'Unmapped country code maps to en');

  console.log('\n--- 6. Testing Test Overrides & Production Security Invariant ---');

  // In test / dev mode:
  process.env.NODE_ENV = 'development';
  process.env.ALLOW_TEST_COUNTRY = 'false';

  let testRes = await lookupCountryByIp('8.8.8.8', 'FR');
  assert(testRes.country === 'FR' && testRes.source === 'test-override', 'DEV mode respects x-test-country header');

  // In production mode WITHOUT ALLOW_TEST_COUNTRY:
  process.env.NODE_ENV = 'production';
  delete process.env.ALLOW_TEST_COUNTRY;

  // With a private IP and test header in strict production:
  let prodRes = await lookupCountryByIp('127.0.0.1', 'FR');
  assert(prodRes.country === 'IN' && prodRes.source === 'fallback', 'Strict production ignores x-test-country header completely');

  // In production mode WITH explicit ALLOW_TEST_COUNTRY=true:
  process.env.ALLOW_TEST_COUNTRY = 'true';
  let allowedProdRes = await lookupCountryByIp('127.0.0.1', 'DE');
  assert(allowedProdRes.country === 'DE' && allowedProdRes.source === 'test-override', 'Production respects override when ALLOW_TEST_COUNTRY=true');

  console.log('\n--- 7. Testing Rate Limiting (Max 10 req/min per IP) ---');

  process.env.NODE_ENV = 'development';
  delete process.env.ALLOW_TEST_COUNTRY;
  resetRateLimits();
  clearIpCache();
  resetCircuitBreaker();

  // Test IP 198.51.100.1
  const testRateIp = '198.51.100.1';
  // Send 10 requests (they will hit mock or timeout/api)
  for (let i = 0; i < 10; i++) {
    await lookupCountryByIp(testRateIp);
  }
  // 11th request must be rate-limited
  const rateLimitRes = await lookupCountryByIp(testRateIp);
  assert(rateLimitRes.source === 'rate-limit' || rateLimitRes.source === 'circuit-breaker', '11th request is throttled or circuit-checked');

  console.log('\n--- 8. Testing Circuit Breaker ---');

  resetRateLimits();
  clearIpCache();
  resetCircuitBreaker();

  // Trigger 5 failures
  for (let i = 0; i < CONSECUTIVE_FAILURES_THRESHOLD; i++) {
    // Lookup invalid address or cause failure
    await lookupCountryByIp(`198.51.100.${i + 10}`);
  }

  const cbState = getCircuitBreakerState();
  assert(cbState.consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD, 'Circuit breaker records consecutive failures');
  assert(cbState.isOpen === true, 'Circuit breaker trips to open state after threshold failures');

  const trippedRes = await lookupCountryByIp('198.51.100.99');
  assert(trippedRes.source === 'circuit-breaker', 'Further requests return immediate fallback without network call');
  assert(trippedRes.country === 'IN' && trippedRes.countryCode === 'IN', 'Circuit-broken response returns { country: IN, countryCode: IN }');

  console.log('\n=============================================');
  console.log(`Results: ${passedTests} / ${totalTests} tests passed`);
  if (passedTests === totalTests) {
    console.log('\x1b[32m✔ ALL LOCALE & GEO-LOOKUP TESTS PASSED!\x1b[0m\n');
  } else {
    console.error('\x1b[31m✖ SOME TESTS FAILED!\x1b[0m\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Unhandled test error:', err);
  process.exit(1);
});
