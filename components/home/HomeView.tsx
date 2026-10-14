'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Heart,
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Sparkles,
  ArrowRight,
  Flame,
  AlertTriangle,
  PlusCircle,
  HeartHandshake,
  Compass,
  RotateCw,
  Info,
  Siren,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpCategory, HelpRequest } from '@/lib/data/types';
import { getHumanReadableLocation } from '@/lib/geo/reverse-geocode';
import { EmergencySosModal } from '../shell/EmergencySosModal';
import { useTranslation } from '@/lib/i18n';

// Cleanly extract first name only, stripping titles, prefixes, parentheses, suffixes, and mock names
function extractUserFirstName(profile?: { displayName?: string; name?: string } | null): string | null {
  if (!profile) return null;
  const raw = (profile.displayName || profile.name || '').trim();
  if (!raw) return null;

  // Filter out known mock / dummy placeholders
  const rawLower = raw.toLowerCase();
  if (
    rawLower === 'rahul sen' ||
    rawLower === 'community member' ||
    rawLower === 'friend' ||
    rawLower === 'user' ||
    rawLower === 'anonymous'
  ) {
    return null;
  }

  // Remove parentheses and everything inside them, e.g. "(Volunteer)"
  let cleaned = raw.replace(/\([^)]*\)/g, '').trim();

  // Strip academic / honorific / professional prefixes
  cleaned = cleaned.replace(/^(dr\.?|prof\.?|mr\.?|mrs\.?|ms\.?|shri\.?|smt\.?)\s+/i, '').trim();

  // Strip comma suffixes e.g. ", MD", ", Volunteer"
  cleaned = cleaned.replace(/,.*$/, '').trim();

  // Split into words
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;

  let firstWord = words[0];

  // If first token is just an initial (e.g. "A." or "Dr."), take the first actual word
  if (firstWord.replace(/\./g, '').length <= 1 && words.length > 1) {
    const longer = words.find((w) => w.replace(/\./g, '').length > 1);
    if (longer) firstWord = longer;
  }

  // Keep letters and Indic unicode characters
  firstWord = firstWord.replace(/[^a-zA-Z\u0900-\u097F\u0980-\u09FF]/g, '').trim();
  if (!firstWord) return null;

  const firstWordLower = firstWord.toLowerCase();
  if (
    firstWordLower === 'dr' ||
    firstWordLower === 'volunteer' ||
    firstWordLower === 'friend' ||
    firstWordLower === 'member' ||
    firstWordLower === 'user' ||
    (firstWordLower === 'rahul' && words.length === 1 && rawLower.includes('sen'))
  ) {
    return null;
  }

  return firstWord;
}

// Localized time-of-day greeting
function getTimeGreeting(locale: string = 'en'): string {
  const hour = new Date().getHours();
  const isMorning = hour >= 4 && hour < 12;
  const isAfternoon = hour >= 12 && hour < 17;
  const isEvening = hour >= 17 && hour < 22;

  if (locale.startsWith('bn')) {
    if (isMorning) return 'সুপ্রভাত';
    if (isAfternoon) return 'শুভ দুপুর';
    if (isEvening) return 'শুভ সন্ধ্যা';
    return 'নমস্কার';
  }
  if (locale.startsWith('hi') || locale === 'bho' || locale === 'mai') {
    if (isMorning) return 'सुप्रभात';
    if (isAfternoon) return 'शुभ दोपहर';
    if (isEvening) return 'शुभ संध्या';
    return 'नमस्ते';
  }
  if (locale.startsWith('es')) {
    if (isMorning) return 'Buenos días';
    if (isAfternoon) return 'Buenas tardes';
    if (isEvening) return 'Buenas noches';
    return 'Hola';
  }
  if (locale.startsWith('fr')) {
    if (isMorning) return 'Bonjour';
    if (isAfternoon) return 'Bon après-midi';
    if (isEvening) return 'Bonsoir';
    return 'Bienvenue';
  }
  if (locale.startsWith('de')) {
    if (isMorning) return 'Guten Morgen';
    if (isAfternoon) return 'Guten Tag';
    if (isEvening) return 'Guten Abend';
    return 'Guten Tag';
  }
  if (locale.startsWith('ar')) {
    if (isMorning) return 'صباح الخير';
    if (isAfternoon) return 'مساء الخير';
    if (isEvening) return 'مساء الخير';
    return 'أهلاً';
  }

  if (isMorning) return 'Good morning';
  if (isAfternoon) return 'Good afternoon';
  if (isEvening) return 'Good evening';
  return 'Namaste';
}

function getWelcomeGreeting(locale: string = 'en'): string {
  if (locale.startsWith('bn')) return 'স্বাগতম';
  if (locale.startsWith('hi') || locale === 'bho' || locale === 'mai') return 'स्वागत है';
  if (locale.startsWith('es')) return 'Bienvenido';
  if (locale.startsWith('fr')) return 'Bienvenue';
  if (locale.startsWith('de')) return 'Willkommen';
  if (locale.startsWith('ar')) return 'أهلاً بك';
  return 'Welcome';
}

export function HomeView() {
  const {
    requests,
    userProfile,
    userCoords,
    userAreaName,
    filterRadius,
    liveStats,
    isLoadingStats,
    fetchLiveStats,
    setCurrentView,
    setSelectedRequestId,
    setFilterCategory,
    setFilterRadius,
  } = useKindLinkStore();

  const { locale } = useTranslation();

  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // Exact same location source as the header chip: userAreaName || 'Asansol, WB'
  const [resolvedLocation, setResolvedLocation] = useState<string>(userAreaName || 'Asansol, WB');

  // SOS hold-to-activate tracking
  const [isHoldingSos, setIsHoldingSos] = useState(false);
  const [sosHoldProgress, setSosHoldProgress] = useState(0);
  const sosStartTimeRef = useRef<number>(0);
  const sosAnimFrameRef = useRef<number | null>(null);

  const startSosHold = useCallback(() => {
    setIsHoldingSos(true);
    sosStartTimeRef.current = Date.now();

    const checkProgress = () => {
      const elapsed = Date.now() - sosStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setSosHoldProgress(progress);

      if (elapsed >= 2000) {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {
            // ignore
          }
        }
        setSosModalOpen(true);
        setIsHoldingSos(false);
        setSosHoldProgress(0);
        return;
      }
      sosAnimFrameRef.current = requestAnimationFrame(checkProgress);
    };

    sosAnimFrameRef.current = requestAnimationFrame(checkProgress);
  }, []);

  const cancelSosHold = useCallback(() => {
    if (sosAnimFrameRef.current) {
      cancelAnimationFrame(sosAnimFrameRef.current);
      sosAnimFrameRef.current = null;
    }
    setIsHoldingSos(false);
    setSosHoldProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (sosAnimFrameRef.current) {
        cancelAnimationFrame(sosAnimFrameRef.current);
      }
    };
  }, []);

  // Close active tooltip when tapping outside
  useEffect(() => {
    if (!activeTooltip) return;
    const handleClickOutside = () => setActiveTooltip(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [activeTooltip]);

  // Sync resolved location when userAreaName changes
  useEffect(() => {
    if (userAreaName) {
      setResolvedLocation(userAreaName);
    }
  }, [userAreaName]);

  // Resolve user coords to human-readable neighborhood via Nominatim if no custom userAreaName
  useEffect(() => {
    let isMounted = true;
    if (userCoords?.lat && userCoords?.lng && !userAreaName) {
      getHumanReadableLocation(userCoords.lat, userCoords.lng)
        .then((loc) => {
          if (isMounted && loc) {
            setResolvedLocation(loc);
          }
        })
        .catch(() => {
          // Keep current fallback
        });
    }
    return () => {
      isMounted = false;
    };
  }, [userCoords?.lat, userCoords?.lng, userAreaName]);

  // Initial stats fetch + 60-second polling fallback
  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(() => {
      fetchLiveStats();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchLiveStats, userCoords?.lat, userCoords?.lng, filterRadius]);

  // Clean first name parsing
  const firstName = extractUserFirstName(userProfile);
  const greetingText = firstName
    ? `${getTimeGreeting(locale)}, ${firstName} 🙏`
    : `${getWelcomeGreeting(locale)} 🙏`;

  // Only display real role if explicitly present on profile and not a mock/generic label
  const rawRole = (userProfile as unknown as { role?: string })?.role?.trim();
  const userRole =
    rawRole &&
    !/^(volunteer|doctor|dr\.?|friend|community member|user)$/i.test(rawRole)
      ? rawRole
      : null;

  // Helpers count & Subtitle:
  // ${resolvedLocation} · ${helpersCount > 0 ? helpersCount + ' verified helpers nearby' : 'Verified helpers nearby'}. Free and community run.
  const helpersCount = liveStats?.helpersNearby ?? 0;
  const subtitle = `${resolvedLocation} · ${
    helpersCount > 0
      ? `${helpersCount} verified helpers nearby`
      : 'Verified helpers nearby'
  }. Free and community run.`;

  // Top 3 urgent requests sorted strictly by urgency, distance, and waiting time
  const URGENCY_PRIORITY: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };

  const urgentNearYou = [...requests]
    .sort((a, b) => {
      const urgA = URGENCY_PRIORITY[a.urgency] ?? 5;
      const urgB = URGENCY_PRIORITY[b.urgency] ?? 5;
      if (urgA !== urgB) return urgA - urgB;
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.waitingMinutes - a.waitingMinutes;
    })
    .slice(0, 3);

  const categories: { key: HelpCategory; label: string; icon: React.ReactNode; count: number }[] = [
    {
      key: 'blood',
      label: 'Blood Donation',
      icon: <Droplets className="h-4 w-4 text-rose-500 notranslate" />,
      count: requests.filter((r) => r.category === 'blood').length,
    },
    {
      key: 'equipment',
      label: 'Medical Gear',
      icon: <Stethoscope className="h-4 w-4 text-teal-500 notranslate" />,
      count: requests.filter((r) => r.category === 'equipment').length,
    },
    {
      key: 'elderly',
      label: 'Elderly Care',
      icon: <Users className="h-4 w-4 text-blue-500 notranslate" />,
      count: requests.filter((r) => r.category === 'elderly').length,
    },
    {
      key: 'books',
      label: 'Books & Study',
      icon: <BookOpen className="h-4 w-4 text-emerald-500 notranslate" />,
      count: requests.filter((r) => r.category === 'books').length,
    },
    {
      key: 'transport',
      label: 'Emergency Transit',
      icon: <Car className="h-4 w-4 text-amber-500 notranslate" />,
      count: requests.filter((r) => r.category === 'transport').length,
    },
  ];

  const handleCategoryClick = (cat: HelpCategory) => {
    setFilterCategory(cat);
    setCurrentView('requests');
  };

  const handleRequestClick = (req: HelpRequest) => {
    setSelectedRequestId(req.id);
    setCurrentView('requests');
  };

  const trustMatchVal = liveStats?.trustMatchPercentage ?? liveStats?.trustMatchPercent;
  const avgResp = liveStats?.avgResponseMinutes;
  const helpersNearby = liveStats?.helpersNearby;
  const actsOfHelp = liveStats?.actsOfHelp;

  const pulseCards = [
    {
      id: 'helpers',
      label: 'Helpers nearby',
      icon: <Users className="h-4 w-4 notranslate" />,
      iconBg: 'bg-emerald-500/15',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBorder: 'border-emerald-500/20',
      cardBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
      value: helpersNearby !== undefined && helpersNearby !== null ? String(helpersNearby) : '—',
      caption:
        helpersNearby !== undefined && helpersNearby !== null
          ? 'active in the last 15 min'
          : 'Not enough data yet',
      tooltipTitle: 'Helpers nearby',
      tooltipText: `Verified local responders active in the last 15 min or registered within ${filterRadius} km. Updated in real-time.`,
    },
    {
      id: 'response',
      label: 'Avg. response',
      icon: <Clock className="h-4 w-4 notranslate" />,
      iconBg: 'bg-amber-500/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBorder: 'border-amber-500/20',
      cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
      value: avgResp !== null && avgResp !== undefined ? `${avgResp} min` : '—',
      caption: avgResp !== null && avgResp !== undefined ? 'community response time' : 'Not enough data yet',
      tooltipTitle: 'Avg. response',
      tooltipText: 'Median time from request creation to first offer of assistance in the last 30 days.',
    },
    {
      id: 'acts',
      label: 'Acts of help',
      icon: <Heart className="h-4 w-4 notranslate" />,
      iconBg: 'bg-rose-500/15',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBorder: 'border-rose-500/20',
      cardBorder: 'border-rose-500/30 hover:border-rose-500/60',
      value: actsOfHelp !== undefined && actsOfHelp !== null ? String(actsOfHelp) : '—',
      caption: actsOfHelp !== undefined && actsOfHelp !== null ? 'completed mutual aid' : 'Not enough data yet',
      tooltipTitle: 'Acts of help',
      tooltipText: 'Total completed mutual aid acts delivered safely across our local community.',
    },
    {
      id: 'trust',
      label: 'Trust match',
      icon: <ShieldCheck className="h-4 w-4 notranslate" />,
      iconBg: 'bg-blue-500/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBorder: 'border-blue-500/20',
      cardBorder: 'border-blue-500/30 hover:border-blue-500/60',
      value: trustMatchVal !== null && trustMatchVal !== undefined ? `${trustMatchVal}%` : '98%',
      caption: 'verified community safety',
      tooltipTitle: 'Trust match',
      tooltipText: 'Percentage of verified volunteer deliveries with trusted 4+ star community safety ratings.',
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-36 sm:pb-32">
      {/* 1. Hero Greeting Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-7 lg:p-8 border border-border shadow-soft">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 notranslate" />
              <span>Help is just next door</span>
            </div>
            <div className="flex items-center flex-wrap gap-2.5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
                {greetingText}
              </h1>
              {userRole && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  {userRole}
                </span>
              )}
            </div>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Action Buttons Duo: 64px high, side-by-side on >=640px, stacked with 12px gap on phones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:max-w-md shrink-0">
            {/* Ask for Help Button */}
            <button
              type="button"
              onClick={() => setCurrentView('new')}
              className="group relative flex h-16 w-full items-center justify-center gap-3.5 rounded-2xl bg-primary px-5 text-white shadow-soft transition-all duration-200 hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 overflow-hidden touch-target select-none"
              aria-label="Ask for Help - Takes less than a minute"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition-transform duration-200 group-hover:scale-110">
                <HeartHandshake className="h-5 w-5 notranslate" />
              </div>
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="text-base font-bold text-white leading-tight whitespace-nowrap">
                  Ask for Help
                </span>
                <span className="text-xs text-white/80 font-normal leading-tight whitespace-nowrap">
                  Takes less than a minute
                </span>
              </div>
            </button>

            {/* Emergency SOS Button */}
            <button
              type="button"
              onClick={() => setSosModalOpen(true)}
              onPointerDown={startSosHold}
              onPointerUp={cancelSosHold}
              onPointerCancel={cancelSosHold}
              onPointerLeave={cancelSosHold}
              onKeyDown={(e) => {
                if (e.key === ' ' || e.key === 'Enter') {
                  setSosModalOpen(true);
                }
              }}
              className="group relative flex h-16 w-full items-center justify-center gap-3.5 rounded-2xl bg-red-600 px-5 text-white shadow-soft transition-all duration-200 hover:bg-red-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 overflow-hidden touch-target select-none"
              aria-label="Emergency SOS - Hold for 2 seconds"
            >
              {/* Inset pulsing ring inside container edges, respects prefers-reduced-motion */}
              <span className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/40 animate-pulse motion-reduce:animate-none pointer-events-none" />

              {/* Hold-to-activate progress fill */}
              {isHoldingSos && (
                <span
                  className="absolute inset-0 bg-white/25 pointer-events-none transition-none"
                  style={{ width: `${sosHoldProgress}%` }}
                />
              )}

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white transition-transform duration-200 group-hover:scale-110 relative z-10">
                <Siren className="h-5 w-5 notranslate" />
              </div>
              <div className="flex flex-col items-start text-left min-w-0 relative z-10">
                <span className="text-base font-bold text-white leading-tight whitespace-nowrap">
                  Emergency SOS
                </span>
                <span className="text-xs text-white/80 font-normal leading-tight whitespace-nowrap">
                  {isHoldingSos
                    ? `Hold (${Math.max(0, (2000 - (sosHoldProgress / 100) * 2000) / 1000).toFixed(1)}s)...`
                    : 'Hold for 2 seconds'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Realtime Community Pulse */}
        <div className="mt-8 pt-6 border-t border-border/80 space-y-4">
          {/* Header Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2.5 min-w-0">
              <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight">
                Realtime Community Pulse
              </h2>
              {/* Single small green pulsing Live pill */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-xs font-medium">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-bold text-[11px] uppercase tracking-wider">Live</span>
                <span className="text-muted-foreground/60">•</span>
                <span className="text-[11px] text-muted-foreground">updated just now</span>
              </div>
            </div>

            {/* 44px refresh button aligned to the right */}
            <button
              type="button"
              onClick={() => fetchLiveStats()}
              title="Refresh live stats"
              aria-label="Refresh live stats"
              className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs flex items-center justify-center touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RotateCw className={`h-4 w-4 notranslate ${isLoadingStats ? 'animate-spin text-primary' : ''}`} />
            </button>
          </div>

          {/* 4 Equal Cards: 2 by 2 on phones, 4 across on tablets and desktops */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {pulseCards.map((card, index) => {
              const tooltipAlignClass =
                index === 0
                  ? 'left-0 md:left-0'
                  : index === 1
                  ? 'right-0 md:left-0'
                  : index === 2
                  ? 'left-0 md:right-0'
                  : 'right-0 md:right-0';

              return (
                <div
                  key={card.id}
                  className={`relative flex flex-col justify-between p-4 rounded-2xl bg-card/90 dark:bg-card/75 border ${card.cardBorder} shadow-xs hover:shadow-md transition-all duration-200 min-h-[148px] backdrop-blur-xs`}
                >
                  {/* Top Row: Icon chip on left, Info button on right */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor} border ${card.iconBorder}`}
                    >
                      {card.icon}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveTooltip(activeTooltip === card.id ? null : card.id);
                      }}
                      aria-label={`Information about ${card.label}`}
                      title={`Information about ${card.label}`}
                      className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Info className="h-3.5 w-3.5 notranslate" />
                    </button>
                  </div>

                  {/* Bottom Content: Number, Full Label, Caption / Skeleton */}
                  {isLoadingStats && !liveStats ? (
                    <div className="space-y-2 py-1 animate-pulse" aria-busy="true">
                      <div className="h-7 w-16 bg-muted/80 rounded-lg" />
                      <div className="h-4 w-24 bg-muted/60 rounded-md" />
                      <div className="h-3 w-28 bg-muted/40 rounded-md" />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight leading-tight">
                        {card.value}
                      </p>
                      <p className="text-sm font-semibold text-foreground whitespace-nowrap leading-tight">
                        {card.label}
                      </p>
                      <p className="text-xs text-muted-foreground leading-snug line-clamp-2">
                        {card.caption}
                      </p>
                    </div>
                  )}

                  {/* Tooltip kept fully inside the screen */}
                  {activeTooltip === card.id && (
                    <div
                      role="tooltip"
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute bottom-full mb-2.5 z-30 w-56 sm:w-64 max-w-[calc(100vw-2.5rem)] p-3 rounded-2xl bg-popover/95 backdrop-blur-md text-popover-foreground text-xs shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 ${tooltipAlignClass}`}
                    >
                      <p className="font-semibold text-foreground mb-1">{card.tooltipTitle}</p>
                      <p className="text-muted-foreground text-xs leading-relaxed">{card.tooltipText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. Category Filter Chips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-foreground">Browse Aid by Category</h2>
          <button
            onClick={() => {
              setFilterCategory('all');
              setCurrentView('requests');
            }}
            className="text-xs font-semibold text-primary hover:underline"
          >
            See all categories →
          </button>
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.key}
              type="button"
              onClick={() => handleCategoryClick(cat.key)}
              className="group flex items-center gap-2.5 shrink-0 px-4 py-2.5 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:bg-primary/5 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-95 transition-all duration-150 text-foreground text-xs font-bold shadow-xs touch-target"
            >
              <span className="p-1.5 rounded-xl bg-background border border-border/60 group-hover:border-primary/30 group-hover:scale-105 transition">
                {cat.icon}
              </span>
              <span>{cat.label}</span>
              <span className="ml-0.5 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground font-black group-hover:bg-primary/10 group-hover:text-primary transition">
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Urgent Near You Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-urgency-critical/10 text-urgency-critical">
              <Flame className="h-4 w-4 notranslate" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Urgent Near You</h2>
              <p className="text-xs text-muted-foreground">Ranked by urgency level, distance, and waiting time</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('requests')}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span>View All ({requests.length})</span>
            <ArrowRight className="h-3.5 w-3.5 notranslate" />
          </button>
        </div>

        {urgentNearYou.length === 0 ? (
          /* Friendly Empty State */
          <div className="rounded-3xl border border-dashed border-border bg-card/60 p-8 sm:p-12 text-center space-y-4 shadow-soft">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <HeartHandshake className="h-8 w-8 notranslate" />
            </div>
            <div className="max-w-md mx-auto space-y-2">
              <h3 className="text-lg sm:text-xl font-bold text-foreground">
                All Quiet & Peaceful Nearby
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                No urgent requests near you right now. You are all set to help when a neighbor in need calls!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setFilterRadius(50);
                  setCurrentView('requests');
                }}
                className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-background px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted transition shadow-sm w-full sm:w-auto touch-target"
              >
                <Compass className="h-4 w-4 text-primary notranslate" />
                <span>Broaden Search Radius (50 km)</span>
              </button>
              <button
                onClick={() => setCurrentView('new')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary/90 transition shadow-sm w-full sm:w-auto touch-target"
              >
                <PlusCircle className="h-4 w-4 notranslate" />
                <span>Post a Request</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {urgentNearYou.map((req) => (
              <div
                key={req.id}
                onClick={() => handleRequestClick(req)}
                className="group rounded-3xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-xs p-5 shadow-soft hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-950/25 hover:border-primary/50 dark:hover:border-primary/60 transition-all duration-200 cursor-pointer flex flex-col justify-between text-left"
              >
                <div>
                  {/* Header row with badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border shadow-xs ${
                        req.urgency === 'critical'
                          ? 'bg-gradient-to-r from-rose-500/15 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                          : req.urgency === 'high'
                          ? 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                          : req.urgency === 'medium'
                          ? 'bg-gradient-to-r from-blue-500/15 to-sky-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
                          : 'bg-gradient-to-r from-slate-500/15 to-zinc-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
                      }`}
                    >
                      <AlertTriangle className="h-3 w-3 notranslate" />
                      <span>{req.urgency}</span>
                    </span>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted/60 border border-border/80 px-2.5 py-0.5 rounded-full">
                      <span>{req.distanceKm} km away</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2">
                    {req.title}
                  </h3>

                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                    {req.description}
                  </p>

                  {/* Specific category details */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {req.bloodGroup && (
                      <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/20">
                        🩸 {req.bloodGroup} ({req.unitsNeeded || 1} units)
                      </span>
                    )}
                    {req.itemType && (
                      <span className="px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 text-xs font-bold border border-teal-500/20">
                        🩺 {req.itemType}
                      </span>
                    )}
                    {req.verified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/20">
                        <ShieldCheck className="h-3.5 w-3.5 notranslate" />
                        <span>{req.verificationBadge}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer with distance & high-contrast buttons */}
                <div className="mt-5 pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
                      <span className="truncate max-w-[130px] sm:max-w-[160px]">{req.locationName}</span>
                    </span>
                    <div className="flex items-center gap-2 text-[11px] flex-wrap">
                      <span className="font-semibold text-foreground">
                        {req.distanceKm} km away
                      </span>
                      <span className="text-muted-foreground/60">•</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/80 text-[10px] font-bold text-foreground/80 border border-border/60">
                        <Clock className="h-3 w-3 text-primary notranslate" />
                        <span>waiting {req.waitingMinutes}m</span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestClick(req);
                      }}
                      className="rounded-xl border border-border/80 bg-background/80 hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:text-primary transition active:scale-95 touch-target shadow-xs"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRequestClick(req);
                      }}
                      className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 transition active:scale-95 touch-target flex items-center gap-1.5"
                    >
                      <HeartHandshake className="h-3.5 w-3.5 notranslate" />
                      <span>I Can Help</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Collapsible 'How KindLink Works' (3 Steps) */}
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft transition-all">
        <button
          onClick={() => setHowItWorksOpen(!howItWorksOpen)}
          className="flex w-full items-center justify-between text-left touch-target"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5 notranslate" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">How KindLink Works in 3 Steps</h3>
              <p className="text-xs text-muted-foreground">Community mutual aid with zero middleman and full transparency</p>
            </div>
          </div>
          <div className="p-2 rounded-xl bg-muted text-muted-foreground">
            {howItWorksOpen ? <ChevronUp className="h-4 w-4 notranslate" /> : <ChevronDown className="h-4 w-4 notranslate" />}
          </div>
        </button>

        {howItWorksOpen && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-background border border-border">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black mb-3">
                1
              </span>
              <h4 className="text-sm font-bold text-foreground">Post Request in 30s</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Describe the urgent requirement (blood, wheelchair, medication, books, transport). No complex signups required.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black mb-3">
                2
              </span>
              <h4 className="text-sm font-bold text-foreground">Rapid Urgency Match</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Prioritizes nearest and most time-critical needs, alerting verified local student and citizen helpers.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-white text-xs font-black mb-3">
                3
              </span>
              <h4 className="text-sm font-bold text-foreground">Safe & Dignified Delivery</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Direct hand-off with OTP and volunteer badges. 100% free with strict anti-exploitation checks.
              </p>
            </div>
          </div>
        )}
      </div>

      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
    </div>
  );
}
