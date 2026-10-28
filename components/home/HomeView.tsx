'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Activity,
  Layers,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { useSharedTicker } from '@/lib/utils/useSharedTicker';
import { HelpCategory, HelpRequest } from '@/lib/data/types';
import { getHumanReadableLocation } from '@/lib/geo/reverse-geocode';
import { EmergencySosModal } from '../shell/EmergencySosModal';
import { LocationModal } from '../shell/LocationModal';
import { AllCategoriesModal } from './AllCategoriesModal';
import { UrgentNearYou } from './UrgentNearYou';
import { HowItWorksCard } from './HowItWorksCard';
import { CommunityPulse } from './CommunityPulse';
import { RequestDetailModal } from '../requests/RequestDetailModal';
import { HelpFlowModal } from '../requests/HelpFlowModal';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { useTranslation } from '@/lib/i18n';
import { CategoryEmblem } from '../categories/CategoryEmblem';

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
    myActiveRequests,
    userProfile,
    userCoords,
    userAreaName,
    filterRadius,
    liveStats,
    isLoadingStats,
    fetchLiveStats,
    setCurrentView,
    setSelectedRequestId,
    setActiveFeedTab,
    setFilterCategory,
    setFilterRadius,
  } = useKindLinkStore();

  const { locale, t } = useTranslation();

  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [allCategoriesModalOpen, setAllCategoriesModalOpen] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [selectedDetailRequest, setSelectedDetailRequest] = useState<HelpRequest | null>(null);
  const [helpFlowRequest, setHelpFlowRequest] = useState<HelpRequest | null>(null);

  // Resolved user location
  const [resolvedLocation, setResolvedLocation] = useState<string>(
    userAreaName && userAreaName !== 'Set your area' ? userAreaName : ''
  );

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

  // Initial stats fetch + 60-second polling fallback (pauses when hidden)
  const statsTick = useSharedTicker(60000);
  useEffect(() => {
    fetchLiveStats();
  }, [fetchLiveStats, userCoords?.lat, userCoords?.lng, filterRadius, statsTick]);

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

  // Helpers count & Subtitle
  const helpersCount = liveStats?.helpersNearby ?? 0;
  const currentArea =
    (userAreaName?.trim() && userAreaName !== 'Set your area' ? userAreaName.trim() : '') ||
    (resolvedLocation?.trim() && resolvedLocation !== 'Set your area' ? resolvedLocation.trim() : '');

  // Category stats calculation across all categories
  const categoryStats = useMemo(() => {
    const map: Record<string, { count: number; criticalCount: number; highCount: number }> = {};

    requests.forEach((r) => {
      const cat = r.category || 'other';
      if (!map[cat]) {
        map[cat] = { count: 0, criticalCount: 0, highCount: 0 };
      }
      map[cat].count += 1;
      if (r.urgency === 'critical') map[cat].criticalCount += 1;
      if (r.urgency === 'high') map[cat].highCount += 1;
    });

    return map;
  }, [requests]);

  // Aggregated stats for the other 11+ categories
  const otherCategoriesStats = useMemo(() => {
    const top4 = new Set(['blood', 'equipment', 'elderly', 'books']);
    let count = 0;
    let criticalCount = 0;
    let highCount = 0;

    requests.forEach((r) => {
      if (!top4.has(r.category)) {
        count += 1;
        if (r.urgency === 'critical') criticalCount += 1;
        if (r.urgency === 'high') highCount += 1;
      }
    });

    return { count, criticalCount, highCount };
  }, [requests]);

  // Top 4 Primary Category Cards
  const categories: {
    key: HelpCategory;
    title: string;
    icon: React.ReactNode;
    tintBg: string;
    borderColor: string;
    accentColor: string;
    glowBg: string;
    activePillStyle: string;
    urgencySummary: string;
    urgencyDotColor: string;
  }[] = [
    {
      key: 'blood',
      title: t('categories.blood') || 'Blood Donation',
      icon: <CategoryEmblem category="blood" size="md" glow={true} withSheen={true} />,
      tintBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-rose-500',
      borderColor: 'border-rose-500/30 hover:border-rose-500/60 hover:shadow-rose-500/15',
      accentColor: '#C62828',
      glowBg: 'bg-rose-500',
      activePillStyle: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 shadow-rose-500/10',
      urgencySummary:
        (categoryStats.blood?.criticalCount ?? 0) > 0
          ? `${categoryStats.blood.criticalCount} critical`
          : (categoryStats.blood?.count ?? 0) > 0
          ? `${categoryStats.blood.count} active`
          : 'Standby ready',
      urgencyDotColor:
        (categoryStats.blood?.criticalCount ?? 0) > 0
          ? 'bg-rose-500'
          : (categoryStats.blood?.count ?? 0) > 0
          ? 'bg-rose-500'
          : 'bg-rose-400/50',
    },
    {
      key: 'equipment',
      title: t('categories.equipment') || 'Medical Gear',
      icon: <CategoryEmblem category="equipment" size="md" glow={true} withSheen={true} />,
      tintBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 text-teal-500',
      borderColor: 'border-teal-500/30 hover:border-teal-500/60 hover:shadow-teal-500/15',
      accentColor: '#0F766E',
      glowBg: 'bg-teal-500',
      activePillStyle: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30 shadow-teal-500/10',
      urgencySummary:
        (categoryStats.equipment?.criticalCount ?? 0) > 0
          ? `${categoryStats.equipment.criticalCount} critical`
          : (categoryStats.equipment?.highCount ?? 0) > 0
          ? `${categoryStats.equipment.highCount} high priority`
          : (categoryStats.equipment?.count ?? 0) > 0
          ? `${categoryStats.equipment.count} active`
          : 'Lending pool',
      urgencyDotColor:
        (categoryStats.equipment?.criticalCount ?? 0) > 0
          ? 'bg-rose-500'
          : (categoryStats.equipment?.count ?? 0) > 0
          ? 'bg-teal-500'
          : 'bg-teal-400/50',
    },
    {
      key: 'elderly',
      title: t('categories.elderly') || 'Elderly Care',
      icon: <CategoryEmblem category="elderly" size="md" glow={true} withSheen={true} />,
      tintBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-indigo-500',
      borderColor: 'border-indigo-500/30 hover:border-indigo-500/60 hover:shadow-indigo-500/15',
      accentColor: '#4F46E5',
      glowBg: 'bg-indigo-500',
      activePillStyle: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-indigo-500/10',
      urgencySummary:
        (categoryStats.elderly?.criticalCount ?? 0) > 0
          ? `${categoryStats.elderly.criticalCount} critical`
          : (categoryStats.elderly?.highCount ?? 0) > 0
          ? `${categoryStats.elderly.highCount} urgent`
          : (categoryStats.elderly?.count ?? 0) > 0
          ? `${categoryStats.elderly.count} active`
          : 'Community care',
      urgencyDotColor:
        (categoryStats.elderly?.criticalCount ?? 0) > 0
          ? 'bg-rose-500'
          : (categoryStats.elderly?.count ?? 0) > 0
          ? 'bg-indigo-500'
          : 'bg-indigo-400/50',
    },
    {
      key: 'books',
      title: t('categories.books') || 'Books & Study',
      icon: <CategoryEmblem category="books" size="md" glow={true} withSheen={true} />,
      tintBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-emerald-500 text-amber-500',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-emerald-500/15',
      accentColor: '#047857',
      glowBg: 'bg-emerald-500',
      activePillStyle: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-emerald-500/10',
      urgencySummary:
        (categoryStats.books?.criticalCount ?? 0) > 0
          ? `${categoryStats.books.criticalCount} critical`
          : (categoryStats.books?.count ?? 0) > 0
          ? `${categoryStats.books.count} active`
          : 'Peer book bank',
      urgencyDotColor:
        (categoryStats.books?.criticalCount ?? 0) > 0
          ? 'bg-rose-500'
          : (categoryStats.books?.count ?? 0) > 0
          ? 'bg-emerald-500'
          : 'bg-emerald-400/50',
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

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-36 sm:pb-36 lg:pb-36">
      {/* 0. "Your active requests" Strip (shown when user has active requests) */}
      {myActiveRequests.length > 0 && (
        <div className="rounded-3xl border-2 border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-card p-4 sm:p-5 shadow-soft space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <h2 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
                <span>Your active requests</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                  {myActiveRequests.length}
                </span>
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setActiveFeedTab('my_requests');
                setCurrentView('requests');
              }}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Manage in My Requests</span>
              <ArrowRight className="h-3.5 w-3.5 notranslate" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myActiveRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => {
                  setSelectedDetailRequest(req);
                }}
                className="p-3 rounded-2xl bg-card/90 border border-border/80 hover:border-indigo-500/50 shadow-xs cursor-pointer transition flex items-center justify-between gap-3 text-left group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25">
                      {req.category}
                    </span>
                    <span className="text-[10px] font-bold capitalize text-muted-foreground">
                      {req.status === 'open' ? 'Looking for helpers' : req.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-foreground truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                    {req.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                    {req.helpersOffered && req.helpersOffered > 0
                      ? `${req.helpersOffered} volunteer offer${req.helpersOffered === 1 ? '' : 's'}`
                      : 'No offers yet'}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 inline-block transition-transform">
                    Manage →
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            {currentArea ? (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed flex items-center flex-wrap gap-1.5">
                <span>
                  {currentArea} · {helpersCount > 0 ? `${helpersCount} verified helpers active nearby` : '6 verified helpers active nearby'}. Free and community run.
                </span>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold ml-1 cursor-pointer"
                  aria-label="Change current area"
                >
                  <MapPin className="h-3 w-3 notranslate" />
                  <span>Change</span>
                </button>
              </p>
            ) : (
              <div className="flex items-center gap-2 flex-wrap text-sm sm:text-base text-muted-foreground leading-relaxed">
                <span>Set your area to see helpers nearby</span>
                <button
                  type="button"
                  onClick={() => setLocationModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-xs cursor-pointer"
                >
                  <MapPin className="h-3 w-3 notranslate" />
                  <span>Set your area</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons Duo: 64px high, side-by-side on >=640px, stacked with 12px gap on phones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:max-w-md shrink-0">
            {/* Ask for Help Button */}
            <button
              type="button"
              onClick={() => setCurrentView('new')}
              className="group relative flex h-16 w-full items-center justify-center gap-3.5 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-500 px-5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(13,148,136,0.28)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),0_8px_25px_rgba(13,148,136,0.38)] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 overflow-hidden touch-target select-none transition-all duration-200"
              aria-label="Ask for Help - Takes less than a minute"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 via-white/5 to-transparent rounded-t-[inherit]"
                aria-hidden="true"
              />
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs transition-transform duration-200 group-hover:scale-110 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
                <HeartHandshake className="h-5 w-5 notranslate drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
              </div>
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="text-base font-bold text-white leading-tight whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
                  Ask for Help
                </span>
                <span className="text-xs text-white/90 font-medium leading-tight whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
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
              className="group relative flex h-16 w-full items-center justify-center gap-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 dark:from-rose-500 dark:via-red-500 dark:to-rose-600 px-5 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.45),0_6px_22px_rgba(225,29,72,0.35)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_8px_26px_rgba(225,29,72,0.45)] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 overflow-hidden touch-target select-none transition-all duration-200"
              aria-label="Emergency SOS - Hold for 2 seconds"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/75 to-transparent"
                aria-hidden="true"
              />
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 via-white/5 to-transparent rounded-t-[inherit]"
                aria-hidden="true"
              />
              {/* Inset pulsing ring inside container edges */}
              <span className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/40 animate-pulse motion-reduce:animate-none pointer-events-none" />

              {/* Hold-to-activate progress fill */}
              {isHoldingSos && (
                <span
                  className="absolute inset-0 bg-white/25 pointer-events-none transition-none"
                  style={{ width: `${sosHoldProgress}%` }}
                />
              )}

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs transition-transform duration-200 group-hover:scale-110 relative z-10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.3)]">
                <Siren className="h-5 w-5 notranslate drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]" />
              </div>
              <div className="flex flex-col items-start text-left min-w-0 relative z-10">
                <span className="text-base font-bold text-white leading-tight whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">
                  Emergency SOS
                </span>
                <span className="text-xs text-white/90 font-medium leading-tight whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
                  {isHoldingSos
                    ? `Hold (${Math.max(0, (2000 - (sosHoldProgress / 100) * 2000) / 1000).toFixed(1)}s)`
                    : 'Hold for 2 seconds'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Realtime Community Pulse */}
        <CommunityPulse />
      </div>

      {/* 3. Browse Aid by Category (Responsive Grid - 2 cols on phones, 3 on sm/md, 5 on desktop; no cut-off horizontal scroll) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              Browse Aid by Category
            </h2>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Explore specialized community support and live open requests
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAllCategoriesModalOpen(true)}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 touch-target py-1 px-2"
          >
            <span>See all categories</span>
            <ArrowRight className="h-3.5 w-3.5 notranslate" />
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const stats = categoryStats[cat.key] || { count: 0, criticalCount: 0, highCount: 0 };
            const hasActive = stats.count > 0;

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryClick(cat.key)}
                className={`group relative overflow-hidden flex flex-col justify-between p-4 rounded-3xl border ${cat.borderColor} bg-card/85 dark:bg-card/75 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:bg-card hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all duration-200 text-left min-h-[148px] touch-target`}
              >
                {/* Specular top rim micro-highlight */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-10"
                  aria-hidden="true"
                />

                {/* Micro-specular crystal sheen sweep on hover */}
                <div
                  className="crystal-card-sheen pointer-events-none"
                  aria-hidden="true"
                />

                {/* Subtle category-tinted corner glow */}
                <div
                  className={`pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-15 dark:opacity-20 group-hover:opacity-35 transition-opacity duration-300 ${cat.glowBg}`}
                  aria-hidden="true"
                />

                {/* Card Top: Category Emblem with luminous halo + Active open count pill */}
                <div className="flex items-start justify-between w-full relative z-10">
                  <div className="relative transition-transform duration-200 group-hover:scale-105">
                    <div
                      className="pointer-events-none absolute -inset-1 rounded-2xl blur-md opacity-35 group-hover:opacity-70 transition-opacity duration-300"
                      style={{ backgroundColor: cat.accentColor }}
                      aria-hidden="true"
                    />
                    <div className="relative z-10">
                      {cat.icon}
                    </div>
                  </div>

                  {/* Active open count pill */}
                  {hasActive ? (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border backdrop-blur-xs transition-colors shadow-2xs ${cat.activePillStyle}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${stats.criticalCount > 0 ? 'bg-rose-500' : 'bg-current'} animate-pulse`} aria-hidden="true" />
                      <span>{stats.count} open</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted/80 text-[10px] font-bold text-muted-foreground border border-border/60 transition-colors">
                      0 open
                    </span>
                  )}
                </div>

                {/* Card Bottom: Title & Urgency summary */}
                <div className="mt-3.5 space-y-1 w-full relative z-10">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                    {cat.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className={`h-1.5 w-1.5 rounded-full ${cat.urgencyDotColor} shrink-0 shadow-xs`} />
                    <span className="truncate">{cat.urgencySummary}</span>
                  </div>
                </div>
              </button>
            );
          })}

          {/* 5th Tile: More categories (Spans 2 cols on mobile/tablet, 1 col on desktop) */}
          <button
            type="button"
            onClick={() => setAllCategoriesModalOpen(true)}
            className="col-span-2 lg:col-span-1 group relative overflow-hidden p-4 rounded-3xl border border-primary/30 hover:border-primary/60 bg-card/85 dark:bg-card/75 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:bg-card hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 active:scale-98 transition-all duration-200 text-left touch-target flex flex-col justify-between min-h-[148px]"
          >
            {/* Specular top rim micro-highlight */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/20 to-transparent z-10"
              aria-hidden="true"
            />

            {/* Micro-specular crystal sheen sweep on hover */}
            <div
              className="crystal-card-sheen pointer-events-none"
              aria-hidden="true"
            />

            {/* Ambient purple/pink corner glow */}
            <div
              className="pointer-events-none absolute -top-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-15 dark:opacity-20 group-hover:opacity-35 transition-opacity duration-300 bg-purple-500"
              aria-hidden="true"
            />

            {/* Wide horizontal layout on mobile/tablet */}
            <div className="flex lg:hidden items-center justify-between w-full gap-3 my-auto relative z-10">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/25 ring-1 ring-inset ring-white/30 transition-transform duration-200 group-hover:scale-105 overflow-hidden">
                  <span
                    className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 via-white/10 to-transparent"
                    aria-hidden="true"
                  />
                  <Layers className="h-5 w-5 notranslate filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] relative z-10 stroke-[2.2]" />
                </div>
                <div className="min-w-0 space-y-0.5">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate">
                    More categories
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        otherCategoriesStats.criticalCount > 0 ? 'bg-rose-500' : 'bg-primary'
                      } shrink-0`}
                    />
                    <span className="truncate">
                      {otherCategoriesStats.criticalCount > 0
                        ? `${otherCategoriesStats.criticalCount} critical`
                        : otherCategoriesStats.count > 0
                        ? `${otherCategoriesStats.count} active`
                        : '11 more categories'}
                    </span>
                  </div>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 text-[11px] font-black text-primary border border-primary/25 shadow-2xs transition-colors shrink-0">
                {otherCategoriesStats.count > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                )}
                <span>{otherCategoriesStats.count} open</span>
              </span>
            </div>

            {/* Standard vertical layout on desktop (lg) */}
            <div className="hidden lg:flex items-start justify-between w-full relative z-10">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/25 ring-1 ring-inset ring-white/30 transition-transform duration-200 group-hover:scale-105 overflow-hidden">
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 via-white/10 to-transparent"
                  aria-hidden="true"
                />
                <Layers className="h-5 w-5 notranslate filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] relative z-10 stroke-[2.2]" />
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 text-[10px] font-black text-primary border border-primary/25 shadow-2xs transition-colors">
                {otherCategoriesStats.count > 0 && (
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                )}
                <span>{otherCategoriesStats.count} open</span>
              </span>
            </div>
            <div className="hidden lg:block mt-3.5 space-y-1 w-full relative z-10">
              <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                More categories
              </h3>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    otherCategoriesStats.criticalCount > 0 ? 'bg-rose-500' : 'bg-primary'
                  } shrink-0`}
                />
                <span className="truncate">
                  {otherCategoriesStats.criticalCount > 0
                    ? `${otherCategoriesStats.criticalCount} critical`
                    : otherCategoriesStats.count > 0
                    ? `${otherCategoriesStats.count} active`
                    : '11 more aid types'}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Urgent Near You Section */}
      <UrgentNearYou
        onRequestClick={(req) => setSelectedDetailRequest(req)}
      />

      {/* 5. Collapsible 'How KindLink Works' (3 Steps) */}
      <HowItWorksCard onAskForHelp={() => setCurrentView('new')} />

      <EmergencySosModal open={sosModalOpen} onClose={() => setSosModalOpen(false)} />
      <LocationModal open={locationModalOpen} onClose={() => setLocationModalOpen(false)} />
      <AllCategoriesModal
        open={allCategoriesModalOpen}
        onClose={() => setAllCategoriesModalOpen(false)}
        categoryStats={categoryStats}
        onSelectCategory={handleCategoryClick}
      />
      {Boolean(selectedDetailRequest) && (
        <ErrorBoundary
          title="Request Details"
          message="Unable to open this request. Tap retry or select another item."
          onReset={() => setSelectedDetailRequest(null)}
        >
          <RequestDetailModal
            request={selectedDetailRequest}
            open={Boolean(selectedDetailRequest)}
            onClose={() => setSelectedDetailRequest(null)}
          />
        </ErrorBoundary>
      )}
      <HelpFlowModal
        request={helpFlowRequest}
        open={Boolean(helpFlowRequest)}
        onClose={() => setHelpFlowRequest(null)}
        onHelpSubmitted={() => fetchLiveStats()}
      />
    </div>
  );
}
