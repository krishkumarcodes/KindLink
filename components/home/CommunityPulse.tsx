'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Activity,
  RotateCw,
  ChevronRight,
  Info,
  Users,
  Clock,
  Heart,
  ShieldCheck,
  Radio,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import dynamic from 'next/dynamic';
import { useSharedTicker } from '@/lib/utils/useSharedTicker';

const Last24HoursSheet = dynamic(
  () => import('./Last24HoursSheet').then((mod) => mod.Last24HoursSheet),
  { ssr: false }
);
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpRequest } from '@/lib/data/types';
import { Last24HoursData, HourlyStat } from '@/app/api/stats/24h/route';
import { formatHumanTime, formatLivePulseStatus } from '@/lib/utils/formatTime';

interface CommunityPulseProps {
  className?: string;
}

export function CommunityPulse({ className = '' }: CommunityPulseProps) {
  const {
    liveStats,
    isLoadingStats,
    fetchLiveStats,
    requests,
    filterRadius,
  } = useKindLinkStore();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCheck, setShowCheck] = useState(false);

  // 24h stats data for sheet and sparkline
  const [twentyFourHourData, setTwentyFourHourData] = useState<Last24HoursData | null>(null);
  const [isLoading24h, setIsLoading24h] = useState(false);

  // Ticking LIVE relative timestamp driven by unified shared ticker (pauses when hidden)
  const tickerNow = useSharedTicker(1000);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number>(() => Date.now());
  const secondsSinceUpdate = Math.max(0, Math.floor((tickerNow - lastUpdatedTime) / 1000));

  // Activity ticker rotation state
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isTickerPaused, setIsTickerPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Reduced motion preference detection
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Fetch 24-hour activity
  const fetch24hStats = useCallback(async () => {
    setIsLoading24h(true);
    try {
      const res = await fetch('/api/stats/24h', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setTwentyFourHourData(json.data);
          setIsLoading24h(false);
          return;
        }
      }
    } catch {
      // Fallback below
    }

    // Fallback: generate from store requests
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const buckets: HourlyStat[] = [];
    for (let i = 23; i >= 0; i--) {
      const bTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      buckets.push({
        hour: bTime.toLocaleTimeString([], { hour: 'numeric', hour12: true }),
        hourNumber: bTime.getHours(),
        requests: 0,
        helps: 0,
      });
    }

    let reqCount = 0;
    let helpCount = 0;

    (requests || []).forEach((req) => {
      let rTime: Date | null = null;
      if (req.createdAt) {
        const parsed = new Date(req.createdAt);
        if (!isNaN(parsed.getTime())) rTime = parsed;
      }
      if (!rTime && req.waitingMinutes !== undefined) {
        rTime = new Date(now.getTime() - req.waitingMinutes * 60 * 1000);
      }

      if (rTime && rTime >= twentyFourHoursAgo && rTime <= now) {
        reqCount++;
        const hoursDiff = Math.floor((now.getTime() - rTime.getTime()) / (60 * 60 * 1000));
        const bIdx = 23 - Math.min(23, Math.max(0, hoursDiff));
        if (buckets[bIdx]) buckets[bIdx].requests++;
      }

      if (req.status === 'completed') {
        helpCount++;
        const bIdx = 23;
        if (buckets[bIdx]) buckets[bIdx].helps++;
      }
    });

    setTwentyFourHourData({
      totalRequests: reqCount,
      totalHelps: helpCount,
      avgResponseMinutes: liveStats?.avgResponseMinutes ?? null,
      hourly: buckets,
      hasActivity: reqCount > 0 || helpCount > 0,
    });
    setIsLoading24h(false);
  }, [requests, liveStats?.avgResponseMinutes]);

  useEffect(() => {
    fetch24hStats();
  }, [fetch24hStats]);

  // Track requests version hash so any store update (status change, new request, deletion) automatically refreshes stats
  const requestsVersion = useMemo(() => {
    return (requests || []).map((r) => `${r.id}-${r.status}`).join(':');
  }, [requests]);

  // Fetch live stats on initial mount and whenever requests change in the store
  useEffect(() => {
    fetchLiveStats();
  }, [fetchLiveStats, requestsVersion]);

  // Periodic live refresh every 30s so pulse stays live in background
  const statsPeriodicTick = useSharedTicker(30000);
  useEffect(() => {
    fetchLiveStats();
  }, [fetchLiveStats, statsPeriodicTick]);

  // Sync lastUpdatedTime whenever liveStats or requests change
  useEffect(() => {
    setLastUpdatedTime(Date.now());
  }, [liveStats, requestsVersion]);

  // Close card tooltips on outside click
  useEffect(() => {
    if (!activeTooltip) return;
    const handleWindowClick = () => setActiveTooltip(null);
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, [activeTooltip]);

  const liveStatus = useMemo(() => {
    return formatLivePulseStatus(secondsSinceUpdate);
  }, [secondsSinceUpdate]);

  // Anonymized real live events
  const anonymizedEvents = useMemo(() => {
    if (!requests || requests.length === 0) {
      return ['Activity will show here as neighbours help each other.'];
    }

    const events: string[] = [];

    // Sort newest requests first so latest activity is prioritized
    const sorted = [...requests].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeB - timeA;
    });

    sorted.forEach((req) => {
      // Determine clean general locality (no private names or exact house/street coordinates)
      const rawLoc = req.locationName || '';
      let cleanLoc = 'Asansol';
      if (rawLoc.includes('Asansol')) cleanLoc = 'Asansol';
      else if (rawLoc.includes('Raniganj')) cleanLoc = 'Raniganj';
      else if (rawLoc.includes('Durgapur')) cleanLoc = 'Durgapur';
      else if (rawLoc.includes('Kalyanpur')) cleanLoc = 'Kalyanpur';
      else if (rawLoc.includes('Ushagram')) cleanLoc = 'Ushagram';
      else if (rawLoc.includes('Burnpur')) cleanLoc = 'Burnpur';
      else if (rawLoc.includes('Kulti')) cleanLoc = 'Kulti';
      else {
        const parts = rawLoc.split(',').map((p) => p.trim()).filter(Boolean);
        cleanLoc = parts[parts.length - 1] || 'Asansol';
      }

      // Determine human-friendly relative time
      let timeAgo = '';
      if (req.createdAt) {
        timeAgo = formatHumanTime(req.createdAt);
      } else if (req.waitingMinutes !== undefined && req.waitingMinutes > 0) {
        timeAgo = formatHumanTime(req.waitingMinutes);
      } else {
        timeAgo = 'recently';
      }

      const isAccepted =
        req.status === 'accepted' || req.status === 'on_the_way' || req.status === 'arrived';
      const isCompleted = req.status === 'completed';

      switch (req.category) {
        case 'blood':
          if (isCompleted) {
            events.push(`A blood donation was completed near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`A blood request was accepted near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`A blood request was posted near ${cleanLoc}, ${timeAgo}`);
          }
          break;
        case 'transport':
          if (isCompleted) {
            events.push(`Emergency transit aid was completed near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`An emergency transit escort was accepted near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`Emergency transport was requested near ${cleanLoc}, ${timeAgo}`);
          }
          break;
        case 'equipment':
          if (isCompleted) {
            events.push(`Medical gear was delivered safely near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`Medical gear was offered near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`Medical equipment was requested near ${cleanLoc}, ${timeAgo}`);
          }
          break;
        case 'elderly':
          if (isCompleted) {
            events.push(`Elderly companion aid was completed near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`Elderly companion assistance was accepted near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`Elderly companion support was requested near ${cleanLoc}, ${timeAgo}`);
          }
          break;
        case 'books':
          if (isCompleted) {
            events.push(`Study books were exchanged near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`Textbook assistance was accepted near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`Textbook exchange requested near ${cleanLoc}, ${timeAgo}`);
          }
          break;
        case 'medicines':
          if (isCompleted) {
            events.push(`Medicine delivery was completed near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`Prescription assistance was accepted near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`Urgent medicines requested near ${cleanLoc}, ${timeAgo}`);
          }
          break;
        case 'food':
          if (isCompleted) {
            events.push(`Food and grocery support completed near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`Grocery assistance was accepted near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`Food relief assistance requested near ${cleanLoc}, ${timeAgo}`);
          }
          break;
        default: {
          const catName = req.category ? req.category.replace(/_/g, ' ') : 'aid';
          if (isCompleted) {
            events.push(`${catName.charAt(0).toUpperCase() + catName.slice(1)} request completed near ${cleanLoc}, ${timeAgo}`);
          } else if (isAccepted) {
            events.push(`${catName.charAt(0).toUpperCase() + catName.slice(1)} offer accepted near ${cleanLoc}, ${timeAgo}`);
          } else {
            events.push(`Community ${catName} request active near ${cleanLoc}, ${timeAgo}`);
          }
        }
      }
    });

    return events.length > 0
      ? events.slice(0, 10)
      : ['Activity will show here as neighbours help each other.'];
  }, [requests]);

  // Clamp event index if list shrinks
  useEffect(() => {
    if (currentEventIndex >= anonymizedEvents.length) {
      setCurrentEventIndex(0);
    }
  }, [anonymizedEvents.length, currentEventIndex]);

  // Event ticker rotation every 6 seconds, paused on hover/tap, respects reduced motion
  useEffect(() => {
    if (anonymizedEvents.length <= 1 || isTickerPaused || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % anonymizedEvents.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [anonymizedEvents.length, isTickerPaused, prefersReducedMotion]);

  // Refresh handler with 360 rotation, checkmark tick, and toast
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || isLoadingStats) return;
    setIsRefreshing(true);
    try {
      await Promise.all([fetchLiveStats(), fetch24hStats()]);
      setShowCheck(true);
      toast.success('Live community pulse updated', { duration: 2000 });
      setTimeout(() => setShowCheck(false), 1500);
    } catch {
      toast.error('Could not refresh stats');
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchLiveStats, fetch24hStats, isRefreshing, isLoadingStats]);

  // Sparkline coordinates computed from 24h hourly request data (56 x 20 px)
  const sparklineData = useMemo(() => {
    const hourly = twentyFourHourData?.hourly || [];
    if (hourly.length === 0) {
      return {
        linePath: 'M 2 16 L 54 16',
        areaPath: '',
        lastPoint: { x: 54, y: 16 },
      };
    }

    const counts = hourly.map((h) => h.requests);
    const maxVal = Math.max(...counts, 1);
    const allZero = counts.every((c) => c === 0);

    const points = counts.map((val, idx) => {
      const x = 2 + (idx / Math.max(1, counts.length - 1)) * 52;
      const y = allZero ? 16 : 17 - (val / maxVal) * 14;
      return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
    });

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const lastPoint = points[points.length - 1];
    const areaPath = allZero
      ? ''
      : `${linePath} L ${lastPoint.x} 19 L ${points[0].x} 19 Z`;

    return { linePath, areaPath, lastPoint };
  }, [twentyFourHourData]);

  // 4 Cards data
  const rawTrust = liveStats?.trustMatchPercentage ?? liveStats?.trustMatchPercent;
  const avgResp = liveStats?.avgResponseMinutes;
  const helpersNearby = liveStats?.helpersNearby;
  const actsOfHelp = liveStats?.actsOfHelp;

  const completedFromRequests = useMemo(() => {
    return (requests || []).filter((r) => r.status === 'completed').length;
  }, [requests]);

  const displayedActsOfHelp =
    actsOfHelp !== undefined && actsOfHelp !== null
      ? Math.max(actsOfHelp, completedFromRequests)
      : completedFromRequests > 0
      ? completedFromRequests
      : '—';

  const hasAvgRespData = avgResp !== null && avgResp !== undefined && avgResp > 0;
  const hasTrustData = rawTrust !== null && rawTrust !== undefined;

  const pulseCards = [
    {
      id: 'helpers',
      label: 'Helpers nearby',
      icon: (
        <div className="relative flex items-center justify-center h-4 w-4 notranslate">
          <span className="absolute -inset-1 rounded-full bg-emerald-400/30 animate-ping opacity-60 motion-reduce:animate-none" />
          <svg
            className="h-4 w-4 text-emerald-600 dark:text-emerald-400 notranslate relative z-10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" strokeDasharray="3 3" opacity="0.45" />
            <circle cx="12" cy="12" r="5" opacity="0.8" />
            <path d="M12 3v3M12 18v3M3 12h3M18 12h3" opacity="0.35" />
            <line x1="12" y1="12" x2="18.5" y2="5.5" strokeWidth="2.2" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="18" cy="6" r="1.5" fill="currentColor" className="animate-pulse" />
          </svg>
        </div>
      ),
      iconBg: 'bg-emerald-500/15 dark:bg-emerald-500/25',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      iconBorder: 'border-emerald-500/30 dark:border-emerald-500/40',
      cardBorder: 'border-emerald-500/30 hover:border-emerald-500/60',
      glowBg: 'bg-emerald-500/15',
      specularTint: 'via-emerald-400/40',
      value: helpersNearby !== undefined && helpersNearby !== null ? String(helpersNearby) : '—',
      caption: 'Verified and active now',
      tooltipTitle: 'Helpers nearby',
      tooltipText: `Verified local responders active in the last 15 min or registered within ${filterRadius} km. Updated in real-time.`,
    },
    {
      id: 'response',
      label: 'Avg. response',
      icon: (
        <div className="relative flex items-center justify-center h-4 w-4 notranslate">
          <span className="absolute -inset-1 rounded-full bg-amber-400/25 animate-ping opacity-60 motion-reduce:animate-none" />
          <Clock className="h-4 w-4 relative z-10 notranslate" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_#F59E0B]" />
        </div>
      ),
      iconBg: 'bg-amber-500/15 dark:bg-amber-500/25',
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBorder: 'border-amber-500/30 dark:border-amber-500/40',
      cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
      glowBg: 'bg-amber-500/15',
      specularTint: 'via-amber-400/40',
      value: hasAvgRespData ? `${avgResp} min` : '—',
      caption: hasAvgRespData ? 'Time to first offer' : 'Not enough data yet',
      tooltipTitle: 'Avg. response',
      tooltipText: 'Median time from request creation to first offer of assistance in the last 30 days.',
    },
    {
      id: 'acts',
      label: 'Acts of help',
      icon: (
        <div className="relative flex items-center justify-center h-4 w-4 notranslate">
          <span className="absolute -inset-1 rounded-full bg-rose-400/25 animate-pulse motion-reduce:animate-none" />
          <Heart className="h-4 w-4 fill-rose-500/20 text-rose-600 dark:text-rose-400 relative z-10 notranslate" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_6px_#F43F5E]" />
        </div>
      ),
      iconBg: 'bg-rose-500/15 dark:bg-rose-500/25',
      iconColor: 'text-rose-600 dark:text-rose-400',
      iconBorder: 'border-rose-500/30 dark:border-rose-500/40',
      cardBorder: 'border-rose-500/30 hover:border-rose-500/60',
      glowBg: 'bg-rose-500/15',
      specularTint: 'via-rose-400/40',
      value: String(displayedActsOfHelp),
      caption: 'Completed so far',
      tooltipTitle: 'Acts of help',
      tooltipText: 'Total completed mutual aid acts delivered safely across our local community.',
    },
    {
      id: 'trust',
      label: 'Trust match',
      icon: (
        <div className="relative flex items-center justify-center h-4 w-4 notranslate">
          <span className="absolute -inset-1 rounded-full bg-cyan-400/25 animate-pulse motion-reduce:animate-none" />
          <ShieldCheck className="h-4 w-4 text-cyan-600 dark:text-cyan-400 relative z-10 notranslate" />
          <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_6px_#06B6D4]" />
        </div>
      ),
      iconBg: 'bg-cyan-500/15 dark:bg-cyan-500/25',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
      iconBorder: 'border-cyan-500/30 dark:border-cyan-500/40',
      cardBorder: 'border-cyan-500/30 hover:border-cyan-500/60',
      glowBg: 'bg-cyan-500/15',
      specularTint: 'via-cyan-400/40',
      value: hasTrustData ? `${rawTrust}%` : '—',
      caption: hasTrustData ? 'Rated 4 or 5 stars' : 'Needs 5 ratings',
      tooltipTitle: 'Trust match',
      tooltipText: 'Percentage of verified volunteer deliveries with trusted 4+ star community safety ratings (requires at least 5 ratings).',
    },
  ];

  return (
    <div className={`mt-8 pt-6 border-t border-border/80 space-y-3 w-full ${className}`}>
      {/* Row 1: Title "Community Pulse" + Refresh button (min height 44 px, items centered, never wrapping) */}
      <div className="flex items-center justify-between w-full gap-3 min-h-[44px]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 text-primary shrink-0 shadow-xs">
            <Activity className="h-4 w-4 text-primary notranslate animate-pulse motion-reduce:animate-none" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background animate-ping opacity-75 motion-reduce:animate-none" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2 min-w-0 leading-tight">
              <span className="truncate">Community Pulse</span>
            </h2>
            <p className="text-[11px] text-muted-foreground/80 hidden sm:block leading-none mt-0.5">
              Real-time mutual aid telemetry & response vitality
            </p>
          </div>
        </div>

        {/* 44 x 44 px round refresh button that spins while refreshing */}
        <button
          type="button"
          onClick={() => {
            fetchLiveStats();
            handleRefresh();
          }}
          disabled={isLoadingStats || isRefreshing}
          title="Refresh live stats"
          aria-label="Refresh live stats"
          className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-border/80 bg-background/90 dark:bg-card/90 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs hover:shadow-soft flex items-center justify-center touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70 active:scale-95 group relative overflow-hidden"
        >
          {/* Specular glare sheen on button hover */}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          {showCheck ? (
            <Check className="h-4 w-4 text-emerald-500 notranslate animate-in zoom-in-75" />
          ) : (
            <RotateCw
              className={`h-4 w-4 notranslate transition-transform duration-500 ${
                isLoadingStats || isRefreshing ? 'animate-spin text-primary' : 'group-hover:rotate-180'
              }`}
            />
          )}
        </button>
      </div>

      {/* Row 2: Full-width 44px status bar (rounded, flex, min-w-0):
          - Left: Pulsing green dot with single "Live · updated 18s ago" (or "Live · 18s ago" on narrow screens).
          - Right: "24h" chip with tiny sparkline, label "24h", and chevron (opens last 24h details sheet).
          - Below 340px: hide sparkline; never wrap or overflow horizontally. */}
      <div className="h-11 min-h-[44px] w-full rounded-2xl border border-border/80 dark:border-white/10 bg-card/90 dark:bg-card/60 backdrop-blur-md px-2.5 sm:px-3.5 flex flex-wrap items-center justify-between gap-2 min-w-0 shadow-xs relative overflow-hidden">
        {/* Specular top glass sheen line */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 dark:via-white/15 to-transparent" />

        {/* Left: Pulsing radiant green dot beacon with animated radiating waves + status string */}
        <div className="flex items-center gap-2.5 min-w-0 shrink">
          {/* Radiant live dot beacon with multiple glowing waves */}
          <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
            {/* Outer harmonic ripple wave */}
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            {/* Mid ambient glow ring */}
            <span className="absolute inline-flex h-4 w-4 rounded-full bg-emerald-500/20 blur-[1px] animate-pulse motion-reduce:animate-none" />
            {/* Inner high-intensity radiant core */}
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_10px_#10B981,0_0_18px_rgba(16,185,129,0.7)] ring-1 ring-emerald-300/50" />
          </span>
          <span className="text-xs font-semibold text-foreground truncate select-none tracking-tight">
            <span className="hidden min-[380px]:inline">{liveStatus.long}</span>
            <span className="min-[380px]:hidden">{liveStatus.short}</span>
          </span>
        </div>

        {/* Right: "Last 24h" chip with luminous sparkline (hidden below 340px), label "Last 24h", and chevron */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Last 24 hours activity trend"
          className="group relative h-9 min-h-[36px] max-h-[36px] px-2.5 sm:px-3 rounded-full border border-border/70 dark:border-white/10 bg-background/80 dark:bg-card/75 hover:bg-muted/90 hover:border-emerald-500/40 active:scale-[0.98] transition-all text-xs font-semibold text-foreground flex items-center gap-1.5 sm:gap-2 shrink-0 select-none shadow-xs hover:shadow-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-target cursor-pointer overflow-hidden"
        >
          {/* Subtle top glare sheen */}
          <span className="pointer-events-none absolute inset-x-2 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent" />

          {/* Tiny inline SVG luminous sparkline (56 x 20 px) - hidden below 340px */}
          <svg
            className="w-[42px] sm:w-[50px] h-[18px] text-emerald-500 shrink-0 hidden min-[340px]:block overflow-visible"
            viewBox="0 0 56 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pulseSparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
              </linearGradient>
              <filter id="pulseGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="1" floodColor="#10B981" floodOpacity="0.5" />
              </filter>
            </defs>
            {sparklineData.areaPath && (
              <path d={sparklineData.areaPath} fill="url(#pulseSparkGrad)" />
            )}
            <path
              d={sparklineData.linePath}
              stroke="currentColor"
              strokeWidth="1.85"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#pulseGlow)"
            />
            {/* Luminous beacon dot at latest time coordinate */}
            <circle
              cx={sparklineData.lastPoint.x}
              cy={sparklineData.lastPoint.y}
              r="3.5"
              className="animate-ping motion-reduce:animate-none opacity-60"
              fill="currentColor"
            />
            <circle
              cx={sparklineData.lastPoint.x}
              cy={sparklineData.lastPoint.y}
              r="2"
              fill="currentColor"
              className="drop-shadow-[0_0_4px_#10B981]"
            />
          </svg>

          <span className="text-[11px] font-bold text-foreground/90 whitespace-nowrap">
            Last 24h
          </span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5 notranslate shrink-0" />
        </button>
      </div>

      {/* Row C: Latest activity strip (full width, auto height, at least 44 px, pauses on hover/tap) */}
      <div
        onMouseEnter={() => setIsTickerPaused(true)}
        onMouseLeave={() => setIsTickerPaused(false)}
        onPointerDown={() => setIsTickerPaused(true)}
        onPointerUp={() => setIsTickerPaused(false)}
        onTouchStart={() => setIsTickerPaused(true)}
        onTouchEnd={() => setIsTickerPaused(false)}
        onFocus={() => setIsTickerPaused(true)}
        onBlur={() => setIsTickerPaused(false)}
        className="relative overflow-hidden w-full min-h-[44px] h-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-card/75 dark:bg-card/45 backdrop-blur-md border border-border/75 dark:border-white/10 text-xs text-foreground transition-all duration-300 hover:bg-muted/50 hover:border-primary/30 shadow-xs group"
        role="region"
        aria-label="Latest community activity"
      >
        {/* Specular top glare line */}
        <div className="pointer-events-none absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/30 dark:via-white/10 to-transparent" />

        {/* Specular sheen sweep on hover */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />

        {/* Subtle glowing beacon next to Radio/signal */}
        <div className="relative flex items-center justify-center shrink-0">
          <span className="absolute -inset-1 rounded-full bg-primary/25 blur-[2px] animate-pulse motion-reduce:animate-none" />
          <Radio className="h-3.5 w-3.5 text-primary shrink-0 notranslate relative z-10" />
        </div>

        <span className="font-extrabold text-primary dark:text-teal-400 shrink-0 text-[10px] sm:text-[11px] uppercase tracking-wider select-none px-1.5 py-0.5 rounded-md bg-primary/10 dark:bg-primary/20 border border-primary/20">
          Latest
        </span>

        <div className="flex-1 min-w-0 overflow-hidden">
          <p
            key={currentEventIndex}
            className="text-xs font-medium text-foreground leading-snug line-clamp-2 break-words animate-in fade-in duration-300 motion-reduce:animate-none"
          >
            {anonymizedEvents[currentEventIndex] || anonymizedEvents[0]}
          </p>
        </div>
      </div>

      {/* The 4 Cards: Exact alignment with grid rows for number, label, and caption across cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 w-full">
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
              className={`group relative flex flex-col justify-between p-3.5 rounded-2xl bg-card/90 dark:bg-card/75 border ${card.cardBorder} shadow-xs hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 h-[154px] min-h-[154px] backdrop-blur-md overflow-hidden`}
            >
              {/* Specular glare sheen on card top edge */}
              <div
                className={`pointer-events-none absolute inset-x-3 top-0 h-[1px] bg-gradient-to-r from-transparent ${card.specularTint} to-transparent`}
              />

              {/* Luminous ambient corner halo */}
              <div
                className={`pointer-events-none absolute -top-8 -left-8 w-24 h-24 rounded-full ${card.glowBg} blur-xl opacity-60 group-hover:opacity-100 group-hover:scale-125 transition-all duration-500`}
              />

              {/* Top Row: Icon chip on left, Info button with 44px tap area on right */}
              <div className="flex h-9 items-center justify-between gap-2 relative z-10">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.iconBg} ${card.iconColor} border ${card.iconBorder} shadow-xs group-hover:scale-105 transition-transform duration-300`}
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
                  className="relative h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none touch-target"
                >
                  <Info className="h-3.5 w-3.5 notranslate" />
                </button>
              </div>

              {/* Bottom Content: Number, Full Label, Caption sitting on the exact same lines across cards (12px mt-3 gap) */}
              {isLoadingStats && !liveStats ? (
                <div
                  className="grid grid-rows-[32px_18px_28px] items-start gap-1 mt-3 animate-pulse relative z-10"
                  aria-busy="true"
                >
                  <div className="h-7 w-16 bg-muted/80 rounded-lg" />
                  <div className="h-4 w-24 bg-muted/60 rounded-md" />
                  <div className="h-3 w-28 bg-muted/40 rounded-md" />
                </div>
              ) : (
                <div className="grid grid-rows-[32px_18px_28px] items-start gap-1 mt-3 relative z-10">
                  {/* Row 1: Number */}
                  <div className="h-8 flex items-baseline text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight leading-none">
                    <AnimatedNumber value={card.value} />
                  </div>

                  {/* Row 2: Full Label (NO truncate, perfectly aligned) */}
                  <p className="text-xs sm:text-sm font-bold text-foreground leading-tight">
                    {card.label}
                  </p>

                  {/* Row 3: Caption (wraps up to 2 lines, NO truncate, NO "...") */}
                  <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight break-words">
                    {card.caption}
                  </p>
                </div>
              )}

              {/* Tooltip positioned inside container */}
              {activeTooltip === card.id && (
                <div
                  role="tooltip"
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute bottom-full mb-2.5 z-30 w-56 sm:w-64 max-w-[calc(100vw-2.5rem)] p-3 rounded-2xl bg-popover/95 backdrop-blur-md text-popover-foreground text-xs shadow-xl border border-border animate-in fade-in zoom-in-95 duration-150 ${tooltipAlignClass}`}
                >
                  <p className="font-semibold text-foreground mb-1">{card.tooltipTitle}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {card.tooltipText}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Last 24 Hours Sheet Modal */}
      {sheetOpen && (
        <Last24HoursSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          data={twentyFourHourData}
          isLoading={isLoading24h}
        />
      )}
    </div>
  );
}
