'use client';

import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  CheckCircle2,
  Star,
  ShieldAlert,
  Clock,
  RotateCcw,
  Edit3,
  XCircle,
  Loader2,
} from 'lucide-react';
import { HelpRequest, RequestLifecycleStatus, VolunteerOffer, UserProfile } from '@/lib/data/types';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { PrimaryHelpButton, SecondaryButton, ShareButton, ReportButton } from './ActionButtons';

export interface StickyActionBarProps {
  request: HelpRequest;
  userProfile: UserProfile | null;
  offers: VolunteerOffer[];
  isRequester: boolean;
  isAcceptedHelper: boolean;
  currentStatus: RequestLifecycleStatus;
  actionInProgress?: string | null;
  onOfferHelp: () => void;
  onAdvanceStatus: (nextStatus: RequestLifecycleStatus) => Promise<void>;
  onWithdrawOffer: (offerId: string) => Promise<void>;
  onCancelRequest: () => Promise<void>;
  onEditRequest: () => void;
  onOpenRating: () => void;
  onGetVerified: () => void;
  onShare: () => void;
  onReport: () => void;
}

export function StickyActionBar({
  request,
  userProfile,
  offers,
  isRequester,
  isAcceptedHelper,
  currentStatus,
  actionInProgress = null,
  onOfferHelp,
  onAdvanceStatus,
  onWithdrawOffer,
  onCancelRequest,
  onEditRequest,
  onOpenRating,
  onGetVerified,
  onShare,
  onReport,
}: StickyActionBarProps) {
  const categoryToken = getCategoryToken(request.category);
  const isVerified = userProfile?.verificationState === 'verified';

  // Check if current user has an offer pending
  const myPendingOffer = offers.find(
    (o) =>
      o.status === 'pending' &&
      userProfile &&
      (o.helperId === userProfile.id || o.helperName === userProfile.name)
  );

  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [confirmWithdrawOpen, setConfirmWithdrawOpen] = useState(false);

  // 1. COMPLETED STATUS VIEW
  if (currentStatus === 'completed') {
    return (
      <div className="sticky bottom-0 left-0 right-0 p-3.5 sm:px-6 bg-card border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-2.5 max-w-2xl mx-auto">
          {isRequester ? (
            <button
              type="button"
              onClick={onOpenRating}
              style={{
                backgroundColor: categoryToken.primary,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${categoryToken.glow}`,
              }}
              className={`relative overflow-hidden flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm bg-gradient-to-r ${categoryToken.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${categoryToken.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center gap-2 whitespace-nowrap min-w-0`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
              <Star className="relative z-10 h-5 w-5 fill-white notranslate shrink-0 stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
              <span className="relative z-10 font-bold leading-none">Rate helper</span>
            </button>
          ) : isAcceptedHelper ? (
            <button
              type="button"
              onClick={onOpenRating}
              style={{
                backgroundColor: categoryToken.primary,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${categoryToken.glow}`,
              }}
              className={`relative overflow-hidden flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm bg-gradient-to-r ${categoryToken.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${categoryToken.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center gap-2 whitespace-nowrap min-w-0`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
              <Star className="relative z-10 h-5 w-5 fill-white notranslate shrink-0 stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
              <span className="relative z-10 font-bold leading-none">Rate requester</span>
            </button>
          ) : (
            <div className="flex-1 h-[52px] rounded-[16px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap min-w-0 px-3">
              <CheckCircle2 className="h-5 w-5 notranslate text-emerald-600 shrink-0 stroke-[2.2]" />
              <span className="truncate">Task successfully completed</span>
            </div>
          )}

          {/* Share icon button */}
          <ShareButton onShare={onShare} />
        </div>
      </div>
    );
  }

  // 2. REQUEST OWNER CONTROLS (Never see help buttons on own request)
  if (isRequester) {
    const isProgressing =
      currentStatus === 'accepted' ||
      currentStatus === 'on_the_way' ||
      currentStatus === 'arrived';

    return (
      <div className="sticky bottom-0 left-0 right-0 p-3.5 sm:px-6 bg-card border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-2.5 max-w-2xl mx-auto">
          {isProgressing ? (
            <>
              {/* Mark completed button */}
              <button
                type="button"
                disabled={Boolean(actionInProgress)}
                onClick={() => onAdvanceStatus('completed')}
                style={{
                  backgroundColor: categoryToken.primary,
                  boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${categoryToken.glow}`,
                }}
                className={`relative overflow-hidden flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm bg-gradient-to-r ${categoryToken.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${categoryToken.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 min-w-0`}
              >
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
                {actionInProgress === 'completed' ? (
                  <Loader2 className="relative z-10 h-5 w-5 animate-spin notranslate stroke-[2.2]" />
                ) : (
                  <CheckCircle2 className="relative z-10 h-5 w-5 notranslate stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
                )}
                <span className="relative z-10 font-bold leading-none">Mark completed</span>
              </button>

              <SecondaryButton
                size="details"
                variant="destructive-outline"
                icon={XCircle}
                onClick={() => setConfirmCancelOpen(true)}
              >
                Cancel
              </SecondaryButton>
            </>
          ) : (
            <>
              {/* Owner controls when open/offered */}
              <SecondaryButton
                size="details"
                variant="outline"
                icon={Edit3}
                onClick={onEditRequest}
                className="flex-1 min-w-0"
              >
                Edit request
              </SecondaryButton>

              <SecondaryButton
                size="details"
                variant="destructive-outline"
                icon={XCircle}
                onClick={() => setConfirmCancelOpen(true)}
                className="flex-1 min-w-0"
              >
                Cancel request
              </SecondaryButton>
            </>
          )}

          <ShareButton onShare={onShare} />
        </div>

        {/* Confirmation modal for cancel */}
        {confirmCancelOpen && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-foreground">Cancel this request?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will withdraw the request from community feeds and inform volunteers.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancelOpen(false)}
                  className="flex-1 h-[48px] rounded-[16px] backdrop-blur-md bg-card/85 dark:bg-card/75 border border-border/80 dark:border-white/15 text-xs font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.04)] hover:border-primary/40 hover:bg-muted/80 hover:shadow-md hover:shadow-primary/10 active:scale-[0.98] transition-all duration-150 touch-target"
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmCancelOpen(false);
                    await onCancelRequest();
                  }}
                  className="relative overflow-hidden flex-1 h-[48px] rounded-[16px] bg-gradient-to-r from-rose-600 via-rose-600 to-red-600 text-white text-xs font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(244,63,94,0.3)] shadow-md shadow-rose-500/25 hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
                  <span className="relative z-10">Confirm Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. ACCEPTED HELPER ACTIONS ("On the way", "Arrived", "Mark completed")
  if (isAcceptedHelper) {
    return (
      <div className="sticky bottom-0 left-0 right-0 p-3.5 sm:px-6 bg-card border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-2.5 max-w-2xl mx-auto">
          {currentStatus === 'accepted' && (
            <button
              type="button"
              disabled={Boolean(actionInProgress)}
              onClick={() => onAdvanceStatus('on_the_way')}
              style={{
                backgroundColor: categoryToken.primary,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${categoryToken.glow}`,
              }}
              className={`relative overflow-hidden flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm bg-gradient-to-r ${categoryToken.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${categoryToken.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 min-w-0`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
              {actionInProgress === 'on_the_way' ? (
                <Loader2 className="relative z-10 h-5 w-5 animate-spin notranslate stroke-[2.2]" />
              ) : (
                <Navigation className="relative z-10 h-5 w-5 notranslate stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
              )}
              <span className="relative z-10 font-bold leading-none">On the way</span>
            </button>
          )}

          {currentStatus === 'on_the_way' && (
            <button
              type="button"
              disabled={Boolean(actionInProgress)}
              onClick={() => onAdvanceStatus('arrived')}
              style={{
                backgroundColor: categoryToken.primary,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${categoryToken.glow}`,
              }}
              className={`relative overflow-hidden flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm bg-gradient-to-r ${categoryToken.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${categoryToken.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 min-w-0`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
              {actionInProgress === 'arrived' ? (
                <Loader2 className="relative z-10 h-5 w-5 animate-spin notranslate stroke-[2.2]" />
              ) : (
                <MapPin className="relative z-10 h-5 w-5 notranslate stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
              )}
              <span className="relative z-10 font-bold leading-none">Arrived</span>
            </button>
          )}

          {currentStatus === 'arrived' && (
            <button
              type="button"
              disabled={Boolean(actionInProgress)}
              onClick={() => onAdvanceStatus('completed')}
              style={{
                backgroundColor: categoryToken.primary,
                boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${categoryToken.glow}`,
              }}
              className={`relative overflow-hidden flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm bg-gradient-to-r ${categoryToken.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${categoryToken.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 min-w-0`}
            >
              <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
              {actionInProgress === 'completed' ? (
                <Loader2 className="relative z-10 h-5 w-5 animate-spin notranslate stroke-[2.2]" />
              ) : (
                <CheckCircle2 className="relative z-10 h-5 w-5 notranslate stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
              )}
              <span className="relative z-10 font-bold leading-none">Mark completed</span>
            </button>
          )}

          <ShareButton onShare={onShare} />
        </div>
      </div>
    );
  }

  // 4. HELPER WITH PENDING OFFER ("Offer sent" banner row + clearly labelled "Withdraw offer" button + confirmation modal)
  if (myPendingOffer) {
    return (
      <div className="sticky bottom-0 left-0 right-0 p-3.5 sm:px-6 bg-card border-t border-border z-30 shrink-0">
        <div className="space-y-2.5 max-w-2xl mx-auto">
          {/* Banner row: "Offer sent · waiting for a reply" */}
          <div className="w-full py-2 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-xs sm:text-sm">
            <Clock className="h-4 w-4 shrink-0 notranslate text-amber-500 stroke-[2.2]" />
            <span className="truncate">Offer sent · waiting for a reply</span>
          </div>

          {/* Action buttons row: "Withdraw offer" clearly labelled + Share + Report */}
          <div className="flex items-center gap-2.5">
            <SecondaryButton
              size="details"
              variant="outline"
              icon={RotateCcw}
              isLoading={actionInProgress === myPendingOffer.id}
              onClick={() => setConfirmWithdrawOpen(true)}
              className="flex-1 min-w-0"
            >
              Withdraw offer
            </SecondaryButton>

            <ShareButton onShare={onShare} />
            <ReportButton onReport={onReport} />
          </div>
        </div>

        {/* Confirmation modal before withdrawing */}
        {confirmWithdrawOpen && (
          <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
            <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-foreground">Withdraw your offer?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will remove your offer from this request and notify the requester. You can offer help again later if needed.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmWithdrawOpen(false)}
                  className="flex-1 h-[48px] rounded-[16px] backdrop-blur-md bg-card/85 dark:bg-card/75 border border-border/80 dark:border-white/15 text-xs font-semibold text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_8px_rgba(0,0,0,0.04)] hover:border-primary/40 hover:bg-muted/80 hover:shadow-md hover:shadow-primary/10 active:scale-[0.98] transition-all duration-150 touch-target"
                >
                  Keep Offer
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmWithdrawOpen(false);
                    await onWithdrawOffer(myPendingOffer.id);
                  }}
                  className="relative overflow-hidden flex-1 h-[48px] rounded-[16px] bg-gradient-to-r from-rose-600 via-rose-600 to-red-600 text-white text-xs font-bold shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(244,63,94,0.3)] shadow-md shadow-rose-500/25 hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target"
                >
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
                  <span className="relative z-10">Confirm Withdraw</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. UNVERIFIED VIEWER ("Get verified to help")
  if (!isVerified) {
    return (
      <div className="sticky bottom-0 left-0 right-0 p-3.5 sm:px-6 bg-card border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-2.5 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={onGetVerified}
            style={{
              backgroundColor: categoryToken.primary,
              boxShadow: `inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 20px rgba(0,0,0,0.12), 0 4px 14px 0 ${categoryToken.glow}`,
            }}
            className={`relative overflow-hidden flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm bg-gradient-to-r ${categoryToken.gradient} shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_20px_rgba(0,0,0,0.12)] shadow-md ${categoryToken.glowTailwind || ''} hover:brightness-105 active:scale-[0.98] transition-all duration-150 touch-target flex items-center justify-center gap-2 whitespace-nowrap min-w-0`}
          >
            <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-t-[inherit]" aria-hidden="true" />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/15 to-transparent rounded-b-[inherit]" aria-hidden="true" />
            <ShieldAlert className="relative z-10 h-5 w-5 notranslate shrink-0 stroke-[2.2] filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.25)]" />
            <span className="relative z-10 font-bold truncate leading-none">Get verified to help</span>
          </button>

          <ShareButton onShare={onShare} />
          <ReportButton onReport={onReport} />
        </div>
      </div>
    );
  }

  // 6. GENERAL VERIFIED HELPER ("Offer help", Share, Report)
  return (
    <div className="sticky bottom-0 left-0 right-0 p-3.5 sm:px-6 bg-card border-t border-border z-30 shrink-0">
      <div className="flex items-center gap-2.5 max-w-2xl mx-auto">
        {/* Primary help button: "Offer help", category icon on left, 52px high, radius 16, category colour, soft pressed, single line */}
        <PrimaryHelpButton
          category={request.category}
          size="details"
          label="Offer help"
          onClick={onOfferHelp}
          className="flex-1 min-w-0"
        />

        {/* Share and Report icon buttons aligned on same row as main button */}
        <ShareButton onShare={onShare} />
        <ReportButton onReport={onReport} />
      </div>
    </div>
  );
}
