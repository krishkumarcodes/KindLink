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
export const LOCALE_COOKIE_NAME = 'kindlink_locale';
export const LOCALE_STORAGE_KEY = 'kindlink_selected_lang';
export const GOOGLE_TRANS_COOKIE_NAME = 'googtrans';

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
  if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.');
    if (parts.length > 1) {
      const rootDomain = '.' + parts.slice(-2).join('.');
      document.cookie = `googtrans${expired} domain=${rootDomain};`;
    }
    document.cookie = `googtrans${expired} domain=.${host};`;
  }
}

/**
 * Sets googtrans and kindlink_locale cookies across domains and root paths
 */
export function setGoogleTransCookie(langCode: string) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const maxAge = 60 * 60 * 24 * 365; // 1 year

  if (langCode === 'en') {
    clearGoogleTransCookie();
    document.cookie = `googtrans=/en/en; path=/; max-age=${maxAge}; SameSite=Lax;`;
    document.cookie = `${LOCALE_COOKIE_NAME}=en; path=/; max-age=${maxAge}; SameSite=Lax;`;
    return;
  }

  const cookieVal = `/en/${langCode}`;

  // Set cookies for path /
  document.cookie = `googtrans=${cookieVal}; path=/; max-age=${maxAge}; SameSite=Lax;`;
  document.cookie = `${LOCALE_COOKIE_NAME}=${langCode}; path=/; max-age=${maxAge}; SameSite=Lax;`;

  // Also set with domain if applicable (non-localhost)
  if (host && host !== 'localhost' && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    const parts = host.split('.');
    if (parts.length > 1) {
      const rootDomain = '.' + parts.slice(-2).join('.');
      document.cookie = `googtrans=${cookieVal}; domain=${rootDomain}; path=/; max-age=${maxAge}; SameSite=Lax;`;
      document.cookie = `${LOCALE_COOKIE_NAME}=${langCode}; domain=${rootDomain}; path=/; max-age=${maxAge}; SameSite=Lax;`;
    }
    document.cookie = `googtrans=${cookieVal}; domain=.${host}; path=/; max-age=${maxAge}; SameSite=Lax;`;
    document.cookie = `${LOCALE_COOKIE_NAME}=${langCode}; domain=.${host}; path=/; max-age=${maxAge}; SameSite=Lax;`;
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

/**
 * Triggers instant native and widget language change without reloading,
 * with a 3-second fallback to cookie persistence & single reload.
 */
export function changeLanguageInstantly(langCode: string) {
  if (typeof window === 'undefined') return;

  const validLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  const targetCode = validLang ? validLang.code : DEFAULT_LOCALE;
  const dir = isRTL(targetCode) ? 'rtl' : 'ltr';

  // 1. Update HTML attributes:
  // The source document is English, so lang="en" must remain on <html> so Google Translate knows
  // the source language. Target language is tracked in data-current-lang.
  document.documentElement.setAttribute('lang', 'en');
  document.documentElement.setAttribute('data-current-lang', targetCode);
  document.documentElement.setAttribute('dir', dir);
  if (dir === 'rtl') {
    document.documentElement.classList.add('rtl-layout');
  } else {
    document.documentElement.classList.remove('rtl-layout');
  }

  // 2. Set Cookies and LocalStorage
  setGoogleTransCookie(targetCode);
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, targetCode);
  } catch {}

  // 3. Dispatch custom event for React components
  window.dispatchEvent(
    new CustomEvent('kindlink:locale-change', { detail: { locale: targetCode } })
  );

  // 4. Trigger hidden select element if legacy widget is mounted
  const triggerSelect = (select: HTMLSelectElement) => {
    let matched = false;
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].value === targetCode) {
        select.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched && targetCode === 'en') {
      for (let i = 0; i < select.options.length; i++) {
        if (select.options[i].value === '' || select.options[i].value === 'en') {
          select.selectedIndex = i;
          matched = true;
          break;
        }
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
  }

  const startTime = Date.now();

  // Retry finding .goog-te-combo if it wasn't ready yet
  if (!selectElem) {
    const pollInterval = setInterval(() => {
      selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
      if (selectElem) {
        clearInterval(pollInterval);
        triggerSelect(selectElem);
      }
      if (Date.now() - startTime > 2500) {
        clearInterval(pollInterval);
      }
    }, 100);
  }

  // 5. 3-second fallback timer
  setTimeout(() => {
    if (targetCode === 'en') {
      document.documentElement.classList.remove('translated-ltr', 'translated-rtl');
      clearGoogleTransCookie();
      return;
    }

    const hasTranslatedClass =
      document.documentElement.classList.contains('translated-ltr') ||
      document.documentElement.classList.contains('translated-rtl');

    if (!hasTranslatedClass) {
      // Reload once safely with guard in sessionStorage
      const fallbackKey = `kindlink_reload_${targetCode}`;
      try {
        const lastFallback = sessionStorage.getItem('kindlink_last_fallback_reload');
        if (lastFallback !== fallbackKey) {
          sessionStorage.setItem('kindlink_last_fallback_reload', fallbackKey);
          setGoogleTransCookie(targetCode);
          window.location.reload();
        }
      } catch {
        window.location.reload();
      }
    }
  }, 3000);
}

/**
 * Gets currently active language code from LocalStorage or cookies
 */
export function getCurrentLanguageCode(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
  } catch {}

  if (typeof document !== 'undefined') {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z-]+)/);
    if (match && match[1] && SUPPORTED_LANGUAGES.some((l) => l.code === match[1])) {
      return match[1];
    }
  }

  return DEFAULT_LOCALE;
}

