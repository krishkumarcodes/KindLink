export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  dir: 'ltr' | 'rtl';
  group: 'indian' | 'international';
  region?: string;
}

export const DEFAULT_LOCALE = 'en';
export const LANG_COOKIE_NAME = 'kindlink_lang';
export const LANG_SOURCE_COOKIE_NAME = 'kindlink_lang_source';
export const LOCALE_COOKIE_NAME = 'kindlink_locale';
export const LOCALE_STORAGE_KEY = 'kindlink_selected_lang';
export const LANG_SOURCE_STORAGE_KEY = 'kindlink_lang_source';
export const LANG_EXPLICIT_TIME_KEY = 'kindlink_lang_explicit_time';
export const LANG_EXPLICIT_SYNCED_KEY = 'kindlink_lang_explicit_synced';
export const GOOGLE_TRANS_COOKIE_NAME = 'googtrans';

export type LanguageSource = 'user' | 'auto';

/**
 * All 29 supported languages confirmed with Google Translate:
 * 17 Indian Languages + 12 International Languages
 */
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  // 1. Indian Languages (17)
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
    script: 'Devanagari',
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

  // 2. International Languages (12)
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
    code: 'zh-CN',
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

export const INDIAN_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.group === 'indian');
export const INTERNATIONAL_LANGUAGES = SUPPORTED_LANGUAGES.filter((l) => l.group === 'international');

export function getLanguage(code: string): LanguageOption {
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === code);
  return match || SUPPORTED_LANGUAGES[0];
}

export interface LanguageDisplayInfo {
  code: string;
  name: string;
  nativeName: string;
  isCustom?: boolean;
}

export function getLanguageDisplay(codeOrName: string): LanguageDisplayInfo {
  if (!codeOrName) return { code: 'en', name: 'English', nativeName: 'English' };
  const trimmed = codeOrName.trim();
  const lower = trimmed.toLowerCase();
  const match = SUPPORTED_LANGUAGES.find(
    (l) => l.code.toLowerCase() === lower || l.name.toLowerCase() === lower
  );
  if (match) {
    return {
      code: match.code,
      name: match.name,
      nativeName: match.nativeName,
    };
  }
  return {
    code: trimmed,
    name: trimmed,
    nativeName: trimmed,
    isCustom: true,
  };
}

export function getLanguageFullName(codeOrName: string): string {
  return getLanguageDisplay(codeOrName).name;
}

export function isRTL(code: string): boolean {
  return code === 'ur' || code === 'ar';
}


/**
 * Patches DOM methods so Google Translate text-node mutations don't crash React reconciliation
 */
export function applyReactGoogleTranslatePatch() {
  if (typeof window === 'undefined') return;
  const win = window as unknown as { __kindlink_gt_patched?: boolean };
  if (win.__kindlink_gt_patched) return;
  win.__kindlink_gt_patched = true;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      return originalRemoveChild.call(this, child) as T;
    } catch (error) {
      if ((error as DOMException)?.name === 'NotFoundError') {
        if (child.parentNode && child.parentNode !== this) {
          try {
            return child.parentNode.removeChild(child) as T;
          } catch {
            return child;
          }
        }
        return child;
      }
      throw error;
    }
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    try {
      return originalInsertBefore.call(this, newNode, referenceNode) as T;
    } catch (error) {
      if ((error as DOMException)?.name === 'NotFoundError') {
        return originalInsertBefore.call(this, newNode, null) as T;
      }
      throw error;
    }
  };

  // Wire up dynamic content translation observer
  setupDynamicContentTranslateObserver();
}

/**
 * Clears googtrans cookie across domains and root paths
 */
export function clearGoogleTransCookie() {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const expired = '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  document.cookie = `googtrans${expired}`;
  if (host) {
    document.cookie = `googtrans${expired} domain=${host};`;
    document.cookie = `googtrans${expired} domain=.${host};`;
    if (host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      const parts = host.split('.');
      if (parts.length > 1) {
        const rootDomain = '.' + parts.slice(-2).join('.');
        document.cookie = `googtrans${expired} domain=${rootDomain};`;
      }
    }
  }
}

/**
 * Reads a document cookie by name safely in browser context
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Returns the current language selection source ('user' | 'auto' | null).
 * Explicit user choice always takes highest precedence.
 */
export function getLanguageSource(): LanguageSource | null {
  let cookieVal: string | null = null;
  let localVal: string | null = null;

  if (typeof document !== 'undefined') {
    cookieVal = getCookie(LANG_SOURCE_COOKIE_NAME);
  }
  if (typeof window !== 'undefined') {
    try {
      localVal = localStorage.getItem(LANG_SOURCE_STORAGE_KEY);
    } catch {}
  }

  if (cookieVal === 'user' || localVal === 'user') {
    return 'user';
  }
  if (cookieVal === 'auto' || localVal === 'auto') {
    return 'auto';
  }
  return null;
}

/**
 * Sets kindlink_lang, kindlink_lang_source, kindlink_locale, and googtrans cookies
 * and mirrors into localStorage keys kindlink_selected_lang and kindlink_lang_source.
 */
export function setLanguageCookies(langCode: string, source: LanguageSource = 'user') {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const maxAge = 60 * 60 * 24 * 365; // 1 year

  const setCookiesWithAttributes = (cookiePairs: Array<[string, string]>, domain?: string) => {
    const domainPart = domain ? ` domain=${domain};` : '';
    for (const [name, val] of cookiePairs) {
      document.cookie = `${name}=${val}; path=/; max-age=${maxAge}; SameSite=Lax;${domainPart}`;
    }
  };

  const pairs: Array<[string, string]> = [
    [LANG_COOKIE_NAME, langCode],
    [LANG_SOURCE_COOKIE_NAME, source],
    [LOCALE_COOKIE_NAME, langCode],
  ];

  if (langCode === 'en') {
    clearGoogleTransCookie();
    pairs.push([GOOGLE_TRANS_COOKIE_NAME, '/en/en']);
  } else {
    pairs.push([GOOGLE_TRANS_COOKIE_NAME, `/en/${langCode}`]);
  }

  setCookiesWithAttributes(pairs);

  // Also set with domain if applicable (non-localhost)
  if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.');
    if (parts.length > 1) {
      const rootDomain = '.' + parts.slice(-2).join('.');
      setCookiesWithAttributes(pairs, rootDomain);
    }
    setCookiesWithAttributes(pairs, `.${host}`);
  }

  // Mirror into localStorage
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, langCode);
    localStorage.setItem(LANG_SOURCE_STORAGE_KEY, source);
    if (source === 'user') {
      localStorage.setItem(LANG_EXPLICIT_TIME_KEY, Date.now().toString());
    }
  } catch {}
}

/**
 * Sets googtrans and kindlink cookies across domains and root paths
 */
export function setGoogleTransCookie(langCode: string, source: LanguageSource = 'user') {
  setLanguageCookies(langCode, source);
}

/**
 * Ensures RTL layout is applied to document and body for Urdu (ur) and Arabic (ar)
 */
export function applyTextDirection(langCode: string) {
  if (typeof document === 'undefined') return;
  const rtl = isRTL(langCode);
  const dir = rtl ? 'rtl' : 'ltr';

  document.documentElement.setAttribute('dir', dir);
  if (rtl) {
    document.documentElement.classList.add('rtl-layout');
    if (document.body) document.body.classList.add('rtl-layout');
  } else {
    document.documentElement.classList.remove('rtl-layout');
    if (document.body) document.body.classList.remove('rtl-layout');
  }
}

/**
 * Observes DOM mutations so newly opened modals, bottom sheets, toasts,
 * and dynamic lists are translated when translation is active.
 */
let dynamicObserverInitialized = false;

export function setupDynamicContentTranslateObserver() {
  if (typeof window === 'undefined' || dynamicObserverInitialized) return;
  if (typeof MutationObserver === 'undefined' || !document.body) return;
  dynamicObserverInitialized = true;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const triggerDynamicTranslate = () => {
    const currentCode = getCurrentLanguageCode();
    if (currentCode === 'en') return;

    const selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (selectElem) {
      selectElem.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const observer = new MutationObserver((mutations) => {
    const currentCode = getCurrentLanguageCode();
    if (currentCode === 'en') return;

    let shouldTranslate = false;
    for (const mutation of mutations) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        for (let i = 0; i < mutation.addedNodes.length; i++) {
          const node = mutation.addedNodes[i];
          if (node.nodeType === 1) {
            const el = node as HTMLElement;
            // Ignore Google Translate internal wrappers and marked non-translate nodes
            if (
              el.tagName === 'FONT' ||
              el.id === 'google_translate_element' ||
              el.id?.startsWith('goog-') ||
              el.classList?.contains('skiptranslate') ||
              el.classList?.contains('goog-te-banner-frame') ||
              el.classList?.contains('goog-te-menu-frame') ||
              el.classList?.contains('notranslate') ||
              el.getAttribute('translate') === 'no'
            ) {
              continue;
            }
            shouldTranslate = true;
            break;
          }
        }
      }
      if (shouldTranslate) break;
    }

    if (shouldTranslate) {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(triggerDynamicTranslate, 350);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  window.addEventListener('kindlink:dom-updated', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(triggerDynamicTranslate, 100);
  });
}

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    __googleTranslateInitialized?: boolean;
    __googleTranslateScriptLoaded?: boolean;
    google?: any;
  }
}

/**
 * Lazy loads the Google Translate script dynamically on demand.
 */
export function loadGoogleTranslateScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.__googleTranslateScriptLoaded && window.__googleTranslateInitialized) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    // 1. Ensure init callback is registered on window
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = function () {
        if (window.__googleTranslateInitialized) return;
        function init() {
          const el = document.getElementById('google_translate_element');
          if (!el) {
            setTimeout(init, 50);
            return;
          }
          try {
            if (window.google && window.google.translate && window.google.translate.TranslateElement) {
              new window.google.translate.TranslateElement(
                {
                  pageLanguage: 'en',
                  includedLanguages:
                    'en,hi,bn,bho,mai,ne,ur,sat,or,as,mr,gu,pa,ta,te,kn,ml,fr,es,de,pt,it,ru,zh-CN,ja,ko,ar,id,tr',
                  autoDisplay: false,
                },
                'google_translate_element'
              );
              window.__googleTranslateInitialized = true;
            }
          } catch (e) {
            console.error('[Google Translate Init Error]', e);
          }
        }
        init();
      };
    }

    // 2. Check if script tag already exists
    if (document.getElementById('google-translate-script')) {
      window.__googleTranslateScriptLoaded = true;
      resolve();
      return;
    }

    // 3. Dynamically insert script
    const script = document.createElement('script');
    script.id = 'google-translate-script';
    script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    script.async = true;
    script.onload = () => {
      window.__googleTranslateScriptLoaded = true;
      resolve();
    };
    script.onerror = () => {
      resolve();
    };
    document.body.appendChild(script);
  });
}

/**
 * Lazy loads Google Translate only when language != 'en' and browser is idle.
 * Completely skips loading on initial visits for English users.
 */
export function initGoogleTranslateIfNonEnglish(initialLocale?: string) {
  if (typeof window === 'undefined') return;

  const code = initialLocale || getCurrentLanguageCode();
  if (code && code !== 'en') {
    // Idle load
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(
        () => {
          loadGoogleTranslateScript();
        },
        { timeout: 3500 }
      );
    } else {
      setTimeout(() => {
        loadGoogleTranslateScript();
      }, 1200);
    }
  }
}

/**
 * Triggers instant native and widget language change without reloading,
 * with a 3-second fallback to cookie persistence & single reload.
 */
export function changeLanguageInstantly(langCode: string, source: LanguageSource = 'user') {
  if (typeof window === 'undefined') return;

  const validLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  const targetCode = validLang ? validLang.code : DEFAULT_LOCALE;

  // 1. Update HTML attributes:
  // The source document is English, so lang="en" must remain on <html> so Google Translate knows
  // the source language. Target language is tracked in data-current-lang.
  document.documentElement.setAttribute('lang', 'en');
  document.documentElement.setAttribute('data-current-lang', targetCode);
  applyTextDirection(targetCode);

  // 2. Set Cookies and LocalStorage
  setLanguageCookies(targetCode, source);

  // 3. Dispatch custom event for React components
  window.dispatchEvent(
    new CustomEvent('kindlink:locale-change', { detail: { locale: targetCode, source } })
  );

  // If changing back to English ('en')
  if (targetCode === 'en') {
    clearGoogleTransCookie();
    document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
    const select = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
    if (select) {
      const opt = select.querySelector('option[value=""]') || select.querySelector('option[value="en"]');
      if (opt) {
        select.value = opt.getAttribute('value') || '';
      } else {
        select.selectedIndex = 0;
      }
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const wasTranslated =
      document.documentElement.classList.contains('translated-ltr') ||
      document.documentElement.classList.contains('translated-rtl') ||
      document.querySelector('font') !== null;
    if (wasTranslated) {
      setTimeout(() => {
        window.location.reload();
      }, 100);
      return;
    }
    return;
  }

  // If changing to non-English, ensure widget script is loaded
  loadGoogleTranslateScript();

  // 4. Trigger select element for instant in-place translation
  const triggerSelect = (select: HTMLSelectElement) => {
    let matched = false;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === targetCode) {
        select.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      select.value = targetCode;
    }
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  let selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (selectElem) {
    triggerSelect(selectElem);
  } else {
    // Fast polling: check every 40ms for the combo element to mount
    const startTime = Date.now();
    const pollInterval = setInterval(() => {
      selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (selectElem) {
        clearInterval(pollInterval);
        triggerSelect(selectElem);
      } else if (Date.now() - startTime > 1600) {
        clearInterval(pollInterval);
        // Fallback: single reload with googtrans cookie active for automatic translation
        window.location.reload();
      }
    }, 40);
  }
}

/**
 * Gets currently active language code according to Priority Order:
 * 1) User explicit choice (kindlink_lang_source === 'user')
 * 2) Previous auto detection (kindlink_lang_source === 'auto')
 * 3) New auto detection (from cookie or googtrans)
 * 4) English ('en')
 */
export function getCurrentLanguageCode(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const source = getLanguageSource();

  const getValidCode = (candidate?: string | null): string | null => {
    if (!candidate) return null;
    return SUPPORTED_LANGUAGES.some((l) => l.code === candidate) ? candidate : null;
  };

  // 1) User explicit choice (source === 'user')
  if (source === 'user') {
    // Check localStorage first
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      const valid = getValidCode(stored);
      if (valid) return valid;
    } catch {}

    // Check kindlink_lang cookie
    if (typeof document !== 'undefined') {
      const cookieLang = getValidCode(getCookie(LANG_COOKIE_NAME));
      if (cookieLang) return cookieLang;

      const legacyCookie = getValidCode(getCookie(LOCALE_COOKIE_NAME));
      if (legacyCookie) return legacyCookie;

      const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z-]+)/);
      if (match && getValidCode(match[1])) return match[1];
    }
  }

  // 2) Previous auto detection (source === 'auto')
  if (source === 'auto') {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
      const valid = getValidCode(stored);
      if (valid) return valid;
    } catch {}

    if (typeof document !== 'undefined') {
      const cookieLang = getValidCode(getCookie(LANG_COOKIE_NAME));
      if (cookieLang) return cookieLang;

      const legacyCookie = getValidCode(getCookie(LOCALE_COOKIE_NAME));
      if (legacyCookie) return legacyCookie;
    }
  }

  // 3) New auto detection: check if cookie is present from edge / server detect
  if (typeof document !== 'undefined') {
    const cookieLang = getValidCode(getCookie(LANG_COOKIE_NAME));
    if (cookieLang) return cookieLang;

    const legacyCookie = getValidCode(getCookie(LOCALE_COOKIE_NAME));
    if (legacyCookie) return legacyCookie;

    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z-]+)/);
    if (match && getValidCode(match[1])) return match[1];
  }

  // Check localStorage fallback if source was unset
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const valid = getValidCode(stored);
    if (valid) return valid;
  } catch {}

  // 4) English default
  return DEFAULT_LOCALE;
}

/**
 * Asynchronously detects user locale via /api/locale/detect if no user explicit choice
 * or previous auto detection has occurred.
 *
 * Rule: Once source is 'user', automatic detection NEVER runs or overrides again.
 */
export async function detectAndApplyLanguage(): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const source = getLanguageSource();

  // Once source is 'user', automatic detection NEVER runs or overrides again
  if (source === 'user') {
    return getCurrentLanguageCode();
  }

  // If already auto-detected previously, do not re-detect/override
  if (source === 'auto') {
    return getCurrentLanguageCode();
  }

  // Check if server set kindlink_lang cookie
  const cookieLang = getCookie(LANG_COOKIE_NAME);
  if (cookieLang && SUPPORTED_LANGUAGES.some((l) => l.code === cookieLang)) {
    changeLanguageInstantly(cookieLang, 'auto');
    return cookieLang;
  }

  // Check /api/locale/detect
  try {
    const res = await fetch('/api/locale/detect', { method: 'GET' });
    if (res.ok) {
      const data = await res.json();
      const detected = data.language || data.locale || data.lang;
      if (detected && SUPPORTED_LANGUAGES.some((l) => l.code === detected)) {
        // Re-verify that user has not made an explicit selection during the fetch
        if (getLanguageSource() !== 'user') {
          changeLanguageInstantly(detected, 'auto');
          return detected;
        }
      }
    }
  } catch (err) {
    console.debug('[LanguageEngine] Auto detection fetch skipped:', err);
  }

  return DEFAULT_LOCALE;
}

export interface UserProfileLanguageSyncInput {
  preferredLanguage?: string | null;
  preferred_language?: string | null;
}

/**
 * Account Sync:
 * - For logged-in users, if profile has a saved preferredLanguage, apply it. Never write an 'auto' language to user account.
 * - If logged out user picks explicit language and then logs in, most recent explicit choice wins.
 */
export async function syncAccountLanguage(
  profile?: UserProfileLanguageSyncInput | null
): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const profileLang = profile?.preferredLanguage || profile?.preferred_language;
  const currentSource = getLanguageSource();
  const currentLang = getCurrentLanguageCode();

  // Check if user made an unsynced explicit choice (e.g. while logged out before logging in)
  let isUnsyncedExplicitChoice = false;
  try {
    isUnsyncedExplicitChoice =
      currentSource === 'user' &&
      localStorage.getItem(LANG_EXPLICIT_SYNCED_KEY) === 'false';
  } catch {}

  // Rule: If logged out user picks explicit language and then logs in, most recent explicit choice wins
  if (isUnsyncedExplicitChoice && currentLang) {
    try {
      localStorage.setItem(LANG_EXPLICIT_SYNCED_KEY, 'true');
    } catch {}

    // Persist to user profile
    fetch('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preferredLanguage: currentLang }),
    }).catch(() => {});

    changeLanguageInstantly(currentLang, 'user');
    return currentLang;
  }

  // Rule: For logged-in users, if profile has a saved preferredLanguage, apply it.
  if (profileLang && SUPPORTED_LANGUAGES.some((l) => l.code === profileLang)) {
    try {
      localStorage.setItem(LANG_EXPLICIT_SYNCED_KEY, 'true');
    } catch {}

    if (currentLang !== profileLang || currentSource !== 'user') {
      changeLanguageInstantly(profileLang, 'user');
    }
    return profileLang;
  }

  // Rule: Never write an 'auto' language to user account
  return currentLang;
}

