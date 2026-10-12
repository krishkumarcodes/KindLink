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
} from 'lucide-react';
import { HelpRequest, TravelMode } from '@/lib/data/types';
import { calculateETA, formatETA } from '@/lib/data/physics';

interface RequestCardProps {
  request: HelpRequest;
  travelMode: TravelMode;
  onSelect: (request: HelpRequest) => void;
  onWhyRank: (request: HelpRequest) => void;
}

export function RequestCard({ request, travelMode, onSelect, onWhyRank }: RequestCardProps) {
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
        return 'bg-urgency-critical/10 text-urgency-critical border-urgency-critical/20';
      case 'high':
        return 'bg-urgency-high/10 text-urgency-high border-urgency-high/20';
      case 'medium':
        return 'bg-urgency-medium/10 text-urgency-medium border-urgency-medium/20';
      default:
        return 'bg-urgency-low/10 text-urgency-low border-urgency-low/20';
    }
  };

  return (
    <div
      onClick={() => onSelect(request)}
      className="group rounded-3xl border border-border bg-card p-5 shadow-soft hover:shadow-md hover:border-primary/50 transition cursor-pointer text-left flex flex-col justify-between"
    >
      <div>
        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background border border-border shadow-xs">
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
            onClick={(e) => {
              e.stopPropagation();
              onWhyRank(request);
            }}
            className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-full transition touch-target"
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
            <span className="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold">
              🩸 {request.bloodGroup} ({request.unitsNeeded || 1} units)
            </span>
          )}
          {request.itemType && (
            <span className="px-2.5 py-1 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
              🩺 {request.itemType}
            </span>
          )}
          {request.verified && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
              <ShieldCheck className="h-3.5 w-3.5 notranslate" />
              <span>{request.verificationBadge}</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer Info Row */}
      <div className="mt-5 pt-4 border-t border-border flex items-center justify-between text-xs">
        <div className="space-y-1 text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium">
            <MapPin className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
            <span className="truncate max-w-[150px] sm:max-w-[200px]">{request.locationName}</span>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-foreground">
              <Navigation className="h-3 w-3 text-primary notranslate" />
              <span>{request.distanceKm} km ({formatETA(etaMinutes)})</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 notranslate" />
              <span>waiting {request.waitingMinutes}m</span>
            </span>
          </div>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(request);
          }}
          className="rounded-2xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-soft hover:bg-primary/90 transition active:scale-95 touch-target"
        >
          Help
        </button>
      </div>
    </div>
  );
}
