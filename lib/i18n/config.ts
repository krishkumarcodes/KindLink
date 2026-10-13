import { LanguageMeta, Locale, TextDirection } from './types';
export type { LanguageMeta, Locale, TextDirection };

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_COOKIE_NAME = 'kindlink_locale';
export const LOCALE_STORAGE_KEY = 'kindlink_selected_lang';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  // 1. Indian Languages
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    dir: 'ltr',
    group: 'indian',
    region: 'Pan-India',
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    dir: 'ltr',
    group: 'indian',
    region: 'Pan-India / Jharkhand / Bihar',
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    dir: 'ltr',
    group: 'indian',
    region: 'West Bengal / Asansol',
  },
  {
    code: 'bho',
    name: 'Bhojpuri',
    nativeName: 'भोजपुरी',
    script: 'Devanagari',
    dir: 'ltr',
    group: 'indian',
    region: 'Bihar / Jharkhand',
  },
  {
    code: 'mai',
    name: 'Maithili',
    nativeName: 'मैथिली',
    script: 'Devanagari / Mithilakshar',
    dir: 'ltr',
    group: 'indian',
    region: 'Mithila / Bihar / Jharkhand',
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'Devanagari',
    dir: 'ltr',
    group: 'indian',
    region: 'West Bengal / Sikkim / Nepal',
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    script: 'Nastaliq / Arabic',
    dir: 'rtl',
    group: 'indian',
    region: 'Pan-India / Asansol',
  },
  {
    code: 'sat',
    name: 'Santali (Ol Chiki)',
    nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ',
    script: 'Ol Chiki',
    dir: 'ltr',
    group: 'indian',
    isBeta: true,
    region: 'Jharkhand / Purulia / Asansol',
  },
  {
    code: 'or',
    name: 'Odia',
    nativeName: 'ଓଡ଼ିଆ',
    script: 'Odia',
    dir: 'ltr',
    group: 'indian',
    region: 'Odisha / Jharkhand border',
  },
  {
    code: 'as',
    name: 'Assamese',
    nativeName: 'অসমীয়া',
    script: 'Bengali-Assamese',
    dir: 'ltr',
    group: 'indian',
    region: 'Assam / North East',
  },
  {
    code: 'mr',
    name: 'Marathi',
    nativeName: 'मराठी',
    script: 'Devanagari',
    dir: 'ltr',
    group: 'indian',
    region: 'Maharashtra',
  },
  {
    code: 'gu',
    name: 'Gujarati',
    nativeName: 'ગુજરાતી',
    script: 'Gujarati',
    dir: 'ltr',
    group: 'indian',
    region: 'Gujarat',
  },
  {
    code: 'pa',
    name: 'Punjabi',
    nativeName: 'ਪੰਜਾਬੀ',
    script: 'Gurmukhi',
    dir: 'ltr',
    group: 'indian',
    region: 'Punjab / Pan-India',
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    script: 'Tamil',
    dir: 'ltr',
    group: 'indian',
    region: 'Tamil Nadu',
  },
  {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    script: 'Telugu',
    dir: 'ltr',
    group: 'indian',
    region: 'Andhra Pradesh / Telangana',
  },
  {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    script: 'Kannada',
    dir: 'ltr',
    group: 'indian',
    region: 'Karnataka',
  },
  {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    script: 'Malayalam',
    dir: 'ltr',
    group: 'indian',
    region: 'Kerala',
  },

  // Jharkhand Regional Beta Dialects
  {
    code: 'sck',
    name: 'Nagpuri (Sadri)',
    nativeName: 'नागपुरी',
    script: 'Devanagari',
    dir: 'ltr',
    group: 'indian',
    isBeta: true,
    region: 'Jharkhand (Chota Nagpur)',
  },
  {
    code: 'kht',
    name: 'Khortha',
    nativeName: 'खोरठा',
    script: 'Devanagari',
    dir: 'ltr',
    group: 'indian',
    isBeta: true,
    region: 'Jharkhand (North Chota Nagpur / Santhal Parganas)',
  },
  {
    code: 'kru',
    name: 'Kurukh (Oraon)',
    nativeName: 'कुड़ुख़',
    script: 'Tolong Siki / Devanagari',
    dir: 'ltr',
    group: 'indian',
    isBeta: true,
    region: 'Jharkhand / Chota Nagpur',
  },
  {
    code: 'unr',
    name: 'Mundari',
    nativeName: 'मुंडारी',
    script: 'Mundari Bani / Devanagari',
    dir: 'ltr',
    group: 'indian',
    isBeta: true,
    region: 'Jharkhand / Ranchi / Khunti',
  },
  {
    code: 'hoc',
    name: 'Ho',
    nativeName: 'हो',
    script: 'Warang Citi / Devanagari',
    dir: 'ltr',
    group: 'indian',
    isBeta: true,
    region: 'Jharkhand (Kolhan division)',
  },

  // 2. International Languages
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    script: 'Latin',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    script: 'Latin',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    script: 'Latin',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'pt',
    name: 'Portuguese',
    nativeName: 'Português',
    script: 'Latin',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'it',
    name: 'Italian',
    nativeName: 'Italiano',
    script: 'Latin',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    script: 'Cyrillic',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'zh',
    name: 'Chinese (Simplified)',
    nativeName: '简体中文',
    script: 'Simplified Han',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    script: 'Kanji / Kana',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'ko',
    name: 'Korean',
    nativeName: '한국어',
    script: 'Hangul',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    script: 'Arabic',
    dir: 'rtl',
    group: 'international',
    region: 'International',
  },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    script: 'Latin',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
  {
    code: 'tr',
    name: 'Turkish',
    nativeName: 'Türkçe',
    script: 'Latin',
    dir: 'ltr',
    group: 'international',
    region: 'International',
  },
];

export const INDIAN_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (lang) => lang.group === 'indian'
);

export const INTERNATIONAL_LANGUAGES = SUPPORTED_LANGUAGES.filter(
  (lang) => lang.group === 'international'
);

export function getLanguage(code: string): LanguageMeta {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return match || SUPPORTED_LANGUAGES[0];
}

export function isRTL(code: string): boolean {
  return getLanguage(code).dir === 'rtl';
}

export function isValidLocale(code: string): code is Locale {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}
