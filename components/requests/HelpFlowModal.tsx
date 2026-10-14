'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  HeartHandshake,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Navigation,
  Bike,
  Footprints,
  Car,
  Sparkles,
  Send,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpRequest, TravelMode } from '@/lib/data/types';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { calculateETA, formatETA } from '@/lib/data/distance';

interface HelpFlowModalProps {
  request: HelpRequest | null;
  open: boolean;
  onClose: () => void;
  onHelpSubmitted?: () => void;
}

export function HelpFlowModal({
  request,
  open,
  onClose,
  onHelpSubmitted,
}: HelpFlowModalProps) {
  const { userProfile, travelMode, setTravelMode, offerHelp, setCurrentView } =
    useKindLinkStore();

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (!open || !request) return null;

  const isVerified = userProfile?.verificationState === 'verified';
  const etaMinutes = calculateETA(request.distanceKm, travelMode);

  const presetMessages = [
    'I can reach within 15 minutes',
    'I have an active donor card and am ready',
    'Equipment is clean and sanitized',
    'I am available right now to assist',
    'I have a vehicle ready for transit',
  ];

  const handlePresetClick = (preset: string) => {
    if (!message) {
      setMessage(preset);
    } else {
      setMessage((prev) => `${prev} · ${preset}`);
    }
  };

  const handleVerifyRedirect = () => {
    onClose();
    setCurrentView('profile');
    toast.info('Complete Your Identity Verification', {
      description: 'Upload your College or Government ID to unlock volunteer aid.',
    });
  };

  const handleConfirmHelp = async () => {
    if (!isVerified) {
      handleVerifyRedirect();
      return;
    }

    setIsSubmitting(true);
    try {
      await offerHelp(request.id, message || 'I am ready to help with this request!');
      toast.success('Aid Offer Submitted to Requester!', {
        description: `${request.contactName} will review your offer. Masked contact details unlock upon acceptance.`,
      });
      if (onHelpSubmitted) onHelpSubmitted();
      onClose();
    } catch (err: any) {
      toast.error('Failed to submit offer', {
        description: err.message || 'Please check your connection and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-flow-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-card border border-border/80 dark:border-white/10 p-6 shadow-2xl text-card-foreground max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-border/80">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  request.urgency === 'critical'
                    ? 'bg-rose-500/15 text-rose-600 border border-rose-500/20'
                    : request.urgency === 'high'
                    ? 'bg-amber-500/15 text-amber-600 border border-amber-500/20'
                    : 'bg-blue-500/15 text-blue-600 border border-blue-500/20'
                }`}
              >
                <AlertTriangle className="h-3 w-3 notranslate" />
                {request.urgency}
              </span>
              <span className="text-xs font-bold text-muted-foreground uppercase">
                {request.category}
              </span>
            </div>
            <h2 id="help-flow-title" className="text-lg font-bold text-foreground mt-1">{request.title}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 touch-target focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Proximity & ETA calculation */}
          <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-foreground flex items-center gap-1.5">
                <Navigation className="h-4 w-4 text-primary notranslate" />
                <span>Distance: {request.distanceKm} km away</span>
              </span>
              <span className="font-black text-primary text-sm">
                ETA: {formatETA(etaMinutes)}
              </span>
            </div>

            <div className="flex gap-2">
              {(['bike', 'walking', 'car'] as TravelMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTravelMode(mode)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition-all active:scale-95 touch-target ${
                    travelMode === mode
                      ? 'border-primary bg-primary text-white shadow-xs font-bold'
                      : 'border-border/80 bg-card text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {mode === 'bike' && <Bike className="h-3.5 w-3.5 notranslate" />}
                  {mode === 'walking' && <Footprints className="h-3.5 w-3.5 notranslate" />}
                  {mode === 'car' && <Car className="h-3.5 w-3.5 notranslate" />}
                  <span className="capitalize">{mode}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Verification Guard Card */}
          {!isVerified ? (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                <ShieldAlert className="h-5 w-5 notranslate" />
                <span>Identity Verification Required</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                To safeguard patients and family members in Asansol, only verified community volunteers can submit aid offers. Verification takes only 2 minutes by uploading your Student ID or Government ID.
              </p>
              <button
                type="button"
                onClick={handleVerifyRedirect}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all active:scale-95 shadow-soft"
              >
                <ShieldCheck className="h-4 w-4 notranslate" />
                <span>Get Verified to Help</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Verified Volunteer Badge */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold">
                  <ShieldCheck className="h-4 w-4 notranslate" />
                  <span>Verified Volunteer ({userProfile.name})</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 bg-background px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Rating: {userProfile.rating.toFixed(1)} ★
                </span>
              </div>

              {/* Message Input & Presets */}
              <div>
                <label className="text-xs font-bold text-foreground block mb-1.5">
                  Message for {request.contactName}
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. I am 10 mins away from Asansol District Hospital with my donor card ready..."
                  className="w-full p-3.5 rounded-2xl border border-border/80 bg-background text-foreground text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />

                <div className="mt-2 flex flex-wrap gap-1.5">
                  {presetMessages.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetClick(p)}
                      className="px-2.5 py-1 rounded-lg border border-border/80 bg-muted/60 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all active:scale-95"
                    >
                      + {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confirmation Button */}
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl border border-border/80 bg-card text-xs font-semibold hover:bg-muted transition-all active:scale-95 touch-target"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmHelp}
                  disabled={isSubmitting}
                  className="flex-2 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3 px-5 text-sm font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 touch-target disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin notranslate" />
                  ) : (
                    <HeartHandshake className="h-4 w-4 notranslate" />
                  )}
                  <span>I Can Help</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
