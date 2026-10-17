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
} from 'lucide-react';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';

export function Sidebar() {
  const { currentView, setCurrentView, requests } = useKindLinkStore();

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
      <div className="p-3 lg:p-4">
        <button
          onClick={() => setCurrentView('new')}
          className="group relative flex w-full items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 py-3.5 px-3 font-bold text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 transition-all duration-200 active:scale-[0.98] touch-target"
          title="Ask for Help"
          aria-label="Create new help request"
        >
          <PlusCircle className="h-5 w-5 notranslate shrink-0 transition-transform duration-300 group-hover:rotate-90" />
          <span className="hidden lg:inline text-sm font-extrabold tracking-wide">Ask for Help</span>
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

      {/* Community Project Credit Tag */}
      <div className="p-3 lg:p-4 border-t border-border/80 mt-auto">
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
