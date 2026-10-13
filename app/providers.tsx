'use client';

import React, { useEffect } from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/lib/i18n';
import { applyReactGoogleTranslatePatch } from '@/lib/translate/googleTranslate';

export function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: string;
}) {
  useEffect(() => {
    // Apply React DOM patch against external translation modifications
    applyReactGoogleTranslatePatch();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider initialLocale={initialLocale}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            className: 'notranslate font-sans',
          }}
        />
      </I18nProvider>
    </ThemeProvider>
  );
}
