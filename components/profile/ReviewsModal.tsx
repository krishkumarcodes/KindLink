'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  X,
  ShieldCheck,
  HeartHandshake,
  FileText,
  Clock,
  Droplet,
  Heart,
  BookOpen,
  MapPin,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

export interface ReviewItem {
  id: string;
  stars: number;
  comment: string;
  createdAt: string;
  role: 'volunteer' | 'requester';
  requestId: string;
  requestTitle: string;
  category: string;
  rater: {
    id: string;
    name: string;
    username?: string;
    avatarUrl?: string;
    isVerified?: boolean;
  };
}

interface ReviewsModalProps {
  open: boolean;
  onClose: () => void;
  userId?: string;
  trustScoreDisplay?: string;
  ratingCount?: number;
}

export function ReviewsModal({
  open,
  onClose,
  userId,
  trustScoreDisplay = '—',
  ratingCount = 0,
}: ReviewsModalProps) {
  const [subTab, setSubTab] = useState<'volunteer' | 'requester'>('volunteer');
  const [loading, setLoading] = useState(false);
  const [reviewsData, setReviewsData] = useState<{
    stats: {
      trustScore: number | null;
      totalReviewsCount: number;
      hasEnoughForScore: boolean;
      helperRating: number | null;
      helperCount: number;
      requesterRating: number | null;
      requesterCount: number;
    };
    asVolunteer: ReviewItem[];
    asRequester: ReviewItem[];
  }>({
    stats: {
      trustScore: null,
      totalReviewsCount: ratingCount,
      hasEnoughForScore: ratingCount >= 5,
      helperRating: null,
      helperCount: 0,
      requesterRating: null,
      requesterCount: 0,
    },
    asVolunteer: [],
    asRequester: [],
  });

  // Preserve window.scrollY across modal open and close
  useEffect(() => {
    if (!open) return;
    const savedScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
    return () => {
      if (typeof window !== 'undefined' && window.scrollY !== savedScrollY) {
        window.scrollTo({ top: savedScrollY, behavior: 'instant' as ScrollBehavior });
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    async function fetchReviews() {
      setLoading(true);
      try {
        const url = userId ? `/api/profile/reviews?userId=${userId}` : '/api/profile/reviews';
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success) {
            setReviewsData({
              stats: json.stats,
              asVolunteer: json.asVolunteer || [],
              asRequester: json.asRequester || [],
            });
          }
        }
      } catch {
        // Handled gracefully with existing state
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [open, userId]);

  if (!open) return null;

  const currentList = subTab === 'volunteer' ? reviewsData.asVolunteer : reviewsData.asRequester;
  const volunteerCount = reviewsData.asVolunteer.length;
  const requesterCount = reviewsData.asRequester.length;
  const totalReviews = reviewsData.stats.totalReviewsCount || (volunteerCount + requesterCount);

  const formatReviewDate = (dateStr: string) => {
    if (!dateStr) return 'Recently';
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

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'blood':
        return Droplet;
      case 'equipment':
        return ShieldCheck;
      case 'elderly':
      case 'elderly_help':
        return Heart;
      case 'books':
        return BookOpen;
      case 'transport':
        return MapPin;
      default:
        return HeartHandshake;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-background/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] rounded-3xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* =====================================================================
            1. MODAL HEADER: Title, Close button
           ===================================================================== */}
        <div className="p-5 sm:p-6 border-b border-border flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
              <Star className="h-6 w-6 fill-amber-400 notranslate" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">
                Trust Score & Peer Ratings
              </h2>
              <p className="text-xs text-muted-foreground">
                Verified community feedback on completed help
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition touch-target"
            aria-label="Close reviews modal"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* =====================================================================
            2. SCROLLABLE CONTENT BODY
           ===================================================================== */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Trust Score Summary Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-primary/5 to-emerald-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-3xl sm:text-4xl font-black text-foreground tracking-tight font-mono">
                  {reviewsData.stats.hasEnoughForScore && reviewsData.stats.trustScore !== null
                    ? reviewsData.stats.trustScore.toFixed(1)
                    : trustScoreDisplay}
                </span>
                <div className="flex flex-col items-start text-left">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className="h-3.5 w-3.5 fill-amber-400 text-amber-500 notranslate"
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    out of 5.0
                  </span>
                </div>
              </div>
              <p className="text-xs text-foreground/80 font-medium">
                Based on <strong className="font-bold text-foreground">{totalReviews}</strong> community rating{totalReviews === 1 ? '' : 's'}
              </p>
            </div>

            <div className="text-center sm:text-right text-[11px] text-muted-foreground max-w-xs leading-relaxed">
              {totalReviews >= 5 ? (
                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="h-3.5 w-3.5 notranslate" />
                  <span>Public Trust Score Unlocked</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-xl border border-amber-500/20">
                  <Sparkles className="h-3.5 w-3.5 notranslate" />
                  <span>{5 - totalReviews} more rating{5 - totalReviews === 1 ? '' : 's'} to unlock score</span>
                </span>
              )}
            </div>
          </div>

          {/* Sub-tabs: As Volunteer vs As Requester */}
          <div className="flex items-center gap-2 border-b border-border pb-2 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setSubTab('volunteer')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition touch-target whitespace-nowrap ${
                subTab === 'volunteer'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <HeartHandshake className="h-3.5 w-3.5 notranslate" />
              <span>As a Volunteer ({volunteerCount})</span>
            </button>

            <button
              onClick={() => setSubTab('requester')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition touch-target whitespace-nowrap ${
                subTab === 'requester'
                  ? 'bg-foreground text-background shadow-xs'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <FileText className="h-3.5 w-3.5 notranslate" />
              <span>As a Requester ({requesterCount})</span>
            </button>
          </div>

          {/* Role specific rating badge */}
          {subTab === 'requester' && (
            <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                Requester Trust Rating
              </span>
              <strong className="text-foreground font-bold font-mono">
                {reviewsData.stats.requesterRating !== null
                  ? `${reviewsData.stats.requesterRating.toFixed(1)} / 5.0 (${requesterCount} reviews)`
                  : 'No requester ratings yet'}
              </strong>
            </div>
          )}

          {subTab === 'volunteer' && (
            <div className="p-3 rounded-2xl bg-muted/40 border border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">
                Volunteer Help Rating
              </span>
              <strong className="text-foreground font-bold font-mono">
                {reviewsData.stats.helperRating !== null
                  ? `${reviewsData.stats.helperRating.toFixed(1)} / 5.0 (${volunteerCount} reviews)`
                  : 'No volunteer ratings yet'}
              </strong>
            </div>
          )}

          {/* List or Clean Empty State */}
          {loading ? (
            <div className="py-12 text-center space-y-2 text-muted-foreground text-xs">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading peer reviews...</p>
            </div>
          ) : currentList.length === 0 ? (
            /* EXACT CLEAN EMPTY STATE REQUIRED BY SPEC */
            <div className="p-8 sm:p-10 rounded-3xl border border-dashed border-border bg-muted/20 text-center space-y-3">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground">
                <Star className="h-8 w-8 stroke-[1.6] notranslate" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">
                  No ratings yet. Ratings appear after completed helps.
                </h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {subTab === 'volunteer'
                    ? 'When you assist neighbors and complete aid requests, requesters can rate and review your help.'
                    : 'When volunteers complete your requests, they can rate your communication and coordination.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {currentList.map((review) => {
                const CatIcon = getCategoryIcon(review.category);
                return (
                  <div
                    key={review.id}
                    className="p-4 rounded-2xl border border-border bg-background shadow-xs space-y-2.5"
                  >
                    {/* Review Header: Rater info, Stars, Date */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {review.rater.avatarUrl ? (
                          <img
                            src={review.rater.avatarUrl}
                            alt={review.rater.name}
                            className="h-8 w-8 rounded-xl object-cover shrink-0 border border-border"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {review.rater.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <strong className="text-xs font-bold text-foreground truncate block">
                              {review.rater.name}
                            </strong>
                            {review.rater.isVerified && (
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
                            )}
                          </div>
                          {review.rater.username && (
                            <span className="text-[10px] text-muted-foreground font-mono block">
                              @{review.rater.username}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stars & Date */}
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-0.5 justify-end">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`h-3 w-3 notranslate ${
                                s <= review.stars
                                  ? 'fill-amber-400 text-amber-500'
                                  : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatReviewDate(review.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Task Reference */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/40 px-2.5 py-1 rounded-xl">
                      <CatIcon className="h-3 w-3 text-primary notranslate shrink-0" />
                      <span className="truncate">{review.requestTitle}</span>
                    </div>

                    {/* Review Comment */}
                    {review.comment ? (
                      <p className="text-xs text-foreground/90 leading-relaxed italic">
                        "{review.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Rated {review.stars} stars for community help.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-card flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90 transition touch-target"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
