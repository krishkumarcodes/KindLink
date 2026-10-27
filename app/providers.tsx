'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n';
import {
  applyReactGoogleTranslatePatch,
  initGoogleTranslateIfNonEnglish,
} from '@/lib/translate/googleTranslate';

import { LocationProvider } from '@/lib/location';
import { runStorageMigration } from '@/lib/utils/storage-migration';
import { initWebVitals } from '@/lib/analytics/vitals';
import { initializeDeviceCapability } from '@/lib/utils/device-capability';
import { LazyMotion, domAnimation } from '@/lib/utils/motion';

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: string;
}) {
  useEffect(() => {
    // 0. Run automated storage migration to eradicate legacy location defaults
    runStorageMigration().catch(() => {});

    // Apply React DOM patch against external translation modifications
    applyReactGoogleTranslatePatch();

    // Initialize low-end device mode & reduced motion automatically
    initializeDeviceCapability();

    // Lazy load Google Translate widget only when language != 'en' and idle
    initGoogleTranslateIfNonEnglish(initialLocale);

    // 1. Initialize text size accessibility preference
    try {
      const savedTextSize = localStorage.getItem('kindlink_text_size');
      if (savedTextSize === 'compact' || savedTextSize === 'large' || savedTextSize === 'normal') {
        document.documentElement.setAttribute('data-text-size', savedTextSize);
        document.documentElement.style.fontSize =
          savedTextSize === 'compact' ? '14px' : savedTextSize === 'large' ? '18.5px' : '16px';
      }
    } catch {}

    // 2. Initialize reduce motion preference
    try {
      const savedMotion = localStorage.getItem('kindlink_reduce_motion');
      if (savedMotion === 'true') {
        document.documentElement.setAttribute('data-reduce-motion', 'true');
      }
    } catch {}

    // 3. Register PWA Service Worker safely
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.debug('[KindLink PWA] SW register skipped:', err));
    }

    // 4. Initialize Core Web Vitals RUM monitoring (10% sampled, zero PII)
    const cleanupVitals = initWebVitals();

    return () => {
      cleanupVitals?.();
    };
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider initialLocale={initialLocale}>
        <LocationProvider>
          <LazyMotion features={domAnimation} strict={false}>
            {children}
            <Toaster
              position="top-right"
              richColors
              closeButton
              style={{ zIndex: 100 }}
              toastOptions={{
                className: 'font-sans',
              }}
            />
          </LazyMotion>
        </LocationProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
