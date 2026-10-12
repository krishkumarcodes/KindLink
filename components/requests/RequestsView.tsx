'use client';

import React, { useState } from 'react';
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
  Atom,
} from 'lucide-react';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpCategory, HelpRequest, UrgencyLevel } from '@/lib/data/types';
import { RequestCard } from './RequestCard';
import { RequestDetailModal } from './RequestDetailModal';
import { WhyThisRankModal } from './WhyThisRankModal';

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
  } = useKindLinkStore();

  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [whyRankModalReq, setWhyRankModalReq] = useState<HelpRequest | null>(null);

  // Selected request for details modal
  const activeDetailRequest = requests.find((r) => r.id === selectedRequestId) || null;

  // Filter & Search Logic
  const filteredRequests = requests.filter((req) => {
    // 1. Category filter
    if (filterCategory !== 'all' && req.category !== filterCategory) {
      return false;
    }
    // 2. Urgency filter
    if (filterUrgency !== 'all' && req.urgency !== filterUrgency) {
      return false;
    }
    // 3. Radius filter
    if (req.distanceKm > filterRadius) {
      return false;
    }
    // 4. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = req.title.toLowerCase().includes(q);
      const matchDesc = req.description.toLowerCase().includes(q);
      const matchLoc = req.locationName.toLowerCase().includes(q);
      const matchBlood = req.bloodGroup?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchLoc && !matchBlood) {
        return false;
      }
    }
    return true;
  });

  // Sorting logic based on tab
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    if (activeFeedTab === 'urgent') {
      return b.helpGravityScore - a.helpGravityScore;
    }
    if (activeFeedTab === 'nearest') {
      return a.distanceKm - b.distanceKm;
    }
    // newest
    return a.waitingMinutes - b.waitingMinutes;
  });

  const categories: { key: HelpCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All Needs' },
    { key: 'blood', label: 'Blood' },
    { key: 'equipment', label: 'Medical Gear' },
    { key: 'elderly', label: 'Elderly Care' },
    { key: 'books', label: 'Books' },
    { key: 'transport', label: 'Transit' },
  ];

  const urgencies: { key: UrgencyLevel | 'all'; label: string }[] = [
    { key: 'all', label: 'All Urgencies' },
    { key: 'critical', label: 'Critical' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ];

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pb-24 sm:pb-8">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Community Aid Requests
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Browse and filter live needs in Asansol, Durgapur, and nearby regions
          </p>
        </div>

        {/* Search & Filter trigger */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground notranslate" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search blood, wheelchair, medicine..."
              className="w-full rounded-2xl border border-border bg-card pl-10 pr-4 py-2.5 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4 notranslate" />
              </button>
            )}
          </div>

          <button
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl border text-xs font-bold transition touch-target ${
              filterCategory !== 'all' || filterUrgency !== 'all' || filterRadius < 25
                ? 'border-primary bg-primary text-white shadow-soft'
                : 'border-border bg-card text-foreground hover:bg-muted'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4 notranslate" />
            <span className="hidden sm:inline">Filters</span>
          </button>
        </div>
      </div>

      {/* Tabs Row: Most Urgent, Nearest, Newest */}
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setActiveFeedTab('urgent')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition touch-target ${
              activeFeedTab === 'urgent'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Flame className="h-4 w-4 notranslate" />
            <span>Most Urgent</span>
          </button>

          <button
            onClick={() => setActiveFeedTab('nearest')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition touch-target ${
              activeFeedTab === 'nearest'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Navigation className="h-4 w-4 notranslate" />
            <span>Nearest</span>
          </button>

          <button
            onClick={() => setActiveFeedTab('newest')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition touch-target ${
              activeFeedTab === 'newest'
                ? 'bg-primary text-white shadow-soft'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Clock className="h-4 w-4 notranslate" />
            <span>Newest</span>
          </button>
        </div>

        <span className="text-xs text-muted-foreground font-medium hidden sm:inline">
          Showing {sortedRequests.length} requests
        </span>
      </div>

      {/* Expandable Filter Panel */}
      {filterPanelOpen && (
        <div className="rounded-3xl border border-border bg-card p-5 shadow-soft space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Filter className="h-4 w-4 text-primary notranslate" />
              <span>Filter Options</span>
            </div>
            <button
              onClick={() => {
                setFilterCategory('all');
                setFilterUrgency('all');
                setFilterRadius(20);
              }}
              className="text-xs text-primary font-semibold hover:underline"
            >
              Reset all filters
            </button>
          </div>

          {/* Categories */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Category</label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setFilterCategory(c.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    filterCategory === c.key
                      ? 'border-primary bg-primary text-white font-bold'
                      : 'border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Urgencies */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground block mb-2">Urgency Level</label>
            <div className="flex flex-wrap gap-2">
              {urgencies.map((u) => (
                <button
                  key={u.key}
                  onClick={() => setFilterUrgency(u.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
                    filterUrgency === u.key
                      ? 'border-primary bg-primary text-white font-bold'
                      : 'border-border bg-background hover:bg-muted text-foreground'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Distance Radius Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-semibold text-muted-foreground">Alert Distance Radius</span>
              <span className="font-bold text-primary">{filterRadius} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="25"
              step="1"
              value={filterRadius}
              onChange={(e) => setFilterRadius(Number(e.target.value))}
              className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
              <span>1 km (Hyper-local)</span>
              <span>10 km</span>
              <span>25 km (Greater Asansol)</span>
            </div>
          </div>
        </div>
      )}

      {/* Requests Feed Grid */}
      {sortedRequests.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center shadow-soft">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
            <Inbox className="h-8 w-8 notranslate" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No matching requests found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
            Try expanding your distance radius slider or clearing the category and search filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCategory('all');
              setFilterUrgency('all');
              setFilterRadius(25);
            }}
            className="mt-5 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-soft"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedRequests.map((req) => (
            <RequestCard
              key={req.id}
              request={req}
              travelMode={travelMode}
              onSelect={(r) => setSelectedRequestId(r.id)}
              onWhyRank={(r) => setWhyRankModalReq(r)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <RequestDetailModal
        request={activeDetailRequest}
        open={Boolean(activeDetailRequest)}
        onClose={() => setSelectedRequestId(null)}
      />

      <WhyThisRankModal
        request={whyRankModalReq}
        open={Boolean(whyRankModalReq)}
        onClose={() => setWhyRankModalReq(null)}
      />
    </div>
  );
}
