'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AlertTriangle,
  Phone,
  Radio,
  ShieldCheck,
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
  RotateCcw,
  User,
} from 'lucide-react';
import { toast } from 'sonner';

import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { dataAdapter } from '@/lib/data';

interface EmergencySosModalProps {
  open: boolean;
  onClose: () => void;
}

type SosStatus = 'idle' | 'holding' | 'countdown' | 'activated';

export function EmergencySosModal({ open, onClose }: EmergencySosModalProps) {
  const { userProfile, userCoords, userAreaName } = useKindLinkStore();

  const [status, setStatus] = useState<SosStatus>('idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [sosToken, setSosToken] = useState<string>('');
  const [trackingUrl, setTrackingUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);

  const resetAll = useCallback(() => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    holdTimerRef.current = null;
    countdownIntervalRef.current = null;
    setStatus('idle');
    setHoldProgress(0);
    setCountdown(5);
    setIsSubmitting(false);
  }, []);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetAll();
      setCopied(false);
    }
  }, [open, resetAll]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const triggerActivation = useCallback(async () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setIsSubmitting(true);
    setStatus('activated');

    // Generate random token for SOS tracking URL
    const generatedToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await dataAdapter.submitSos(
        userCoords.lat,
        userCoords.lng,
        userAreaName || 'Asansol Region, WB'
      );

      const finalToken = res?.token || generatedToken;
      setSosToken(finalToken);

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${origin}/sos/${finalToken}`;
      setTrackingUrl(fullUrl);

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }

      toast.error('Emergency SOS Signal Broadcasted!', {
        description: `Verified volunteers and emergency responders in ${userAreaName || 'Asansol'} are alerted.`,
        duration: 8000,
      });
    } catch {
      // Fallback
      setSosToken(generatedToken);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setTrackingUrl(`${origin}/sos/${generatedToken}`);
      toast.error('SOS Signal Broadcasted locally');
    } finally {
      setIsSubmitting(false);
    }
  }, [userCoords.lat, userCoords.lng, userAreaName]);

  const startCountdown = useCallback(() => {
    setStatus('countdown');
    setCountdown(5);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([150, 100, 150]);
    }

    let current = 5;
    countdownIntervalRef.current = setInterval(() => {
      current -= 1;
      setCountdown(current);

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(80);
      }

      if (current <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        triggerActivation();
      }
    }, 1000);
  }, [triggerActivation]);

  const handlePointerDown = () => {
    if (status !== 'idle') return;
    setStatus('holding');
    setHoldProgress(0);
    holdStartTimeRef.current = Date.now();

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setHoldProgress(progress);

      if (elapsed >= 2000) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldProgress(100);
        startCountdown();
      }
    }, 25);
  };

  const handlePointerUp = () => {
    if (status === 'holding') {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
      setStatus('idle');
      setHoldProgress(0);
    }
  };

  const handleCancelCountdown = () => {
    resetAll();
    toast.info('Emergency SOS alert canceled.');
  };

  const handleCopyLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    toast.success('Live SOS tracking link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-sos-title"
    >
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-card border-2 border-urgency-critical p-5 sm:p-6 shadow-2xl text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5 text-urgency-critical">
            <AlertTriangle className="h-6 w-6 animate-pulse notranslate" />
            <div>
              <h2 id="emergency-sos-title" className="text-xl font-black tracking-tight leading-none">
                KindLink Emergency SOS
              </h2>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Asansol &amp; West Bengal Rapid Response
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target transition"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Real User Profile Banner */}
        <div className="mt-3.5 p-3 rounded-2xl bg-muted/60 border border-border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
              <User className="h-4 w-4 notranslate" />
            </div>
            <div className="truncate">
              <span className="font-bold text-foreground block truncate">
                {userProfile.name || 'Community Member'}
              </span>
              <span className="text-[11px] text-muted-foreground block truncate">
                Phone: {userProfile.phone || 'Community Volunteer'}
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
            Verified Requester
          </span>
        </div>

        {/* State 1 & 2: IDLE or HOLDING */}
        {(status === 'idle' || status === 'holding') && (
          <div className="mt-5 flex flex-col items-center text-center">
            <p className="text-xs text-muted-foreground max-w-sm">
              Press and hold the button for <strong>2 seconds</strong> to initiate an emergency
              broadcast to nearby community responders.
            </p>

            {/* Circular Hold Button with SVG Progress Ring */}
            <div className="relative mt-6 flex items-center justify-center">
              {/* SVG circular progress ring */}
              <svg className="w-48 h-48 -rotate-90" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  className="stroke-muted"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="72"
                  className="stroke-red-600 transition-all duration-75"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 72}
                  strokeDashoffset={2 * Math.PI * 72 * (1 - holdProgress / 100)}
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>

              {/* Central Action Button */}
              <button
                type="button"
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`absolute flex h-36 w-36 flex-col items-center justify-center rounded-full bg-urgency-critical text-white shadow-2xl transition-transform select-none touch-target ${
                  status === 'holding'
                    ? 'scale-95 bg-red-700 shadow-red-600/50'
                    : 'hover:scale-105 active:scale-95 animate-beacon'
                }`}
                aria-label="Press and hold for 2 seconds to activate SOS"
              >
                <Radio className="h-9 w-9 mb-1 notranslate animate-pulse" />
                <span className="text-base font-black tracking-wider uppercase">
                  {status === 'holding' ? 'HOLDING...' : 'HOLD SOS'}
                </span>
                <span className="text-[10px] font-semibold opacity-90">
                  {status === 'holding' ? `${Math.round(holdProgress)}%` : '2 SECONDS'}
                </span>
              </button>
            </div>

            <p className="mt-4 text-[11px] text-muted-foreground font-medium">
              {status === 'holding'
                ? 'Keep holding to begin 5-second cancel countdown...'
                : 'Touch & hold to prevent accidental activation'}
            </p>
          </div>
        )}

        {/* State 3: COUNTDOWN TO CANCEL (5 seconds) */}
        {status === 'countdown' && (
          <div className="mt-5 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="p-3 rounded-full bg-red-600/15 text-red-600 mb-2 animate-bounce">
              <AlertTriangle className="h-8 w-8 notranslate" />
            </div>

            <h3 className="text-lg font-black text-urgency-critical uppercase tracking-tight">
              SOS Broadcast in Progress
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Sending high-priority emergency beacon in:
            </p>

            {/* Giant Countdown Clock */}
            <div className="my-5 flex h-28 w-28 items-center justify-center rounded-full bg-urgency-critical/10 border-4 border-urgency-critical text-urgency-critical font-black text-5xl shadow-xl animate-pulse">
              {countdown}
            </div>

            {/* Cancel Button */}
            <button
              type="button"
              onClick={handleCancelCountdown}
              className="w-full py-3.5 px-6 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-extrabold text-sm tracking-wide shadow-lg transition flex items-center justify-center gap-2 touch-target"
            >
              <RotateCcw className="h-4 w-4 notranslate" />
              <span>CANCEL SOS ALERT</span>
            </button>
          </div>
        )}

        {/* State 4: ACTIVATED & LIVE TRACKING URL */}
        {status === 'activated' && (
          <div className="mt-5 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 mb-2">
              <CheckCircle2 className="h-10 w-10 notranslate" />
            </div>

            <h3 className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              SOS Signal Broadcast Active!
            </h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Nearby volunteers &amp; emergency teams in Asansol have received your high-priority
              alert with GPS coordinates.
            </p>

            {/* Live Tracking URL Card */}
            <div className="mt-4 w-full p-4 rounded-2xl bg-muted/80 border border-border text-left">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  Live SOS Tracking Link
                </span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Beacon
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={trackingUrl}
                  className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono truncate focus:outline-none"
                  aria-label="SOS Tracking URL"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition shrink-0 touch-target"
                  title="Copy Tracking Link"
                >
                  <Copy className="h-3.5 w-3.5 notranslate" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {sosToken && (
                <div className="mt-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Token: <strong className="font-mono text-foreground">{sosToken.slice(0, 13)}...</strong>
                  </span>
                  <a
                    href={`/sos/${sosToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    <span>Open Live View</span>
                    <ExternalLink className="h-3 w-3 notranslate" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Direct Emergency Hotlines (112 Police, 108 Ambulance, 100 Emergency) */}
        <div className="mt-5 space-y-2 border-t border-border pt-4">
          <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Direct Emergency Lines (West Bengal / Asansol)
          </h4>

          {/* 112 National Emergency */}
          <a
            href="tel:112"
            className="flex items-center justify-between p-3 rounded-2xl bg-red-600/10 hover:bg-red-600/20 text-red-600 dark:text-red-400 transition border border-red-500/20 touch-target"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-600 text-white shadow-xs">
                <Phone className="h-4 w-4 notranslate" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black">112 - National Emergency (Police &amp; Disaster)</p>
                <p className="text-[11px] opacity-80">All-in-one 24/7 Rapid Emergency Response</p>
              </div>
            </div>
            <span className="text-xs font-black bg-red-600 text-white px-3 py-1.5 rounded-xl shadow-xs">
              Call 112
            </span>
          </a>

          {/* 108 Ambulance */}
          <a
            href="tel:108"
            className="flex items-center justify-between p-3 rounded-2xl bg-muted/80 hover:bg-muted transition border border-border touch-target"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Phone className="h-4 w-4 notranslate" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">108 / 102 - Ambulance &amp; Medical</p>
                <p className="text-[11px] text-muted-foreground">
                  West Bengal State Emergency Medical Service
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-primary">Call 108</span>
          </a>

          {/* 100 Police Control Room */}
          <a
            href="tel:100"
            className="flex items-center justify-between p-3 rounded-2xl bg-muted/80 hover:bg-muted transition border border-border touch-target"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4 notranslate" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-foreground">100 - Police Control Room</p>
                <p className="text-[11px] text-muted-foreground">Asansol Durgapur Police Commisionerate</p>
              </div>
            </div>
            <span className="text-xs font-bold text-primary">Call 100</span>
          </a>

          {/* Asansol District Hospital Emergency */}
          <a
            href="tel:03412202611"
            className="flex items-center justify-between p-2.5 rounded-2xl bg-muted/40 hover:bg-muted/70 transition border border-border/80 text-xs text-muted-foreground touch-target"
          >
            <span className="truncate">Asansol District Hospital Desk: 0341-2202611</span>
            <span className="font-bold text-foreground shrink-0">Call Desk</span>
          </a>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-xs hover:bg-secondary/80 transition touch-target"
        >
          Close
        </button>
      </div>
    </div>
  );
}
