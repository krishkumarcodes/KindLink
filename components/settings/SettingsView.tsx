'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Moon,
  Sun,
  Monitor,
  Type,
  Bell,
  Volume2,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  Download,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Check,
  ShieldCheck,
  HeartHandshake,
  Zap,
  Info,
  X,
  MapPin,
  ExternalLink,
  Layers,
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { LanguageModal } from '../shell/LanguageModal';
import { getCurrentLanguageCode, SUPPORTED_LANGUAGES } from '@/lib/translate/googleTranslate';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';

export function SettingsView() {
  const { theme, setTheme } = useTheme();
  const { userProfile, updateUserProfile } = useKindLinkStore();

  // Modal states
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [iosPwaModalOpen, setIosPwaModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Text size state ('compact' | 'normal' | 'large')
  const [textSize, setTextSize] = useState<'compact' | 'normal' | 'large'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_text_size');
      if (saved === 'compact' || saved === 'large' || saved === 'normal') return saved;
    }
    return userProfile.textSize || 'normal';
  });

  // Reduce motion state
  const [reduceMotion, setReduceMotion] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kindlink_reduce_motion');
      if (saved !== null) return saved === 'true';
    }
    return userProfile.reduceMotion || false;
  });

  // Language state
  const [langCode, setLangCode] = useState(() => getCurrentLanguageCode());

  // Notification toggles
  const [bloodAlerts, setBloodAlerts] = useState(true);
  const [sosAlerts, setSosAlerts] = useState(true);
  const [nearbyRequests, setNearbyRequests] = useState(true);
  const [statusUpdates, setStatusUpdates] = useState(true);
  const [soundSirens, setSoundSirens] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);

  // Sync language listener
  useEffect(() => {
    setLangCode(getCurrentLanguageCode());
    const onLocaleChange = (e: Event) => {
      const custom = e as CustomEvent<{ locale?: string }>;
      if (custom.detail?.locale) {
        setLangCode(custom.detail.locale);
      }
    };
    window.addEventListener('kindlink:locale-change', onLocaleChange);
    return () => window.removeEventListener('kindlink:locale-change', onLocaleChange);
  }, [langModalOpen]);

  // Sync PWA & Notification permission
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsPwaInstalled(true);
      }

      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }
  }, []);

  // Text size change handler
  const handleTextSizeChange = (size: 'compact' | 'normal' | 'large') => {
    setTextSize(size);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-text-size', size);
      if (size === 'compact') {
        document.documentElement.style.fontSize = '14px';
      } else if (size === 'large') {
        document.documentElement.style.fontSize = '18.5px';
      } else {
        document.documentElement.style.fontSize = '16px';
      }
      try {
        localStorage.setItem('kindlink_text_size', size);
      } catch {}
    }
    updateUserProfile({ textSize: size });
    toast.success(`Text size set to ${size === 'large' ? 'Elderly Large' : size === 'compact' ? 'Compact' : 'Standard'}`);
  };

  // Reduce motion change handler
  const handleReduceMotionToggle = (enabled: boolean) => {
    setReduceMotion(enabled);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-reduce-motion', enabled ? 'true' : 'false');
      try {
        localStorage.setItem('kindlink_reduce_motion', enabled ? 'true' : 'false');
      } catch {}
    }
    updateUserProfile({ reduceMotion: enabled });
    toast.success(`Reduced motion ${enabled ? 'enabled' : 'disabled'}`);
  };

  // Request browser push notification permission
  const handleRequestPushPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      toast.error('Push notifications are not supported on this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast.success('Notification permission granted!');
      } else if (permission === 'denied') {
        toast.error('Notification permission was blocked in browser settings.');
      }
    } catch (err: any) {
      toast.error('Could not request notification permission.');
    }
  };

  // PWA install trigger
  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsPwaInstalled(true);
        toast.success('KindLink installation initiated!');
      }
      setDeferredPrompt(null);
    } else {
      // Show iOS / manual guidance modal
      setIosPwaModalOpen(true);
    }
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full pb-36 lg:pb-16 text-foreground">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Settings & Security
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage appearance, accessibility, real-time push alerts, password security, and account sessions.
        </p>
      </div>

      <div className="space-y-5">
        {/* =========================================================================
            1. APPEARANCE THEME (Light, Dark, System with instant switching & WCAG AA)
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <Sun className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Appearance Theme</h2>
              <p className="text-xs text-muted-foreground">
                High-contrast WCAG AA compliant palette optimized for outdoor daylight and dark rooms
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'system', label: 'System', icon: Monitor },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = theme === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setTheme(m.id)}
                  className={`py-3 px-3 rounded-2xl border text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center gap-2 touch-target ${
                    isSelected
                      ? 'border-primary bg-primary text-white shadow-soft ring-2 ring-primary/20'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                  aria-pressed={isSelected}
                >
                  <Icon className="h-4 w-4 notranslate shrink-0" />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            2. TEXT SIZE & READABILITY (Compact, Standard, Elderly Large >=52px touch)
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
              <Type className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">
                Text Size & Readability
              </h2>
              <p className="text-xs text-muted-foreground">
                Scales root font size via rem. Elderly Large expands touch targets to ≥52px with larger spacing.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {[
              { id: 'compact' as const, label: 'Compact (14px)', desc: 'Higher density' },
              { id: 'normal' as const, label: 'Standard (16px)', desc: 'Balanced default' },
              { id: 'large' as const, label: 'Elderly Large (18.5px)', desc: 'High visibility & ≥52px touch' },
            ].map((s) => {
              const isSelected = textSize === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => handleTextSizeChange(s.id)}
                  className={`p-3 rounded-2xl border text-left transition touch-target flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                      : 'border-border bg-background text-foreground hover:bg-muted'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">{s.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary notranslate shrink-0" />}
                  </div>
                  <span className="text-[11px] text-muted-foreground mt-1">{s.desc}</span>
                </button>
              );
            })}
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl border border-border/80 bg-muted/30 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Live Readability Preview
            </span>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-foreground leading-relaxed">
                Emergency Blood Request: <strong>O+ needed at Asansol District Hospital</strong> (1.2 km away)
              </p>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-primary text-white font-bold text-xs shadow-xs touch-target shrink-0 self-start sm:self-center"
              >
                Sample Button
              </button>
            </div>
          </div>

          {/* Reduce Motion Toggle */}
          <div className="pt-3 border-t border-border flex items-center justify-between">
            <div>
              <span className="text-xs sm:text-sm font-bold text-foreground block">
                Reduce Animations & Motion
              </span>
              <p className="text-[11px] text-muted-foreground">
                Disables animated banners, decorative pulses, and transitions for accessibility
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer touch-target">
              <input
                type="checkbox"
                checked={reduceMotion}
                onChange={(e) => handleReduceMotionToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
            </label>
          </div>
        </div>

        {/* =========================================================================
            3. LANGUAGE SELECTOR
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600">
              <Globe className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Language / भाषा / ভাষা</h2>
              <p className="text-xs text-muted-foreground notranslate">
                Active: <span className="font-bold text-foreground">{currentLang?.nativeName || 'English'}</span> ({currentLang?.name || 'English'})
              </p>
            </div>
          </div>
          <button
            onClick={() => setLangModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-background border border-border text-xs font-bold text-primary hover:bg-muted transition shadow-xs touch-target self-start sm:self-auto"
          >
            Change Language
          </button>
        </div>

        {/* =========================================================================
            4. PUSH NOTIFICATIONS & REAL-TIME ALERTS
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-600">
                <Bell className="h-5 w-5 notranslate" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-foreground">Push Notifications & Alerts</h2>
                <p className="text-xs text-muted-foreground">
                  Browser push alerts and audible siren dispatch for urgent neighbor needs
                </p>
              </div>
            </div>

            {/* Permission Action Button */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : notificationPermission === 'denied'
                    ? 'bg-rose-500/10 text-rose-600'
                    : 'bg-amber-500/10 text-amber-600'
                }`}
              >
                {notificationPermission === 'granted'
                  ? '✓ Permission Enabled'
                  : notificationPermission === 'denied'
                  ? '✗ Permission Blocked'
                  : 'Permission Not Granted'}
              </span>
              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestPushPermission}
                  className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition touch-target"
                >
                  Enable Push
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            {/* Toggle 1: Emergency Blood & Critical Medical */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
              <div className="space-y-0.5 pr-3">
                <strong className="text-foreground text-xs font-bold block">
                  Critical Emergency Blood & Hospital Alerts
                </strong>
                <span className="text-muted-foreground text-[11px] leading-tight block">
                  High-priority alerts for life-threatening blood and transport requirements
                </span>
              </div>
              <input
                type="checkbox"
                checked={bloodAlerts}
                onChange={(e) => {
                  setBloodAlerts(e.target.checked);
                  toast.success(`Blood & Medical alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer touch-target"
              />
            </div>

            {/* Toggle 2: SOS Distress Beacons */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
              <div className="space-y-0.5 pr-3">
                <strong className="text-foreground text-xs font-bold block">
                  Nearby SOS Community Distress Beacons
                </strong>
                <span className="text-muted-foreground text-[11px] leading-tight block">
                  Instant notification when a registered neighbor triggers an emergency SOS
                </span>
              </div>
              <input
                type="checkbox"
                checked={sosAlerts}
                onChange={(e) => {
                  setSosAlerts(e.target.checked);
                  toast.success(`SOS alerts ${e.target.checked ? 'enabled' : 'disabled'}`);
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer touch-target"
              />
            </div>

            {/* Toggle 3: Open Requests in City Radius */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
              <div className="space-y-0.5 pr-3">
                <strong className="text-foreground text-xs font-bold block">
                  Neighbor Mutual Aid Requests in Radius (&lt; 5 km)
                </strong>
                <span className="text-muted-foreground text-[11px] leading-tight block">
                  Receive notifications when medical equipment or study books are requested nearby
                </span>
              </div>
              <input
                type="checkbox"
                checked={nearbyRequests}
                onChange={(e) => {
                  setNearbyRequests(e.target.checked);
                  toast.success(`Neighbor requests ${e.target.checked ? 'enabled' : 'disabled'}`);
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer touch-target"
              />
            </div>

            {/* Toggle 4: Audio Alarm Sirens */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-background border border-border">
              <div className="space-y-0.5 pr-3">
                <strong className="text-foreground text-xs font-bold block flex items-center gap-1.5">
                  <Volume2 className="h-3.5 w-3.5 text-primary notranslate" />
                  <span>Audible Beacon Siren for Critical Emergencies</span>
                </strong>
                <span className="text-muted-foreground text-[11px] leading-tight block">
                  Plays auditory resonant ping when critical blood or life-safety alerts match
                </span>
              </div>
              <input
                type="checkbox"
                checked={soundSirens}
                onChange={(e) => {
                  setSoundSirens(e.target.checked);
                  toast.success(`Audio alert siren ${e.target.checked ? 'enabled' : 'muted'}`);
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer touch-target"
              />
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. PWA INSTALL APP CARD
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600">
              <Smartphone className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">KindLink Mobile Web App</h2>
              <p className="text-xs text-muted-foreground">
                {isPwaInstalled
                  ? 'KindLink is installed and operating in standalone mode.'
                  : 'Install to your home screen for instant offline access and fast emergency response.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleInstallPwa}
            disabled={isPwaInstalled}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-soft transition disabled:opacity-60 touch-target self-start sm:self-auto"
          >
            <Download className="h-4 w-4 notranslate" />
            <span>{isPwaInstalled ? 'Already Installed' : 'Install App'}</span>
          </button>
        </div>

        {/* =========================================================================
            6. SECURITY / CHANGE PASSWORD
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
              <Lock className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Account Security & Password</h2>
              <p className="text-xs text-muted-foreground">
                Verify current password and update your credentials via Supabase GoTrue
              </p>
            </div>
          </div>

          <ChangePasswordForm />
        </div>

        {/* =========================================================================
            7. MAP DATA & CREDITS
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Layers className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-foreground">Map Data &amp; Credits</h2>
              <p className="text-xs text-muted-foreground">
                Geospatial basemaps, address geocoding, and routing services powering KindLink
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            All interactive maps and spatial calculations strictly comply with provider licenses and intellectual property guidelines. Coordinates are rounded and queries are proxied server-side to safeguard user privacy.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* MapTiler */}
            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 notranslate" />
                  MapTiler
                </span>
                <a
                  href="https://www.maptiler.com/copyright/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>License</span>
                  <ExternalLink className="h-2.5 w-2.5 notranslate" />
                </a>
              </div>
              <div className="text-[11px] font-mono font-medium text-foreground bg-muted/60 px-2 py-1 rounded-lg">
                &copy; MapTiler &copy; OpenStreetMap contributors
              </div>
              <p className="text-[11px] text-muted-foreground">
                High-definition vector and raster basemap tiles in light &amp; dark themes.
              </p>
            </div>

            {/* Geoapify */}
            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 notranslate" />
                  Geoapify
                </span>
                <a
                  href="https://www.geoapify.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Website</span>
                  <ExternalLink className="h-2.5 w-2.5 notranslate" />
                </a>
              </div>
              <div className="text-[11px] font-mono font-medium text-foreground bg-muted/60 px-2 py-1 rounded-lg">
                Powered by Geoapify
              </div>
              <p className="text-[11px] text-muted-foreground">
                Forward address search, geocoding, and emergency healthcare facilities lookup.
              </p>
            </div>

            {/* OpenRouteService */}
            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 notranslate" />
                  OpenRouteService
                </span>
                <a
                  href="https://openrouteservice.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Website</span>
                  <ExternalLink className="h-2.5 w-2.5 notranslate" />
                </a>
              </div>
              <div className="text-[11px] font-mono font-medium text-foreground bg-muted/60 px-2 py-1 rounded-lg">
                openrouteservice.org | &copy; OpenStreetMap contributors
              </div>
              <p className="text-[11px] text-muted-foreground">
                Walking, cycling, and driving route computations and estimated travel times.
              </p>
            </div>

            {/* OpenStreetMap */}
            <div className="p-3.5 rounded-2xl bg-background border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 notranslate" />
                  OpenStreetMap
                </span>
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
                >
                  <span>Copyright</span>
                  <ExternalLink className="h-2.5 w-2.5 notranslate" />
                </a>
              </div>
              <div className="text-[11px] font-mono font-medium text-foreground bg-muted/60 px-2 py-1 rounded-lg">
                &copy; OpenStreetMap contributors
              </div>
              <p className="text-[11px] text-muted-foreground">
                Global crowd-sourced geographic data and open tile server fallback.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-xs border-t border-border">
            <span className="text-muted-foreground">Need complete license texts &amp; open source credits?</span>
            <Link
              href="/credits"
              className="text-teal-600 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-1"
            >
              <span>View Full Credits &amp; Attributions</span>
              <ExternalLink className="h-3 w-3 notranslate" />
            </Link>
          </div>
        </div>

        {/* =========================================================================
            8. SESSION CONTROL & DANGER ZONE
           ========================================================================= */}
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-foreground">Session Control & Danger Zone</h2>

          {/* Sign Out Button */}
          <div className="p-4 rounded-2xl bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong className="text-xs sm:text-sm font-bold text-foreground block">
                Sign Out of KindLink
              </strong>
              <p className="text-[11px] text-muted-foreground">
                Terminates your active session on this device.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
                } catch {
                  window.location.href = '/login';
                }
              }}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-muted hover:bg-rose-500/10 text-xs font-bold text-muted-foreground hover:text-rose-600 transition touch-target self-start sm:self-auto"
            >
              <LogOut className="h-4 w-4 notranslate" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Delete Account Button */}
          <div className="p-4 rounded-2xl bg-rose-500/5 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <strong className="text-xs sm:text-sm font-bold text-rose-700 dark:text-rose-300 block flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-rose-500 notranslate" />
                <span>Delete Account & Data</span>
              </strong>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Permanently purge your profile, identity verification docs, and active requests.
              </p>
            </div>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-soft transition touch-target self-start sm:self-auto"
            >
              <span>Delete Account</span>
            </button>
          </div>
        </div>
      </div>

      {/* LANGUAGE MODAL */}
      <LanguageModal open={langModalOpen} onClose={() => setLangModalOpen(false)} />

      {/* IOS / PWA INSTRUCTIONS MODAL */}
      {iosPwaModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
        >
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl text-left space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                  <Smartphone className="h-5 w-5 notranslate" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Install KindLink</h3>
                  <p className="text-xs text-muted-foreground">Home screen quick access</p>
                </div>
              </div>
              <button
                onClick={() => setIosPwaModalOpen(false)}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition"
                aria-label="Close modal"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
                <strong className="text-foreground block">🍏 On Safari (iOS / iPhone):</strong>
                <ol className="list-decimal list-inside text-muted-foreground text-[11px] space-y-1">
                  <li>Tap the <strong>Share</strong> button (📤) in Safari bottom bar.</li>
                  <li>Scroll down and tap <strong>"Add to Home Screen"</strong> (+).</li>
                  <li>Tap <strong>"Add"</strong> in the top right corner.</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-background border border-border space-y-1">
                <strong className="text-foreground block">🤖 On Chrome / Android:</strong>
                <ol className="list-decimal list-inside text-muted-foreground text-[11px] space-y-1">
                  <li>Tap the browser menu (⋮) in the top-right.</li>
                  <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
                </ol>
              </div>
            </div>

            <button
              onClick={() => setIosPwaModalOpen(false)}
              className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-soft transition touch-target"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <DeleteAccountModal
          username={userProfile.username || 'user'}
          onClose={() => setDeleteModalOpen(false)}
        />
      )}
    </div>
  );
}

{/* =========================================================================
    CHANGE PASSWORD FORM COMPONENT
   ========================================================================= */}
function ChangePasswordForm() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signOutOthers, setSignOutOthers] = useState(true);

  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Password validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasSpecialOrNumber = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  // Password strength calculation
  const getStrength = () => {
    if (!newPassword) return { score: 0, label: 'None', color: 'bg-muted' };
    let score = 0;
    if (newPassword.length >= 8) score += 1;
    if (newPassword.length >= 12) score += 1;
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1;
    if (hasSpecialOrNumber) score += 1;

    if (score <= 1) return { score: 25, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2) return { score: 50, label: 'Fair', color: 'bg-amber-500' };
    if (score === 3) return { score: 75, label: 'Good', color: 'bg-blue-500' };
    return { score: 100, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!hasMinLength) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (!hasSpecialOrNumber) {
      setError('New password must contain at least one number or special character.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldPassword,
          newPassword,
          confirmPassword,
          signOutOthers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update password.');
        setLoading(false);
        return;
      }

      setSuccess('Password updated successfully! Keep your new password secure.');
      toast.success('Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0 text-rose-500 notranslate" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 notranslate" />
          <span>{success}</span>
        </div>
      )}

      {/* Current Password */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          Current Password <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showOld ? 'text' : 'password'}
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="Enter current password"
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
          <button
            type="button"
            onClick={() => setShowOld(!showOld)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label={showOld ? 'Hide password' : 'Show password'}
          >
            {showOld ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>
      </div>

      {/* New Password */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          New Password <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label={showNew ? 'Hide password' : 'Show password'}
          >
            {showNew ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>

        {/* Password Strength Meter */}
        {newPassword && (
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[10px] font-semibold">
              <span className="text-muted-foreground">Strength:</span>
              <span className="font-bold text-foreground">{strength.label}</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Confirm New Password */}
      <div>
        <label className="block text-xs font-bold text-foreground mb-1">
          Confirm New Password <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 touch-target"
          />
          <button
            type="button"
            onClick={() => setShowConfirm(!showConfirm)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
            aria-label={showConfirm ? 'Hide password' : 'Show password'}
          >
            {showConfirm ? <EyeOff className="h-4 w-4 notranslate" /> : <Eye className="h-4 w-4 notranslate" />}
          </button>
        </div>
      </div>

      {/* Live Validation Checklist */}
      <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-1.5 text-[11px]">
        <div className="flex items-center gap-1.5">
          {hasMinLength ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/60 notranslate shrink-0" />
          )}
          <span className={hasMinLength ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-muted-foreground'}>
            At least 8 characters
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasSpecialOrNumber ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/60 notranslate shrink-0" />
          )}
          <span className={hasSpecialOrNumber ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-muted-foreground'}>
            At least one number or special symbol
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {passwordsMatch ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground/60 notranslate shrink-0" />
          )}
          <span className={passwordsMatch ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-muted-foreground'}>
            Passwords match
          </span>
        </div>
      </div>

      {/* Sign out of other devices checkbox */}
      <label className="flex items-center gap-2 cursor-pointer pt-1 touch-target">
        <input
          type="checkbox"
          checked={signOutOthers}
          onChange={(e) => setSignOutOthers(e.target.checked)}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
        />
        <span className="text-xs text-muted-foreground">
          Sign out of all other devices (keep this device signed in)
        </span>
      </label>

      <button
        type="submit"
        disabled={loading || !hasMinLength || !hasSpecialOrNumber || !passwordsMatch}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition disabled:opacity-50 touch-target"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
        <span>{loading ? 'Verifying & Updating...' : 'Update Password'}</span>
      </button>
    </form>
  );
}

{/* =========================================================================
    DELETE ACCOUNT SAFETY CONFIRMATION MODAL
   ========================================================================= */}
function DeleteAccountModal({
  username,
  onClose,
}: {
  username: string;
  onClose: () => void;
}) {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmationInput.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete account.');
        setIsDeleting(false);
        return;
      }

      toast.success('Your KindLink account has been deleted.');
      // Clear all local state
      try {
        localStorage.clear();
      } catch {}
      window.location.href = '/login?deleted=true';
    } catch {
      setError('Connection error. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-md rounded-3xl bg-card border border-rose-500/30 p-6 shadow-2xl text-left space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-600">
            <AlertTriangle className="h-6 w-6 notranslate" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">Delete Account Permanently</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold">Irreversible action</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed">
          Deleting your account will immediately remove all your personal profile data, verification submissions, and active mutual aid requests from KindLink servers. This action cannot be undone.
        </p>

        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-foreground mb-1">
            Type <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold">DELETE</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="Type DELETE"
            className="w-full px-3.5 py-2.5 rounded-xl border border-rose-300 dark:border-rose-900 bg-background text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-rose-500/20 touch-target"
          />
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl border border-border text-xs font-bold hover:bg-muted transition touch-target"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-soft transition disabled:opacity-40 touch-target flex items-center justify-center gap-2"
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin notranslate" />}
            <span>{isDeleting ? 'Deleting...' : 'Permanently Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
