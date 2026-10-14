'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Compass, MapPin } from 'lucide-react';

interface PinDropMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
  className?: string;
}

function PinDropMapFallback({ className = 'h-64 sm:h-72 w-full' }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border/80 bg-muted/40 flex flex-col items-center justify-center p-6 text-center text-muted-foreground ${className}`}
    >
      <div className="relative flex items-center justify-center mb-3">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-primary/20 border-t-primary" />
        <div className="absolute inset-0 flex items-center justify-center">
          <MapPin className="h-4 w-4 text-primary animate-pulse notranslate" />
        </div>
      </div>
      <p className="text-xs font-semibold text-foreground">Loading Pin Map...</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        Preparing interactive satellite &amp; street tiles
      </p>
    </div>
  );
}

const DynamicPinDropMapInner = dynamic(() => import('./PinDropMapInner'), {
  ssr: false,
  loading: () => <PinDropMapFallback />,
});

export function PinDropMap(props: PinDropMapProps) {
  return <DynamicPinDropMapInner {...props} />;
}
