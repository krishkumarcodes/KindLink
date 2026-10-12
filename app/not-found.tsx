'use client';

import React from 'react';
import Link from 'next/link';
import { Home, Compass, HeartHandshake } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background text-foreground">
      <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-soft">
        <HeartHandshake className="w-10 h-10 notranslate" />
      </div>
      
      <span className="text-sm font-semibold tracking-wide uppercase text-primary mb-2">404 Error</span>
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
        Page not found in KindLink
      </h1>
      
      <p className="text-muted-foreground max-w-md mb-8 text-base">
        Help is always nearby, but this specific page seems to have moved or does not exist.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
        <Link
          href="/"
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 text-sm font-medium text-white shadow-soft transition-colors hover:bg-primary/90 touch-target"
        >
          <Home className="w-4 h-4 notranslate" />
          <span>Return Home</span>
        </Link>
        <Link
          href="/#map"
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-card px-6 py-3.5 text-sm font-medium transition-colors hover:bg-muted touch-target"
        >
          <Compass className="w-4 h-4 notranslate" />
          <span>View Live Map</span>
        </Link>
      </div>
    </div>
  );
}
