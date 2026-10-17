'use client';

import React, { useEffect } from 'react';
import { X, Pin, Check, Lock, Award, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { UserBadgeProgress } from '@/lib/data/badges';
import { BadgeMedalIcon } from './BadgeMedalIcon';

interface BadgePinningModalProps {
  open: boolean;
  onClose: () => void;
  badges: UserBadgeProgress[];
  pinnedIds: string[];
  onTogglePin: (badgeId: string, willPin: boolean) => Promise<boolean | void>;
  onViewAllBadges: () => void;
}

export function BadgePinningModal({
  open,
  onClose,
  badges,
  pinnedIds,
  onTogglePin,
  onViewAllBadges,
}: BadgePinningModalProps) {
  // Close on escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const earnedBadges = badges.filter((b) => b.earned);
  const otherBadges = badges.filter((b) => !b.earned);

  const handleToggle = async (badge: UserBadgeProgress) => {
    const isPinned = pinnedIds.includes(badge.id) || pinnedIds.includes(badge.key);
    if (!isPinned && pinnedIds.length >= 3) {
      toast.error('Maximum 3 badges can be pinned to your profile header card.');
      return;
    }
    await onTogglePin(badge.id, !isPinned);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pinning-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="relative w-full sm:max-w-lg bg-card border-t sm:border border-border rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden mx-auto my-2 w-12 h-1.5 rounded-full bg-muted-foreground/30 shrink-0" />

        {/* HEADER */}
        <div className="shrink-0 px-5 sm:px-6 py-4 border-b border-border bg-card/95 backdrop-blur-md flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="pinning-modal-title" className="text-base sm:text-lg font-bold text-foreground">
                Pinned Badges
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-primary/10 text-primary border border-primary/20">
                {pinnedIds.length} / 3 pinned
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Select up to 3 badges to display on your profile header
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition touch-target"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* BODY */}
        <div className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4">
          {earnedBadges.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-muted/30 border border-dashed border-border space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Award className="h-6 w-6 notranslate" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-foreground">No Badges Unlocked Yet</h3>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Help neighbors with community requests to earn Bronze, Silver, Gold, and Platinum medals!
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewAllBadges();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition shadow-soft touch-target"
              >
                <span>Browse All Badges</span>
                <ArrowRight className="h-3.5 w-3.5 notranslate" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Your Earned Badges ({earnedBadges.length})
              </h3>
              <div className="space-y-2">
                {earnedBadges.map((badge) => {
                  const isPinned = pinnedIds.includes(badge.id) || pinnedIds.includes(badge.key);
                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                        isPinned
                          ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                          : 'bg-background hover:bg-muted/40 border-border'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <BadgeMedalIcon
                          size="sm"
                          iconName={badge.icon}
                          tier={badge.currentTier}
                          isEarned={badge.earned}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {badge.title}
                          </h4>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <span className="font-semibold text-primary">
                              {badge.currentTierName} Level {badge.currentLevel}
                            </span>
                            <span>•</span>
                            <span>{badge.progressLabel} {badge.unit}</span>
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggle(badge)}
                        disabled={!isPinned && pinnedIds.length >= 3}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 touch-target ${
                          isPinned
                            ? 'bg-primary text-white shadow-2xs hover:bg-primary-hover'
                            : pinnedIds.length >= 3
                            ? 'opacity-40 cursor-not-allowed bg-muted text-muted-foreground border border-border'
                            : 'bg-muted/70 hover:bg-primary/10 hover:text-primary text-foreground border border-border'
                        }`}
                      >
                        {isPinned ? (
                          <>
                            <Check className="h-3.5 w-3.5 notranslate stroke-[2.5]" />
                            <span>Pinned</span>
                          </>
                        ) : (
                          <>
                            <Pin className="h-3.5 w-3.5 notranslate" />
                            <span>Pin</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {otherBadges.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-border/60">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3 notranslate" />
                <span>Locked Badges ({otherBadges.length})</span>
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Locked badges cannot be pinned. Complete community actions to unlock them.
              </p>
              <div className="space-y-1.5">
                {otherBadges.slice(0, 4).map((badge) => (
                  <div
                    key={badge.id}
                    className="p-2.5 rounded-xl bg-muted/20 border border-border/50 flex items-center justify-between opacity-60 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BadgeMedalIcon
                        size="sm"
                        iconName={badge.icon}
                        tier="locked"
                        isEarned={false}
                      />
                      <span className="font-medium text-muted-foreground truncate">
                        {badge.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-muted-foreground/80 shrink-0">
                      {badge.progressLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="shrink-0 px-5 sm:px-6 py-3.5 border-t border-border bg-card/95 backdrop-blur-md flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onViewAllBadges();
            }}
            className="text-xs font-bold text-primary hover:underline touch-target flex items-center gap-1"
          >
            <span>View all badges</span>
            <ArrowRight className="h-3.5 w-3.5 notranslate" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-soft hover:bg-primary-hover transition touch-target"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
