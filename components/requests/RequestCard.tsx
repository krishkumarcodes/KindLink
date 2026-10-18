'use client';

import React from 'react';
import {
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Navigation,
  User,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpRequest, TravelMode } from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { calculateETA, formatETA } from '@/lib/data/distance';
import { formatWaitingDuration } from '@/lib/utils/formatTime';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { PrimaryHelpButton, SecondaryButton } from './ActionButtons';

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
      className="group rounded-3xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-xs p-5 shadow-soft hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-950/25 hover:border-primary/50 dark:hover:border-primary/60 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between"
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-background border shadow-xs group-hover:border-primary/30 transition"
              style={{ borderColor: categoryToken.border }}
            >
              <CategoryIcon
                className="h-4 w-4 notranslate"
                style={{ color: categoryToken.primary }}
              />
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border ${getUrgencyBadge(
                request.urgency
              )}`}
            >
              <AlertTriangle className="h-3 w-3 notranslate" />
              <span>{request.urgency}</span>
            </span>
          </div>

          {/* Owner Badge */}
          {isUserOwner && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/25 shadow-xs shrink-0">
              <User className="h-3 w-3 notranslate" />
              <span>Your request</span>
            </span>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-bold text-foreground group-hover:text-primary transition line-clamp-2">
          {request.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
          {request.description}
        </p>

        {/* Dynamic Detail Tag */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {request.bloodGroup && (
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20">
              🩸 {request.bloodGroup} ({request.unitsNeeded || 1} units)
            </span>
          )}
          {request.itemType && (
            <span className="px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold border border-teal-500/20">
              🩺 {request.itemType}
            </span>
          )}
          {request.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5 notranslate" />
              <span>{request.verificationBadge}</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="mt-5 pt-4 border-t border-border/80 flex flex-col gap-3 text-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          {/* Location text wraps cleanly to 2 lines without premature truncation */}
          <div className="flex items-start gap-1.5 font-medium min-w-0">
            <MapPin className="h-3.5 w-3.5 text-primary notranslate shrink-0 mt-0.5" />
            <span className="line-clamp-2 break-words leading-snug text-foreground/90 font-medium">
              {request.locationName}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] flex-wrap shrink-0">
            <span className="flex items-center gap-1 font-semibold text-foreground whitespace-nowrap">
              <Navigation className="h-3 w-3 text-primary notranslate shrink-0" />
              <span>{request.distanceKm} km ({formatETA(etaMinutes)})</span>
            </span>
            <span className="text-muted-foreground/60">•</span>
            {/* Clear Human Waiting Time Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/80 text-[10px] font-bold text-foreground/80 border border-border/60 whitespace-nowrap">
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
                className="w-full min-h-[44px] rounded-[16px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 touch-target"
              >
                <CheckCircle2 className="h-4 w-4 notranslate" />
                <span>Mark Completed</span>
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
          )}
        </div>
      </div>
    </div>
  );
}
