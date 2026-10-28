'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
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

const ARC_RADIUS = 120; // 115px - 125px radius specification
const START_ANGLE = -155; // Upward fan start angle
const END_ANGLE = -25; // Upward fan end angle

const CATEGORY_DEFINITIONS: Array<{
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
    glowColor: 'rgba(244, 63, 94, 0.65)',
    ringClass: 'ring-rose-400 shadow-[0_0_24px_rgba(244,63,94,0.65)]',
    chipClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    expectation: 'Immediate (0-2h)',
  },
  {
    id: 'equipment',
    name: 'Medical Equipment',
    tag: 'Cyan/Blue',
    icon: Stethoscope,
    gradient: 'from-cyan-500 via-teal-600 to-blue-600',
    glowColor: 'rgba(6, 182, 212, 0.65)',
    ringClass: 'ring-cyan-400 shadow-[0_0_24px_rgba(6,182,212,0.65)]',
    chipClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    expectation: 'Urgent (2-4h)',
  },
  {
    id: 'elderly',
    name: 'Elderly Care',
    tag: 'Sky/Blue',
    icon: HeartHandshake,
    gradient: 'from-sky-500 via-blue-600 to-indigo-600',
    glowColor: 'rgba(56, 189, 248, 0.65)',
    ringClass: 'ring-sky-400 shadow-[0_0_24px_rgba(56,189,248,0.65)]',
    chipClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    expectation: 'Same Day / Flexible',
  },
  {
    id: 'transport',
    name: 'Emergency Transit',
    tag: 'Amber/Orange',
    icon: Car,
    gradient: 'from-amber-500 via-amber-600 to-orange-600',
    glowColor: 'rgba(245, 158, 11, 0.65)',
    ringClass: 'ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.65)]',
    chipClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    expectation: 'Within 1-2h',
  },
  {
    id: 'food',
    name: 'Food Support',
    tag: 'Emerald/Green',
    icon: Utensils,
    gradient: 'from-emerald-500 via-emerald-600 to-green-600',
    glowColor: 'rgba(16, 185, 129, 0.65)',
    ringClass: 'ring-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.65)]',
    chipClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    expectation: 'Within 2-4h',
  },
  {
    id: 'medicine',
    name: 'Medicines & Rx',
    tag: 'Violet/Purple',
    icon: Pill,
    gradient: 'from-violet-500 via-purple-600 to-fuchsia-600',
    glowColor: 'rgba(168, 85, 247, 0.65)',
    ringClass: 'ring-violet-400 shadow-[0_0_24px_rgba(168,85,247,0.65)]',
    chipClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    expectation: 'Immediate (0-2h)',
  },
  {
    id: 'books',
    name: 'Books & Education',
    tag: 'Teal',
    icon: BookOpen,
    gradient: 'from-teal-500 via-teal-600 to-emerald-600',
    glowColor: 'rgba(20, 184, 166, 0.65)',
    ringClass: 'ring-teal-400 shadow-[0_0_24px_rgba(20,184,166,0.65)]',
    chipClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    expectation: 'Within 24-48h',
  },
  {
    id: 'other',
    name: 'Other Support',
    tag: 'Slate/Indigo',
    icon: HelpCircle,
    gradient: 'from-indigo-600 via-slate-700 to-slate-800',
    glowColor: 'rgba(99, 102, 241, 0.65)',
    ringClass: 'ring-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.65)]',
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
      let originX = 0;
      let originY = 0;

      if (anchorCenter) {
        originX = anchorCenter.x;
        originY = anchorCenter.y;
      } else if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        originX = rect.left + rect.width / 2;
        originY = rect.top + rect.height / 2;
      } else {
        return null;
      }

      const dx = clientX - originX;
      const dy = clientY - originY;
      const distFromCenter = Math.hypot(dx, dy);

      // Dead zone near center + button
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

      // If within target sensitivity radius (~48px around bubble or in upward radial sector)
      if (minItemDistance <= 52) {
        return closestCategory;
      }

      // Angle check for broad drag sweep
      const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
      if (
        angleDeg >= -175 &&
        angleDeg <= -15 &&
        distFromCenter >= 60 &&
        distFromCenter <= 175
      ) {
        return closestCategory;
      }

      return null;
    },
    [anchorCenter]
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
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center pointer-events-auto touch-none select-none"
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
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Anchor Container positioned centered around the mobile bottom nav center button */}
          <div
            ref={containerRef}
            style={
              anchorCenter
                ? {
                    position: 'fixed',
                    left: `${anchorCenter.x}px`,
                    top: `${anchorCenter.y}px`,
                    transform: 'translate(-50%, -50%)',
                  }
                : undefined
            }
            className={`w-14 h-14 flex items-center justify-center pointer-events-none ${
              anchorCenter
                ? 'z-50'
                : 'relative bottom-[calc(env(safe-area-inset-bottom,0px)+3.75rem)]'
            }`}
          >
            {/* Active Category Floating Label Chip */}
            <div className="absolute -top-[160px] left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center">
              <AnimatePresence mode="wait">
                {activeCategory ? (
                  <m.div
                    key={activeCategory.id}
                    initial={{ opacity: 0, y: 8, scale: 0.92 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.92 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-xl backdrop-blur-md ${activeCategory.chipClass}`}
                  >
                    <activeCategory.icon className="w-4 h-4 notranslate shrink-0" />
                    <span className="text-xs font-bold tracking-wide">
                      {activeCategory.name}
                    </span>
                    <span className="text-[10px] opacity-80 pl-1 border-l border-current">
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
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-700/60 shadow-lg text-slate-300 text-[11px] font-medium backdrop-blur-md"
                  >
                    <Sparkles className="w-3 h-3 text-teal-400 notranslate" />
                    <span>Slide finger or tap category</span>
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            {/* Arc radial outline guide track */}
            <svg
              className="absolute pointer-events-none -left-[112px] -top-[112px] w-[280px] h-[280px] opacity-25"
              viewBox="0 0 280 280"
              fill="none"
            >
              <circle
                cx="140"
                cy="140"
                r={ARC_RADIUS}
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                className="text-teal-400"
              />
            </svg>

            {/* 8 Arc Category Floating Action Items */}
            {QUICK_ARC_CATEGORIES.map((cat, index) => {
              const isActive = activeCategoryId === cat.id;
              const Icon = cat.icon;

              return (
                <m.button
                  key={cat.id}
                  type="button"
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                  animate={{
                    scale: isActive ? 1.25 : 1,
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
                    left: 'calc(50% - 22px)',
                    top: 'calc(50% - 22px)',
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    safeVibrate(15);
                    onSelectCategory(cat.id);
                    onClose();
                  }}
                  className={`pointer-events-auto flex items-center justify-center w-11 h-11 rounded-full shadow-lg border border-white/20 transition-shadow duration-200 focus:outline-none bg-gradient-to-tr ${
                    cat.gradient
                  } ${isActive ? `ring-4 ${cat.ringClass} z-20` : 'z-10'}`}
                  aria-label={`${cat.name} (${cat.tag})`}
                  title={cat.name}
                >
                  <Icon className="w-5 h-5 text-white notranslate drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />

                  {/* Micro rim glow */}
                  <span
                    className={`absolute inset-0 rounded-full transition-opacity duration-200 ${
                      isActive ? 'opacity-100' : 'opacity-0'
                    }`}
                    style={{
                      boxShadow: `0 0 20px ${cat.glowColor}`,
                    }}
                  />
                </m.button>
              );
            })}

            {/* Center Close / Cancel Button */}
            <m.button
              type="button"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              onClick={onClose}
              className="pointer-events-auto z-10 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/80 dark:bg-slate-950/90 border-2 border-white/20 text-white shadow-xl backdrop-blur-md active:scale-95 transition-transform"
              aria-label="Cancel quick category selection"
              title="Close"
            >
              <X className="w-6 h-6 notranslate stroke-[2.75] text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]" />
            </m.button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
