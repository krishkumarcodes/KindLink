/**
 * KindLink Country to Language Mapping
 *
 * Maps ISO 3166-1 alpha-2 country codes to supported KindLink language codes.
 * Fallback is English ('en').
 */

export const COUNTRY_TO_LANGUAGE: Record<string, string> = {
  // French ('fr')
  FR: 'fr',
  BE: 'fr',
  MC: 'fr',
  SN: 'fr',
  CI: 'fr',
  CM: 'fr',
  CD: 'fr',
  CG: 'fr',
  GA: 'fr',
  ML: 'fr',
  GN: 'fr',
  BF: 'fr',
  NE: 'fr',
  TG: 'fr',
  BJ: 'fr',
  BI: 'fr',
  RW: 'fr',
  DJ: 'fr',
  HT: 'fr',
  LU: 'fr',
  MG: 'fr',

  // Spanish ('es')
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PR: 'es',
  PA: 'es',
  UY: 'es',
  GQ: 'es',

  // German ('de')
  DE: 'de',
  AT: 'de',
  LI: 'de',
  CH: 'de',

  // Portuguese ('pt')
  PT: 'pt',
  BR: 'pt',
  AO: 'pt',
  MZ: 'pt',
  GW: 'pt',
  CV: 'pt',
  ST: 'pt',
  TL: 'pt',

  // Italian ('it')
  IT: 'it',
  SM: 'it',
  VA: 'it',

  // Russian ('ru')
  RU: 'ru',
  BY: 'ru',
  KZ: 'ru',
  KG: 'ru',

  // Chinese Simplified ('zh-CN')
  CN: 'zh-CN',
  HK: 'zh-CN',
  MO: 'zh-CN',
  TW: 'zh-CN',
  SG: 'zh-CN',

  // Japanese ('ja')
  JP: 'ja',

  // Korean ('ko')
  KR: 'ko',
  KP: 'ko',

  // Arabic ('ar')
  SA: 'ar',
  AE: 'ar',
  EG: 'ar',
  IQ: 'ar',
  JO: 'ar',
  LB: 'ar',
  KW: 'ar',
  QA: 'ar',
  OM: 'ar',
  YE: 'ar',
  SY: 'ar',
  DZ: 'ar',
  MA: 'ar',
  TN: 'ar',
  LY: 'ar',
  SD: 'ar',
  PS: 'ar',
  BH: 'ar',
  SO: 'ar',
  MR: 'ar',
  KM: 'ar',
  TD: 'ar',

  // Indonesian ('id')
  ID: 'id',

  // Turkish ('tr')
  TR: 'tr',
  CY: 'tr',

  // Bengali ('bn')
  BD: 'bn',

  // Urdu ('ur')
  PK: 'ur',

  // Nepali ('ne')
  NP: 'ne',

  // India ('IN') and Anglophone / Global default ('en')
  IN: 'en',
  US: 'en',
  GB: 'en',
  UK: 'en',
  CA: 'en',
  AU: 'en',
  NZ: 'en',
  IE: 'en',
  ZA: 'en',
};

const SUPPORTED_LANG_CODES = new Set([
  // 17 Indian
  'en', 'hi', 'bn', 'bho', 'mai', 'ne', 'ur', 'sat', 'or', 'as', 'mr', 'gu', 'pa', 'ta', 'te', 'kn', 'ml',
  // 12 International
  'fr', 'es', 'de', 'pt', 'it', 'ru', 'zh-CN', 'ja', 'ko', 'ar', 'id', 'tr',
]);

/**
 * Parses LANG_COUNTRY_MAP environment variable override string.
 */
function parseEnvOverrides(): Record<string, string> {
  const envVal =
    (typeof process !== 'undefined' && process.env?.LANG_COUNTRY_MAP) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LANG_COUNTRY_MAP) ||
    null;
  if (!envVal || typeof envVal !== 'string') return {};
  const trimmed = envVal.trim();
  if (!trimmed) return {};

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const result: Record<string, string> = {};
        for (const [key, val] of Object.entries(parsed)) {
          if (typeof val === 'string') {
            result[key.trim().toUpperCase()] = val.trim();
          }
        }
        return result;
      }
    } catch {}
  }

  const result: Record<string, string> = {};
  for (const pair of trimmed.split(',')) {
    const cleanPair = pair.trim();
    if (!cleanPair) continue;
    const delimiterIdx = cleanPair.search(/[:=]/);
    if (delimiterIdx > 0) {
      const country = cleanPair.substring(0, delimiterIdx).trim().toUpperCase();
      const lang = cleanPair.substring(delimiterIdx + 1).trim();
      if (country && lang) {
        result[country] = lang;
      }
    }
  }
  return result;
}

/**
 * Normalizes any country representation to a 2-letter uppercase ISO code.
 */
export function normalizeCountryCode(countryInput: string | null | undefined): string {
  if (!countryInput || typeof countryInput !== 'string') {
    return 'IN';
  }

  const cleaned = countryInput.trim().toUpperCase();

  // If already 2 letters
  if (/^[A-Z]{2}$/.test(cleaned)) {
    return cleaned;
  }

  // Handle common full country names or aliases
  const nameMap: Record<string, string> = {
    INDIA: 'IN',
    FRANCE: 'FR',
    'UNITED STATES': 'US',
    'UNITED STATES OF AMERICA': 'US',
    USA: 'US',
    'UNITED KINGDOM': 'GB',
    GREATBRITAIN: 'GB',
    GERMANY: 'DE',
    SPAIN: 'ES',
    ITALY: 'IT',
    PORTUGAL: 'PT',
    BRAZIL: 'BR',
    RUSSIA: 'RU',
    CHINA: 'CN',
    JAPAN: 'JP',
    KOREA: 'KR',
    'SOUTH KOREA': 'KR',
    CANADA: 'CA',
    AUSTRALIA: 'AU',
    TURKEY: 'TR',
    INDONESIA: 'ID',
    NEPAL: 'NP',
    BANGLADESH: 'BD',
    PAKISTAN: 'PK',
  };

  return nameMap[cleaned] || 'IN';
}

/**
 * Resolves country code to the preferred KindLink language code.
 * Defaults to 'en' if not mapped or recognized.
 * If mapped language is unsupported, gracefully falls back to 'en'.
 */
export function getLanguageForCountry(countryCode: string | null | undefined): string {
  if (!countryCode || typeof countryCode !== 'string') {
    return 'en';
  }

  const normalized = normalizeCountryCode(countryCode);
  const overrides = parseEnvOverrides();

  let candidate = overrides[normalized] || COUNTRY_TO_LANGUAGE[normalized] || 'en';

  if (!SUPPORTED_LANG_CODES.has(candidate)) {
    return 'en';
  }

  return candidate;
}
