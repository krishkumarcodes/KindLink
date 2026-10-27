'use client';

import React, { useEffect } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected client-side exceptions
    console.error('[GlobalError caught application error]:', error);
  }, [error]);

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 bg-background text-foreground">
      <div className="w-full max-w-md rounded-3xl bg-card border border-border/80 p-6 sm:p-8 shadow-2xl space-y-4 text-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-xs">
          <AlertTriangle className="h-7 w-7 notranslate" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            KindLink encountered an unexpected display issue. Your saved data and requests are safe.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="flex-1 h-12 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold shadow-md hover:bg-primary/90 transition active:scale-[0.98] flex items-center justify-center gap-2 touch-target"
          >
            <RotateCcw className="h-4 w-4 notranslate" />
            <span>Try again</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/app';
              }
            }}
            className="flex-1 h-12 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs sm:text-sm font-semibold transition active:scale-[0.98] flex items-center justify-center gap-2 touch-target shadow-xs"
          >
            <Home className="h-4 w-4 notranslate" />
            <span>Go to App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
