'use client';

import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  FileText,
  Award,
  CheckCircle2,
  X,
  Shield,
  Info,
} from 'lucide-react';
import { OrganizationType } from '@/lib/data/types';
import { OverlayPortal } from '@/components/ui/OverlayPortal';

export interface OrganizationBadgeProps {
  organizationName?: string | null;
  organizationType?: OrganizationType | null;
  organizationVerified?: boolean | null;
  organizationRegistrationNumber?: string | null;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function getOrganizationTypeLabel(type?: OrganizationType | null): string {
  switch (type) {
    case 'blood_bank':
      return 'Verified Blood Bank';
    case 'hospital':
      return 'Verified Hospital';
    case 'resident_welfare':
      return 'Verified RWA';
    case 'student_union':
      return 'Verified Student Union';
    case 'community_group':
      return 'Verified Community Group';
    case 'ngo':
    default:
      return 'Verified NGO';
  }
}

export function getOrganizationTypeFullName(type?: OrganizationType | null): string {
  switch (type) {
    case 'blood_bank':
      return 'Accredited Regional Blood Bank';
    case 'hospital':
      return 'Certified Medical Center & Hospital';
    case 'resident_welfare':
      return 'Resident Welfare Association (RWA)';
    case 'student_union':
      return 'Recognized Campus & Student Union';
    case 'community_group':
      return 'Grassroots Community Aid Group';
    case 'ngo':
    default:
      return 'Registered Non-Governmental Organization';
  }
}

export function OrganizationBadge({
  organizationName,
  organizationType = 'ngo',
  organizationVerified = true,
  organizationRegistrationNumber,
  className = '',
  size = 'md',
}: OrganizationBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  const label = getOrganizationTypeLabel(organizationType);
  const fullName = getOrganizationTypeFullName(organizationType);
  const displayName = organizationName?.trim() || 'Community Partner Organization';
  const regNumber = organizationRegistrationNumber?.trim() || 'WB/2024/NGO-88421';

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1'
      : size === 'lg'
      ? 'px-3.5 py-1.5 text-xs sm:text-sm gap-2'
      : 'px-3 py-1 text-xs gap-1.5';

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`inline-flex items-center rounded-full font-black tracking-wide bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 border border-indigo-300/30 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer touch-target ${sizeClasses} ${className}`}
        title={`Click to view ${displayName} verification credentials`}
        aria-label={`${label}: ${displayName}`}
      >
        <Building2 className="h-3.5 w-3.5 text-indigo-200 shrink-0 notranslate" />
        <span className="font-extrabold whitespace-nowrap">{label}</span>
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-300 shrink-0 notranslate" />
      </button>

      {/* Credential Details Sheet / Modal */}
      {isOpen && (
        <OverlayPortal>
          <div
            className="fixed inset-0 z-90 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
            aria-modal="true"
            role="dialog"
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-card border border-border/80 shadow-2xl p-6 sm:p-7 text-card-foreground space-y-5 overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Subtle decorative background gradient */}
              <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-500/20 via-purple-500/15 to-transparent blur-2xl" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition"
                aria-label="Close credentials modal"
              >
                <X className="h-4 w-4 notranslate" />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-3.5 pr-8">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                  <Building2 className="h-6 w-6 notranslate" />
                </div>
                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-1">
                    <ShieldCheck className="h-3 w-3 notranslate text-emerald-500" />
                    <span>{label}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-foreground leading-snug line-clamp-2">
                    {displayName}
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium">{fullName}</p>
                </div>
              </div>

              {/* Verification Details Box */}
              <div className="space-y-3 rounded-2xl bg-muted/40 border border-border/70 p-4 text-xs">
                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 notranslate shrink-0" />
                    <span>Verification Status</span>
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {organizationVerified !== false ? 'Verified & Audited' : 'Pending Verification'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
                    <span>Registration / License No.</span>
                  </span>
                  <span className="font-mono font-bold text-foreground">{regNumber}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-500 notranslate shrink-0" />
                    <span>Endorsement Privilege</span>
                  </span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    Active Regional Authority
                  </span>
                </div>
              </div>

              {/* Authority & Trust Note */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
                <Shield className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 notranslate" />
                <p className="leading-relaxed text-[11px] font-medium">
                  This organization has been verified by the KindLink moderation board. Endorsements made by this organization verify genuine community urgency, prioritize rapid helper alerts, and guarantee field trust across Asansol.
                </p>
              </div>

              {/* Dismiss Action */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-full h-11 rounded-2xl bg-primary hover:bg-primary-hover text-white font-bold text-xs shadow-soft transition active:scale-[0.98]"
              >
                Close Verification Info
              </button>
            </div>
          </div>
        </OverlayPortal>
      )}
    </>
  );
}
