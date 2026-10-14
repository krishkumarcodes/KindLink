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
  LOCALE_STORAGE_KEY,
  getLanguage,
  isRTL,
  isValidLocale,
} from './config';
import { getLoadedDictionary } from './loader';
import { changeLanguageInstantly, getCurrentLanguageCode } from '../translate/googleTranslate';
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

  const dict = useMemo<Dictionary>(() => getLoadedDictionary(), []);
  const [isLoading, setIsLoading] = useState(false);

  const currentLanguage = useMemo(() => getLanguage(locale), [locale]);
  const dir = currentLanguage.dir;
  const isRtl = dir === 'rtl';

  // Update locale function - delegates to Google Translate engine
  const setLocale = useCallback(
    async (newLocale: string) => {
      if (!isValidLocale(newLocale)) {
        console.warn(`[i18n] Invalid locale code requested: "${newLocale}"`);
        return;
      }

      const validatedLocale = newLocale as Locale;
      setIsLoading(true);

      try {
        setLocaleState(validatedLocale);
        changeLanguageInstantly(validatedLocale);

        // Sync with User Profile state
        try {
          const store = useKindLinkStore.getState();
          if (store.userProfile) {
            store.userProfile.preferred_language = validatedLocale;
          }
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
    []
  );

  // Initial client hydration check and custom event listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentCode = getCurrentLanguageCode();
    if (currentCode && isValidLocale(currentCode) && currentCode !== locale) {
      setLocaleState(currentCode as Locale);
    }

    const handleLocaleEvent = (e: Event) => {
      const custom = e as CustomEvent<{ locale: string }>;
      if (custom.detail?.locale && isValidLocale(custom.detail.locale)) {
        setLocaleState(custom.detail.locale as Locale);
      }
    };

    window.addEventListener('kindlink:locale-change', handleLocaleEvent);
    return () => {
      window.removeEventListener('kindlink:locale-change', handleLocaleEvent);
    };
  }, []);

  // Translation function with parameter interpolation (English baseline)
  const t = useCallback(
    (keyPath: string, params?: Record<string, string | number>): string => {
      let value = getNestedValue(dict as unknown as Record<string, unknown>, keyPath);

      if (!value) {
        const enDict = getLoadedDictionary();
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

export const useTranslation = useI18n;
