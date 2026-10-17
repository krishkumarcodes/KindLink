export type HelpCategory = 'blood' | 'equipment' | 'elderly' | 'books' | 'transport';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type TravelMode = 'walking' | 'bike' | 'car';

export type VerificationState = 'unverified' | 'pending' | 'verified' | 'rejected' | 'needs_info';

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
  pickupLat?: number;
  pickupLng?: number;
  dropAddress?: string;
  dropLat?: number;
  dropLng?: number;
  passengerCount?: number;
  hasLuggage?: boolean;
  wheelchairAccessible?: boolean;

  patientAge?: number;
  verified: boolean;
  verificationBadge: string;
  createdAt: string;
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

export type VisibilityLevel = 'members' | 'matched' | 'private';
export type FieldVisibility = VisibilityLevel | 'public' | 'helpers' | 'all';

export interface ProfileVisibilitySettings {
  phone?: VisibilityLevel | FieldVisibility;
  email?: VisibilityLevel | FieldVisibility;
  organisation?: VisibilityLevel | FieldVisibility;
  area?: VisibilityLevel | FieldVisibility;
}

export interface UserProfile {
  id: string;
  name: string;
  username?: string;
  displayName?: string;
  email: string;
  phone: string;
  college: string;
  organisation?: string;
  avatarUrl?: string;
  homeNeighborhood?: string;
  area_name?: string;
  languages?: string[];
  emergencyContacts?: EmergencyContact[];
  visibility?: ProfileVisibilitySettings;
  visibility_phone?: VisibilityLevel;
  visibility_email?: VisibilityLevel;
  visibility_organisation?: VisibilityLevel;
  visibility_area?: VisibilityLevel;
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
  pinnedBadges?: string[];
  emailVerified?: boolean;
  phoneVerified?: boolean;
  preferred_language?: string;
  bio?: string;
  createdAt?: string;
  created_at?: string;
  textSize?: 'compact' | 'normal' | 'large';
  reduceMotion?: boolean;
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
  category?: string;
  offerId?: string;
  sosToken?: string;
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
  activeRequests?: number;
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
  notes?: string | null;
  requestId?: string;
}

export type ProfessionalProofType =
  | 'Doctor'
  | 'Nurse'
  | 'Pharmacist'
  | 'Teacher'
  | 'Student'
  | 'Organisation';

export type ProfessionalProofStatus = 'pending' | 'verified' | 'needs_info' | 'rejected';

export interface UserSummary {
  username?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  college?: string;
  homeNeighborhood?: string;
  createdAt?: string;
}

export interface VerificationRequestItem {
  id: string;
  userId: string;
  phone: string;
  idDocumentPath?: string | null;
  documentType?: string | null;
  status: VerificationState;
  adminNote?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  documentExpiresAt?: string | null;
  signedUrl?: string | null;
  profiles?: UserSummary | null;
}

export interface ProfessionalProofItem {
  id: string;
  userId: string;
  professionType: ProfessionalProofType;
  registrationNumber: string;
  documentPath: string;
  documentName?: string | null;
  status: ProfessionalProofStatus;
  adminNote?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  documentExpiresAt?: string | null;
  signedUrl?: string | null;
  profiles?: UserSummary | null;
}

export interface DeletionRequestItem {
  id: string;
  userId: string;
  reason?: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'needs_info';
  adminNote?: string | null;
  reviewedBy?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  profiles?: UserSummary | null;
}

export interface AdminAuditLogItem {
  id: string;
  adminId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  targetUserId?: string | null;
  reason?: string | null;
  details?: Record<string, any>;
  createdAt: string;
}

