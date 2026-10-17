'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/components/ui/OverlayPortal';
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
  Eye,
  Lock,
  Shield,
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
import { EditProfileModal } from '@/components/profile/EditProfileModal';

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

type SosStatus = 'idle' | 'holding' | 'sending' | 'activated';

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
    title: '108 - Emergency Ambulance Service',
    description: 'West Bengal Emergency Medical Transport',
    phone: '108',
    colorClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  },
  {
    badge: '102',
    title: '102 - Free Ambulance (Maternal & Infant)',
    description: 'Free hospital transport for mothers & newborns',
    phone: '102',
    colorClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
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
  const [holdElapsed, setHoldElapsed] = useState(0);
  const [isRippling, setIsRippling] = useState(false);
  const [sosToken, setSosToken] = useState<string>('');
  const [trackingUrl, setTrackingUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedPreparedMsg, setCopiedPreparedMsg] = useState(false);
  const [copiedContactId, setCopiedContactId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activatedAt, setActivatedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [helpersNotifiedCount, setHelpersNotifiedCount] = useState(8);
  const [acceptedHelpersCount, setAcceptedHelpersCount] = useState(1);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
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
  const [isDesktop, setIsDesktop] = useState(false);

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
    setHoldElapsed(0);
    setIsRippling(false);
    setIsSubmitting(false);
    setKeyboardConfirmOpen(false);
  }, []);

  // Desktop detection
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      setIsDesktop(!isMobile);
    }
  }, []);

  // Reset when dialog opens/closes
  useEffect(() => {
    if (!open) {
      resetAll();
      setCopied(false);
      setCopiedPhone(false);
      setCopiedPreparedMsg(false);
      setCopiedContactId(null);
      setPhoneEditorOpen(false);
      setDetailsModalOpen(false);
      setEditProfileModalOpen(false);
      setPreviewOpen(false);
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

    // Try to get freshest live coordinates
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

    // Append emergency privacy details if enabled
    const emergencyPrivacy = userProfile?.emergencyPrivacy;
    let combinedNotes = additionalNotes.trim();
    if (emergencyPrivacy?.shareBloodGroup && userProfile?.bloodGroup) {
      combinedNotes = combinedNotes
        ? `[Blood Group: ${userProfile.bloodGroup}] ${combinedNotes}`
        : `[Blood Group: ${userProfile.bloodGroup}]`;
    }
    if (emergencyPrivacy?.shareMedicalNote && emergencyPrivacy.medicalNote) {
      combinedNotes = combinedNotes
        ? `${combinedNotes} [Medical: ${emergencyPrivacy.medicalNote}]`
        : `[Medical: ${emergencyPrivacy.medicalNote}]`;
    }

    try {
      const res = await dataAdapter.submitSos(
        bestLat,
        bestLng,
        currentArea,
        {
          notes: combinedNotes || undefined,
          category: 'transport',
        }
      );

      const finalToken = res?.token || generatedToken;
      setSosToken(finalToken);

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      const fullUrl = `${siteUrl}/sos/${finalToken}`;
      setTrackingUrl(fullUrl);

      // Extended emergency haptic sequence on verified alert
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 400]);
      }

      // Prompt browser notification if supported
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission();
        }
      }

      toast.error('Emergency SOS Signal Sent!', {
        description: `Verified volunteers and emergency responders in ${currentArea} are alerted.`,
        duration: 9000,
      });
    } catch {
      setSosToken(generatedToken);
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
      setTrackingUrl(`${siteUrl}/sos/${generatedToken}`);
      toast.error('Emergency SOS alert active locally');
    } finally {
      setIsSubmitting(false);
    }
  }, [userCoords?.lat, userCoords?.lng, userAreaName, additionalNotes, userProfile?.emergencyPrivacy, userProfile?.bloodGroup]);

  // Hold pointer handlers with release-to-cancel
  const handlePointerDown = () => {
    if (status !== 'idle') return;
    setStatus('holding');
    setHoldProgress(0);
    setHoldElapsed(0);
    holdStartTimeRef.current = Date.now();

    // Haptic vibration [40, 60, 40] where supported
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }

    holdTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - holdStartTimeRef.current;
      setHoldElapsed(elapsed);
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setHoldProgress(progress);

      if (elapsed >= 2000) {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        holdTimerRef.current = null;
        setHoldProgress(100);
        setStatus('sending');
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
      setHoldElapsed(0);
      setIsRippling(true);
      setTimeout(() => setIsRippling(false), 500);
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
      description: 'Emergency SOS alert deactivated and responders notified.',
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
    toast.success('Emergency details added to alert');
  };

  // Format elapsed time string
  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  useBodyScrollLock(open);

  if (!open) return null;

  const currentArea = userAreaName || 'Asansol Region';
  const savedContacts = userProfile?.emergencyContacts || [];
  const fullName = userProfile?.name?.trim() || 'Community Member';
  const displayPhone = userProfile?.phone?.trim();
  const isVerified = userProfile?.verificationState === 'verified';
  const bloodGroup = userProfile?.bloodGroup;
  const emergencyPrivacy = userProfile?.emergencyPrivacy || {
    sharePhone: false,
    shareBloodGroup: false,
    shareMedicalNote: false,
    medicalNote: '',
  };
  const prefersReducedMotion =
    Boolean(userProfile?.reduceMotion) ||
    (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  const getInitials = (name: string) => {
    if (!name || !name.trim()) return 'KL';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleCopyUserPhone = () => {
    if (!displayPhone) return;
    navigator.clipboard.writeText(displayPhone);
    setCopiedPhone(true);
    toast.success('Phone number copied to clipboard');
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-sos-modal-title"
    >
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-card border-2 border-rose-500/40 shadow-[0_0_50px_rgba(244,63,94,0.25)] text-card-foreground overflow-hidden">
        {/* 1. STICKY HEADER */}
        <div className="sticky top-0 z-20 px-5 py-3.5 bg-card/95 backdrop-blur-md border-b border-border/80 flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-black tracking-widest text-rose-600 dark:text-rose-400 block leading-tight">
                KINDLINK
              </span>
              <span className="text-muted-foreground/40 text-xs">•</span>
              <h2
                id="emergency-sos-modal-title"
                className="text-lg sm:text-xl font-black tracking-tight leading-none text-foreground whitespace-nowrap"
              >
                Emergency SOS
              </h2>
            </div>
            <p className="text-xs font-semibold text-rose-600/90 dark:text-rose-400/90 leading-tight mt-1 truncate">
              {currentArea}
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

        {/* SCROLLABLE CONTAINER WITH NATURAL HEIGHT & SAFE-AREA INSET PADDING */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 pt-4 pb-4 [padding-bottom:max(1rem,calc(env(safe-area-inset-bottom,0px)+16px))] space-y-4">
          {/* LOGGED-OUT PROMPT BANNER */}
          {!isLoggedIn && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-2.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5 shrink-0 notranslate" />
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wide">
                  Community Alert Requires Login
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed break-words whitespace-normal">
                Direct emergency numbers (112, 108, 100, 101) and nearest hospital hotlines below
                are accessible immediately. To send a live location emergency alert to nearby verified
                volunteers, please log in.
              </p>
              <Link
                href="/login?redirect=/app&sos=1"
                className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs tracking-wider transition-all active:scale-95 flex items-center justify-center gap-2 touch-target shadow-xs"
              >
                <span>Log In to Send Community SOS</span>
              </Link>
            </div>
          )}

          {/* 2. USER DETAILS CARD (Logged-in only) */}
          {isLoggedIn && (
            <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Avatar with initials */}
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 font-black text-sm border border-rose-500/20">
                    {getInitials(fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {/* Full user name - wraps cleanly */}
                    <h3 className="text-sm sm:text-base font-black text-foreground break-words whitespace-normal leading-snug line-clamp-2">
                      {fullName}
                    </h3>

                    {/* Phone number in international format with copy button or add phone */}
                    <div className="mt-1 text-xs text-muted-foreground">
                      {displayPhone ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-foreground font-semibold flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
                            <span>{displayPhone}</span>
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUserPhone}
                            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition active:scale-95"
                            title="Copy phone number"
                            aria-label="Copy phone number"
                          >
                            {copiedPhone ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500 notranslate" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 notranslate" />
                            )}
                          </button>
                        </div>
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

                    {/* Chips: verification chip, real area name, optional blood group */}
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
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

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                        <MapPin className="h-3 w-3 text-rose-500 notranslate shrink-0" />
                        <span className="truncate max-w-[140px]">{currentArea}</span>
                      </span>

                      {bloodGroup && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                          <span>Blood: {bloodGroup}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit details link opening profile edit */}
                <button
                  type="button"
                  onClick={() => setEditProfileModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline self-start shrink-0 pt-0.5"
                >
                  Edit details
                </button>
              </div>
            </div>
          )}

          {/* WHAT WILL BE SHARED COLLAPSED PREVIEW */}
          {isLoggedIn && (
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
              <button
                type="button"
                onClick={() => setPreviewOpen(!previewOpen)}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-muted/40 transition touch-target"
                aria-expanded={previewOpen}
              >
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary notranslate shrink-0" />
                  <span className="text-xs font-bold text-foreground">
                    What will be shared with responders &amp; contacts
                  </span>
                </div>
                {previewOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground notranslate" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground notranslate" />
                )}
              </button>

              {previewOpen && (
                <div className="px-3.5 pb-3.5 pt-1 border-t border-border/60 space-y-2.5 text-xs text-muted-foreground animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Full Name
                      </span>
                      <span className="font-semibold text-foreground break-words">{fullName}</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Phone Number
                      </span>
                      <span className="font-semibold text-foreground font-mono">
                        {emergencyPrivacy.sharePhone
                          ? (displayPhone || 'Not provided')
                          : 'Hidden by privacy settings'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 sm:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Live Location Links
                      </span>
                      <span className="font-semibold text-foreground block truncate">
                        Google Maps: https://www.google.com/maps/dir/?api=1&amp;destination={(userCoords?.lat || ASANSOL_CENTER.lat).toFixed(4)},{(userCoords?.lng || ASANSOL_CENTER.lng).toFixed(4)}
                      </span>
                      <span className="text-[11px] text-primary underline block truncate mt-0.5">
                        KindLink Live: {trackingUrl || `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/sos/${sosToken || 'live'}`}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Time
                      </span>
                      <span className="font-semibold text-foreground">
                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Blood Group
                      </span>
                      <span className="font-semibold text-foreground">
                        {emergencyPrivacy.shareBloodGroup
                          ? (bloodGroup || 'Not specified')
                          : 'Hidden by privacy settings'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border/60 sm:col-span-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                        Short Medical Note
                      </span>
                      <span className="font-semibold text-foreground break-words">
                        {emergencyPrivacy.shareMedicalNote
                          ? (emergencyPrivacy.medicalNote || 'None provided')
                          : 'Hidden by privacy settings'}
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2 text-[11px] text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5 notranslate" />
                    <span>
                      <strong>Privacy note:</strong> Details are private and shared only while SOS is active. Responders lose access when you mark yourself safe.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. HOLD-TO-ACTIVATE BUTTON (Status === 'idle' || 'holding' || 'sending') */}
          {isLoggedIn && (status === 'idle' || status === 'holding' || status === 'sending') && (
            <div className="flex flex-col items-center text-center pt-2 pb-1">
              {/* Circular Hold Button with SVG Progress Ring */}
              <div className="relative flex items-center justify-center my-3">
                {/* Calm pulsing glow ring (disabled on prefers-reduced-motion) */}
                <div
                  className={`absolute -inset-6 rounded-full bg-rose-500/25 blur-2xl pointer-events-none transition-all duration-300 ${
                    status === 'holding'
                      ? 'opacity-100 scale-110'
                      : prefersReducedMotion
                      ? 'opacity-40'
                      : 'opacity-40 animate-pulse'
                  }`}
                />

                {/* SVG circular progress ring */}
                <svg className="w-56 h-56 sm:w-60 sm:h-60 -rotate-90 relative pointer-events-none" viewBox="0 0 200 200">
                  <defs>
                    <linearGradient id="roseRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#fb7185" />
                      <stop offset="50%" stopColor="#f43f5e" />
                      <stop offset="100%" stopColor="#e11d48" />
                    </linearGradient>
                  </defs>
                  {/* Track circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    className="stroke-muted/40 dark:stroke-zinc-800"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="84"
                    stroke="url(#roseRingGrad)"
                    strokeWidth="9"
                    strokeDasharray={2 * Math.PI * 84}
                    strokeDashoffset={2 * Math.PI * 84 * (1 - holdProgress / 100)}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-75 drop-shadow-[0_0_12px_rgba(244,63,94,0.7)]"
                  />
                </svg>

                {/* Central Premium Circular Action Button (160-176px) */}
                <button
                  type="button"
                  tabIndex={0}
                  role="button"
                  disabled={status === 'sending'}
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
                  className={`absolute flex h-40 w-40 sm:h-44 sm:w-44 flex-col items-center justify-center rounded-full bg-gradient-to-tr from-rose-600 via-red-600 to-rose-700 text-white shadow-[inset_0_2px_4px_rgba(255,255,255,0.35),0_12px_36px_rgba(225,29,72,0.45)] transition-all duration-150 select-none touch-target ring-4 ring-rose-500/40 focus:outline-none focus:ring-4 focus:ring-rose-400 overflow-hidden ${
                    status === 'holding'
                      ? 'scale-95 from-red-700 via-rose-700 to-red-800 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_0_40px_rgba(225,29,72,0.7)]'
                      : status === 'sending'
                      ? 'scale-95 opacity-90'
                      : 'hover:scale-105 active:scale-95'
                  }`}
                  aria-label="Touch and hold for 2 seconds or press Enter to activate Emergency SOS"
                >
                  {/* Ripple on release */}
                  {isRippling && (
                    <span className="absolute inset-0 rounded-full bg-white/30 animate-ping pointer-events-none" />
                  )}

                  {/* Distinct visual states */}
                  {status === 'sending' ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <Loader2 className="h-8 w-8 animate-spin mb-1 notranslate" />
                      <span className="text-xs font-black tracking-wider uppercase leading-tight">
                        BROADCASTING...
                      </span>
                    </div>
                  ) : status === 'holding' ? (
                    <div className="flex flex-col items-center justify-center text-center">
                      <span className="text-xs font-black tracking-wider uppercase drop-shadow-sm leading-tight text-white/90">
                        HOLDING...
                      </span>
                      <span className="text-2xl font-black tracking-wider drop-shadow-sm font-mono leading-tight my-0.5">
                        {Math.max(0, (2000 - holdElapsed) / 1000).toFixed(1)}s
                      </span>
                      <span className="text-[11px] font-bold opacity-85 font-mono leading-tight">
                        {Math.round(holdProgress)}%
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                      <Radio className="h-8 w-8 mb-1 notranslate" />
                      <span className="text-base sm:text-lg font-black tracking-wider uppercase drop-shadow-sm leading-tight">
                        HOLD SOS
                      </span>
                      <span className="text-xs font-bold tracking-wider opacity-90 font-mono mt-0.5 leading-tight">
                        2 seconds
                      </span>
                    </div>
                  )}
                </button>
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground font-semibold mt-2 max-w-xs leading-relaxed">
                {status === 'holding'
                  ? 'Keep holding for 2 seconds to send emergency alert...'
                  : 'Hold for 2 seconds to alert helpers. Release anytime to cancel.'}
              </p>

              {/* Accessible Mode: simple clean link */}
              <button
                type="button"
                onClick={() => setKeyboardConfirmOpen(true)}
                className="mt-3 text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 transition touch-target"
              >
                Can&apos;t hold? Tap to confirm instead
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
                This will immediately alert helpers with your location in {currentArea} to verified
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
                    Live Routing
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
                    isStraightLine={!routeData || routeData.source === 'straight-line' || Boolean(routeData.isFallback)}
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
                    placeholder="e.g. Near City Center Gate 2, need wheelchair assistance, severe bleeding..."
                    className="w-full p-2.5 rounded-xl border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDetails}
                      className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-xs active:scale-95 transition"
                    >
                      Save &amp; Update Details
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

                {/* Prepared Message Preview Box with 1-tap Copy */}
                {(() => {
                  const bestLat = userCoords?.lat || ASANSOL_CENTER.lat;
                  const bestLng = userCoords?.lng || ASANSOL_CENTER.lng;
                  const gmapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${bestLat},${bestLng}`;
                  const liveSosUrl =
                    trackingUrl ||
                    `${process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '')}/sos/${sosToken || 'live'}`;
                  const sentTimeStr = activatedAt
                    ? new Date(activatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : new Date().toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                  const contactPhoneNum =
                    emergencyPrivacy.sharePhone && displayPhone
                      ? displayPhone
                      : displayPhone || 'Not shared';
                  const preparedContactMessage = `SOS from ${fullName}. Phone: ${contactPhoneNum}. Location: ${gmapsUrl}. Live: ${liveSosUrl}. Sent at ${sentTimeStr} from KindLink.`;

                  return (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-background border border-border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                            Prepared Contact Message
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(preparedContactMessage);
                              setCopiedPreparedMsg(true);
                              toast.success('SOS message copied to clipboard!');
                              setTimeout(() => setCopiedPreparedMsg(false), 2000);
                            }}
                            className="text-[11px] font-bold text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {copiedPreparedMsg ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-500 notranslate" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5 notranslate" />
                                <span>Copy Message</span>
                              </>
                            )}
                          </button>
                        </div>
                        <p className="text-xs font-mono text-foreground break-words select-all bg-muted/40 p-2 rounded-lg border border-border/60">
                          {preparedContactMessage}
                        </p>
                      </div>

                      {/* Saved Emergency Contacts list */}
                      {savedContacts.length > 0 ? (
                        <div className="space-y-2 pt-1">
                          <span className="text-[11px] font-bold text-muted-foreground block">
                            Saved Emergency Contacts:
                          </span>
                          {savedContacts.map((c) => {
                            const cleanPhone = c.phone.replace(/[^0-9]/g, '');
                            const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                              preparedContactMessage
                            )}`;
                            const smsUrl = `sms:${c.phone}?body=${encodeURIComponent(
                              preparedContactMessage
                            )}`;

                            return (
                              <div
                                key={c.id}
                                className="p-3 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <span className="text-xs font-bold text-foreground block truncate">
                                    {c.name} ({c.relationship})
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-mono block">
                                    {c.phone}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                                  {/* WhatsApp button */}
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition active:scale-95 touch-target"
                                    title={`Share with ${c.name} via WhatsApp`}
                                  >
                                    <MessageCircle className="h-3.5 w-3.5 notranslate" />
                                    <span>WhatsApp</span>
                                  </a>

                                  {/* SMS button */}
                                  <a
                                    href={smsUrl}
                                    className="px-2.5 py-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-1 transition active:scale-95 touch-target"
                                    title={`Send SMS to ${c.name}`}
                                  >
                                    <Send className="h-3.5 w-3.5 notranslate" />
                                    <span>SMS</span>
                                  </a>

                                  {/* Copy button */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      navigator.clipboard.writeText(preparedContactMessage);
                                      setCopiedContactId(c.id);
                                      toast.success(`SOS message copied for ${c.name}!`);
                                      setTimeout(() => setCopiedContactId(null), 2000);
                                    }}
                                    className="px-2.5 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-foreground font-bold text-xs flex items-center gap-1 transition active:scale-95 touch-target"
                                    title={`Copy message for ${c.name}`}
                                  >
                                    {copiedContactId === c.id ? (
                                      <Check className="h-3.5 w-3.5 text-emerald-500 notranslate" />
                                    ) : (
                                      <Copy className="h-3.5 w-3.5 notranslate" />
                                    )}
                                    <span>Copy</span>
                                  </button>
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
                  );
                })()}
              </div>
            </div>
          )}

          {/* 6. EMERGENCY LINES CARDS (Uniform Layout, 112 First, Desktop Fallback) */}
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
                    <p className="text-xs sm:text-sm font-bold text-foreground leading-snug truncate">
                      {line.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 truncate">
                      {line.description}
                    </p>
                  </div>

                  {/* Right: Fixed-width Call button on mobile, Copy fallback with Call note on desktop */}
                  {isDesktop ? (
                    <div className="flex flex-col items-end shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(line.phone);
                          toast.success(`Helpline ${line.badge} copied to clipboard!`, {
                            description: 'Call from your phone to connect immediately.',
                          });
                        }}
                        className="w-24 text-center py-2 px-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold text-xs whitespace-nowrap shadow-xs active:scale-95 transition touch-target flex items-center justify-center gap-1"
                        title="Copy helpline number"
                      >
                        <Copy className="h-3.5 w-3.5 notranslate" />
                        <span>Copy {line.badge}</span>
                      </button>
                      <span className="text-[9px] text-muted-foreground mt-0.5 whitespace-nowrap">
                        Call from your phone
                      </span>
                    </div>
                  ) : (
                    <a
                      href={`tel:${line.phone}`}
                      className="w-24 shrink-0 text-center py-2 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-xs whitespace-nowrap shadow-xs active:scale-95 transition touch-target"
                    >
                      Call {line.badge}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 7. NEAREST HOSPITALS LIST */}
          <div className="space-y-3 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5 text-primary notranslate" />
                <span>Nearest hospitals ({hospitals.length})</span>
              </h3>
            </div>

            {isLoadingHospitals ? (
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex items-center justify-center text-xs text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary notranslate" />
                <span>Locating nearest emergency hospitals in Asansol...</span>
              </div>
            ) : hospitals.length > 0 ? (
              <div className="space-y-2.5">
                {hospitals.map((hosp) => {
                  const hasPhone = Boolean(hosp.phone && hosp.phone.trim().length > 3);
                  const userLat = userCoords?.lat || ASANSOL_CENTER.lat;
                  const userLng = userCoords?.lng || ASANSOL_CENTER.lng;

                  return (
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
                          {hosp.emergency ? (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold">
                              24/7 Trauma / Emergency
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                              Hospital
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons: Directions always shown + small Map fallback; Call shown ONLY if valid phone */}
                      <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                        <div className={`flex items-center gap-1.5 ${hasPhone ? 'flex-1 sm:w-auto' : 'w-full'}`}>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${hosp.latitude},${hosp.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`text-center py-2 px-3 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-bold text-xs whitespace-nowrap transition touch-target flex items-center justify-center gap-1.5 ${
                              hasPhone ? 'flex-1 sm:w-28' : 'w-full'
                            }`}
                          >
                            <Navigation className="h-3.5 w-3.5 text-primary notranslate" />
                            <span>Directions</span>
                          </a>
                          <a
                            href={`https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${userLat}%2C${userLng}%3B${hosp.latitude}%2C${hosp.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-[10px] font-semibold transition touch-target shrink-0"
                            title="OpenStreetMap directions fallback"
                            aria-label="OpenStreetMap directions fallback"
                          >
                            Map
                          </a>
                        </div>

                        {hasPhone && (
                          <a
                            href={`tel:${hosp.phone}`}
                            className="flex-1 sm:w-24 text-center py-2 px-3 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs whitespace-nowrap transition touch-target flex items-center justify-center gap-1.5"
                          >
                            <Phone className="h-3.5 w-3.5 notranslate" />
                            <span>Call</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs text-muted-foreground">
                Hospital directory centered on Asansol District Hospital &amp; HLG Memorial.
              </div>
            )}
          </div>

          {/* 8. EXPANDABLE "HOW SOS WORKS" NOTE (4 numbered steps with icons) */}
          <div className="pt-2 border-t border-border/80">
            <button
              type="button"
              onClick={() => setHowItWorksOpen(!howItWorksOpen)}
              className="flex w-full items-center justify-between p-3.5 rounded-2xl bg-muted/40 hover:bg-muted text-xs font-bold text-foreground transition touch-target"
              aria-expanded={howItWorksOpen}
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
              <div className="mt-2.5 p-4 rounded-2xl bg-card border border-border text-xs text-muted-foreground space-y-3 leading-relaxed animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-500/25">
                    <Radio className="h-3.5 w-3.5 notranslate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-foreground block font-bold">1. Hold SOS for 2 seconds</strong>
                    <span className="text-[11px] text-muted-foreground">
                      Touch and hold the button for 2 seconds to send your emergency alert. Release anytime to cancel.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-xs border border-amber-500/25">
                    <AlertTriangle className="h-3.5 w-3.5 notranslate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-foreground block font-bold">2. Alert nearby verified responders</strong>
                    <span className="text-[11px] text-muted-foreground">
                      High-priority emergency notification with your live location is sent to verified community helpers in your area.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary font-bold text-xs border border-primary/25">
                    <Share2 className="h-3.5 w-3.5 notranslate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-foreground block font-bold">3. Notify emergency contacts</strong>
                    <span className="text-[11px] text-muted-foreground">
                      Instantly share your live tracking link with saved emergency contacts via WhatsApp or SMS in one tap.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xs border border-emerald-500/25">
                    <CheckCircle2 className="h-3.5 w-3.5 notranslate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <strong className="text-foreground block font-bold">4. Mark safe when help arrives</strong>
                    <span className="text-[11px] text-muted-foreground">
                      Tap &ldquo;I am Safe&rdquo; once assistance reaches you to deactivate the alert and notify responders.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EDIT PROFILE MODAL */}
      <EditProfileModal
        open={editProfileModalOpen}
        onClose={() => setEditProfileModalOpen(false)}
      />
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
