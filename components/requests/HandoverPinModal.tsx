'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { ModalOverlay } from '@/components/ui/OverlayPortal';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { HelpCategory } from '@/lib/data/types';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';

export interface HandoverPinModalProps {
  open: boolean;
  onClose: () => void;
  requestId: string;
  requestTitle: string;
  category?: HelpCategory;
  requesterName?: string;
  onSuccess?: () => void;
}

export function HandoverPinModal({
  open,
  onClose,
  requestId,
  requestTitle,
  category = 'equipment',
  requesterName = 'the requester',
  onSuccess,
}: HandoverPinModalProps) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const categoryToken = getCategoryToken(category);
  const { updateRequestStatus, fetchLiveRequests, fetchLiveStats } = useKindLinkStore();

  // Reset inputs when opened
  useEffect(() => {
    if (open) {
      setDigits(['', '', '', '']);
      setErrorMsg(null);
      setIsSuccess(false);
      setIsSubmitting(false);
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 150);
    }
  }, [open]);

  const handleChange = (index: number, val: string) => {
    setErrorMsg(null);
    const cleaned = val.replace(/\D/g, '');

    if (!cleaned) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Handle multi-character paste or typed string
    if (cleaned.length > 1) {
      const chars = cleaned.slice(0, 4).split('');
      const newDigits = [...digits];
      chars.forEach((char, i) => {
        if (index + i < 4) {
          newDigits[index + i] = char;
        }
      });
      setDigits(newDigits);
      const nextIdx = Math.min(3, index + chars.length);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned[cleaned.length - 1];
    setDigits(newDigits);

    // Auto-focus next input
    if (cleaned && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      } else if (digits[index]) {
        e.preventDefault();
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (!pasteData) return;
    const chars = pasteData.split('');
    const newDigits = ['', '', '', ''];
    chars.forEach((char, i) => {
      newDigits[i] = char;
    });
    setDigits(newDigits);
    const focusIdx = Math.min(3, chars.length);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullPin = digits.join('');
    if (fullPin.length !== 4) {
      setErrorMsg('Please enter all 4 digits of the handover PIN.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await dataAdapter.verifyHandoverPin(requestId, fullPin);

      if (!res.success) {
        setErrorMsg(
          res.error || 'Incorrect PIN. Please ask the requester for the 4-digit PIN on their screen.'
        );
        setIsSubmitting(false);
        return;
      }

      // Success: Haptic celebration & immediate request status update to 'completed'
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([40, 60, 100]);
      }
      setIsSuccess(true);
      toast.success('Handover confirmed! Request completed.');

      // Immediate store status update
      await updateRequestStatus(requestId, 'completed');
      await fetchLiveRequests();
      await fetchLiveStats();

      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check your network connection.');
      setIsSubmitting(false);
    }
  };

  const isFull = digits.every((d) => d.length === 1);

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      title="Verify Handover Confirmation PIN"
      maxWidthClass="max-w-md"
      className="p-0 overflow-hidden"
    >
      {/* HEADER (Solid bg-card, strictly complies with test-overlay-system) */}
      <div className="sticky top-0 z-10 px-5 py-4 bg-card border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-xs text-white"
            style={{ backgroundColor: categoryToken.primary }}
          >
            <KeyRound className="h-5 w-5 notranslate" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight text-foreground leading-tight">
              Confirm Handover
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
        {isSuccess ? (
          /* CELEBRATORY CHECKMARK & SUCCESS ANIMATION */
          <div className="py-8 text-center space-y-4 animate-in zoom-in-95 duration-300">
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 motion-safe:animate-ping opacity-75" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 shadow-lg">
                <CheckCircle2 className="h-12 w-12 notranslate" />
              </div>
              <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-500 motion-safe:animate-bounce" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                <span>Handover Verified!</span>
              </div>
              <h3 className="text-lg font-black text-foreground pt-1">
                Request Completed
              </h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                Delivery has been securely confirmed. Thank you for making a positive impact in our community!
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* INSTRUCTION CARD WITH CLEAR HELPER TEXT */}
            <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Lock className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
                <span>Ask {requesterName} for their 4-Digit PIN</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Enter the 4-digit code shown on the requester&apos;s phone to verify and complete the handover.
              </p>
            </div>

            {/* 4 DIGIT AUTO-ADVANCING INPUT BOXES */}
            <div className="flex justify-center items-center gap-3 sm:gap-4 py-2">
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  disabled={isSubmitting}
                  className={`w-14 h-16 sm:w-16 sm:h-18 text-center text-2xl sm:text-3xl font-black rounded-2xl border-2 bg-card text-foreground transition-all shadow-xs outline-none focus:scale-105 ${
                    errorMsg
                      ? 'border-rose-500/80 bg-rose-500/5 text-rose-600'
                      : digit
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50 focus:border-primary'
                  }`}
                  aria-label={`PIN Digit ${idx + 1}`}
                />
              ))}
            </div>

            {/* ERROR MESSAGE */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-rose-600 dark:text-rose-400 text-xs animate-in shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 notranslate" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={!isFull || isSubmitting}
              className="w-full h-13 rounded-2xl font-black text-sm text-white shadow-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer touch-target"
              style={{
                backgroundColor: isFull ? categoryToken.primary : undefined,
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin notranslate" />
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5 notranslate" />
                  <span>Confirm Handover & Complete</span>
                </>
              )}
            </button>

            {/* REASSURANCE NOTE */}
            <p className="text-[11px] text-center text-muted-foreground">
              Once verified, the request is marked completed and both parties can leave a trust rating.
            </p>
          </form>
        )}
      </div>
    </ModalOverlay>
  );
}
