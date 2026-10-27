'use client';

import React, { useState, useEffect, useRef, useId } from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Navigation,
  Bike,
  Footprints,
  Car,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Check,
  Info,
  Lock,
  Radio,
  Flame,
  Droplets,
  Package,
  HeartHandshake,
  BookOpen,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpRequest, TravelMode, HelpCategory, UrgencyLevel } from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { calculateETA, formatETA } from '@/lib/data/distance';
import { OverlayPortal, useBodyScrollLock } from '@/components/ui/OverlayPortal';
import { getCategoryToken } from '@/lib/data/categoryColors';
import dynamic from 'next/dynamic';

const EmergencyStoryCardModal = dynamic(
  () => import('./EmergencyStoryCardModal').then((mod) => mod.EmergencyStoryCardModal),
  { ssr: false }
);

interface HelpFlowModalProps {
  request: HelpRequest | null;
  open: boolean;
  onClose: () => void;
  onHelpSubmitted?: () => void;
}

// Arrival time options
const ARRIVAL_TIME_SLOTS = ['Now', '10 min', '15 min', '30 min', '1 hour'] as const;
type ArrivalTimeSlot = (typeof ARRIVAL_TIME_SLOTS)[number];

// Category Quick Replies per specification
const CATEGORY_QUICK_REPLIES: Record<string, string[]> = {
  blood: [
    'I can reach within 15 minutes',
    'I am ready to donate now',
    'I have donated before',
  ],
  equipment: [
    'I have this item',
    'I can deliver it',
    'You can pick it up',
    'It is clean and in good condition',
  ],
  elderly: [
    'I can come now',
    'I can stay for 2 hours',
    'I have experience with elderly care',
  ],
  books: [
    'I have this book',
    'I can meet nearby',
    'You can keep it',
  ],
  transport: [
    'I have a vehicle ready',
    'I can reach in 10 minutes',
    'I can take a wheelchair',
    'I know the way',
  ],
};

function getCategoryPlaceholder(category: string): string {
  switch (category) {
    case 'blood':
      return 'Let them know your availability, blood group match, or donation readiness...';
    case 'equipment':
      return 'Let them know about item condition, pickup or delivery arrangements...';
    case 'elderly':
      return 'Let them know how you can assist and your available hours...';
    case 'books':
      return 'Let them know when and where you can handover or share the books...';
    case 'transport':
      return 'Let them know your vehicle type, passenger capacity, and route ETA...';
    default:
      return 'Let them know how you can assist and when you can arrive...';
  }
}

function getRequesterFirstName(contactName?: string): string {
  if (!contactName) return 'the requester';
  const parenMatch = contactName.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].trim().split(' ')[0];
  }
  return contactName.trim().split(' ')[0] || 'the requester';
}

function getClosestArrivalSlot(etaMinutes: number): ArrivalTimeSlot {
  if (etaMinutes <= 5) return 'Now';
  if (etaMinutes <= 12) return '10 min';
  if (etaMinutes <= 22) return '15 min';
  if (etaMinutes <= 45) return '30 min';
  return '1 hour';
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function HelpFlowModal({
  request,
  open,
  onClose,
  onHelpSubmitted,
}: HelpFlowModalProps) {
  const {
    userProfile,
    travelMode,
    setTravelMode,
    offerHelp,
    withdrawOffer,
    setCurrentView,
    setProfileActiveTab,
  } = useKindLinkStore();

  const titleId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useBodyScrollLock(open);

  // Form states
  const [message, setMessage] = useState('');
  const [arrivalTime, setArrivalTime] = useState<ArrivalTimeSlot>('10 min');
  const [hasManuallySelectedArrival, setHasManuallySelectedArrival] = useState(false);
  const [shareLiveLocation, setShareLiveLocation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success state
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedOfferId, setSubmittedOfferId] = useState<string | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  // Mobile visual viewport keyboard tracking
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState<number>(0);

  // Calculate live ETA
  const etaMinutes = request ? calculateETA(request.distanceKm, travelMode) : 10;

  // Sync default arrival time with live ETA when modal opens or travel mode changes (unless user manually chose)
  useEffect(() => {
    if (open && !hasManuallySelectedArrival && request) {
      setArrivalTime(getClosestArrivalSlot(etaMinutes));
    }
  }, [open, etaMinutes, hasManuallySelectedArrival, request]);

  // Reset state on modal open / request change
  useEffect(() => {
    if (open) {
      setMessage('');
      setIsSuccess(false);
      setSubmittedOfferId(null);
      setShareLiveLocation(false);
      setHasManuallySelectedArrival(false);
    }
  }, [open, request?.id]);

  // Visual viewport resize & keyboard handling
  useEffect(() => {
    if (!open || typeof window === 'undefined') return;

    const handleViewportChange = () => {
      const vv = window.visualViewport;
      if (!vv) return;
      setViewportHeight(vv.height);
      const kb = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
      setKeyboardOffset(kb);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      window.visualViewport.addEventListener('scroll', handleViewportChange);
      handleViewportChange();
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
      window.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open || !request) return null;

  const requesterName = getRequesterFirstName(request.contactName);
  const isVerified = userProfile?.verificationState === 'verified';

  // Own-request check: users cannot offer help on requests they created
  const isOwnRequest = Boolean(isRequestOwner(request, userProfile));

  // Category token & colors
  const categoryToken = getCategoryToken(request.category);
  const CategoryIcon = categoryToken.icon;

  // Urgency styling
  const urgencyLabel = request.urgency ? request.urgency.toUpperCase() : 'STANDARD';
  const urgencyStyle =
    request.urgency === 'critical'
      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
      : request.urgency === 'high'
      ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
      : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';

  // Quick replies for this category
  const quickReplies = CATEGORY_QUICK_REPLIES[request.category] || CATEGORY_QUICK_REPLIES.equipment;

  // Check if a quick reply is selected in message
  const isQuickReplyActive = (reply: string) => {
    return message.includes(reply);
  };

  // Toggle quick reply on tap
  const handleToggleQuickReply = (reply: string) => {
    if (isQuickReplyActive(reply)) {
      // Remove reply
      let updated = message
        .replace(new RegExp(`(\\s*·\\s*)?${escapeRegex(reply)}(\\s*·\\s*)?`, 'g'), ' ')
        .trim();
      updated = updated.replace(/^\s*·\s*|\s*·\s*$/g, '').trim();
      setMessage(updated);
    } else {
      // Append reply (up to 300 chars)
      let updated = message.trim();
      if (!updated) {
        updated = reply;
      } else {
        updated = `${updated} · ${reply}`;
      }
      if (updated.length <= 300) {
        setMessage(updated);
      } else {
        toast.error('Character limit of 300 reached');
      }
    }
  };

  // Auto-grow textarea handler
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 300) {
      setMessage(val);
    }
    // Auto grow
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  // Scroll textarea into view when focused on mobile keyboard
  const handleTextareaFocus = () => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 200);
  };

  // Redirect to verification
  const handleVerifyRedirect = () => {
    onClose();
    if (setProfileActiveTab) {
      setProfileActiveTab('verification');
    }
    setCurrentView('profile');
    toast.info('Complete Your Identity Verification', {
      description: 'Upload your College or Government Photo ID to unlock volunteer aid offers.',
    });
  };

  // Submit Offer
  const handleSendOffer = async () => {
    if (isOwnRequest) {
      toast.error('You cannot offer help on your own request.');
      return;
    }
    if (!isVerified) {
      handleVerifyRedirect();
      return;
    }

    setIsSubmitting(true);
    try {
      // Construct rich offer message with ETA & location sharing note
      const fullMessage = message.trim() || `I can arrive in ${arrivalTime}.`;
      const enrichedMessage = shareLiveLocation
        ? `${fullMessage} [ETA: ${arrivalTime} | Live GPS sharing enabled]`
        : `${fullMessage} [ETA: ${arrivalTime}]`;

      const result = await offerHelp(request.id, enrichedMessage);

      if (result && result.success === false) {
        toast.error('Could not submit offer', {
          description: result.error || 'Please try again.',
        });
        setIsSubmitting(false);
        return;
      }

      setSubmittedOfferId(result?.offerId || `offer-${Date.now()}`);
      setIsSuccess(true);

      toast.success('Aid Offer Submitted!', {
        description: `We notified ${requesterName}. They will review your offer.`,
      });

      if (onHelpSubmitted) {
        onHelpSubmitted();
      }
    } catch (err: any) {
      toast.error('Failed to submit offer', {
        description: err.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Withdraw Offer from Success State
  const handleWithdrawOffer = async () => {
    if (!submittedOfferId) return;
    setIsWithdrawing(true);
    try {
      await withdrawOffer(submittedOfferId, request.id);
      toast.success('Offer withdrawn successfully');
      setIsSuccess(false);
      onClose();
    } catch (err: any) {
      toast.error('Error withdrawing offer', {
        description: err.message || 'Please try again.',
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Collect key detail chips for the request
  const detailChips: { icon?: React.ReactNode; label: string }[] = [];
  if (request.bloodGroup) {
    detailChips.push({
      icon: <Droplets className="h-3 w-3 text-rose-500 shrink-0 notranslate" />,
      label: `Group: ${request.bloodGroup}`,
    });
  }
  if (request.unitsNeeded) {
    detailChips.push({
      label: `${request.unitsNeeded} ${request.unitsNeeded === 1 ? 'Unit' : 'Units'} needed`,
    });
  }
  if (request.patientAge) {
    detailChips.push({
      label: `Age ${request.patientAge}`,
    });
  }
  if (request.itemType) {
    detailChips.push({
      icon: <Package className="h-3 w-3 text-teal-500 shrink-0 notranslate" />,
      label: request.itemType,
    });
  }
  if (request.wheelchairAccessible) {
    detailChips.push({
      label: 'Wheelchair Accessible',
    });
  }
  if (request.bookTitle) {
    detailChips.push({
      icon: <BookOpen className="h-3 w-3 text-emerald-500 shrink-0 notranslate" />,
      label: request.bookTitle,
    });
  }
  if (request.booksClassSubject) {
    detailChips.push({
      label: request.booksClassSubject,
    });
  }
  if (request.elderlyAidType) {
    detailChips.push({
      icon: <HeartHandshake className="h-3 w-3 text-indigo-500 shrink-0 notranslate" />,
      label: request.elderlyAidType,
    });
  }
  if (request.hospitalName) {
    detailChips.push({
      label: request.hospitalName,
    });
  }

  // Top 2 badges for user card
  const userBadges =
    userProfile?.badges && userProfile.badges.length > 0
      ? userProfile.badges.slice(0, 2)
      : ['Active Helper', 'Rapid Responder'];

  // Button disabled state
  const isFormValid =
    isVerified &&
    !isOwnRequest &&
    Boolean(arrivalTime) &&
    !isSubmitting;

  return (
    <OverlayPortal>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={
          viewportHeight
            ? {
                height: `${viewportHeight}px`,
                transform: keyboardOffset > 0 ? `translateY(-${keyboardOffset}px)` : undefined,
              }
            : undefined
        }
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pt-[max(12px,calc(env(safe-area-inset-top)+12px))] sm:p-4 bg-slate-950/75 backdrop-blur-md transition-all duration-200"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) {
            onClose();
          }
        }}
      >
        {/* Mobile Backdrop dismiss */}
        <div
          className="fixed inset-0 -z-10"
          onClick={() => {
            if (!isSubmitting) onClose();
          }}
          aria-hidden="true"
        />

        {/* Bottom Sheet Container */}
        <div
          ref={containerRef}
          tabIndex={-1}
          style={
            viewportHeight
              ? {
                  maxHeight: `${viewportHeight - 20}px`,
                }
              : undefined
          }
          className="relative w-full sm:max-w-xl h-auto max-h-[85dvh] flex flex-col bg-card text-card-foreground rounded-t-3xl sm:rounded-3xl border-t sm:border border-border/80 shadow-[0_20px_60px_rgba(0,0,0,0.4)] overflow-hidden outline-none animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
          onClick={(e) => e.stopPropagation()}
        >
          {/* =====================================================================
              1. STICKY TITLE BAR (Solid bg-card with Integrated Drag Handle)
             ===================================================================== */}
          <div className="sticky top-0 z-20 shrink-0 bg-card border-b border-border/80">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
            <div className="px-4 sm:px-6 pb-3.5 pt-0.5 sm:pt-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs"
                  style={{
                    backgroundColor: categoryToken.lightBg,
                    color: categoryToken.primary,
                    borderColor: categoryToken.border,
                  }}
                >
                  <CategoryIcon className="h-5 w-5 notranslate" />
                </div>
                <div className="min-w-0">
                  <h2 id={titleId} className="text-base sm:text-lg font-black text-foreground truncate">
                    Offer to help
                  </h2>
                  <p className="text-[11px] text-muted-foreground truncate">
                    Responding to <span className="font-semibold text-foreground">{requesterName}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground touch-target transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close"
              >
                <X className="h-5 w-5 notranslate" />
              </button>
            </div>
          </div>

          {/* =====================================================================
              SCROLLING MIDDLE CONTENT
             ===================================================================== */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-4">
            {/* SUCCESS STATE VIEW */}
            {isSuccess ? (
              <div className="py-6 space-y-5 text-center animate-in fade-in zoom-in-95 duration-200">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mx-auto ring-8 ring-emerald-500/10">
                  <CheckCircle2 className="h-9 w-9 notranslate" />
                </div>

                <div className="space-y-1.5 max-w-sm mx-auto">
                  <h3 className="text-lg sm:text-xl font-black text-foreground">
                    Offer Sent Successfully!
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    We will notify you the moment <strong className="text-foreground">{requesterName}</strong> accepts. Phone and live coordination unlock upon acceptance.
                  </p>
                </div>

                {/* Offer Summary Card */}
                <div className="p-4 rounded-2xl bg-muted/50 border border-border/80 text-left space-y-2 max-w-md mx-auto text-xs">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Target ETA</span>
                    <strong className="text-foreground font-bold">{arrivalTime}</strong>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Live GPS Tracking</span>
                    <strong className="text-foreground font-bold">
                      {shareLiveLocation ? 'Enabled (starts on accept)' : 'Disabled'}
                    </strong>
                  </div>
                  {message.trim() && (
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[11px] text-muted-foreground block mb-0.5">Your Note:</span>
                      <p className="text-foreground italic bg-background/80 p-2 rounded-xl border border-border/60">
                        &ldquo;{message.trim()}&rdquo;
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col gap-2.5 max-w-md mx-auto w-full">
                  <button
                    type="button"
                    onClick={() => setStoryModalOpen(true)}
                    style={{ backgroundColor: categoryToken.primary }}
                    className="w-full py-3.5 px-5 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-md hover:brightness-105 transition-all active:scale-95 touch-target flex items-center justify-center gap-2"
                  >
                    <Share2 className="h-4 w-4 notranslate shrink-0" />
                    <span>Share Emergency Story Card (Status &amp; Stories)</span>
                  </button>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 w-full">
                    <button
                      type="button"
                      onClick={onClose}
                      className="w-full sm:flex-1 py-3 px-5 rounded-2xl bg-muted hover:bg-muted/80 text-foreground font-bold text-xs sm:text-sm border border-border/80 transition-all active:scale-95 touch-target"
                    >
                      Back to Request
                    </button>

                    <button
                      type="button"
                      onClick={handleWithdrawOffer}
                      disabled={isWithdrawing}
                      className="w-full sm:w-auto py-3 px-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/15 font-bold text-xs transition-all active:scale-95 touch-target flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      {isWithdrawing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin notranslate" />
                      ) : (
                        <RotateCcw className="h-3.5 w-3.5 notranslate" />
                      )}
                      <span>Withdraw offer</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* 2. COMPACT REQUEST SUMMARY CARD */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3 shadow-xs">
                  {/* Category Chip & Urgency Badge */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border"
                      style={{
                        backgroundColor: categoryToken.lightBg,
                        color: categoryToken.text,
                        borderColor: categoryToken.border,
                      }}
                    >
                      <CategoryIcon className="h-3.5 w-3.5 notranslate shrink-0" />
                      <span>{categoryToken.name}</span>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${urgencyStyle}`}
                    >
                      <Flame className="h-3 w-3 notranslate shrink-0" />
                      <span>{urgencyLabel}</span>
                    </span>
                  </div>

                  {/* Title (up to 2 lines) */}
                  <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-2 leading-snug">
                    {request.title}
                  </h3>

                  {/* Key Detail Chips */}
                  {detailChips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {detailChips.map((chip, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-card border border-border/80 text-[11px] font-semibold text-foreground"
                        >
                          {chip.icon}
                          <span>{chip.label}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Live Distance & ETA with Bike, Walking, Car Segmented Control */}
                  <div className="pt-2 border-t border-border/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <Navigation className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
                        <span>Distance: {request.distanceKm} km away</span>
                      </span>
                      <span className="font-black text-primary text-xs sm:text-sm">
                        ETA: {formatETA(etaMinutes)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-background/80 dark:bg-slate-900/60 rounded-xl border border-border/60">
                      {(['bike', 'walking', 'car'] as TravelMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setTravelMode(mode)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg text-xs transition-all active:scale-95 touch-target ${
                            travelMode === mode
                              ? 'bg-card text-foreground font-black shadow-xs ring-1 ring-border'
                              : 'text-muted-foreground hover:text-foreground font-medium'
                          }`}
                        >
                          {mode === 'bike' && <Bike className="h-3.5 w-3.5 notranslate" />}
                          {mode === 'walking' && <Footprints className="h-3.5 w-3.5 notranslate" />}
                          {mode === 'car' && <Car className="h-3.5 w-3.5 notranslate" />}
                          <span className="capitalize">{mode}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* OWN REQUEST GUARD WARNING */}
                {isOwnRequest && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs sm:text-sm">
                      <AlertTriangle className="h-4 w-4 shrink-0 notranslate" />
                      <span>This is your own request</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      You cannot offer help on a request you authored yourself. Open the request in your profile or activity tab to view incoming volunteer offers.
                    </p>
                  </div>
                )}

                {/* 3. VERIFICATION GUARD OR "YOU ARE OFFERING AS" CARD */}
                {!isVerified ? (
                  <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                      <ShieldAlert className="h-5 w-5 shrink-0 notranslate" />
                      <span>Get Verified to Help</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      To safeguard patients and families in our community, only verified volunteers can submit aid offers. Verification takes only 2 minutes by uploading your Student or Government ID.
                    </p>
                    <button
                      type="button"
                      onClick={handleVerifyRedirect}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all active:scale-95 shadow-xs"
                    >
                      <ShieldCheck className="h-4 w-4 notranslate" />
                      <span>Get Verified in Profile</span>
                    </button>
                  </div>
                ) : (
                  /* "You are offering as" Card */
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-card border border-border/80 space-y-3 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Avatar */}
                        {userProfile.avatarUrl ? (
                          <img
                            src={userProfile.avatarUrl}
                            alt={userProfile.name}
                            className="h-11 w-11 rounded-full object-cover ring-2 ring-emerald-500/30 shrink-0"
                          />
                        ) : (
                          <div className="h-11 w-11 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-black text-sm shrink-0">
                            {userProfile.name
                              ? userProfile.name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join('')
                                  .toUpperCase()
                              : 'V'}
                          </div>
                        )}

                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                            You are offering as
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-foreground truncate">
                              {userProfile.displayName || userProfile.name}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                              <ShieldCheck className="h-3 w-3 notranslate" />
                              <span>Verified</span>
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-foreground">
                              ⭐ {userProfile.rating ? userProfile.rating.toFixed(1) : '5.0'}
                            </span>
                            <span>•</span>
                            <span>{userProfile.helpsCount || 0} helps</span>
                          </div>
                        </div>
                      </div>

                      {/* Top 2 Badges */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {userBadges.map((badge, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted/80 text-muted-foreground border border-border/80"
                          >
                            <Sparkles className="h-2.5 w-2.5 text-primary notranslate" />
                            <span className="truncate max-w-[100px]">{badge}</span>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Reassuring privacy note */}
                    <div className="pt-2 border-t border-border/60 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0 notranslate" />
                      <span>Your phone number is shared only if the requester accepts.</span>
                    </div>
                  </div>
                )}

                {/* 4. AUTO-GROWING MESSAGE BOX & CATEGORY QUICK REPLIES */}
                {!isOwnRequest && isVerified && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="help-flow-message" className="font-bold text-foreground">
                        Message to {requesterName}
                      </label>
                      <span
                        className={`text-[11px] font-mono ${
                          message.length > 280 ? 'text-rose-500 font-bold' : 'text-muted-foreground'
                        }`}
                      >
                        {message.length} / 300
                      </span>
                    </div>

                    <textarea
                      id="help-flow-message"
                      ref={textareaRef}
                      rows={2}
                      value={message}
                      onChange={handleTextareaChange}
                      onFocus={handleTextareaFocus}
                      placeholder={getCategoryPlaceholder(request.category)}
                      className="w-full resize-none p-3.5 rounded-2xl border border-border/80 bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed shadow-inner"
                    />

                    {/* Quick Reply Chips (36-40px high, wrapping, checkmark when selected) */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                        Quick Replies
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {quickReplies.map((reply) => {
                          const active = isQuickReplyActive(reply);
                          return (
                            <button
                              key={reply}
                              type="button"
                              onClick={() => handleToggleQuickReply(reply)}
                              className={`min-h-[36px] sm:min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all active:scale-95 touch-target flex items-center gap-1.5 text-left ${
                                active
                                  ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                                  : 'border-border/80 bg-card text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/60'
                              }`}
                            >
                              {active && <Check className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />}
                              <span>{reply}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Blood Category Gentle Note */}
                      {request.category === 'blood' && (
                        <div className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-medium pt-1">
                          <Info className="h-3.5 w-3.5 shrink-0 notranslate" />
                          <span>Please follow the hospital&apos;s donation rules.</span>
                        </div>
                      )}
                    </div>

                    {/* 5. ARRIVAL TIME & LIVE LOCATION SHARING */}
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                      {/* Arrival Time Selector */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-foreground flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
                            <span>When can you arrive?</span>
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium">
                            Default based on ETA
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5">
                          {ARRIVAL_TIME_SLOTS.map((slot) => {
                            const isSelected = arrivalTime === slot;
                            return (
                              <button
                                key={slot}
                                type="button"
                                onClick={() => {
                                  setArrivalTime(slot);
                                  setHasManuallySelectedArrival(true);
                                }}
                                className={`h-9 sm:h-10 rounded-xl text-xs font-bold transition-all active:scale-95 touch-target flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-card text-muted-foreground hover:text-foreground border border-border/80 hover:bg-muted'
                                }`}
                              >
                                {slot}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional Live Location Switch */}
                      <div className="pt-2 border-t border-border/60">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5 min-w-0">
                            <label
                              htmlFor="live-location-toggle"
                              className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer"
                            >
                              <Radio
                                className={`h-3.5 w-3.5 notranslate ${
                                  shareLiveLocation ? 'text-emerald-500 animate-pulse' : 'text-muted-foreground'
                                }`}
                              />
                              <span>Share my live location with them while on the way</span>
                            </label>
                            <p className="text-[11px] text-muted-foreground leading-relaxed">
                              Real-time GPS tracking starts only after {requesterName} accepts your offer.
                            </p>
                          </div>

                          <button
                            id="live-location-toggle"
                            type="button"
                            role="switch"
                            aria-checked={shareLiveLocation}
                            onClick={() => setShareLiveLocation(!shareLiveLocation)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                              shareLiveLocation ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                shareLiveLocation ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* =====================================================================
              STICKY FOOTER WITH PRIMARY "SEND OFFER" BUTTON (52px, CATEGORY COLOUR)
             ===================================================================== */}
          {!isSuccess && (
            <div className="sticky bottom-0 z-20 shrink-0 bg-card border-t border-border/80 px-4 sm:px-6 py-3 pb-[max(12px,calc(env(safe-area-inset-bottom,0px)+12px))] shadow-lg flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-[52px] px-4 rounded-2xl border border-border/80 bg-card hover:bg-muted text-xs font-bold text-foreground transition-all active:scale-95 touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSendOffer}
                disabled={!isFormValid}
                style={{
                  backgroundColor: isFormValid ? categoryToken.primary : undefined,
                }}
                className={`flex-1 h-[52px] min-h-[52px] rounded-2xl px-5 text-sm font-bold text-white transition-all active:scale-95 touch-target flex items-center justify-center gap-2 truncate shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  !isFormValid ? 'bg-muted-foreground/40 text-muted-foreground' : ''
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin shrink-0 notranslate" />
                    <span>Sending offer...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 shrink-0 notranslate" />
                    <span className="truncate">Send offer to {requesterName}</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Story Card Modal */}
      {storyModalOpen && (
        <EmergencyStoryCardModal
          request={request}
          open={storyModalOpen}
          onClose={() => setStoryModalOpen(false)}
        />
      )}
    </OverlayPortal>
  );
}
