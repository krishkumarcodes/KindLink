export type HelpCategory = 'blood' | 'equipment' | 'elderly' | 'books' | 'transport';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export type TravelMode = 'walking' | 'bike' | 'car';

export type VerificationState = 'unverified' | 'pending' | 'verified';

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
  bloodGroup?: string;
  unitsNeeded?: number;
  itemType?: string;
  itemDuration?: string;
  patientAge?: number;
  verified: boolean;
  verificationBadge: string;
  createdAt: string;
  helpGravityScore: number;
  status: 'open' | 'in_progress' | 'completed';
  helpersOffered?: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  rating: number;
  helpsCount: number;
  requestsCount: number;
  verificationState: VerificationState;
  idDocumentName?: string;
  badges: string[];
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timeAgo: string;
  timestamp: number;
  unread: boolean;
  urgency: UrgencyLevel;
  requestId?: string;
}

export interface UrgencyConfig {
  label: string;
  color: string;
  bgLight: string;
  borderLight: string;
}
