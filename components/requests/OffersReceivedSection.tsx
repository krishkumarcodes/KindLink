'use client';

import React, { useState } from 'react';
import {
  HeartHandshake,
  ShieldCheck,
  Star,
  MapPin,
  Clock,
  Award,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { VolunteerOffer, HelpRequest } from '@/lib/data/types';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { SecondaryButton } from './ActionButtons';

export interface OffersReceivedSectionProps {
  request: HelpRequest;
  offers: VolunteerOffer[];
  isLoading?: boolean;
  actionInProgress?: string | null;
  onAcceptOffer: (offer: VolunteerOffer) => Promise<void>;
  onDeclineOffer: (offer: VolunteerOffer, reason?: string) => Promise<void>;
}

export function OffersReceivedSection({
  request,
  offers,
  isLoading = false,
  actionInProgress = null,
  onAcceptOffer,
  onDeclineOffer,
}: OffersReceivedSectionProps) {
  const categoryToken = getCategoryToken(request.category);

  // Expanded messages state for "Read more" toggle
  const [expandedOffers, setExpandedOffers] = useState<Record<string, boolean>>({});

  // Accept Confirmation Sheet State
  const [confirmAcceptOffer, setConfirmAcceptOffer] = useState<VolunteerOffer | null>(null);
  const [isSubmittingAccept, setIsSubmittingAccept] = useState(false);

  // Decline Reason Sheet State
  const [declineOfferTarget, setDeclineOfferTarget] = useState<VolunteerOffer | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('Found another helper');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  const toggleExpand = (offerId: string) => {
    setExpandedOffers((prev) => ({
      ...prev,
      [offerId]: !prev[offerId],
    }));
  };

  const hasPendingOffers = offers.some((o) => o.status === 'pending');

  const handleConfirmAccept = async () => {
    if (!confirmAcceptOffer) return;
    setIsSubmittingAccept(true);
    try {
      await onAcceptOffer(confirmAcceptOffer);
      setConfirmAcceptOffer(null);
    } finally {
      setIsSubmittingAccept(false);
    }
  };

  const handleConfirmDecline = async () => {
    if (!declineOfferTarget) return;
    setIsSubmittingDecline(true);
    try {
      const finalReason = declineReason === 'Other' ? customReason || 'Other' : declineReason;
      await onDeclineOffer(declineOfferTarget, finalReason);
      setDeclineOfferTarget(null);
      setDeclineReason('Found another helper');
      setCustomReason('');
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  // Status Chip Config
  const getStatusChip = (status: VolunteerOffer['status']) => {
    switch (status) {
      case 'accepted':
        return {
          label: 'Accepted',
          classes:
            'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
        };
      case 'declined':
        return {
          label: 'Declined',
          classes: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30',
        };
      case 'not_selected':
        return {
          label: 'Not selected',
          classes: 'bg-muted text-muted-foreground border border-border/80',
        };
      case 'withdrawn':
        return {
          label: 'Withdrawn',
          classes: 'bg-muted/60 text-muted-foreground/80 border border-border/60',
        };
      case 'pending':
      default:
        return {
          label: 'Pending',
          classes:
            'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
        };
    }
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card/60 p-4 sm:p-5 shadow-xs space-y-4">
      {/* =====================================================================
          HEADER ROW: "Offers received  X" + "Action needed" pill
          Specification: "Offers received  X" with count pill on one line;
          "Action needed" pill on right if pending offers exist (moves below if narrow).
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-1 border-b border-border/60">
        <div className="flex items-center gap-2">
          <HeartHandshake
            className="h-5 w-5 shrink-0 notranslate"
            style={{ color: categoryToken.primary }}
          />
          <h3 className="text-sm sm:text-base font-bold text-foreground flex items-center gap-2">
            <span>Offers received</span>
            <span
              className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-2 rounded-full text-xs font-black shadow-xs leading-none"
              style={{
                backgroundColor: categoryToken.lightBg,
                color: categoryToken.primary,
                border: `1px solid ${categoryToken.border}`,
              }}
            >
              {offers.length}
            </span>
          </h3>
        </div>

        {hasPendingOffers && (
          <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Action needed</span>
          </span>
        )}
      </div>

      {/* Offers List */}
      {offers.length === 0 ? (
        <div className="p-6 text-center rounded-2xl bg-muted/30 border border-border/60 space-y-2">
          <HeartHandshake className="h-8 w-8 text-muted-foreground/60 mx-auto notranslate" />
          <p className="text-xs font-semibold text-foreground">No offers received yet</p>
          <p className="text-[11px] text-muted-foreground">
            Nearby verified volunteers in the area are being alerted of your urgent request.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {offers.map((offer) => {
            const isPending = offer.status === 'pending';
            const statusConfig = getStatusChip(offer.status);
            const isExpanded = Boolean(expandedOffers[offer.id]);
            const isLongMessage = offer.message && offer.message.length > 110;

            // Helper top badges (max 2)
            const badgesToDisplay =
              offer.helperBadges && offer.helperBadges.length > 0
                ? offer.helperBadges.slice(0, 2)
                : ['Verified Helper', 'Speed Responder'];

            return (
              <div
                key={offer.id}
                className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3 transition-all hover:border-primary/40"
              >
                {/* 1. Avatar, Name + Verified Shield, Status Chip (right-aligned on same row) */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-xs"
                      style={{ backgroundColor: categoryToken.primary }}
                    >
                      {offer.helperName.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-foreground truncate">
                          {offer.helperName}
                        </span>
                        <ShieldCheck
                          className="h-4 w-4 text-emerald-500 shrink-0 notranslate"
                          aria-label="Verified Volunteer"
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground block truncate">
                        Offered {offer.createdAt}
                      </span>
                    </div>
                  </div>

                  {/* Status chip right-aligned on same row */}
                  <span
                    className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold tracking-wide ${statusConfig.classes}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* 2. Meta row: trust rating, distance, arrival time promise, helper's top 2 badges */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground pt-0.5">
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 notranslate" />
                    <span>{offer.helperRating.toFixed(1)}</span>
                  </span>

                  <span className="text-border">•</span>

                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-primary notranslate" />
                    <span>{offer.helperDistanceKm ?? 1.2} km away</span>
                  </span>

                  <span className="text-border">•</span>

                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary notranslate" />
                    <span>
                      {offer.helperEtaMinutes
                        ? `Can arrive in ~${offer.helperEtaMinutes}m`
                        : 'Ready immediately'}
                    </span>
                  </span>

                  {/* Helper's top 2 badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {badgesToDisplay.map((badge, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-muted/70 text-foreground/80 border border-border/70"
                      >
                        <Award className="h-3 w-3 text-amber-500 notranslate" />
                        <span>{badge}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Message in quote block (up to 3 lines, "Read more" toggle) */}
                {offer.message && (
                  <div className="relative rounded-xl bg-muted/40 border-l-4 border-l-primary/60 dark:border-l-primary p-3 text-xs text-foreground space-y-1">
                    <p
                      className={`leading-relaxed italic ${
                        !isExpanded && isLongMessage ? 'line-clamp-3' : ''
                      }`}
                    >
                      &ldquo;{offer.message}&rdquo;
                    </p>
                    {isLongMessage && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(offer.id)}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-0.5 pt-0.5"
                      >
                        {isExpanded ? (
                          <>
                            <span>Read less</span>
                            <ChevronUp className="h-3 w-3 notranslate" />
                          </>
                        ) : (
                          <>
                            <span>Read more</span>
                            <ChevronDown className="h-3 w-3 notranslate" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Optional decline reason display if declined */}
                {offer.status === 'declined' && offer.declineReason && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Reason: {offer.declineReason}
                  </p>
                )}

                {/* 4. Buttons row: "Decline" (outline) and "Accept" (category colour), equal width, 48px high, one line, 12px gap. Stacked on narrow screens. */}
                {isPending && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <button
                      type="button"
                      disabled={actionInProgress === offer.id}
                      onClick={() => setDeclineOfferTarget(offer)}
                      className="flex-1 h-[48px] rounded-[16px] border border-border/80 dark:border-white/15 bg-background/80 hover:bg-muted text-foreground font-semibold text-sm active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-1.5 whitespace-nowrap shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4 notranslate shrink-0" />
                      <span>Decline</span>
                    </button>

                    <button
                      type="button"
                      disabled={actionInProgress === offer.id}
                      onClick={() => setConfirmAcceptOffer(offer)}
                      style={{ backgroundColor: categoryToken.primary }}
                      className="flex-1 h-[48px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {actionInProgress === offer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin notranslate shrink-0" />
                      ) : (
                        <Check className="h-4 w-4 notranslate shrink-0" />
                      )}
                      <span>Accept</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          ACCEPT CONFIRMATION SHEET / MODAL
          Specification: "Accept <name> as your helper? They will see your phone number." with Confirm and Cancel.
         ===================================================================== */}
      {confirmAcceptOffer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="accept-confirm-title"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmAcceptOffer(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border/80 p-6 shadow-2xl text-card-foreground space-y-4 animate-in zoom-in-95 duration-150">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto text-white shadow-soft"
              style={{ backgroundColor: categoryToken.primary }}
            >
              <Check className="h-6 w-6 notranslate" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 id="accept-confirm-title" className="text-lg font-bold text-foreground">
                Accept {confirmAcceptOffer.helperName} as your helper?
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                They will see your phone number so you can coordinate help quickly and safely.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 flex items-center gap-3 text-xs">
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Phone className="h-4 w-4 notranslate" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-foreground block">
                  {request.contactName}: {request.phone}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Shared exclusively with {confirmAcceptOffer.helperName}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingAccept}
                onClick={() => setConfirmAcceptOffer(null)}
                className="flex-1 h-[48px] rounded-[16px] border border-border/80 bg-background/80 hover:bg-muted text-foreground font-semibold text-sm active:scale-[0.98] transition-all touch-target flex items-center justify-center shadow-xs"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmittingAccept}
                onClick={handleConfirmAccept}
                style={{ backgroundColor: categoryToken.primary }}
                className="flex-1 h-[48px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingAccept ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin notranslate" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 notranslate" />
                    <span>Confirm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          DECLINE REASONS SHEET / MODAL
          Specification: "Decline: Quick optional reasons ('Found another helper', 'No longer needed', 'Other')."
         ===================================================================== */}
      {declineOfferTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="decline-confirm-title"
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeclineOfferTarget(null);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-card border border-border/80 p-6 shadow-2xl text-card-foreground space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 id="decline-confirm-title" className="text-base font-bold text-foreground">
                  Decline offer from {declineOfferTarget.helperName}?
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select an optional reason to let the volunteer know:
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeclineOfferTarget(null)}
                className="p-1 rounded-xl text-muted-foreground hover:bg-muted transition"
                aria-label="Close"
              >
                <X className="h-4 w-4 notranslate" />
              </button>
            </div>

            {/* Quick Optional Reasons */}
            <div className="space-y-2 pt-1">
              {['Found another helper', 'No longer needed', 'Other'].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                    declineReason === reason
                      ? 'border-primary bg-primary/5 text-foreground font-semibold'
                      : 'border-border/80 bg-background/50 text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="declineReason"
                    value={reason}
                    checked={declineReason === reason}
                    onChange={() => setDeclineReason(reason)}
                    className="text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs">{reason}</span>
                </label>
              ))}
            </div>

            {declineReason === 'Other' && (
              <input
                type="text"
                placeholder="Specify reason (optional)..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                disabled={isSubmittingDecline}
                onClick={() => setDeclineOfferTarget(null)}
                className="flex-1 h-[48px] rounded-[16px] border border-border/80 bg-background/80 hover:bg-muted text-foreground font-semibold text-sm active:scale-[0.98] transition-all touch-target flex items-center justify-center shadow-xs"
              >
                Keep Offer
              </button>

              <button
                type="button"
                disabled={isSubmittingDecline}
                onClick={handleConfirmDecline}
                className="flex-1 h-[48px] rounded-[16px] bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-md active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingDecline ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin notranslate" />
                    <span>Declining...</span>
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 notranslate" />
                    <span>Decline Offer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
