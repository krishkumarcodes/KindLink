'use client';

import React from 'react';
import { Home, Map as MapIcon, Plus, FileText, User } from 'lucide-react';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';

export function BottomTabBar() {
  const { currentView, setCurrentView, requests } = useKindLinkStore();

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border backdrop-blur-lg px-2 pb-[env(safe-area-inset-bottom,0.75rem)] pt-1.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around">
        {/* 1. Home */}
        <button
          onClick={() => setCurrentView('home')}
          className={`flex flex-col items-center justify-center flex-1 py-1 touch-target ${
            currentView === 'home' ? 'text-primary font-bold' : 'text-muted-foreground'
          }`}
          aria-label="Home screen"
        >
          <Home className="h-5 w-5 notranslate" />
          <span className="text-[10px] mt-1">Home</span>
        </button>

        {/* 2. Map */}
        <button
          onClick={() => setCurrentView('map')}
          className={`flex flex-col items-center justify-center flex-1 py-1 touch-target ${
            currentView === 'map' ? 'text-primary font-bold' : 'text-muted-foreground'
          }`}
          aria-label="Live map"
        >
          <MapIcon className="h-5 w-5 notranslate" />
          <span className="text-[10px] mt-1">Map</span>
        </button>

        {/* 3. Raised Center + New Request Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            onClick={() => setCurrentView('new')}
            className="flex h-13 w-13 items-center justify-center rounded-full bg-primary text-white shadow-glow hover:bg-primary/90 active:scale-95 transition-all p-3 border-4 border-background touch-target"
            aria-label="Create new help request"
          >
            <Plus className="h-6 w-6 notranslate stroke-[2.5]" />
          </button>
        </div>

        {/* 4. Requests */}
        <button
          onClick={() => setCurrentView('requests')}
          className={`relative flex flex-col items-center justify-center flex-1 py-1 touch-target ${
            currentView === 'requests' ? 'text-primary font-bold' : 'text-muted-foreground'
          }`}
          aria-label="All requests"
        >
          <FileText className="h-5 w-5 notranslate" />
          <span className="text-[10px] mt-1">Requests</span>
          {requests.length > 0 && (
            <span className="absolute top-0 right-3 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
              {requests.length}
            </span>
          )}
        </button>

        {/* 5. Profile */}
        <button
          onClick={() => setCurrentView('profile')}
          className={`flex flex-col items-center justify-center flex-1 py-1 touch-target ${
            currentView === 'profile' ? 'text-primary font-bold' : 'text-muted-foreground'
          }`}
          aria-label="User profile"
        >
          <User className="h-5 w-5 notranslate" />
          <span className="text-[10px] mt-1">Profile</span>
        </button>
      </div>
    </nav>
  );
}
