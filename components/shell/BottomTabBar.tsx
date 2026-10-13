'use client';

import React from 'react';
import { Home, Map as MapIcon, Plus, FileText, User } from 'lucide-react';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';

export function BottomTabBar() {
  const { currentView, setCurrentView, requests } = useKindLinkStore();

  const handleTabClick = (view: AppView) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(12);
    }
    setCurrentView(view);
  };

  const handleCenterClick = () => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(20);
    }
    setCurrentView('new');
  };

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-card/90 dark:bg-slate-950/90 border-t border-border/80 dark:border-slate-800/80 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] select-none transition-colors"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {/* 1. Home */}
        <button
          type="button"
          onClick={() => handleTabClick('home')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl ${
            currentView === 'home'
              ? 'text-primary dark:text-teal-400 font-extrabold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="Home screen"
          aria-current={currentView === 'home' ? 'page' : undefined}
        >
          {currentView === 'home' && (
            <span className="absolute -top-1.5 h-1 w-7 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(13,148,136,0.6)] animate-in fade-in zoom-in-75 duration-200" />
          )}
          <Home className="h-5 w-5 notranslate transition-transform duration-200 group-hover:scale-110 group-active:scale-90" />
          <span className="text-[10px] mt-1 tracking-tight">Home</span>
        </button>

        {/* 2. Map */}
        <button
          type="button"
          onClick={() => handleTabClick('map')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl ${
            currentView === 'map'
              ? 'text-primary dark:text-teal-400 font-extrabold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="Live map"
          aria-current={currentView === 'map' ? 'page' : undefined}
        >
          {currentView === 'map' && (
            <span className="absolute -top-1.5 h-1 w-7 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(13,148,136,0.6)] animate-in fade-in zoom-in-75 duration-200" />
          )}
          <MapIcon className="h-5 w-5 notranslate transition-transform duration-200 group-hover:scale-110 group-active:scale-90" />
          <span className="text-[10px] mt-1 tracking-tight">Map</span>
        </button>

        {/* 3. Center Raised Floating + Action Button */}
        <div className="flex-1 flex justify-center -mt-6 relative">
          {/* Ambient pulse glow behind floating button */}
          <div className="absolute -inset-1 rounded-full bg-teal-500/25 blur-md animate-pulse pointer-events-none" />

          <button
            type="button"
            onClick={handleCenterClick}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-teal-600 via-teal-500 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white shadow-lg shadow-teal-600/35 hover:shadow-teal-500/50 active:scale-95 transition-all duration-200 p-3 border-[3.5px] border-background dark:border-slate-950 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              currentView === 'new'
                ? 'ring-4 ring-teal-500/40 ring-offset-2 ring-offset-background dark:ring-offset-slate-950 scale-105'
                : ''
            }`}
            aria-label="Create new help request"
            title="Ask for Help"
          >
            <Plus className="h-6 w-6 notranslate stroke-[2.75] transition-transform duration-300 group-hover:rotate-90 group-active:scale-90" />
          </button>
        </div>

        {/* 4. Requests */}
        <button
          type="button"
          onClick={() => handleTabClick('requests')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl ${
            currentView === 'requests'
              ? 'text-primary dark:text-teal-400 font-extrabold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="All requests"
          aria-current={currentView === 'requests' ? 'page' : undefined}
        >
          {currentView === 'requests' && (
            <span className="absolute -top-1.5 h-1 w-7 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(13,148,136,0.6)] animate-in fade-in zoom-in-75 duration-200" />
          )}
          <div className="relative">
            <FileText className="h-5 w-5 notranslate transition-transform duration-200 group-hover:scale-110 group-active:scale-90" />
            {requests.length > 0 && (
              <span className="absolute -top-1.5 -right-3 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-teal-600 to-emerald-600 text-[9px] font-black text-white shadow-[0_0_8px_rgba(13,148,136,0.5)] ring-2 ring-background dark:ring-slate-950">
                {requests.length > 99 ? '99+' : requests.length}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1 tracking-tight">Requests</span>
        </button>

        {/* 5. Profile */}
        <button
          type="button"
          onClick={() => handleTabClick('profile')}
          className={`group relative flex flex-col items-center justify-center flex-1 py-1 min-h-[48px] touch-target transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl ${
            currentView === 'profile'
              ? 'text-primary dark:text-teal-400 font-extrabold'
              : 'text-muted-foreground hover:text-foreground font-medium'
          }`}
          aria-label="User profile"
          aria-current={currentView === 'profile' ? 'page' : undefined}
        >
          {currentView === 'profile' && (
            <span className="absolute -top-1.5 h-1 w-7 rounded-full bg-gradient-to-r from-teal-500 to-emerald-400 shadow-[0_0_10px_rgba(13,148,136,0.6)] animate-in fade-in zoom-in-75 duration-200" />
          )}
          <User className="h-5 w-5 notranslate transition-transform duration-200 group-hover:scale-110 group-active:scale-90" />
          <span className="text-[10px] mt-1 tracking-tight">Profile</span>
        </button>
      </div>
    </nav>
  );
}

// Export alias for BottomNav
export const BottomNav = BottomTabBar;
