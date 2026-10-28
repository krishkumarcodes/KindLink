'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
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

  const bellButtonRef = useRef<HTMLButtonElement>(null);
  const avatarButtonRef = useRef<HTMLButtonElement>(null);

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
                      <stop offset="25%" stopColor="#0D9488" />
                      <stop offset="65%" stopColor="#06B6D4" />
                      <stop offset="100%" stopColor="#2563EB" />
                    </linearGradient>
                    <linearGradient id="header-kl-rim" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
                      <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.3" />
                    </linearGradient>
                    <radialGradient id="header-kl-beacon" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="35%" stopColor="#F59E0B" />
                      <stop offset="75%" stopColor="#EF4444" />
                      <stop offset="100%" stopColor="#DC2626" />
                    </radialGradient>
                    <filter id="header-kl-glow" x="-30%" y="-30%" width="160%" height="160%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  {/* Squircle Base with Elevation & Refined Dual Rim */}
                  <rect x="3" y="3" width="58" height="58" rx="16" fill="url(#header-kl-grad)" />
                  <rect
                    x="3.5"
                    y="3.5"
                    width="57"
                    height="57"
                    rx="15.5"
                    stroke="url(#header-kl-rim)"
                    strokeWidth="1"
                  />

                  {/* Rebranded Community Radar Rings */}
                  <circle cx="32" cy="32" r="23" stroke="#FFFFFF" strokeOpacity="0.15" strokeWidth="1.2" strokeDasharray="3 2" />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="23"
                    ry="11"
                    transform="rotate(-26 32 32)"
                    stroke="#FFFFFF"
                    strokeOpacity="0.18"
                    strokeWidth="1.5"
                    strokeDasharray="3.5 2"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="23"
                    ry="11"
                    transform="rotate(26 32 32)"
                    stroke="#FFFFFF"
                    strokeOpacity="0.18"
                    strokeWidth="1.5"
                    strokeDasharray="3.5 2"
                  />

                  {/* Rebranded Interlocking Heart-Link Vector */}
                  <path
                    d="M 23 25 C 16 18, 10 25, 10 32.5 C 10 40, 19.5 48, 32 53 C 44.5 48, 54 40, 54 32.5 C 54 25, 48 18, 41 25 C 36.5 29.5, 32 34.5, 32 34.5 C 32 34.5, 27.5 29.5, 23 25 Z"
                    fill="#FFFFFF"
                    fillOpacity="0.97"
                  />

                  {/* Inner Dimension Arch */}
                  <path
                    d="M 25 27.5 C 28.5 32, 32 35.5, 32 35.5 C 32 35.5, 35.5 32, 39 27.5"
                    stroke="#0D9488"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />

                  {/* Central Emergency Beacon Pulse */}
                  <circle cx="32" cy="30.5" r="5.2" fill="url(#header-kl-beacon)" filter="url(#header-kl-glow)" />
                  <circle cx="32" cy="30.5" r="1.8" fill="#FFFFFF" />
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

          {/* RIGHT: SOS Button + Notification Bell + Profile Avatar */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-2.5 shrink-0">
            {/* SOS Button: Minimal, sleek emergency jewel pill */}
            <button
              type="button"
              onClick={() => setSosOpen(true)}
              className="relative overflow-hidden inline-flex items-center justify-center gap-1.5 h-9 sm:h-10 px-3 xs:px-3.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs shadow-sm shadow-red-600/25 border border-white/20 transition-all duration-150 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 active:scale-95 shrink-0 group select-none"
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

            {/* Notifications Bell Button: Sleek crystal container with micro-sheen & tactile active compression */}
            <button
              ref={bellButtonRef}
              type="button"
              onClick={() => {
                if (profileMenuOpen) setProfileMenuOpen(false);
                setNotifOpen((prev) => !prev);
                // setNotifOpen(true) toggle trigger
              }}
              className={`group relative inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl transition-all duration-200 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 active:scale-90 active:duration-75 shrink-0 select-none ${
                notifOpen
                  ? 'bg-card dark:bg-slate-800 border border-primary/50 dark:border-teal-400/50 shadow-sm shadow-primary/20 ring-1 ring-primary/30'
                  : unreadCount > 0
                  ? 'bg-card/75 hover:bg-card/95 dark:bg-slate-900/65 dark:hover:bg-slate-900/90 supports-[backdrop-filter]:backdrop-blur-md border border-rose-500/30 dark:border-rose-400/30 hover:border-rose-500/50 shadow-xs shadow-rose-500/15'
                  : 'bg-card/70 hover:bg-card/95 dark:bg-slate-900/60 dark:hover:bg-slate-900/90 supports-[backdrop-filter]:backdrop-blur-md border border-border/80 dark:border-white/10 hover:border-primary/40 dark:hover:border-teal-400/40 shadow-xs hover:shadow-sm hover:shadow-primary/10'
              }`}
              aria-label={
                unreadCount > 0
                  ? `Notifications, ${unreadCount} unread`
                  : 'Notifications'
              }
              title={
                unreadCount > 0
                  ? `Notifications (${unreadCount} unread)`
                  : 'Notifications'
              }
              aria-expanded={notifOpen}
              aria-haspopup="dialog"
            >
              {/* Crystal Glass Specular Bevel & Micro-Sheen Sweep */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-[11px]"
              >
                {/* Top specular reflection rim */}
                <span className="absolute inset-x-1.5 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/70 dark:via-white/20 to-transparent" />
                {/* Glossy diagonal micro-sheen glide on hover */}
                <span className="absolute -inset-full top-0 block -rotate-45 bg-gradient-to-r from-transparent via-white/25 dark:via-white/10 to-transparent opacity-0 transition-all duration-700 ease-out group-hover:inset-full group-hover:opacity-100 motion-reduce:hidden" />
              </span>

              {/* Crisp Lucide Bell Icon with Subtle Hover Tilt & Micro-Motion */}
              <Bell
                className={`h-4 w-4 sm:h-[18px] sm:w-[18px] shrink-0 notranslate transition-transform duration-300 ease-out origin-top group-hover:rotate-12 group-hover:scale-110 group-active:-rotate-6 motion-reduce:transform-none ${
                  notifOpen
                    ? 'text-primary dark:text-teal-400'
                    : unreadCount > 0
                    ? 'text-foreground dark:text-slate-100 group-hover:text-amber-500 dark:group-hover:text-amber-400'
                    : 'text-muted-foreground group-hover:text-foreground dark:text-slate-300 dark:group-hover:text-white'
                }`}
                aria-hidden="true"
              />

              {/* Dynamic Glowing Rose/Amber Unread Badge with Pulse & Ping Animation */}
              {unreadCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 z-10 flex items-center justify-center pointer-events-none"
                  aria-hidden="true"
                >
                  {/* Dynamic Glowing Ambient Aura */}
                  <span className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 opacity-70 blur-[3px] animate-pulse motion-reduce:animate-none" />

                  {/* Radar Ping Animation */}
                  <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-60 motion-reduce:animate-none" />

                  {/* Crisp Crystal Pill Badge */}
                  <span className="relative flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 text-[9.5px] font-black text-white shadow-xs shadow-rose-600/40 ring-2 ring-card dark:ring-slate-950 leading-none tracking-tight">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {/* Profile Avatar Button: 36-40px with luminous multi-stop border gradient, status pulse pip, and verified badge */}
            {(() => {
              const isOrg = Boolean(userProfile.isOrganization || userProfile.organizationVerified);
              const isVerified = userProfile.verificationState === 'verified';
              return (
                <button
                  ref={avatarButtonRef}
                  type="button"
                  onClick={() => {
                    if (notifOpen) setNotifOpen(false);
                    setProfileMenuOpen((prev) => !prev);
                  }}
                  className={`relative inline-flex items-center justify-center h-9 w-9 sm:h-10 sm:w-10 rounded-xl p-[2px] transition-all duration-200 touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95 shrink-0 select-none ${
                    isOrg
                      ? 'bg-gradient-to-tr from-violet-600 via-indigo-500 to-purple-500 shadow-xs shadow-indigo-500/20 hover:shadow-indigo-500/40 ring-1 ring-indigo-400/20'
                      : isVerified
                      ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 shadow-xs shadow-teal-500/20 hover:shadow-teal-500/40 ring-1 ring-teal-400/20'
                      : 'bg-gradient-to-tr from-border via-primary/30 to-border hover:from-primary/40 hover:to-primary/30'
                  }`}
                  aria-label="Open profile and user menu"
                  aria-expanded={profileMenuOpen}
                  title="User Profile Menu"
                >
                  <div className="relative flex h-full w-full items-center justify-center rounded-[9px] sm:rounded-[10px] bg-card overflow-hidden">
                    {userProfile.avatarUrl ? (
                      <img
                        src={userProfile.avatarUrl}
                        alt={userProfile.name || 'User'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-600 text-white font-extrabold text-[11px] sm:text-xs tracking-tight">
                        <span>{initials}</span>
                      </div>
                    )}
                  </div>

                  {/* Corner Status Pip & Refined Verified Shield */}
                  {isVerified ? (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-700 text-[8px] font-black text-white ring-2 ring-card shadow-xs"
                      title={isOrg ? 'Verified Organization' : 'Verified Volunteer'}
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
                      <span className="relative">✓</span>
                    </span>
                  ) : (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 flex h-2.5 w-2.5 items-center justify-center"
                      title="Active Responder"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 ring-1.5 ring-card" />
                    </span>
                  )}
                </button>
              );
            })()}
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
