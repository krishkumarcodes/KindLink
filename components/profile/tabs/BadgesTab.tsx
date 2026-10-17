'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Award,
  Pin,
  CheckCircle2,
  Sparkles,
  HeartPulse,
  Stethoscope,
  Users,
  GraduationCap,
  ShieldCheck,
  LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { UserProfile } from '@/lib/data/types';
import {
  calculateBadgesForUser,
  getBadgesSummary,
  UserBadgeProgress,
  BadgeTier,
} from '@/lib/data/badges';
import { BadgeMedalIcon } from '../BadgeMedalIcon';
import { BadgeDetailSheet } from '../BadgeDetailSheet';

type StatusFilter = 'all' | 'earned' | 'in_progress' | 'locked';

interface CategoryChipConfig {
  key: string;
  label: string;
  icon: LucideIcon;
}

const CATEGORY_CHIPS: CategoryChipConfig[] = [
  { key: 'all', label: 'All', icon: Sparkles },
  { key: 'vital', label: 'Vital Help', icon: HeartPulse },
  { key: 'healthcare', label: 'Healthcare', icon: Stethoscope },
  { key: 'community', label: 'Community', icon: Users },
  { key: 'mentorship', label: 'Mentorship', icon: GraduationCap },
  { key: 'verifications', label: 'Verifications', icon: ShieldCheck },
];

/**
 * Maps a badge to one of the 5 high-level categories
 */
function isBadgeInCategory(badge: UserBadgeProgress, categoryKey: string): boolean {
  if (categoryKey === 'all') return true;

  const id = badge.id.toLowerCase();
  const cat = badge.category.toLowerCase();

  switch (categoryKey) {
    case 'vital':
      return (
        ['life_saver', 'emergency_first_responder', 'quick_responder', 'safe_ride_hero', 'helper_streak', 'first_help'].includes(id) ||
        cat === 'emergency' ||
        cat === 'mobility' ||
        cat === 'streak' ||
        cat === 'milestone'
      );

    case 'healthcare':
      return (
        ['medical_gear_lender', 'verified_doctor', 'verified_nurse', 'verified_pharmacist'].includes(id) ||
        cat === 'healthcare' ||
        cat === 'health'
      );

    case 'community':
      return (
        ['community_pillar', 'trusted_neighbour', 'elder_friend'].includes(id) ||
        cat === 'community' ||
        cat === 'trust' ||
        cat === 'care'
      );

    case 'mentorship':
      return (
        ['study_mentor', 'verified_teacher'].includes(id) ||
        cat === 'education'
      );

    case 'verifications':
      return (
        badge.type === 'verified' ||
        cat === 'verification' ||
        [
          'verified_member',
          'verified_student',
          'verified_doctor',
          'verified_nurse',
          'verified_pharmacist',
          'verified_teacher',
          'verified_ngo',
        ].includes(id)
      );

    default:
      return true;
  }
}

/**
 * Returns clear, bounded progress text, e.g. "7 of 10, next level at 25" (never > 100%)
 */
export function getBadgeProgressDisplay(badge: UserBadgeProgress): {
  progressText: string;
  percentage: number;
} {
  if (badge.type === 'verified') {
    return {
      progressText: badge.earned ? 'Verified Proof' : 'Pending verification',
      percentage: badge.earned ? 100 : 0,
    };
  }

  const { currentValue, levels, currentLevel } = badge;
  const numLevels = levels.length;

  if (numLevels === 1) {
    const target = levels[0].threshold;
    const boundedCurrent = Math.min(currentValue, target);
    const pct = target > 0 ? Math.min(100, Math.round((boundedCurrent / target) * 100)) : 0;
    return {
      progressText: badge.earned
        ? `${target} of ${target} completed`
        : `${boundedCurrent} of ${target}`,
      percentage: pct,
    };
  }

  // Max tier achieved
  if (currentLevel >= numLevels) {
    const maxThreshold = levels[numLevels - 1].threshold;
    return {
      progressText: `${maxThreshold} of ${maxThreshold} · Max level`,
      percentage: 100,
    };
  }

  // Multi-tier ladder progress
  const currentTarget = levels[currentLevel].threshold;
  const boundedCurrent = Math.min(currentValue, currentTarget);
  const percentage = Math.min(100, Math.round((boundedCurrent / currentTarget) * 100));

  let progressText = '';
  if (currentLevel + 1 < numLevels) {
    const nextNextThreshold = levels[currentLevel + 1].threshold;
    progressText = `${boundedCurrent} of ${currentTarget}, next level at ${nextNextThreshold}`;
  } else {
    progressText = `${boundedCurrent} of ${currentTarget} to ${levels[currentLevel].tierName}`;
  }

  return { progressText, percentage };
}

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

  // Scroll Container Refs for Category Chips
  const categoryContainerRef = useRef<HTMLDivElement | null>(null);
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Calculate full badges list with user progress
  const badges = useMemo(() => {
    return calculateBadgesForUser(userProfile);
  }, [userProfile]);

  const summary = useMemo(() => {
    return getBadgesSummary(badges);
  }, [badges]);

  // Update scroll indicators
  const updateScrollState = () => {
    const el = categoryContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, []);

  /**
   * Smoothly auto-scrolls the active category chip horizontally WITHOUT moving the window vertically!
   */
  const handleCategorySelect = (key: string) => {
    setCategoryFilter(key);
    const container = categoryContainerRef.current;
    const chip = chipRefs.current[key];
    if (container && chip) {
      const containerWidth = container.offsetWidth;
      const chipLeft = chip.offsetLeft;
      const chipWidth = chip.offsetWidth;
      const targetScrollLeft = chipLeft - containerWidth / 2 + chipWidth / 2;

      // Pure horizontal container scroll: window vertical position remains untouched
      container.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }
  };

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
      if (!isBadgeInCategory(b, categoryFilter)) return false;

      return true;
    });
  }, [badges, statusFilter, categoryFilter]);

  // SVG Circular progress ring calculations
  const ringRadius = 38;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset =
    ringCircumference - (summary.earnedPercentage / 100) * ringCircumference;

  const tierBadgeColors: Record<BadgeTier | 'locked', string> = {
    bronze: 'bg-amber-700/10 text-amber-700 dark:text-amber-400 border-amber-700/30',
    silver: 'bg-slate-400/10 text-slate-600 dark:text-slate-300 border-slate-400/30',
    gold: 'bg-amber-400/15 text-amber-600 dark:text-amber-400 border-amber-400/40',
    platinum: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/40',
    locked: 'bg-muted text-muted-foreground border-border/80',
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. HEADER CARD: Title + Subtitle, "X of 18 earned" pill, Ring & Stat Tiles
         ========================================================================= */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-soft space-y-5">
        {/* Title row with vertically centered pill that never wraps */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
              Badges
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              Your milestones and verified recognitions
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 whitespace-nowrap">
              {summary.earned} of {summary.total} earned
            </span>
          </div>
        </div>

        {/* Circular Progress Ring & Two Equal-Width Stat Tiles */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 pt-1">
          {/* Circular Progress Ring */}
          <div className="relative shrink-0 flex items-center justify-center">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                className="stroke-muted text-muted fill-none"
                strokeWidth="7"
              />
              <circle
                cx="50"
                cy="50"
                r={ringRadius}
                className="stroke-primary fill-none transition-all duration-1000 ease-out"
                strokeWidth="7"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none">
              <span className="text-base font-black text-foreground">
                {summary.earnedPercentage}%
              </span>
              <span className="text-[9px] font-semibold text-muted-foreground">
                Complete
              </span>
            </div>
          </div>

          {/* Two Equal-Width Stat Tiles: "Pinned (X/3)" & "Unlocked (X/18)" */}
          <div className="grid grid-cols-2 gap-3 w-full flex-1">
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-muted/40 border border-border text-center">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Pin className="h-3.5 w-3.5 text-primary notranslate" />
                <span>Pinned</span>
              </div>
              <div className="text-base sm:text-lg font-black text-foreground mt-0.5">
                {summary.pinnedIds.length}{' '}
                <span className="text-xs text-muted-foreground font-normal">/ 3</span>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 notranslate" />
                <span>Unlocked</span>
              </div>
              <div className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {summary.earned}{' '}
                <span className="text-xs text-emerald-600/70 dark:text-emerald-400/70 font-normal">
                  / {summary.total}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Chips: Single Row Segmented Control (All, Earned, In progress, Locked) */}
        <div className="p-1 bg-muted/50 rounded-2xl border border-border/60 flex items-center w-full">
          {[
            { id: 'all' as StatusFilter, label: 'All', count: summary.total },
            { id: 'earned' as StatusFilter, label: 'Earned', count: summary.earned },
            {
              id: 'in_progress' as StatusFilter,
              label: 'In progress',
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
                className={`flex-1 py-1.5 px-1 sm:px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 touch-target min-w-0 ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="truncate">{chip.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono shrink-0 ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-background text-muted-foreground border border-border/50'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Category Chips with Icons, Full Names, Equal Height (38-40px), Soft Fade Masks */}
        <div className="relative pt-1">
          {/* Soft Left Fade Mask */}
          <div
            className={`pointer-events-none absolute left-0 top-1 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10 transition-opacity duration-200 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {/* Soft Right Fade Mask */}
          <div
            className={`pointer-events-none absolute right-0 top-1 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 transition-opacity duration-200 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
          />

          <div
            ref={categoryContainerRef}
            onScroll={updateScrollState}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth"
          >
            {CATEGORY_CHIPS.map((cat) => {
              const isActive = categoryFilter === cat.key;
              const Icon = cat.icon;

              return (
                <button
                  key={cat.key}
                  ref={(el) => {
                    chipRefs.current[cat.key] = el;
                  }}
                  type="button"
                  onClick={() => handleCategorySelect(cat.key)}
                  className={`h-10 min-h-[40px] px-3.5 rounded-xl text-xs font-bold whitespace-nowrap shrink-0 transition-all flex items-center gap-2 touch-target ${
                    isActive
                      ? 'bg-foreground text-background shadow-xs'
                      : 'bg-background text-muted-foreground border border-border hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0 notranslate" />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. BADGES GRID: 2-column mobile, 3-column tablet, 4-column desktop
         ========================================================================= */}
      {filteredBadges.length === 0 ? (
        <div className="rounded-3xl border border-border bg-card p-12 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Award className="h-7 w-7 notranslate" />
          </div>
          <h3 className="text-base font-bold text-foreground">No badges match your filter</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Try switching to &quot;All Badges&quot; or selecting a different category.
          </p>
          <button
            type="button"
            onClick={() => {
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs touch-target"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredBadges.map((badge) => {
            const isPinned = (userProfile.pinnedBadges || []).includes(badge.id);
            const { progressText, percentage } = getBadgeProgressDisplay(badge);

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
                className={`group relative rounded-3xl border p-4 shadow-soft transition-all duration-200 cursor-pointer flex flex-col justify-between h-full select-none active:scale-[0.98] ${
                  badge.earned
                    ? 'bg-card border-border hover:border-primary/50 hover:shadow-md'
                    : 'bg-muted/20 border-border/60 opacity-80 hover:opacity-100 hover:border-border'
                }`}
              >
                {/* Pinned Tag in top-right */}
                {isPinned && (
                  <div
                    title="Pinned to profile header"
                    className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center shadow-xs"
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
                      badgeId={badge.id}
                      iconName={badge.icon}
                      tier={badge.currentTier}
                      size="md"
                      isEarned={badge.earned}
                    />
                  </div>

                  {/* Badge Title: Wraps up to 2 lines, never cut off */}
                  <div className="text-center space-y-1">
                    <h3 className="h-10 min-h-[2.5rem] flex items-center justify-center text-center text-xs sm:text-sm font-bold text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {badge.title}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground line-clamp-2 leading-tight">
                      {badge.description}
                    </p>
                  </div>
                </div>

                {/* Progress Bar & Clear Text (e.g. "7 of 10, next level at 25", never > 100%) */}
                <div className="mt-3.5 pt-2.5 border-t border-border/60 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-semibold gap-1">
                    <span className="text-muted-foreground truncate" title={progressText}>
                      {progressText}
                    </span>
                    <span
                      className={`font-mono font-bold shrink-0 ${
                        badge.earned
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-primary'
                      }`}
                    >
                      {percentage}%
                    </span>
                  </div>

                  {/* Strictly bounded progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        badge.earned ? 'bg-emerald-500' : 'bg-primary'
                      }`}
                      style={{ width: `${percentage}%` }}
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
