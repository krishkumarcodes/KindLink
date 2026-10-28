'use client';

import React, { useId } from 'react';
import { LucideIcon } from 'lucide-react';
import { getCategoryToken, CategoryColorToken } from '@/lib/data/categoryColors';
import { CATEGORY_ICON_MAP } from '@/lib/data/categories';

export type CategoryEmblemSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type CategoryEmblemVariant = 'gradient' | 'luminous' | 'subtle';

export interface CategoryEmblemProps {
  /** The category key (e.g. 'blood', 'equipment', 'elderly', etc.) */
  category?: string | null;
  /** Optional custom category label for 'other' */
  customLabel?: string | null;
  /** Size presets: xs (24px), sm (32px), md (40px), lg (48px), xl (56px) */
  size?: CategoryEmblemSize;
  /** Visual variant: gradient (vibrant with white icon), luminous (tinted with colored icon), subtle (minimal) */
  variant?: CategoryEmblemVariant;
  /** Enable luminous ambient rim drop-glow */
  glow?: boolean;
  /** Enable micro-specular crystal sheen reflection */
  withSheen?: boolean;
  /** Custom classes for outer emblem wrapper */
  className?: string;
  /** Custom classes for Lucide icon or vector emblem */
  iconClassName?: string;
  /** Optional override icon */
  overrideIcon?: LucideIcon;
  /** Explicitly toggle vector logo emblem when available (defaults to true) */
  useLogoEmblem?: boolean;
}

const SIZE_CONFIGS: Record<
  CategoryEmblemSize,
  {
    container: string;
    icon: string;
    emblem: string;
    radius: string;
  }
> = {
  xs: {
    container: 'h-6 w-6 min-w-[24px]',
    icon: 'h-3.5 w-3.5',
    emblem: 'h-4 w-4',
    radius: 'rounded-lg',
  },
  sm: {
    container: 'h-8 w-8 min-w-[32px]',
    icon: 'h-4 w-4',
    emblem: 'h-5 w-5',
    radius: 'rounded-xl',
  },
  md: {
    container: 'h-10 w-10 min-w-[40px]',
    icon: 'h-5 w-5',
    emblem: 'h-6 w-6',
    radius: 'rounded-2xl',
  },
  lg: {
    container: 'h-12 w-12 min-w-[48px]',
    icon: 'h-6 w-6',
    emblem: 'h-7 w-7',
    radius: 'rounded-2xl',
  },
  xl: {
    container: 'h-14 w-14 min-w-[56px]',
    icon: 'h-7 w-7',
    emblem: 'h-8 w-8',
    radius: 'rounded-3xl',
  },
};

/**
 * 1. Blood Donation Emblem
 * Jewel-faceted ruby blood drop with radiant arterial gradient,
 * micro heartbeat ECG wave, emergency plus cross, and luminous ruby halo.
 */
function BloodDonationSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Blood Donation Emblem">
      <defs>
        <linearGradient id={`${id}-arterial`} x1="12" y1="6" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4D6D" />
          <stop offset="35%" stopColor="#E11D48" />
          <stop offset="70%" stopColor="#BE123C" />
          <stop offset="100%" stopColor="#880816" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="12" y1="12" x2="24" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-shade`} x1="24" y1="20" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4C0519" stopOpacity="0" />
          <stop offset="100%" stopColor="#4C0519" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="24" cy="30" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA4B6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#E11D48" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M24 5C24 5 10 20 10 31C10 38.73 16.27 45 24 45C31.73 45 38 38.73 38 31C38 20 24 5 24 5Z" fill={`url(#${id}-glow)`} className="opacity-75" />
      <path d="M24 6C24 6 11 20 11 31C11 38.18 16.82 44 24 44C31.18 44 37 38.18 37 31C37 20 24 6 24 6Z" fill={`url(#${id}-arterial)`} stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M24 6C24 6 11 20 11 31C11 38.18 16.82 44 24 44V6Z" fill={`url(#${id}-sheen)`} />
      <path d="M17 19C14.5 23.5 14.5 28.5 16 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.85" />
      <circle cx="23" cy="11" r="1.5" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="22.5" y="19" width="3" height="8" rx="1.5" fill="#FFFFFF" />
      <rect x="20" y="21.5" width="8" height="3" rx="1.5" fill="#FFFFFF" />
      <path d="M16 33.5H19.5L21.5 29.5L24 37L26.5 31L28.5 33.5H32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * 2. Medical Equipment Emblem
 * Futuristic stethoscope & diagnostic cross crest with cyan-teal laser sheen and crystal rims.
 */
function MedicalEquipmentSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Medical Equipment Emblem">
      <defs>
        <linearGradient id={`${id}-laser`} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" /><stop offset="35%" stopColor="#06B6D4" /><stop offset="70%" stopColor="#0D9488" /><stop offset="100%" stopColor="#044E46" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A5F3FC" /><stop offset="50%" stopColor="#22D3EE" /><stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="8" y1="24" x2="40" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" /><stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.95" /><stop offset="55%" stopColor="#67E8F9" stopOpacity="0.95" /><stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M24 5L39 12V26C39 35.5 24 43 24 43C24 43 9 35.5 9 26V12L24 5Z" fill={`url(#${id}-laser)`} stroke={`url(#${id}-rim)`} strokeWidth="1.5" />
      <path d="M11 13L24 7L37 13" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" strokeOpacity="0.8" />
      <circle cx="24" cy="24" r="12" stroke="#A5F3FC" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6" />
      <circle cx="24" cy="24" r="8" stroke="#22D3EE" strokeWidth="1.2" strokeOpacity="0.8" />
      <path d="M21 16H27V21H32V27H27V32H21V27H16V21H21V16Z" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="0.75" />
      <path d="M17 12C17 9 31 9 31 12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M10 24H38" stroke={`url(#${id}-sheen)`} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
      <circle cx="34" cy="15" r="1.2" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
}

/**
 * 3. Elderly Care Emblem
 * Compassion embrace hands cradling a glowing warm golden heart in sapphire-sky crystal.
 */
function ElderlyCareSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Elderly Care Emblem">
      <defs>
        <linearGradient id={`${id}-sapphire`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" /><stop offset="35%" stopColor="#2563EB" /><stop offset="75%" stopColor="#1D4ED8" /><stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={`${id}-gold-heart`} x1="18" y1="14" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" /><stop offset="35%" stopColor="#F59E0B" /><stop offset="75%" stopColor="#D97706" /><stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <radialGradient id={`${id}-heart-halo`} cx="24" cy="22" r="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.9" /><stop offset="60%" stopColor="#F59E0B" stopOpacity="0.25" /><stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id}-sapphire)`} stroke="#93C5FD" strokeWidth="1.2" strokeOpacity="0.5" />
      <path d="M13 18C16 11 32 11 35 18" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
      <circle cx="24" cy="21" r="11" fill={`url(#${id}-heart-halo)`} />
      <path d="M10 27C10 35 17 39 23 40C21.5 37 19.5 34 17 31C15 28 14.5 24 15 21C15 19.5 17 19.5 18 21.5C19 24 20.5 27 23 29.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 27C38 35 31 39 25 40C26.5 37 28.5 34 31 31C33 28 33.5 24 33 21C33 19.5 31 19.5 30 21.5C29 24 27.5 27 25 29.5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 16C22.2 12.8 17.5 12.8 17.5 18C17.5 23.5 24 28 24 28C24 28 30.5 23.5 30.5 18C30.5 12.8 25.8 12.8 24 16Z" fill={`url(#${id}-gold-heart)`} stroke="#FFFBEB" strokeWidth="1.2" />
      <path d="M19.5 16.5C19.5 14.8 21.5 14.5 23 16" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.9" />
    </svg>
  );
}

/**
 * 4. Emergency Transit Emblem
 * Rapid response transit crest with aerodynamic speed streaks and amber-fire gradient.
 */
function EmergencyTransitSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Emergency Transit Emblem">
      <defs>
        <linearGradient id={`${id}-transit-fire`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" /><stop offset="25%" stopColor="#F59E0B" /><stop offset="60%" stopColor="#EA580C" /><stop offset="100%" stopColor="#7C2D12" />
        </linearGradient>
        <linearGradient id={`${id}-streak`} x1="6" y1="20" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" /><stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <path d="M24 6L40 16L35 41L13 41L8 16L24 6Z" fill={`url(#${id}-transit-fire)`} stroke="#FCD34D" strokeWidth="1.4" />
      <path d="M11 17L24 8L37 17" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.85" />
      <path d="M6 21H18" stroke={`url(#${id}-streak)`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M4 26H16" stroke={`url(#${id}-streak)`} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M7 31H19" stroke={`url(#${id}-streak)`} strokeWidth="2" strokeLinecap="round" />
      <path d="M17 25L22 17H31L37 25L39 28V32H35.5C35 30 33 28.5 31 28.5C29 28.5 27 30 26.5 32H21.5C21 30 19 28.5 17 28.5C15.5 28.5 14.5 29.5 14 31L13.5 28L17 25Z" fill="#FFFFFF" />
      <circle cx="17" cy="32" r="3" fill="#18181B" stroke="#FBBF24" strokeWidth="1.5" />
      <circle cx="31" cy="32" r="3" fill="#18181B" stroke="#FBBF24" strokeWidth="1.5" />
      <path d="M22.5 19H30L34 24H20L22.5 19Z" fill="#F59E0B" fillOpacity="0.85" />
      <circle cx="26" cy="15" r="1.8" fill="#FFFFFF" />
      <path d="M26 12V14M23 13L24.5 14.5M29 13L27.5 14.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 5. Food Support Emblem
 * Nourishment emblem with stylized wheat sheaf & bowl in emerald-lime gradient.
 */
function FoodSupportSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Food Support Emblem">
      <defs>
        <linearGradient id={`${id}-emerald`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BEF264" /><stop offset="30%" stopColor="#4ADE80" /><stop offset="65%" stopColor="#10B981" /><stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id={`${id}-grain`} x1="20" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" /><stop offset="50%" stopColor="#FACC15" /><stop offset="100%" stopColor="#84CC16" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id}-emerald)`} stroke="#86EFAC" strokeWidth="1.2" strokeOpacity="0.5" />
      <path d="M13 18C16 11 32 11 35 18" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
      <path d="M11 26C9 21 11 16 15 13C14 18 15 22 18 25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M37 26C39 21 37 16 33 13C34 18 33 22 30 25" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M24 28V9" stroke="#FEF08A" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 8C22.5 10.5 22.5 13 24 15C25.5 13 25.5 10.5 24 8Z" fill={`url(#${id}-grain)`} stroke="#FFFFFF" strokeWidth="0.75" />
      <path d="M23 14C20 14 18 17 21 19C23 19 24 17 23 14Z" fill={`url(#${id}-grain)`} stroke="#FFFFFF" strokeWidth="0.75" />
      <path d="M25 14C28 14 30 17 27 19C25 19 24 17 25 14Z" fill={`url(#${id}-grain)`} stroke="#FFFFFF" strokeWidth="0.75" />
      <path d="M23 19.5C19 20.5 18 23.5 21 25.5C23 24.5 24 22.5 23 19.5Z" fill={`url(#${id}-grain)`} stroke="#FFFFFF" strokeWidth="0.75" />
      <path d="M25 19.5C29 20.5 30 23.5 27 25.5C25 24.5 24 22.5 25 19.5Z" fill={`url(#${id}-grain)`} stroke="#FFFFFF" strokeWidth="0.75" />
      <path d="M12 27C12 37 17 41 24 41C31 41 36 37 36 27H12Z" fill="#FFFFFF" />
      <ellipse cx="24" cy="27" rx="12" ry="2.5" fill="#E2E8F0" />
      <ellipse cx="24" cy="27" rx="10" ry="1.8" fill="#10B981" fillOpacity="0.4" />
      <circle cx="16" cy="27" r="1.5" fill="#FFFFFF" />
    </svg>
  );
}

/**
 * 6. Medicines & Rx Emblem
 * Precision medical capsule split angled at 45° with violet-fuchsia glow and crystalline sheen.
 */
function MedicinesRxSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Medicines and Rx Emblem">
      <defs>
        <linearGradient id={`${id}-purple`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0ABFC" /><stop offset="30%" stopColor="#C084FC" /><stop offset="70%" stopColor="#9333EA" /><stop offset="100%" stopColor="#4A044E" />
        </linearGradient>
        <linearGradient id={`${id}-cap-top`} x1="15" y1="12" x2="33" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F472B6" /><stop offset="50%" stopColor="#E879F9" /><stop offset="100%" stopColor="#C026D3" />
        </linearGradient>
        <linearGradient id={`${id}-cap-bottom`} x1="15" y1="24" x2="33" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" /><stop offset="60%" stopColor="#E2E8F0" /><stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id}-purple)`} stroke="#E879F9" strokeWidth="1.2" strokeOpacity="0.5" />
      <path d="M13 18C16 11 32 11 35 18" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
      <g transform="rotate(-45 24 24)">
        <path d="M16 21.5C16 16.5 19.5 12.5 24 12.5C28.5 12.5 32 16.5 32 21.5V22.5H16V21.5Z" fill={`url(#${id}-cap-top)`} stroke="#FFFFFF" strokeWidth="1" />
        <path d="M16 25.5H32V26.5C32 31.5 28.5 35.5 24 35.5C19.5 35.5 16 31.5 16 26.5V25.5Z" fill={`url(#${id}-cap-bottom)`} stroke="#CBD5E1" strokeWidth="1" />
        <path d="M19 14.5C18 17.5 18 30.5 19 33.5" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" strokeOpacity="0.8" />
        <circle cx="24" cy="24" r="2.2" fill="#FFFFFF" />
        <path d="M21 24H27M24 21V27" stroke="#F0ABFC" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <rect x="33.5" y="11" width="3" height="8" rx="1.5" fill="#FFFFFF" />
      <rect x="31" y="13.5" width="8" height="3" rx="1.5" fill="#FFFFFF" />
      <circle cx="12" cy="30" r="1.5" fill="#F0ABFC" fillOpacity="0.8" />
      <circle cx="36" cy="32" r="2" fill="#F0ABFC" fillOpacity="0.7" />
    </svg>
  );
}

/**
 * 7. Books & Education Emblem
 * Illuminated wisdom beacon / open book emblem with teal aurora rays.
 */
function BooksEducationSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Books and Education Emblem">
      <defs>
        <linearGradient id={`${id}-teal`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5EEAD4" /><stop offset="30%" stopColor="#14B8A6" /><stop offset="70%" stopColor="#0F766E" /><stop offset="100%" stopColor="#134E4A" />
        </linearGradient>
        <linearGradient id={`${id}-pages`} x1="12" y1="20" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" /><stop offset="70%" stopColor="#F0FDFA" /><stop offset="100%" stopColor="#CCFBF1" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id}-teal)`} stroke="#5EEAD4" strokeWidth="1.2" strokeOpacity="0.5" />
      <path d="M13 18C16 11 32 11 35 18" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
      <path d="M24 14L15 7" stroke="#5EEAD4" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M24 14L33 7" stroke="#5EEAD4" strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.7" />
      <path d="M24 14V5" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.85" />
      <path d="M24 7L25.8 12.2L31 14L25.8 15.8L24 21L22.2 15.8L17 14L22.2 12.2L24 7Z" fill="#FFFFFF" />
      <circle cx="24" cy="14" r="1.5" fill="#5EEAD4" />
      <path d="M24 35C19 32 13 32 9 33V22C13 21 19 21 24 24V35Z" fill={`url(#${id}-pages)`} stroke="#0F766E" strokeWidth="0.75" />
      <path d="M24 35C29 32 35 32 39 33V22C35 21 29 21 24 24V35Z" fill={`url(#${id}-pages)`} stroke="#0F766E" strokeWidth="0.75" />
      <path d="M9 35C13 34 19 34 24 37C29 34 35 34 39 35" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M24 24V37" stroke="#14B8A6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * 8. Other Support Emblem
 * Multi-faceted aid compass / constellation emblem in deep indigo-slate crystal.
 */
function OtherSupportSvg({ id, className = 'w-full h-full' }: { id: string; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-label="Other Support Emblem">
      <defs>
        <linearGradient id={`${id}-indigo`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" /><stop offset="30%" stopColor="#6366F1" /><stop offset="65%" stopColor="#4338CA" /><stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={`${id}-star-light`} x1="20" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" /><stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
        <linearGradient id={`${id}-star-dark`} x1="20" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" /><stop offset="100%" stopColor="#312E81" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="19" fill={`url(#${id}-indigo)`} stroke="#A5B4FC" strokeWidth="1.2" strokeOpacity="0.5" />
      <path d="M13 18C16 11 32 11 35 18" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.75" />
      <circle cx="24" cy="24" r="15" stroke="#C7D2FE" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.5" />
      <circle cx="24" cy="9" r="1.75" fill="#FFFFFF" />
      <circle cx="39" cy="24" r="1.75" fill="#FFFFFF" />
      <circle cx="24" cy="39" r="1.75" fill="#FFFFFF" />
      <circle cx="9" cy="24" r="1.75" fill="#FFFFFF" />
      <path d="M24 9L21.5 24H24V9Z" fill={`url(#${id}-star-light)`} />
      <path d="M24 9L26.5 24H24V9Z" fill={`url(#${id}-star-dark)`} />
      <path d="M24 39L26.5 24H24V39Z" fill={`url(#${id}-star-light)`} />
      <path d="M24 39L21.5 24H24V39Z" fill={`url(#${id}-star-dark)`} />
      <path d="M39 24L24 21.5V24H39Z" fill={`url(#${id}-star-light)`} />
      <path d="M39 24L24 26.5V24H39Z" fill={`url(#${id}-star-dark)`} />
      <path d="M9 24L24 26.5V24H9Z" fill={`url(#${id}-star-light)`} />
      <path d="M9 24L24 21.5V24H9Z" fill={`url(#${id}-star-dark)`} />
      <path d="M33 15L24 24L30 20Z" fill={`url(#${id}-star-light)`} />
      <path d="M33 33L24 24L28 28Z" fill={`url(#${id}-star-dark)`} />
      <path d="M15 33L24 24L18 28Z" fill={`url(#${id}-star-light)`} />
      <path d="M15 15L24 24L20 20Z" fill={`url(#${id}-star-dark)`} />
      <circle cx="24" cy="24" r="3.5" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="2" fill="#818CF8" />
    </svg>
  );
}

/**
 * Dispatches the bespoke vector logo emblem if category matches canonical set.
 */
function renderBespokeLogo(category: string, id: string, className: string): React.ReactNode | null {
  const norm = category.toLowerCase().trim();
  switch (norm) {
    case 'blood':
      return <BloodDonationSvg id={id} className={className} />;
    case 'equipment':
      return <MedicalEquipmentSvg id={id} className={className} />;
    case 'elderly':
    case 'elderly_help':
      return <ElderlyCareSvg id={id} className={className} />;
    case 'transport':
      return <EmergencyTransitSvg id={id} className={className} />;
    case 'food':
      return <FoodSupportSvg id={id} className={className} />;
    case 'medicine':
      return <MedicinesRxSvg id={id} className={className} />;
    case 'books':
      return <BooksEducationSvg id={id} className={className} />;
    case 'other':
      return <OtherSupportSvg id={id} className={className} />;
    default:
      return null;
  }
}

export function CategoryEmblem({
  category,
  customLabel,
  size = 'md',
  variant = 'gradient',
  glow = true,
  withSheen = true,
  className = '',
  iconClassName = '',
  overrideIcon,
  useLogoEmblem = true,
}: CategoryEmblemProps) {
  const token: CategoryColorToken = getCategoryToken(category, customLabel);
  const IconComponent = overrideIcon || token.icon || CATEGORY_ICON_MAP.HelpCircle;
  const cfg = SIZE_CONFIGS[size];
  const rawId = useId();
  const safeId = `emblem-${category || 'cat'}-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const bespokeVector =
    !overrideIcon && useLogoEmblem && category
      ? renderBespokeLogo(category, safeId, `${cfg.emblem} notranslate shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] ${iconClassName}`)
      : null;

  if (variant === 'luminous') {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 border transition-all duration-200 shadow-2xs ${cfg.container} ${cfg.radius} ${className}`}
        style={{
          backgroundColor: token.lightBg,
          borderColor: token.border,
          color: token.primary,
        }}
        title={token.name}
      >
        <IconComponent className={`${cfg.icon} notranslate shrink-0 stroke-[2.2] ${iconClassName}`} />
      </div>
    );
  }

  if (variant === 'subtle') {
    return (
      <div
        className={`relative flex items-center justify-center shrink-0 bg-muted/60 text-muted-foreground border border-border/80 transition-all duration-200 ${cfg.container} ${cfg.radius} ${className}`}
        title={token.name}
      >
        <IconComponent className={`${cfg.icon} notranslate shrink-0 stroke-[2.2] ${iconClassName}`} />
      </div>
    );
  }

  // Default: 'gradient' emblem with vibrant multi-stop gradient, micro-specular rim glow, and bespoke logo emblem
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 text-white bg-gradient-to-br ${
        token.gradient
      } ${cfg.container} ${cfg.radius} ${
        glow ? `shadow-md ${token.glowTailwind}` : 'shadow-xs'
      } ring-1 ring-inset ring-white/25 overflow-hidden transition-all duration-200 group-hover:scale-105 select-none ${className}`}
      title={token.name}
    >
      {/* Micro-specular top-down highlight sheen */}
      {withSheen && (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-t-[inherit]"
          aria-hidden="true"
        />
      )}

      {/* Ambient bottom depth shade */}
      <span
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent rounded-b-[inherit]"
        aria-hidden="true"
      />

      {/* Bespoke Vector Logo Emblem or Fallback Lucide Icon */}
      {bespokeVector ? (
        <span className="relative z-10 flex items-center justify-center">
          {bespokeVector}
        </span>
      ) : (
        <IconComponent
          className={`relative z-10 ${cfg.icon} notranslate shrink-0 filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] stroke-[2.2] ${iconClassName}`}
        />
      )}
    </div>
  );
}
