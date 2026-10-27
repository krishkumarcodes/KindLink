'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  X,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
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
  Droplet,
  BookOpen,
  Package,
  PlusCircle,
  Users,
  Flame,
  Calendar,
  Target,
  ChevronDown,
  RotateCw,
  ThumbsUp,
  Building2,
  KeyRound,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  HelpRequest,
  TravelMode,
  VolunteerOffer,
  RequestLifecycleStatus,
  HelpCategory,
  UrgencyLevel,
} from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { calculateETA, formatETA } from '@/lib/data/distance';
import { getRoadRoute, RoadRouteResult } from '@/lib/geo/osrm';
import { getNearestMedicalFacilities, MedicalFacility } from '@/lib/geo/hospitals';
import { HelpFlowModal } from './HelpFlowModal';
import { dataAdapter } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';
import { OverlayPortal, useBodyScrollLock } from '@/components/ui/OverlayPortal';
import { getCategoryToken } from '@/lib/data/categoryColors';
import { formatCategoryTitle } from '@/lib/data/categories';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { formatTimeAgo, formatMinutesAgo } from '@/lib/utils/formatTime';
import { OffersReceivedSection } from './OffersReceivedSection';
import { StickyActionBar } from './StickyActionBar';
import { EndorsementChip } from './EndorsementChip';
import { HandoverPinModal } from './HandoverPinModal';
import { useSharedTicker } from '@/lib/utils/useSharedTicker';

const EmergencyStoryCardModal = dynamic(
  () => import('./EmergencyStoryCardModal').then((mod) => mod.EmergencyStoryCardModal),
  { ssr: false }
);

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

interface LifecycleStepItem {
  key: RequestLifecycleStatus | 'offered';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const LIFECYCLE_STEPS: LifecycleStepItem[] = [
  { key: 'open', label: 'Open', icon: Radio, description: 'Sent to nearby volunteers' },
  { key: 'offered', label: 'Offered', icon: HeartHandshake, description: 'Volunteer stepped up' },
  { key: 'accepted', label: 'Accepted', icon: ShieldCheck, description: 'Matched pair confirmed' },
  { key: 'on_the_way', label: 'On the way', icon: Navigation, description: 'Volunteer en route' },
  { key: 'arrived', label: 'Arrived', icon: MapPin, description: 'Volunteer at location' },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, description: 'Aid fulfilled successfully' },
];

function getCategoryConfig(category: HelpCategory, customLabel?: string) {
  const token = getCategoryToken(category, customLabel);
  const label = formatCategoryTitle(category, customLabel);
  return {
    label,
    icon: token.icon,
    badge: token.badgeBg,
    primary: token.primary,
    gradient: token.gradient,
    glowTailwind: token.glowTailwind,
  };
}

function getUrgencyConfig(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'critical':
      return {
        label: 'Critical',
        icon: Flame,
        badge: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
      };
    case 'high':
      return {
        label: 'High',
        icon: AlertTriangle,
        badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      };
    case 'medium':
      return {
        label: 'Medium',
        icon: Clock,
        badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
      };
    case 'low':
      return {
        label: 'Low',
        icon: CheckCircle2,
        badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      };
    default:
      return {
        label: String(urgency || 'MEDIUM').toUpperCase(),
        icon: AlertCircle,
        badge: 'bg-muted text-muted-foreground border-border',
      };
  }
}

function formatMemberSince(dateStr?: string | null): string {
  if (!dateStr) return 'Oct 2024';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Oct 2024';
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${month} ${year}`;
}

function formatWaitingDuration(minutes: number): string {
  if (minutes < 1) return 'just now';
  const rounded = Math.floor(minutes);
  const hours = Math.floor(rounded / 60);
  const remMinutes = rounded % 60;
  if (hours === 0) return `${remMinutes} min`;
  if (remMinutes === 0) return `${hours} h`;
  return `${hours} h ${remMinutes} min`;
}

export function RequestDetailModal({ request, open, onClose }: RequestDetailModalProps) {
  const {
    travelMode,
    setTravelMode,
    userProfile,
    userCoords,
    updateRequestStatus,
    fetchLiveRequests,
    fetchLiveStats,
    withdrawOffer,
    setCurrentView,
    setProfileActiveTab,
    addNotification,
    endorseRequest,
    removeEndorsement,
    setSelectedRequestId,
  } = useKindLinkStore();

  const sheetRef = useRef<HTMLDivElement>(null);

  // Body scroll locking via portal system
  useBodyScrollLock(open);

  const [helpFlowOpen, setHelpFlowOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [isEndorsing, setIsEndorsing] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const isOrgAccount = Boolean(
    userProfile?.isOrganization || userProfile?.organizationVerified
  );

  const myOrgName =
    userProfile?.organizationName ||
    userProfile?.displayName ||
    userProfile?.name ||
    'Verified Organization';

  const isAlreadyEndorsedByMe = Boolean(
    request?.endorsedByOrgNames?.some(
      (name) => typeof name === 'string' && name.toLowerCase() === myOrgName.toLowerCase()
    )
  );

  const handleToggleEndorsement = async () => {
    if (!request) return;
    setIsEndorsing(true);
    try {
      if (isAlreadyEndorsedByMe) {
        const res = await removeEndorsement(request.id);
        if (res.success) {
          toast.info('Endorsement withdrawn', {
            description: 'Your organization endorsement has been removed.',
          });
          if (fetchLiveRequests) fetchLiveRequests();
        } else {
          toast.error(res.error || 'Failed to remove endorsement');
        }
      } else {
        const res = await endorseRequest(request.id);
        if (res.success) {
          toast.success('Request endorsed!', {
            description: `${myOrgName} has verified and endorsed this emergency request.`,
          });
          if (fetchLiveRequests) fetchLiveRequests();
        } else {
          toast.error(res.error || 'Failed to endorse request');
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error updating endorsement');
    } finally {
      setIsEndorsing(false);
    }
  };

  const [contactInfo, setContactInfo] = useState<{
    name: string;
    phone: string;
    relationship: string;
  } | null>(null);

  // Offers state
  const [offers, setOffers] = useState<VolunteerOffer[]>([]);
  const [, setLoadingOffers] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Live Location Sharing state
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [locationConsentOpen, setLocationConsentOpen] = useState(false);
  const [transitLocation, setTransitLocation] = useState<{
    lat: number;
    lng: number;
    updatedAt: string;
  } | null>(null);

  // Reporting state
  const REPORT_REASONS = [
    'Fake or wrong',
    'Spam',
    'Unsafe',
    'Already solved',
    'Other',
  ] as const;

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<string>('Fake or wrong');
  const [otherReportText, setOtherReportText] = useState('');
  const [hasAlreadyReported, setHasAlreadyReported] = useState(false);

  useEffect(() => {
    if (!request?.id) return;
    try {
      const raw = localStorage.getItem('kindlink_reported_requests');
      if (raw) {
        const list = JSON.parse(raw);
        setHasAlreadyReported(Array.isArray(list) && list.includes(request.id));
      }
    } catch {}
  }, [request?.id]);

  // Story Card Share Modal
  const [storyModalOpen, setStoryModalOpen] = useState(false);

  // Rating Modal
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Road Routing & Mini-map state
  const [routeResult, setRouteResult] = useState<RoadRouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [nearbyHospitals, setNearbyHospitals] = useState<MedicalFacility[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [isNearbyCollapsed, setIsNearbyCollapsed] = useState(false);

  // Remember the last chosen mode on device in localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedMode = localStorage.getItem('kindlink_travel_mode') as TravelMode | null;
        if (savedMode && (savedMode === 'bike' || savedMode === 'walking' || savedMode === 'car')) {
          setTravelMode(savedMode);
        }
      } catch {}
    }
  }, [setTravelMode]);

  const handleTravelModeChange = (mode: TravelMode) => {
    setTravelMode(mode);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kindlink_travel_mode', mode);
      } catch {}
    }
  };

  // Nearby Hospitals & Medical Facilities state
  const [nearbyPlaces, setNearbyPlaces] = useState<MedicalFacility[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);

  // Live ticking state (updates every 60s for live Waiting tile; pauses automatically when hidden)
  const currentTime = useSharedTicker(60000, open);

  // Check if current user is the request owner
  const isRequester = Boolean(isRequestOwner(request, userProfile));
  const isAcceptedHelper = Boolean(
    userProfile && request && request.acceptedHelperId === userProfile.id
  );

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

  // Supabase Realtime subscription for requests, offers & transit
  useEffect(() => {
    if (open && request) {
      loadContact();
      loadOffers();
      checkTransitLocation();

      try {
        const supabase = createClient();
        const channel = supabase
          .channel(`request-live-detail-${request.id}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'requests',
              filter: `id=eq.${request.id}`,
            },
            async () => {
              await fetchLiveRequests();
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'offers',
              filter: `request_id=eq.${request.id}`,
            },
            async () => {
              await loadOffers();
              toast.info('New volunteer offer update received!');
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
        // Fallback for offline / mock mode
      }
    }
  }, [open, request, loadContact, loadOffers, checkTransitLocation, fetchLiveRequests]);

  // Load real road routing and nearest emergency medical facilities
  useEffect(() => {
    if (!open || !request) return;

    let isMounted = true;
    setLoadingRoute(true);
    const reqLat = Number(request.latitude) || 23.6889;
    const reqLng = Number(request.longitude) || 86.9661;
    const userLat = Number(userCoords?.lat) || 23.6889;
    const userLng = Number(userCoords?.lng) || 86.9661;

    getRoadRoute(
      { lat: userLat, lng: userLng },
      { lat: reqLat, lng: reqLng },
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
      lat: reqLat,
      lng: reqLng,
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
  }, [open, request, travelMode, userCoords?.lat, userCoords?.lng]);

  // Keyboard navigation & escape handling
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
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose, ratingModalOpen, reportModalOpen, locationConsentOpen]);

  if (!open || !request) return null;

  const safeDistanceKm = typeof request.distanceKm === 'number' && !isNaN(request.distanceKm) ? request.distanceKm : 0;
  const etaMinutes = calculateETA(safeDistanceKm, travelMode);

  // Accept Offer Handler
  const handleAcceptOffer = async (offer: VolunteerOffer) => {
    setActionInProgress(offer.id);
    try {
      const res = await dataAdapter.acceptOffer(offer.id);
      if (res.success) {
        toast.success(`Accepted offer from ${offer.helperName}!`, {
          description: 'Contact details unlocked for direct coordination.',
        });
        // Transition other pending offers to 'not_selected' and mark this accepted
        setOffers((prev) =>
          prev.map((o) =>
            o.id === offer.id
              ? { ...o, status: 'accepted' }
              : o.status === 'pending'
              ? { ...o, status: 'not_selected' }
              : o
          )
        );
        addNotification({
          id: `notif-${Date.now()}`,
          title: 'Offer Accepted!',
          message: `${offer.helperName} was accepted for "${request.title}". Phone number shared for coordination.`,
          timeAgo: 'Just now',
          timestamp: Date.now(),
          unread: true,
          urgency: request.urgency,
          requestId: request.id,
          category: request.category,
        });
        await updateRequestStatus(request.id, 'accepted');
        await loadContact();
        await loadOffers();
        await fetchLiveRequests();
        if (fetchLiveStats) {
          await fetchLiveStats();
        }
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
  const handleDeclineOffer = async (offer: VolunteerOffer, reason?: string) => {
    setActionInProgress(offer.id);
    try {
      await dataAdapter.declineOffer(offer.id, reason);
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, status: 'declined', declineReason: reason } : o))
      );
      toast.info(`Offer from ${offer.helperName} declined`);
      await loadOffers();
    } catch (err: any) {
      toast.error('Error declining offer', { description: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  // Withdraw Offer Handler
  const handleWithdrawOffer = async (offerId: string) => {
    setActionInProgress(offerId);
    try {
      await withdrawOffer(offerId, request.id);
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, status: 'withdrawn' } : o))
      );
      toast.info('Offer withdrawn');
      await loadOffers();
      await fetchLiveRequests();
      if (fetchLiveStats) {
        await fetchLiveStats();
      }
    } catch (err: any) {
      toast.error('Error withdrawing offer', { description: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  // Cancel Request Handler
  const handleCancelRequest = async () => {
    setActionInProgress('cancel');
    try {
      await dataAdapter.cancelRequest(request.id);
      await updateRequestStatus(request.id, 'cancelled');
      toast.info('Request has been cancelled');
      await fetchLiveRequests();
      onClose();
    } catch (err: any) {
      toast.error('Error cancelling request', { description: err.message });
    } finally {
      setActionInProgress(null);
    }
  };

  // Get Verified Handler (redirects to Verification tab)
  const handleGetVerified = () => {
    setProfileActiveTab('verification');
    setCurrentView('profile');
    onClose();
    toast.info('Redirecting to Verification tab', {
      description: 'Upload your student or govt ID to become a verified volunteer.',
    });
  };

  // Transition Lifecycle Status
  const handleAdvanceStatus = async (newStatus: RequestLifecycleStatus) => {
    // If equipment/books requires handover confirmation PIN and viewer is helper, prompt PIN modal
    if (newStatus === 'completed' && request.requiresHandoverPin && !isRequester) {
      setPinModalOpen(true);
      return;
    }

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
          dataAdapter.updateTransitLocation(request.id, 23.685, 86.972, 45, 15);
        }
      );
    }
  };

  // Share Request via Web Share API with copy-link fallback toast
  const handleShare = async () => {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const shareUrl = `${siteUrl}/requests/${request.id}`;
    const shareData = {
      title: `KindLink Alert: ${request.title}`,
      text: `${request.title} at ${request.locationName}. Urgency: ${request.urgency}. Can you help?`,
      url: shareUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') return;
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!', {
        description: 'Share this link with your neighbors or community group.',
      });
    } catch {
      toast.info(`Request link: ${shareUrl}`);
    }
  };

  // Report Request with reason sheet & double report guard
  const handleReport = async () => {
    if (hasAlreadyReported) {
      toast.info('You have already reported this request.');
      setReportModalOpen(false);
      return;
    }

    const finalReason =
      selectedReportReason === 'Other'
        ? otherReportText.trim()
          ? `Other: ${otherReportText.trim()}`
          : 'Other'
        : selectedReportReason;

    try {
      await dataAdapter.submitReport(request.id, finalReason);
      setHasAlreadyReported(true);
      try {
        const raw = localStorage.getItem('kindlink_reported_requests');
        const list = raw ? JSON.parse(raw) : [];
        if (!list.includes(request.id)) {
          list.push(request.id);
          localStorage.setItem('kindlink_reported_requests', JSON.stringify(list));
        }
      } catch {}

      setReportModalOpen(false);
      setOtherReportText('');
      toast.success('Thank you for reporting', {
        description: 'Our moderation team will review this request shortly.',
      });
    } catch (err: any) {
      toast.error('Could not submit report', { description: err.message });
    }
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

  // Determine active step in 6-step lifecycle
  // 0: Open, 1: Offered, 2: Accepted, 3: On the way, 4: Arrived, 5: Completed
  const hasOffers = offers.length > 0 || Boolean(request.helpersOffered && request.helpersOffered > 0);

  let activeStepIdx = 0;
  if (currentStatus === 'completed') {
    activeStepIdx = 5;
  } else if (currentStatus === 'arrived') {
    activeStepIdx = 4;
  } else if (currentStatus === 'on_the_way') {
    activeStepIdx = 3;
  } else if (currentStatus === 'accepted') {
    activeStepIdx = 2;
  } else if (hasOffers) {
    // "Offered" activates when at least one offer exists
    activeStepIdx = 1;
  } else {
    activeStepIdx = 0;
  }

  const safeStepIdx = Math.max(0, Math.min(LIFECYCLE_STEPS.length - 1, activeStepIdx));
  const activeStepItem = LIFECYCLE_STEPS[safeStepIdx] || LIFECYCLE_STEPS[0];

  const rawContact = typeof request.contactName === 'string' ? request.contactName.trim() : '';
  const requesterFirstName = rawContact ? rawContact.split(/\s+/)[0] : 'Community Member';
  const categoryConfig = getCategoryConfig(request.category, request.customCategoryLabel);
  const urgencyConfig = getUrgencyConfig(request.urgency);
  const CategoryIcon = categoryConfig.icon;
  const UrgencyIcon = urgencyConfig.icon;

  // Format meta line "Posted by <first name> · <verified chip> · 3 h 44 min ago"
  const metaTimeAgo = request.waitingMinutes
    ? formatMinutesAgo(request.waitingMinutes)
    : formatTimeAgo(request.createdAt);

  // Live Ticking Waiting Tile
  const waitingMinutesElapsed = (() => {
    if (request.createdAt) {
      const createdMs = new Date(request.createdAt).getTime();
      if (!isNaN(createdMs) && createdMs > 0) {
        return Math.max(0, Math.floor((currentTime - createdMs) / 60000));
      }
    }
    if (typeof request.waitingMinutes === 'number') {
      return request.waitingMinutes;
    }
    return 0;
  })();

  const waitingTileValue = formatWaitingDuration(waitingMinutesElapsed);
  const waitingSinceFormatted = (() => {
    if (!request.createdAt) return 'since posted';
    const d = new Date(request.createdAt);
    if (isNaN(d.getTime())) return 'since posted';
    return `since ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  })();

  const neededByTileValue = request.neededByTime || request.scheduledTime || 'Not set';

  // Last update string for mobile tracker
  const lastUpdateTrackerText = (() => {
    if (transitLocation?.updatedAt) {
      return `Updated ${formatTimeAgo(transitLocation.updatedAt)}`;
    }
    if (request.createdAt) {
      return `Updated ${formatTimeAgo(request.createdAt)}`;
    }
    return 'Updated recently';
  })();

  // Category-specific heading for nearby facilities
  const nearbyHeading = useMemo(() => {
    switch (request.category) {
      case 'blood':
        return { title: 'Nearby hospitals & blood banks', subtitle: 'Around request location' };
      case 'equipment':
        return { title: 'Nearby hospitals & medical supply', subtitle: 'Around request location' };
      case 'elderly':
        return { title: 'Nearby hospitals & clinics', subtitle: 'Around request location' };
      case 'transport':
        return { title: 'Nearby hospitals & transit hubs', subtitle: 'Around request location' };
      default:
        return { title: 'Nearby hospitals', subtitle: 'Around request location' };
    }
  }, [request.category]);

  const getStepTimestamp = (idx: number): string => {
    if (idx === 0) {
      if (!request.createdAt) return 'Opened';
      const d = new Date(request.createdAt);
      return isNaN(d.getTime()) ? 'Opened' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    if (idx === 1) {
      if (offers.length > 0 && offers[0].createdAt) {
        return formatTimeAgo(offers[0].createdAt);
      }
      return 'Offered';
    }
    if (idx === 2) return 'Accepted';
    if (idx === 3) {
      if (transitLocation?.updatedAt) {
        const d = new Date(transitLocation.updatedAt);
        return isNaN(d.getTime()) ? 'En route' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
      }
      return 'En route';
    }
    if (idx === 4) return 'Arrived';
    if (idx === 5) return 'Completed';
    return '';
  };

  return (
    <OverlayPortal>
      {/* 
        Full-height bottom sheet on phones, centered dialog on desktop.
        Visible gap below status bar: pt-[max(12px,calc(env(safe-area-inset-top)+12px))].
        Rendered above header and bottom tab bar (z-50).
      */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="request-detail-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none pt-[max(12px,calc(env(safe-area-inset-top)+12px))] sm:p-4"
      >
        {/* Backdrop click dismiss */}
        <div
          className="fixed inset-0 -z-10"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Sheet Container Surface */}
        <div
          ref={sheetRef}
          tabIndex={-1}
          className="relative w-full max-w-2xl h-[calc(100dvh-max(12px,calc(env(safe-area-inset-top)+12px)))] sm:h-auto sm:max-h-[90dvh] flex flex-col bg-card text-card-foreground rounded-t-3xl sm:rounded-3xl border border-border/80 shadow-2xl overflow-hidden outline-none animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
        >
          {/* =====================================================================
              1. STICKY TOP BAR & TITLE
             ===================================================================== */}
          <div className="sticky top-0 z-20 shrink-0 bg-card border-b border-border/80 px-4 sm:px-6 pt-3.5 pb-3.5 space-y-2">
            {/* Top Row: Category Chip, Urgency Badge, Status Chip, Accessible Close Button */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                {/* Category Chip */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${categoryConfig.badge}`}
                >
                  <CategoryIcon className="h-3.5 w-3.5 notranslate shrink-0" />
                  <span>{categoryConfig.label}</span>
                </span>

                {/* Urgency Badge (with text and icon, never colour alone) */}
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${urgencyConfig.badge}`}
                >
                  <UrgencyIcon className="h-3.5 w-3.5 notranslate shrink-0" />
                  <span>{urgencyConfig.label}</span>
                </span>

                {/* Status Chip */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
                  <span className="capitalize">{activeStepItem.label}</span>
                </span>

                {/* Your Request Badge */}
                {isRequester && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                    <span aria-hidden="true">★</span>
                    <span>Your request</span>
                  </span>
                )}

                {/* NGO Endorsed Chip */}
                {request && <EndorsementChip request={request} />}
              </div>

              {/* Top Bar Actions: Share Story Card & Accessible Close Button */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setStoryModalOpen(true)}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-primary hover:bg-primary/10 transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="Share Emergency Story Card"
                  aria-label="Share Emergency Story Card"
                >
                  <Share2 className="h-5 w-5 notranslate" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shrink-0"
                  aria-label="Close request details sheet"
                >
                  <X className="h-5 w-5 notranslate" />
                </button>
              </div>
            </div>

            {/* Title Below: up to 3 lines, balanced wrapping, 22-24px, strong contrast */}
            <h2
              id="request-detail-title"
              className="text-[22px] sm:text-[24px] font-bold text-foreground leading-snug line-clamp-3 [text-wrap:balance] tracking-tight"
            >
              {request.title}
            </h2>

            {/* Meta Line under title: "Posted by <first name> · <verified chip> · 3 h 44 min ago" */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap font-medium pt-0.5">
              <span>
                Posted by <strong className="text-foreground font-semibold">{requesterFirstName}</strong>
              </span>
              <span aria-hidden="true">·</span>
              {request.verified && (
                <>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">
                    <ShieldCheck className="h-3.5 w-3.5 notranslate shrink-0" />
                    <span>Verified</span>
                  </span>
                  <span aria-hidden="true">·</span>
                </>
              )}
              <span>{metaTimeAgo}</span>
            </div>
          </div>

          {/* =====================================================================
              2. SCROLLING MIDDLE CONTENT
             ===================================================================== */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 space-y-5">
            {/* =====================================================================
                PROGRESS TRACKER
                (Rename "Request lifecycle progress" to "Progress", 6 steps, live updates)
               ===================================================================== */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs font-bold pb-0.5">
                <span className="text-foreground uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                  <span>Progress</span>
                </span>
                <span className="text-primary font-black uppercase text-[11px] bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
                  {activeStepItem.label}
                </span>
              </div>

              {/* Wide screens (>=480px): Horizontal tracker with icons and labels */}
              <div className="hidden min-[480px]:block pt-2 pb-1">
                <div className="relative flex items-center justify-between">
                  {/* Background Track */}
                  <div className="absolute left-4 right-4 top-4 h-1 bg-muted rounded-full -z-0" />
                  {/* Filled Active Track */}
                  <div
                    className="absolute left-4 top-4 h-1 bg-primary rounded-full transition-all duration-300 -z-0"
                    style={{
                      width: `calc(${(safeStepIdx / (LIFECYCLE_STEPS.length - 1)) * 100}% - 2rem)`,
                    }}
                  />

                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const isCompleted = idx < safeStepIdx;
                    const isCurrent = idx === safeStepIdx;
                    const StepIcon = step.icon;

                    return (
                      <div
                        key={step.key}
                        className="relative z-10 flex flex-col items-center min-w-[54px] text-center"
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-primary text-white shadow-xs'
                              : isCurrent
                              ? 'bg-primary text-white ring-4 ring-primary/25 motion-safe:animate-pulse shadow-md'
                              : 'bg-card border-2 border-border text-muted-foreground/60 opacity-60'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4 stroke-[3] notranslate" />
                          ) : (
                            <StepIcon className="h-4 w-4 notranslate" />
                          )}
                        </div>

                        <span
                          className={`text-[10px] font-bold mt-1.5 whitespace-nowrap ${
                            isCurrent
                              ? 'text-primary'
                              : isCompleted
                              ? 'text-foreground font-semibold'
                              : 'text-muted-foreground opacity-60'
                          }`}
                        >
                          {step.label}
                        </span>

                        {/* Completed steps get a checkmark and timestamp */}
                        {isCompleted && (
                          <span className="text-[9px] text-muted-foreground font-medium mt-0.5 leading-tight">
                            {getStepTimestamp(idx)}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="text-[9px] text-primary font-bold mt-0.5 leading-tight">
                            Current
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile (<480px): Compact tracker: filled progress bar with 6 circular dots + "Step X of 6 · <Status>" */}
              <div className="block min-[480px]:hidden space-y-2.5 pt-1">
                <div className="relative flex items-center justify-between px-1">
                  {/* Background Track */}
                  <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-1 bg-muted rounded-full -z-0" />
                  {/* Active Filled Progress Line */}
                  <div
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-1 bg-primary rounded-full transition-all duration-300 -z-0"
                    style={{
                      width: `calc(${(safeStepIdx / (LIFECYCLE_STEPS.length - 1)) * 100}% - 1rem)`,
                    }}
                  />

                  {LIFECYCLE_STEPS.map((step, idx) => {
                    const isCompleted = idx < safeStepIdx;
                    const isCurrent = idx === safeStepIdx;

                    return (
                      <div
                        key={step.key}
                        className={`relative z-10 h-4 w-4 rounded-full flex items-center justify-center transition-all ${
                          isCompleted
                            ? 'bg-primary text-white ring-2 ring-card'
                            : isCurrent
                            ? 'bg-primary text-white ring-4 ring-primary/30 motion-safe:animate-pulse'
                            : 'bg-card border-2 border-border opacity-50'
                        }`}
                        title={`${step.label} (Step ${idx + 1} of 6)`}
                      >
                        {isCompleted && <Check className="h-2.5 w-2.5 stroke-[3] notranslate" />}
                      </div>
                    );
                  })}
                </div>

                {/* One clear line "Step X of 6 · <Status>" and time of last update */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <span className="font-bold text-foreground">
                    Step {safeStepIdx + 1} of 6 ·{' '}
                    <span className="text-primary">{activeStepItem.label}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {lastUpdateTrackerText}
                  </span>
                </div>
              </div>
            </div>

            {/* =====================================================================
                INFO TILES: One row of 3 equal grid tiles (never an orphan half-width card)
                1. "Waiting" (live ticking each minute e.g. "3 h 44 min", with "since <time>")
                2. "Needed by" (from request date/time, or "Not set")
                3. "Distance" (live, updates when travel mode changes)
               ===================================================================== */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {/* Tile 1: Waiting */}
              <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-2xl bg-card/80 dark:bg-card/75 border border-border/80 dark:border-white/12 shadow-xs hover:shadow-sm backdrop-blur-sm flex flex-col justify-between transition-all duration-200 group">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-400/40 dark:via-teal-300/30 to-transparent"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/25 shadow-[0_0_10px_rgba(20,184,166,0.25)] shrink-0">
                    <Clock className="h-3.5 w-3.5 notranslate stroke-[2.2]" />
                  </div>
                  <span className="text-muted-foreground text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                    Waiting
                  </span>
                </div>
                <div className="my-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-extrabold text-foreground tracking-tight block truncate">
                    {waitingTileValue}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate block">
                  {waitingSinceFormatted}
                </span>
              </div>

              {/* Tile 2: Needed by */}
              <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-2xl bg-card/80 dark:bg-card/75 border border-border/80 dark:border-white/12 shadow-xs hover:shadow-sm backdrop-blur-sm flex flex-col justify-between transition-all duration-200 group">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/40 dark:via-amber-300/30 to-transparent"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.25)] shrink-0">
                    <Target className="h-3.5 w-3.5 notranslate stroke-[2.2]" />
                  </div>
                  <span className="text-muted-foreground text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                    Needed by
                  </span>
                </div>
                <div className="my-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-extrabold text-foreground tracking-tight block truncate">
                    {neededByTileValue}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate block">
                  {request.neededByTime || request.scheduledTime ? 'Target timing' : 'Flexible schedule'}
                </span>
              </div>

              {/* Tile 3: Distance */}
              <div className="relative overflow-hidden p-3 sm:p-3.5 rounded-2xl bg-card/80 dark:bg-card/75 border border-border/80 dark:border-white/12 shadow-xs hover:shadow-sm backdrop-blur-sm flex flex-col justify-between transition-all duration-200 group">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-sky-400/40 dark:via-sky-300/30 to-transparent"
                  aria-hidden="true"
                />
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex items-center justify-center h-6 w-6 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/25 shadow-[0_0_10px_rgba(14,165,233,0.25)] shrink-0">
                    <Navigation className="h-3.5 w-3.5 notranslate stroke-[2.2]" />
                  </div>
                  <span className="text-muted-foreground text-[10px] sm:text-[11px] font-bold uppercase tracking-wider truncate">
                    Distance
                  </span>
                </div>
                <div className="my-1.5 min-w-0">
                  <span className="text-base sm:text-lg font-extrabold text-foreground tracking-tight block truncate">
                    {routeResult?.distanceKm ? `${routeResult.distanceKm} km` : typeof request.distanceKm === 'number' ? `${request.distanceKm} km` : '0 km'}
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate block">
                  {formatETA(etaMinutes)} · {travelMode}
                </span>
              </div>
            </div>

            {/* =====================================================================
                CATEGORY-SPECIFIC DETAIL CHIPS
               ===================================================================== */}
            <div className="flex flex-wrap gap-2 text-xs">
              {request.category === 'blood' && (
                <>
                  {request.bloodGroup && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-red-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold shadow-[0_0_10px_rgba(244,63,94,0.12)]">
                      <Droplet className="h-3.5 w-3.5 notranslate text-rose-600 dark:text-rose-400 shrink-0" />
                      <span>Blood Group: {request.bloodGroup}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-red-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/30 font-bold shadow-[0_0_10px_rgba(244,63,94,0.12)]">
                    <PlusCircle className="h-3.5 w-3.5 notranslate text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>
                      {request.unitsNeeded || 1} {(request.unitsNeeded || 1) === 1 ? 'unit needed' : 'units needed'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-card/75 text-foreground border border-border/80 dark:border-white/12 font-bold backdrop-blur-sm shadow-2xs">
                    <Hospital className="h-3.5 w-3.5 notranslate text-primary shrink-0" />
                    <span>{request.hospitalName || 'Asansol District Hospital'}</span>
                  </span>
                </>
              )}

              {request.category === 'equipment' && (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-500/15 via-teal-500/10 to-emerald-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 font-bold shadow-[0_0_10px_rgba(20,184,166,0.12)]">
                    <Package className="h-3.5 w-3.5 notranslate text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>Item: {request.itemType || 'Medical Equipment'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-card/75 text-foreground border border-border/80 dark:border-white/12 font-bold backdrop-blur-sm shadow-2xs">
                    <Clock className="h-3.5 w-3.5 notranslate text-muted-foreground shrink-0" />
                    <span>Duration: {request.itemDuration || '3 days'}</span>
                  </span>
                </>
              )}

              {request.category === 'elderly' && (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-500/15 via-indigo-500/10 to-sky-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-bold shadow-[0_0_10px_rgba(59,130,246,0.12)]">
                    <HeartHandshake className="h-3.5 w-3.5 notranslate text-blue-600 dark:text-blue-400 shrink-0" />
                    <span>Task: {request.elderlyAidType || 'Companion Assistance'}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-card/75 text-foreground border border-border/80 dark:border-white/12 font-bold backdrop-blur-sm shadow-2xs">
                    <Clock className="h-3.5 w-3.5 notranslate text-muted-foreground shrink-0" />
                    <span>Time: {request.scheduledTime || request.elderlyDuration || 'Scheduled'}</span>
                  </span>
                </>
              )}

              {request.category === 'books' && (
                <>
                  {request.booksClassSubject && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-yellow-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-bold shadow-[0_0_10px_rgba(245,158,11,0.12)]">
                      <BookOpen className="h-3.5 w-3.5 notranslate text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>Subject/Class: {request.booksClassSubject}</span>
                    </span>
                  )}
                  {request.bookTitle && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-card/75 text-foreground border border-border/80 dark:border-white/12 font-bold backdrop-blur-sm shadow-2xs">
                      <span>Book: {request.bookTitle}</span>
                    </span>
                  )}
                  {request.bookCondition && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-muted/90 text-muted-foreground text-[11px] font-semibold border border-border/80">
                      <span>Condition: {request.bookCondition}</span>
                    </span>
                  )}
                </>
              )}

              {request.category === 'transport' && (
                <>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-500/15 via-purple-500/10 to-indigo-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30 font-bold shadow-[0_0_10px_rgba(139,92,246,0.12)]">
                    <Navigation className="h-3.5 w-3.5 notranslate text-violet-600 dark:text-violet-400 shrink-0" />
                    <span>
                      Route: {request.pickupAddress || request.locationName} → {request.dropAddress || 'Drop site'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-card/75 text-foreground border border-border/80 dark:border-white/12 font-bold backdrop-blur-sm shadow-2xs">
                    <Users className="h-3.5 w-3.5 notranslate text-muted-foreground shrink-0" />
                    <span>
                      {request.passengerCount || 1} {(request.passengerCount || 1) === 1 ? 'passenger' : 'passengers'}
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card/80 dark:bg-card/75 text-foreground border border-border/80 dark:border-white/12 font-bold backdrop-blur-sm shadow-2xs">
                    <span>{request.wheelchairAccessible ? 'Wheelchair Ready' : 'Standard Access'}</span>
                  </span>
                </>
              )}
            </div>

            {/* =====================================================================
                COMMUNITY ORGANIZATION ENDORSEMENTS & ACTION
               ===================================================================== */}
            {(isOrgAccount || Boolean(request.isOrganizationEndorsed || (request.endorsementsCount && request.endorsementsCount > 0))) && (
              <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-indigo-500/[0.08] via-purple-500/[0.04] to-violet-500/[0.08] dark:from-indigo-950/40 dark:via-purple-950/25 dark:to-violet-950/40 border border-indigo-500/30 dark:border-indigo-400/30 shadow-[0_4px_24px_rgba(99,102,241,0.12)] space-y-3">
                {/* Micro-specular top rim sheen */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-300/70 dark:via-indigo-300/50 to-transparent z-10"
                  aria-hidden="true"
                />

                <div className="relative z-10 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="relative overflow-hidden h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/25 ring-1 ring-inset ring-white/25">
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/30 to-transparent" aria-hidden="true" />
                      <ShieldCheck className="relative z-10 h-5 w-5 notranslate text-emerald-300 drop-shadow-xs" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                        <span>Community Organization Endorsement</span>
                        {Boolean(request.isOrganizationEndorsed || (request.endorsementsCount && request.endorsementsCount > 0)) && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/35 shadow-[0_0_8px_rgba(99,102,241,0.25)]">
                            <Check className="h-2.5 w-2.5 stroke-[3] notranslate" />
                            <span>Verified Need</span>
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {Boolean(request.isOrganizationEndorsed || (request.endorsementsCount && request.endorsementsCount > 0))
                          ? `Endorsed by: ${(request.endorsedByOrgNames && request.endorsedByOrgNames.length > 0) ? request.endorsedByOrgNames.filter(Boolean).join(', ') : 'Accredited Community Partner'}`
                          : 'No organizations have endorsed this request yet.'}
                      </p>
                    </div>
                  </div>

                  {Boolean(request.isOrganizationEndorsed || (request.endorsementsCount && request.endorsementsCount > 0)) && (
                    <EndorsementChip request={request} size="sm" />
                  )}
                </div>

                {/* For verified organization accounts: Render an "Endorse this Request" action button */}
                {isOrgAccount && (
                  <div className="relative z-10 pt-2 border-t border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Building2 className="h-3.5 w-3.5 text-indigo-500 notranslate shrink-0" />
                      <span>
                        Organization: <strong className="text-foreground">{myOrgName}</strong>
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={isEndorsing}
                      onClick={handleToggleEndorsement}
                      className={`relative overflow-hidden w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98] touch-target ring-1 ring-inset ring-white/20 ${
                        isAlreadyEndorsedByMe
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-500/30 shadow-md shadow-emerald-500/20'
                          : 'bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:via-violet-500 hover:to-purple-500 text-white shadow-md shadow-indigo-500/25'
                      }`}
                      title={isAlreadyEndorsedByMe ? 'Click to withdraw endorsement' : 'Click to endorse this emergency request'}
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[inherit]" aria-hidden="true" />
                      {isEndorsing ? (
                        <Loader2 className="relative z-10 h-4 w-4 animate-spin notranslate" />
                      ) : isAlreadyEndorsedByMe ? (
                        <>
                          <Check className="relative z-10 h-4 w-4 stroke-[2.5] notranslate" />
                          <span className="relative z-10">Endorsed by your organization</span>
                        </>
                      ) : (
                        <>
                          <ThumbsUp className="relative z-10 h-4 w-4 notranslate" />
                          <ShieldCheck className="relative z-10 h-4 w-4 notranslate" />
                          <span className="relative z-10">Endorse this Request</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                DESCRIPTION: Clean text block, preserved line breaks, "Read more" toggle
               ===================================================================== */}
            <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Description
              </h4>
              <p
                className={`whitespace-pre-line text-xs sm:text-sm text-foreground/90 leading-relaxed ${
                  !descExpanded ? 'line-clamp-5' : ''
                }`}
              >
                {request.description}
              </p>
              {request.description && request.description.length > 200 && (
                <button
                  type="button"
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="text-xs font-bold text-primary hover:underline mt-2 inline-flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                >
                  {descExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            {/* =====================================================================
                5. LOCATION CARD & REQUESTED BY CARD
               ===================================================================== */}
            {/* Location Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="h-4.5 w-4.5 notranslate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Location
                    </h4>
                    <p
                      className="text-sm font-semibold text-foreground leading-snug line-clamp-2 break-words mt-0.5"
                      title={request.locationName}
                    >
                      {request.locationName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/50 flex-wrap">
                {/* Verified Need Chip */}
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="h-4 w-4 notranslate shrink-0" />
                  <span>{request.verificationBadge || 'Verified Need'}</span>
                </div>

                {/* Open in Maps link */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${request.latitude},${request.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border/80 bg-muted/60 hover:bg-muted text-foreground text-xs font-bold transition-colors touch-target focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                >
                  <span>Open in Maps</span>
                  <ExternalLink className="h-3.5 w-3.5 notranslate" />
                </a>
              </div>
            </div>

            {/* Requested By Card */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="h-11 w-11 rounded-2xl bg-primary/15 text-primary border border-primary/25 flex items-center justify-center font-bold text-base shadow-xs shrink-0">
                    {requesterFirstName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {requesterFirstName}
                      </span>
                      {/* Renamed confusing Community Volunteer label to Requester */}
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                        Requester
                      </span>
                      {request.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <ShieldCheck className="h-3 w-3 notranslate" />
                          <span>Verified</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                      <span className="flex items-center gap-0.5 font-bold text-amber-600 dark:text-amber-400">
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500 notranslate" />
                        <span>4.9</span>
                      </span>
                      <span>·</span>
                      <span>Member since {formatMemberSince(request.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Row */}
              {isMatched ? (
                /* Unmasked Contact info for matched pair */
                <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/15 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-500/30 dark:border-emerald-400/30 shadow-[0_4px_24px_rgba(16,185,129,0.12)] space-y-3">
                  {/* Top specular highlight */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-300/70 dark:via-emerald-300/40 to-transparent z-10"
                    aria-hidden="true"
                  />

                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                      <div className="flex items-center justify-center h-5 w-5 rounded-md bg-emerald-500/20 border border-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                        <ShieldCheck className="h-3.5 w-3.5 notranslate text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span>Verified Matched Pair · Direct Contact Unlocked</span>
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      Private Channel
                    </span>
                  </div>

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <div>
                      <p className="text-xs font-bold text-foreground">
                        {contactInfo?.name || request.contactName || 'Requester'}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {contactInfo?.phone || request.phone || 'Contact available once shared'}
                      </p>
                    </div>

                    {Boolean(contactInfo?.phone || request.phone) && (
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${String(contactInfo?.phone || request.phone || '').replace(/[^0-9+]/g, '')}`}
                          className="relative overflow-hidden flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-emerald-600/20 ring-1 ring-inset ring-white/20 active:scale-95 touch-target focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[inherit]" aria-hidden="true" />
                          <Phone className="relative z-10 h-3.5 w-3.5 notranslate" />
                          <span className="relative z-10">Call</span>
                        </a>
                        <a
                          href={`https://wa.me/${String(contactInfo?.phone || request.phone || '').replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative overflow-hidden flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-md shadow-emerald-500/20 ring-1 ring-inset ring-white/20 active:scale-95 touch-target focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[inherit]" aria-hidden="true" />
                          <MessageCircle className="relative z-10 h-3.5 w-3.5 notranslate" />
                          <span className="relative z-10">WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Masked Contact Row: Phone shown masked with a lock chip 'Hidden until matched' on same line (no wrap) */
                <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <Phone className="h-4 w-4 text-muted-foreground shrink-0 notranslate" />
                    <span className="font-mono text-xs font-semibold text-foreground truncate">
                      +91 98320 •••••
                    </span>
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-muted border border-border/60 px-2.5 py-1 rounded-lg whitespace-nowrap">
                    <Lock className="h-3 w-3 notranslate" />
                    <span>Hidden until matched</span>
                  </span>
                </div>
              )}
            </div>

            {/* =====================================================================
                PROXIMITY, ROUTE PREVIEW & TRAVEL MODE (Strictly ONE Route Card)
               ===================================================================== */}
            <div data-section="route-card" className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-card/85 dark:bg-card/80 border border-border/80 dark:border-white/12 shadow-sm backdrop-blur-sm space-y-3">
              {/* Crystal glass top edge refraction highlight */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent z-10"
                aria-hidden="true"
              />

              <div className="flex items-center justify-between text-xs flex-wrap gap-1.5">
                <span className="font-bold text-foreground flex items-center gap-1.5 min-w-0">
                  <Navigation className="h-4 w-4 text-primary shrink-0 notranslate" />
                  <span className="truncate">
                    You to this request:{' '}
                    <strong className="text-foreground font-semibold">
                      {routeResult?.distanceKm ? `${routeResult.distanceKm} km` : typeof request.distanceKm === 'number' ? `${request.distanceKm} km` : '0 km'}
                      {' · '}
                      {formatETA(etaMinutes)} by {travelMode}
                    </strong>
                  </span>
                </span>
                {loadingRoute && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1 shrink-0">
                    <Loader2 className="h-3 w-3 animate-spin notranslate" />
                    <span>Routing...</span>
                  </span>
                )}
              </div>

              {/* Road Route Mini-Map */}
              <div className="pt-0.5">
                <RequestRouteMiniMap
                  requestId={request.id}
                  origin={[userCoords?.lat ?? 23.6889, userCoords?.lng ?? 86.9661]}
                  destination={[Number(request.latitude) || 23.6889, Number(request.longitude) || 86.9661]}
                  routeCoordinates={
                    routeResult?.coordinates && routeResult.coordinates.length > 0
                      ? routeResult.coordinates
                      : [
                          [userCoords?.lat ?? 23.6889, userCoords?.lng ?? 86.9661],
                          [Number(request.latitude) || 23.6889, Number(request.longitude) || 86.9661],
                        ]
                  }
                  isStraightLine={Boolean(routeResult?.isFallback || routeResult?.source === 'straight-line')}
                  urgency={request.urgency}
                  category={request.category}
                  destinationLabel={request.title}
                  onExpand={() => {
                    setSelectedRequestId(request.id);
                    setCurrentView('map');
                    onClose();
                  }}
                />
              </div>

              {/* Travel Mode Selector (Live recomputing) */}
              <div className="flex gap-2 pt-1">
                {(['bike', 'walking', 'car'] as TravelMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => handleTravelModeChange(mode)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold border transition touch-target active:scale-95 ${
                      travelMode === mode
                        ? 'border-transparent bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 text-white shadow-md shadow-teal-600/25 ring-1 ring-inset ring-white/20 font-bold'
                        : 'border-border/80 dark:border-white/10 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground'
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
                NEARBY HOSPITALS & EMERGENCY PLACES (Collapsible, separated rows)
               ===================================================================== */}
            <div data-section="nearby-places" className="relative overflow-hidden p-4 sm:p-5 rounded-2xl bg-card/85 dark:bg-card/80 border border-border/80 dark:border-white/12 shadow-sm backdrop-blur-sm space-y-3">
              {/* Crystal glass top edge refraction highlight */}
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/25 to-transparent z-10"
                aria-hidden="true"
              />

              {/* Header row: title and toggle on one row, subtitle on its own row below so nothing is cut */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wide flex items-center gap-1.5 truncate">
                    <Hospital className="h-4 w-4 text-rose-500 shrink-0 notranslate" />
                    <span className="truncate">{nearbyHeading.title}</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {nearbyHeading.subtitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNearbyCollapsed(!isNearbyCollapsed)}
                  className="p-1.5 rounded-xl border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground transition touch-target flex items-center gap-1 text-xs shrink-0"
                  aria-expanded={!isNearbyCollapsed}
                  aria-label={isNearbyCollapsed ? 'Expand nearby places' : 'Collapse nearby places'}
                >
                  <span className="text-[11px] font-semibold hidden sm:inline">
                    {isNearbyCollapsed ? 'Show' : 'Hide'}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 notranslate transition-transform duration-200 ${
                      isNearbyCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </button>
              </div>

              {!isNearbyCollapsed && (
                <>
                  {loadingHospitals ? (
                    /* Skeleton loading state */
                    <div className="space-y-2 pt-1 animate-pulse">
                      {[1, 2].map((i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                          <div className="space-y-1.5 flex-1">
                            <div className="h-3.5 w-36 bg-muted-foreground/20 rounded" />
                            <div className="h-2.5 w-24 bg-muted-foreground/15 rounded" />
                          </div>
                          <div className="h-7 w-20 bg-muted-foreground/20 rounded-lg" />
                        </div>
                      ))}
                    </div>
                  ) : nearbyHospitals.length > 0 ? (
                    <div className="space-y-2.5 pt-1">
                      {nearbyHospitals.slice(0, 3).map((facility) => {
                        const mapDirectionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${facility.latitude},${facility.longitude}`;
                        return (
                          <div
                            key={facility.id}
                            className="relative overflow-hidden p-3.5 rounded-xl bg-card/90 dark:bg-card/75 border border-border/80 dark:border-white/10 hover:border-teal-500/30 transition-all duration-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs group"
                          >
                            <div
                              className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent"
                              aria-hidden="true"
                            />
                            <div className="space-y-1 min-w-0">
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
                                  {facility.type ? facility.type.replace('_', ' ') : 'Facility'}
                                </span>
                                {facility.emergency && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                    24/7
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/80 text-[11px] font-semibold text-muted-foreground border border-border/60">
                                  📍 {typeof facility.distanceKm === 'number' && !isNaN(facility.distanceKm) ? facility.distanceKm.toFixed(1) : '0.0'} km away
                                </span>
                                {facility.address && (
                                  <span className="truncate max-w-[200px] sm:max-w-[280px]">· {facility.address}</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {facility.phone && (
                                <a
                                  href={`tel:${String(facility.phone).replace(/[^0-9+]/g, '')}`}
                                  className="relative overflow-hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[11px] font-bold transition shadow-xs touch-target ring-1 ring-inset ring-white/20 active:scale-95"
                                  title="Call Facility"
                                >
                                  <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-[inherit]" aria-hidden="true" />
                                  <Phone className="relative z-10 h-3 w-3 notranslate" />
                                  <span className="relative z-10">Call</span>
                                </a>
                              )}
                              <a
                                href={mapDirectionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative overflow-hidden inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/80 bg-card hover:bg-muted text-foreground text-[11px] font-bold transition shadow-xs touch-target hover:border-teal-500/40 active:scale-95"
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
                    <p className="text-xs text-muted-foreground p-3 rounded-xl bg-muted/20 border border-border/50 text-center">
                      No medical facilities found nearby.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* =====================================================================
                4. OFFERS RECEIVED SECTION (Owner View)
               ===================================================================== */}
            {isRequester && (
              <ErrorBoundary
                title="Volunteer Offers"
                message="Could not load volunteer offers for this request. Tap retry to attempt again."
              >
                <OffersReceivedSection
                  request={request}
                  offers={offers}
                  actionInProgress={actionInProgress}
                  onAcceptOffer={handleAcceptOffer}
                  onDeclineOffer={handleDeclineOffer}
                />
              </ErrorBoundary>
            )}

            {/* =====================================================================
                HANDOVER CONFIRMATION PIN SECURITY CARD
               ===================================================================== */}
            {request.requiresHandoverPin && (
              <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border-2 border-indigo-500/30 shadow-soft space-y-3.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                      <KeyRound className="h-5 w-5 notranslate" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-foreground">
                        Handover Confirmation PIN
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        {isRequester
                          ? 'Share this PIN with your helper when item is delivered'
                          : 'Ask requester for their 4-digit PIN to confirm handover'}
                      </p>
                    </div>
                  </div>

                  {currentStatus === 'completed' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      <CheckCircle2 className="h-3.5 w-3.5 notranslate" />
                      <span>Handover verified ✓</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      <Clock className="h-3.5 w-3.5 notranslate" />
                      <span>Awaiting delivery</span>
                    </span>
                  )}
                </div>

                {isRequester ? (
                  <div className="p-3.5 rounded-2xl bg-card border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      {String(request.handoverPin || '4821')
                        .padStart(4, '0')
                        .slice(0, 4)
                        .split('')
                        .map((digit, idx) => (
                          <div
                            key={idx}
                            className="w-11 h-13 sm:w-12 sm:h-14 rounded-xl border-2 border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-mono font-black text-2xl flex items-center justify-center shadow-xs"
                          >
                            {digit}
                          </div>
                        ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const pinToCopy = String(request.handoverPin || '4821').padStart(4, '0').slice(0, 4);
                        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                          navigator.clipboard.writeText(pinToCopy).catch(() => {});
                        }
                        toast.success('Handover PIN copied to clipboard');
                      }}
                      className="px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition flex items-center gap-1.5 touch-target"
                    >
                      <Copy className="h-3.5 w-3.5 notranslate" />
                      <span>Copy PIN</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-card/80 border border-border/60 text-xs text-muted-foreground flex items-center justify-between gap-2">
                    <span>Physical item handover is secured with a 4-digit security code.</span>
                    {isAcceptedHelper && currentStatus !== 'completed' && (
                      <button
                        type="button"
                        onClick={() => setPinModalOpen(true)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shrink-0 shadow-xs transition active:scale-95 touch-target"
                      >
                        Enter PIN
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                LIVE TRANSIT LOCATION SHARING SECTION
               ===================================================================== */}
            {isMatched && currentStatus !== 'completed' && (
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio
                      className={`h-4 w-4 ${
                        isSharingLocation || transitLocation
                          ? 'text-emerald-500 motion-safe:animate-pulse'
                          : 'text-muted-foreground'
                      } notranslate`}
                    />
                    <span className="text-xs font-bold text-foreground">
                      Live Transit Location Sharing
                    </span>
                  </div>

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
                    ? 'Your live location pin is shared securely with the requester. Updates every 10 seconds.'
                    : 'Helper can share live location while on the way with end-to-end privacy consent.'}
                </p>

                {transitLocation && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                    <span className="text-emerald-700 dark:text-emerald-300 font-semibold">
                      Helper en route: ({Number(transitLocation.lat ?? 0).toFixed(4)}, {Number(transitLocation.lng ?? 0).toFixed(4)})
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {transitLocation.updatedAt && !isNaN(new Date(transitLocation.updatedAt).getTime())
                        ? new Date(transitLocation.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : 'Recently'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* =====================================================================
                STATUS ADVANCEMENT CONTROLS (For Matched Helper)
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

            {/* Bottom padding safe zone so content is completely reachable and never cut off */}
            <div className="h-8 sm:h-10" aria-hidden="true" />
          </div>

          {/* =====================================================================
              3. STICKY BOTTOM ACTION BAR (Unified for all viewer roles)
             ===================================================================== */}
          <StickyActionBar
            request={request}
            userProfile={userProfile}
            offers={offers}
            isRequester={isRequester}
            isAcceptedHelper={isAcceptedHelper}
            currentStatus={currentStatus}
            actionInProgress={actionInProgress}
            onOfferHelp={() => setHelpFlowOpen(true)}
            onAdvanceStatus={handleAdvanceStatus}
            onWithdrawOffer={handleWithdrawOffer}
            onCancelRequest={handleCancelRequest}
            onEditRequest={() =>
              toast.info('To edit your request, reach out to moderators or create an updated post.')
            }
            onOpenRating={() => setRatingModalOpen(true)}
            onGetVerified={handleGetVerified}
            onShare={handleShare}
            onReport={() => setReportModalOpen(true)}
          />
        </div>
      </div>

      {/* =====================================================================
          LOCATION SHARING PRIVACY CONSENT MODAL
         ===================================================================== */}
      {locationConsentOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border/80 p-6 shadow-2xl space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Radio className="h-6 w-6 notranslate motion-safe:animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-foreground text-center">
              Share Live Location While On the Way?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed text-center">
              Your real-time location will only be shared with {request.contactName} during this active response. It automatically terminates when the task is completed or when you toggle it off.
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
                I Agree &amp; Share
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
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
                <Flag className="h-5 w-5 notranslate" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Report Request</h3>
                <p className="text-xs text-muted-foreground">Help keep our community safe</p>
              </div>
            </div>

            {hasAlreadyReported ? (
              <div className="py-2 space-y-4 text-center">
                <div className="p-3.5 rounded-2xl bg-muted/60 border border-border/70 text-xs text-muted-foreground leading-relaxed">
                  You have already reported this request. Our moderation team is currently reviewing it. Thank you for keeping KindLink safe.
                </div>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all active:scale-95 shadow-soft"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Select a reason for reporting this request:
                </p>

                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => {
                    const isSelected = selectedReportReason === reason;
                    return (
                      <label
                        key={reason}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition text-xs font-medium ${
                          isSelected
                            ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                            : 'border-border/80 hover:bg-muted text-foreground'
                        }`}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason}
                          checked={isSelected}
                          onChange={() => setSelectedReportReason(reason)}
                          className="text-rose-600 focus:ring-rose-500"
                        />
                        <span>{reason}</span>
                      </label>
                    );
                  })}
                </div>

                {selectedReportReason === 'Other' && (
                  <textarea
                    rows={3}
                    value={otherReportText}
                    onChange={(e) => setOtherReportText(e.target.value)}
                    placeholder="Please explain the issue or concern..."
                    className="w-full p-3 rounded-xl border border-border/80 bg-background text-foreground text-xs focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-all"
                  />
                )}

                <div className="flex gap-2 pt-1">
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
              </>
            )}
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

      {/* =====================================================================
          EMERGENCY STORY CARD MODAL (WhatsApp Status & Instagram Stories)
         ===================================================================== */}
      {storyModalOpen && (
        <EmergencyStoryCardModal
          request={request}
          open={storyModalOpen}
          onClose={() => setStoryModalOpen(false)}
        />
      )}

      {/* =====================================================================
          HANDOVER PIN VERIFICATION MODAL
         ===================================================================== */}
      <HandoverPinModal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        requestId={request.id}
        requestTitle={request.title}
        category={request.category}
        requesterName={request.contactName}
        onSuccess={() => {
          setPinModalOpen(false);
          setRatingModalOpen(true);
        }}
      />
    </OverlayPortal>
  );
}
