'use client';

import React, { useState } from 'react';
import {
  Bell,
  Globe,
  MapPin,
  Moon,
  Sun,
  AlertTriangle,
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
            className="group flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl p-1 transition-all active:scale-[0.98]"
            aria-label="KindLink - Help is just next door"
          >
            {/* KindLink Vector Brand Emblem */}
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
              <svg
                viewBox="0 0 64 64"
                className="h-10 w-10 drop-shadow-sm select-none"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="header-kl-grad" x1="4" y1="4" x2="60" y2="60" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#0F766E" />
                    <stop offset="40%" stopColor="#0D9488" />
                    <stop offset="75%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#2563EB" />
                  </linearGradient>
                  <radialGradient id="header-kl-beacon" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="50%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </radialGradient>
                  <filter id="header-kl-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Squircle Base with Elevation */}
                <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#header-kl-grad)" />
                <rect x="2.5" y="2.5" width="59" height="59" rx="15.5" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="1" />

                {/* Orbital Antigravity Field Rings (Newtonian Aid Gravity) */}
                <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(-25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                <ellipse cx="32" cy="32" rx="22" ry="11" transform="rotate(25 32 32)" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeDasharray="4 2" />
                <circle cx="32" cy="32" r="18" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.5" />

                {/* Connected Hearts & Hands Mobius Loop (KindLink Emblem) */}
                <path d="M22 28 C18 22, 12 25, 12 32 C12 39, 24 46, 32 50 C40 46, 52 39, 52 32 C52 25, 46 22, 42 28 C39 32, 35 34, 32 34 C29 34, 25 32, 22 28 Z" fill="#FFFFFF" fillOpacity="0.96" />

                {/* Secondary Inner Link Arch */}
                <path d="M23.5 30 C26 33, 29 34.5, 32 34.5 C35 34.5, 38 33, 40.5 30" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" />

                {/* Quantum Core Pulse / Beacon */}
                <circle cx="32" cy="32" r="5" fill="url(#header-kl-beacon)" filter="url(#header-kl-glow)" />
                <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
              </svg>
            </div>

            {/* Brand Typography & Location */}
            <div className="flex flex-col">
              <span className="notranslate text-xl font-extrabold tracking-tight block leading-none font-heading">
                <span className="text-foreground transition-colors">Kind</span>
                <span className="text-primary transition-colors">Link</span>
              </span>
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-primary notranslate inline shrink-0" />
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
