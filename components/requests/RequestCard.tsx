'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Navigation,
  User,
  XCircle,
  CheckCircle2,
  Share2,
  HeartHandshake,
  Radio,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpRequest, TravelMode } from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { calculateETA, formatETA } from '@/lib/data/distance';
import { formatWaitingDuration } from '@/lib/utils/formatTime';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { CategoryEmblem } from '@/components/categories/CategoryEmblem';
import { PrimaryHelpButton, SecondaryButton } from './ActionButtons';
import { EndorsementChip } from './EndorsementChip';

const EmergencyStoryCardModal = dynamic(
  () => import('./EmergencyStoryCardModal').then((mod) => mod.EmergencyStoryCardModal),
  { ssr: false }
);

export interface RequestCardProps {
  request: HelpRequest;
  travelMode: TravelMode;
  onSelect: (request: HelpRequest) => void;
  onWhyRank?: (request: HelpRequest) => void;
  onHelp?: (request: HelpRequest) => void;
  onCancel?: (request: HelpRequest) => void;
  isOwner?: boolean;
}

export function RequestCard({
  request,
  travelMode,
  onSelect,
  onHelp,
  onCancel,
  isOwner: isOwnerProp,
}: RequestCardProps) {
  const { userProfile, fetchLiveRequests, completeRequest } = useKindLinkStore();
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const etaMinutes = calculateETA(request.distanceKm, travelMode);
  const categoryToken = getCategoryToken(request.category);
  const CategoryIcon = categoryToken.icon;

  // Determine if current user is the owner of this request
  const isUserOwner =
    isOwnerProp !== undefined
      ? isOwnerProp
      : isRequestOwner(request, userProfile);

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'bg-gradient-to-r from-rose-500/15 to-red-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 shadow-xs';
      case 'high':
        return 'bg-gradient-to-r from-amber-500/15 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs';
      case 'medium':
        return 'bg-gradient-to-r from-blue-500/15 to-sky-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 shadow-xs';
      default:
        return 'bg-gradient-to-r from-slate-500/15 to-zinc-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30 shadow-xs';
    }
  };

  const renderStatusBadge = () => {
    switch (request.status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-xs">
            <CheckCircle2 className="h-3 w-3 notranslate" />
            <span>Completed</span>
          </span>
        );
      case 'arrived':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 shadow-xs animate-pulse">
            <MapPin className="h-3 w-3 notranslate" />
            <span>Arrived</span>
          </span>
        );
      case 'on_the_way':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-xs">
            <Navigation className="h-3 w-3 notranslate" />
            <span>On the way</span>
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 shadow-xs">
            <Clock className="h-3 w-3 notranslate" />
            <span>In Progress</span>
          </span>
        );
      case 'offered': {
        const offersCount = request.helpersOffered || 1;
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-xs">
            <HeartHandshake className="h-3 w-3 notranslate" />
            <span>{offersCount} {offersCount === 1 ? 'offer' : 'offers'}</span>
          </span>
        );
      }
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/25 shadow-xs">
            <XCircle className="h-3 w-3 notranslate" />
            <span>Cancelled</span>
          </span>
        );
      case 'open':
      default: {
        if (request.helpersOffered && request.helpersOffered > 0) {
          const count = request.helpersOffered;
          return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 shadow-xs">
              <HeartHandshake className="h-3 w-3 notranslate" />
              <span>{count} {count === 1 ? 'offer' : 'offers'}</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 shadow-xs">
            <Radio className="h-3 w-3 notranslate" />
            <span>Open</span>
          </span>
        );
      }
    }
  };

  const handleCancelClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCancel) {
      onCancel(request);
      return;
    }
    const confirmed = window.confirm('Are you sure you want to cancel this request?');
    if (!confirmed) return;
    try {
      const res = await dataAdapter.cancelRequest(request.id);
      if (res.success) {
        toast.success('Request cancelled successfully');
        if (fetchLiveRequests) {
          fetchLiveRequests();
        }
      } else {
        toast.error(res.error || 'Failed to cancel request');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error cancelling request');
    }
  };

  return (
    <div
      onClick={() => onSelect(request)}
      className="group relative overflow-hidden rounded-3xl border border-white/40 dark:border-white/12 bg-card/85 dark:bg-card/75 backdrop-blur-md p-5 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 cursor-pointer text-left flex flex-col justify-between"
    >
      {/* Specular top rim highlight */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent z-10"
        aria-hidden="true"
      />

      {/* Translucent watery caustic ambient tint */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-primary/[0.04] dark:from-white/[0.06] dark:via-transparent dark:to-primary/[0.05] z-0"
        aria-hidden="true"
      />

      {/* Watery crystal sheen light sweep */}
      <div
        className="crystal-card-sheen crystal-card-ambient-sheen"
        aria-hidden="true"
      />

      {/* Ambient crystal corner refraction */}
      <div
        className="pointer-events-none absolute -top-14 -right-14 w-36 h-36 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500 ease-out z-0 opacity-25 dark:opacity-30"
        style={{
          background: `radial-gradient(circle, ${categoryToken.glow} 0%, transparent 70%)`,
        }}
        aria-hidden="true"
      />

      {/* Card Content (Relative z-10 for touch interactions and zero overlap) */}
      <div className="relative z-10">
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Subtle ambient radial glow behind CategoryEmblem */}
            <div className="relative shrink-0">
              <div
                className="pointer-events-none absolute -inset-1.5 rounded-full blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-300"
                style={{ backgroundColor: categoryToken.primary }}
                aria-hidden="true"
              />
              <CategoryEmblem
                category={request.category}
                customLabel={request.customCategoryLabel}
                size="sm"
                glow={true}
              />
            </div>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border backdrop-blur-xs ${getUrgencyBadge(
                request.urgency
              )}`}
            >
              <AlertTriangle className="h-3 w-3 notranslate" />
              <span>{request.urgency}</span>
            </span>
            {renderStatusBadge()}
          </div>

          {/* Header Actions: Owner Badge & Story Card Share */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isUserOwner && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 shadow-xs shrink-0">
                <User className="h-3 w-3 notranslate" />
                <span>Your request</span>
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStoryModalOpen(true);
              }}
              className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-muted/80 transition-all active:scale-95 border border-border/60 dark:border-white/10 bg-background/60 backdrop-blur-xs shadow-2xs"
              title="Share Story Card (WhatsApp Status / Instagram Story)"
              aria-label="Share Story Card"
            >
              <Share2 className="h-4 w-4 notranslate" />
            </button>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2 leading-snug">
          {request.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
          {request.description}
        </p>

        {/* Dynamic Detail Tag */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {request.bloodGroup && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/25 shadow-2xs backdrop-blur-xs">
              <span>🩸</span>
              <span>{request.bloodGroup}</span>
              <span className="text-[10px] opacity-80 font-semibold">({request.unitsNeeded || 1} {request.unitsNeeded === 1 ? 'unit' : 'units'})</span>
            </span>
          )}
          {request.itemType && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/25 shadow-2xs backdrop-blur-xs">
              <span>🩺</span>
              <span>{request.itemType}</span>
            </span>
          )}
          {request.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/25 shadow-2xs backdrop-blur-xs">
              <ShieldCheck className="h-3.5 w-3.5 notranslate" />
              <span>{request.verificationBadge}</span>
            </span>
          )}
          <EndorsementChip request={request} />
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="relative z-10 mt-5 pt-4 border-t border-border/80 dark:border-white/10 flex flex-col gap-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Location text wraps cleanly to 2 lines without premature truncation */}
          <div className="flex items-start gap-1.5 font-medium min-w-0">
            <MapPin className="h-3.5 w-3.5 text-primary notranslate shrink-0 mt-0.5" />
            <span className="line-clamp-2 break-words leading-snug text-foreground/90 font-medium">
              {request.locationName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] flex-wrap shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/60 dark:bg-muted/40 font-semibold text-foreground border border-border/60 text-[11px] whitespace-nowrap shadow-2xs backdrop-blur-xs">
              <Navigation className="h-3 w-3 text-primary notranslate shrink-0" />
              <span>{request.distanceKm} km ({formatETA(etaMinutes)})</span>
            </span>
            <span className="text-muted-foreground/60">•</span>
            {/* Clear Human Waiting Time Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/80 dark:bg-muted/50 text-[11px] font-bold text-foreground/85 border border-border/70 dark:border-white/10 whitespace-nowrap shadow-2xs backdrop-blur-xs">
              <Clock className="h-3 w-3 text-primary notranslate shrink-0" />
              <span>{formatWaitingDuration(request.waitingMinutes, request.createdAt)}</span>
            </span>
          </div>
        </div>

        {/* Aligned button row: Details on left, category-coloured primary button on right (equal 44px height, radius 16, stacked on narrow screens) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full pt-1">
          <SecondaryButton
            size="card"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(request);
            }}
            className="w-full"
          >
            Details
          </SecondaryButton>

          {isUserOwner ? (
            /* Owner actions */
            request.status === 'cancelled' ? (
              <SecondaryButton
                size="card"
                disabled
                className="w-full"
              >
                Cancelled
              </SecondaryButton>
            ) : request.status === 'completed' ? (
              <SecondaryButton
                size="card"
                disabled
                className="w-full text-emerald-600 dark:text-emerald-400"
              >
                Completed
              </SecondaryButton>
            ) : (request.status === 'accepted' || request.status === 'on_the_way' || request.status === 'arrived') ? (
              <button
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await completeRequest(request.id);
                    toast.success('Request marked as completed!');
                  } catch (err: any) {
                    toast.error(err?.message || 'Failed to complete request');
                  }
                }}
                className="relative overflow-hidden w-full h-[44px] min-h-[44px] rounded-[16px] bg-gradient-to-r from-emerald-500 via-emerald-600 to-green-600 hover:brightness-105 text-white font-bold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 touch-target"
              >
                {/* Specular top rim highlight */}
                <span
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/70 to-transparent z-10"
                  aria-hidden="true"
                />
                <CheckCircle2 className="h-4 w-4 notranslate relative z-10" />
                <span className="relative z-10">Mark Completed</span>
              </button>
            ) : (
              <SecondaryButton
                size="card"
                variant="destructive-outline"
                icon={XCircle}
                onClick={handleCancelClick}
                className="w-full"
              >
                Cancel Request
              </SecondaryButton>
            )
          ) : (
            /* Non-owner actions */
            request.status === 'completed' ? (
              <SecondaryButton
                size="card"
                disabled
                className="w-full text-emerald-600 dark:text-emerald-400 font-bold"
              >
                Completed
              </SecondaryButton>
            ) : request.status === 'cancelled' ? (
              <SecondaryButton
                size="card"
                disabled
                className="w-full"
              >
                Cancelled
              </SecondaryButton>
            ) : (request.status === 'accepted' || request.status === 'on_the_way' || request.status === 'arrived') ? (
              userProfile?.id && request.acceptedHelperId === userProfile.id ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(request);
                  }}
                  className="relative overflow-hidden w-full h-[44px] min-h-[44px] rounded-[16px] bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:brightness-105 text-white font-bold text-xs shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_4px_14px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 touch-target"
                >
                  <Navigation className="h-4 w-4 notranslate relative z-10" />
                  <span className="relative z-10">Active Transit</span>
                </button>
              ) : (
                <SecondaryButton
                  size="card"
                  disabled
                  className="w-full text-muted-foreground font-semibold"
                >
                  In Progress (Taken)
                </SecondaryButton>
              )
            ) : (
              /* Volunteer Help button: category-coloured primary button (44px, radius 16, category icon on left, single line) */
              <PrimaryHelpButton
                category={request.category}
                size="card"
                label="I can help"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onHelp) {
                    onHelp(request);
                  } else {
                    onSelect(request);
                  }
                }}
                className="w-full"
              />
            )
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
    </div>
  );
}
