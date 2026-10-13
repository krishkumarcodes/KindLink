import { DataAdapter, CreateRequestInput, TransitLocation } from './adapter';
import { HelpRequest, UserProfile, NotificationItem, VolunteerOffer, RequestLifecycleStatus, CommunityLiveStats, SosEvent } from './types';
import { INITIAL_REQUESTS, INITIAL_NOTIFICATIONS, MOCK_USER, ASANSOL_CENTER } from './mock-requests';
import { calculateHaversineDistance, calculateHelpGravity } from './physics';

class MockDataAdapter implements DataAdapter {
  private requests: HelpRequest[] = [...INITIAL_REQUESTS];
  private notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
  private user: UserProfile = { ...MOCK_USER };
  private offers: VolunteerOffer[] = [
    {
      id: 'mock-offer-1',
      requestId: 'req-1',
      helperId: 'usr-subhankar',
      helperName: 'Subhankar Roy',
      helperPhone: '+91 98321 44556',
      helperRating: 4.9,
      helperVerification: 'verified',
      helperDistanceKm: 1.4,
      helperEtaMinutes: 8,
      message: 'I have O+ blood donor card and can reach Asansol Hospital in 10 mins.',
      status: 'pending',
      createdAt: '2 mins ago',
    },
    {
      id: 'mock-offer-2',
      requestId: 'req-2',
      helperId: 'usr-priya',
      helperName: 'Dr. Priya Bannerjee',
      helperPhone: '+91 94340 77889',
      helperRating: 5.0,
      helperVerification: 'verified',
      helperDistanceKm: 2.1,
      helperEtaMinutes: 12,
      message: 'Foldable wheelchair is sanitized and ready in my clinic.',
      status: 'pending',
      createdAt: '5 mins ago',
    },
  ];
  private transitLocations: Record<string, TransitLocation> = {};

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

  async createRequest(req: CreateRequestInput): Promise<{ success: boolean; id: string }> {
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
      contactName: req.contactName || this.user.name,
      contactRole: req.contactRole || 'Requester',
      phone: req.contactPhone || this.user.phone,
      bloodGroup: req.bloodGroup,
      unitsNeeded: req.unitsNeeded,
      hospitalName: req.hospitalName,
      neededByTime: req.neededByTime,
      itemType: req.itemType,
      itemDuration: req.itemDuration,
      elderlyAidType: req.elderlyAidType,
      elderlyDuration: req.elderlyDuration,
      scheduledTime: req.scheduledTime,
      booksClassSubject: req.booksClassSubject,
      bookTitle: req.bookTitle,
      bookCondition: req.bookCondition,
      pickupAddress: req.pickupAddress,
      dropAddress: req.dropAddress,
      passengerCount: req.passengerCount,
      hasLuggage: req.hasLuggage,
      wheelchairAccessible: req.wheelchairAccessible,
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

  async getOffers(requestId: string): Promise<VolunteerOffer[]> {
    return this.offers.filter((o) => o.requestId === requestId);
  }

  async offerHelp(requestId: string, message?: string): Promise<{ success: boolean }> {
    const r = this.requests.find((x) => x.id === requestId);
    if (r) {
      r.helpersOffered = (r.helpersOffered || 0) + 1;
      r.status = 'offered';
    }
    const newOffer: VolunteerOffer = {
      id: `offer-${Date.now()}`,
      requestId,
      helperId: this.user.id,
      helperName: this.user.name,
      helperPhone: this.user.phone,
      helperRating: this.user.rating || 5.0,
      helperVerification: this.user.verificationState || 'verified',
      helperDistanceKm: 1.2,
      helperEtaMinutes: 8,
      message: message || 'I can help with this right away!',
      status: 'pending',
      createdAt: 'Just now',
    };
    this.offers.unshift(newOffer);
    return { success: true };
  }

  async acceptOffer(offerId: string): Promise<{ success: boolean }> {
    const offer = this.offers.find((o) => o.id === offerId);
    if (offer) {
      offer.status = 'accepted';
      const r = this.requests.find((x) => x.id === offer.requestId);
      if (r) {
        r.status = 'accepted';
        r.acceptedHelperId = offer.helperId;
        r.acceptedHelperName = offer.helperName;
        r.acceptedHelperPhone = offer.helperPhone;
        r.acceptedHelperRating = offer.helperRating;
        r.acceptedHelperDistanceKm = offer.helperDistanceKm;
        r.acceptedHelperEtaMinutes = offer.helperEtaMinutes;
      }
    }
    return { success: true };
  }

  async declineOffer(offerId: string): Promise<{ success: boolean }> {
    const offer = this.offers.find((o) => o.id === offerId);
    if (offer) {
      offer.status = 'declined';
    }
    return { success: true };
  }

  async updateRequestStatus(
    requestId: string,
    status: RequestLifecycleStatus
  ): Promise<{ success: boolean }> {
    const r = this.requests.find((x) => x.id === requestId);
    if (r) {
      r.status = status;
    }
    return { success: true };
  }

  async updateTransitLocation(
    requestId: string,
    lat: number,
    lng: number,
    heading = 0,
    speed = 0
  ): Promise<{ success: boolean }> {
    this.transitLocations[requestId] = {
      lat,
      lng,
      heading,
      speed,
      updatedAt: new Date().toISOString(),
    };
    const r = this.requests.find((x) => x.id === requestId);
    if (r) {
      r.transitLatitude = lat;
      r.transitLongitude = lng;
      r.isLiveLocationSharing = true;
      r.transitUpdatedAt = new Date().toISOString();
    }
    return { success: true };
  }

  async getTransitLocation(requestId: string): Promise<TransitLocation | null> {
    return this.transitLocations[requestId] || null;
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

  async getNearbyVerifiedHelpersCount(): Promise<number> {
    return 14;
  }

  async getPublicStats(): Promise<any> {
    return {
      openRequests: this.requests.filter((r) => r.status === 'open').length,
      verifiedHelpers: 142,
      completedRequests: 89,
      totalVolunteers: 230,
    };
  }

  async getLiveStats(): Promise<CommunityLiveStats> {
    return {
      helpersNearby: 4,
      avgResponseMinutes: 12,
      actsOfHelp: 15,
      trustMatchPercentage: 96.5,
      trustMatchPercent: 96.5,
      updatedAt: new Date().toISOString(),
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

  private sosEvents: Map<string, SosEvent> = new Map();

  async submitSos(
    lat: number,
    lng: number,
    addressText?: string
  ): Promise<{ success: boolean; token?: string; event?: SosEvent }> {
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sos-token-${Date.now()}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours
    const newEvent: SosEvent = {
      id: `sos-${Date.now()}`,
      userId: this.user.id,
      token,
      latitude: lat,
      longitude: lng,
      addressText: addressText || 'Asansol Hub, West Bengal',
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      userName: this.user.name,
      userPhone: this.user.phone,
    };
    this.sosEvents.set(token, newEvent);

    this.notifications.unshift({
      id: `notif-sos-${Date.now()}`,
      title: '🚨 CRITICAL: Emergency SOS Triggered',
      message: `Emergency SOS beacon active near ${newEvent.addressText}. Helpers notified.`,
      urgency: 'critical',
      timeAgo: 'Just now',
      type: 'urgency_alert',
      timestamp: Date.now(),
      unread: true,
      requestId: undefined,
    });

    return { success: true, token, event: newEvent };
  }

  async getSosByToken(token: string): Promise<SosEvent | null> {
    const found = this.sosEvents.get(token);
    if (found) return found;
    const now = new Date();
    const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    return {
      id: `sos-${token.slice(0, 8)}`,
      userId: this.user.id,
      token,
      latitude: ASANSOL_CENTER.lat,
      longitude: ASANSOL_CENTER.lng,
      addressText: 'Court More / GT Road, Asansol, West Bengal',
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      userName: 'KindLink Citizen',
      userPhone: '+91 98321 00000',
    };
  }

  async resolveSos(token: string): Promise<{ success: boolean }> {
    const ev = this.sosEvents.get(token);
    if (ev) {
      ev.status = 'resolved';
      ev.resolvedAt = new Date().toISOString();
    }
    return { success: true };
  }

  async updatePreferredLanguage(locale: string): Promise<void> {
    this.user.preferred_language = locale;
  }
}

export const mockAdapter = new MockDataAdapter();

