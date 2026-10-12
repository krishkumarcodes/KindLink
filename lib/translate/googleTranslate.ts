export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  dir: 'ltr' | 'rtl';
  supportedInWidget: boolean;
  notes?: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    script: 'Latin',
    dir: 'ltr',
    supportedInWidget: true,
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    script: 'Devanagari',
    dir: 'ltr',
    supportedInWidget: true,
  },
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    script: 'Bengali',
    dir: 'ltr',
    supportedInWidget: true,
  },
  {
    code: 'bho',
    name: 'Bhojpuri',
    nativeName: 'भोजपुरी',
    script: 'Devanagari',
    dir: 'ltr',
    supportedInWidget: true,
  },
  {
    code: 'mai',
    name: 'Maithili',
    nativeName: 'मैथिली',
    script: 'Devanagari',
    dir: 'ltr',
    supportedInWidget: true,
  },
  {
    code: 'ne',
    name: 'Nepali',
    nativeName: 'नेपाली',
    script: 'Devanagari',
    dir: 'ltr',
    supportedInWidget: true,
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    script: 'Nastaliq / Arabic',
    dir: 'rtl',
    supportedInWidget: true,
  },
];

// Languages evaluated but not available in Google Translate website widget dropdown:
export const UNSUPPORTED_REGIONAL_LANGUAGES = [
  { name: 'Santali (Ol Chiki)', code: 'sat', reason: 'Not supported in the Google Translate legacy website widget' },
  { name: 'Nagpuri (Sadri)', code: 'sck', reason: 'Not supported by Google Translate' },
  { name: 'Khortha', code: 'kht', reason: 'Not supported by Google Translate' },
  { name: 'Kurukh (Oraon)', code: 'kru', reason: 'Not supported by Google Translate' },
  { name: 'Mundari', code: 'unr', reason: 'Not supported by Google Translate' },
  { name: 'Ho', code: 'hoc', reason: 'Not supported by Google Translate' },
];

/**
 * Patches DOM methods so Google Translate text-node mutations don't crash React
 */
export function applyReactGoogleTranslatePatch() {
  if (typeof window === 'undefined') return;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(child: T): T {
    try {
      return originalRemoveChild.apply(this, [child]) as T;
    } catch (error) {
      if ((error as DOMException)?.name === 'NotFoundError') {
        // Ignored: Google Translate wrapped or modified this node
        return child;
      }
      throw error;
    }
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(newNode: T, referenceNode: Node | null): T {
    try {
      return originalInsertBefore.apply(this, [newNode, referenceNode]) as T;
    } catch (error) {
      if ((error as DOMException)?.name === 'NotFoundError') {
        return originalInsertBefore.apply(this, [newNode, null]) as T;
      }
      throw error;
    }
  };
}

/**
 * Sets googtrans cookie across domains and paths
 */
export function setGoogleTransCookie(langCode: string) {
  if (typeof document === 'undefined') return;
  const cookieVal = `/en/${langCode}`;
  const host = window.location.hostname;
  
  // Set cookie for path /
  document.cookie = `googtrans=${cookieVal}; path=/;`;
  // Also set with domain if applicable
  if (host && host !== 'localhost') {
    document.cookie = `googtrans=${cookieVal}; domain=.${host}; path=/;`;
  }
}

/**
 * Triggers hidden Google Translate widget language change without reloading
 */
export function changeLanguageInstantly(langCode: string) {
  if (typeof window === 'undefined') return;

  const targetLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  const dir = targetLang?.dir || 'ltr';

  // 1. Update HTML attributes
  document.documentElement.setAttribute('lang', langCode);
  document.documentElement.setAttribute('dir', dir);
  if (dir === 'rtl') {
    document.documentElement.classList.add('rtl-layout');
  } else {
    document.documentElement.classList.remove('rtl-layout');
  }

  // 2. Set Cookies and LocalStorage
  setGoogleTransCookie(langCode);
  localStorage.setItem('kindlink_selected_lang', langCode);

  // 3. Trigger hidden select element if widget is loaded
  const selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (selectElem) {
    selectElem.value = langCode;
    selectElem.dispatchEvent(new Event('change', { bubbles: true }));
  } else {
    // If widget hasn't finished initialising yet, cookie is set and it will pick it up on init
  }
}

/**
 * Gets currently active language code
 */
export function getCurrentLanguageCode(): string {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('kindlink_selected_lang');
  if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
    return saved;
  }
  return 'en';
}
