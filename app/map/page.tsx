'use client';

import React, { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { Loader2 } from 'lucide-react';

function MapRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setCurrentView, setSelectedRequestId } = useKindLinkStore();

  useEffect(() => {
    const requestId = searchParams.get('request');
    const route = searchParams.get('route');
    if (requestId) {
      setSelectedRequestId(requestId);
    }
    setCurrentView('map');
    const query = new URLSearchParams();
    if (requestId) query.set('request', requestId);
    if (route) query.set('route', route);
    const targetUrl = query.toString() ? `/app?${query.toString()}` : '/app';
    router.replace(targetUrl);
  }, [searchParams, router, setCurrentView, setSelectedRequestId]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
      <p className="text-sm font-semibold text-foreground">Loading Aid Map &amp; Route...</p>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-semibold text-foreground">Loading Aid Map...</p>
        </div>
      }
    >
      <MapRedirectContent />
    </Suspense>
  );
}
