import countryLanguageConfig from '@/config/country-language.json';
import { SUPPORTED_LANGUAGES, DEFAULT_LOCALE } from '@/lib/translate/googleTranslate';

export const DEFAULT_COUNTRY_LOCALE = 'en';

const SUPPORTED_LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((l) => l.code));

/**
 * Validates whether a language code is currently supported by KindLink's translation engine.
 */
export function isSupportedLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGE_CODES.has(code);
}

/**
 * Parses LANG_COUNTRY_MAP environment variable override string.
 * Supports:
 * - JSON string: '{"FR":"fr","DE":"de"}'
 * - Comma-separated pairs: "FR:fr,DE:de" or "FR=fr, DE=de"
 */
export function parseEnvCountryMap(envValue?: string | null): Record<string, string> {
  if (!envValue || typeof envValue !== 'string') return {};
  const trimmed = envValue.trim();
  if (!trimmed) return {};

  // 1. JSON string format
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
    } catch {
      // Fall through to comma-separated parser
    }
  }

  // 2. Comma-separated pairs (e.g. "FR:fr,DE:de" or "FR=fr, DE=de")
  const result: Record<string, string> = {};
  const pairs = trimmed.split(',');
  for (const pair of pairs) {
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
 * Reads active country-language overrides from environment variable `LANG_COUNTRY_MAP`.
 */
export function getCountryLanguageOverrides(): Record<string, string> {
  const envVal =
    (typeof process !== 'undefined' && process.env?.LANG_COUNTRY_MAP) ||
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_LANG_COUNTRY_MAP) ||
    null;
  return parseEnvCountryMap(envVal);
}

/**
 * Resolves the primary language for a country code according to KindLink country rules.
 *
 * Rules:
 * 1. Checks environment variable overrides (`LANG_COUNTRY_MAP`).
 * 2. Checks `config/country-language.json`.
 * 3. Falls back to default ('en').
 * 4. Validates returned language against SUPPORTED_LANGUAGES.
 *    If unsupported, falls back to 'en'.
 */
export function getLanguageForCountry(countryCode?: string | null): string {
  if (!countryCode || typeof countryCode !== 'string') {
    return DEFAULT_LOCALE;
  }

  const normalizedCountry = countryCode.trim().toUpperCase();
  if (!normalizedCountry) {
    return DEFAULT_LOCALE;
  }

  // 1. Check environment variable override
  const overrides = getCountryLanguageOverrides();
  let mappedLang = overrides[normalizedCountry];

  // 2. Check JSON configuration map
  if (!mappedLang) {
    const baseMap = countryLanguageConfig as Record<string, string>;
    mappedLang = baseMap[normalizedCountry];
  }

  // 3. Fall back to config default or 'en'
  if (!mappedLang) {
    mappedLang = (countryLanguageConfig as Record<string, string>)['default'] || DEFAULT_LOCALE;
  }

  // 4. Validate that returned language exists in SUPPORTED_LANGUAGES
  if (isSupportedLanguage(mappedLang)) {
    return mappedLang;
  }

  return DEFAULT_LOCALE;
}

export const COUNTRY_LANGUAGE_MAP: Record<string, string> = countryLanguageConfig;
