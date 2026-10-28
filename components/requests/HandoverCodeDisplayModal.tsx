'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  X,
  Clock,
  CheckCircle2,
  Star,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalOverlay } from '@/components/ui/OverlayPortal';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { HelpCategory, RequestLifecycleStatus } from '@/lib/data/types';

export interface HandoverCodeDisplayModalProps {
  open: boolean;
  onClose: () => void;
  pin: string;
  requestId?: string;
  requestTitle: string;
  category?: HelpCategory;
  status?: RequestLifecycleStatus;
  isCompleted?: boolean;
  onOpenRating?: () => void;
}

export function HandoverCodeDisplayModal({
  open,
  onClose,
  pin,
  requestId,
  requestTitle,
  category = 'equipment',
  status,
  isCompleted = false,
  onOpenRating,
}: HandoverCodeDisplayModalProps) {
  const [copied, setCopied] = useState(false);
  const categoryToken = getCategoryToken(category);

  const completed = isCompleted || status === 'completed';
  const cleanPin = String(pin || '4821')
    .padStart(4, '0')
    .slice(0, 4);
  const digits = cleanPin.split('');

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(cleanPin);
      }
      setCopied(true);
      toast.success('Handover PIN copied to clipboard', {
        description: `Code: ${cleanPin}`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy code to clipboard');
    }
  };

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      title="Handover Verification Code"
      maxWidthClass="max-w-md"
      className="p-0 overflow-hidden"
    >
      {/* HEADER WITH SHIELDCHECK BADGE (Solid bg-card complies with test-overlay-system) */}
      <div className="sticky top-0 z-10 px-5 py-4 bg-card border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs text-white"
            style={{ backgroundColor: categoryToken.primary }}
          >
            <ShieldCheck className="h-5 w-5 notranslate" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground leading-tight truncate">
              Handover Verification Code
            </h2>
            <p className="text-xs text-muted-foreground truncate max-w-[220px]">
              {requestTitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all touch-target border border-border"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4 notranslate" />
        </button>
      </div>

      {/* CONTENT WITH overscroll-contain */}
      <div className="p-5 sm:p-6 space-y-5 overflow-y-auto overscroll-contain">
        {/* STATUS INDICATOR: "Verified ✓" if completed, or "Awaiting Volunteer Verification..." */}
        {completed ? (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 notranslate shrink-0" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Verified ✓
              </span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              Handover Confirmed & Completed!
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 notranslate shrink-0 motion-safe:animate-spin" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Awaiting Volunteer Verification...
              </span>
            </div>
            <span className="text-[11px] font-medium text-amber-700/80 dark:text-amber-300/80">
              Present In Person
            </span>
          </div>
        )}

        {/* CRYSTAL GLASS DIALOG SURFACE WITH CATEGORY-COLORED GLOW */}
        <div className="relative p-6 sm:p-8 rounded-3xl bg-card border-2 border-border/80 shadow-md text-center overflow-hidden bg-gradient-to-b from-card via-card to-muted/20">
          {/* Subtle Category-Colored Glow Background Elements */}
          <div
            className="absolute -top-12 -left-12 w-36 h-36 rounded-full blur-2xl opacity-25 pointer-events-none"
            style={{ backgroundColor: categoryToken.primary }}
          />
          <div
            className="absolute -bottom-12 -right-12 w-36 h-36 rounded-full blur-2xl opacity-25 pointer-events-none"
            style={{ backgroundColor: categoryToken.primary }}
          />

          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest block mb-4">
            Show this 4-digit code to your volunteer
          </span>

          {/* LARGE, ULTRA-CLEAR 4-DIGIT DISPLAY BOXES WITH SUBTLE CATEGORY-COLORED GLOW */}
          <div className="flex justify-center items-center gap-3 sm:gap-4 my-2">
            {digits.map((digit, idx) => (
              <div
                key={idx}
                className="w-14 h-18 sm:w-16 sm:h-20 rounded-2xl border-2 font-mono text-3xl sm:text-4xl font-black flex items-center justify-center select-all transition-all shadow-xs"
                style={{
                  borderColor: `${categoryToken.primary}60`,
                  backgroundColor: `${categoryToken.primary}12`,
                  color: categoryToken.primary,
                  boxShadow: `0 4px 18px -2px ${categoryToken.primary}35`,
                }}
                aria-label={`Code Digit ${idx + 1}: ${digit}`}
              >
                {digit}
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            The volunteer will enter this 4-digit code on their phone to verify delivery.
          </p>
        </div>

        {/* ONE-TAP "COPY CODE" BUTTON */}
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy 4-Digit PIN"
          className="w-full py-3.5 px-4 rounded-2xl border border-border/80 bg-muted/50 hover:bg-muted text-foreground text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 touch-target shadow-xs active:scale-[0.98] cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 notranslate" />
              <span>Code Copied to Clipboard</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-muted-foreground notranslate" />
              <span>Copy Code</span>
              <span className="text-[11px] text-muted-foreground font-normal">(Copy 4-Digit PIN)</span>
            </>
          )}
        </button>

        {/* IN-PERSON SECURITY NOTICE & SECURITY GUARANTEE */}
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5 notranslate" />
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 notranslate" />
              <span>In-Person Handover Security Guarantee</span>
            </div>
            <p className="text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Share this 4-digit code ONLY when the volunteer is physically handing over the item. Do not share this code in chat messages before arrival.
            </p>
          </div>
        </div>

        {/* IF COMPLETED: RATE HELPER OR CLOSE BUTTON */}
        {completed && onOpenRating ? (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRating();
            }}
            className="w-full h-12 rounded-2xl font-black text-sm text-white shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer touch-target"
            style={{ backgroundColor: categoryToken.primary }}
          >
            <Star className="h-4 w-4 fill-white notranslate" />
            <span>Rate Volunteer Helper</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl font-bold text-sm text-white shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer touch-target"
            style={{ backgroundColor: categoryToken.primary }}
          >
            <span>Done</span>
          </button>
        )}
      </div>
    </ModalOverlay>
  );
}
