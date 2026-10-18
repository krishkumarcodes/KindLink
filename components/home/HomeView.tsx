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

  // Exact same location source as the header chip: userAreaName || 'Asansol, WB'
  const [resolvedLocation, setResolvedLocation] = useState<string>(userAreaName || 'Kalyanpur, Asansol');

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

  // Helpers count & Subtitle
  const helpersCount = liveStats?.helpersNearby ?? 0;
  const currentArea = userAreaName?.trim() || resolvedLocation?.trim();


  // Category stats calculation
  const categoryStats = useMemo(() => {
    const map: Record<HelpCategory, { count: number; criticalCount: number; highCount: number }> = {
      blood: { count: 0, criticalCount: 0, highCount: 0 },
      equipment: { count: 0, criticalCount: 0, highCount: 0 },
      elderly: { count: 0, criticalCount: 0, highCount: 0 },
      books: { count: 0, criticalCount: 0, highCount: 0 },
      transport: { count: 0, criticalCount: 0, highCount: 0 },
    };

    requests.forEach((r) => {
      if (map[r.category]) {
        map[r.category].count += 1;
        if (r.urgency === 'critical') map[r.category].criticalCount += 1;
        if (r.urgency === 'high') map[r.category].highCount += 1;
      }
    });

    return map;
  }, [requests]);

  // 5 Responsive Category Cards
  const categories: {
    key: HelpCategory;
    title: string;
    icon: React.ReactNode;
    tintBg: string;
    borderColor: string;
    urgencySummary: string;
    urgencyDotColor: string;
  }[] = [
    {
      key: 'blood',
      title: t('categories.blood') || 'Blood Donation',
      icon: <Droplets className="h-5 w-5 text-rose-500 notranslate" />,
      tintBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20',
      borderColor: 'border-rose-500/30 hover:border-rose-500/60 hover:shadow-rose-500/10',
      urgencySummary:
        categoryStats.blood.criticalCount > 0
          ? `${categoryStats.blood.criticalCount} critical`
          : categoryStats.blood.count > 0
          ? `${categoryStats.blood.count} active`
          : 'Standby ready',
      urgencyDotColor:
        categoryStats.blood.criticalCount > 0
          ? 'bg-rose-500'
          : categoryStats.blood.count > 0
          ? 'bg-rose-500'
          : 'bg-rose-400/50',
    },
    {
      key: 'equipment',
      title: t('categories.equipment') || 'Medical Gear',
      icon: <Stethoscope className="h-5 w-5 text-teal-500 notranslate" />,
      tintBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
      borderColor: 'border-teal-500/30 hover:border-teal-500/60 hover:shadow-teal-500/10',
      urgencySummary:
        categoryStats.equipment.criticalCount > 0
          ? `${categoryStats.equipment.criticalCount} critical`
          : categoryStats.equipment.highCount > 0
          ? `${categoryStats.equipment.highCount} high priority`
          : categoryStats.equipment.count > 0
          ? `${categoryStats.equipment.count} active`
          : 'Lending pool',
      urgencyDotColor:
        categoryStats.equipment.criticalCount > 0
          ? 'bg-rose-500'
          : categoryStats.equipment.count > 0
          ? 'bg-teal-500'
          : 'bg-teal-400/50',
    },
    {
      key: 'elderly',
      title: t('categories.elderly') || 'Elderly Care',
      icon: <Users className="h-5 w-5 text-indigo-500 notranslate" />,
      tintBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
      borderColor: 'border-indigo-500/30 hover:border-indigo-500/60 hover:shadow-indigo-500/10',
      urgencySummary:
        categoryStats.elderly.criticalCount > 0
          ? `${categoryStats.elderly.criticalCount} critical`
          : categoryStats.elderly.highCount > 0
          ? `${categoryStats.elderly.highCount} urgent`
          : categoryStats.elderly.count > 0
          ? `${categoryStats.elderly.count} active`
          : 'Community care',
      urgencyDotColor:
        categoryStats.elderly.criticalCount > 0
          ? 'bg-rose-500'
          : categoryStats.elderly.count > 0
          ? 'bg-indigo-500'
          : 'bg-indigo-400/50',
    },
    {
      key: 'books',
      title: t('categories.books') || 'Books & Study',
      icon: <BookOpen className="h-5 w-5 text-emerald-500 notranslate" />,
      tintBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500/60 hover:shadow-emerald-500/10',
      urgencySummary:
        categoryStats.books.criticalCount > 0
          ? `${categoryStats.books.criticalCount} critical`
          : categoryStats.books.count > 0
          ? `${categoryStats.books.count} active`
          : 'Peer book bank',
      urgencyDotColor:
        categoryStats.books.criticalCount > 0
          ? 'bg-rose-500'
          : categoryStats.books.count > 0
          ? 'bg-emerald-500'
          : 'bg-emerald-400/50',
    },
    {
      key: 'transport',
      title: t('categories.transport') || 'Emergency Transit',
      icon: <Car className="h-5 w-5 text-amber-500 notranslate" />,
      tintBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      borderColor: 'border-amber-500/30 hover:border-amber-500/60 hover:shadow-amber-500/10',
      urgencySummary:
        categoryStats.transport.criticalCount > 0
          ? `${categoryStats.transport.criticalCount} critical`
          : categoryStats.transport.highCount > 0
          ? `${categoryStats.transport.highCount} high priority`
          : categoryStats.transport.count > 0
          ? `${categoryStats.transport.count} active`
          : 'Transit network',
      urgencyDotColor:
        categoryStats.transport.criticalCount > 0
          ? 'bg-rose-500'
          : categoryStats.transport.count > 0
          ? 'bg-amber-500'
          : 'bg-amber-400/50',
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
              {/* Inset pulsing ring inside container edges */}
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
            const isTransit = cat.key === 'transport';

            if (isTransit) {
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategoryClick(cat.key)}
                  className={`col-span-2 lg:col-span-1 group p-4 rounded-3xl border ${cat.borderColor} bg-card/90 hover:bg-card hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all duration-200 text-left touch-target flex flex-col justify-between`}
                >
                  {/* Wide horizontal card for 2-column mobile/tablet view (icon on left, text in middle, open pill on right) */}
                  <div className="flex lg:hidden items-center justify-between w-full gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cat.tintBg} transition-transform duration-200 group-hover:scale-105`}
                      >
                        {cat.icon}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug truncate">
                          {cat.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full ${cat.urgencyDotColor} shrink-0`} />
                          <span className="truncate">{cat.urgencySummary}</span>
                        </div>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-[11px] font-black text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
                      {stats.count} open
                    </span>
                  </div>

                  {/* Standard vertical card layout on lg (5 columns) */}
                  <div className="hidden lg:flex items-start justify-between w-full">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cat.tintBg} transition-transform duration-200 group-hover:scale-105`}
                    >
                      {cat.icon}
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-black text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {stats.count} open
                    </span>
                  </div>
                  <div className="hidden lg:block mt-3 space-y-1 w-full">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                      {cat.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className={`h-1.5 w-1.5 rounded-full ${cat.urgencyDotColor} shrink-0`} />
                      <span className="truncate">{cat.urgencySummary}</span>
                    </div>
                  </div>
                </button>
              );
            }

            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => handleCategoryClick(cat.key)}
                className={`group flex flex-col justify-between p-4 rounded-3xl border ${cat.borderColor} bg-card/90 hover:bg-card hover:shadow-md hover:-translate-y-0.5 active:scale-98 transition-all duration-200 text-left min-h-[142px] touch-target`}
              >
                <div className="flex items-start justify-between w-full">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cat.tintBg} transition-transform duration-200 group-hover:scale-105`}
                  >
                    {cat.icon}
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-[10px] font-black text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {stats.count} open
                  </span>
                </div>

                <div className="mt-3 space-y-1 w-full">
                  <h3 className="text-xs sm:text-sm font-bold text-foreground group-hover:text-primary transition-colors leading-snug line-clamp-1">
                    {cat.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={`h-1.5 w-1.5 rounded-full ${cat.urgencyDotColor} shrink-0`} />
                    <span className="truncate">{cat.urgencySummary}</span>
                  </div>
                </div>
              </button>
            );
          })}
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
      <RequestDetailModal
        request={selectedDetailRequest}
        open={Boolean(selectedDetailRequest)}
        onClose={() => setSelectedDetailRequest(null)}
      />
      <HelpFlowModal
        request={helpFlowRequest}
        open={Boolean(helpFlowRequest)}
        onClose={() => setHelpFlowRequest(null)}
        onHelpSubmitted={() => fetchLiveStats()}
      />
    </div>
  );
}
