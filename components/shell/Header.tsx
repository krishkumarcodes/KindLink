'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Globe,
  MapPin,
  Siren,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { useLocation } from '@/lib/location/LocationProvider';
import { getCurrentLanguageCode } from '@/lib/translate/googleTranslate';
import { LanguageModal } from './LanguageModal';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { EmergencySosModal } from './EmergencySosModal';
import { LocationModal } from './LocationModal';
import { ProfileQuickMenu } from './ProfileQuickMenu';
import { InstallAppModal } from '@/components/pwa/InstallAppModal';

export function Header() {
  const {
    unreadNotificationCount,
    userProfile,
    setCurrentView,
  } = useKindLinkStore();
  const { userCoords, userAreaName } = useLocation();

  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [currentLangCode, setCurrentLangCode] = useState('en');

  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

  // Sync current language code for display badge
  useEffect(() => {
    setCurrentLangCode(getCurrentLanguageCode());
    const handleLocaleChange = (e: Event) => {
      const custom = e as CustomEvent<{ locale?: string }>;
      if (custom.detail?.locale) {
        setCurrentLangCode(custom.detail.locale);
      }
    };
    window.addEventListener('kindlink:locale-change', handleLocaleChange);
    return () => {
      window.removeEventListener('kindlink:locale-change', handleLocaleChange);
    };
  }, [langOpen]);

  const unreadCount = unreadNotificationCount;

  // Extract user initials
  const initials = userProfile?.name
    ? userProfile.name
        .split(' ')
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const displayAreaName =
    userAreaName?.trim() && userAreaName !== 'Set your area'
      ? userAreaName
      : 'Set your area';

  return (
    <>
      {/* 
        Compact Accessible Header:
        - Height: 56px (h-14), accounts for safe-area-inset-top
        - Single line, perfectly vertically centered within 1px
        - Zero wrap and zero overflow at 360px, 390px, 430px
        - Lighter borders and softer backgrounds
        - Overlays are rendered outside <header> in document.body to avoid backdrop-filter traps
      */}
      <header className="sticky top-0 z-30 w-full border-b border-border/70 bg-card supports-[backdrop-filter]:bg-card/90 dark:supports-[backdrop-filter]:bg-slate-950/90 supports-[backdrop-filter]:backdrop-blur-md pt-[env(safe-area-inset-top,0px)] transition-colors shadow-xs">
        <div className="flex h-14 w-full max-w-[1920px] mx-auto items-center justify-between px-2 sm:px-6">
          {/* LEFT: Brand Logo Emblem (30-32px) + Wordmark "KindLink" (16-17px) + 6px gap + Location Button */}
          <div className="flex items-center gap-1.5 shrink-0 min-w-0">
            {/* KindLink Brand Link */}
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className="group flex items-center gap-1.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl p-0.5 transition-all active:scale-[0.98] shrink-0 touch-target"
              aria-label="KindLink - Help is just next door"
            >
              {/* KindLink Vector Brand Emblem (32px) */}
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <svg
                  viewBox="0 0 64 64"
                  className="h-8 w-8 drop-shadow-xs select-none"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="header-kl-grad"
                      x1="4"
                      y1="4"
                      x2="60"
                      y2="60"
                      gradientUnits="userSpaceOnUse"
                    >
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

                  {/* Squircle Base with Elevation & Refined Dual Rim */}
                  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#header-kl-grad)" />
                  <rect
                    x="2.5"
                    y="2.5"
                    width="59"
                    height="59"
                    rx="15.5"
                    stroke="#FFFFFF"
                    strokeOpacity="0.3"
                    strokeWidth="1"
                  />

                  {/* Rebranded Community Radar Rings */}
                  <circle cx="32" cy="32" r="22" stroke="#FFFFFF" strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="4 2" />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="22"
                    ry="11"
                    transform="rotate(-28 32 32)"
                    stroke="#FFFFFF"
                    strokeOpacity="0.35"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="22"
                    ry="11"
                    transform="rotate(28 32 32)"
                    stroke="#FFFFFF"
                    strokeOpacity="0.35"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />

                  {/* Rebranded Interlocking Heart-Link Vector */}
                  <path
                    d="M 22.5 25.5 C 15.5 18.5, 10 25.5, 10 33 C 10 40.5, 19.5 48, 32 53 C 44.5 48, 54 40.5, 54 33 C 54 25.5, 48.5 18.5, 41.5 25.5 C 37 30, 32 35, 32 35 C 32 35, 27 30, 22.5 25.5 Z"
                    fill="#FFFFFF"
                    fillOpacity="0.96"
                  />

                  {/* Inner Dimension Arch */}
                  <path
                    d="M 25 28 C 28.5 32.5, 32 36, 32 36 C 32 36, 35.5 32.5, 39 28"
                    stroke="#0D9488"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Central Emergency Beacon Pulse */}
                  <circle cx="32" cy="31" r="5.5" fill="url(#header-kl-beacon)" filter="url(#header-kl-glow)" />
                  <circle cx="32" cy="31" r="2" fill="#FFFFFF" />
                  <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
                </svg>
              </div>

              {/* Brand Typography (16-17px, font-extrabold, single line, hidden on < 360px) */}
              <span className="notranslate text-[16px] sm:text-[17px] font-extrabold tracking-tight whitespace-nowrap leading-none font-heading hidden min-[360px]:flex items-center">
                <span className="text-foreground transition-colors">Kind</span>
                <span className="text-primary transition-colors">Link</span>
              </span>
            </button>

            {/* 6px gap is gap-1.5 above */}

            {/* Location Button (icon only, 40px, status dot, 44px touch target) */}
            <button
              type="button"
              onClick={() => setLocationOpen(true)}
              className="relative inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted text-foreground transition-colors touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0 group"
              aria-label="Change location"
              title={`Change location (Current: ${displayAreaName})`}
            >
              <MapPin className="h-4 w-4 text-primary shrink-0 notranslate group-hover:scale-105 transition-transform" />
              {/* Status dot: emerald pulse when live GPS is active, amber when static/denied */}
              {userCoords.isLive ? (
                <span className="absolute top-1 right-1 flex h-2 w-2" aria-hidden="true">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1 ring-card" />
                </span>
              ) : (
                <span
                  className="absolute top-1 right-1 flex h-2 w-2 rounded-full bg-amber-500 ring-1 ring-card"
                  aria-hidden="true"
                />
              )}
            </button>
          </div>

          {/* RIGHT: SOS Button + Language Button + Notification Bell + Profile Avatar */}
          <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 shrink-0">
            {/* SOS Button: Pill 36-40px high with siren icon and "SOS", red and prominent */}
            <button
              type="button"
              onClick={() => setSosOpen(true)}
              className="relative overflow-hidden inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-2.5 xs:px-3 sm:px-3.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs shadow-sm shadow-red-600/25 transition-all duration-150 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 shrink-0 group"
              aria-label="Emergency SOS"
              title="Emergency SOS"
            >
              <span
                className="absolute inset-0 rounded-xl bg-white/20 animate-pulse motion-reduce:animate-none pointer-events-none"
                aria-hidden="true"
              />
              <Siren className="h-4 w-4 shrink-0 notranslate group-hover:scale-110 transition-transform" />
              <span className="tracking-wider font-black text-xs">SOS</span>
            </button>

            {/* Language Selector Button: 40px button with globe icon and 2-letter uppercase code */}
            <button
              type="button"
              onClick={() => setLangOpen(true)}
              className="inline-flex items-center justify-center gap-1 h-9 sm:h-10 px-1.5 xs:px-2 sm:px-2.5 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted text-foreground transition-colors touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label={`Switch language. Current: ${currentLangCode.toUpperCase()}`}
              title="Change Language"
            >
              <Globe className="h-4 w-4 text-primary shrink-0 notranslate" />
              <span className="notranslate text-[11px] font-bold uppercase tracking-wider">{currentLangCode}</span>
            </button>

            {/* Notifications Bell Button: 40px with red unread count badge */}
            <button
              ref={bellButtonRef}
              type="button"
              onClick={() => {
                if (profileMenuOpen) setProfileMenuOpen(false);
                setNotifOpen((prev) => !prev);
                // setNotifOpen(true) toggle trigger
              }}
              className="relative inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-border/70 bg-muted/40 hover:bg-muted text-foreground transition-colors touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
              aria-label={`Notifications, ${unreadCount} unread`}
              title="Notifications"
              aria-expanded={notifOpen}
            >
              <Bell className="h-4 w-4 notranslate shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-600 text-[9px] font-black text-white shadow-xs ring-2 ring-card animate-in zoom-in-75">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar Button: 36-40px with small verified checkmark */}
            <button
              ref={avatarButtonRef}
              type="button"
              onClick={() => {
                if (notifOpen) setNotifOpen(false);
                setProfileMenuOpen((prev) => !prev);
              }}
              className="relative inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-border/70 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-all touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 shrink-0"
              aria-label="Open profile and user menu"
              aria-expanded={profileMenuOpen}
              title="User Profile Menu"
            >
              <span>{initials}</span>
              {userProfile.verificationState === 'verified' && (
                <span
                  className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white ring-2 ring-card"
                  title="Verified Volunteer"
                >
                  ✓
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* 
        SHARED OVERLAY SYSTEM:
        Rendered outside <header> attached to document.body via React portal.
        Eliminates backdrop-filter containing block trap and collision clipping.
      */}
      <NotificationCenter
        open={notifOpen}
        onClose={() => setNotifOpen(false)}
        anchor="bell"
        anchorRef={bellButtonRef}
      />

      <ProfileQuickMenu
        open={profileMenuOpen}
        onClose={() => setProfileMenuOpen(false)}
        anchorRef={avatarButtonRef}
        onOpenSos={() => setSosOpen(true)}
        onOpenLanguage={() => setLangOpen(true)}
      />

      {/* Modals */}
      <LanguageModal open={langOpen} onClose={() => setLangOpen(false)} />
      <EmergencySosModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
      <InstallAppModal />
    </>
  );
}
