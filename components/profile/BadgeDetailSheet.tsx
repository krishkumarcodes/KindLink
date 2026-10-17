'use client';

import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  Pin,
  PinOff,
  CheckCircle2,
  Lock,
  Sparkles,
  Calendar,
  Compass,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Award,
} from 'lucide-react';
import { UserBadgeProgress, BadgeTier, BadgeLevelThreshold } from '@/lib/data/badges';
import { BadgeMedalIcon } from './BadgeMedalIcon';

interface BadgeDetailSheetProps {
  badge: UserBadgeProgress | null;
  open: boolean;
  onClose: () => void;
  onTogglePin: (badgeId: string, willPin: boolean) => Promise<boolean | void>;
  isPinned: boolean;
  pinnedCount: number;
  reduceMotion?: boolean;
}

export function BadgeDetailSheet({
  badge,
  open,
  onClose,
  onTogglePin,
  isPinned,
  pinnedCount,
  reduceMotion = false,
}: BadgeDetailSheetProps) {
  const [isPinning, setIsPinning] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Close on Escape key & lock scroll
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Trigger celebration on initial open if earned
  useEffect(() => {
    if (open && badge?.earned) {
      triggerCelebration();
    }
  }, [open, badge?.id, badge?.earned]);

  // Celebration animation (respects reduced motion)
  const triggerCelebration = () => {
    const prefersReducedMotion =
      reduceMotion ||
      (typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    setIsCelebrating(true);

    if (prefersReducedMotion) {
      // Gentle pulse only, ends after 1.5s
      const timer = setTimeout(() => setIsCelebrating(false), 1500);
      return () => clearTimeout(timer);
    }

    // Canvas confetti burst
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ['#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ec4899', '#3b82f6'];
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      alpha: number;
      rotation: number;
      rotationSpeed: number;
      shape: 'circle' | 'rect';
    }[] = [];

    const centerX = canvas.width / 2;
    const centerY = canvas.height * 0.45;

    for (let i = 0; i < 48; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: 3 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 8,
        shape: Math.random() > 0.5 ? 'circle' : 'rect',
      });
    }

    let animationId: number;
    let startTime = performance.now();

    const render = (time: number) => {
      const elapsed = time - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.15; // vertical acceleration
        p.vx *= 0.98; // air resistance
        p.alpha = Math.max(0, 1 - elapsed / 1400);
        p.rotation += p.rotationSpeed;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        }
        ctx.restore();
      });

      if (elapsed < 1400) {
        animationId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setIsCelebrating(false);
      }
    };

    animationId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationId);
    };
  };

  if (!open || !badge) return null;

  const handlePinClick = async () => {
    if (!badge.earned) return;
    setIsPinning(true);
    try {
      await onTogglePin(badge.id, !isPinned);
    } finally {
      setIsPinning(false);
    }
  };

  const tierColors: Record<BadgeTier | 'locked', string> = {
    bronze: 'text-amber-700 bg-amber-500/10 border-amber-600/30',
    silver: 'text-slate-500 bg-slate-500/10 border-slate-400/30 dark:text-slate-300',
    gold: 'text-amber-500 bg-amber-500/10 border-amber-500/30',
    platinum: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/30 dark:text-cyan-400',
    locked: 'text-muted-foreground bg-muted border-border',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-sheet-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-h-[90vh] sm:max-h-[85vh] rounded-t-[28px] sm:rounded-3xl bg-card border-t sm:border border-border/80 shadow-2xl flex flex-col overflow-hidden sm:max-w-lg transition-all duration-300 animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-95"
      >
        {/* Celebration Canvas Overlay */}
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 z-20 h-full w-full"
        />

        {/* Mobile Drag Handle */}
        <div
          className="w-full pt-3 pb-1 flex justify-center sm:hidden select-none"
          aria-hidden="true"
        >
          <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Sticky Header with Title and Close Button */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 border-b border-border/80 bg-card/95 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Badge Details
            </span>
            <span
              className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                tierColors[badge.currentTier]
              }`}
            >
              {badge.earned ? badge.currentTierName : 'Locked'}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Badge Details"
            className="h-11 w-11 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary select-none touch-target"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 pb-8">
          {/* Badge Showcase Hero */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div
              className={`relative transition-transform duration-500 ${
                isCelebrating ? 'scale-110' : ''
              }`}
            >
              <BadgeMedalIcon
                iconName={badge.icon}
                tier={badge.currentTier}
                size="xl"
                isEarned={badge.earned}
                className={isCelebrating ? 'ring-4 ring-primary/40' : ''}
              />

              {badge.isPinned && (
                <div
                  title="Pinned to profile header"
                  className="absolute -top-1 -right-1 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md ring-2 ring-card"
                >
                  <Pin className="h-3.5 w-3.5 fill-current notranslate" />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <h2
                id="badge-sheet-title"
                className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight"
              >
                {badge.title}
              </h2>
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                  {badge.category}
                </span>
                {badge.earned && (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5 notranslate" />
                    <span>Unlocked</span>
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-sm">
              {badge.description}
            </p>

            {/* Re-trigger celebration button if unlocked */}
            {badge.earned && (
              <button
                type="button"
                onClick={triggerCelebration}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition touch-target"
              >
                <Sparkles className="h-3 w-3 notranslate" />
                <span>Celebrate Achievement</span>
              </button>
            )}
          </div>

          {/* Honest Note for Healthcare Badges */}
          {badge.medicalDisclaimer && (
            <div className="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-3.5 flex items-start gap-2.5 text-xs text-sky-800 dark:text-sky-200">
              <ShieldAlert className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400 mt-0.5 notranslate" />
              <div className="space-y-0.5">
                <span className="font-bold text-sky-900 dark:text-sky-100">Honest Notice:</span>
                <p className="leading-relaxed">{badge.medicalDisclaimer}</p>
              </div>
            </div>
          )}

          {/* How to Earn */}
          <div className="rounded-2xl border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Compass className="h-4 w-4 text-primary notranslate" />
              <span>How to Earn</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{badge.howToEarn}</p>
          </div>

          {/* Level Ladder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <TrendingUp className="h-4 w-4 text-teal-600 notranslate" />
                <span>Level Ladder & Thresholds</span>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {badge.levels.length === 1 ? '1 Level' : `${badge.levels.length} Tiers`}
              </span>
            </div>

            <div className="space-y-2.5">
              {badge.levels.map((lvl) => {
                const isAchieved = badge.currentValue >= lvl.threshold;
                const isCurrentTarget = !isAchieved && badge.nextThreshold === lvl.threshold;

                return (
                  <div
                    key={lvl.level}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isAchieved
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : isCurrentTarget
                        ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/60 bg-muted/10 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          isAchieved
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : isCurrentTarget
                            ? 'bg-primary/15 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isAchieved ? (
                          <CheckCircle2 className="h-4 w-4 notranslate" />
                        ) : isCurrentTarget ? (
                          <Award className="h-4 w-4 notranslate" />
                        ) : (
                          <Lock className="h-3.5 w-3.5 notranslate" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-bold text-foreground">
                            {lvl.tierName}
                          </h4>
                          <span className="text-[10px] text-muted-foreground">
                            (Level {lvl.level})
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          {lvl.threshold} {badge.unit}
                        </p>
                      </div>
                    </div>

                    <div>
                      {isAchieved ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Achieved
                        </span>
                      ) : isCurrentTarget ? (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          Next Goal
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-muted-foreground/70">
                          Locked
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Progress & Next Goal */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">Current Progress</span>
              <span className="font-extrabold text-primary font-mono">
                {badge.progressLabel} {badge.unit}
              </span>
            </div>

            {/* Progress bar strictly bounded <= 100% */}
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  badge.earned ? 'bg-emerald-500' : 'bg-primary'
                }`}
                style={{ width: `${badge.progressPercent}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{badge.progressPercent}% Completed</span>
              {badge.nextTierName ? (
                <span className="flex items-center gap-1 text-foreground font-medium">
                  <span>
                    {Math.max(0, badge.nextThreshold - badge.currentValue)} {badge.unit} left to{' '}
                    <strong>{badge.nextTierName}</strong>
                  </span>
                  <ArrowRight className="h-3 w-3 notranslate" />
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  Highest Tier Achieved!
                </span>
              )}
            </div>
          </div>

          {/* Pin to Profile Action Button */}
          <div className="pt-2">
            <button
              type="button"
              disabled={!badge.earned || isPinning}
              onClick={handlePinClick}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-soft touch-target ${
                !badge.earned
                  ? 'bg-muted text-muted-foreground cursor-not-allowed border border-border'
                  : isPinned
                  ? 'bg-card border-2 border-primary text-primary hover:bg-primary/5'
                  : 'bg-primary text-primary-foreground hover:bg-primary/90'
              }`}
            >
              {isPinned ? (
                <>
                  <PinOff className="h-4 w-4 notranslate" />
                  <span>Unpin from Profile Header</span>
                </>
              ) : (
                <>
                  <Pin className="h-4 w-4 notranslate" />
                  <span>
                    Pin to Profile Header ({pinnedCount}/3 pinned)
                  </span>
                </>
              )}
            </button>

            {!badge.earned && (
              <p className="text-center text-[11px] text-muted-foreground mt-2">
                Earn this badge first to pin it to your profile header.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
