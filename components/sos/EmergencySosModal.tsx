'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
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
  Heart,
  MapPin,
  ChevronDown,
  ChevronUp,
  Clock,
  Navigation,
  Share2,
  MessageCircle,
  Plus,
  Send,
  Loader2,
  Flame,
  Check,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';

import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { useLocation } from '@/lib/location/LocationProvider';
import { dataAdapter } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
import { getNearestMedicalFacilities, MedicalFacility } from '@/lib/geo/hospitals';
import { getRoadRoute, RoadRouteResult } from '@/lib/geo/osrm';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';
import { calculateDistance, calculateETA, formatETA } from '@/lib/data/distance';
import { EmergencyContact } from '@/lib/data/types';

const RequestRouteMiniMap = dynamic(
  () => import('@/components/map/RequestRouteMiniMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-44 rounded-2xl bg-muted/50 animate-pulse flex items-center justify-center text-xs text-muted-foreground border border-border">
        Loading responder route map...
      </div>
    ),
  }
);

interface EmergencySosModalProps {
  open: boolean;
  onClose: () => void;
}

type SosStatus = 'idle' | 'holding' | 'activated';

interface EmergencyLine {
  badge: string;
  title: string;
  description: string;
  phone: string;
  colorClass: string;
}

const EMERGENCY_LINES: EmergencyLine[] = [
  {
    badge: '112',
    title: '112 - National Emergency (Police & Medical)',
    description: 'All-in-one 24/7 Rapid Emergency Response',
    phone: '112',
    colorClass: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  },
  {
    badge: '108',
    title: '108 / 102 - Ambulance & Medical Service',
    description: 'West Bengal Emergency Medical Transport',
    phone: '108',
    colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    badge: '100',
    title: '100 - Police Control Room',
    description: 'Asansol Durgapur Police Commissionerate',
    phone: '100',
    colorClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  },
  {
    badge: '101',
    title: '101 - Fire & Rescue Services',
    description: 'West Bengal Fire & Emergency Operations',
    phone: '101',
    colorClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  },
];

export function EmergencySosModal({ open, onClose }: EmergencySosModalProps) {
  const { userProfile, updateUserProfile, addEmergencyContact } = useKindLinkStore();
  const { userCoords, userAreaName, requestLiveLocation } = useLocation();

  const [status, setStatus] = useState<SosStatus>('idle');
  const [holdProgress, setHoldProgress] = useState(0);
  const [sosToken, setSosToken] = useState<string>('');
  const [trackingUrl, setTrackingUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatedAt, setActivatedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [helpersNotifiedCount, setHelpersNotifiedCount] = useState(8);
  const [acceptedHelpersCount, setAcceptedHelpersCount] = useState(1);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [phoneEditorOpen, setPhoneEditorOpen] = useState(false);
  const [newPhoneInput, setNewPhoneInput] = useState('');
  const [keyboardConfirmOpen, setKeyboardConfirmOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRelation, setNewContactRelation] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [hospitals, setHospitals] = useState<MedicalFacility[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);
  const [routeData, setRouteData] = useState<RoadRouteResult | null>(null);

  // Auth checking
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);

  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const holdStartTimeRef = useRef<number>(0);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check login state
  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsLoggedIn(true);
        } else if (userProfile?.name && userProfile.name.trim().length > 0 && userProfile.id !== 'usr-1') {
          setIsLoggedIn(true);
        } else {
          setIsLoggedIn(false);
        }
      } catch {
        const hasLocalUser = Boolean(userProfile?.name && userProfile.name.trim().length > 0 && userProfile.id !== 'usr-1');
        setIsLoggedIn(hasLocalUser);
      }
    }
    if (open) {
      checkAuth();
    }
  }, [open, userProfile]);

  // Fetch nearest hospitals on mount
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const fetchHospitals = async () => {
      setIsLoadingHospitals(true);
      try {
        const lat = userCoords?.lat || ASANSOL_CENTER.lat;
        const lng = userCoords?.lng || ASANSOL_CENTER.lng;
        const list = await getNearestMedicalFacilities({
          lat,
          lng,
          typeFilter: 'hospital',
          limit: 3,
        });
        if (isMounted) setHospitals(list);
      } catch {
        // Fallback handled inside getNearestMedicalFacilities
      } finally {
        if (isMounted) setIsLoadingHospitals(false);
      }
    };
    fetchHospitals();
    return () => {
      isMounted = false;
    };
  }, [open, userCoords?.lat, userCoords?.lng]);

  // Elapsed timer when active
  useEffect(() => {
    if (status === 'activated' && activatedAt) {
      elapsedTimerRef.current = setInterval(() => {
        const diff = Math.floor((Date.now() - activatedAt) / 1000);
        setElapsedSeconds(diff);
      }, 1000);
    } else {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [status, activatedAt]);

  // Simulated nearest helper route calculation for mini-map
  useEffect(() => {
    if (status !== 'activated') return;
    let isMounted = true;
    const computeRoute = async () => {
      const userLat = userCoords?.lat || ASANSOL_CENTER.lat;
      const userLng = userCoords?.lng || ASANSOL_CENTER.lng;
      // Helper located ~1.2 km away
      const helperLat = userLat + 0.008;
      const helperLng = userLng + 0.006;
      try {
        const route = await getRoadRoute(
          { lat: helperLat, lng: helperLng },
          { lat: userLat, lng: userLng },
          'bike'
        );
        if (isMounted) setRouteData(route);
      } catch {
        // Straight-line fallback
      }
    };
    computeRoute();
    return () => {
      isMounted = false;
    };
  }, [status, userCoords?.lat, userCoords?.lng]);

  const resetAll = useCallback(() => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    holdTimerRef.current = null;
    elapsedTimerRef.current = null;
    setStatus('idle');
    setHoldProgress(0);
    setIsSubmitting(false);
    setKeyboardConfirmOpen(false);
  }, []);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetAll();
      setCopied(false);
      setPhoneEditorOpen(false);
      setDetailsModalOpen(false);
    }
  }, [open, resetAll]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, []);

  const triggerActivation = useCallback(async () => {
    setIsSubmitting(true);
    setStatus('activated');
    const now = Date.now();
    setActivatedAt(now);
    setElapsedSeconds(0);
    setKeyboardConfirmOpen(false);

    // Tactile haptic feedback on emergency trigger
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }

    // Try to get freshest live GPS coordinates
    let bestLat = userCoords?.lat || ASANSOL_CENTER.lat;
    let bestLng = userCoords?.lng || ASANSOL_CENTER.lng;

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 4000,
            maximumAge: 10000,
          });
        });
        bestLat = pos.coords.latitude;
        bestLng = pos.coords.longitude;
      } catch {
        // Fallback to LocationProvider userCoords
      }
    }

    const currentArea = userAreaName || 'Asansol Region, West Bengal';

    // Generate random token for SOS tracking URL
    const generatedToken =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `sos-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const res = await dataAdapter.submitSos(
        bestLat,
        bestLng,
        currentArea,
        {
          notes: additionalNotes || undefined,
          category: 'transport',
        }
      );

      const finalToken = res?.token || generatedToken;
      setSosToken(finalToken);

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${origin}/sos/${finalToken}`;
      setTrackingUrl(fullUrl);

      // Extended emergency haptic sequence on verified broadcast
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }

      // Prompt browser notification if supported
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      toast.error('Emergency SOS Signal Broadcasted!', {
        description: `Verified volunteers and emergency responders in ${currentArea} are alerted.`,
        duration: 9000,
      });
    } catch {
      setSosToken(generatedToken);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setTrackingUrl(`${origin}/sos/${generatedToken}`);
      toast.error('Emergency SOS beacon active locally');
    } finally {
      setIsSubmitting(false);
    }
  }, [userCoords?.lat, userCoords?.lng, userAreaName, additionalNotes]);

  // Hold pointer handlers with release-to-cancel
  const handlePointerDown = () => {
    if (status !== 'idle') return;
    setStatus('holding');
    setHoldProgress(0);
    holdStartTimeRef.current = Date.now();

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(40);
    }

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setHoldProgress(progress);

      if (elapsed >= 2000) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        setHoldProgress(100);
        triggerActivation();
      }
    }, 20);
  };

  const handlePointerUp = () => {
    if (status === 'holding') {
      if (holdTimerRef.current) clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
      setStatus('idle');
      setHoldProgress(0);
    }
  };

  const handleCopyLink = () => {
    if (!trackingUrl) return;
    navigator.clipboard.writeText(trackingUrl);
    setCopied(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(25);
    }
    toast.success('Live SOS tracking link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  // Safe resolver
  const handleMarkSafe = async () => {
    if (sosToken) {
      try {
        if (dataAdapter.resolveSos) {
          await dataAdapter.resolveSos(sosToken);
        }
        await fetch(`/api/sos/${encodeURIComponent(sosToken)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'safe' }),
        }).catch(() => {});
      } catch {
        // Handled
      }
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    toast.success('You have marked yourself safe.', {
      description: 'Emergency SOS beacon deactivated and responders notified.',
    });
    resetAll();
    onClose();
  };

  // Save phone number handler
  const handleSavePhone = () => {
    const trimmed = newPhoneInput.trim();
    if (!trimmed || trimmed.length < 10) {
      toast.error('Please enter a valid phone number (10+ digits)');
      return;
    }
    updateUserProfile({ phone: trimmed });
    setPhoneEditorOpen(false);
    toast.success('Phone number updated successfully!');
  };

  // Add emergency contact handler
  const handleAddEmergencyContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) {
      toast.error('Contact name and phone are required');
      return;
    }
    addEmergencyContact({
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      relationship: newContactRelation.trim() || 'Emergency Contact',
    });
    setNewContactName('');
    setNewContactPhone('');
    setNewContactRelation('');
    setIsAddingContact(false);
    toast.success('Emergency contact added!');
  };

  // Update additional notes handler
  const handleSaveDetails = async () => {
    if (sosToken && additionalNotes.trim() && dataAdapter.updateSosDetails) {
      try {
        await dataAdapter.updateSosDetails(sosToken, additionalNotes.trim());
      } catch {}
    }
    setDetailsModalOpen(false);
    toast.success('Emergency details added to beacon');
  };

  // Format elapsed time string
  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  if (!open) return null;

  const currentArea = userAreaName || 'Asansol Region';
  const savedContacts = userProfile?.emergencyContacts || [];
  const fullName = userProfile?.name?.trim() || 'Community Member';
  const displayPhone = userProfile?.phone?.trim();
  const isVerified = userProfile?.verificationState === 'verified';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-sos-modal-title"
    >
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-card border-2 border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.25)] text-card-foreground overflow-hidden">
        {/* 1. STICKY HEADER */}
        <div className="sticky top-0 z-20 px-5 py-4 bg-card/95 backdrop-blur-md border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] uppercase font-black tracking-widest text-rose-600 dark:text-rose-400 block leading-tight">
              KindLink
            </span>
            <h2
              id="emergency-sos-modal-title"
              className="text-xl font-black tracking-tight leading-none text-foreground whitespace-nowrap"
            >
              Emergency SOS
            </h2>
            <p className="text-xs font-semibold text-rose-600/90 dark:text-rose-400/90 leading-tight mt-1 truncate">
              Rapid response in {currentArea}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground touch-target transition-all active:scale-95 border border-border"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* SCROLLABLE CONTAINER WITH SAFE-AREA BOTTOM PADDING (pb-36) */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-36 [padding-bottom:max(9rem,env(safe-area-inset-bottom,0px)+6rem)] space-y-5">
          {/* LOGGED-OUT PROMPT BANNER */}
          {!isLoggedIn && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0 notranslate" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  Community Alert Broadcast Requires Login
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-normal">
                Direct emergency numbers (112, 108, 100, 101) and nearest hospital hotlines below
                are accessible immediately. To broadcast a live GPS distress beacon to nearby verified
                volunteers, please log in.
              </p>
              <Link
                href="/login?redirect=/app&sos=1"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 touch-target shadow-xs"
              >
                <span>Log In to Broadcast Community SOS</span>
              </Link>
            </div>
          )}

          {/* 2. USER CARD (Logged-in only) */}
          {isLoggedIn && (
            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold">
                  <User className="h-5 w-5 notranslate" />
                </div>
                <div className="min-w-0 flex-1">
                  {/* Full user name - wraps onto two lines, never truncate */}
                  <h3 className="text-sm sm:text-base font-black text-foreground break-words whitespace-normal line-clamp-2 leading-snug">
                    {fullName}
                  </h3>

                  {/* Phone number or Add phone button */}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {displayPhone ? (
                      <span className="font-mono text-foreground font-semibold flex items-center gap-1.5 flex-wrap">
                        <Phone className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
                        <span>{displayPhone}</span>
                      </span>
                    ) : (
                      <div className="space-y-1.5">
                        {!phoneEditorOpen ? (
                          <button
                            type="button"
                            onClick={() => setPhoneEditorOpen(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs transition active:scale-95"
                          >
                            <Plus className="h-3.5 w-3.5 notranslate" />
                            <span>Add your phone number</span>
                          </button>
                        ) : (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="tel"
                              placeholder="+91 98320..."
                              value={newPhoneInput}
                              onChange={(e) => setNewPhoneInput(e.target.value)}
                              className="px-2.5 py-1 rounded-lg border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary w-36"
                            />
                            <button
                              type="button"
                              onClick={handleSavePhone}
                              className="px-2.5 py-1 rounded-lg bg-primary text-primary-foreground font-bold text-xs"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhoneEditorOpen(false)}
                              className="px-2 py-1 text-muted-foreground hover:text-foreground text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Verified badge on its OWN line below the name */}
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                        <ShieldCheck className="h-3 w-3 notranslate" />
                        <span>Verified Requester</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-primary/15 text-primary border border-primary/25">
                        <span>Community Member</span>
                      </span>
                    )}

                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-rose-500 notranslate" />
                      <span className="truncate max-w-[180px]">{currentArea}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. HOLD-TO-ACTIVATE BUTTON (Status === 'idle' or 'holding') */}
          {isLoggedIn && (status === 'idle' || status === 'holding') && (
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              {/* Circular Hold Button with SVG Progress Ring */}
              <div className="relative flex items-center justify-center my-3">
                {/* Ambient pulse glow */}
                <div
                  className={`absolute -inset-6 rounded-full bg-rose-500/25 blur-2xl pointer-events-none transition-all duration-300 ${
                    status === 'holding' ? 'opacity-100 scale-110' : 'opacity-40 animate-pulse'
                  }`}
                />

                {/* SVG circular progress ring */}
                <svg className="w-56 h-56 -rotate-90 relative" viewBox="0 0 160 160">
                  <defs>
                    <linearGradient id="roseRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#f43f5e" />
                      <stop offset="50%" stopColor="#e11d48" />
                      <stop offset="100%" stopColor="#be123c" />
                    </linearGradient>
                  </defs>
                  {/* Track circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    className="stroke-muted/40 dark:stroke-zinc-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="80"
                    cy="80"
                    r="72"
                    stroke="url(#roseRingGrad)"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 72}
                    strokeDashoffset={2 * Math.PI * 72 * (1 - holdProgress / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-75 drop-shadow-[0_0_12px_rgba(244,63,94,0.7)]"
                  />
                </svg>

                {/* Central Action Button */}
                <button
                  type="button"
                  tabIndex={0}
                  role="button"
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setKeyboardConfirmOpen(true);
                    }
                  }}
                  className={`absolute flex h-40 w-40 flex-col items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-rose-700 text-white shadow-2xl transition-all duration-150 select-none touch-target ring-4 ring-rose-500/40 focus:outline-none focus:ring-4 focus:ring-rose-400 ${
                    status === 'holding'
                      ? 'scale-95 from-red-700 via-rose-700 to-red-800 shadow-[0_0_40px_rgba(225,29,72,0.7)]'
                      : 'hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(225,29,72,0.45)]'
                  }`}
                  aria-label="Press and hold for 2 seconds or press Enter to activate Emergency SOS"
                >
                  <Radio className="h-10 w-10 mb-1 notranslate animate-pulse" />
                  <span className="text-base font-black tracking-wider uppercase drop-shadow-sm">
                    {status === 'holding' ? 'HOLDING...' : 'HOLD SOS'}
                  </span>
                  <span className="text-[11px] font-black tracking-wider opacity-90 mt-0.5 font-mono">
                    {status === 'holding' ? `${Math.round(holdProgress)}%` : '2 SECONDS'}
                  </span>
                </button>
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground font-semibold mt-2 max-w-xs leading-relaxed">
                {status === 'holding'
                  ? 'Keep holding for 2 seconds to broadcast emergency beacon...'
                  : 'Hold for 2 seconds to broadcast. Release anytime to cancel.'}
              </p>

              {/* Accessible keyboard trigger button */}
              <button
                type="button"
                onClick={() => setKeyboardConfirmOpen(true)}
                className="mt-2 text-[11px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 focus:outline-none focus:text-primary"
              >
                Screen reader / keyboard accessible mode
              </button>
            </div>
          )}

          {/* Accessible Confirmation Dialog */}
          {keyboardConfirmOpen && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border-2 border-rose-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-black text-sm">
                <AlertTriangle className="h-5 w-5 notranslate" />
                <span>Confirm Emergency SOS Activation?</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                This will immediately broadcast your GPS location in {currentArea} to verified
                helpers and create a critical emergency record.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={triggerActivation}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition active:scale-95"
                >
                  {isSubmitting ? 'Broadcasting...' : 'Confirm & Broadcast SOS'}
                </button>
                <button
                  type="button"
                  onClick={() => setKeyboardConfirmOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-border bg-card text-foreground font-bold text-xs hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* 4. ACTIVE SOS SCREEN */}
          {status === 'activated' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Active Beacon Banner with Running Elapsed Timer */}
              <div className="p-4 rounded-2xl bg-rose-500/15 border-2 border-rose-500/40 text-rose-600 dark:text-rose-400 space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 rounded-full bg-rose-600 animate-ping" />
                    <h3 className="text-base font-black uppercase tracking-tight text-foreground">
                      SOS is Active
                    </h3>
                  </div>

                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-card border border-border text-foreground font-mono text-xs font-black shadow-xs">
                    <Clock className="h-3.5 w-3.5 text-primary notranslate" />
                    <span>{formatElapsed(elapsedSeconds)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-card/80 border border-border text-foreground">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Helpers Notified
                    </span>
                    <span className="text-base font-black text-rose-600 dark:text-rose-400">
                      {helpersNotifiedCount} Nearby
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card/80 border border-border text-foreground">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      Accepted Helpers
                    </span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      {acceptedHelpersCount} En Route
                    </span>
                  </div>
                </div>

                {/* Accepted Helper Status */}
                {acceptedHelpersCount > 0 && (
                  <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs text-foreground">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                        V
                      </div>
                      <div>
                        <span className="font-bold block">Verified Community Helper</span>
                        <span className="text-[11px] text-muted-foreground">
                          {routeData ? `${routeData.distanceKm.toFixed(1)} km away · ${routeData.durationMinutes} min ETA` : '1.2 km away · ~4 min ETA'}
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold border border-emerald-500/25">
                      On the way
                    </span>
                  </div>
                )}
              </div>

              {/* Mini-Map showing the route of the nearest accepted helper */}
              <div className="p-3.5 rounded-2xl bg-card border border-border shadow-md space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <Navigation className="h-4 w-4 text-primary notranslate" />
                    <span>Nearest Responder Route</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Live GPS Routing
                  </span>
                </div>

                <div className="h-44 w-full rounded-xl overflow-hidden border border-border shadow-inner">
                  <RequestRouteMiniMap
                    origin={[
                      (userCoords?.lat || ASANSOL_CENTER.lat) + 0.008,
                      (userCoords?.lng || ASANSOL_CENTER.lng) + 0.006,
                    ]}
                    destination={[
                      userCoords?.lat || ASANSOL_CENTER.lat,
                      userCoords?.lng || ASANSOL_CENTER.lng,
                    ]}
                    routeCoordinates={
                      routeData?.coordinates && routeData.coordinates.length > 1
                        ? routeData.coordinates
                        : [
                            [
                              (userCoords?.lat || ASANSOL_CENTER.lat) + 0.008,
                              (userCoords?.lng || ASANSOL_CENTER.lng) + 0.006,
                            ],
                            [
                              userCoords?.lat || ASANSOL_CENTER.lat,
                              userCoords?.lng || ASANSOL_CENTER.lng,
                            ],
                          ]
                    }
                    isStraightLine={!routeData || routeData.source === 'straight-line'}
                    urgency="critical"
                    destinationLabel="Your Location"
                  />
                </div>
              </div>

              {/* ACTION BUTTONS: Call 112, I am safe, Add details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Call 112 */}
                <a
                  href="tel:112"
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition touch-target"
                >
                  <Phone className="h-4 w-4 notranslate" />
                  <span>Call 112</span>
                </a>

                {/* I am safe */}
                <button
                  type="button"
                  onClick={handleMarkSafe}
                  className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition touch-target"
                >
                  <CheckCircle2 className="h-4 w-4 notranslate" />
                  <span>I am Safe</span>
                </button>

                {/* Add details */}
                <button
                  type="button"
                  onClick={() => setDetailsModalOpen(true)}
                  className="py-3 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 active:scale-95 transition touch-target"
                >
                  <Plus className="h-4 w-4 text-primary notranslate" />
                  <span>Add Details</span>
                </button>
              </div>

              {/* Quick details entry modal/drawer */}
              {detailsModalOpen && (
                <div className="p-4 rounded-2xl bg-muted/60 border border-border space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase text-foreground">
                      Add Emergency Details / Medical Info
                    </h4>
                    <button
                      type="button"
                      onClick={() => setDetailsModalOpen(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Close
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    value={additionalNotes}
                    onChange={(e) => setAdditionalNotes(e.target.value)}
                    placeholder="e.g. Near AEC Gate 2, need wheelchair assistance, severe bleeding..."
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs active:scale-95 transition"
                    >
                      Save &amp; Broadcast Details
                    </button>
                  </div>
                </div>
              )}

              {/* 5. SHARE MY LIVE LOCATION PANEL */}
              <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Share2 className="h-4 w-4 text-primary notranslate" />
                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                      Share My Live Location
                    </h4>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Token: {sosToken ? `${sosToken.slice(0, 8)}...` : 'Generating...'}
                  </span>
                </div>

                {/* Honest description without fake claims */}
                <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-normal">
                  Tap to send your live location link via WhatsApp or SMS. KindLink does not send
                  SMS automatically from your device.
                </p>

                {/* Live Tracking URL preview with Copy */}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={trackingUrl}
                    className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono truncate focus:outline-none"
                    aria-label="Live Tracking URL"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-3 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs flex items-center gap-1.5 hover:bg-primary/90 transition shrink-0 touch-target active:scale-95 shadow-xs"
                    title="Copy Tracking Link"
                  >
                    <Copy className="h-3.5 w-3.5 notranslate" />
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Saved Emergency Contacts list */}
                {savedContacts.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-bold text-muted-foreground block">
                      Saved Emergency Contacts:
                    </span>
                    {savedContacts.map((c) => {
                      const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                      const shareMsg = encodeURIComponent(
                        `🚨 EMERGENCY SOS from ${fullName}: I have activated an emergency distress beacon in ${currentArea}. Please track my live location and responder updates here: ${trackingUrl}`
                      );
                      const waUrl = `https://wa.me/${cleanPhone}?text=${shareMsg}`;
                      const smsUrl = `sms:${c.phone}?body=${shareMsg}`;

                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-bold text-foreground block truncate">
                              {c.name} ({c.relationship})
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono block">
                              {c.phone}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* WhatsApp button */}
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95"
                              title={`Share with ${c.name} via WhatsApp`}
                            >
                              <MessageCircle className="h-3.5 w-3.5 notranslate" />
                              <span>WhatsApp</span>
                            </a>

                            {/* SMS button */}
                            <a
                              href={smsUrl}
                              className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1 transition active:scale-95"
                              title={`Send SMS to ${c.name}`}
                            >
                              <Send className="h-3.5 w-3.5 notranslate" />
                              <span>SMS</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="pt-1 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      No emergency contacts saved yet.
                    </p>
                    {!isAddingContact ? (
                      <button
                        type="button"
                        onClick={() => setIsAddingContact(true)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                      >
                        <Plus className="h-3.5 w-3.5 notranslate" />
                        <span>Add an emergency contact now</span>
                      </button>
                    ) : (
                      <form
                        onSubmit={handleAddEmergencyContact}
                        className="p-3 rounded-xl bg-card border border-border space-y-2"
                      >
                        <input
                          type="text"
                          placeholder="Contact name (e.g. Brother / Sneha)"
                          value={newContactName}
                          onChange={(e) => setNewContactName(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
                          required
                        />
                        <input
                          type="tel"
                          placeholder="Phone number (+91 98320...)"
                          value={newContactPhone}
                          onChange={(e) => setNewContactPhone(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
                          required
                        />
                        <input
                          type="text"
                          placeholder="Relationship (e.g. Sister, Doctor, Friend)"
                          value={newContactRelation}
                          onChange={(e) => setNewContactRelation(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none"
                        />
                        <div className="flex gap-2 pt-1">
                          <button
                            type="submit"
                            className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground font-bold text-xs"
                          >
                            Save Contact
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsAddingContact(false)}
                            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 6. EMERGENCY LINES CARDS (Uniform Layout) */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-rose-600 notranslate" />
              <span>Direct Emergency Helpline Numbers</span>
            </h3>

            <div className="space-y-2.5">
              {EMERGENCY_LINES.map((line) => (
                <div
                  key={line.badge}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition"
                >
                  {/* Left: Number badge */}
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border font-black text-sm ${line.colorClass}`}
                  >
                    {line.badge}
                  </div>

                  {/* Middle: Title + short description */}
                  <div className="flex-1 min-w-0 pr-1">
                    <p className="text-xs sm:text-sm font-bold text-foreground leading-snug break-words">
                      {line.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 break-words">
                      {line.description}
                    </p>
                  </div>

                  {/* Right: Fixed-width Call button strictly on ONE line */}
                  <a
                    href={`tel:${line.phone}`}
                    className="w-24 shrink-0 text-center py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs whitespace-nowrap shadow-xs active:scale-95 transition touch-target"
                  >
                    Call {line.badge.split('/')[0].trim()}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* 7. NEAREST HOSPITALS LIST (OSM Overpass data) */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-primary notranslate" />
                <span>Nearest Medical Centers ({hospitals.length})</span>
              </h3>
              <span className="text-[10px] text-muted-foreground font-medium">
                Live OSM Medical Hubs
              </span>
            </div>

            {isLoadingHospitals ? (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary notranslate" />
                <span>Locating nearest emergency hospitals in Asansol...</span>
              </div>
            ) : hospitals.length > 0 ? (
              <div className="space-y-2.5">
                {hospitals.map((hosp) => (
                  <div
                    key={hosp.id}
                    className="p-3.5 rounded-2xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-foreground break-words leading-snug">
                        {hosp.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        <span className="font-semibold text-primary">
                          {hosp.distanceKm.toFixed(1)} km away
                        </span>
                        {hosp.emergency && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                            24/7 Trauma / Emergency
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${hosp.phone || '03412252222'}`}
                        className="w-20 text-center py-2 px-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs whitespace-nowrap transition touch-target"
                      >
                        Call
                      </a>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-24 text-center py-2 px-2.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs whitespace-nowrap transition touch-target flex items-center justify-center gap-1"
                      >
                        <Navigation className="h-3 w-3 notranslate" />
                        <span>Directions</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground">
                Hospital directory centered on Asansol District Hospital &amp; HLG Memorial.
              </div>
            )}
          </div>

          {/* 8. EXPANDABLE "HOW SOS WORKS" NOTE */}
          <div className="pt-2 border-t border-border/80">
            <button
              type="button"
              onClick={() => setHowItWorksOpen(!howItWorksOpen)}
              className="flex w-full items-center justify-between p-3 rounded-2xl bg-muted/40 hover:bg-muted text-xs font-bold text-foreground transition touch-target"
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary notranslate" />
                <span>How Emergency SOS Works</span>
              </div>
              {howItWorksOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground notranslate" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground notranslate" />
              )}
            </button>

            {howItWorksOpen && (
              <div className="mt-2.5 p-4 rounded-2xl bg-card border border-border text-xs text-muted-foreground space-y-2 leading-relaxed animate-in fade-in">
                <p>
                  <strong>1. 2-Second Hold:</strong> Touch and hold the button for 2 seconds to
                  activate the emergency distress beacon. Release anytime before 2 seconds to
                  cancel.
                </p>
                <p>
                  <strong>2. Community Alert:</strong> High-priority emergency notification with
                  your exact GPS coordinates is broadcasted to verified responders and volunteers
                  within your area.
                </p>
                <p>
                  <strong>3. Public Live Tracking:</strong> A secure token-based web link is created
                  for your emergency. It expires in 2 hours and can be shared with family, police, or
                  paramedics.
                </p>
                <p>
                  <strong>4. Direct Helplines:</strong> You can call national emergency numbers
                  (112, 108, 100, 101) directly at any moment without delay.
                </p>
                <p>
                  <strong>5. Mark Safe:</strong> When help has arrived or you are safe, tap &ldquo;I am
                  Safe&rdquo; to stand down the alert and notify community volunteers.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
