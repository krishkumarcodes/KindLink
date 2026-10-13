'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Globe,
  MapPin,
  Siren,
  ChevronDown,
  User,
  Settings,
  ShieldCheck,
  Atom,
  AlertTriangle,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { getCurrentLanguageCode, SUPPORTED_LANGUAGES } from '@/lib/translate/googleTranslate';
import { LanguageModal } from './LanguageModal';
import { NotificationsModal } from './NotificationsModal';
import { EmergencySosModal } from './EmergencySosModal';
import { LocationModal } from './LocationModal';

export function Header() {
  const {
    notifications,
    userCoords,
    userAreaName,
    userProfile,
    setCurrentView,
  } = useKindLinkStore();

  const [langOpen, setLangOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [currentLangCode, setCurrentLangCode] = useState('en');

  const menuRef = useRef<HTMLDivElement>(null);

  // Sync current language code for display badge
  useEffect(() => {
    setCurrentLangCode(getCurrentLanguageCode());
  }, [langOpen]);

  // Close quick profile menu on outside click or Escape key
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileMenuOpen]);

  const unreadCount = notifications.filter((n) => n.unread).length;

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

  const displayAreaName = userAreaName || 'Asansol, WB';

  // Format short area name for mobile
  const shortArea = displayAreaName.split(',')[0].trim() || 'Asansol';

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-card/90 backdrop-blur-md pt-[env(safe-area-inset-top,0px)] transition-colors shadow-xs">
        <div className="flex h-16 w-full max-w-[1920px] mx-auto items-center justify-between px-2.5 sm:px-6 gap-2">
          {/* Brand Logo & Dynamic Location */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* KindLink Brand Home Link */}
            <button
              type="button"
              onClick={() => setCurrentView('home')}
              className="group flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl p-1 transition-all active:scale-[0.98] shrink-0"
              aria-label="KindLink - Help is just next door"
            >
              {/* KindLink Vector Brand Emblem */}
              <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <svg
                  viewBox="0 0 64 64"
                  className="h-9 w-9 sm:h-10 sm:w-10 drop-shadow-sm select-none"
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

                  {/* Squircle Base with Elevation */}
                  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#header-kl-grad)" />
                  <rect
                    x="2.5"
                    y="2.5"
                    width="59"
                    height="59"
                    rx="15.5"
                    stroke="#FFFFFF"
                    strokeOpacity="0.25"
                    strokeWidth="1"
                  />

                  {/* Orbital Antigravity Field Rings (Newtonian Aid Gravity) */}
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="22"
                    ry="11"
                    transform="rotate(-25 32 32)"
                    stroke="#FFFFFF"
                    strokeOpacity="0.4"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <ellipse
                    cx="32"
                    cy="32"
                    rx="22"
                    ry="11"
                    transform="rotate(25 32 32)"
                    stroke="#FFFFFF"
                    strokeOpacity="0.4"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                  />
                  <circle cx="32" cy="32" r="18" stroke="#FFFFFF" strokeOpacity="0.18" strokeWidth="1.5" />

                  {/* Connected Hearts & Hands Mobius Loop (KindLink Emblem) */}
                  <path
                    d="M22 28 C18 22, 12 25, 12 32 C12 39, 24 46, 32 50 C40 46, 52 39, 52 32 C52 25, 46 22, 42 28 C39 32, 35 34, 32 34 C29 34, 25 32, 22 28 Z"
                    fill="#FFFFFF"
                    fillOpacity="0.96"
                  />

                  {/* Secondary Inner Link Arch */}
                  <path
                    d="M23.5 30 C26 33, 29 34.5, 32 34.5 C35 34.5, 38 33, 40.5 30"
                    stroke="#0D9488"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />

                  {/* Quantum Core Pulse / Beacon */}
                  <circle cx="32" cy="32" r="5" fill="url(#header-kl-beacon)" filter="url(#header-kl-glow)" />
                  <circle cx="32" cy="32" r="2" fill="#FFFFFF" />
                </svg>
              </div>

              {/* Brand Typography */}
              <div className="flex flex-col">
                <span className="notranslate text-lg sm:text-xl font-extrabold tracking-tight block leading-tight font-heading">
                  <span className="text-foreground transition-colors">Kind</span>
                  <span className="text-primary transition-colors">Link</span>
                </span>
                {/* Mobile-only location subtitle chip (<640px) */}
                <span className="sm:hidden flex items-center gap-1 text-[10px] text-muted-foreground font-medium mt-0.5">
                  <MapPin className="h-2.5 w-2.5 text-primary shrink-0 notranslate" />
                  <span className="truncate max-w-[70px] xs:max-w-[105px]">{shortArea}</span>
                  <ChevronDown className="h-2 w-2 opacity-60 shrink-0" />
                </span>
              </div>
            </button>

            {/* Dynamic Location Chip (Visible on screens >= 640px) */}
            <button
              type="button"
              onClick={() => setLocationOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/80 bg-background/80 hover:bg-muted text-xs font-semibold text-foreground transition-all shadow-xs touch-target group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Current location: ${displayAreaName}. Tap to change or recenter.`}
              title="Change area or recenter GPS"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                {userCoords.isLive ? (
                  <>
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </>
                ) : (
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary/80" />
                )}
              </span>
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0 notranslate group-hover:scale-110 transition-transform" />
              <span className="max-w-[120px] md:max-w-[190px] lg:max-w-[260px] truncate">
                {displayAreaName}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>

          {/* Right Action Icons & Controls */}
          <div className="flex items-center gap-1.5 xs:gap-2 sm:gap-3 shrink-0">
            {/* Redesigned Emergency SOS Button */}
            <button
              type="button"
              onClick={() => setSosOpen(true)}
              className="relative group inline-flex items-center justify-center gap-1.5 px-2.5 min-[400px]:px-3.5 py-2 rounded-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-extrabold text-xs shadow-md shadow-red-600/30 transition-all duration-150 min-h-[44px] min-w-[44px] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Emergency SOS trigger - Instant community alert"
              title="Trigger Emergency SOS"
            >
              {/* Soft pulsing ring with reduced-motion alternative */}
              <span
                className="absolute -inset-1 rounded-full bg-red-500/35 -z-10 animate-pulse motion-reduce:animate-none pointer-events-none"
                aria-hidden="true"
              />
              <Siren className="h-4 w-4 shrink-0 notranslate animate-bounce motion-reduce:animate-none" />
              <span className="hidden min-[400px]:inline tracking-wide font-black">SOS</span>
              <span className="hidden lg:inline text-[11px] font-bold tracking-normal opacity-90">
                EMERGENCY
              </span>
            </button>

            {/* Language Selector Button */}
            <button
              type="button"
              onClick={() => setLangOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 h-10 min-w-[40px] px-2 sm:px-2.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors min-h-[44px] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Switch language. Current: ${currentLangCode.toUpperCase()}`}
              title="Change Language"
            >
              <Globe className="h-4 w-4 text-primary shrink-0 notranslate" />
              <span className="text-xs font-bold uppercase tracking-wider">{currentLangCode}</span>
            </button>

            {/* Notifications Bell Button */}
            <button
              type="button"
              onClick={() => setNotifOpen(true)}
              className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-background hover:bg-muted text-foreground transition-colors min-h-[44px] min-w-[44px] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Notifications, ${unreadCount} unread`}
              title="Notifications"
            >
              <Bell className="h-4 w-4 notranslate shrink-0" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-urgency-critical text-[10px] font-bold text-white shadow-xs ring-2 ring-card animate-in zoom-in-75">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar / Initials Button & Quick Menu */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="relative inline-flex items-center justify-center h-10 w-10 rounded-xl border border-border bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition-all min-h-[44px] min-w-[44px] touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
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

              {/* Quick Profile Dropdown Popover */}
              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 mt-2 w-64 rounded-3xl border border-border bg-card p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 text-card-foreground"
                >
                  {/* User Header Summary */}
                  <div className="flex items-center gap-3 p-2 pb-3 border-b border-border/80">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-white font-bold text-sm shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-sm text-foreground truncate">
                        {userProfile.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {userProfile.college || 'Asansol Engineering College'}
                      </div>
                      {userProfile.verificationState === 'verified' && (
                        <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                          <ShieldCheck className="h-3 w-3 notranslate" />
                          <span>Verified Volunteer</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="py-1.5 space-y-1">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCurrentView('profile');
                        setProfileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold hover:bg-muted text-foreground transition-colors min-h-[40px] text-left"
                    >
                      <User className="h-4 w-4 text-primary shrink-0 notranslate" />
                      <span>View Profile &amp; Badges</span>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCurrentView('settings');
                        setProfileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold hover:bg-muted text-foreground transition-colors min-h-[40px] text-left"
                    >
                      <Settings className="h-4 w-4 text-primary shrink-0 notranslate" />
                      <div className="flex flex-col">
                        <span>Settings &amp; Appearance</span>
                        <span className="text-[10px] text-muted-foreground font-normal">
                          Theme, Text Size, Language
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setCurrentView('physics');
                        setProfileMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-semibold hover:bg-muted text-foreground transition-colors min-h-[40px] text-left"
                    >
                      <Atom className="h-4 w-4 text-primary shrink-0 notranslate" />
                      <span>Physics Lab Engine</span>
                    </button>
                  </div>

                  {/* Quick SOS Trigger in Menu */}
                  <div className="pt-2 border-t border-border/80">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setSosOpen(true);
                        setProfileMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 px-3 py-2 rounded-2xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 text-xs font-bold transition-colors min-h-[36px]"
                    >
                      <AlertTriangle className="h-3.5 w-3.5 notranslate" />
                      <span>Trigger Emergency SOS</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <LanguageModal open={langOpen} onClose={() => setLangOpen(false)} />
      <NotificationsModal open={notifOpen} onClose={() => setNotifOpen(false)} />
      <EmergencySosModal open={sosOpen} onClose={() => setSosOpen(false)} />
      <LocationModal open={locationOpen} onClose={() => setLocationOpen(false)} />
    </>
  );
}
