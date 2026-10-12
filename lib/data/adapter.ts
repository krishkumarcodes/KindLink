import { HelpRequest, UserProfile, NotificationItem, HelpCategory, UrgencyLevel } from './types';

export interface DataAdapter {
  getRequests(options?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    category?: HelpCategory | 'all';
    urgency?: UrgencyLevel | 'all';
  }): Promise<HelpRequest[]>;

  createRequest(request: {
    category: HelpCategory;
    title: string;
    description: string;
    urgency: UrgencyLevel;
    latitude: number;
    longitude: number;
    addressText: string;
    bloodGroup?: string;
    unitsNeeded?: number;
    itemType?: string;
    itemDuration?: string;
    patientAge?: number;
  }): Promise<{ success: boolean; id: string }>;

  offerHelp(requestId: string, message?: string): Promise<{ success: boolean; error?: string }>;

  acceptOffer(offerId: string): Promise<{ success: boolean; error?: string }>;

  completeRequest(requestId: string): Promise<{ success: boolean; error?: string }>;

  cancelRequest(requestId: string): Promise<{ success: boolean; error?: string }>;

  getContact(requestId: string): Promise<{
    name: string;
    phone: string;
    relationship: string;
  } | null>;

  getPublicStats(): Promise<{
    openRequests: number;
    verifiedHelpers: number;
    completedRequests: number;
    totalVolunteers: number;
  }>;

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
    lng: number
  ): Promise<{ success: boolean }>;
}
