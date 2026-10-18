'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Flame,
  Navigation,
  Clock,
  Sparkles,
  X,
  SlidersHorizontal,
  Inbox,
  RotateCw,
  ShieldCheck,
  Check,
  ChevronDown,
  PlusCircle,
  AlertTriangle,
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpCategory, HelpRequest, UrgencyLevel } from '@/lib/data/types';
import { RequestCard } from './RequestCard';
import { RequestDetailModal } from './RequestDetailModal';
import { HelpFlowModal } from './HelpFlowModal';
import { useTranslation } from '@/lib/i18n';
import { ModalOverlay } from '@/components/ui/OverlayPortal';
import { SwitchRow } from '@/components/ui/Switch';

export function RequestsView() {
  const {
    requests,
    activeFeedTab,
    setActiveFeedTab,
    filterCategory,
    setFilterCategory,
    filterUrgency,
    setFilterUrgency,
    filterRadius,
    setFilterRadius,
    searchQuery,
    setSearchQuery,
    travelMode,
    selectedRequestId,
    setSelectedRequestId,
    fetchLiveRequests,
    setCurrentView,
    isLoadingRequests,
    userProfile,
  } = useKindLinkStore();

  const { t } = useTranslation();

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [helpFlowReq, setHelpFlowReq] = useState<HelpRequest | null>(null);

  // Advanced Multi-Select Filters
  const [selectedCategories, setSelectedCategories] = useState<HelpCategory[]>(() =>
    filterCategory !== 'all' ? [filterCategory] : []
  );
  const [selectedUrgencies, setSelectedUrgencies] = useState<UrgencyLevel[]>(() =>
    filterUrgency !== 'all' ? [filterUrgency] : []
  );
  const [radiusKm, setRadiusKm] = useState<number>(filterRadius || 25);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'accepted'>('all');
  const [neededInFilter, setNeededInFilter] = useState<'all' | 'immediate' | 'today' | 'within24h'>('all');
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // Sync external filterCategory changes (e.g. from Home category clicks)
  useEffect(() => {
    if (filterCategory !== 'all') {
      setSelectedCategories([filterCategory]);
    }
  }, [filterCategory]);

  // Sync external filterUrgency changes
  useEffect(() => {
    if (filterUrgency !== 'all') {
      setSelectedUrgencies([filterUrgency]);
    }
  }, [filterUrgency]);

  // Sync external filterRadius changes
  useEffect(() => {
    if (filterRadius) {
      setRadiusKm(filterRadius);
    }
  }, [filterRadius]);

  // Pagination / Infinite Scroll
  const [visibleCount, setVisibleCount] = useState<number>(9);

  // "New requests" alert tracking
  const [hasNewRequestsBanner, setHasNewRequestsBanner] = useState<boolean>(false);
  const prevCountRef = useRef<number>(requests.length);

  useEffect(() => {
    if (requests.length > prevCountRef.current && prevCountRef.current > 0) {
      setHasNewRequestsBanner(true);
    }
    prevCountRef.current = requests.length;
  }, [requests.length]);

  const handleDismissNewRequestsBanner = () => {
    setHasNewRequestsBanner(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Selected request for details modal
  const activeDetailRequest = requests.find((r) => r.id === selectedRequestId) || null;

  // Filter Logic
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // 1. Categories Multi-Select
      if (selectedCategories.length > 0 && !selectedCategories.includes(req.category)) {
        return false;
      }

      // 2. Urgencies Checkboxes
      if (selectedUrgencies.length > 0 && !selectedUrgencies.includes(req.urgency)) {
        return false;
      }

      // 3. Distance Radius Slider (1-50 km)
      if (req.distanceKm > radiusKm) {
        return false;
      }

      // 4. Status Filter (open / accepted)
      if (statusFilter !== 'all') {
        if (statusFilter === 'open' && req.status !== 'open') return false;
        if (statusFilter === 'accepted' && req.status !== 'accepted') return false;
      }

      // 5. "Needed in" timing
      if (neededInFilter !== 'all') {
        const lowerNeeded = (req.neededByTime || '').toLowerCase();
        if (neededInFilter === 'immediate') {
          if (!lowerNeeded.includes('immediate') && !lowerNeeded.includes('2 hour') && !lowerNeeded.includes('urgent')) {
            return false;
          }
        } else if (neededInFilter === 'today') {
          if (!lowerNeeded.includes('today') && !lowerNeeded.includes('hour') && !lowerNeeded.includes('immediate')) {
            return false;
          }
        } else if (neededInFilter === 'within24h') {
          if (lowerNeeded.includes('flexible') || lowerNeeded.includes('scheduled')) {
            return false;
          }
        }
      }

      // 6. Verified requesters only toggle
      if (verifiedOnly && !req.verified) {
        return false;
      }

      // 7. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = req.title.toLowerCase().includes(q);
        const matchDesc = req.description.toLowerCase().includes(q);
        const matchLoc = req.locationName.toLowerCase().includes(q);
        const matchBlood = req.bloodGroup?.toLowerCase().includes(q);
        const matchItem = req.itemType?.toLowerCase().includes(q);
        const matchCategory = req.category.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchLoc && !matchBlood && !matchItem && !matchCategory) {
          return false;
        }
      }

      return true;
    });
  }, [
    requests,
    selectedCategories,
    selectedUrgencies,
    radiusKm,
    statusFilter,
    neededInFilter,
    verifiedOnly,
    searchQuery,
  ]);

  const URGENCY_PRIORITY: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  };

  // Sorting logic based on tab:
  // Most Urgent: urgency > distance > waiting time
  // Nearest: road/geodesic distance > urgency > waiting time
  // Newest: waitingMinutes ascending (creation time) > urgency
  const sortedRequests = useMemo(() => {
    return [...filteredRequests].sort((a, b) => {
      if (activeFeedTab === 'urgent') {
        const urgA = URGENCY_PRIORITY[a.urgency] ?? 5;
        const urgB = URGENCY_PRIORITY[b.urgency] ?? 5;
        if (urgA !== urgB) return urgA - urgB;
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        return b.waitingMinutes - a.waitingMinutes;
      }
      if (activeFeedTab === 'nearest') {
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        const urgA = URGENCY_PRIORITY[a.urgency] ?? 5;
        const urgB = URGENCY_PRIORITY[b.urgency] ?? 5;
        if (urgA !== urgB) return urgA - urgB;
        return b.waitingMinutes - a.waitingMinutes;
      }
      // newest: most recently posted (smallest waitingMinutes or createdAt)
      if (a.waitingMinutes !== b.waitingMinutes) {
        return a.waitingMinutes - b.waitingMinutes;
      }
      const urgA = URGENCY_PRIORITY[a.urgency] ?? 5;
      const urgB = URGENCY_PRIORITY[b.urgency] ?? 5;
      return urgA - urgB;
    });
  }, [filteredRequests, activeFeedTab]);

  const displayedRequests = useMemo(() => {
    return sortedRequests.slice(0, visibleCount);
  }, [sortedRequests, visibleCount]);

  const categoriesList: { key: HelpCategory; label: string; icon: React.ReactNode }[] = [
    { key: 'blood', label: t('categories.blood') || 'Blood Donation', icon: <Droplets className="h-3.5 w-3.5 text-rose-500 notranslate" /> },
    { key: 'equipment', label: t('categories.equipment') || 'Medical Gear', icon: <Stethoscope className="h-3.5 w-3.5 text-teal-500 notranslate" /> },
    { key: 'elderly', label: t('categories.elderly') || 'Elderly Care', icon: <Users className="h-3.5 w-3.5 text-blue-500 notranslate" /> },
    { key: 'books', label: t('categories.books') || 'Books and Study', icon: <BookOpen className="h-3.5 w-3.5 text-emerald-500 notranslate" /> },
    { key: 'transport', label: t('categories.transport') || 'Emergency Transit', icon: <Car className="h-3.5 w-3.5 text-amber-500 notranslate" /> },
  ];

  const urgenciesList: { key: UrgencyLevel; label: string; dotColor: string }[] = [
    { key: 'critical', label: 'Critical', dotColor: 'bg-red-500' },
    { key: 'high', label: 'High', dotColor: 'bg-orange-500' },
    { key: 'medium', label: 'Medium', dotColor: 'bg-blue-500' },
    { key: 'low', label: 'Low', dotColor: 'bg-green-500' },
  ];

  const toggleCategory = (cat: HelpCategory) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleUrgency = (urg: UrgencyLevel) => {
    setSelectedUrgencies((prev) =>
      prev.includes(urg) ? prev.filter((u) => u !== urg) : [...prev, urg]
    );
  };

  const resetAllFilters = () => {
    setSelectedCategories([]);
    setSelectedUrgencies([]);
    setRadiusKm(50);
    setFilterRadius(50);
    setStatusFilter('all');
    setNeededInFilter('all');
    setVerifiedOnly(false);
    setSearchQuery('');
    setFilterCategory('all');
    setFilterUrgency('all');
  };

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    selectedUrgencies.length > 0 ||
    radiusKm < 50 ||
    statusFilter !== 'all' ||
    neededInFilter !== 'all' ||
    verifiedOnly ||
    Boolean(searchQuery.trim());

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-36 lg:pb-16">
      {/* "New requests arrived" banner */}
      {hasNewRequestsBanner && (
        <div className="sticky top-2 z-30 flex items-center justify-between p-3 sm:p-3.5 rounded-2xl bg-primary text-white shadow-lg animate-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold">
            <Sparkles className="h-4 w-4 shrink-0 notranslate animate-spin" />
            <span>New community aid requests arrived in your area!</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismissNewRequestsBanner}
              className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-xs font-black transition active:scale-95"
            >
              Show New Requests
            </button>
            <button
              type="button"
              onClick={() => setHasNewRequestsBanner(false)}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white"
              aria-label="Dismiss banner"
            >
              <X className="h-4 w-4 notranslate" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header & Search Bar with perfectly vertically centered icon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Community Aid Requests
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse and filter live needs in Asansol, Durgapur, and neighboring districts
          </p>
        </div>

        {/* Search & Filter trigger */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Search container with precise vertical centering */}
          <div className="relative flex-1 md:w-80 flex items-center">
            <div className="absolute left-3.5 flex items-center pointer-events-none text-muted-foreground">
              <Search className="h-4 w-4 notranslate" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests"
              className="w-full rounded-2xl border border-border/80 bg-card/90 focus:bg-background pl-10 pr-9 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5 notranslate" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchLiveRequests()}
            title="Refresh feed"
            aria-label="Refresh feed"
            className="h-10 w-10 min-h-[40px] min-w-[40px] shrink-0 rounded-2xl border border-border/80 bg-card/90 hover:bg-muted text-muted-foreground hover:text-foreground transition-all shadow-xs flex items-center justify-center touch-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RotateCw className={`h-4 w-4 notranslate ${isLoadingRequests ? 'animate-spin text-primary' : ''}`} />
          </button>

          {/* Filter sheet trigger */}
          <button
            type="button"
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition-all active:scale-95 touch-target ${
              hasActiveFilters
                ? 'border-primary bg-primary text-white shadow-soft ring-2 ring-primary/20'
                : 'border-border/80 bg-card text-foreground hover:bg-muted hover:border-border'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 notranslate" />
            <span className="hidden sm:inline">Filters</span>
            {hasActiveFilters && (
              <span className="flex h-2 w-2 rounded-full bg-white" />
            )}
          </button>
        </div>
      </div>


      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center flex-wrap gap-2 text-xs">
          <span className="text-muted-foreground font-bold text-[11px] uppercase tracking-wider mr-1">
            Active:
          </span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">
              <span>"{searchQuery}"</span>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="hover:text-primary/70"
                aria-label="Remove search filter"
              >
                <X className="h-3 w-3 notranslate" />
              </button>
            </span>
          )}

          {selectedCategories.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-foreground font-semibold"
            >
              <span className="capitalize">{c}</span>
              <button
                type="button"
                onClick={() => toggleCategory(c)}
                className="hover:text-rose-500"
                aria-label={`Remove ${c} filter`}
              >
                <X className="h-3 w-3 notranslate" />
              </button>
            </span>
          ))}

          {selectedUrgencies.map((u) => (
            <span
              key={u}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-foreground font-semibold"
            >
              <span className="capitalize">{u}</span>
              <button
                type="button"
                onClick={() => toggleUrgency(u)}
                className="hover:text-rose-500"
                aria-label={`Remove ${u} filter`}
              >
                <X className="h-3 w-3 notranslate" />
              </button>
            </span>
          ))}

          {radiusKm < 50 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-foreground font-semibold">
              <span>Within {radiusKm} km</span>
              <button
                type="button"
                onClick={() => {
                  setRadiusKm(50);
                  setFilterRadius(50);
                }}
                className="hover:text-rose-500"
                aria-label="Reset radius filter"
              >
                <X className="h-3 w-3 notranslate" />
              </button>
            </span>
          )}

          {statusFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-foreground font-semibold">
              <span>Status: {statusFilter}</span>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="hover:text-rose-500"
                aria-label="Reset status filter"
              >
                <X className="h-3 w-3 notranslate" />
              </button>
            </span>
          )}

          {neededInFilter !== 'all' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-foreground font-semibold">
              <span>Needed: {neededInFilter}</span>
              <button
                type="button"
                onClick={() => setNeededInFilter('all')}
                className="hover:text-rose-500"
                aria-label="Reset needed filter"
              >
                <X className="h-3 w-3 notranslate" />
              </button>
            </span>
          )}

          {verifiedOnly && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 font-bold">
              <span>Verified Only</span>
              <button
                type="button"
                onClick={() => setVerifiedOnly(false)}
                className="hover:text-emerald-900"
                aria-label="Remove verified only filter"
              >
                <X className="h-3 w-3 notranslate" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={resetAllFilters}
            className="text-xs font-bold text-primary hover:underline ml-1"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Tabs Row: Most Urgent, Nearest, Newest */}
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setActiveFeedTab('urgent')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-95 touch-target ${
              activeFeedTab === 'urgent'
                ? 'bg-primary text-white shadow-soft ring-2 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Flame className="h-4 w-4 notranslate text-rose-400" />
            <span>Most Urgent</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFeedTab('nearest')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-95 touch-target ${
              activeFeedTab === 'nearest'
                ? 'bg-primary text-white shadow-soft ring-2 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Navigation className="h-4 w-4 notranslate text-teal-400" />
            <span>Nearest</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFeedTab('newest')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all active:scale-95 touch-target ${
              activeFeedTab === 'newest'
                ? 'bg-primary text-white shadow-soft ring-2 ring-primary/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Clock className="h-4 w-4 notranslate text-blue-400" />
            <span>Newest</span>
          </button>
        </div>

        <span className="text-xs text-muted-foreground font-semibold hidden sm:inline">
          Showing {displayedRequests.length} of {sortedRequests.length} request{sortedRequests.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Requests Feed Grid with Skeleton Loading & Honest Empty States */}
      {isLoadingRequests && requests.length === 0 ? (
        /* Skeleton Loading */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-border/80 bg-card/60 p-5 space-y-4 animate-pulse"
              aria-busy="true"
            >
              <div className="flex justify-between items-center">
                <div className="h-6 w-24 bg-muted rounded-full" />
                <div className="h-4 w-16 bg-muted rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-muted rounded-lg" />
              <div className="h-4 w-full bg-muted/60 rounded-md" />
              <div className="h-4 w-2/3 bg-muted/40 rounded-md" />
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <div className="h-4 w-28 bg-muted rounded-md" />
                <div className="h-8 w-20 bg-muted rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedRequests.length === 0 ? (
        /* Honest Empty States */
        requests.length === 0 ? (
          /* Case 1: Feed is completely empty in database */
          <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-10 sm:p-14 text-center shadow-soft space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Inbox className="h-8 w-8 notranslate" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">No requests found</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                There are currently no active mutual aid requests in the community feed. You can be the first to send a request for assistance!
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentView('new')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition active:scale-95 shadow-soft"
              >
                <PlusCircle className="h-4 w-4 notranslate" />
                <span>Post a Request</span>
              </button>
            </div>
          </div>
        ) : (
          /* Case 2: Requests exist, but hidden by current filters */
          <div className="rounded-3xl border border-dashed border-border/80 bg-card/60 p-10 sm:p-14 text-center shadow-soft space-y-4">
            <div className="h-16 w-16 rounded-3xl bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <SlidersHorizontal className="h-8 w-8 notranslate" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-lg font-bold text-foreground">
                {requests.length} request{requests.length === 1 ? '' : 's'} hidden by your filters
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                None of the active community requests match your current combination of categories, urgency levels, or search query.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={resetAllFilters}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition active:scale-95 shadow-soft"
              >
                <span>Clear all filters</span>
              </button>
            </div>
          </div>
        )
      ) : (
        /* Requests Grid */
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedRequests.map((req) => {
              const isOwner = Boolean(
                (userProfile?.id && (req as any).requesterId === userProfile.id) ||
                (userProfile?.name &&
                  req.contactName &&
                  req.contactName.trim().toLowerCase() === userProfile.name.trim().toLowerCase()) ||
                (userProfile?.phone &&
                  req.phone &&
                  req.phone.trim() === userProfile.phone.trim())
              );
              return (
                <RequestCard
                  key={req.id}
                  request={req}
                  travelMode={travelMode}
                  onSelect={(r) => setSelectedRequestId(r.id)}
                  onHelp={(r) => setHelpFlowReq(r)}
                  isOwner={isOwner}
                />
              );
            })}

          </div>

          {/* Infinite Scroll / Load More */}
          {sortedRequests.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 9)}
                className="px-6 py-3 rounded-2xl border border-border/80 bg-card hover:bg-muted text-xs font-bold text-foreground transition active:scale-95 shadow-xs flex items-center gap-2"
              >
                <span>Load More Requests ({sortedRequests.length - visibleCount} remaining)</span>
                <ChevronDown className="h-4 w-4 notranslate" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <RequestDetailModal
        request={activeDetailRequest}
        open={Boolean(activeDetailRequest)}
        onClose={() => setSelectedRequestId(null)}
      />

      <HelpFlowModal
        request={helpFlowReq}
        open={Boolean(helpFlowReq)}
        onClose={() => setHelpFlowReq(null)}
        onHelpSubmitted={() => {
          fetchLiveRequests();
        }}
      />

      {/* Shared Bottom Sheet Filter Panel */}
      <ModalOverlay
        open={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        title="Filters"
        ariaLabel="Filter Aid Requests"
        mobileVariant="sheet"
        maxWidthClass="max-w-xl"
      >
        {/* Sticky Header: Title "Filters", count pill, and "Reset" on ONE line (never wraps) */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-border/80 bg-card/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            <SlidersHorizontal className="h-4 w-4 text-primary notranslate shrink-0" />
            <h2 className="text-base font-bold text-foreground shrink-0">Filters</h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold whitespace-nowrap">
              {filteredRequests.length} of {requests.length}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-xs font-bold text-primary hover:underline whitespace-nowrap px-1.5 py-1"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setFilterPanelOpen(false)}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted touch-target"
              aria-label="Close filters"
            >
              <X className="h-4 w-4 notranslate" />
            </button>
          </div>
        </div>

        {/* Scrollable Sheet Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 min-h-0">
          {/* 1. Category Multi-Select */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-2">
              Categories (Select Multiple)
            </label>
            <div className="flex flex-wrap gap-2">
              {categoriesList.map((c) => {
                const isSelected = selectedCategories.includes(c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => toggleCategory(c.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      isSelected
                        ? 'border-teal-700 bg-teal-700 dark:bg-teal-600 text-white font-bold shadow-xs'
                        : 'border-border/80 bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    {c.icon}
                    <span>{c.label}</span>
                    {isSelected && <Check className="h-3 w-3 notranslate stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Urgency Chips with individual coloured dots (Critical red, High orange, Medium blue, Low green) */}
          <div>
            <label className="text-xs font-bold text-foreground block mb-2">
              Urgency Level
            </label>
            <div className="flex flex-wrap gap-2">
              {urgenciesList.map((u) => {
                const isSelected = selectedUrgencies.includes(u.key);
                return (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => toggleUrgency(u.key)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 ${
                      isSelected
                        ? 'border-teal-700 bg-teal-700 dark:bg-teal-600 text-white font-bold shadow-xs'
                        : 'border-border/80 bg-background hover:bg-muted text-foreground'
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${u.dotColor}`} />
                    <span>{u.label}</span>
                    {isSelected && <Check className="h-3 w-3 notranslate stroke-[3]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Distance Radius Slider */}
          <div className="space-y-2.5 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Alert Distance Radius</span>
              <span className="font-extrabold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                {radiusKm} km
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={radiusKm}
              onChange={(e) => {
                const val = Number(e.target.value);
                setRadiusKm(val);
                setFilterRadius(val);
              }}
              className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground font-semibold">
              <span>1 km Nearby</span>
              <span>10 km</span>
              <span>25 km City</span>
              <span>50 km Wide</span>
            </div>
          </div>

          {/* 4. Status and Needed within */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/80">
            {/* Status */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="open">Open Needs Only</option>
                <option value="accepted">Accepted / In Progress</option>
              </select>
            </div>

            {/* Needed within */}
            <div>
              <label className="text-xs font-bold text-foreground block mb-1.5">
                Needed within
              </label>
              <select
                value={neededInFilter}
                onChange={(e) => setNeededInFilter(e.target.value as any)}
                className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
              >
                <option value="all">Any Timing</option>
                <option value="immediate">Immediate (0-2 hours)</option>
                <option value="today">Today</option>
                <option value="within24h">Within 24 Hours</option>
              </select>
            </div>
          </div>

          {/* 5. Verified requesters only via shared SwitchRow */}
          <div className="pt-2 border-t border-border/80">
            <SwitchRow
              checked={verifiedOnly}
              onCheckedChange={setVerifiedOnly}
              label="Verified requesters only"
              description="Only show requests with verified identity badges"
              icon={<ShieldCheck className="h-4 w-4 text-emerald-500" />}
            />
          </div>
        </div>

        {/* Sticky Footer: "N requests found", "Reset", and "Apply filters" buttons */}
        <div className="p-4 sm:p-5 border-t border-border/80 bg-card/95 backdrop-blur-md flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs sm:text-sm font-bold text-muted-foreground truncate">
            {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} found
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={resetAllFilters}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-muted transition active:scale-95 touch-target"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => setFilterPanelOpen(false)}
              className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition active:scale-95 touch-target shadow-xs"
            >
              Apply filters
            </button>
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}

