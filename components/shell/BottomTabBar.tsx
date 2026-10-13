'use client';

import React from 'react';
import { Home, Map as MapIcon, Plus, FileText, User } from 'lucide-react';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';

export function BottomTabBar() {
  const { currentView, setCurrentView, requests } = useKindLinkStore();

  const navItems: { view: AppView; label: string; icon: React.ReactNode }[] = [
    {
      view: 'home',
      label: 'Home',
      icon: <Home className="h-5 w-5 notranslate transition-transform group-hover:scale-110" />,
    },
    {
      view: 'map',
      label: 'Map',
      icon: <MapIcon className="h-5 w-5 notranslate transition-transform group-hover:scale-110" />,
    },
    // Center action handled separately
    {
      view: 'requests',
      label: 'Requests',
      icon: <FileText className="h-5 w-5 notranslate transition-transform group-hover:scale-110" />,
    },
    {
      view: 'profile',
      label: 'Profile',
      icon: <User className="h-5 w-5 notranslate transition-transform group-hover:scale-110" />,
    },
  ];

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 border-t border-border/80 backdrop-blur-xl px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] pt-2 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] select-none"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => setCurrentView('home')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl ${
            currentView === 'home'
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="Home screen"
          aria-current={currentView === 'home' ? 'page' : undefined}
        >
          {currentView === 'home' && (
            <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-primary animate-in fade-in zoom-in-75 duration-150" />
          )}
          <Home className="h-5 w-5 notranslate transition-transform group-active:scale-90" />
          <span className="text-[10px] mt-1 tracking-tight">Home</span>
        </button>

        {/* 2. Map */}
        <button
          type="button"
          onClick={() => setCurrentView('map')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl ${
            currentView === 'map'
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="Live map"
          aria-current={currentView === 'map' ? 'page' : undefined}
        >
          {currentView === 'map' && (
            <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-primary animate-in fade-in zoom-in-75 duration-150" />
          )}
          <MapIcon className="h-5 w-5 notranslate transition-transform group-active:scale-90" />
          <span className="text-[10px] mt-1 tracking-tight">Map</span>
        </button>

        {/* 3. Raised Center + New Request Button */}
        <div className="flex-1 flex justify-center -mt-6">
          <button
            type="button"
            onClick={() => setCurrentView('new')}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:bg-primary/95 active:scale-95 transition-all p-3 border-4 border-background touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              currentView === 'new' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
            }`}
            aria-label="Create new help request"
            title="Ask for Help"
          >
            <Plus className="h-6 w-6 notranslate stroke-[2.75] transition-transform duration-200 group-hover:rotate-90" />
          </button>
        </div>

        {/* 4. Requests */}
        <button
          type="button"
          onClick={() => setCurrentView('requests')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl ${
            currentView === 'requests'
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="All requests"
          aria-current={currentView === 'requests' ? 'page' : undefined}
        >
          {currentView === 'requests' && (
            <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-primary animate-in fade-in zoom-in-75 duration-150" />
          )}
          <div className="relative">
            <FileText className="h-5 w-5 notranslate transition-transform group-active:scale-90" />
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-2.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-xs">
                {requests.length > 99 ? '99+' : requests.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Requests</span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          onClick={() => setCurrentView('profile')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl ${
            currentView === 'profile'
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="User profile"
          aria-current={currentView === 'profile' ? 'page' : undefined}
        >
          {currentView === 'profile' && (
            <span className="absolute -top-1.5 h-1 w-6 rounded-full bg-primary animate-in fade-in zoom-in-75 duration-150" />
          )}
          <User className="h-5 w-5 notranslate transition-transform group-active:scale-90" />
          <span className="text-[10px] mt-1 tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
}

// Export alias for BottomNav
export const BottomNav = BottomTabBar;
