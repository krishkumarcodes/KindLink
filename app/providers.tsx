'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { applyReactGoogleTranslatePatch, getCurrentLanguageCode, changeLanguageInstantly } from '@/lib/translate/googleTranslate';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Apply React DOM patch against Google Translate modifications
    applyReactGoogleTranslatePatch();

    // Rehydrate saved language preference
    const savedLang = getCurrentLanguageCode();
    if (savedLang && savedLang !== 'en') {
      changeLanguageInstantly(savedLang);
    }
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={{
          className: 'notranslate font-sans',
        }}
      />
    </ThemeProvider>
  );
}
