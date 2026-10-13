'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Dictionary, LanguageMeta, Locale, TextDirection } from './types';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  getLanguage,
  isRTL,
  isValidLocale,
} from './config';
import { loadDictionary, getLoadedDictionary } from './loader';
import { useKindLinkStore } from '../store/useKindLinkStore';
import { dataAdapter } from '../data';

interface I18nContextValue {
  locale: Locale;
  dir: TextDirection;
  isRtl: boolean;
  currentLanguage: LanguageMeta;
  dict: Dictionary;
  isLoading: boolean;
  setLocale: (locale: string) => Promise<void>;
  t: (keyPath: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

interface I18nProviderProps {
  children: React.ReactNode;
  initialLocale?: string;
}

export function I18nProvider({ children, initialLocale }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (initialLocale && isValidLocale(initialLocale)) {
      return initialLocale as Locale;
    }
    return DEFAULT_LOCALE;
  });

  const [dict, setDict] = useState<Dictionary>(() => getLoadedDictionary(locale));
  const [isLoading, setIsLoading] = useState(false);

  const currentLanguage = useMemo(() => getLanguage(locale), [locale]);
  const dir = currentLanguage.dir;
  const isRtl = dir === 'rtl';

  // Apply HTML document attributes
  const applyHtmlAttributes = useCallback((langCode: string, direction: TextDirection) => {
    if (typeof document === 'undefined') return;

    document.documentElement.setAttribute('lang', langCode);
    document.documentElement.setAttribute('dir', direction);

    if (direction === 'rtl') {
      document.documentElement.classList.add('rtl-layout');
    } else {
      document.documentElement.classList.remove('rtl-layout');
    }
  }, []);

  // Set persistence cookies
  const setLocaleCookies = useCallback((langCode: string) => {
    if (typeof document === 'undefined') return;

    const host = window.location.hostname;
    const cookieAge = 60 * 60 * 24 * 365; // 1 year

    document.cookie = `${LOCALE_COOKIE_NAME}=${langCode}; path=/; max-age=${cookieAge}; SameSite=Lax`;
    document.cookie = `googtrans=/en/${langCode}; path=/; max-age=${cookieAge}; SameSite=Lax`;

    if (host && host !== 'localhost') {
      document.cookie = `${LOCALE_COOKIE_NAME}=${langCode}; domain=.${host}; path=/; max-age=${cookieAge}; SameSite=Lax`;
      document.cookie = `googtrans=/en/${langCode}; domain=.${host}; path=/; max-age=${cookieAge}; SameSite=Lax`;
    }
  }, []);

  // Update locale function
  const setLocale = useCallback(
    async (newLocale: string) => {
      if (!isValidLocale(newLocale)) {
        console.warn(`[i18n] Invalid locale code requested: "${newLocale}"`);
        return;
      }

      const validatedLocale = newLocale as Locale;
      setIsLoading(true);

      try {
        const newDict = await loadDictionary(validatedLocale);
        const meta = getLanguage(validatedLocale);

        setLocaleState(validatedLocale);
        setDict(newDict);
        applyHtmlAttributes(validatedLocale, meta.dir);
        setLocaleCookies(validatedLocale);

        if (typeof window !== 'undefined') {
          localStorage.setItem(LOCALE_STORAGE_KEY, validatedLocale);
        }

        // Sync with User Profile state
        try {
          const store = useKindLinkStore.getState();
          if (store.userProfile) {
            store.userProfile.preferred_language = validatedLocale;
          }
          // If logged in, update persistence layer
          if (dataAdapter.updatePreferredLanguage) {
            dataAdapter.updatePreferredLanguage(validatedLocale).catch(() => {});
          }
        } catch {}
      } catch (err) {
        console.error('[i18n] Error switching locale:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [applyHtmlAttributes, setLocaleCookies]
  );

  // Initial client hydration check
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    const candidate = saved && isValidLocale(saved) ? saved : initialLocale;

    if (candidate && isValidLocale(candidate) && candidate !== locale) {
      setLocale(candidate);
    } else {
      applyHtmlAttributes(locale, dir);
      setLocaleCookies(locale);
    }
  }, []);

  // Translation function with parameter interpolation
  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(dict as unknown as Record<string, unknown>, keyPath);

      // Fallback to English if key missing
      if (!value) {
        const enDict = getLoadedDictionary('en');
        value = getNestedValue(enDict as unknown as Record<string, unknown>, keyPath);
      }

      if (!value) {
        return keyPath;
      }

      if (params) {
        for (const [key, val] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${key}\\}`, 'g'), String(val));
        }
      }

      return value;
    },
    [dict]
  );

  const contextValue = useMemo(
    () => ({
      locale,
      dir,
      isRtl,
      currentLanguage,
      dict,
      isLoading,
      setLocale,
      t,
    }),
    [locale, dir, isRtl, currentLanguage, dict, isLoading, setLocale, t]
  );

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an <I18nProvider>');
  }
  return context;
}

// Convenient alias
export const useTranslation = useI18n;
