'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Home, Map as MapIcon, Plus, FileText, User } from 'lucide-react';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';
import { QuickCategoryArcMenu } from '@/components/shell/QuickCategoryArcMenu';
import { HelpCategory } from '@/lib/data/types';

const HOLD_THRESHOLD_MS = 240;

export function BottomTabBar() {
  const { currentView, setCurrentView, requests, startNewRequestWithCategory } =
    useKindLinkStore();

  const [isArcMenuOpen, setIsArcMenuOpen] = useState(false);
  const [anchorCenter, setAnchorCenter] = useState<{ x: number; y: number } | null>(null);
  const [isChargingPlus, setIsChargingPlus] = useState(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isHoldingRef = useRef(false);
  const pointerDownTimeRef = useRef(0);
  const didTriggerHoldRef = useRef(false);

  const handleTabClick = (view: AppView) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(12);
      } catch {}
    }
    setCurrentView(view);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const rect = e.currentTarget.getBoundingClientRect();
    setAnchorCenter({
      x: Math.round(rect.left + rect.width / 2),
      y: Math.round(rect.top + rect.height / 2),
    });

    isHoldingRef.current = false;
    didTriggerHoldRef.current = false;
    pointerDownTimeRef.current = Date.now();
    setIsChargingPlus(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }

    // Hold (>= 240ms): Triggers QuickCategoryArcMenu overlay
    holdTimerRef.current = setTimeout(() => {
      isHoldingRef.current = true;
      didTriggerHoldRef.current = true;
      setIsChargingPlus(false);
      setIsArcMenuOpen(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate([15, 30, 20]);
        } catch {}
      }
    }, HOLD_THRESHOLD_MS);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsChargingPlus(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const duration = Date.now() - pointerDownTimeRef.current;

    // Tap (< 240ms): Opens normal New Request view (setCurrentView('new'))
    if (!didTriggerHoldRef.current && !isHoldingRef.current && duration < HOLD_THRESHOLD_MS) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(20);
        } catch {}
      }
      setCurrentView('new');
    }

    setTimeout(() => {
      isHoldingRef.current = false;
      didTriggerHoldRef.current = false;
    }, 150);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLButtonElement>) => {
    setIsChargingPlus(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    isHoldingRef.current = false;
    didTriggerHoldRef.current = false;
    setIsArcMenuOpen(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Suppress synthetic clicks after hold-and-drag from firing view changes
    if (didTriggerHoldRef.current || isHoldingRef.current || isArcMenuOpen) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  const handleSelectCategory = (cat: HelpCategory) => {
    setIsArcMenuOpen(false);
    startNewRequestWithCategory(cat);
  };

  return (
    <nav
      className="sm:hidden landscape:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-xl bg-card/90 dark:bg-slate-950/90 border-t border-border/80 dark:border-slate-800/80 px-2 pb-[calc(env(safe-area-inset-bottom,0px)+0.625rem)] pt-2 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] select-none transition-colors"
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

        {/* 3. Center Raised Floating + Action Button (Ultra-Cool Watery Crystal Orb) */}
        <div className="flex-1 flex justify-center -mt-6 relative">
          {/* Ambient backdrop glow with pulsing teal/emerald halo */}
          <div className="absolute -inset-2.5 rounded-full bg-gradient-to-tr from-teal-500/35 via-emerald-500/25 to-teal-400/40 blur-lg animate-pulse pointer-events-none" />
          <div className="absolute -inset-1 rounded-full bg-teal-500/30 blur-md pointer-events-none" />

          {/* Anticipatory 240ms Energy Charge Halo & Expanding Ripple Wave */}
          <div
            className={`pointer-events-none absolute -inset-3 rounded-full transition-all duration-[240ms] ease-out ${
              isChargingPlus && !isArcMenuOpen
                ? 'scale-125 opacity-100 ring-2 ring-teal-300 ring-offset-2 ring-offset-background shadow-[0_0_24px_rgba(45,212,191,0.95)] bg-teal-400/25'
                : 'scale-75 opacity-0 ring-0'
            }`}
            aria-hidden="true"
          />

          <button
            type="button"
            onClick={handleClick}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className={`group relative flex h-14 w-14 items-center justify-center rounded-full overflow-hidden bg-gradient-to-tr from-teal-500 via-emerald-500 to-teal-400 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 text-white shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),0_10px_28px_rgba(13,148,136,0.42)] hover:shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.85),0_12px_32px_rgba(13,148,136,0.55)] active:scale-95 transition-all duration-200 border-[3.5px] border-background dark:border-slate-950 touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              currentView === 'new'
                ? 'ring-4 ring-teal-500/40 ring-offset-2 ring-offset-background dark:ring-offset-slate-950 scale-105'
                : ''
            } ${isArcMenuOpen ? 'scale-105 ring-4 ring-teal-400/50' : ''} ${
              isChargingPlus && !isArcMenuOpen
                ? 'scale-90 shadow-[inset_0_2px_4px_rgba(255,255,255,0.9),0_0_24px_rgba(20,184,166,0.75)] ring-2 ring-teal-400/60'
                : ''
            }`}
            aria-label="Create new help request (Hold for quick categories)"
            title="Ask for Help (Hold for quick categories)"
          >
            {/* Top specular white reflection curve */}
            <span
              className="pointer-events-none absolute inset-x-2 top-0.5 h-3 bg-gradient-to-b from-white/60 via-white/20 to-transparent rounded-full"
              aria-hidden="true"
            />
            {/* Bottom depth ambient shadow */}
            <span
              className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/20 to-transparent rounded-b-full"
              aria-hidden="true"
            />

            {/* Crisp geometrical '+' cross icon with smooth micro-rotation */}
            <Plus
              className={`h-6 w-6 notranslate stroke-[2.75] text-white transition-transform duration-300 relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)] ${
                isArcMenuOpen
                  ? 'rotate-45 scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                  : isChargingPlus
                  ? 'rotate-12 scale-90 text-teal-100 drop-shadow-[0_0_6px_rgba(255,255,255,0.9)]'
                  : 'group-hover:rotate-90 group-active:scale-90'
              }`}
            />
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

      {/* Floating Quick Category Radial Arc Menu */}
      <QuickCategoryArcMenu
        isOpen={isArcMenuOpen}
        onClose={() => setIsArcMenuOpen(false)}
        onSelectCategory={handleSelectCategory}
        anchorCenter={anchorCenter}
      />
    </nav>
  );
}

/** Direct helper function to start a new request with a preselected category */
export function startNewRequestWithCategory(category: HelpCategory) {
  useKindLinkStore.getState().startNewRequestWithCategory(category);
}

// Export alias for BottomNav
export const BottomNav = BottomTabBar;
