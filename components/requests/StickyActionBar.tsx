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
  LucideIcon,
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

  // 1. COMPLETED STATUS VIEW
  if (currentStatus === 'completed') {
    return (
      <div className="sticky bottom-0 left-0 right-0 p-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {isRequester ? (
            <button
              type="button"
              onClick={onOpenRating}
              style={{ backgroundColor: categoryToken.primary }}
              className="flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Star className="h-5 w-5 fill-white notranslate shrink-0" />
              <span>Rate helper</span>
            </button>
          ) : isAcceptedHelper ? (
            <button
              type="button"
              onClick={onOpenRating}
              style={{ backgroundColor: categoryToken.primary }}
              className="flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <Star className="h-5 w-5 fill-white notranslate shrink-0" />
              <span>Rate requester</span>
            </button>
          ) : (
            <div className="flex-1 h-[52px] rounded-[16px] bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 font-bold text-sm flex items-center justify-center gap-2 whitespace-nowrap">
              <CheckCircle2 className="h-5 w-5 notranslate text-emerald-600" />
              <span>Task successfully completed</span>
            </div>
          )}

          {/* Share icon button */}
          <ShareButton onShare={onShare} />
        </div>
      </div>
    );
  }

  // 2. REQUEST OWNER CONTROLS
  if (isRequester) {
    const isProgressing =
      currentStatus === 'accepted' ||
      currentStatus === 'on_the_way' ||
      currentStatus === 'arrived';

    return (
      <div className="sticky bottom-0 left-0 right-0 p-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {isProgressing ? (
            <>
              {/* Mark completed button */}
              <button
                type="button"
                disabled={Boolean(actionInProgress)}
                onClick={() => onAdvanceStatus('completed')}
                style={{ backgroundColor: categoryToken.primary }}
                className="flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
              >
                {actionInProgress === 'completed' ? (
                  <Loader2 className="h-5 w-5 animate-spin notranslate" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 notranslate" />
                )}
                <span>Mark completed</span>
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
                className="flex-1"
              >
                Edit request
              </SecondaryButton>

              <SecondaryButton
                size="details"
                variant="destructive-outline"
                icon={XCircle}
                onClick={() => setConfirmCancelOpen(true)}
                className="flex-1"
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
              <p className="text-xs text-muted-foreground">
                This will withdraw the request from community feeds and inform volunteers.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmCancelOpen(false)}
                  className="flex-1 h-[48px] rounded-[16px] border border-border text-xs font-semibold hover:bg-muted"
                >
                  Keep Request
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setConfirmCancelOpen(false);
                    await onCancelRequest();
                  }}
                  className="flex-1 h-[48px] rounded-[16px] bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
                >
                  Confirm Cancel
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
      <div className="sticky bottom-0 left-0 right-0 p-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {currentStatus === 'accepted' && (
            <button
              type="button"
              disabled={Boolean(actionInProgress)}
              onClick={() => onAdvanceStatus('on_the_way')}
              style={{ backgroundColor: categoryToken.primary }}
              className="flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              {actionInProgress === 'on_the_way' ? (
                <Loader2 className="h-5 w-5 animate-spin notranslate" />
              ) : (
                <Navigation className="h-5 w-5 notranslate" />
              )}
              <span>On the way</span>
            </button>
          )}

          {currentStatus === 'on_the_way' && (
            <button
              type="button"
              disabled={Boolean(actionInProgress)}
              onClick={() => onAdvanceStatus('arrived')}
              style={{ backgroundColor: categoryToken.primary }}
              className="flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              {actionInProgress === 'arrived' ? (
                <Loader2 className="h-5 w-5 animate-spin notranslate" />
              ) : (
                <MapPin className="h-5 w-5 notranslate" />
              )}
              <span>Arrived</span>
            </button>
          )}

          {currentStatus === 'arrived' && (
            <button
              type="button"
              disabled={Boolean(actionInProgress)}
              onClick={() => onAdvanceStatus('completed')}
              style={{ backgroundColor: categoryToken.primary }}
              className="flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60"
            >
              {actionInProgress === 'completed' ? (
                <Loader2 className="h-5 w-5 animate-spin notranslate" />
              ) : (
                <CheckCircle2 className="h-5 w-5 notranslate" />
              )}
              <span>Mark completed</span>
            </button>
          )}

          <ShareButton onShare={onShare} />
        </div>
      </div>
    );
  }

  // 4. HELPER WITH PENDING OFFER ("Offer sent" status badge + "Withdraw offer" button)
  if (myPendingOffer) {
    return (
      <div className="sticky bottom-0 left-0 right-0 p-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          {/* "Offer sent" status badge */}
          <div className="flex-1 h-[52px] px-3.5 rounded-[16px] bg-amber-500/10 border border-amber-500/25 flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs sm:text-sm whitespace-nowrap">
            <Clock className="h-4 w-4 shrink-0 notranslate text-amber-500" />
            <span className="truncate">Offer sent</span>
          </div>

          {/* "Withdraw offer" button */}
          <SecondaryButton
            size="details"
            variant="outline"
            icon={RotateCcw}
            isLoading={actionInProgress === myPendingOffer.id}
            onClick={() => onWithdrawOffer(myPendingOffer.id)}
            className="flex-1"
          >
            Withdraw offer
          </SecondaryButton>

          <ShareButton onShare={onShare} />
          <ReportButton onReport={onReport} />
        </div>
      </div>
    );
  }

  // 5. UNVERIFIED VIEWER ("Get verified to help")
  if (!isVerified) {
    return (
      <div className="sticky bottom-0 left-0 right-0 p-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border z-30 shrink-0">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <button
            type="button"
            onClick={onGetVerified}
            style={{ backgroundColor: categoryToken.primary }}
            className="flex-1 h-[52px] rounded-[16px] text-white font-bold text-sm shadow-md hover:brightness-105 active:scale-[0.98] transition-all touch-target flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <ShieldAlert className="h-5 w-5 notranslate shrink-0" />
            <span>Get verified to help</span>
          </button>

          <ShareButton onShare={onShare} />
          <ReportButton onReport={onReport} />
        </div>
      </div>
    );
  }

  // 6. GENERAL VERIFIED HELPER ("Offer help", Share, Report)
  return (
    <div className="sticky bottom-0 left-0 right-0 p-4 sm:px-6 bg-card/95 backdrop-blur-md border-t border-border z-30 shrink-0">
      <div className="flex items-center gap-3 max-w-2xl mx-auto">
        {/* Primary help button: "Offer help", category icon on left, 52px high, radius 16, category colour, soft pressed, single line */}
        <PrimaryHelpButton
          category={request.category}
          size="details"
          label="Offer help"
          onClick={onOfferHelp}
          className="flex-1"
        />

        {/* Share and Report: 48px icon buttons aligned on same row as main button */}
        <ShareButton onShare={onShare} />
        <ReportButton onReport={onReport} />
      </div>
    </div>
  );
}
