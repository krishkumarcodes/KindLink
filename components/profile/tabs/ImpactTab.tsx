'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  HeartHandshake,
  Clock,
  Heart,
  MapPin,
  Flame,
  Award,
  Share2,
  Droplet,
  ShieldCheck,
  BookOpen,
  Info,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ShareImpactModal = dynamic(
  () => import('../ShareImpactModal').then((mod) => mod.ShareImpactModal),
  { ssr: false }
);

export interface ImpactStats {
  helpsGiven: number;
  hoursActive: number;
  neighboursSupported: number;
  distanceCovered: number;
  currentStreak: number;
  bestStreak: number;
  categoryBreakdown: {
    blood: number;
    equipment: number;
    elderly: number;
    books: number;
    transport: number;
  };
  monthlyActivity: Array<{
    month: string;
    year: number;
    count: number;
  }>;
}

interface ImpactTabProps {
  stats: ImpactStats;
  userName?: string;
  userHandle?: string;
}

export function ImpactTab({ stats, userName = 'Community Member', userHandle = 'user' }: ImpactTabProps) {
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(null);

  const totalHelps = stats.helpsGiven || 0;

  // Categories list with icons and colors
  const categories = [
    {
      key: 'blood' as const,
      label: 'Blood Support',
      icon: Droplet,
      count: stats.categoryBreakdown?.blood || 0,
      color: 'bg-rose-500',
      textColor: 'text-rose-600 dark:text-rose-400',
      bgColor: 'bg-rose-500/10',
    },
    {
      key: 'equipment' as const,
      label: 'Medical Equipment',
      icon: ShieldCheck,
      count: stats.categoryBreakdown?.equipment || 0,
      color: 'bg-indigo-500',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-500/10',
    },
    {
      key: 'elderly' as const,
      label: 'Elderly Assistance',
      icon: Heart,
      count: stats.categoryBreakdown?.elderly || 0,
      color: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      key: 'books' as const,
      label: 'Study & Books',
      icon: BookOpen,
      count: stats.categoryBreakdown?.books || 0,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      key: 'transport' as const,
      label: 'Emergency Transport',
      icon: MapPin,
      count: stats.categoryBreakdown?.transport || 0,
      color: 'bg-teal-500',
      textColor: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-500/10',
    },
  ];

  // Monthly activity data: ensure 6 months
  const monthlyData = stats.monthlyActivity && stats.monthlyActivity.length > 0
    ? stats.monthlyActivity
    : [
        { month: 'Nov', year: 2025, count: 0 },
        { month: 'Dec', year: 2025, count: 0 },
        { month: 'Jan', year: 2026, count: 0 },
        { month: 'Feb', year: 2026, count: 0 },
        { month: 'Mar', year: 2026, count: 0 },
        { month: 'Apr', year: 2026, count: 0 },
      ];

  const maxMonthlyCount = Math.max(1, ...monthlyData.map((m) => m.count));

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER & SHARE IMPACT ACTION
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <TrendingUp className="h-6 w-6 stroke-[2.2] notranslate" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Verified Community Impact</h2>
            <p className="text-xs text-muted-foreground">
              Record of community tasks completed and neighbors supported
            </p>
          </div>
        </div>

        <button
          onClick={() => setShareModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-soft transition touch-target self-start sm:self-auto shrink-0"
        >
          <Share2 className="h-4 w-4 notranslate" />
          <span>Share my impact</span>
        </button>
      </div>

      {/* =========================================================================
          2. REAL TOTALS CARDS (4 Main Impact Metrics)
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Helps Delivered */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-soft space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <HeartHandshake className="h-4 w-4 text-primary shrink-0 notranslate" />
            <span>Helps Delivered</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-foreground block tracking-tight font-mono">
              {stats.helpsGiven}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Verified community aid acts
            </span>
          </div>
        </div>

        {/* Metric 2: Hours Volunteered */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-soft space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Clock className="h-4 w-4 text-indigo-500 shrink-0 notranslate" />
            <span>Hours Volunteered</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-foreground block tracking-tight font-mono">
              {stats.hoursActive}h
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Dedicated volunteer time
            </span>
          </div>
        </div>

        {/* Metric 3: Neighbours Supported */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-soft space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Heart className="h-4 w-4 text-rose-500 shrink-0 notranslate" />
            <span>Neighbours Supported</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-foreground block tracking-tight font-mono">
              {stats.neighboursSupported}
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Distinct people assisted
            </span>
          </div>
        </div>

        {/* Metric 4: Distance Covered */}
        <div className="rounded-3xl border border-border bg-card p-4 sm:p-5 shadow-soft space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MapPin className="h-4 w-4 text-teal-500 shrink-0 notranslate" />
            <span>Distance Covered</span>
          </div>
          <div>
            <span className="text-2xl sm:text-3xl font-black text-foreground block tracking-tight font-mono">
              {stats.distanceCovered} km
            </span>
            <span className="text-[11px] text-muted-foreground block mt-0.5">
              Hyperlocal transit logged
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. CURRENT STREAK & BEST STREAK CARDS
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Current Streak */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Flame className="h-4 w-4 fill-amber-400 text-amber-500 notranslate" />
              <span>Current Streak</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Active consecutive days helping neighbors
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <Flame className="h-7 w-7 fill-amber-400 notranslate" />
          </div>
        </div>

        {/* Best Streak */}
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <Award className="h-4 w-4 notranslate" />
              <span>Best Streak</span>
            </div>
            <div className="text-2xl font-black text-foreground font-mono">
              {stats.bestStreak} {stats.bestStreak === 1 ? 'day' : 'days'}
            </div>
            <p className="text-[11px] text-muted-foreground">
              All-time community service streak record
            </p>
          </div>
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Award className="h-7 w-7 notranslate" />
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. CATEGORY BREAKDOWN: Small Visual Progress Bars
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Helps by Category</h3>
            <p className="text-xs text-muted-foreground">
              Distribution of verified community help across focus areas
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground font-mono">
            {totalHelps} Total
          </span>
        </div>

        <div className="space-y-3.5 pt-1">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const percent = totalHelps > 0 ? Math.round((cat.count / totalHelps) * 100) : 0;
            return (
              <div key={cat.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded-lg ${cat.bgColor} ${cat.textColor}`}>
                      <Icon className="h-3.5 w-3.5 notranslate" />
                    </div>
                    <span className="font-semibold text-foreground">{cat.label}</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="font-bold text-foreground">{cat.count}</span>
                    <span className="text-[11px] text-muted-foreground w-9 text-right">
                      {percent}%
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          5. SIMPLE MONTHLY CHART: Last 6 Months (SVG Bar Chart)
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-foreground">Activity Trend (Last 6 Months)</h3>
            <p className="text-xs text-muted-foreground">
              Verified community helps completed month by month
            </p>
          </div>
          {selectedMonthIdx !== null && (
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full animate-in fade-in">
              {monthlyData[selectedMonthIdx]?.count || 0} helps in {monthlyData[selectedMonthIdx]?.month}
            </span>
          )}
        </div>

        {totalHelps === 0 ? (
          /* Clean, compact empty state with gentle baseline */
          <div className="pt-4 pb-2 text-center space-y-3">
            <div className="h-16 w-full flex items-end justify-between px-4 border-b border-dashed border-border/60">
              {monthlyData.map((m) => (
                <div key={m.month} className="flex flex-col items-center">
                  <div className="h-1.5 w-6 rounded-full bg-muted" />
                  <span className="text-[10px] text-muted-foreground/60 mt-2 font-medium">{m.month}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Your first completed help will show here
            </p>
          </div>
        ) : (
          /* Real Data Bar Chart */
          <div className="pt-2">
            <div className="h-40 w-full flex items-end justify-between gap-2 px-2 pb-6 pt-4 border-b border-border/80 relative">
              {/* Background grid line */}
              <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-border/40 pointer-events-none" />

              {monthlyData.map((item, idx) => {
                const isCurrent = idx === monthlyData.length - 1;
                const isSelected = selectedMonthIdx === idx;
                const barHeightPct = totalHelps > 0 && maxMonthlyCount > 0
                  ? Math.max(8, Math.round((item.count / maxMonthlyCount) * 85))
                  : 6;

                return (
                  <button
                    key={`${item.month}-${item.year}`}
                    type="button"
                    onClick={() => setSelectedMonthIdx(isSelected ? null : idx)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                  >
                    {/* Value above bar */}
                    <span
                      className={`text-[10px] font-bold font-mono mb-1 transition-transform group-hover:scale-110 ${
                        item.count > 0 ? 'text-foreground' : 'text-muted-foreground/60'
                      }`}
                    >
                      {item.count}
                    </span>

                    {/* Bar */}
                    <div className="w-full max-w-[36px] bg-muted/60 rounded-xl overflow-hidden flex items-end h-full">
                      <div
                        className={`w-full rounded-xl transition-all duration-300 ${
                          isSelected
                            ? 'bg-amber-500 shadow-md ring-2 ring-amber-400'
                            : isCurrent
                            ? 'bg-primary shadow-xs'
                            : item.count > 0
                            ? 'bg-teal-500 dark:bg-teal-400'
                            : 'bg-muted-foreground/20'
                        }`}
                        style={{ height: `${barHeightPct}%` }}
                      />
                    </div>

                    {/* Label underneath */}
                    <span
                      className={`absolute -bottom-5 text-[11px] font-semibold whitespace-nowrap ${
                        isSelected
                          ? 'text-amber-500 font-bold'
                          : isCurrent
                          ? 'text-primary font-bold'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {item.month}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          6. SIMPLE EXPLANATION
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-foreground">
          <Info className="h-4 w-4 text-primary notranslate shrink-0" />
          <span>How Impact Tracking Works</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          A help counts only after you finish it and the other person confirms it.
        </p>
      </div>

      {/* =========================================================================
          7. "SHARE MY IMPACT" HIGH-RES MODAL
          Wire Share Your Impact modal dialog and handleCopyShare action
         ========================================================================= */}
      {shareModalOpen && (
        <ShareImpactModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          stats={stats}
          userName={userName}
          userHandle={userHandle}
        />
      )}
    </div>
  );
}
