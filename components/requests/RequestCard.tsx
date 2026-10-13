'use client';

import React from 'react';
import {
  Droplets,
  Stethoscope,
  Users,
  BookOpen,
  Car,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Atom,
  Navigation,
  HeartHandshake,
} from 'lucide-react';
import { HelpRequest, TravelMode } from '@/lib/data/types';
import { calculateETA, formatETA } from '@/lib/data/physics';

interface RequestCardProps {
  request: HelpRequest;
  travelMode: TravelMode;
  onSelect: (request: HelpRequest) => void;
  onWhyRank: (request: HelpRequest) => void;
  onHelp?: (request: HelpRequest) => void;
}

export function RequestCard({ request, travelMode, onSelect, onWhyRank, onHelp }: RequestCardProps) {
  const etaMinutes = calculateETA(request.distanceKm, travelMode);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'blood':
        return <Droplets className="h-4 w-4 text-rose-500 notranslate" />;
      case 'equipment':
        return <Stethoscope className="h-4 w-4 text-teal-500 notranslate" />;
      case 'elderly':
        return <Users className="h-4 w-4 text-blue-500 notranslate" />;
      case 'books':
        return <BookOpen className="h-4 w-4 text-emerald-500 notranslate" />;
      case 'transport':
        return <Car className="h-4 w-4 text-amber-500 notranslate" />;
      default:
        return <Users className="h-4 w-4 text-primary notranslate" />;
    }
  };

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

  return (
    <div
      onClick={() => onSelect(request)}
      className="group rounded-3xl border border-border/80 dark:border-white/10 bg-card/95 backdrop-blur-xs p-5 shadow-soft hover:-translate-y-0.5 hover:shadow-xl hover:shadow-teal-950/25 hover:border-primary/50 dark:hover:border-primary/60 transition-all duration-200 cursor-pointer text-left flex flex-col justify-between"
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background border border-border/80 shadow-xs group-hover:border-primary/30 transition">
              {getCategoryIcon(request.category)}
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

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onWhyRank(request);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition active:scale-95 touch-target border border-primary/20"
            title="Click to see Help Gravity physics score breakdown"
          >
            <Atom className="h-3.5 w-3.5 notranslate" />
            <span>Score: {request.helpGravityScore}</span>
          </button>
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
      <div className="mt-5 pt-4 border-t border-border/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-1 text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-[180px]">{request.locationName}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Navigation className="h-3 w-3 text-primary notranslate" />
              <span>{request.distanceKm} km ({formatETA(etaMinutes)})</span>
            </span>
            <span className="text-muted-foreground/60">•</span>
            {/* Clear Waiting Time Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted/80 text-[10px] font-bold text-foreground/80 border border-border/60">
              <Clock className="h-3 w-3 text-primary notranslate" />
              <span>waiting {request.waitingMinutes}m</span>
            </span>
          </div>
        </div>

        {/* High-contrast Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(request);
            }}
            className="rounded-xl border border-border/80 bg-background/80 hover:bg-muted px-3 py-2 text-xs font-semibold text-foreground hover:text-primary transition active:scale-95 touch-target shadow-xs"
          >
            Details
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onHelp) {
                onHelp(request);
              } else {
                onSelect(request);
              }
            }}
            className="rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 transition active:scale-95 touch-target flex items-center gap-1.5"
          >
            <HeartHandshake className="h-3.5 w-3.5 notranslate" />
            <span>I Can Help</span>
          </button>
        </div>
      </div>
    </div>
  );
}
