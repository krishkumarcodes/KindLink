'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Activity,
  Heart,
  Clock,
  HelpCircle,
  Inbox,
  ArrowUpRight,
} from 'lucide-react';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useBodyScrollLock } from '@/components/ui/OverlayPortal';
import { Last24HoursData, HourlyStat } from '@/app/api/stats/24h/route';

interface Last24HoursSheetProps {
  open: boolean;
  onClose: () => void;
  data: Last24HoursData | null;
  isLoading?: boolean;
}

export function Last24HoursSheet({
  open,
  onClose,
  data,
  isLoading = false,
}: Last24HoursSheetProps) {
  const [activeBar, setActiveBar] = useState<HourlyStat | null>(null);

  useBodyScrollLock(open);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const totalRequests = data?.totalRequests ?? 0;
  const totalHelps = data?.totalHelps ?? 0;
  const avgResponse = data?.avgResponseMinutes ?? null;
  const hourly = data?.hourly ?? [];
  const hasActivity = data?.hasActivity ?? (totalRequests > 0 || totalHelps > 0);

  // Calculate max count for scaling chart bars
  const maxBarValue = Math.max(
    ...hourly.map((h) => Math.max(h.requests, h.helps)),
    1
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="last-24h-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-h-[85dvh] sm:max-h-[85dvh] rounded-t-3xl sm:rounded-3xl bg-card text-card-foreground border-t sm:border border-border/80 shadow-2xl flex flex-col overflow-hidden sm:max-w-xl transition-all duration-300 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95"
      >
        {/* Sticky Header: Single solid surface */}
        <div className="sticky top-0 z-10 px-5 py-3.5 border-b border-border/80 bg-card text-card-foreground shrink-0">
          {/* Mobile Drag Handle inside header */}
          <div
            className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-2.5 sm:hidden select-none"
            aria-hidden="true"
          />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Activity className="h-4.5 w-4.5 notranslate" />
              </div>
              <div>
                <h2
                  id="last-24h-title"
                  className="text-base sm:text-lg font-bold text-foreground tracking-tight"
                >
                  Last 24 hours
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Realtime activity trend across your local community
                </p>
              </div>
            </div>

            {/* 44 x 44 px Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Last 24 hours trend"
              className="h-11 w-11 min-h-[44px] min-w-[44px] shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none touch-target"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Container with overscroll-contain */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6 pb-10 sm:pb-6">
          {/* Three Totals Cards */}
          {/* Three Equal Stat Tiles with FULL labels */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3.5">
            {/* 1. Requests Posted */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Requests posted
                </span>
                <HelpCircle className="h-4 w-4 text-primary shrink-0 notranslate" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
                  <AnimatedNumber value={totalRequests} />
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  in the last 24 hours
                </p>
              </div>
            </div>

            {/* 2. Helps Completed */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Helps completed
                </span>
                <Heart className="h-4 w-4 text-rose-500 shrink-0 notranslate" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
                  <AnimatedNumber value={totalHelps} />
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  verified mutual aid
                </p>
              </div>
            </div>

            {/* 3. Average Reply Time */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col justify-between min-h-[96px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs sm:text-sm font-bold text-foreground">
                  Average reply time
                </span>
                <Clock className="h-4 w-4 text-amber-500 shrink-0 notranslate" />
              </div>
              <div>
                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums tracking-tight">
                  {avgResponse !== null ? (
                    <AnimatedNumber value={`${avgResponse} min`} />
                  ) : (
                    '—'
                  )}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {avgResponse !== null ? 'time to first offer' : 'standby ready'}
                </p>
              </div>
            </div>
          </div>

          {/* Simple Chart of Requests Posted & Helps Completed Per Hour */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Hourly Activity
              </h3>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground select-none">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>Requests ({totalRequests})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Helps done ({totalHelps})</span>
                </div>
              </div>
            </div>

            {/* Empty State vs Active Chart */}
            {!hasActivity ? (
              <div className="py-12 px-4 rounded-2xl bg-muted/20 border border-dashed border-border flex flex-col items-center justify-center text-center space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground/60">
                  <Inbox className="h-6 w-6 notranslate" />
                </div>
                <p className="text-sm font-bold text-foreground">
                  No activity yet
                </p>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                  No requests or completed acts of help have been recorded in the last 24 hours. Activity will show here automatically as neighbours help each other.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-3">
                {/* Active Tooltip / Bar Details */}
                <div className="h-5 flex items-center justify-between text-xs text-muted-foreground">
                  {activeBar ? (
                    <span className="text-foreground font-semibold">
                      {activeBar.hour}: {activeBar.requests} requests · {activeBar.helps} helps done
                    </span>
                  ) : (
                    <span>Tap or hover any hour to inspect counts</span>
                  )}
                  <span className="text-[10px] text-muted-foreground/80">Last 24h</span>
                </div>

                {/* 24 Hourly Bar Columns */}
                <div className="h-32 flex items-end gap-1 pt-4 pb-1">
                  {hourly.map((h, idx) => {
                    const reqHeight =
                      h.requests > 0
                        ? Math.max(6, Math.round((h.requests / maxBarValue) * 100))
                        : 0;
                    const helpHeight =
                      h.helps > 0
                        ? Math.max(6, Math.round((h.helps / maxBarValue) * 100))
                        : 0;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setActiveBar(h)}
                        onMouseLeave={() => setActiveBar(null)}
                        onTouchStart={() => setActiveBar(h)}
                        className="group flex-1 h-full flex items-end justify-center gap-0.5 cursor-pointer relative"
                        title={`${h.hour}: ${h.requests} requests, ${h.helps} helps`}
                      >
                        {/* Requests Bar (Emerald) */}
                        <div
                          style={{ height: `${reqHeight}%` }}
                          className={`w-full max-w-[6px] rounded-t-sm transition-all duration-200 ${
                            h.requests > 0
                              ? 'bg-emerald-500 group-hover:bg-emerald-400'
                              : 'bg-transparent'
                          }`}
                        />
                        {/* Helps Bar (Rose) */}
                        <div
                          style={{ height: `${helpHeight}%` }}
                          className={`w-full max-w-[6px] rounded-t-sm transition-all duration-200 ${
                            h.helps > 0
                              ? 'bg-rose-500 group-hover:bg-rose-400'
                              : 'bg-transparent'
                          }`}
                        />

                        {/* Baseline tick if 0 for both */}
                        {h.requests === 0 && h.helps === 0 && (
                          <div className="w-full h-0.5 bg-border/60 rounded-full" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* X-Axis Timeline Labels */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground/75 font-medium px-0.5 pt-1 border-t border-border/60 select-none">
                  <span>24h ago</span>
                  <span>18h ago</span>
                  <span>12h ago</span>
                  <span>6h ago</span>
                  <span>Now</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick info footer */}
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-xs text-muted-foreground flex items-center justify-between gap-3">
            <span>
              All stats are updated in realtime as verified local volunteers interact.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
