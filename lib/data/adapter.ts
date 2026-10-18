import {
  HelpRequest,
  UserProfile,
  NotificationItem,
  HelpCategory,
  UrgencyLevel,
  VolunteerOffer,
  RequestLifecycleStatus,
  CommunityLiveStats,
  SosEvent,
} from './types';

export type { CommunityLiveStats, SosEvent };

export interface CreateRequestInput {
  category: HelpCategory;
  title: string;
  description: string;
  urgency: UrgencyLevel;
  latitude: number;
  longitude: number;
  addressText: string;

  // Dynamic category fields
  bloodGroup?: string;
  unitsNeeded?: number;
  hospitalName?: string;
  neededByTime?: string;

  itemType?: string;
  itemDuration?: string;

  elderlyAidType?: string;
  elderlyDuration?: string;
  scheduledTime?: string;

  booksClassSubject?: string;
  bookTitle?: string;
  bookCondition?: string;

  pickupAddress?: string;
  dropAddress?: string;
  passengerCount?: number;
  hasLuggage?: boolean;
  wheelchairAccessible?: boolean;

  patientAge?: number;
  contactName?: string;
  contactPhone?: string;
  contactRole?: string;

  // Handover confirmation PIN
  requiresHandoverPin?: boolean;
  handoverPin?: string;
}

export interface TransitLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  updatedAt: string;
}

export interface DataAdapter {
  getRequests(options?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    category?: HelpCategory | 'all';
    urgency?: UrgencyLevel | 'all';
  }): Promise<HelpRequest[]>;

  createRequest(request: CreateRequestInput): Promise<{ success: boolean; id: string }>;

  getOffers(requestId: string): Promise<VolunteerOffer[]>;

  offerHelp(requestId: string, message?: string): Promise<{ success: boolean; error?: string; offerId?: string; code?: string }>;

  canOfferHelp?(
    requestId: string,
    userId?: string
  ): Promise<{ allowed: boolean; reason?: 'own_request' | 'not_verified' | 'already_offered' | 'request_closed' | 'ok' | string }>;

  getMyActiveRequests?(userId?: string): Promise<HelpRequest[]>;

  acceptOffer(offerId: string): Promise<{ success: boolean; error?: string }>;

  declineOffer(offerId: string, reason?: string): Promise<{ success: boolean; error?: string }>;

  withdrawOffer(offerId: string): Promise<{ success: boolean; error?: string }>;

  completeRequest(requestId: string): Promise<{ success: boolean; error?: string }>;

  verifyHandoverPin(
    requestId: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }>;

  cancelRequest(requestId: string): Promise<{ success: boolean; error?: string }>;

  updateRequestStatus(
    requestId: string,
    status: RequestLifecycleStatus
  ): Promise<{ success: boolean; error?: string }>;

  getContact(requestId: string): Promise<{
    name: string;
    phone: string;
    relationship: string;
  } | null>;

  updateTransitLocation(
    requestId: string,
    lat: number,
    lng: number,
    heading?: number,
    speed?: number
  ): Promise<{ success: boolean; error?: string }>;

  getTransitLocation(requestId: string): Promise<TransitLocation | null>;

  getPublicStats(): Promise<{
    openRequests: number;
    verifiedHelpers: number;
    completedRequests: number;
    totalVolunteers: number;
  }>;

  getLiveStats(options?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }): Promise<CommunityLiveStats>;

  getNearbyVerifiedHelpersCount(
    lat: number,
    lng: number,
    radiusKm?: number
  ): Promise<number>;

  getCurrentUserProfile(): Promise<UserProfile | null>;

  uploadVerificationDoc(
    phone: string,
    file: File
  ): Promise<{ success: boolean; error?: string }>;

  getNotifications(): Promise<NotificationItem[]>;

  markNotificationRead(id: string): Promise<void>;

  markAllNotificationsRead(): Promise<void>;

  submitRating(
    requestId: string,
    rateeId: string,
    stars: number,
    comment?: string
  ): Promise<{ success: boolean; error?: string }>;

  submitReport(
    requestId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }>;

  submitSos(
    lat: number,
    lng: number,
    addressText?: string,
    details?: { notes?: string; category?: HelpCategory }
  ): Promise<{ success: boolean; token?: string; event?: SosEvent; requestId?: string }>;

  getSosByToken?(token: string): Promise<SosEvent | null>;

  resolveSos?(token: string): Promise<{ success: boolean }>;

  updateSosDetails?(token: string, notes: string): Promise<{ success: boolean }>;

  updatePreferredLanguage?: (locale: string) => Promise<void>;

  endorseRequest(requestId: string): Promise<{ success: boolean; error?: string }>;

  removeEndorsement(requestId: string): Promise<{ success: boolean; error?: string }>;
}

export type IKindLinkAdapter = DataAdapter;

