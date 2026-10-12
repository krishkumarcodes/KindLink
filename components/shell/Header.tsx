'use client';

import React, { useState } from 'react';
import {
  Bell,
  Globe,
  MapPin,
  Moon,
  Sun,
  AlertTriangle,
  HeartHandshake,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { LanguageModal } from './LanguageModal';
import { NotificationsModal } from './NotificationsModal';
import { EmergencySosModal } from './EmergencySosModal';

export function Header() {
  const { theme, setTheme } = useTheme();
  const { notifications, currentView, setCurrentView } = useKindLinkStore();
  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-border bg-card/90 px-4 backdrop-blur-md transition-colors sm:px-6">
        {/* Brand Logo & Location */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView('home')}
            className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-white shadow-soft">
              <HeartHandshake className="h-6 w-6 notranslate" />
            </div>
            <div>
              <span className="notranslate text-xl font-bold tracking-tight text-foreground block leading-none">
                KindLink
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-primary notranslate inline" />
                <span>Asansol, WB</span>
              </span>
            </div>
          </button>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Emergency SOS Button */}
          <button
            onClick={() => setSosOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-urgency-critical px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 touch-target animate-beacon"
            aria-label="Emergency SOS trigger"
          >
            <AlertTriangle className="h-4 w-4 notranslate" />
            <span className="hidden sm:inline">SOS Emergency</span>
            <span className="sm:hidden">SOS</span>
          </button>

          {/* Language Switcher Button */}
          <button
            onClick={() => setLangOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted touch-target"
            aria-label="Switch Language"
          >
            <Globe className="h-4 w-4 text-primary notranslate" />
            <span className="hidden md:inline">Language</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted touch-target"
            aria-label="Toggle light and dark theme"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400 notranslate" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700 notranslate" />
            )}
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => setNotifOpen(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-background text-foreground transition hover:bg-muted touch-target"
            aria-label="View notifications"
          >
            <Bell className="h-4 w-4 notranslate" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-urgency-critical text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Modals */}
      <LanguageModal open={langOpen} onClose={() => setLangOpen(false)} />
      <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} />
      <EmergencySosModal open={sosOpen} onClose={() => setSosOpen(false)} />
    </>
  );
}
