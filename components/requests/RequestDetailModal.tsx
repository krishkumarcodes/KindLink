'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Phone,
  Share2,
  Flag,
  HeartHandshake,
  CheckCircle2,
  Navigation,
  Car,
  Bike,
  Footprints,
  Radio,
  Star,
  ExternalLink,
  MessageCircle,
  Check,
  Loader2,
  Lock,
  Hospital,
} from 'lucide-react';
import { toast } from 'sonner';
import { HelpRequest, TravelMode, VolunteerOffer, RequestLifecycleStatus } from '@/lib/data/types';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { calculateETA, formatETA } from '@/lib/data/distance';
import { getRoadRoute, RoadRouteResult } from '@/lib/geo/osrm';
import { getNearestMedicalFacilities, MedicalFacility } from '@/lib/geo/hospitals';
import { HelpFlowModal } from './HelpFlowModal';
import { dataAdapter } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';

const RequestRouteMiniMap = dynamic(
  () => import('@/components/map/RequestRouteMiniMap'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-44 rounded-2xl bg-muted/50 animate-pulse flex items-center justify-center text-xs text-muted-foreground border border-border">
        Loading route navigation preview...
      </div>
    ),
  }
);

interface RequestDetailModalProps {
  request: HelpRequest | null;
  open: boolean;
  onClose: () => void;
}

export function RequestDetailModal({ request, open, onClose }: RequestDetailModalProps) {
  const {
    travelMode,
    setTravelMode,
    userProfile,
    userCoords,
    updateRequestStatus,
    fetchLiveRequests,
  } = useKindLinkStore();

  const [helpFlowOpen, setHelpFlowOpen] = useState(false);
  const [contactInfo, setContactInfo] = useState<{
    name: string;
    phone: string;
    relationship: string;
  } | null>(null);

  // Offers state
  const [offers, setOffers] = useState<VolunteerOffer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Live Location Sharing state
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [transitLocation, setTransitLocation] = useState<{
    lat: number;
    lng: number;
    updatedAt: string;
  } | null>(null);

  // Reporting
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  // Rating Modal
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Road Routing & Mini-map state
  const [routeResult, setRouteResult] = useState<RoadRouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Nearby Hospitals & Medical Facilities state
  const [nearbyHospitals, setNearbyHospitals] = useState<MedicalFacility[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);

  // Check if current user is the requester or the accepted helper
  const isRequester =
    userProfile && request && (request.contactName === userProfile.name || !request.acceptedHelperId);
  const isAcceptedHelper =
    userProfile && request && request.acceptedHelperId === userProfile.id;

  const currentStatus: RequestLifecycleStatus = request?.status || 'open';
  const isMatched =
    currentStatus === 'accepted' ||
    currentStatus === 'on_the_way' ||
    currentStatus === 'arrived' ||
    currentStatus === 'completed';

  // Load contact info if matched
  const loadContact = useCallback(async () => {
    if (!request) return;
    try {
      const c = await dataAdapter.getContact(request.id);
      if (c) {
        setContactInfo(c);
      }
    } catch {
      // Ignored if unauthenticated
    }
  }, [request]);

  // Load offers for this request
  const loadOffers = useCallback(async () => {
    if (!request) return;
    setLoadingOffers(true);
    try {
      const list = await dataAdapter.getOffers(request.id);
      setOffers(list);
    } catch {
      // Fallback
    } finally {
      setLoadingOffers(false);
    }
  }, [request]);

  // Check transit location
  const checkTransitLocation = useCallback(async () => {
    if (!request || !isMatched) return;
    try {
      const loc = await dataAdapter.getTransitLocation(request.id);
      if (loc) {
        setTransitLocation(loc);
      }
    } catch {}
  }, [request, isMatched]);

  useEffect(() => {
    if (open && request) {
      loadContact();
      loadOffers();
      checkTransitLocation();

      // Supabase Realtime subscription for offers & transit
      try {
        const supabase = createClient();
        const channel = supabase
          .channel(`request-realtime-${request.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'offers',
              filter: `request_id=eq.${request.id}`,
            },
            () => {
              loadOffers();
              toast.info('New update on volunteer offers!');
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'active_transit_locations',
              filter: `request_id=eq.${request.id}`,
            },
            (payload) => {
              if (payload.new) {
                checkTransitLocation();
              }
            }
          )
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch {
        // Fallback for offline/mock mode
      }
    }
  }, [open, request, loadContact, loadOffers, checkTransitLocation]);

  // Load real road routing and nearest emergency medical facilities
  useEffect(() => {
    if (!open || !request) return;

    let isMounted = true;
    setLoadingRoute(true);
    getRoadRoute(
      { lat: userCoords.lat, lng: userCoords.lng },
      { lat: request.latitude, lng: request.longitude },
      travelMode
    )
      .then((res) => {
        if (isMounted) setRouteResult(res);
      })
      .catch(() => {
        if (isMounted) setRouteResult(null);
      })
      .finally(() => {
        if (isMounted) setLoadingRoute(false);
      });

    setLoadingHospitals(true);
    getNearestMedicalFacilities({
      lat: request.latitude,
      lng: request.longitude,
      radiusMeters: 6000,
      limit: 3,
    })
      .then((facilities) => {
        if (isMounted) setNearbyHospitals(facilities);
      })
      .catch(() => {
        if (isMounted) setNearbyHospitals([]);
      })
      .finally(() => {
        if (isMounted) setLoadingHospitals(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, request, travelMode, userCoords.lat, userCoords.lng]);

  // Modal keyboard focus handling & body scroll locking
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (ratingModalOpen) setRatingModalOpen(false);
        else if (reportModalOpen) setReportModalOpen(false);
        else if (locationConsentOpen) setLocationConsentOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, ratingModalOpen, reportModalOpen, locationConsentOpen]);

  if (!open || !request) return null;

  const etaMinutes = calculateETA(request.distanceKm, travelMode);

  // Accept Offer Handler
  const handleAcceptOffer = async (offer: VolunteerOffer) => {
    setActionInProgress(offer.id);
    try {
      const res = await dataAdapter.acceptOffer(offer.id);
      if (res.success) {
        toast.success(`Accepted offer from ${offer.helperName}!`, {
          description: 'Contact details unlocked for direct coordination.',
        });
        await updateRequestStatus(request.id, 'accepted');
        await loadContact();
        await loadOffers();
        await fetchLiveRequests();
      } else {
        toast.error('Could not accept offer', { description: res.error });
      }
    } catch (err: any) {
      toast.error('Error accepting offer', { description: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  // Decline Offer Handler
  const handleDeclineOffer = async (offer: VolunteerOffer) => {
    setActionInProgress(offer.id);
    try {
      await dataAdapter.declineOffer(offer.id);
      toast.info('Offer declined');
      await loadOffers();
    } catch (err: any) {
      toast.error('Error declining offer', { description: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  // Transition Lifecycle Status
  const handleAdvanceStatus = async (newStatus: RequestLifecycleStatus) => {
    setActionInProgress(newStatus);
    try {
      await updateRequestStatus(request.id, newStatus);
      toast.success(`Status updated: ${newStatus.replace('_', ' ').toUpperCase()}`);
      await fetchLiveRequests();

      if (newStatus === 'completed') {
        setRatingModalOpen(true);
      }
    } catch (err: any) {
      toast.error('Could not update status', { description: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  // Live Location Toggle Consent
  const handleToggleLocationSharing = async () => {
    if (!isSharingLocation) {
      // Prompt consent modal first
      setLocationConsentOpen(true);
    } else {
      setIsSharingLocation(false);
      toast.info('Live location sharing stopped');
    }
  };

  const handleConfirmLocationConsent = async () => {
    setLocationConsentOpen(false);
    setIsSharingLocation(true);
    toast.success('Live location sharing activated', {
      description: 'Your real-time pin is now visible to the requester.',
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          await dataAdapter.updateTransitLocation(
            request.id,
            pos.coords.latitude,
            pos.coords.longitude,
            pos.coords.heading || 0,
            pos.coords.speed || 0
          );
        },
        () => {
          // Simulated fallback location in Asansol
          dataAdapter.updateTransitLocation(request.id, 23.685, 86.972, 45, 15);
        }
      );
    }
  };

  // Share Request
  const handleShare = async () => {
    const shareData = {
      title: `KindLink Alert: ${request.title}`,
      text: `${request.title} at ${request.locationName}. Urgency: ${request.urgency}. Can you help?`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {}
    } else {
      await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
      toast.success('Link copied to clipboard!');
    }
  };

  // Report Request
  const handleReport = async () => {
    if (!reportReason.trim()) {
      toast.error('Please enter a reason for the report');
      return;
    }
    await dataAdapter.submitReport(request.id, reportReason);
    setReportModalOpen(false);
    setReportReason('');
    toast.info('Report submitted to Asansol moderators', {
      description: 'Our team will review this request within 15 minutes.',
    });
  };

  // Submit Rating
  const handleRate = async () => {
    const combinedFeedback = `${selectedTags.join(', ')}: ${ratingComment}`.trim();
    await dataAdapter.submitRating(
      request.id,
      request.acceptedHelperId || request.id,
      stars,
      combinedFeedback
    );
    setRatingModalOpen(false);
    toast.success('Thank you for rating your volunteer match!', {
      description: 'Your feedback builds trusted community reputation.',
    });
  };

  const ratingTags = [
    'Punctual & Fast',
    'Lifesaver',
    'Gentle & Caring',
    'Safe Transit',
    'Clear Communication',
    'Equipment in Great Condition',
  ];

  const toggleRatingTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Timeline Steps
  const timelineSteps: { key: RequestLifecycleStatus; label: string; desc: string }[] = [
    { key: 'open', label: 'Open', desc: 'Broadcasted to nearby volunteers' },
    { key: 'offered', label: 'Offered', desc: 'Volunteer stepped up to assist' },
    { key: 'accepted', label: 'Accepted', desc: 'Matched pair confirmed & unlocked' },
    { key: 'on_the_way', label: 'On the way', desc: 'Volunteer en route to location' },
    { key: 'arrived', label: 'Arrived', desc: 'Volunteer arrived at destination' },
    { key: 'completed', label: 'Completed', desc: 'Aid fulfilled successfully' },
  ];

  const getStepIndex = (status: RequestLifecycleStatus) => {
    const idx = timelineSteps.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const activeStepIdx = getStepIndex(currentStatus);

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl rounded-3xl bg-card border border-border/80 dark:border-white/10 p-5 sm:p-7 shadow-2xl text-card-foreground max-h-[92vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-border/80">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
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

                <span className="text-xs font-bold text-muted-foreground uppercase px-2 py-0.5 rounded-full bg-muted border border-border">
                  {request.category}
                </span>
              </div>

              <h2 id="request-detail-title" className="text-xl sm:text-2xl font-bold text-foreground mt-1">
                {request.title}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 touch-target shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Close details"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>

          <div className="mt-4 space-y-5">
            {/* =====================================================================
                LIFECYCLE TIMELINE (Open -> Offered -> Accepted -> On the way -> Arrived -> Completed)
               ===================================================================== */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-foreground uppercase tracking-wider">
                  Request Lifecycle Progress
                </span>
                <span className="text-primary font-black uppercase">
                  {currentStatus.replace('_', ' ')}
                </span>
              </div>

              {/* Multi-step progress bar */}
              <div className="relative flex items-center justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-muted rounded-full -z-0" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-300 -z-0"
                  style={{
                    width: `${(activeStepIdx / (timelineSteps.length - 1)) * 100}%`,
                  }}
                />

                {timelineSteps.map((s, idx) => {
                  const isPassed = idx <= activeStepIdx;
                  const isCurrent = idx === activeStepIdx;
                  return (
                    <div
                      key={s.key}
                      className="relative z-10 flex flex-col items-center group cursor-default"
                    >
                      <div
                        className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-black transition ${
                          isCurrent
                            ? 'bg-primary text-white ring-4 ring-primary/20 scale-110'
                            : isPassed
                            ? 'bg-primary text-white'
                            : 'bg-card border border-border text-muted-foreground'
                        }`}
                      >
                        {isPassed ? <Check className="h-3 w-3 notranslate" /> : idx + 1}
                      </div>
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold mt-1 text-center whitespace-nowrap ${
                          isCurrent ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-foreground leading-relaxed bg-card p-4 rounded-2xl border border-border">
              {request.description}
            </p>

            {/* Dynamic Category Specifications */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              {request.bloodGroup && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300">
                  <span className="block font-medium">Blood Group</span>
                  <span className="text-sm sm:text-base font-extrabold">{request.bloodGroup}</span>
                  <span className="block text-[11px] mt-0.5">{request.unitsNeeded || 1} Units</span>
                </div>
              )}
              {request.itemType && (
                <div className="p-3 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-700 dark:text-teal-300">
                  <span className="block font-medium">Equipment</span>
                  <span className="text-sm sm:text-base font-extrabold truncate">{request.itemType}</span>
                  <span className="block text-[11px] mt-0.5">{request.itemDuration || '3 days'}</span>
                </div>
              )}
              {request.elderlyAidType && (
                <div className="p-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300">
                  <span className="block font-medium">Elderly Aid</span>
                  <span className="text-sm sm:text-base font-extrabold">{request.elderlyAidType}</span>
                  <span className="block text-[11px] mt-0.5">{request.scheduledTime || 'Scheduled'}</span>
                </div>
              )}
              {request.bookTitle && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  <span className="block font-medium">Textbook</span>
                  <span className="text-sm sm:text-base font-extrabold truncate">{request.bookTitle}</span>
                  <span className="block text-[11px] mt-0.5">{request.bookCondition || 'Good'}</span>
                </div>
              )}
              {request.pickupAddress && (
                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300">
                  <span className="block font-medium">Transit</span>
                  <span className="text-sm sm:text-base font-extrabold">
                    {request.passengerCount || 1} Pax
                  </span>
                  <span className="block text-[11px] mt-0.5">
                    {request.wheelchairAccessible ? 'Wheelchair Ready' : 'Standard'}
                  </span>
                </div>
              )}
              <div className="p-3 rounded-2xl bg-card border border-border">
                <span className="block text-muted-foreground font-medium">Waiting Time</span>
                <span className="text-sm sm:text-base font-extrabold text-foreground">
                  {request.waitingMinutes} Mins
                </span>
                <span className="block text-[11px] text-muted-foreground mt-0.5">
                  {request.createdAt}
                </span>
              </div>
            </div>

            {/* =====================================================================
                PROXIMITY, OSRM ROUTE PREVIEW & TRAVEL MODE
               ===================================================================== */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Navigation className="h-4 w-4 text-primary notranslate" />
                  <span>
                    You to this request:{' '}
                    <strong className="text-foreground">
                      {routeResult
                        ? routeResult.formattedText
                        : `${request.distanceKm} km, about ${formatETA(etaMinutes)} by ${travelMode}`}
                    </strong>
                  </span>
                </span>
                {loadingRoute ? (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin notranslate" />
                    <span>Routing...</span>
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {routeResult?.source === 'osrm' ? 'OSRM Road Route' : 'Direct Line'}
                  </span>
                )}
              </div>

              {/* Road Route Mini-Map */}
              <div className="pt-0.5">
                <RequestRouteMiniMap
                  origin={[userCoords.lat, userCoords.lng]}
                  destination={[request.latitude, request.longitude]}
                  routeCoordinates={
                    routeResult?.coordinates && routeResult.coordinates.length > 0
                      ? routeResult.coordinates
                      : [
                          [userCoords.lat, userCoords.lng],
                          [request.latitude, request.longitude],
                        ]
                  }
                  isStraightLine={routeResult?.source === 'straight-line'}
                  urgency={request.urgency}
                  destinationLabel={request.title}
                />
              </div>

              {/* Travel Mode Selector */}
              <div className="flex gap-2 pt-1">
                {(['bike', 'walking', 'car'] as TravelMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTravelMode(mode)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition touch-target ${
                      travelMode === mode
                        ? 'border-primary bg-primary text-white shadow-xs font-bold'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
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

            {/* =====================================================================
                NEAREST HOSPITALS, CLINICS, PHARMACIES & BLOOD BANKS
               ===================================================================== */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Hospital className="h-4 w-4 text-rose-500 notranslate" />
                  <span>Nearest Medical Hubs &amp; Emergency</span>
                </h4>
                <span className="text-[10px] text-muted-foreground">Around request</span>
              </div>

              {loadingHospitals ? (
                <div className="p-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin notranslate" />
                  <span>Locating nearest emergency hospitals &amp; pharmacies...</span>
                </div>
              ) : nearbyHospitals.length > 0 ? (
                <div className="space-y-2">
                  {nearbyHospitals.map((facility) => {
                    const mapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`;
                    return (
                      <div
                        key={facility.id}
                        className="p-3 rounded-xl bg-muted/40 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-foreground">{facility.name}</span>
                            <span
                              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                facility.type === 'hospital'
                                  ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                  : facility.type === 'blood_bank'
                                  ? 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
                                  : facility.type === 'pharmacy'
                                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                  : 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                              }`}
                            >
                              {facility.type.replace('_', ' ')}
                            </span>
                            {facility.emergency && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
                                24/7
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            📍 {facility.distanceKm.toFixed(1)} km away
                            {facility.address ? ` · ${facility.address}` : ''}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {facility.phone && (
                            <a
                              href={`tel:${facility.phone.replace(/[^0-9+]/g, '')}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-xs touch-target"
                              title="Call Facility"
                            >
                              <Phone className="h-3 w-3 notranslate" />
                              <span>Call</span>
                            </a>
                          )}
                          <a
                            href={mapDirectionsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border bg-card hover:bg-muted text-foreground text-[11px] font-bold transition shadow-xs touch-target"
                            title="Get Directions"
                          >
                            <ExternalLink className="h-3 w-3 notranslate" />
                            <span>Directions</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No medical facilities found nearby.</p>
              )}
            </div>

            {/* =====================================================================
                CONTACT DETAILS: MASKED vs UNMASKED ON ACCEPTANCE
               ===================================================================== */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/60 border border-border space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5 notranslate" />
                  <div>
                    <h4 className="text-xs font-bold text-foreground">Location</h4>
                    <p className="text-xs text-muted-foreground">{request.locationName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold shrink-0">
                  <ShieldCheck className="h-4 w-4 notranslate" />
                  <span>{request.verificationBadge}</span>
                </div>
              </div>

              {/* Matched Pair Contact Reveal Banner */}
              {isMatched ? (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 notranslate" />
                      <span>Verified Matched Pair · Direct Contact Unlocked</span>
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                      Private Channel
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {contactInfo?.name || request.contactName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {contactInfo?.phone || request.phone}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`tel:${contactInfo?.phone || request.phone}`}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs touch-target"
                      >
                        <Phone className="h-3.5 w-3.5 notranslate" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${(contactInfo?.phone || request.phone).replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-2 text-xs font-bold transition shadow-xs touch-target"
                      >
                        <MessageCircle className="h-3.5 w-3.5 notranslate" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-background border border-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-muted-foreground notranslate" />
                    <div>
                      <span className="font-bold text-foreground block">{request.contactName}</span>
                      <span className="text-[11px] text-muted-foreground">
                        +91 98320 ••••• (Protected until match)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                    Masked
                  </span>
                </div>
              )}
            </div>

            {/* =====================================================================
                VOLUNTEER OFFERS SECTION (For Requester to Accept / Decline)
               ===================================================================== */}
            {isRequester && offers.length > 0 && currentStatus === 'open' && (
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5">
                    <HeartHandshake className="h-4 w-4 text-primary notranslate" />
                    <span>Volunteer Offers Received ({offers.length})</span>
                  </h4>
                  <span className="text-[10px] text-primary font-bold">Action Required</span>
                </div>

                <div className="space-y-2.5">
                  {offers.map((offer) => (
                    <div
                      key={offer.id}
                      className="p-3.5 rounded-2xl bg-card border border-border shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            {offer.helperName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-foreground">
                                {offer.helperName}
                              </span>
                              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 notranslate" />
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {offer.helperRating.toFixed(1)} ★ · {offer.helperDistanceKm || 1.2} km away · {offer.createdAt}
                            </span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                          {offer.status}
                        </span>
                      </div>

                      <p className="text-xs text-foreground bg-muted/40 p-2.5 rounded-xl border border-border/70">
                        &quot;{offer.message}&quot;
                      </p>

                      {offer.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={() => handleDeclineOffer(offer)}
                            disabled={actionInProgress === offer.id}
                            className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => handleAcceptOffer(offer)}
                            disabled={actionInProgress === offer.id}
                            className="flex-2 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-soft flex items-center justify-center gap-1.5"
                          >
                            {actionInProgress === offer.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin notranslate" />
                            ) : (
                              <Check className="h-3.5 w-3.5 notranslate" />
                            )}
                            <span>Accept Volunteer</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* =====================================================================
                LIVE LOCATION SHARING SECTION (When Accepted / On the way)
               ===================================================================== */}
            {isMatched && currentStatus !== 'completed' && (
              <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`h-4 w-4 ${
                        isSharingLocation || transitLocation
                          ? 'text-emerald-500 animate-pulse'
                          : 'text-muted-foreground'
                      } notranslate`}
                    />
                    <span className="text-xs font-bold text-foreground">
                      Live Transit GPS Sharing
                    </span>
                  </div>

                  {/* Toggle button for helper */}
                  <button
                    onClick={handleToggleLocationSharing}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isSharingLocation
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {isSharingLocation ? 'Sharing Live Pin' : 'Share Location'}
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {isSharingLocation
                    ? 'Your live GPS pin is broadcasting securely to the requester. Updates every 10 seconds.'
                    : 'Helper can broadcast live location while on the way with end-to-end privacy consent.'}
                </p>

                {transitLocation && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      Helper en route: ({transitLocation.lat.toFixed(4)}, {transitLocation.lng.toFixed(4)})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(transitLocation.updatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                STATUS ADVANCEMENT CONTROLS (On the way -> Arrived -> Complete)
               ===================================================================== */}
            {isMatched && currentStatus !== 'completed' && (
              <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-2.5">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider block">
                  Action Controls
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {currentStatus === 'accepted' && (
                    <button
                      onClick={() => handleAdvanceStatus('on_the_way')}
                      disabled={Boolean(actionInProgress)}
                      className="py-2.5 px-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="h-3.5 w-3.5 notranslate" />
                      <span>Start: On the Way</span>
                    </button>
                  )}

                  {currentStatus === 'on_the_way' && (
                    <button
                      onClick={() => handleAdvanceStatus('arrived')}
                      disabled={Boolean(actionInProgress)}
                      className="py-2.5 px-3 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <MapPin className="h-3.5 w-3.5 notranslate" />
                      <span>Mark Arrived at Location</span>
                    </button>
                  )}

                  <button
                    onClick={() => handleAdvanceStatus('completed')}
                    disabled={Boolean(actionInProgress)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-xs flex items-center justify-center gap-1.5 sm:col-span-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 notranslate" />
                    <span>Confirm Completion</span>
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                PRIMARY ACTION BUTTONS (Offer Help / Completed / Share / Report)
               ===================================================================== */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              {currentStatus === 'open' && (
                <button
                  type="button"
                  onClick={() => setHelpFlowOpen(true)}
                  className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95 touch-target"
                >
                  <HeartHandshake className="h-5 w-5 notranslate" />
                  <span>Offer Help Now</span>
                </button>
              )}

              {currentStatus === 'completed' && (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  <CheckCircle2 className="h-4 w-4 notranslate" />
                  <span>Task Successfully Completed!</span>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card px-4 py-3 text-xs font-bold text-foreground hover:bg-muted transition-all active:scale-95 touch-target shadow-xs"
                  title="Share request"
                >
                  <Share2 className="h-4 w-4 notranslate" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="flex items-center justify-center gap-1.5 rounded-2xl border border-border/80 bg-card px-4 py-3 text-xs font-bold text-muted-foreground hover:text-rose-500 hover:bg-muted transition-all active:scale-95 touch-target shadow-xs"
                  title="Report request"
                >
                  <Flag className="h-4 w-4 notranslate" />
                  <span className="hidden sm:inline">Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          LOCATION SHARING PRIVACY CONSENT MODAL
         ===================================================================== */}
      {locationConsentOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Radio className="h-6 w-6 notranslate animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-foreground text-center">
              Share Live Location While On the Way?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed text-center">
              Your real-time GPS coordinates will only be shared with {request.contactName} during this active response. It automatically terminates when the task is completed or when you toggle it off.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLocationConsentOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLocationConsent}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition active:scale-95 shadow-soft"
              >
                I Agree & Share
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          5-STAR MUTUAL RATING & FEEDBACK MODAL
         ===================================================================== */}
      {ratingModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl text-center space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
              <Star className="h-6 w-6 notranslate fill-amber-500" />
            </div>
            <h3 className="text-base font-bold text-foreground">Rate Your Experience</h3>
            <p className="text-xs text-muted-foreground">
              Mutual ratings foster trust in Asansol and Dhanbad community circles.
            </p>

            {/* Interactive 5-Star Selector */}
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStars(s)}
                  className={`text-3xl transition-transform active:scale-95 ${
                    s <= stars ? 'text-amber-500 scale-110' : 'text-muted-foreground/30 hover:text-amber-400/50'
                  }`}
                  aria-label={`Rate ${s} star${s > 1 ? 's' : ''}`}
                >
                  ★
                </button>
              ))}
            </div>

            {/* Quick Feedback Tags */}
            <div className="flex flex-wrap gap-1.5 justify-center">
              {ratingTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleRatingTag(tag)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95 ${
                    selectedTags.includes(tag)
                      ? 'bg-primary text-white font-bold shadow-xs'
                      : 'border border-border/80 bg-muted/60 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            <textarea
              rows={2}
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Leave a short word of appreciation..."
              className="w-full p-3 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRatingModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-all active:scale-95"
              >
                Skip
              </button>
              <button
                type="button"
                onClick={handleRate}
                className="flex-2 py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-soft"
              >
                Submit Rating
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          REPORT INAPPROPRIATE REQUEST MODAL
         ===================================================================== */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl text-left space-y-4">
            <h3 className="text-base font-bold text-foreground">Report Inappropriate Request</h3>
            <p className="text-xs text-muted-foreground">
              Please specify reason (e.g. spam, commercial service, incorrect urgency):
            </p>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Explain the safety or policy concern..."
              className="w-full p-3 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold hover:bg-muted transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReport}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-all active:scale-95 shadow-soft"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          HELP FLOW MODAL (Volunteer Response Sheet)
         ===================================================================== */}
      <HelpFlowModal
        request={request}
        open={helpFlowOpen}
        onClose={() => setHelpFlowOpen(false)}
        onHelpSubmitted={() => {
          loadOffers();
          fetchLiveRequests();
        }}
      />
    </>
  );
}
