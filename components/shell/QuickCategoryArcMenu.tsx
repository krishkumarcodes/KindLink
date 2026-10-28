'use client';

import React, { useEffect, useState, useRef, useCallback, useId } from 'react';
import {
  Droplets,
  Stethoscope,
  HeartHandshake,
  Car,
  Utensils,
  Pill,
  BookOpen,
  HelpCircle,
  LucideIcon,
  Sparkles,
  X,
} from 'lucide-react';
import { m, AnimatePresence } from '@/lib/utils/motion';
import { HelpCategory } from '@/lib/data/types';
import { OverlayPortal, useBodyScrollLock } from '@/components/ui/OverlayPortal';

export interface ArcCategoryItem {
  id: HelpCategory;
  name: string;
  tag: string;
  icon: LucideIcon;
  gradient: string;
  glowColor: string;
  ringClass: string;
  chipClass: string;
  expectation: string;
  angleDeg: number;
  x: number;
  y: number;
}

export interface ArcBranchData {
  id: HelpCategory;
  category: ArcCategoryItem;
  pathD: string;
  midX: number;
  midY: number;
  spurD: string;
  spurEnd: { x: number; y: number };
}

const ARC_RADIUS = 124; // 120px - 125px radius specification
const START_ANGLE = -155; // Upward fan start angle
const END_ANGLE = -25; // Upward fan end angle

export const CATEGORY_DEFINITIONS: Array<{
  id: HelpCategory;
  name: string;
  tag: string;
  icon: LucideIcon;
  gradient: string;
  glowColor: string;
  ringClass: string;
  chipClass: string;
  expectation: string;
}> = [
  {
    id: 'blood',
    name: 'Blood Donation',
    tag: 'Rose',
    icon: Droplets,
    gradient: 'from-rose-500 via-rose-600 to-red-600',
    glowColor: 'rgba(244, 63, 94, 0.75)',
    ringClass: 'ring-rose-400 shadow-[0_0_28px_rgba(244,63,94,0.75)]',
    chipClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    expectation: 'Immediate (0-2h)',
  },
  {
    id: 'equipment',
    name: 'Medical Equipment',
    tag: 'Cyan/Blue',
    icon: Stethoscope,
    gradient: 'from-cyan-500 via-teal-600 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.75)',
    ringClass: 'ring-cyan-400 shadow-[0_0_28px_rgba(6,182,212,0.75)]',
    chipClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    expectation: 'Urgent (2-4h)',
  },
  {
    id: 'elderly',
    name: 'Elderly Care',
    tag: 'Sky/Blue',
    icon: HeartHandshake,
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    glowColor: 'rgba(56, 189, 248, 0.75)',
    ringClass: 'ring-sky-400 shadow-[0_0_28px_rgba(56,189,248,0.75)]',
    chipClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    expectation: 'Same Day / Flexible',
  },
  {
    id: 'transport',
    name: 'Emergency Transit',
    tag: 'Amber/Orange',
    icon: Car,
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.75)',
    ringClass: 'ring-amber-400 shadow-[0_0_28px_rgba(245,158,11,0.75)]',
    chipClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    expectation: 'Within 1-2h',
  },
  {
    id: 'food',
    name: 'Food Support',
    tag: 'Emerald/Green',
    icon: Utensils,
    gradient: 'from-emerald-500 via-emerald-600 to-green-600',
    glowColor: 'rgba(16, 185, 129, 0.75)',
    ringClass: 'ring-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.75)]',
    chipClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    expectation: 'Within 2-4h',
  },
  {
    id: 'medicine',
    name: 'Medicines & Rx',
    tag: 'Violet/Purple',
    icon: Pill,
    gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    glowColor: 'rgba(168, 85, 247, 0.75)',
    ringClass: 'ring-violet-400 shadow-[0_0_28px_rgba(168,85,247,0.75)]',
    chipClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    expectation: 'Immediate (0-2h)',
  },
  {
    id: 'books',
    name: 'Books & Education',
    tag: 'Teal',
    icon: BookOpen,
    gradient: 'from-teal-500 via-teal-600 to-emerald-600',
    glowColor: 'rgba(20, 184, 166, 0.75)',
    ringClass: 'ring-teal-400 shadow-[0_0_28px_rgba(20,184,166,0.75)]',
    chipClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    expectation: 'Within 24-48h',
  },
  {
    id: 'other',
    name: 'Other Support',
    tag: 'Slate/Indigo',
    icon: HelpCircle,
    gradient: 'from-indigo-600 via-slate-700 to-slate-800',
    glowColor: 'rgba(99, 102, 241, 0.75)',
    ringClass: 'ring-indigo-400 shadow-[0_0_28px_rgba(99,102,241,0.75)]',
    chipClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    expectation: 'Flexible Support',
  },
];

// Precompute radial arc coordinates
export const QUICK_ARC_CATEGORIES: ArcCategoryItem[] = CATEGORY_DEFINITIONS.map(
  (cat, index, array) => {
    const angleDeg =
      START_ANGLE + (index * (END_ANGLE - START_ANGLE)) / (array.length - 1);
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = Math.round(Math.cos(angleRad) * ARC_RADIUS * 10) / 10;
    const y = Math.round(Math.sin(angleRad) * ARC_RADIUS * 10) / 10;
    return {
      ...cat,
      angleDeg,
      x,
      y,
    };
  }
);

// Precompute organic neural branches and micro spurs radiating outward from hub (0, 0)
export const QUICK_ARC_BRANCHES: ArcBranchData[] = QUICK_ARC_CATEGORIES.map(
  (cat) => {
    const cp1AngleDeg = -90 + (cat.angleDeg - -90) * 0.65;
    const cp1Rad = (cp1AngleDeg * Math.PI) / 180;
    const cp1x = Math.round(Math.cos(cp1Rad) * 36 * 10) / 10;
    const cp1y = Math.round(Math.sin(cp1Rad) * 36 * 10) / 10;

    const cp2AngleDeg = -90 + (cat.angleDeg - -90) * 0.92;
    const cp2Rad = (cp2AngleDeg * Math.PI) / 180;
    const cp2x = Math.round(Math.cos(cp2Rad) * 88 * 10) / 10;
    const cp2y = Math.round(Math.sin(cp2Rad) * 88 * 10) / 10;

    const pathD = `M 0 0 C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cat.x} ${cat.y}`;

    const t = 0.52;
    const oneMinusT = 1 - t;
    const midX =
      Math.round(
        (3 * oneMinusT * oneMinusT * t * cp1x +
          3 * oneMinusT * t * t * cp2x +
          t * t * t * cat.x) *
          10
      ) / 10;
    const midY =
      Math.round(
        (3 * oneMinusT * oneMinusT * t * cp1y +
          3 * oneMinusT * t * t * cp2y +
          t * t * t * cat.y) *
          10
      ) / 10;

    const tanX =
      3 * oneMinusT * oneMinusT * cp1x +
      6 * oneMinusT * t * (cp2x - cp1x) +
      3 * t * t * (cat.x - cp2x);
    const tanY =
      3 * oneMinusT * oneMinusT * cp1y +
      6 * oneMinusT * t * (cp2y - cp1y) +
      3 * t * t * (cat.y - cp2y);
    const tanLen = Math.hypot(tanX, tanY) || 1;
    const uTx = tanX / tanLen;
    const uTy = tanY / tanLen;

    const sideSign = cat.x <= 0 ? -1 : 1;
    let uNx = -uTy;
    let uNy = uTx;
    if (uNx * sideSign < 0) {
      uNx = -uNx;
      uNy = -uNy;
    }

    const spurVecX = uNx * 9 + uTx * 6;
    const spurVecY = uNy * 9 + uTy * 6;
    const spurEndX = Math.round((midX + spurVecX) * 10) / 10;
    const spurEndY = Math.round((midY + spurVecY) * 10) / 10;
    const spurD = `M ${midX} ${midY} Q ${Math.round((midX + spurVecX * 0.5) * 10) / 10} ${Math.round((midY + spurVecY * 0.3) * 10) / 10} ${spurEndX} ${spurEndY}`;

    return {
      id: cat.id,
      category: cat,
      pathD,
      midX,
      midY,
      spurD,
      spurEnd: { x: spurEndX, y: spurEndY },
    };
  }
);

function safeVibrate(durationMs: number) {
  if (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    navigator.vibrate
  ) {
    try {
      navigator.vibrate(durationMs);
    } catch {
      // Ignore vibration errors if not permitted
    }
  }
}

// ----------------------------------------------------------------------
// BESPOKE CATEGORY LOGO EMBLEMS
// ----------------------------------------------------------------------

interface SvgEmblemProps {
  id: string;
  className?: string;
}

export function BloodDonationEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Blood Donation Emblem">
      <defs>
        <linearGradient id={`${id}-arterial`} x1="12" y1="6" x2="36" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FF4D6D" />
          <stop offset="35%" stopColor="#E11D48" />
          <stop offset="70%" stopColor="#BE123C" />
          <stop offset="100%" stopColor="#880816" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="12" y1="12" x2="24" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-core-glow`} cx="24" cy="30" r="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFA4B6" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#E11D48" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#E11D48" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M24 5C24 5 10 20 10 31C10 38.73 16.27 45 24 45C31.73 45 38 38.73 38 31C38 20 24 5 24 5Z" fill={`url(#${id}-core-glow)`} className="opacity-75" />
      <path d="M24 6C24 6 11 20 11 31C11 38.18 16.82 44 24 44C31.18 44 37 38.18 37 31C37 20 24 6 24 6Z" fill={`url(#${id}-arterial)`} stroke="#FFFFFF" strokeOpacity="0.45" strokeWidth="1.2" />
      <path d="M24 6C24 6 11 20 11 31C11 38.18 16.82 44 24 44V6Z" fill={`url(#${id}-sheen)`} />
      <path d="M17 19C14.5 23.5 14.5 28.5 16 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.85" />
      <circle cx="23" cy="11" r="1.5" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="22.5" y="19" width="3" height="8" rx="1.5" fill="#FFFFFF" />
      <rect x="20" y="21.5" width="8" height="3" rx="1.5" fill="#FFFFFF" />
      <path d="M16 33.5H19.5L21.5 29.5L24 37L26.5 31L28.5 33.5H32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MedicalEquipmentEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Medical Equipment Emblem">
      <defs>
        <linearGradient id={`${id}-equip-laser`} x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="35%" stopColor="#06B6D4" />
          <stop offset="70%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#044E46" />
        </linearGradient>
        <linearGradient id={`${id}-equip-rim`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A5F3FC" />
          <stop offset="50%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
        <linearGradient id={`${id}-laser-sheen`} x1="8" y1="24" x2="40" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="55%" stopColor="#67E8F9" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M24 5L39 12V26C39 35.5 24 43 24 43C24 43 9 35.5 9 26V12L24 5Z" fill={`url(#${id}-equip-laser)`} stroke={`url(#${id}-equip-rim)`} strokeWidth="1.5" />
      <path d="M11 13L24 7L37 13" stroke="#FFFFFF" strokeWidth="1.75" strokeLinecap="round" strokeOpacity="0.8" />
      <circle cx="24" cy="24" r="12" stroke="#A5F3FC" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.6" />
      <circle cx="24" cy="24" r="8" stroke="#22D3EE" strokeWidth="1.2" strokeOpacity="0.8" />
      <path d="M21 16H27V21H32V27H27V32H21V27H16V21H21V16Z" fill="#FFFFFF" stroke="#06B6D4" strokeWidth="0.75" />
      <path d="M17 12C17 9 31 9 31 12" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.8" />
      <path d="M10 24H38" stroke={`url(#${id}-laser-sheen)`} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2" fill="#FFFFFF" />
      <circle cx="34" cy="15" r="1.2" fill="#FFFFFF" fillOpacity="0.9" />
    </svg>
  );
}

export function ElderlyCareEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Elderly Care Emblem">
      <defs>
        <linearGradient id={`${id}-sapphire`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="35%" stopColor="#2563EB" />
          <stop offset="75%" stopColor="#1D4ED8" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={`${id}-gold-heart`} x1="18" y1="14" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#F59E0B" />
          <stop offset="75%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <radialGradient id={`${id}-heart-halo`} cx="24" cy="22" r="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.9" />
          <stop offset="60%" stopColor="#F59E0B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
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

export function EmergencyTransitEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Emergency Transit Emblem">
      <defs>
        <linearGradient id={`${id}-transit-fire`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="25%" stopColor="#F59E0B" />
          <stop offset="60%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#7C2D12" />
        </linearGradient>
        <linearGradient id={`${id}-streak`} x1="6" y1="20" x2="22" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.95" />
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

export function FoodSupportEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Food Support Emblem">
      <defs>
        <linearGradient id={`${id}-emerald`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#BEF264" />
          <stop offset="30%" stopColor="#4ADE80" />
          <stop offset="65%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#064E3B" />
        </linearGradient>
        <linearGradient id={`${id}-grain`} x1="20" y1="8" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#FACC15" />
          <stop offset="100%" stopColor="#84CC16" />
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

export function MedicinesRxEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Medicines and Rx Emblem">
      <defs>
        <linearGradient id={`${id}-purple`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0ABFC" />
          <stop offset="30%" stopColor="#C084FC" />
          <stop offset="70%" stopColor="#9333EA" />
          <stop offset="100%" stopColor="#4A044E" />
        </linearGradient>
        <linearGradient id={`${id}-cap-top`} x1="15" y1="12" x2="33" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="50%" stopColor="#E879F9" />
          <stop offset="100%" stopColor="#C026D3" />
        </linearGradient>
        <linearGradient id={`${id}-cap-bottom`} x1="15" y1="24" x2="33" y2="36" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="60%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#CBD5E1" />
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

export function BooksEducationEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Books and Education Emblem">
      <defs>
        <linearGradient id={`${id}-teal`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#5EEAD4" />
          <stop offset="30%" stopColor="#14B8A6" />
          <stop offset="70%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#134E4A" />
        </linearGradient>
        <linearGradient id={`${id}-pages`} x1="12" y1="20" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F0FDFA" />
          <stop offset="100%" stopColor="#CCFBF1" />
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

export function OtherSupportEmblem({ id, className = 'w-full h-full' }: SvgEmblemProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-label="Other Support Emblem">
      <defs>
        <linearGradient id={`${id}-indigo`} x1="10" y1="6" x2="38" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="30%" stopColor="#6366F1" />
          <stop offset="65%" stopColor="#4338CA" />
          <stop offset="100%" stopColor="#1E1B4B" />
        </linearGradient>
        <linearGradient id={`${id}-star-light`} x1="20" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#C7D2FE" />
        </linearGradient>
        <linearGradient id={`${id}-star-dark`} x1="20" y1="10" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#312E81" />
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

export function CategoryLogoEmblem({
  category,
  className = 'w-7 h-7',
}: {
  category?: string | HelpCategory | null;
  className?: string;
}) {
  const rawId = useId();
  const safeId = `emb-${category || 'cat'}-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const norm = (category || 'other').toLowerCase().trim();

  switch (norm) {
    case 'blood':
      return <BloodDonationEmblem id={safeId} className={className} />;
    case 'equipment':
      return <MedicalEquipmentEmblem id={safeId} className={className} />;
    case 'elderly':
    case 'elderly_help':
      return <ElderlyCareEmblem id={safeId} className={className} />;
    case 'transport':
      return <EmergencyTransitEmblem id={safeId} className={className} />;
    case 'food':
      return <FoodSupportEmblem id={safeId} className={className} />;
    case 'medicine':
      return <MedicinesRxEmblem id={safeId} className={className} />;
    case 'books':
      return <BooksEducationEmblem id={safeId} className={className} />;
    case 'other':
    default:
      return <OtherSupportEmblem id={safeId} className={className} />;
  }
}

// ----------------------------------------------------------------------
// MAIN COMPONENT: QuickCategoryArcMenu
// ----------------------------------------------------------------------

export interface QuickCategoryArcMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory: (category: HelpCategory) => void;
  /** Custom anchor center coordinates (clientX, clientY) for pointer drag resolution */
  anchorCenter?: { x: number; y: number } | null;
}

export function QuickCategoryArcMenu({
  isOpen,
  onClose,
  onSelectCategory,
  anchorCenter,
}: QuickCategoryArcMenuProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<HelpCategory | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCategoryRef = useRef<HelpCategory | null>(null);

  // Lock body scroll on iOS/Android while open to ensure smooth gesture dragging
  useBodyScrollLock(isOpen);

  // Dynamic fallback anchor resolution if anchorCenter not provided
  const [viewportFallback, setViewportFallback] = useState<{ x: number; y: number }>(() => ({
    x: typeof window !== 'undefined' ? Math.round(window.innerWidth / 2) : 200,
    y: typeof window !== 'undefined' ? Math.round(window.innerHeight - 56) : 700,
  }));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateFallback = () => {
      setViewportFallback({
        x: Math.round(window.innerWidth / 2),
        y: Math.round(window.innerHeight - 56),
      });
    };
    updateFallback();
    window.addEventListener('resize', updateFallback);
    window.addEventListener('orientationchange', updateFallback);
    return () => {
      window.removeEventListener('resize', updateFallback);
      window.removeEventListener('orientationchange', updateFallback);
    };
  }, []);

  const effectiveAnchor = anchorCenter || viewportFallback;

  // Sync ref with state
  useEffect(() => {
    activeCategoryRef.current = activeCategoryId;
  }, [activeCategoryId]);

  // Hold activation haptic feedback
  useEffect(() => {
    if (isOpen) {
      safeVibrate(25);
      setActiveCategoryId(null);
    }
  }, [isOpen]);

  // Determine which category is targeted based on pointer coordinates
  const resolveTargetCategory = useCallback(
    (clientX: number, clientY: number): HelpCategory | null => {
      const originX = effectiveAnchor.x;
      const originY = effectiveAnchor.y;

      const dx = clientX - originX;
      const dy = clientY - originY;
      const distFromCenter = Math.hypot(dx, dy);

      // Dead zone near center + button (finger must move outward)
      if (distFromCenter < 35) {
        return null;
      }

      // Check distance from pointer to each item center
      let closestCategory: HelpCategory | null = null;
      let minItemDistance = Infinity;

      for (const item of QUICK_ARC_CATEGORIES) {
        const itemTargetX = originX + item.x;
        const itemTargetY = originY + item.y;
        const distToItem = Math.hypot(clientX - itemTargetX, clientY - itemTargetY);

        if (distToItem < minItemDistance) {
          minItemDistance = distToItem;
          closestCategory = item.id;
        }
      }

      // If within target sensitivity radius (~54px around node)
      if (minItemDistance <= 54) {
        return closestCategory;
      }

      // Angle check for broad drag sweep along radial branches
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      if (
        angleDeg >= -175 &&
        angleDeg <= -15 &&
        distFromCenter >= 58 &&
        distFromCenter <= 180
      ) {
        return closestCategory;
      }

      return null;
    },
    [effectiveAnchor]
  );

  // Listen to window pointer events when menu is open to handle drag release
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerMove = (e: PointerEvent) => {
      const targetCat = resolveTargetCategory(e.clientX, e.clientY);
      if (targetCat !== activeCategoryRef.current) {
        if (targetCat !== null) {
          // Category crossing haptic feedback (8ms)
          safeVibrate(8);
        }
        setActiveCategoryId(targetCat);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const finalCategory =
        activeCategoryRef.current || resolveTargetCategory(e.clientX, e.clientY);

      if (finalCategory) {
        safeVibrate(15);
        onSelectCategory(finalCategory);
      }
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, onSelectCategory, resolveTargetCategory]);

  const activeCategory = QUICK_ARC_CATEGORIES.find(
    (c) => c.id === activeCategoryId
  );

  return (
    <OverlayPortal>
      <AnimatePresence>
        {isOpen && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto touch-none select-none"
            role="dialog"
            aria-label="Quick Category Arc Menu"
            aria-modal="true"
          >
            {/* Subtle frosted backdrop overlay */}
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Anchor Container precisely centered at effectiveAnchor */}
            <div
              ref={containerRef}
              style={{
                position: 'fixed',
                left: `${effectiveAnchor.x}px`,
                top: `${effectiveAnchor.y}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="w-14 h-14 flex items-center justify-center pointer-events-none z-10"
            >
              {/* Active Category Floating Crystal Pill Badge */}
              <div className="absolute -top-[168px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center z-30">
                <AnimatePresence mode="wait">
                  {activeCategory ? (
                    <m.div
                      key={activeCategory.id}
                      initial={{ opacity: 0, y: 8, scale: 0.92 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.92 }}
                      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                      className={`relative flex items-center gap-2.5 px-4 py-2 rounded-full border border-white/35 shadow-2xl backdrop-blur-xl ring-1 ring-inset ring-white/25 overflow-hidden ${activeCategory.chipClass}`}
                      style={{
                        boxShadow: `0 0 28px ${activeCategory.glowColor}, 0 10px 25px rgba(0,0,0,0.4)`,
                      }}
                    >
                      {/* Top Specular Sheen on Floating Chip */}
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 via-white/10 to-transparent rounded-t-full" />

                      {/* Logo Emblem inside Chip */}
                      <CategoryLogoEmblem
                        category={activeCategory.id}
                        className="w-5 h-5 shrink-0 notranslate drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
                      />

                      <span className="text-xs font-bold text-white tracking-wide">
                        {activeCategory.name}
                      </span>

                      {/* Floating Urgency Expectation Pill */}
                      <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold tracking-wide border border-white/30 shadow-2xs">
                        {activeCategory.expectation}
                      </span>
                    </m.div>
                  ) : (
                    <m.div
                      key="hint"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-teal-500/35 shadow-xl text-slate-200 text-[11px] font-semibold backdrop-blur-md ring-1 ring-inset ring-white/15"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-400 notranslate animate-pulse" />
                      <span>Slide along branch to select category</span>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Luminous Neural Branch SVG Network Canvas */}
              <svg
                className="absolute pointer-events-none -left-[160px] -top-[160px] w-[320px] h-[320px] overflow-visible z-0"
                viewBox="-160 -160 320 320"
                fill="none"
              >
                <style>{`
                  @keyframes arcBranchDashFlow {
                    from { stroke-dashoffset: 32; }
                    to { stroke-dashoffset: 0; }
                  }
                  .animate-arc-flow-dash {
                    animation: arcBranchDashFlow 0.75s linear infinite;
                  }
                `}</style>
                <defs>
                  {QUICK_ARC_BRANCHES.map((branch) => (
                    <linearGradient
                      key={`grad-${branch.id}`}
                      id={`branch-laser-${branch.id}`}
                      x1="0"
                      y1="0"
                      x2={branch.category.x}
                      y2={branch.category.y}
                      gradientUnits="userSpaceOnUse"
                    >
                      <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.9" />
                      <stop offset="65%" stopColor={branch.category.glowColor} stopOpacity="1" />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity="1" />
                    </linearGradient>
                  ))}
                </defs>

                {/* Outer guide radius arc */}
                <circle
                  cx="0"
                  cy="0"
                  r={ARC_RADIUS}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                  className="text-teal-400/25"
                />

                {/* 8 Dynamic Branch Lines */}
                {QUICK_ARC_BRANCHES.map((branch) => {
                  const isActive = activeCategoryId === branch.id;
                  return (
                    <g key={`branch-net-${branch.id}`}>
                      {/* Micro branch spur */}
                      <path
                        d={branch.spurD}
                        stroke={isActive ? branch.category.glowColor : 'currentColor'}
                        strokeWidth={isActive ? '2.5' : '1.5'}
                        strokeOpacity={isActive ? 0.95 : 0.28}
                        strokeLinecap="round"
                        className={isActive ? '' : 'text-teal-400/35'}
                        style={
                          isActive
                            ? { filter: `drop-shadow(0 0 6px ${branch.category.glowColor})` }
                            : undefined
                        }
                      />
                      {/* Micro spur terminal dot */}
                      <circle
                        cx={branch.spurEnd.x}
                        cy={branch.spurEnd.y}
                        r={isActive ? 2.5 : 1.5}
                        fill={isActive ? '#ffffff' : 'currentColor'}
                        stroke={isActive ? branch.category.glowColor : 'none'}
                        strokeWidth="1"
                        className={isActive ? 'animate-pulse' : 'text-teal-300/40'}
                        style={
                          isActive
                            ? { filter: `drop-shadow(0 0 5px ${branch.category.glowColor})` }
                            : undefined
                        }
                      />
                      {/* Mid branch bifurcation junction node */}
                      <circle
                        cx={branch.midX}
                        cy={branch.midY}
                        r={isActive ? 3.2 : 2}
                        fill={isActive ? '#ffffff' : 'currentColor'}
                        className={isActive ? 'animate-ping' : 'text-teal-300/40'}
                        style={
                          isActive
                            ? { filter: `drop-shadow(0 0 8px ${branch.category.glowColor})` }
                            : undefined
                        }
                      />

                      {/* Inactive Branch Filament */}
                      {!isActive && (
                        <path
                          d={branch.pathD}
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="text-teal-400/35"
                          style={{ opacity: 0.32 }}
                        />
                      )}

                      {/* Active Luminous Laser Branch with Energy Dash Flow */}
                      {isActive && (
                        <g>
                          <path
                            d={branch.pathD}
                            stroke={branch.category.glowColor}
                            strokeWidth="8"
                            strokeLinecap="round"
                            strokeOpacity="0.45"
                            style={{ filter: `drop-shadow(0 0 10px ${branch.category.glowColor})` }}
                          />
                          <path
                            d={branch.pathD}
                            stroke={`url(#branch-laser-${branch.id})`}
                            strokeWidth="4"
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 10px ${branch.category.glowColor})` }}
                          />
                          <path
                            d={branch.pathD}
                            stroke="#ffffff"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeDasharray="8 8"
                            className="animate-arc-flow-dash"
                            style={{ filter: 'drop-shadow(0 0 6px #ffffff)' }}
                          />
                          <circle
                            r="3.5"
                            fill="#ffffff"
                            style={{
                              filter: `drop-shadow(0 0 6px #ffffff) drop-shadow(0 0 10px ${branch.category.glowColor})`,
                            }}
                          >
                            <animateMotion
                              path={branch.pathD}
                              dur="0.8s"
                              repeatCount="indefinite"
                            />
                          </circle>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* 8 Arc Category Floating Logo Emblem Nodes */}
              {QUICK_ARC_CATEGORIES.map((cat, index) => {
                const isActive = activeCategoryId === cat.id;

                return (
                  <m.button
                    key={cat.id}
                    type="button"
                    initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                    animate={{
                      scale: isActive ? 1.28 : 1,
                      opacity: 1,
                      x: cat.x,
                      y: cat.y,
                    }}
                    exit={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 24,
                      delay: index * 0.015,
                    }}
                    style={{
                      position: 'absolute',
                      left: 'calc(50% - 24px)',
                      top: 'calc(50% - 24px)',
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      safeVibrate(15);
                      onSelectCategory(cat.id);
                      onClose();
                    }}
                    className={`group pointer-events-auto relative flex items-center justify-center w-12 h-12 rounded-2xl focus:outline-none select-none transition-shadow duration-200 ${
                      isActive ? 'z-30' : 'z-10'
                    }`}
                    aria-label={`${cat.name} (${cat.tag})`}
                    title={cat.name}
                  >
                    {/* Outer Crystal Orbital Ring (Rotates & pulses when magnetically targeted) */}
                    <div
                      className={`pointer-events-none absolute -inset-2.5 rounded-[24px] transition-all duration-300 ${
                        isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                      }`}
                    >
                      <svg
                        className="w-full h-full animate-[spin_4.5s_linear_infinite]"
                        viewBox="0 0 68 68"
                        fill="none"
                      >
                        <circle
                          cx="34"
                          cy="34"
                          r="32"
                          stroke={cat.glowColor}
                          strokeWidth="1.75"
                          strokeDasharray="6 8 3 8"
                        />
                        <circle cx="34" cy="2" r="2.2" fill="#FFFFFF" />
                        <circle cx="34" cy="66" r="1.5" fill="#FFFFFF" opacity="0.8" />
                        <circle cx="2" cy="34" r="1.75" fill={cat.glowColor} />
                        <circle cx="66" cy="34" r="1.75" fill={cat.glowColor} />
                      </svg>

                      {/* Ambient aura glow */}
                      <span
                        className="absolute inset-0 rounded-[24px] blur-md transition-opacity duration-300"
                        style={{
                          backgroundColor: cat.glowColor,
                          opacity: 0.55,
                        }}
                      />
                    </div>

                    {/* Multi-layer Glassmorphic Emblem Badge */}
                    <div
                      className={`relative flex items-center justify-center w-full h-full rounded-2xl overflow-hidden shadow-lg border border-white/35 dark:border-white/25 ring-1 ring-inset ring-white/30 transition-all duration-200 bg-gradient-to-br ${cat.gradient}`}
                      style={{
                        boxShadow: isActive
                          ? `0 0 30px ${cat.glowColor}, 0 8px 24px rgba(0,0,0,0.55)`
                          : '0 4px 14px rgba(0,0,0,0.35)',
                      }}
                    >
                      {/* Top-down Specular Highlight Sheen Curve */}
                      <span
                        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/45 via-white/15 to-transparent rounded-t-[inherit]"
                        aria-hidden="true"
                      />

                      {/* Ambient Bottom Depth Shade */}
                      <span
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/35 to-transparent rounded-b-[inherit]"
                        aria-hidden="true"
                      />

                      {/* Micro Bevel Corner Sheen */}
                      <span
                        className="pointer-events-none absolute top-1 left-1.5 w-3 h-1.5 rounded-full bg-white/60 blur-[0.5px] -rotate-12"
                        aria-hidden="true"
                      />

                      {/* Bespoke Vector Logo Emblem */}
                      <CategoryLogoEmblem
                        category={cat.id}
                        className="relative z-10 w-7 h-7 drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)]"
                      />
                    </div>

                    {/* Floating Micro Urgency Dot Badge */}
                    {cat.expectation.includes('Immediate') && (
                      <span className="pointer-events-none absolute -top-1 -right-1 z-20 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-gradient-to-tr from-rose-600 to-red-400 border border-white shadow-xs" />
                      </span>
                    )}
                  </m.button>
                );
              })}

              {/* Center Hub: Pulsing Crystal Core Morph with Close / Cancel Glyph */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center z-20">
                <div
                  className="absolute -inset-3 rounded-full blur-xl animate-pulse pointer-events-none transition-colors duration-300"
                  style={{
                    backgroundColor: activeCategory
                      ? activeCategory.glowColor
                      : 'rgba(20, 184, 166, 0.45)',
                  }}
                />
                <div
                  className="absolute -inset-2 rounded-full border border-teal-400/40 animate-ping pointer-events-none"
                  style={{ animationDuration: '2.5s' }}
                />
                <m.button
                  type="button"
                  initial={{ scale: 0.85, rotate: -45, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.85, rotate: 45, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 25 }}
                  onClick={onClose}
                  className="group relative pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full overflow-hidden bg-gradient-to-tr from-teal-500 via-emerald-500 to-teal-400 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 text-white shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.85),0_12px_32px_rgba(13,148,136,0.55)] border-[3.5px] border-white/30 dark:border-white/40 active:scale-95 transition-all duration-200 focus:outline-none"
                  aria-label="Cancel quick category selection"
                  title="Close"
                >
                  <span
                    className="pointer-events-none absolute inset-x-2 top-0.5 h-3 bg-gradient-to-b from-white/70 via-white/25 to-transparent rounded-full"
                    aria-hidden="true"
                  />
                  <span
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/25 to-transparent rounded-b-full"
                    aria-hidden="true"
                  />
                  {activeCategory && (
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300 opacity-60"
                      style={{ boxShadow: `inset 0 0 16px ${activeCategory.glowColor}` }}
                    />
                  )}
                  <X className="relative z-10 w-6 h-6 notranslate stroke-[2.75] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] transition-transform duration-200 group-hover:rotate-90 group-active:scale-90" />
                </m.button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </OverlayPortal>
  );
}
