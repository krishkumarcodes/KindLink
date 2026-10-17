'use client';

import React, { useState, useMemo } from 'react';
import {
  Award,
  Filter,
  CheckCircle2,
  Lock,
  Clock,
  Pin,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { UserProfile } from '@/lib/data/types';
import {
  calculateBadgesForUser,
  getBadgesSummary,
  UserBadgeProgress,
  BadgeCategory,
  BadgeTier,
} from '@/lib/data/badges';
import { BadgeMedalIcon } from '../BadgeMedalIcon';
import { BadgeDetailSheet } from '../BadgeDetailSheet';

type StatusFilter = 'all' | 'earned' | 'in_progress' | 'locked';

interface BadgesTabProps {
  userProfile?: UserProfile;
}

export function BadgesTab({ userProfile: propUserProfile }: BadgesTabProps) {
  const storeUserProfile = useKindLinkStore((state) => state.userProfile);
  const updateUserProfile = useKindLinkStore((state) => state.updateUserProfile);

  const userProfile = propUserProfile || storeUserProfile;

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<UserBadgeProgress | null>(null);

  // Calculate full badges list with user progress
  const badges = useMemo(() => {
    return calculateBadgesForUser(userProfile);
  }, [userProfile]);

  const summary = useMemo(() => {
    return getBadgesSummary(badges);
  }, [badges]);

  // Handle pin toggle (Max 3 badges)
  const handleTogglePin = async (badgeId: string, willPin: boolean) => {
    const currentPinned = userProfile.pinnedBadges || [];

    if (willPin) {
      if (currentPinned.length >= 3) {
        toast.error('Maximum 3 badges can be pinned to your profile header card.');
        return;
      }
      const nextPinned = [...currentPinned, badgeId];
      updateUserProfile({ pinnedBadges: nextPinned });

      // Persist to API route in background
      try {
        const res = await fetch('/api/badges/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badgeId, pinned: true }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (data.error) toast.error(data.error);
        } else {
          toast.success('Badge pinned to profile header!');
        }
      } catch {
        // Optimistic store update succeeded
      }
    } else {
      const nextPinned = currentPinned.filter((id) => id !== badgeId);
      updateUserProfile({ pinnedBadges: nextPinned });

      try {
        await fetch('/api/badges/pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ badgeId, pinned: false }),
        });
        toast.success('Badge unpinned from profile header');
      } catch {
        // Handled
      }
    }
  };

  // Filtered badges list
  const filteredBadges = useMemo(() => {
    return badges.filter((b) => {
      // Status filter
      if (statusFilter === 'earned' && !b.earned) return false;
      if (statusFilter === 'in_progress' && (b.earned || b.currentValue === 0)) return false;
      if (statusFilter === 'locked' && b.earned) return false;

      // Category filter
      if (categoryFilter !== 'all' && b.category.toLowerCase() !== categoryFilter.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [badges, statusFilter, categoryFilter]);

  // Unique categories for filter chips
  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'All Categories' },
    { key: 'community', label: 'Community' },
    { key: 'emergency', label: 'Emergency' },
    { key: 'healthcare', label: 'Healthcare' },
    { key: 'health', label: 'Health' },
    { key: 'education', label: 'Education' },
    { key: 'care', label: 'Care' },
    { key: 'mobility', label: 'Mobility' },
    { key: 'trust', label: 'Trust' },
    { key: 'streak', label: 'Streak' },
    { key: 'verification', label: 'Verification' },
  ];

  // SVG Circular progress ring calculations
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (summary.earnedPercentage / 100) * ringCircumference;

  const tierBadgeColors: Record<BadgeTier | 'locked', string> = {
    bronze: 'bg-amber-700/10 text-amber-700 border-amber-700/20',
    silver: 'bg-slate-500/10 text-slate-500 dark:text-slate-300 border-slate-400/20',
    gold: 'bg-amber-400/15 text-amber-600 dark:text-amber-400 border-amber-400/30',
    platinum: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    locked: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER: Circular Progress Ring, "X of Y earned", Quick Filter Chips
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          {/* Title & Description */}
          <div className="flex items-center gap-4">
            {/* Circular Progress Ring */}
            <div className="relative shrink-0 flex items-center justify-center">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  className="stroke-muted text-muted fill-none"
                  strokeWidth="8"
                />
                {/* Active Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={ringRadius}
                  className="stroke-primary fill-none transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
                <span className="text-sm font-black text-foreground">
                  {summary.earnedPercentage}%
                </span>
                <span className="text-[9px] font-semibold text-muted-foreground">
                  {summary.earned}/{summary.total}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-foreground">
                  Badges & Achievements
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-primary/10 text-primary border border-primary/20">
                  {summary.earned} of {summary.total} earned
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed max-w-md">
                Earn Bronze, Silver, Gold, and Platinum level credentials through verified acts
                of neighbourhood mutual aid.
              </p>
            </div>
          </div>

          {/* Quick Metrics & Pinned Indicator */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <div className="px-3 py-1.5 rounded-2xl bg-muted/40 border border-border text-center">
              <div className="text-[10px] uppercase font-bold text-muted-foreground">Pinned</div>
              <div className="text-xs font-black text-primary">
                {summary.pinnedIds.length} / 3
              </div>
            </div>
            <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                Unlocked
              </div>
              <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                {summary.earned}
              </div>
            </div>
          </div>
        </div>

        {/* Status Filter Chips: All, Earned, In progress, Locked */}
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-border/60">
          {[
            { id: 'all' as StatusFilter, label: 'All Badges', count: summary.total },
            { id: 'earned' as StatusFilter, label: 'Earned', count: summary.earned },
            {
              id: 'in_progress' as StatusFilter,
              label: 'In Progress',
              count: summary.inProgress,
            },
            { id: 'locked' as StatusFilter, label: 'Locked', count: summary.locked },
          ].map((chip) => {
            const isActive = statusFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setStatusFilter(chip.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 touch-target ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{chip.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-background/80 text-muted-foreground'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Filter Chips (Horizontally Scrollable) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setCategoryFilter(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors touch-target ${
                  isActive
                    ? 'bg-foreground text-background font-bold'
                    : 'bg-background text-muted-foreground border border-border/80 hover:bg-muted'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* =========================================================================
          2. BADGES GRID: 2-column on mobile, 3 on md, 4 on lg
         ========================================================================= */}
      {filteredBadges.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Award className="h-7 w-7 notranslate" />
          </div>
          <h3 className="text-base font-bold text-foreground">No badges match your filter</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try switching to "All Badges" or a different category to view available community
            achievements.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredBadges.map((badge) => {
            const isPinned = (userProfile.pinnedBadges || []).includes(badge.id);

            return (
              <div
                key={badge.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBadge(badge)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedBadge(badge);
                  }
                }}
                className={`group relative rounded-3xl border p-4 shadow-soft transition-all duration-200 cursor-pointer flex flex-col justify-between select-none active:scale-[0.98] ${
                  badge.earned
                    ? 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                    : 'bg-muted/20 border-border/60 opacity-75 hover:opacity-100 hover:border-border'
                }`}
              >
                {/* Pinned Tag in top-right */}
                {isPinned && (
                  <div
                    title="Pinned to profile header"
                    className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center"
                  >
                    <Pin className="h-3 w-3 fill-current notranslate" />
                  </div>
                )}

                <div>
                  {/* Category Pill & Level Name */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground truncate uppercase tracking-wider">
                      {badge.category}
                    </span>
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border ${
                        tierBadgeColors[badge.currentTier]
                      }`}
                    >
                      {badge.earned ? badge.currentTierName : 'Locked'}
                    </span>
                  </div>

                  {/* Medal Icon with Level Ring */}
                  <div className="flex justify-center my-2.5">
                    <BadgeMedalIcon
                      iconName={badge.icon}
                      tier={badge.currentTier}
                      size="md"
                      isEarned={badge.earned}
                    />
                  </div>

                  {/* Badge Title & Short Description */}
                  <div className="text-center space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                      {badge.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Progress Bar & Progress Label (e.g. "7 / 10", strictly never > 100%) */}
                <div className="mt-3.5 pt-2.5 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold">
                    <span className="text-muted-foreground truncate">
                      {badge.progressLabel} {badge.unit}
                    </span>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        badge.earned
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-primary'
                      }`}
                    >
                      {badge.progressPercent}%
                    </span>
                  </div>

                  {/* Strictly bounded progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.earned ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${badge.progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          3. BADGE DETAIL SHEET MODAL
         ========================================================================= */}
      <BadgeDetailSheet
        badge={selectedBadge}
        open={Boolean(selectedBadge)}
        onClose={() => setSelectedBadge(null)}
        onTogglePin={handleTogglePin}
        isPinned={
          Boolean(selectedBadge) &&
          (userProfile.pinnedBadges || []).includes(selectedBadge!.id)
        }
        pinnedCount={(userProfile.pinnedBadges || []).length}
        reduceMotion={userProfile.reduceMotion}
      />
    </div>
  );
}
