'use client';

import React from 'react';
import {
  Home,
  FileText,
  Map as MapIcon,
  User,
  Settings,
  PlusCircle,
  ShieldCheck,
  HeartHandshake,
  Atom,
  Search,
  Download,
} from 'lucide-react';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';
import { usePwaInstall } from '@/lib/pwa/usePwaInstall';

export function Sidebar() {
  const { currentView, setCurrentView, requests } = useKindLinkStore();
  const { isInstalled, triggerInstall } = usePwaInstall();

  const navItems: { view: AppView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { view: 'home', label: 'Home', icon: <Home className="h-5 w-5 notranslate shrink-0" /> },
    {
      view: 'requests',
      label: 'Requests',
      icon: <FileText className="h-5 w-5 notranslate shrink-0" />,
      badge: requests.length,
    },
    { view: 'map', label: 'Live Map', icon: <MapIcon className="h-5 w-5 notranslate shrink-0" /> },
    { view: 'profile', label: 'Profile', icon: <User className="h-5 w-5 notranslate shrink-0" /> },
    { view: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5 notranslate shrink-0" /> },
  ];

  return (
    <aside className="hidden sm:flex flex-col border-r border-border/80 bg-card/95 backdrop-blur-md transition-all duration-300 ease-in-out sm:w-20 lg:w-64 h-[calc(100dvh-var(--header-height))] sticky top-[var(--header-height)] z-20 select-none shadow-[2px_0_12px_rgba(0,0,0,0.02)]">
      {/* Ask for help CTA button */}
      <div className="p-3 lg:p-4 space-y-2">
        <button
          onClick={() => setCurrentView('new')}
          className="group relative flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-500 py-3.5 px-3 font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(13,148,136,0.28)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),0_8px_25px_rgba(13,148,136,0.38)] hover:brightness-105 transition-all duration-200 active:scale-[0.98] touch-target overflow-hidden"
          title="Ask for Help"
          aria-label="Create new help request"
        >
          <span
            className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent"
            aria-hidden="true"
          />
          <PlusCircle className="h-5 w-5 notranslate shrink-0 transition-transform duration-300 group-hover:rotate-90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
          <span className="hidden lg:inline text-sm font-extrabold tracking-wide drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">Ask for Help</span>
        </button>

        {/* Quick Search & Command Palette Trigger (Cmd+K / Ctrl+K) */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('kindlink:open-command-palette'));
            }
          }}
          className="group relative flex w-full items-center justify-center lg:justify-between gap-2 rounded-2xl border border-border/70 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground px-3 py-2.5 text-xs font-semibold transition-all duration-150 touch-target active:scale-[0.98]"
          title="Quick Search & Commands (⌘K or Ctrl+K)"
          aria-label="Quick Search and Command Palette"
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-primary shrink-0 notranslate group-hover:scale-110 transition-transform" />
            <span className="hidden lg:inline">Search...</span>
          </div>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded-lg border border-border/80 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono font-bold text-muted-foreground shadow-xs">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Main Nav Items */}
      <nav className="flex-1 space-y-1.5 px-2.5 lg:px-3 overflow-y-auto" aria-label="Main Navigation">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex w-full items-center gap-3.5 rounded-2xl px-3.5 py-3 transition-all duration-200 touch-target ${
                isActive
                  ? 'bg-primary/10 dark:bg-teal-500/15 text-primary dark:text-teal-300 font-bold shadow-xs border border-primary/25'
                  : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground font-medium border border-transparent'
              } justify-center lg:justify-start`}
            >
              {/* Active Left Indicator Bar */}
              {isActive && (
                <span className="absolute left-1 top-2.5 bottom-2.5 w-1 rounded-full bg-gradient-to-b from-teal-500 to-emerald-400 shadow-[0_0_8px_rgba(13,148,136,0.6)] animate-in fade-in zoom-in-75 duration-200" />
              )}

              {/* Icon Container with Badge Dot on Collapsed Mode */}
              <div className="relative shrink-0 transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="lg:hidden absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-card animate-pulse" />
                )}
              </div>

              {/* Label */}
              <span className="hidden lg:inline text-sm tracking-tight">{item.label}</span>

              {/* Badge Counter (Expanded) */}
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`hidden lg:inline-flex ml-auto text-xs px-2.5 py-0.5 rounded-full font-bold shadow-xs transition-colors ${
                    isActive
                      ? 'bg-gradient-to-r from-teal-600 to-emerald-500 text-white shadow-[0_0_8px_rgba(13,148,136,0.35)]'
                      : 'bg-muted text-muted-foreground border border-border/80'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Community Project Credit Tag & Install App Trigger */}
      <div className="p-3 lg:p-4 border-t border-border/80 mt-auto space-y-2.5">
        {/* Install App Action in Sidebar if not already installed */}
        {!isInstalled && (
          <>
            <button
              type="button"
              onClick={() => triggerInstall()}
              className="group hidden lg:flex w-full items-center gap-2.5 px-3 py-2.5 rounded-2xl border border-teal-500/25 bg-teal-500/10 hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-xs transition-all shadow-xs touch-target text-left"
              title="Install KindLink App"
              aria-label="Install KindLink App on this device"
            >
              <Download className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 notranslate group-hover:translate-y-0.5 transition-transform" />
              <div className="flex flex-col min-w-0">
                <span className="leading-tight">Install App</span>
                <span className="text-[10px] font-normal text-muted-foreground truncate">
                  Fast home screen access
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => triggerInstall()}
              className="lg:hidden flex items-center justify-center h-10 w-10 mx-auto rounded-xl border border-teal-500/25 bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 transition-colors touch-target"
              title="Install KindLink App"
              aria-label="Install KindLink App on this device"
            >
              <Download className="h-4 w-4 notranslate" />
            </button>
          </>
        )}

        <div className="rounded-2xl bg-gradient-to-br from-muted/80 to-muted/40 p-3.5 hidden lg:block border border-border/80 shadow-xs backdrop-blur-xs">
          <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
            <HeartHandshake className="h-3.5 w-3.5 notranslate text-primary" />
            <span className="tracking-wide uppercase text-[11px] font-black">Community Aid</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            KindLink Civic Network<br />
            Asansol &amp; Beyond
          </p>
          <div className="flex items-center gap-1.5 mt-2.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit">
            <ShieldCheck className="h-3 w-3 notranslate shrink-0" />
            <span>Verified 100% Free</span>
          </div>
        </div>
        <div
          className="lg:hidden flex justify-center text-primary hover:text-primary/80 transition-colors p-2"
          title="KindLink Community Project"
        >
          <HeartHandshake className="h-5 w-5 notranslate transition-transform hover:scale-110" />
        </div>
      </div>
    </aside>
  );
}
