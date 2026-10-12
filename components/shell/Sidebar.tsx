'use client';

import React from 'react';
import {
  Home,
  FileText,
  Map as MapIcon,
  Atom,
  User,
  Settings,
  PlusCircle,
  ShieldCheck,
  HeartHandshake,
} from 'lucide-react';
import { useKindLinkStore, AppView } from '@/lib/store/useKindLinkStore';

export function Sidebar() {
  const { currentView, setCurrentView, requests } = useKindLinkStore();

  const navItems: { view: AppView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { view: 'home', label: 'Home', icon: <Home className="h-5 w-5 notranslate" /> },
    {
      view: 'requests',
      label: 'Requests',
      icon: <FileText className="h-5 w-5 notranslate" />,
      badge: requests.length,
    },
    { view: 'map', label: 'Live Map', icon: <MapIcon className="h-5 w-5 notranslate" /> },
    { view: 'physics', label: 'Physics Lab', icon: <Atom className="h-5 w-5 notranslate" /> },
    { view: 'profile', label: 'Profile', icon: <User className="h-5 w-5 notranslate" /> },
    { view: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5 notranslate" /> },
  ];

  return (
    <aside className="hidden sm:flex flex-col border-r border-border bg-card transition-all duration-200 sm:w-20 lg:w-64 h-[calc(100dvh-4rem)] sticky top-16 z-20 select-none">
      {/* Ask for help CTA button */}
      <div className="p-3 lg:p-4">
        <button
          onClick={() => setCurrentView('new')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 px-3 font-bold text-white shadow-soft transition-all hover:bg-primary/90 active:scale-[0.98] touch-target"
        >
          <PlusCircle className="h-5 w-5 notranslate shrink-0" />
          <span className="hidden lg:inline text-sm">Ask for Help</span>
        </button>
      </div>

      {/* Main Nav Items */}
      <nav className="flex-1 space-y-1.5 px-2 lg:px-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.view}
              onClick={() => setCurrentView(item.view)}
              className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 transition-colors touch-target ${
                isActive
                  ? 'bg-primary/10 text-primary font-bold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground font-medium'
              } justify-center lg:justify-start`}
            >
              <div className="shrink-0">{item.icon}</div>
              <span className="hidden lg:inline text-sm">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`hidden lg:inline-flex ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* College Project Credit Tag */}
      <div className="p-3 lg:p-4 border-t border-border mt-auto">
        <div className="rounded-2xl bg-muted/60 p-3 hidden lg:block border border-border">
          <div className="flex items-center gap-2 text-primary font-bold text-xs mb-1">
            <Atom className="h-3.5 w-3.5 notranslate" />
            <span>Physics Capstone</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-tight">
            B.Tech CSE Project<br />
            Asansol Engineering College
          </p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="h-3 w-3 notranslate" />
            <span>Verified 100% Free</span>
          </div>
        </div>
        <div className="lg:hidden flex justify-center text-primary" title="Asansol Engineering College Physics Project">
          <HeartHandshake className="h-5 w-5 notranslate" />
        </div>
      </div>
    </aside>
  );
}
