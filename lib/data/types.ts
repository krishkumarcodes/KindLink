export type StandardHelpCategory =
  | 'blood'
  | 'equipment'
  | 'elderly'
  | 'books'
  | 'transport'
  | 'medicine'
  | 'food'
  | 'hospital_attendant'
  | 'disaster_relief'
  | 'education'
  | 'clothes'
  | 'home_repairs'
  | 'government_aid'
  | 'animal_care'
  | 'other';

export type HelpCategory = StandardHelpCategory | (string & {});

export interface RequestCategory {
  key: string;
  name: string;
  description: string;
  icon: string;
  colour: string;
  defaultUrgencyHint?: string;
  responseExpectation?: string;
  suggestedTags: string[];
  extraFields?: {
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'boolean';
    required?: boolean;
    options?: string[];
  }[];
  sortOrder: number;
  active: boolean;
  isUrgent: boolean;
}

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
  helperAvatar?: string;
  helperPhone?: string;
  helperRating: number;
  helperVerification: VerificationState;
  helperDistanceKm?: number;
  helperEtaMinutes?: number;
  helperBadges?: string[];
  message: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'not_selected';
  declineReason?: string;
  createdAt: string;
}

export interface HelpRequest {
  id: string;
  requesterId?: string;
  title: string;
  description: string;
  category: HelpCategory;
  customCategoryLabel?: string;
  tags?: string[];
  categoryFields?: Record<string, any>;
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

  // Handover confirmation PIN fields
  /**
   * 4-digit secure handover PIN. Shared only with the requester to give to helper upon physical exchange.
   */
  handoverPin?: string;
  /**
   * Whether this request requires handover PIN verification before transitioning to completed.
   */
  requiresHandoverPin?: boolean;
  /**
   * Timestamp when the handover PIN was successfully verified and exchange completed.
   */
  handoverConfirmedAt?: string;

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

  // NGO & Organization endorsement fields
  isOrganizationEndorsed?: boolean;
  endorsementsCount?: number;
  endorsedByOrgNames?: string[];
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

export interface EmergencyPrivacySettings {
  sharePhone?: boolean;
  shareBloodGroup?: boolean;
  shareMedicalNote?: boolean;
  medicalNote?: string;
}

export type OrganizationType =
  | 'ngo'
  | 'blood_bank'
  | 'hospital'
  | 'resident_welfare'
  | 'student_union'
  | 'community_group';

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
  bloodGroup?: string;
  emergencyPrivacy?: EmergencyPrivacySettings;
  rating: number;
  ratingCount?: number;
  helpsCount: number;
  requestsCount: number;
  hoursVolunteered?: number;
  kilometersTraveled?: number;
  verificationState: VerificationState;

  // Organization fields
  isOrganization?: boolean;
  organizationName?: string;
  organizationType?: OrganizationType;
  organizationVerified?: boolean;
  organizationRegistrationNumber?: string;

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
  customCategoryLabel?: string;
  tags?: string[];
  categoryFields?: Record<string, any>;
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
  requiresHandoverPin?: boolean;
  handoverPin?: string;
  savedAt: number;
}

export interface CreateRequestInput {
  category: HelpCategory;
  customCategoryLabel?: string;
  tags?: string[];
  categoryFields?: Record<string, any>;
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
  /**
   * Whether this request requires a 4-digit handover verification PIN.
   */
  requiresHandoverPin?: boolean;
  /**
   * Optional pre-specified 4-digit PIN (otherwise generated automatically if requiresHandoverPin is true).
   */
  handoverPin?: string;
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

