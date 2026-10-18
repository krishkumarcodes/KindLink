'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  CheckCircle2,
  X,
  Shield,
  Star,
  Users,
} from 'lucide-react';
import { HelpRequest } from '@/lib/data/types';
import { OverlayPortal } from '@/components/ui/OverlayPortal';

export interface EndorsementChipProps {
  request: HelpRequest;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function EndorsementChip({ request, size = 'md', className = '' }: EndorsementChipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const isEndorsed = Boolean(
    request.isOrganizationEndorsed ||
    (request.endorsementsCount && request.endorsementsCount > 0)
  );

  if (!isEndorsed) return null;

  const count = request.endorsementsCount || request.endorsedByOrgNames?.length || 1;
  const orgNames =
    request.endorsedByOrgNames && request.endorsedByOrgNames.length > 0
      ? request.endorsedByOrgNames
      : ['KindLink Verified Community Partner'];

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1 rounded-lg'
      : size === 'lg'
      ? 'px-3 py-1.5 text-xs sm:text-sm gap-1.5 rounded-2xl'
      : 'px-2.5 py-1 text-xs gap-1.5 rounded-xl';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center font-extrabold tracking-wide bg-gradient-to-r from-indigo-500/15 via-violet-500/15 to-purple-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500 hover:bg-indigo-500/25 active:scale-95 shadow-2xs transition-all cursor-pointer touch-target ${sizeClasses} ${className}`}
        title={`Endorsed by ${count} verified community organization${count > 1 ? 's' : ''}`}
        aria-label={`NGO Endorsed: click to see endorsing organizations`}
      >
        <span className="text-amber-500 notranslate shrink-0" aria-hidden="true">★</span>
        <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 notranslate" />
        <span className="whitespace-nowrap">
          NGO Endorsed{count > 1 ? ` (${count})` : ''}
        </span>
      </button>

      {/* Endorsements Popover / Modal */}
      {isOpen && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            aria-modal="true"
            role="dialog"
          >
            <div
              className="relative w-full max-w-sm rounded-3xl bg-card border border-border/80 shadow-2xl p-6 text-card-foreground space-y-4 overflow-hidden animate-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative top accent */}
              <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-transparent blur-xl" />

              {/* Close Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                aria-label="Close endorsement details"
              >
                <X className="h-4 w-4 notranslate" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 pr-6">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                  <ShieldCheck className="h-5 w-5 notranslate text-emerald-300" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-foreground leading-tight">
                    NGO Endorsed Request
                  </h4>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    Verified by community organizations
                  </p>
                </div>
              </div>

              {/* Endorsing Organizations List */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Endorsed by:
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto overscroll-contain pr-1">
                  {orgNames.map((name, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-foreground"
                    >
                      <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 notranslate" />
                      <span className="flex-1 min-w-0 truncate">{name}</span>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 notranslate" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust Guarantee Note */}
              <div className="p-3 rounded-2xl bg-muted/50 border border-border/70 text-[11px] text-muted-foreground flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5 notranslate" />
                <p className="leading-relaxed">
                  Endorsing organizations vouch for the critical authenticity of this need and assist in rapid volunteer coordination across the Asansol community.
                </p>
              </div>

              {/* Action */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="w-full h-10 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-soft transition active:scale-[0.98]"
              >
                Got it
              </button>
            </div>
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
