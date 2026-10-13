import {
  SUPPORTED_LANGUAGES as I18N_SUPPORTED_LANGUAGES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  isRTL,
  getLanguage,
} from '@/lib/i18n';

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  dir: 'ltr' | 'rtl';
  supportedInWidget: boolean;
  notes?: string;
  isBeta?: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = I18N_SUPPORTED_LANGUAGES.map((lang) => ({
  code: lang.code,
  name: lang.name,
  nativeName: lang.nativeName,
  script: lang.script,
  dir: lang.dir,
  supportedInWidget: true,
  notes: lang.region,
  isBeta: lang.isBeta,
}));

export const UNSUPPORTED_REGIONAL_LANGUAGES = [
  { name: 'Santali (Ol Chiki)', code: 'sat', reason: 'Now supported natively in KindLink i18n dictionary' },
  { name: 'Nagpuri (Sadri)', code: 'sck', reason: 'Now supported natively in KindLink i18n dictionary (Beta)' },
  { name: 'Khortha', code: 'kht', reason: 'Now supported natively in KindLink i18n dictionary (Beta)' },
  { name: 'Kurukh (Oraon)', code: 'kru', reason: 'Now supported natively in KindLink i18n dictionary (Beta)' },
  { name: 'Mundari', code: 'unr', reason: 'Now supported natively in KindLink i18n dictionary (Beta)' },
  { name: 'Ho', code: 'hoc', reason: 'Now supported natively in KindLink i18n dictionary (Beta)' },
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
 * Sets googtrans and kindlink_locale cookies across domains and paths
 */
export function setGoogleTransCookie(langCode: string) {
  if (typeof document === 'undefined') return;
  const cookieVal = `/en/${langCode}`;
  const host = window.location.hostname;
  const maxAge = 60 * 60 * 24 * 365; // 1 year

  // Set cookies for path /
  document.cookie = `googtrans=${cookieVal}; path=/; max-age=${maxAge}; SameSite=Lax;`;
  document.cookie = `${LOCALE_COOKIE_NAME}=${langCode}; path=/; max-age=${maxAge}; SameSite=Lax;`;

  // Also set with domain if applicable
  if (host && host !== 'localhost') {
    document.cookie = `googtrans=${cookieVal}; domain=.${host}; path=/; max-age=${maxAge}; SameSite=Lax;`;
    document.cookie = `${LOCALE_COOKIE_NAME}=${langCode}; domain=.${host}; path=/; max-age=${maxAge}; SameSite=Lax;`;
  }
}

/**
 * Triggers instant native and widget language change without reloading
 */
export function changeLanguageInstantly(langCode: string) {
  if (typeof window === 'undefined') return;

  const targetLang = getLanguage(langCode);
  const dir = targetLang.dir;

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
  localStorage.setItem(LOCALE_STORAGE_KEY, langCode);

  // 3. Trigger hidden select element if legacy widget is mounted
  const selectElem = document.querySelector('.goog-te-combo') as HTMLSelectElement | null;
  if (selectElem) {
    selectElem.value = langCode;
    selectElem.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // 4. Dispatch custom event for React components
  window.dispatchEvent(new CustomEvent('kindlink:locale-change', { detail: { locale: langCode } }));
}

/**
 * Gets currently active language code
 */
export function getCurrentLanguageCode(): string {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved && I18N_SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
    return saved;
  }
  return DEFAULT_LOCALE;
}
