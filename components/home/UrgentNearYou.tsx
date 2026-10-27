'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Flame,
  ArrowRight,
  Heart,
  Compass,
  PlusCircle,
  AlertTriangle,
  Clock,
  MapPin,
  ShieldCheck,
  HeartHandshake,
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
} from 'lucide-react';
import { HelpCategory, HelpRequest, TravelMode } from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { calculateETA, formatETA } from '@/lib/data/distance';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { formatWaitingTime } from '@/lib/utils/formatTime';
import { PrimaryHelpButton } from '@/components/requests/ActionButtons';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { CategoryEmblem } from '@/components/categories/CategoryEmblem';
import {
  formatCategoryTitle,
  getCategoryByKey,
  CATEGORY_ICON_MAP,
} from '@/lib/data/categories';

export interface UrgentNearYouProps {
  /** Optional custom requests list. If omitted, fetched from useKindLinkStore. */
  requests?: HelpRequest[];
  /** Loading state for requests. If omitted, taken from useKindLinkStore. */
  isLoadingRequests?: boolean;
  /** Radius used for distance filtering. If omitted, taken from useKindLinkStore. */
  filterRadius?: number;
  /** Active travel mode for ETA calculations. If omitted, taken from useKindLinkStore. */
  travelMode?: TravelMode;
  /** Callback fired when a request card or its help button is clicked. */
  onRequestClick?: (request: HelpRequest) => void;
  /** Callback fired when "View all" is clicked. */
  onViewAll?: () => void;
  /** Callback fired when "Broaden Search Radius (50 km)" is clicked. */
  onBroadenRadius?: () => void;
  /** Callback fired when "Post a Request" is clicked. */
  onPostRequest?: () => void;
  /** Optional container class name. */
  className?: string;
}

// Urgency priority mapper for strict ordering
const URGENCY_PRIORITY: Record<string, number> = {
  critical: 1,
  high: 2,
  medium: 3,
  low: 4,
};

function getUrgencyBarColor(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return 'bg-rose-600';
    case 'high':
      return 'bg-amber-500';
    case 'medium':
      return 'bg-blue-500';
    case 'low':
      return 'bg-emerald-500';
    default:
      return 'bg-slate-400';
  }
}

function getUrgencyBadgeStyle(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30';
    case 'high':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'medium':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 'low':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
    default:
      return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30';
  }
}

function getUrgencyTextLabel(urgency: string): string {
  switch (urgency) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return urgency ? urgency.charAt(0).toUpperCase() + urgency.slice(1) : 'Standard';
  }
}

function getCategoryIcon(category: HelpCategory | string) {
  const cat = getCategoryByKey(category);
  if (cat && CATEGORY_ICON_MAP[cat.icon]) {
    const Icon = CATEGORY_ICON_MAP[cat.icon];
    return <Icon className="h-4 w-4 notranslate" />;
  }
  return <HeartHandshake className="h-4 w-4 notranslate" />;
}

function getCategoryCircleStyle(category: HelpCategory | string, customLabel?: string) {
  const token = getCategoryToken(category, customLabel);
  return {
    backgroundColor: token.lightBg,
    borderColor: token.border,
    color: token.primary,
  };
}

function getCategoryChip(category: HelpCategory | string, customLabel?: string) {
  const token = getCategoryToken(category, customLabel);
  const title = formatCategoryTitle(category, customLabel);
  const icon = getCategoryIcon(category);

  return {
    label: title,
    icon,
    style: {
      backgroundColor: token.lightBg,
      borderColor: token.border,
      color: token.primary,
    },
  };
}

export function UrgentNearYou({
  requests: propRequests,
  isLoadingRequests: propIsLoading,
  filterRadius: propFilterRadius,
  travelMode: propTravelMode,
  onRequestClick,
  onViewAll,
  onBroadenRadius,
  onPostRequest,
  className = '',
}: UrgentNearYouProps) {
  // Store fallback access
  const storeRequests = useKindLinkStore((s) => s.requests);
  const storeIsLoading = useKindLinkStore((s) => s.isLoadingRequests);
  const storeFilterRadius = useKindLinkStore((s) => s.filterRadius);
  const storeTravelMode = useKindLinkStore((s) => s.travelMode);
  const userProfile = useKindLinkStore((s) => s.userProfile);
  const setCurrentView = useKindLinkStore((s) => s.setCurrentView);
  const setSelectedRequestId = useKindLinkStore((s) => s.setSelectedRequestId);
  const setFilterRadius = useKindLinkStore((s) => s.setFilterRadius);

  const effectiveRequests = propRequests ?? storeRequests;
  const effectiveIsLoading = propIsLoading ?? storeIsLoading;
  const effectiveRadius = propFilterRadius ?? storeFilterRadius ?? 20;
  const effectiveTravelMode = propTravelMode ?? storeTravelMode ?? 'bike';

  // Sort strictly by urgency, distance, and waiting time - exclude user's own requests from help list
  const sortedUrgentRequests = useMemo(() => {
    return [...effectiveRequests]
      .filter((r) => r.status !== 'completed' && r.status !== 'cancelled' && !isRequestOwner(r, userProfile))
      .sort((a, b) => {
        const urgA = URGENCY_PRIORITY[a.urgency] ?? 5;
        const urgB = URGENCY_PRIORITY[b.urgency] ?? 5;
        if (urgA !== urgB) return urgA - urgB;
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        return (b.waitingMinutes || 0) - (a.waitingMinutes || 0);
      });
  }, [effectiveRequests]);

  // Top 3 requests for the card list
  const top3Requests = useMemo(() => {
    return sortedUrgentRequests.slice(0, 3);
  }, [sortedUrgentRequests]);

  // Total count for the View All pill (shown ONLY when > 0, never (0))
  const totalCount = sortedUrgentRequests.length;

  // Track newly arrived live requests to animate them with soft highlight
  const prevIdsRef = useRef<Set<string>>(new Set());
  const [newlyAddedIds, setNewlyAddedIds] = useState<Set<string>>(new Set());
  const isInitialMount = useRef(true);

  useEffect(() => {
    const currentIds = new Set(top3Requests.map((r) => r.id));
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevIdsRef.current = currentIds;
      return;
    }

    const added = new Set<string>();
    currentIds.forEach((id) => {
      if (!prevIdsRef.current.has(id)) {
        added.add(id);
      }
    });

    if (added.size > 0) {
      setNewlyAddedIds((prev) => {
        const next = new Set<string>();
        prev.forEach((id) => next.add(id));
        added.forEach((id) => next.add(id));
        return next;
      });
      const timer = setTimeout(() => {
        setNewlyAddedIds(new Set());
      }, 3500);
      return () => clearTimeout(timer);
    }

    prevIdsRef.current = currentIds;
  }, [top3Requests]);

  // Handlers
  const handleRequestClick = (req: HelpRequest) => {
    if (onRequestClick) {
      onRequestClick(req);
    } else {
      setSelectedRequestId(req.id);
      setCurrentView('requests');
    }
  };

  const handleViewAll = () => {
    if (onViewAll) {
      onViewAll();
    } else {
      setCurrentView('requests');
    }
  };

  const handleBroadenRadius = () => {
    if (onBroadenRadius) {
      onBroadenRadius();
    } else {
      setFilterRadius(50);
      setCurrentView('requests');
    }
  };

  const handlePostRequest = () => {
    if (onPostRequest) {
      onPostRequest();
    } else {
      setCurrentView('new');
    }
  };

  return (
    <section aria-labelledby="urgent-near-you-heading" className={`space-y-3.5 ${className}`}>
      {/* 1. Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          {/* Flame Chip + Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Flame className="h-5 w-5 notranslate" />
            </div>
            <h2
              id="urgent-near-you-heading"
              className="text-base sm:text-lg font-bold text-foreground"
            >
              Urgent Near You
            </h2>
          </div>

          {/* Single-line 'View all' button with small arrow and pill count (44px touch target) */}
          <button
            type="button"
            onClick={handleViewAll}
            className="shrink-0 flex items-center gap-1.5 h-[44px] min-h-[44px] px-3 rounded-xl text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition whitespace-nowrap touch-target active:scale-98"
            aria-label={`View all urgent requests${totalCount > 0 ? `, ${totalCount} available` : ''}`}
          >
            <span>View all</span>
            {totalCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {totalCount}
              </span>
            )}
            <ArrowRight className="h-3.5 w-3.5 shrink-0 notranslate" />
          </button>
        </div>

        {/* Subtitle under title across the full width: 'Most urgent first, then nearest' */}
        <p className="text-xs text-muted-foreground">
          Most urgent first, then nearest
        </p>
      </div>

      {/* 2. Content area: Skeletons, Requests List, or Empty State */}
      {effectiveIsLoading ? (
        /* 3 skeleton cards while loading (isLoadingRequests) */
        <div className="space-y-3" aria-busy="true" aria-label="Loading urgent requests">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="flex overflow-hidden rounded-2xl border border-border/70 dark:border-white/5 bg-card/60 p-3.5 sm:p-4 animate-pulse items-center"
            >
              <div className="w-1.5 self-stretch rounded-l-2xl bg-muted shrink-0 mr-3.5" />
              <div className="flex-1 flex flex-col min-[400px]:flex-row min-[400px]:items-center justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2 py-0.5">
                    <div className="flex gap-2">
                      <div className="h-4 bg-muted rounded-md w-16" />
                      <div className="h-4 bg-muted rounded-md w-14" />
                    </div>
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3.5 bg-muted rounded w-1/2" />
                  </div>
                </div>
                <div className="h-[44px] w-full min-[400px]:w-20 rounded-xl bg-muted shrink-0" />
              </div>
            </div>
          ))}
        </div>
      ) : top3Requests.length > 0 ? (
        /* Top 3 requests as clean, tappable cards in a vertical list with 12 px gaps (space-y-3) */
        <div className="space-y-3" role="list">
          {top3Requests.map((req) => {
            const etaMinutes = calculateETA(req.distanceKm, effectiveTravelMode);
            const etaStr = formatETA(etaMinutes);
            const isNew = newlyAddedIds.has(req.id);
            const categoryChip = getCategoryChip(req.category, req.customCategoryLabel);
            const categoryToken = getCategoryToken(req.category, req.customCategoryLabel);
            const circleStyle = getCategoryCircleStyle(req.category, req.customCategoryLabel);

            return (
              <div
                key={req.id}
                role="listitem"
                tabIndex={0}
                onClick={() => handleRequestClick(req)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleRequestClick(req);
                  }
                }}
                style={{ borderLeftColor: categoryToken.primary, borderLeftWidth: '4px' }}
                className={`group relative flex overflow-hidden rounded-3xl border border-white/40 dark:border-white/12 bg-card/85 dark:bg-card/75 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${
                  isNew ? 'animate-urgent-slide-in' : ''
                }`}
                aria-label={`Urgent request: ${req.title}, urgency ${req.urgency}, distance ${req.distanceKm} kilometers`}
              >
                {/* Specular top rim highlight */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent z-10"
                  aria-hidden="true"
                />

                {/* Translucent watery caustic ambient tint */}
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-primary/[0.03] dark:from-white/[0.05] dark:via-transparent dark:to-primary/[0.04] z-0"
                  aria-hidden="true"
                />

                {/* Watery crystal sheen overlay */}
                <div
                  className="crystal-card-sheen crystal-card-ambient-sheen"
                  aria-hidden="true"
                />

                {/* Ambient crystal corner refraction */}
                <div
                  className="pointer-events-none absolute -top-12 -right-12 w-28 h-28 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 ease-out z-0 opacity-20 dark:opacity-25"
                  style={{
                    background: `radial-gradient(circle, ${categoryToken.glow} 0%, transparent 70%)`,
                  }}
                  aria-hidden="true"
                />

                {/* Coloured urgency bar on the left */}
                <div
                  className={`w-1.5 self-stretch shrink-0 rounded-l-3xl relative z-10 ${getUrgencyBarColor(
                    req.urgency
                  )}`}
                  aria-hidden="true"
                />

                {/* Card Body */}
                <div className="flex-1 p-3.5 sm:p-4 min-w-0 relative z-10">
                  <div className="flex flex-col min-[400px]:flex-row min-[400px]:items-center justify-between gap-3">
                    {/* Left: Category icon in tinted circle + Content details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      {/* Category icon with bespoke multi-stop gradient emblem and ambient glow */}
                      <div className="relative shrink-0">
                        <div
                          className="pointer-events-none absolute -inset-1.5 rounded-full blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300"
                          style={{ backgroundColor: categoryToken.primary }}
                          aria-hidden="true"
                        />
                        <CategoryEmblem
                          category={req.category}
                          customLabel={req.customCategoryLabel}
                          size="md"
                          glow={true}
                        />
                      </div>

                      {/* Content column */}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        {/* Top chips row: Category chip + Urgency badge with text label + Verified */}
                        <div className="flex items-center flex-wrap gap-1.5">
                          {/* Top category chip with icon and accent color */}
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border"
                            style={categoryChip.style}
                          >
                            {categoryChip.icon}
                            <span>{categoryChip.label}</span>
                          </span>

                          {/* Urgency accent badge with text label (never colour only) */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${getUrgencyBadgeStyle(
                              req.urgency
                            )}`}
                          >
                            <AlertTriangle className="h-3 w-3 shrink-0 notranslate" />
                            <span>{getUrgencyTextLabel(req.urgency)}</span>
                          </span>

                          {/* Small "Verified" badge if requester is verified */}
                          {req.verified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <ShieldCheck className="h-3 w-3 shrink-0 notranslate" />
                              <span>{req.verificationBadge || 'Verified'}</span>
                            </span>
                          )}
                        </div>

                        {/* Request title */}
                        <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition leading-snug break-words">
                          {req.title}
                        </h3>

                        {/* Category-specific detail chips */}
                        {req.category === 'blood' && (req.bloodGroup || req.unitsNeeded || req.hospitalName) && (
                          <div className="flex items-center flex-wrap gap-1.5">
                            {req.bloodGroup && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-bold border border-rose-500/20">
                                🩸 Group {req.bloodGroup}
                              </span>
                            )}
                            {req.unitsNeeded && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold border border-rose-500/20">
                                {req.unitsNeeded} {req.unitsNeeded === 1 ? 'unit' : 'units'}
                              </span>
                            )}
                            {req.hospitalName && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-semibold border border-rose-500/20 max-w-[200px]">
                                🏥 {req.hospitalName}
                              </span>
                            )}
                          </div>
                        )}

                        {req.category === 'transport' && (req.pickupAddress || req.dropAddress) && (
                          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20 text-[11px] font-medium max-w-full overflow-hidden">
                            <span className="max-w-[150px]">{req.pickupAddress || 'Pickup'}</span>
                            <span className="text-amber-500 font-bold shrink-0">→</span>
                            <span className="max-w-[150px]">{req.dropAddress || 'Destination'}</span>
                          </div>
                        )}

                        {req.category === 'books' && (req.booksClassSubject || req.bookTitle) && (
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                              📚 {req.booksClassSubject || req.bookTitle}
                            </span>
                            {req.bookCondition && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px]">
                                {req.bookCondition}
                              </span>
                            )}
                          </div>
                        )}

                        {req.category === 'equipment' && (req.itemType || req.itemDuration) && (
                          <div className="flex items-center flex-wrap gap-1.5">
                            {req.itemType && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-[11px] font-bold">
                                🩺 {req.itemType}
                              </span>
                            )}
                            {req.itemDuration && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 text-[11px] font-semibold">
                                ⏱️ {req.itemDuration}
                              </span>
                            )}
                          </div>
                        )}

                        {req.category === 'elderly' && (req.elderlyAidType || req.scheduledTime || req.elderlyDuration) && (
                          <div className="flex items-center flex-wrap gap-1.5">
                            {req.elderlyAidType && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[11px] font-bold">
                                🤝 {req.elderlyAidType}
                              </span>
                            )}
                            {(req.scheduledTime || req.elderlyDuration) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 text-[11px] font-semibold">
                                ⏰ {req.scheduledTime || req.elderlyDuration}
                              </span>
                            )}
                          </div>
                        )}

                        {req.category === 'medicine' && (
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-700 dark:text-orange-300 border border-orange-500/20 text-[11px] font-semibold">
                              💊 {req.categoryFields?.medicineNames || 'Prescribed medicines'}
                            </span>
                          </div>
                        )}

                        {req.category === 'food' && (
                          <div className="flex items-center flex-wrap gap-1.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20 text-[11px] font-semibold">
                              🍲 {req.categoryFields?.servingsCount || 2} Meals
                            </span>
                          </div>
                        )}

                        {/* Suggested / user tags chips */}
                        {req.tags && req.tags.length > 0 && (
                          <div className="flex items-center flex-wrap gap-1">
                            {req.tags.slice(0, 4).map((t) => (
                              <span
                                key={t}
                                className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-mono text-muted-foreground"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Distance, ETA, and Waiting time */}
                        <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 text-xs text-muted-foreground pt-0.5">
                          {/* Distance and ETA */}
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
                            <span>
                              {req.distanceKm} km · {etaStr} away
                            </span>
                          </span>

                          <span className="text-muted-foreground/40" aria-hidden="true">
                            •
                          </span>

                          {/* Waiting time */}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground shrink-0 notranslate" />
                            <span>{formatWaitingTime(req.waitingMinutes, req.createdAt)}</span>
                          </span>
                        </div>

                        {/* Requester & Verification row */}
                        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground pt-1.5 border-t border-border/40">
                          <span>
                            Requester: <strong className="text-foreground font-semibold">{req.contactName || 'Community Member'}</strong>
                          </span>
                          {req.verified && (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <ShieldCheck className="h-3.5 w-3.5 notranslate" />
                              <span>{req.verificationBadge || 'Verified'}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2 Action Buttons: Details + Category-colored Help Button */}
                    <div className="flex items-center gap-2.5 w-full min-[400px]:w-auto shrink-0 pt-2 min-[400px]:pt-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestClick(req);
                        }}
                        className="relative overflow-hidden h-[44px] min-h-[44px] px-4 rounded-[16px] border border-border/80 dark:border-white/15 bg-card/85 dark:bg-card/75 hover:bg-muted/90 backdrop-blur-md text-xs sm:text-sm font-bold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md hover:border-primary/40 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center flex-1 min-[400px]:flex-initial"
                      >
                        <span
                          className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent"
                          aria-hidden="true"
                        />
                        <span>Details</span>
                      </button>
                      <PrimaryHelpButton
                        category={req.category}
                        size="card"
                        label="I can help"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRequestClick(req);
                        }}
                        className="h-[44px] min-h-[44px] rounded-[16px] flex-1 min-[400px]:flex-initial min-[400px]:px-5 px-4 shrink-0"
                        aria-label={`Help with request: ${req.title}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 3. When there are none: Compact calm empty state */
        <div className="rounded-2xl sm:rounded-3xl border border-solid border-border/80 dark:border-white/10 bg-card/75 dark:bg-card/40 p-5 sm:p-7 text-center space-y-3.5 shadow-soft">
          {/* Heart icon in tinted circle */}
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <Heart className="h-6 w-6 notranslate fill-emerald-500/20" />
          </div>

          {/* Title & friendly sentence */}
          <div className="max-w-md mx-auto space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              All Quiet &amp; Peaceful Nearby
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {effectiveRadius >= 50
                ? 'No urgent requests within 50 km.'
                : 'No urgent requests near you right now. You are all set to help when a neighbor in need calls!'}
            </p>
          </div>

          {/* Two buttons of equal width: Side by side from 480 px width and up, stacked with 12 px gap below that */}
          <div className="flex flex-col min-[480px]:flex-row items-stretch justify-center gap-3 pt-1 max-w-lg mx-auto w-full">
            <button
              type="button"
              onClick={handleBroadenRadius}
              className="group/broaden relative overflow-hidden h-11 rounded-2xl border border-teal-500/35 dark:border-teal-400/35 bg-teal-500/10 dark:bg-teal-400/15 text-teal-800 dark:text-teal-200 px-5 text-sm font-bold hover:bg-teal-500/20 hover:border-teal-500/50 hover:shadow-[0_4px_16px_rgba(20,184,166,0.22)] backdrop-blur-md touch-target w-full min-[480px]:flex-1 flex items-center justify-center gap-2 transition-all duration-200 shadow-xs active:scale-[0.98]"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-teal-400/60 to-transparent"
                aria-hidden="true"
              />
              <Compass className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 notranslate transition-transform duration-300 group-hover/broaden:rotate-45" />
              <span className="whitespace-nowrap">Broaden Search Radius (50 km)</span>
            </button>
            <button
              type="button"
              onClick={handlePostRequest}
              className="relative overflow-hidden h-11 rounded-2xl bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-600 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-500 px-5 text-sm font-bold text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_16px_rgba(13,148,136,0.28)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.55),0_6px_22px_rgba(13,148,136,0.38)] hover:brightness-105 touch-target w-full min-[480px]:flex-1 flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98]"
            >
              <span
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent"
                aria-hidden="true"
              />
              <PlusCircle className="h-4 w-4 shrink-0 notranslate drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
              <span className="whitespace-nowrap drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">Post a Request</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
