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
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { Last24HoursSheet } from './Last24HoursSheet';
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

  // 24h stats data for sheet and sparkline
  const [twentyFourHourData, setTwentyFourHourData] = useState<Last24HoursData | null>(null);
  const [isLoading24h, setIsLoading24h] = useState(false);

  // Ticking LIVE relative timestamp
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number>(0);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<number>(Date.now());

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

  // Sync lastUpdatedTime on liveStats change
  useEffect(() => {
    setLastUpdatedTime(Date.now());
    setSecondsSinceUpdate(0);
  }, [liveStats]);

  // Keep ticking every second
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdatedTime]);

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

    requests.forEach((req) => {
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
        default:
          events.push(`Community aid request active near ${cleanLoc}, ${timeAgo}`);
      }
    });

    return events.length > 0
      ? events.slice(0, 8)
      : ['Activity will show here as neighbours help each other.'];
  }, [requests]);

  // Event ticker rotation every 6 seconds, paused on hover/tap, respects reduced motion
  useEffect(() => {
    if (anonymizedEvents.length <= 1 || isTickerPaused || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setCurrentEventIndex((prev) => (prev + 1) % anonymizedEvents.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [anonymizedEvents.length, isTickerPaused, prefersReducedMotion]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    fetchLiveStats();
    fetch24hStats();
  }, [fetchLiveStats, fetch24hStats]);

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

  const hasAvgRespData = avgResp !== null && avgResp !== undefined && avgResp > 0;
  const hasTrustData = rawTrust !== null && rawTrust !== undefined;

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
      caption: 'Verified and active now',
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
      value: hasAvgRespData ? `${avgResp} min` : '—',
      caption: hasAvgRespData ? 'Time to first offer' : 'Not enough data yet',
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
      caption: 'Completed so far',
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
        <h2 className="text-base sm:text-lg font-extrabold text-foreground tracking-tight flex items-center gap-2 min-w-0">
          <Activity className="h-4 w-4 text-primary shrink-0 notranslate" />
          <span className="truncate">Community Pulse</span>
        </h2>

        {/* 44 x 44 px round refresh button that spins while refreshing */}
        <button
          type="button"
          onClick={() => {
            fetchLiveStats();
            fetch24hStats();
          }}
          disabled={isLoadingStats}
          title="Refresh live stats"
          aria-label="Refresh live stats"
          className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 rounded-full border border-border/80 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs flex items-center justify-center touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-70"
        >
          <RotateCw
            className={`h-4 w-4 notranslate ${
              isLoadingStats ? 'animate-spin text-primary' : ''
            }`}
          />
        </button>
      </div>

      {/* Row 2: Full-width 44px status bar (rounded, flex, min-w-0):
          - Left: Pulsing green dot with single "Live · updated 18s ago" (or "Live · 18s ago" on narrow screens).
          - Right: "24h" chip with tiny sparkline, label "24h", and chevron (opens last 24h details sheet).
          - Below 340px: hide sparkline; never wrap or overflow horizontally. */}
      <div className="h-11 min-h-[44px] w-full rounded-2xl border border-border/80 bg-card/85 dark:bg-card/50 backdrop-blur-xs px-3 sm:px-3.5 flex items-center justify-between gap-2 min-w-0 overflow-hidden shadow-xs">
        {/* Left: Pulsing green dot + single status string */}
        <div className="flex items-center gap-2 min-w-0 shrink">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold text-foreground truncate select-none">
            <span className="hidden min-[380px]:inline">{liveStatus.long}</span>
            <span className="min-[380px]:hidden">{liveStatus.short}</span>
          </span>
        </div>

        {/* Right: "Last 24h" chip with tiny sparkline (hidden below 340px), label "Last 24h", and chevron */}
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Last 24 hours activity trend"
          className="group relative h-9 min-h-[36px] max-h-[36px] px-2.5 sm:px-3 rounded-full border border-border/70 bg-background/80 hover:bg-muted/90 active:scale-[0.98] transition-all text-xs font-medium text-foreground flex items-center gap-1.5 sm:gap-2 shrink-0 select-none shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary touch-target cursor-pointer"
        >
          {/* Tiny inline SVG sparkline (56 x 20 px) - hidden below 340px */}
          <svg
            className="w-[42px] sm:w-[50px] h-[18px] text-emerald-500 shrink-0 hidden min-[340px]:block overflow-visible"
            viewBox="0 0 56 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="pulseSparkGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>
            {sparklineData.areaPath && (
              <path d={sparklineData.areaPath} fill="url(#pulseSparkGrad)" />
            )}
            <path
              d={sparklineData.linePath}
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx={sparklineData.lastPoint.x}
              cy={sparklineData.lastPoint.y}
              r="2"
              fill="currentColor"
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
        className="w-full min-h-[44px] h-auto flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-muted/40 border border-border/70 text-xs text-foreground transition-colors hover:bg-muted/60"
        role="region"
        aria-label="Latest community activity"
      >
        <Radio className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
        <span className="font-bold text-muted-foreground shrink-0 text-[10px] sm:text-[11px] uppercase tracking-wider select-none">
          Latest:
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
              className={`relative flex flex-col justify-between p-4 rounded-2xl bg-card/90 dark:bg-card/75 border ${card.cardBorder} shadow-xs hover:shadow-md transition-all duration-200 h-[154px] min-h-[154px] backdrop-blur-xs`}
            >
              {/* Top Row: Icon chip on left, Info button with 44px tap area on right */}
              <div className="flex h-9 items-center justify-between gap-2">
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
                  className="relative h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-muted/80 transition-colors before:absolute before:-inset-1.5 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none touch-target"
                >
                  <Info className="h-3.5 w-3.5 notranslate" />
                </button>
              </div>

              {/* Bottom Content: Number, Full Label, Caption sitting on the exact same lines across cards */}
              {isLoadingStats && !liveStats ? (
                <div
                  className="grid grid-rows-[32px_18px_28px] items-start gap-1 animate-pulse"
                  aria-busy="true"
                >
                  <div className="h-7 w-16 bg-muted/80 rounded-lg" />
                  <div className="h-4 w-24 bg-muted/60 rounded-md" />
                  <div className="h-3 w-28 bg-muted/40 rounded-md" />
                </div>
              ) : (
                <div className="grid grid-rows-[32px_18px_28px] items-start gap-1">
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
      <Last24HoursSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        data={twentyFourHourData}
        isLoading={isLoading24h}
      />
    </div>
  );
}
