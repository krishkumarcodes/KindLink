'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  HeartHandshake,
  Heart,
  Droplet,
  ShieldCheck,
  BookOpen,
  MapPin,
  Star,
  Eye,
  Ban,
  Filter,
  X,
  MessageSquare,
  ShieldAlert,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';
import { HelpCategory, HelpRequest, RequestLifecycleStatus } from '@/lib/data/types';
import { RequestDetailModal } from '@/components/requests/RequestDetailModal';

export interface ActivityItem {
  id: string;
  type: 'help' | 'request' | 'offer';
  requestId: string;
  offerId?: string;
  category: HelpCategory;
  title: string;
  message?: string;
  status: RequestLifecycleStatus | 'pending' | 'accepted' | 'declined' | 'withdrawn';
  date: string;
  distanceKm: number;
  otherPerson?: {
    id?: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    rating?: number;
    isVerified?: boolean;
    role: string;
  };
}

interface ActivityTabProps {
  completedHelps: ActivityItem[];
  myRequests: ActivityItem[];
  myOffers: ActivityItem[];
  onRefresh?: () => Promise<void> | void;
}

export function ActivityTab({
  completedHelps,
  myRequests,
  myOffers,
  onRefresh,
}: ActivityTabProps) {
  const { setCurrentView, requests } = useKindLinkStore();

  const [subTab, setSubTab] = useState<'all' | 'helps' | 'requests' | 'offers'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [selectedRequest, setSelectedRequest] = useState<HelpRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTarget, setRatingTarget] = useState<{
    requestId: string;
    rateeId: string;
    rateeName: string;
    title: string;
  } | null>(null);
  const [ratingStars, setRatingStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  // Exact counts matching profile summary stats
  const helpsCount = completedHelps.length;
  const requestsCount = myRequests.length;
  const offersCount = myOffers.length;
  const allCount = helpsCount + requestsCount + offersCount;

  // Combine all activity items sorted by date descending
  const allActivity = useMemo(() => {
    const combined = [...completedHelps, ...myRequests, ...myOffers];
    return combined.sort((a, b) => {
      const timeA = new Date(a.date).getTime() || 0;
      const timeB = new Date(b.date).getTime() || 0;
      return timeB - timeA;
    });
  }, [completedHelps, myRequests, myOffers]);

  // Current list based on sub-tab
  const currentSubList = useMemo(() => {
    switch (subTab) {
      case 'helps':
        return completedHelps;
      case 'requests':
        return myRequests;
      case 'offers':
        return myOffers;
      case 'all':
      default:
        return allActivity;
    }
  }, [subTab, completedHelps, myRequests, myOffers, allActivity]);

  // Filtered by category and status
  const filteredList = useMemo(() => {
    return currentSubList.filter((item) => {
      if (categoryFilter !== 'all') {
        const itemCat = item.category === ('elderly_help' as any) ? 'elderly' : item.category;
        if (itemCat !== categoryFilter) return false;
      }
      if (statusFilter !== 'all') {
        if (statusFilter === 'completed' && item.status !== 'completed') return false;
        if (statusFilter === 'in_progress' && !['accepted', 'on_the_way', 'arrived'].includes(item.status)) return false;
        if (statusFilter === 'open' && !['open', 'pending'].includes(item.status)) return false;
        if (statusFilter === 'cancelled' && !['cancelled', 'withdrawn', 'declined'].includes(item.status)) return false;
      }
      return true;
    });
  }, [currentSubList, categoryFilter, statusFilter]);

  // Category visual metadata
  const getCategoryMeta = (cat: string) => {
    switch (cat) {
      case 'blood':
        return {
          label: 'Blood Support',
          icon: Droplet,
          pillClass: 'text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20',
          circleBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
        };
      case 'equipment':
        return {
          label: 'Medical Gear',
          icon: ShieldCheck,
          pillClass: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
          circleBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
        };
      case 'elderly':
      case 'elderly_help':
        return {
          label: 'Elderly Care',
          icon: Heart,
          pillClass: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
          circleBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        };
      case 'books':
        return {
          label: 'Study & Books',
          icon: BookOpen,
          pillClass: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          circleBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        };
      case 'transport':
        return {
          label: 'Transport Aid',
          icon: MapPin,
          pillClass: 'text-teal-600 dark:text-teal-400 bg-teal-500/10 border-teal-500/20',
          circleBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
        };
      default:
        return {
          label: 'Mutual Aid',
          icon: HeartHandshake,
          pillClass: 'text-primary bg-primary/10 border-primary/20',
          circleBg: 'bg-primary/10 text-primary',
        };
    }
  };

  // Status visual metadata
  const getStatusMeta = (status: string) => {
    switch (status) {
      case 'completed':
        return {
          label: 'Completed',
          chipClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
          icon: CheckCircle2,
        };
      case 'on_the_way':
        return {
          label: 'On The Way',
          chipClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20',
          icon: Clock,
        };
      case 'arrived':
        return {
          label: 'Arrived',
          chipClass: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20',
          icon: CheckCircle2,
        };
      case 'accepted':
        return {
          label: 'In Progress',
          chipClass: 'bg-primary/10 text-primary border border-primary/20',
          icon: Clock,
        };
      case 'open':
        return {
          label: 'Open Request',
          chipClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          icon: AlertCircle,
        };
      case 'pending':
        return {
          label: 'Offer Pending',
          chipClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          icon: Clock,
        };
      case 'withdrawn':
        return {
          label: 'Offer Withdrawn',
          chipClass: 'bg-muted text-muted-foreground border border-border',
          icon: X,
        };
      case 'declined':
        return {
          label: 'Offer Declined',
          chipClass: 'bg-muted text-muted-foreground border border-border',
          icon: X,
        };
      case 'cancelled':
        return {
          label: 'Cancelled',
          chipClass: 'bg-muted text-muted-foreground border border-border',
          icon: X,
        };
      default:
        return {
          label: status,
          chipClass: 'bg-muted text-muted-foreground border border-border',
          icon: Clock,
        };
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Recent';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return dateStr;
    }
  };

  // Action: View details
  const handleViewDetails = (requestId: string) => {
    const found = (requests || []).find((r) => r.id === requestId);
    if (found) {
      setSelectedRequest(found);
      setDetailModalOpen(true);
    } else {
      // Create minimal preview representation
      const item = allActivity.find((a) => a.requestId === requestId);
      if (item) {
        setSelectedRequest({
          id: item.requestId,
          title: item.title,
          description: item.message || 'KindLink Community Mutual Aid Request',
          category: item.category,
          urgency: 'high',
          waitingMinutes: 15,
          distanceKm: item.distanceKm,
          locationName: 'Asansol, West Bengal',
          latitude: 23.6889,
          longitude: 86.9661,
          contactName: item.otherPerson?.name || 'Community Member',
          contactRole: item.otherPerson?.role || 'Neighbor',
          phone: '+91 98320 00000',
          verified: item.otherPerson?.isVerified ?? true,
          verificationBadge: 'Community Verified',
          createdAt: item.date,
          status: item.status as RequestLifecycleStatus,
        });
        setDetailModalOpen(true);
      } else {
        toast.error('Unable to load request details');
      }
    }
  };

  // Action: Open rate modal
  const handleOpenRate = (item: ActivityItem) => {
    setRatingTarget({
      requestId: item.requestId,
      rateeId: item.otherPerson?.id || item.requestId,
      rateeName: item.otherPerson?.name || 'Neighbor',
      title: item.title,
    });
    setRatingStars(5);
    setRatingComment('');
    setRatingModalOpen(true);
  };

  // Submit Rating
  const handleSubmitRating = async () => {
    if (!ratingTarget) return;
    setSubmittingRating(true);
    try {
      const res = await dataAdapter.submitRating(
        ratingTarget.requestId,
        ratingTarget.rateeId,
        ratingStars,
        ratingComment.trim()
      );
      if (!res.success) {
        toast.error(res.error || 'Failed to submit rating');
        setSubmittingRating(false);
        return;
      }
      toast.success('Rating submitted successfully!', {
        description: `Thank you for rating ${ratingTarget.rateeName}.`,
      });
      setRatingModalOpen(false);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error submitting rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  // Action: Cancel request
  const handleCancelRequest = async (requestId: string) => {
    const confirmed = window.confirm('Are you sure you want to cancel this request?');
    if (!confirmed) return;
    try {
      const res = await dataAdapter.cancelRequest(requestId);
      if (res.success) {
        toast.success('Request cancelled successfully');
        if (onRefresh) await onRefresh();
      } else {
        toast.error(res.error || 'Failed to cancel request');
      }
    } catch (err: any) {
      toast.error(err.message || 'Error cancelling request');
    }
  };

  // Action: Cancel offer
  const handleCancelOffer = async (offerId?: string) => {
    const confirmed = window.confirm('Are you sure you want to withdraw your offer?');
    if (!confirmed) return;
    try {
      if (offerId && (dataAdapter as any).declineOffer) {
        await (dataAdapter as any).declineOffer(offerId);
      }
      toast.success('Offer withdrawn successfully');
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      toast.error(err.message || 'Error withdrawing offer');
    }
  };

  return (
    <div className="space-y-6">
      {/* =========================================================================
          1. SUB-TAB SEGMENTED CONTROL: Scrollable, no clipped labels, hide badge if 0
         ========================================================================= */}
      <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none snap-x snap-mandatory">
        {[
          { id: 'all' as const, label: 'All Activity', count: allCount },
          { id: 'helps' as const, label: 'Completed Helps', count: helpsCount },
          { id: 'requests' as const, label: 'My Requests', count: requestsCount },
          { id: 'offers' as const, label: 'My Offers', count: offersCount },
        ].map((sub) => {
          const isActive = subTab === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setSubTab(sub.id)}
              className={`snap-start shrink-0 whitespace-nowrap flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition-all touch-target ${
                isActive
                  ? 'bg-foreground text-background shadow-soft ring-2 ring-foreground/10'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span>{sub.label}</span>
              {/* Hide badge when count is 0! */}
              {sub.count > 0 && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                    isActive
                      ? 'bg-background/20 text-background font-mono'
                      : 'bg-muted text-muted-foreground font-mono'
                  }`}
                >
                  {sub.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* =========================================================================
          2. CATEGORY & STATUS FILTERS
         ========================================================================= */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <Filter className="h-3 w-3 notranslate" />
            <span>Filter:</span>
          </span>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground font-medium text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer"
            aria-label="Filter by category"
          >
            <option value="all">All Categories</option>
            <option value="blood">Blood</option>
            <option value="equipment">Equipment</option>
            <option value="elderly">Elderly</option>
            <option value="books">Books</option>
            <option value="transport">Transport</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-border bg-card text-foreground font-medium text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40 cursor-pointer"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="in_progress">In Progress</option>
            <option value="open">Open / Pending</option>
            <option value="cancelled">Cancelled / Declined</option>
          </select>
        </div>

        {(categoryFilter !== 'all' || statusFilter !== 'all') && (
          <button
            onClick={() => {
              setCategoryFilter('all');
              setStatusFilter('all');
            }}
            className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
            <X className="h-3 w-3 notranslate" />
            <span>Reset filters</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          3. REAL ITEM LIST WITH RICH CARDS
         ========================================================================= */}
      {filteredList.length === 0 ? (
        /* Clean Empty States for each Sub-tab with friendly messaging */
        <div className="p-8 sm:p-12 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-4">
          <div className="mx-auto w-24 h-24 sm:w-28 sm:h-28 relative flex items-center justify-center rounded-3xl bg-primary/10 text-primary">
            {subTab === 'helps' ? (
              <CheckCircle2 className="h-12 w-12 stroke-[1.8] notranslate" />
            ) : subTab === 'requests' ? (
              <FileText className="h-12 w-12 stroke-[1.8] notranslate" />
            ) : subTab === 'offers' ? (
              <HeartHandshake className="h-12 w-12 stroke-[1.8] notranslate" />
            ) : (
              <Clock className="h-12 w-12 stroke-[1.8] notranslate" />
            )}
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base font-bold text-foreground">
              {subTab === 'helps'
                ? 'No Completed Helps Yet'
                : subTab === 'requests'
                ? 'No Requests Posted'
                : subTab === 'offers'
                ? 'No Offers Made Yet'
                : 'No Activity Recorded'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {subTab === 'helps'
                ? 'When you accept and complete urgent neighbor requests, your mutual aid records will appear here.'
                : subTab === 'requests'
                ? "You haven't posted any help requests yet. Need emergency blood, medical gear, or assistance?"
                : subTab === 'offers'
                ? 'You have not submitted volunteer offers on open community requests yet.'
                : 'Your mutual aid history, posted requests, and volunteer offers will be cataloged here.'}
            </p>
          </div>

          <div className="pt-2">
            {subTab === 'requests' ? (
              <button
                onClick={() => setCurrentView('new')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-soft transition touch-target"
              >
                <Plus className="h-4 w-4 notranslate" />
                <span>Create New Request</span>
              </button>
            ) : (
              <button
                onClick={() => setCurrentView('requests')}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-soft transition touch-target"
              >
                <HeartHandshake className="h-4 w-4 notranslate" />
                <span>Explore Nearby Needs</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredList.map((item) => {
            const catMeta = getCategoryMeta(item.category);
            const statusMeta = getStatusMeta(item.status);
            const CategoryIcon = catMeta.icon;
            const StatusIcon = statusMeta.icon;

            const isCompleted = item.status === 'completed';
            const isMyRequest = item.type === 'request';
            const isMyOffer = item.type === 'offer';
            const isOpenOrPending = ['open', 'pending'].includes(item.status);

            return (
              <div
                key={item.id}
                className="p-4 sm:p-5 rounded-3xl border border-border bg-card shadow-soft hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Side: Category Icon in tinted circle + Title & Meta */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${catMeta.circleBg}`}
                    title={catMeta.label}
                  >
                    <CategoryIcon className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.2] notranslate" />
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Header Row: Title & Status Chip */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground leading-snug break-words">
                        {item.title}
                      </h4>
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${statusMeta.chipClass}`}
                      >
                        <StatusIcon className="h-3 w-3 notranslate" />
                        <span>{statusMeta.label}</span>
                      </span>
                    </div>

                    {/* Sub-meta: Category pill, Date, Distance */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-medium">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${catMeta.pillClass}`}>
                        {catMeta.label}
                      </span>
                      <span>{formatDate(item.date)}</span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground notranslate" />
                        <span>{item.distanceKm.toFixed(1)} km</span>
                      </span>
                    </div>

                    {/* Other Person info: Name and role / badges */}
                    {item.otherPerson && (
                      <div className="flex items-center gap-2 pt-1 text-xs text-foreground/90 font-medium">
                        <span className="text-muted-foreground text-[11px]">With:</span>
                        <strong className="font-semibold text-foreground truncate max-w-[180px] sm:max-w-none">
                          {item.otherPerson.name}
                        </strong>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                          {item.otherPerson.role}
                        </span>
                        {item.otherPerson.isVerified && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                            <ShieldCheck className="h-3 w-3 notranslate" />
                            <span>Verified</span>
                          </span>
                        )}
                        {item.otherPerson.rating && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <Star className="h-3 w-3 fill-amber-400 notranslate" />
                            <span>{item.otherPerson.rating.toFixed(1)}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Contextual Action Buttons */}
                <div className="flex flex-wrap items-center md:justify-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/60">
                  {/* Action 1: View details */}
                  <button
                    onClick={() => handleViewDetails(item.requestId)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-foreground text-xs font-bold transition shadow-xs touch-target"
                  >
                    <Eye className="h-3.5 w-3.5 text-muted-foreground notranslate" />
                    <span>View details</span>
                  </button>

                  {/* Action 2: Rate helper/requester (on completed) */}
                  {isCompleted && (
                    <button
                      onClick={() => handleOpenRate(item)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition shadow-xs touch-target"
                    >
                      <Star className="h-3.5 w-3.5 fill-amber-400 notranslate" />
                      <span>Rate {item.otherPerson?.role || 'Partner'}</span>
                    </button>
                  )}

                  {/* Action 3: Cancel request (if user is requester and open) */}
                  {isMyRequest && isOpenOrPending && (
                    <button
                      onClick={() => handleCancelRequest(item.requestId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold transition shadow-xs touch-target"
                    >
                      <Ban className="h-3.5 w-3.5 notranslate" />
                      <span>Cancel request</span>
                    </button>
                  )}

                  {/* Action 4: Cancel offer (if user is helper and offer pending) */}
                  {isMyOffer && isOpenOrPending && (
                    <button
                      onClick={() => handleCancelOffer(item.offerId)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold transition shadow-xs touch-target"
                    >
                      <Ban className="h-3.5 w-3.5 notranslate" />
                      <span>Withdraw offer</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          4. REQUEST DETAIL MODAL
         ========================================================================= */}
      {detailModalOpen && (
        <RequestDetailModal
          request={selectedRequest}
          open={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedRequest(null);
          }}
        />
      )}

      {/* =========================================================================
          5. RATE MODAL DIALOG
         ========================================================================= */}
      {ratingModalOpen && ratingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-2xl space-y-4">
            <button
              onClick={() => setRatingModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:bg-muted transition"
              aria-label="Close rating modal"
            >
              <X className="h-4 w-4 notranslate" />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">
                Rate Mutual Aid Experience
              </h3>
              <p className="text-xs text-muted-foreground">
                Feedback for <strong className="text-foreground">{ratingTarget.rateeName}</strong> on "{ratingTarget.title}"
              </p>
            </div>

            {/* Star Picker */}
            <div className="flex items-center justify-center gap-2 py-3 bg-muted/20 rounded-2xl border border-border">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRatingStars(s)}
                  className="p-1.5 transition-transform hover:scale-110 touch-target"
                  aria-label={`Select ${s} stars`}
                >
                  <Star
                    className={`h-7 w-7 notranslate transition-colors ${
                      s <= ratingStars
                        ? 'fill-amber-400 text-amber-500'
                        : 'text-muted-foreground/40'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Optional Comment */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">
                Your Review Note (Optional)
              </label>
              <textarea
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Share how this neighbor assisted you..."
                rows={3}
                className="w-full p-3 rounded-2xl border border-border bg-background text-foreground text-xs focus:outline-hidden focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRatingModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:bg-muted transition touch-target"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-soft transition disabled:opacity-50 touch-target"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
