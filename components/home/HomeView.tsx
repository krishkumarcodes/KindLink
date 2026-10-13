'use client';

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
  Zap,
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
  Atom,
  HeartHandshake,
  Compass,
  RotateCw,
  Info,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpCategory, HelpRequest } from '@/lib/data/types';
import { getHumanReadableLocation } from '@/lib/geo/reverse-geocode';
import { EmergencySosModal } from '../shell/EmergencySosModal';

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

  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<string>(userAreaName || 'Local Community');

  // Sync resolved location when userAreaName changes
  useEffect(() => {
    if (userAreaName) {
      setResolvedLocation(userAreaName);
    }
  }, [userAreaName]);

  // Resolve user coords to human-readable neighborhood via Nominatim
  useEffect(() => {
    let isMounted = true;
    if (userCoords?.lat && userCoords?.lng) {
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
  }, [userCoords?.lat, userCoords?.lng]);

  // Initial stats fetch + 60-second polling fallback
  useEffect(() => {
    fetchLiveStats();
    const interval = setInterval(() => {
      fetchLiveStats();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchLiveStats, userCoords?.lat, userCoords?.lng, filterRadius]);

  // Dynamic time-aware greeting
  const getTimeGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    if (hour >= 17 && hour < 22) return 'Good evening';
    return 'Namaste';
  };

  const greetingPrefix = getTimeGreeting();
  const userName =
    userProfile?.name &&
    userProfile.name.trim() !== '' &&
    userProfile.name !== 'Rahul Sen' &&
    userProfile.name !== 'Community Member' &&
    userProfile.name !== 'Friend'
      ? userProfile.name.trim()
      : 'Friend';

  // Top 3 urgent requests sorted by Help Gravity score descending
  const urgentNearYou = [...requests]
    .sort((a, b) => b.helpGravityScore - a.helpGravityScore)
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

  const helpersCount = liveStats?.helpersNearby ?? 0;
  const helpersSubtitle =
    helpersCount > 0
      ? `${helpersCount} verified local helper${helpersCount === 1 ? '' : 's'} on active standby`
      : 'Verified local helpers on active standby';

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 sm:pb-8">
      {/* 1. Hero Greeting Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-card via-card to-primary/5 p-6 sm:p-8 border border-border shadow-soft">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5 notranslate" />
              <span>Help is just next door</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-foreground">
              {greetingPrefix}, {userName} 🙏
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl">
              {resolvedLocation} · {helpersSubtitle}. No cost, 100% community run.
            </p>
          </div>

          {/* Big Action Buttons Duo */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => setCurrentView('new')}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-primary px-6 py-4 text-base font-bold text-white shadow-soft transition hover:bg-primary/90 active:scale-98 touch-target"
            >
              <PlusCircle className="h-5 w-5 notranslate" />
              <span>Ask for Help</span>
            </button>
            <button
              onClick={() => setSosModalOpen(true)}
              className="flex items-center justify-center gap-2.5 rounded-2xl bg-urgency-critical px-6 py-4 text-base font-bold text-white shadow-soft transition hover:bg-red-700 active:scale-98 touch-target animate-beacon"
            >
              <AlertTriangle className="h-5 w-5 notranslate" />
              <span>Emergency SOS</span>
            </button>
          </div>
        </div>

        {/* 2. Live Community Stats Bar */}
        <div className="mt-8 pt-6 border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-extrabold text-foreground uppercase tracking-wider text-[11px]">
                Realtime Community Pulse
              </span>
              <span className="text-muted-foreground/60 hidden sm:inline">·</span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                updated just now
              </span>
            </div>

            <button
              onClick={() => fetchLiveStats()}
              title="Refresh live stats"
              aria-label="Refresh live stats"
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition touch-target flex items-center gap-1.5 text-xs"
            >
              <RotateCw className={`h-3.5 w-3.5 notranslate ${isLoadingStats ? 'animate-spin text-primary' : ''}`} />
              <span className="text-[11px] hidden sm:inline">Sync</span>
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Stat 1: Helpers Nearby */}
            <div
              className="relative p-4 rounded-2xl bg-card/90 dark:bg-card/75 border border-emerald-500/30 hover:border-emerald-500/60 shadow-xs hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-0.5 flex items-center gap-3.5 group transition-all duration-200 cursor-pointer backdrop-blur-xs"
              onMouseEnter={() => setActiveTooltip('helpers')}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(activeTooltip === 'helpers' ? null : 'helpers')}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 group-hover:scale-105 transition">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-black text-foreground leading-none tracking-tight">
                    {isLoadingStats && !liveStats ? '...' : (liveStats?.helpersNearby ?? 0)}
                  </p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs font-semibold text-muted-foreground truncate">Helpers Nearby</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'helpers' ? null : 'helpers');
                    }}
                    className="text-muted-foreground/50 hover:text-emerald-600 transition focus:outline-none"
                    aria-label="Information about helpers nearby"
                  >
                    <Info className="h-3 w-3 notranslate" />
                  </button>
                </div>
              </div>

              {activeTooltip === 'helpers' && (
                <div className="absolute left-0 bottom-full mb-2.5 z-30 w-60 p-3 rounded-2xl bg-popover/95 backdrop-blur-md text-popover-foreground text-xs shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150">
                  <p className="font-semibold text-foreground mb-0.5">Active Local Responders</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Verified helpers active in the last 15 min or registered within {filterRadius} km. Updated in real-time.
                  </p>
                </div>
              )}
            </div>

            {/* Stat 2: Avg Response Time */}
            <div
              className="relative p-4 rounded-2xl bg-card/90 dark:bg-card/75 border border-amber-500/30 hover:border-amber-500/60 shadow-xs hover:shadow-lg hover:shadow-amber-500/10 hover:-translate-y-0.5 flex items-center gap-3.5 group transition-all duration-200 cursor-pointer backdrop-blur-xs"
              onMouseEnter={() => setActiveTooltip('response')}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(activeTooltip === 'response' ? null : 'response')}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 group-hover:scale-105 transition">
                <Zap className="h-5 w-5 notranslate" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-black text-foreground leading-none tracking-tight">
                    {liveStats?.avgResponseMinutes !== null && liveStats?.avgResponseMinutes !== undefined
                      ? `${liveStats.avgResponseMinutes} min`
                      : '-'}
                  </p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs font-semibold text-muted-foreground truncate">Avg Response</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'response' ? null : 'response');
                    }}
                    className="text-muted-foreground/50 hover:text-amber-600 transition focus:outline-none"
                    aria-label="Information about average response time"
                  >
                    <Info className="h-3 w-3 notranslate" />
                  </button>
                </div>
              </div>

              {activeTooltip === 'response' && (
                <div className="absolute left-0 bottom-full mb-2.5 z-30 w-60 p-3 rounded-2xl bg-popover/95 backdrop-blur-md text-popover-foreground text-xs shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150">
                  <p className="font-semibold text-foreground mb-0.5">Rapid Turnaround</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Median time from request creation to first offer in last 30 days. Shows &apos;-&apos; if fewer than 3 requests.
                  </p>
                </div>
              )}
            </div>

            {/* Stat 3: Acts of Help */}
            <div
              className="relative p-4 rounded-2xl bg-card/90 dark:bg-card/75 border border-primary/30 hover:border-primary/60 shadow-xs hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 flex items-center gap-3.5 group transition-all duration-200 cursor-pointer backdrop-blur-xs"
              onMouseEnter={() => setActiveTooltip('acts')}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(activeTooltip === 'acts' ? null : 'acts')}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary border border-primary/20 group-hover:scale-105 transition">
                <Heart className="h-5 w-5 notranslate fill-primary/20" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-black text-foreground leading-none tracking-tight">
                    {isLoadingStats && !liveStats ? '...' : (liveStats?.actsOfHelp ?? 0)}
                  </p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs font-semibold text-muted-foreground truncate">Acts of Help</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'acts' ? null : 'acts');
                    }}
                    className="text-muted-foreground/50 hover:text-primary transition focus:outline-none"
                    aria-label="Information about acts of help"
                  >
                    <Info className="h-3 w-3 notranslate" />
                  </button>
                </div>
              </div>

              {activeTooltip === 'acts' && (
                <div className="absolute left-0 bottom-full mb-2.5 z-30 w-60 p-3 rounded-2xl bg-popover/95 backdrop-blur-md text-popover-foreground text-xs shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150">
                  <p className="font-semibold text-foreground mb-0.5">Delivered Mutual Aid</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Total completed aid acts recorded in Asansol and neighboring wards.
                  </p>
                </div>
              )}
            </div>

            {/* Stat 4: Trust Match */}
            <div
              className="relative p-4 rounded-2xl bg-card/90 dark:bg-card/75 border border-blue-500/30 hover:border-blue-500/60 shadow-xs hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5 flex items-center gap-3.5 group transition-all duration-200 cursor-pointer backdrop-blur-xs"
              onMouseEnter={() => setActiveTooltip('trust')}
              onMouseLeave={() => setActiveTooltip(null)}
              onClick={() => setActiveTooltip(activeTooltip === 'trust' ? null : 'trust')}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-105 transition">
                <ShieldCheck className="h-5 w-5 notranslate" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-xl font-black text-foreground leading-none tracking-tight">
                    {liveStats?.trustMatchPercentage !== null && liveStats?.trustMatchPercentage !== undefined
                      ? `${liveStats.trustMatchPercentage}%`
                      : '-'}
                  </p>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                    <span className="h-1 w-1 rounded-full bg-emerald-500"></span>
                    Live
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs font-semibold text-muted-foreground truncate">Trust Match</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveTooltip(activeTooltip === 'trust' ? null : 'trust');
                    }}
                    className="text-muted-foreground/50 hover:text-blue-600 transition focus:outline-none"
                    aria-label="Information about trust match score"
                  >
                    <Info className="h-3 w-3 notranslate" />
                  </button>
                </div>
              </div>

              {activeTooltip === 'trust' && (
                <div className="absolute right-0 bottom-full mb-2.5 z-30 w-60 p-3 rounded-2xl bg-popover/95 backdrop-blur-md text-popover-foreground text-xs shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150">
                  <p className="font-semibold text-foreground mb-0.5">High Trust Ratio</p>
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Percentage of 4+ star volunteer deliveries over the last 90 days.
                  </p>
                </div>
              )}
            </div>
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
              <p className="text-xs text-muted-foreground">Ranked by Newtonian Help Gravity equation</p>
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

                    <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                      <Atom className="h-3 w-3 notranslate" />
                      <span>Score: {req.helpGravityScore}</span>
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
              <h4 className="text-sm font-bold text-foreground">Physics Urgency Match</h4>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Our Newton-inspired algorithm ranks nearest and most time-critical needs, alerting verified local student and citizen helpers.
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
