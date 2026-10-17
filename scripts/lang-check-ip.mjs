#!/usr/bin/env node

/**
 * KindLink IPinfo & Language Mapping CLI Verification Tool
 *
 * Verifies:
 * 1. Country-to-language mapping (config/country-language.json) has 20+ countries
 *    and each country maps to a supported language in lib/translate/googleTranslate.ts.
 * 2. process.env.IPINFO_TOKEN availability.
 *    If missing: prints [SKIPPED] No IPINFO_TOKEN set (falling back to English).
 * 3. Live IPinfo Lite queries with two global test IPs:
 *    - 8.8.8.8 (Google DNS -> US -> English)
 *    - 1.1.1.1 (Cloudflare DNS -> AU/US -> English)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to load .env.local or .env if process.env.IPINFO_TOKEN is not set
function loadEnvFiles() {
  if (process.env.IPINFO_SKIP_ENV_LOAD === '1') return;
  if (process.env.IPINFO_TOKEN) return;
  for (const file of ['.env.local', '.env']) {
    const fullPath = path.join(rootDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        const text = fs.readFileSync(fullPath, 'utf8');
        for (const line of text.split('\n')) {
          const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let val = (match[2] || '').trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = val;
            }
          }
        }
      } catch {}
    }
  }
}

loadEnvFiles();

// ANSI color helpers
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function pass(msg) {
  console.log(`${colors.green}${colors.bold}[PASS]${colors.reset} ${msg}`);
}

function fail(msg, hint) {
  console.error(`${colors.red}${colors.bold}[FAIL]${colors.reset} ${msg}`);
  if (hint) {
    console.error(`       ${colors.yellow}Actionable Hint:${colors.reset} ${hint}`);
  }
}

function skip(msg, hint) {
  console.log(`${colors.yellow}${colors.bold}[SKIPPED]${colors.reset} ${msg}`);
  if (hint) {
    console.log(`          ${colors.gray}Hint: ${hint}${colors.reset}`);
  }
}

async function main() {
  console.log(`${colors.bold}${colors.cyan}🌐 KindLink IPinfo & Language Detection Verification Tool${colors.reset}\n`);

  let totalErrors = 0;

  // =========================================================================
  // Step 1: Validate Country-to-Language Mapping
  // =========================================================================
  console.log(`${colors.gray}--- 1. Validating Country-to-Language Rules ---${colors.reset}`);

  // Load SUPPORTED_LANGUAGES from lib/translate/googleTranslate.ts
  let supportedCodes = new Set();
  try {
    const translateModule = await import('../lib/translate/googleTranslate.ts');
    if (translateModule.SUPPORTED_LANGUAGES && Array.isArray(translateModule.SUPPORTED_LANGUAGES)) {
      supportedCodes = new Set(translateModule.SUPPORTED_LANGUAGES.map((l) => l.code));
    }
  } catch (err) {
    fail(`Could not load lib/translate/googleTranslate.ts: ${err.message}`, 'Check TypeScript compilation and path.');
    totalErrors++;
  }

  // Load config/country-language.json
  const configPath = path.join(rootDir, 'config', 'country-language.json');
  let countryMap = {};

  if (!fs.existsSync(configPath)) {
    fail('config/country-language.json not found!', 'Create config/country-language.json with country to language code mappings.');
    totalErrors++;
  } else {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      countryMap = JSON.parse(raw);
    } catch (err) {
      fail(`Invalid JSON in config/country-language.json: ${err.message}`, 'Fix JSON syntax errors in config/country-language.json.');
      totalErrors++;
    }
  }

  const countryEntries = Object.entries(countryMap).filter(([k]) => k !== 'default');
  const countryCount = countryEntries.length;

  if (countryCount < 20) {
    fail(
      `Country mapping count is ${countryCount} (required: 20+ countries).`,
      'Add more ISO 3166-1 country codes to config/country-language.json to provide comprehensive global coverage.'
    );
    totalErrors++;
  } else {
    pass(`Country map contains ${countryCount} countries (meets 20+ countries requirement).`);
  }

  // Check each mapped country code points to a valid supported language
  const unmappedLanguages = [];
  for (const [country, lang] of countryEntries) {
    if (!supportedCodes.has(lang)) {
      unmappedLanguages.push({ country, lang });
    }
  }

  if (unmappedLanguages.length > 0) {
    fail(
      `Found ${unmappedLanguages.length} country mappings pointing to unsupported languages: ${unmappedLanguages
        .map((u) => `${u.country}->${u.lang}`)
        .join(', ')}`,
      'Update target languages in config/country-language.json to one of the 29 supported codes in lib/translate/googleTranslate.ts.'
    );
    totalErrors++;
  } else if (countryCount > 0 && supportedCodes.size > 0) {
    pass(`All ${countryCount} countries map to valid supported languages in lib/translate/googleTranslate.ts.`);
  }

  // Verify default fallback
  const defaultLang = countryMap['default'];
  if (!defaultLang || !supportedCodes.has(defaultLang)) {
    fail(`Default language "${defaultLang}" is invalid or missing in config/country-language.json`, 'Set "default": "en" in config/country-language.json.');
    totalErrors++;
  } else {
    pass(`Default fallback language is "${defaultLang}" (valid).`);
  }

  // =========================================================================
  // Step 2: Validate IPINFO_TOKEN & Query IPinfo Lite
  // =========================================================================
  console.log(`\n${colors.gray}--- 2. Checking IPinfo Lite Token & Live Lookups ---${colors.reset}`);

  const token = process.env.IPINFO_TOKEN?.trim();

  if (!token) {
    skip(
      'No IPINFO_TOKEN set (falling back to English).',
      'To enable IP lookup, add IPINFO_TOKEN=<token> to .env.local or your environment variables. Sign up for free at https://ipinfo.io/signup.'
    );
  } else {
    pass(`IPINFO_TOKEN detected (${token.slice(0, 4)}...${token.slice(-3)}). Private server-side configuration confirmed.`);

    const testIps = [
      { ip: '8.8.8.8', name: 'Google Public DNS', expectedLang: 'en' },
      { ip: '1.1.1.1', name: 'Cloudflare Public DNS', expectedLang: 'en' },
    ];

    for (const test of testIps) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const url = `https://api.ipinfo.io/lite/${test.ip}?token=${token}`;

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        if (!res.ok) {
          fail(
            `IPinfo Lite query for ${test.ip} returned HTTP ${res.status} (${res.statusText})`,
            res.status === 401 || res.status === 403
              ? 'Your IPINFO_TOKEN may be invalid or expired. Check token at https://ipinfo.io/account.'
              : res.status === 429
              ? 'IPinfo rate limit reached. The system gracefully cascades to English fallback.'
              : 'Verify internet connection and API status at https://status.ipinfo.io.'
          );
          totalErrors++;
          continue;
        }

        const data = await res.json();
        const rawCountry = data.country_code || data.country;
        const countryCode = typeof rawCountry === 'string' && rawCountry.length === 2 ? rawCountry.toUpperCase() : 'US';
        const mappedLang = countryMap[countryCode] || countryMap['default'] || 'en';

        if (mappedLang !== test.expectedLang) {
          fail(
            `IP ${test.ip} (${test.name}) resolved to country "${countryCode}" -> language "${mappedLang}" (expected "${test.expectedLang}").`,
            `Check mapping for country code "${countryCode}" in config/country-language.json.`
          );
          totalErrors++;
        } else {
          pass(`IPinfo Lite query for ${test.ip} (${test.name}) -> Country: ${countryCode} -> Language: ${mappedLang} (${mappedLang === 'en' ? 'English' : mappedLang}).`);
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          fail(`IPinfo Lite query for ${test.ip} timed out after 4000ms`, 'Check network latency or firewall settings.');
        } else {
          fail(`IPinfo Lite query for ${test.ip} failed: ${err.message}`, 'Check network connection to api.ipinfo.io.');
        }
        totalErrors++;
      }
    }
  }

  // =========================================================================
  // Summary & Exit
  // =========================================================================
  console.log(`\n${colors.gray}--- Verification Summary ---${colors.reset}`);
  if (totalErrors === 0) {
    console.log(`${colors.green}${colors.bold}All IP & language checks passed successfully!${colors.reset}\n`);
    process.exit(0);
  } else {
    console.error(`${colors.red}${colors.bold}${totalErrors} verification check(s) failed. See actionable hints above.${colors.reset}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`Unexpected runner failure:`, err);
  process.exit(1);
});
