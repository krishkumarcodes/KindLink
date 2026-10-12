import { DataAdapter } from './adapter';
import { HelpRequest, UserProfile, NotificationItem } from './types';
import { INITIAL_REQUESTS, INITIAL_NOTIFICATIONS, MOCK_USER, ASANSOL_CENTER } from './mock-requests';
import { calculateHaversineDistance, calculateHelpGravity } from './physics';

class MockDataAdapter implements DataAdapter {
  private requests: HelpRequest[] = [...INITIAL_REQUESTS];
  private notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
  private user: UserProfile = { ...MOCK_USER };

  async getRequests(options?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    category?: any;
    urgency?: any;
  }): Promise<HelpRequest[]> {
    const lat = options?.lat ?? ASANSOL_CENTER.lat;
    const lng = options?.lng ?? ASANSOL_CENTER.lng;
    const radius = options?.radiusKm ?? 30;

    return this.requests
      .map((r) => {
        const dist = calculateHaversineDistance(lat, lng, r.latitude, r.longitude);
        const score = calculateHelpGravity(r.category, r.waitingMinutes, dist);
        return { ...r, distanceKm: dist, helpGravityScore: score };
      })
      .filter((r) => {
        if (options?.category && options.category !== 'all' && r.category !== options.category) return false;
        if (options?.urgency && options.urgency !== 'all' && r.urgency !== options.urgency) return false;
        return r.distanceKm <= radius;
      })
      .sort((a, b) => b.helpGravityScore - a.helpGravityScore);
  }

  async createRequest(req: any): Promise<{ success: boolean; id: string }> {
    const newId = `req-mock-${Date.now()}`;
    const newReq: HelpRequest = {
      id: newId,
      title: req.title,
      description: req.description,
      category: req.category,
      urgency: req.urgency,
      waitingMinutes: 1,
      distanceKm: 0.5,
      locationName: req.addressText,
      latitude: req.latitude,
      longitude: req.longitude,
      contactName: this.user.name,
      contactRole: 'Requester',
      phone: this.user.phone,
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      itemType: req.itemType,
      itemDuration: req.itemDuration,
      patientAge: req.patientAge,
      verified: true,
      verificationBadge: 'College ID Verified',
      createdAt: 'Just now',
      helpGravityScore: 10,
      status: 'open',
      helpersOffered: 0,
    };
    this.requests.unshift(newReq);
    return { success: true, id: newId };
  }

  async offerHelp(requestId: string): Promise<{ success: boolean }> {
    const r = this.requests.find((x) => x.id === requestId);
    if (r) {
      r.helpersOffered = (r.helpersOffered || 0) + 1;
    }
    return { success: true };
  }

  async acceptOffer(offerId: string): Promise<{ success: boolean }> {
    return { success: true };
  }

  async completeRequest(requestId: string): Promise<{ success: boolean }> {
    const r = this.requests.find((x) => x.id === requestId);
    if (r) r.status = 'completed';
    return { success: true };
  }

  async cancelRequest(requestId: string): Promise<{ success: boolean }> {
    this.requests = this.requests.filter((x) => x.id !== requestId);
    return { success: true };
  }

  async getContact(requestId: string): Promise<{ name: string; phone: string; relationship: string } | null> {
    const r = this.requests.find((x) => x.id === requestId);
    if (!r) return null;
    return { name: r.contactName, phone: r.phone, relationship: 'requester' };
  }

  async getPublicStats(): Promise<any> {
    return {
      openRequests: this.requests.filter((r) => r.status === 'open').length,
      verifiedHelpers: 142,
      completedRequests: 89,
      totalVolunteers: 230,
    };
  }

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    return this.user;
  }

  async uploadVerificationDoc(phone: string, file: File): Promise<{ success: boolean }> {
    this.user.verificationState = 'pending';
    this.user.idDocumentName = file.name;
    this.user.phone = phone;
    return { success: true };
  }

  async getNotifications(): Promise<NotificationItem[]> {
    return this.notifications;
  }

  async markNotificationRead(id: string): Promise<void> {
    const n = this.notifications.find((x) => x.id === id);
    if (n) n.unread = false;
  }

  async markAllNotificationsRead(): Promise<void> {
    this.notifications.forEach((n) => (n.unread = false));
  }

  async submitRating(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async submitReport(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async submitSos(): Promise<{ success: boolean }> {
    return { success: true };
  }
}

export const mockAdapter = new MockDataAdapter();
