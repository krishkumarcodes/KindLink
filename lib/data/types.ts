export type HelpCategory = 'blood' | 'equipment' | 'elderly' | 'books' | 'transport';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type TravelMode = 'walking' | 'bike' | 'car';

export type VerificationState = 'unverified' | 'pending' | 'verified' | 'rejected';

export type RequestLifecycleStatus =
  | 'open'
  | 'offered'
  | 'accepted'
  | 'on_the_way'
  | 'arrived'
  | 'completed'
  | 'cancelled';

export interface VolunteerOffer {
  id: string;
  requestId: string;
  helperId: string;
  helperName: string;
  helperPhone?: string;
  helperRating: number;
  helperVerification: VerificationState;
  helperDistanceKm?: number;
  helperEtaMinutes?: number;
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  createdAt: string;
}

export interface HelpRequest {
  id: string;
  title: string;
  description: string;
  category: HelpCategory;
  urgency: UrgencyLevel;
  waitingMinutes: number;
  distanceKm: number;
  locationName: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactRole: string;
  phone: string;

  // Category specific fields
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
  verified: boolean;
  verificationBadge: string;
  createdAt: string;
  helpGravityScore: number;
  status: RequestLifecycleStatus;
  helpersOffered?: number;

  // Matched helper & live transit fields
  acceptedHelperId?: string;
  acceptedHelperName?: string;
  acceptedHelperPhone?: string;
  acceptedHelperRating?: number;
  acceptedHelperDistanceKm?: number;
  acceptedHelperEtaMinutes?: number;
  isLiveLocationSharing?: boolean;
  transitLatitude?: number;
  transitLongitude?: number;
  transitUpdatedAt?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  displayName?: string;
  email: string;
  phone: string;
  college: string;
  avatarUrl?: string;
  homeNeighborhood?: string;
  languages?: string[];
  emergencyContacts?: EmergencyContact[];
  rating: number;
  ratingCount?: number;
  helpsCount: number;
  requestsCount: number;
  hoursVolunteered?: number;
  kilometersTraveled?: number;
  verificationState: VerificationState;
  idDocumentName?: string;
  idDocumentType?: string;
  badges: string[];
  emailVerified?: boolean;
  phoneVerified?: boolean;
  preferred_language?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  timestamp: number;
  unread: boolean;
  urgency: UrgencyLevel;
  type?: string;
  requestId?: string;
}

export interface UrgencyConfig {
  label: string;
  color: string;
  bgLight: string;
  borderLight: string;
}

export interface CommunityLiveStats {
  helpersNearby: number;
  avgResponseMinutes: number | null;
  actsOfHelp: number;
  trustMatchPercent?: number | null;
  trustMatchPercentage?: number | null;
  updatedAt: string;
}


export interface DraftRequest {
  category: HelpCategory;
  urgency: UrgencyLevel;
  title: string;
  description: string;
  bloodGroup: string;
  unitsNeeded: number;
  hospitalName: string;
  neededByTime: string;
  itemType: string;
  itemDuration: string;
  elderlyAidType: string;
  elderlyDuration: string;
  scheduledTime: string;
  booksClassSubject: string;
  bookTitle: string;
  bookCondition: string;
  pickupAddress: string;
  dropAddress: string;
  passengerCount: number;
  hasLuggage: boolean;
  wheelchairAccessible: boolean;
  locationName: string;
  latitude: number;
  longitude: number;
  contactName: string;
  contactRole: string;
  phone: string;
  savedAt: number;
}

export interface SosEvent {
  id: string;
  userId?: string | null;
  token: string;
  latitude: number;
  longitude: number;
  addressText?: string | null;
  status: 'active' | 'safe' | 'resolved';
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string | null;
  userName?: string;
  userPhone?: string;
}

