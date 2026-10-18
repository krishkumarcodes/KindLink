import { DataAdapter, CreateRequestInput, TransitLocation } from './adapter';
import { HelpRequest, HelpCategory, UserProfile, NotificationItem, VolunteerOffer, RequestLifecycleStatus, CommunityLiveStats, SosEvent } from './types';
import { INITIAL_REQUESTS, INITIAL_NOTIFICATIONS, MOCK_USER, ASANSOL_CENTER } from './mock-requests';
import { calculateDistance } from './distance';

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
      helperBadges: ['Speed Responder', 'Blood Hero'],
      message: 'I have O+ blood donor card and can reach Asansol Hospital in 10 mins.',
      status: 'pending',
      createdAt: '2 mins ago',
    },
    {
      id: 'mock-offer-3',
      requestId: 'req-1',
      helperId: 'usr-debanjan',
      helperName: 'Debanjan Mukherjee',
      helperPhone: '+91 97320 11223',
      helperRating: 4.8,
      helperVerification: 'verified',
      helperDistanceKm: 1.8,
      helperEtaMinutes: 12,
      helperBadges: ['Life Saver', 'Neighborhood Guardian'],
      message: 'I am near Asansol Railway Station with an active donor certificate. Can donate 1 unit immediately.',
      status: 'pending',
      createdAt: '8 mins ago',
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
      helperBadges: ['Verified Medic', 'Elderly Care'],
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
    tag?: string;
  }): Promise<HelpRequest[]> {
    const lat = options?.lat ?? ASANSOL_CENTER.lat;
    const lng = options?.lng ?? ASANSOL_CENTER.lng;
    const radius = options?.radiusKm ?? 30;

    const URGENCY_PRIORITY: Record<string, number> = {
      critical: 1,
      high: 2,
      medium: 3,
      low: 4,
    };

    return this.requests
      .map((r) => {
        const dist = calculateDistance(lat, lng, r.latitude, r.longitude);
        return { ...r, distanceKm: dist };
      })
      .filter((r) => {
        if (options?.category && options.category !== 'all' && r.category !== options.category) return false;
        if (options?.urgency && options.urgency !== 'all' && r.urgency !== options.urgency) return false;
        if (options?.tag && options.tag.trim() && !(r.tags || []).some(t => t.toLowerCase() === options.tag!.trim().toLowerCase())) return false;
        return r.distanceKm <= radius;
      })
      .sort((a, b) => {
        const urgA = URGENCY_PRIORITY[a.urgency] ?? 5;
        const urgB = URGENCY_PRIORITY[b.urgency] ?? 5;
        if (urgA !== urgB) return urgA - urgB;
        if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
        return b.waitingMinutes - a.waitingMinutes;
      });
  }

  async createRequest(req: CreateRequestInput): Promise<{ success: boolean; id: string }> {
    const newId = `req-mock-${Date.now()}`;
    const newReq: HelpRequest = {
      id: newId,
      requesterId: this.user.id,
      title: req.title,
      description: req.description,
      category: req.category,
      customCategoryLabel: req.customCategoryLabel,
      tags: req.tags || [],
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
      status: 'open',
      helpersOffered: 0,
      requiresHandoverPin: req.requiresHandoverPin ?? (req.category === 'equipment' || req.category === 'books'),
      handoverPin:
        req.handoverPin ||
        ((req.requiresHandoverPin ?? (req.category === 'equipment' || req.category === 'books'))
          ? Math.floor(1000 + Math.random() * 9000).toString()
          : undefined),
    };
    this.requests.unshift(newReq);
    return { success: true, id: newId };
  }

  async getMyActiveRequests(userId?: string): Promise<HelpRequest[]> {
    const targetUserId = userId || this.user.id;
    const targetUserName = this.user.name;
    return this.requests.filter(
      (r) =>
        (r.requesterId === targetUserId ||
          (r.contactName && targetUserName && r.contactName.trim().toLowerCase() === targetUserName.trim().toLowerCase())) &&
        r.status !== 'completed' &&
        r.status !== 'cancelled'
    );
  }

  async getOffers(requestId: string): Promise<VolunteerOffer[]> {
    return this.offers.filter((o) => o.requestId === requestId);
  }

  async canOfferHelp(
    requestId: string,
    userId?: string
  ): Promise<{ allowed: boolean; reason?: 'own_request' | 'not_verified' | 'already_offered' | 'request_closed' | 'ok' | string }> {
    const r = this.requests.find((x) => x.id === requestId);
    if (!r) return { allowed: false, reason: 'not_found' };
    const effectiveUserId = userId || this.user.id;
    const effectiveUserName = this.user.name;
    if (r.requesterId === effectiveUserId || (r.contactName && effectiveUserName && r.contactName.trim().toLowerCase() === effectiveUserName.trim().toLowerCase())) {
      return { allowed: false, reason: 'own_request' };
    }
    if (r.status !== 'open' && r.status !== 'offered') {
      return { allowed: false, reason: 'request_closed' };
    }
    return { allowed: true, reason: 'ok' };
  }

  async offerHelp(requestId: string, message?: string): Promise<{ success: boolean; error?: string; code?: string; offerId?: string }> {
    const r = this.requests.find((x) => x.id === requestId);
    if (r && (r.requesterId === this.user.id || (r.contactName && this.user.name && r.contactName.trim().toLowerCase() === this.user.name.trim().toLowerCase()))) {
      return { success: false, error: 'You cannot offer help on your own request.', code: 'own_request' };
    }
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
    return { success: true, offerId: newOffer.id };
  }

  async acceptOffer(offerId: string): Promise<{ success: boolean }> {
    const offer = this.offers.find((o) => o.id === offerId);
    if (offer) {
      offer.status = 'accepted';
      // Transitions other pending offers for this request to 'not_selected'
      this.offers.forEach((o) => {
        if (o.requestId === offer.requestId && o.id !== offerId && o.status === 'pending') {
          o.status = 'not_selected';
        }
      });
      const r = this.requests.find((x) => x.id === offer.requestId);
      if (r) {
        r.status = 'accepted';
        r.acceptedHelperId = offer.helperId;
        r.acceptedHelperName = offer.helperName;
        r.acceptedHelperPhone = offer.helperPhone;
        r.acceptedHelperRating = offer.helperRating;
        r.acceptedHelperDistanceKm = offer.helperDistanceKm;
        r.acceptedHelperEtaMinutes = offer.helperEtaMinutes;
        if (r.requiresHandoverPin ?? (r.category === 'equipment' || r.category === 'books')) {
          r.requiresHandoverPin = true;
          if (!r.handoverPin) {
            r.handoverPin = Math.floor(1000 + Math.random() * 9000).toString();
          }
        }
      }
    }
    return { success: true };
  }

  async declineOffer(offerId: string, reason?: string): Promise<{ success: boolean }> {
    const offer = this.offers.find((o) => o.id === offerId);
    if (offer) {
      offer.status = 'declined';
      if (reason) {
        offer.declineReason = reason;
      }
    }
    return { success: true };
  }

  async withdrawOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
    const offer = this.offers.find((o) => o.id === offerId);
    if (offer) {
      offer.status = 'withdrawn';
      const r = this.requests.find((x) => x.id === offer.requestId);
      if (r && r.helpersOffered && r.helpersOffered > 0) {
        r.helpersOffered -= 1;
        if (r.helpersOffered === 0 && r.status === 'offered') {
          r.status = 'open';
        }
      }
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

  async verifyHandoverPin(
    requestId: string,
    pin: string
  ): Promise<{ success: boolean; error?: string }> {
    const r = this.requests.find((x) => x.id === requestId);
    if (!r) return { success: false, error: 'Request not found' };

    // If request requires PIN, verify it
    if (r.requiresHandoverPin) {
      if (!r.handoverPin || r.handoverPin !== pin.trim()) {
        return { success: false, error: 'Incorrect 4-digit PIN. Please ask the requester for the PIN on their screen.' };
      }
    }

    r.status = 'completed';
    r.handoverConfirmedAt = new Date().toISOString();
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

  async submitRating(
    requestId: string,
    rateeId: string,
    stars: number,
    comment?: string
  ): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  private mockReports: Array<{ id: string; requestId: string; reason: string; createdAt: string }> = [];

  async submitReport(requestId: string = '', reason: string = ''): Promise<{ success: boolean; id?: string }> {
    const reportId = `rep-${Date.now()}`;
    this.mockReports.push({
      id: reportId,
      requestId,
      reason,
      createdAt: new Date().toISOString(),
    });
    return { success: true, id: reportId };
  }

  getSubmittedReports() {
    return [...this.mockReports];
  }

  private sosEvents: Map<string, SosEvent> = new Map();

  async submitSos(
    lat: number,
    lng: number,
    addressText?: string,
    details?: { notes?: string; category?: HelpCategory }
  ): Promise<{ success: boolean; token?: string; event?: SosEvent; requestId?: string }> {
    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sos-token-${Date.now()}`;
    const now = new Date();
    const expires = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours

    // Create a CRITICAL urgency emergency request in requests list
    const reqRes = await this.createRequest({
      category: details?.category || 'transport',
      title: '🚨 CRITICAL EMERGENCY SOS BEACON',
      description: details?.notes
        ? `Emergency SOS Distress Alert: ${details.notes}`
        : `High-priority SOS beacon triggered in ${addressText || 'Asansol Region'}. Immediate community assistance requested.`,
      urgency: 'critical',
      latitude: lat,
      longitude: lng,
      addressText: addressText || 'Asansol Region, West Bengal',
      contactName: this.user.name || 'KindLink Citizen',
      contactPhone: this.user.phone || '',
    });

    const newEvent: SosEvent = {
      id: `sos-${Date.now()}`,
      userId: this.user.id,
      token,
      latitude: lat,
      longitude: lng,
      addressText: addressText || 'Asansol Region, West Bengal',
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      userName: this.user.name,
      userPhone: this.user.phone,
      notes: details?.notes,
      requestId: reqRes.id,
    };
    this.sosEvents.set(token, newEvent);

    this.notifications.unshift({
      id: `notif-sos-${Date.now()}`,
      title: '🚨 CRITICAL: Emergency SOS Triggered',
      message: `Emergency SOS beacon active near ${newEvent.addressText}. Verified helpers notified.`,
      urgency: 'critical',
      timeAgo: 'Just now',
      type: 'urgency_alert',
      timestamp: Date.now(),
      unread: true,
      requestId: reqRes.id,
    });

    return { success: true, token, event: newEvent, requestId: reqRes.id };
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
      addressText: 'Asansol Hub, West Bengal',
      status: 'active',
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      userName: this.user.name || 'KindLink Citizen',
      userPhone: this.user.phone || '',
    };
  }

  async resolveSos(token: string): Promise<{ success: boolean }> {
    const ev = this.sosEvents.get(token);
    if (ev) {
      ev.status = 'resolved';
      ev.resolvedAt = new Date().toISOString();
      if (ev.requestId) {
        await this.updateRequestStatus(ev.requestId, 'completed');
      }
    }
    return { success: true };
  }

  async updateSosDetails(token: string, notes: string): Promise<{ success: boolean }> {
    const ev = this.sosEvents.get(token);
    if (ev) {
      ev.notes = notes;
    }
    return { success: true };
  }

  async updatePreferredLanguage(locale: string): Promise<void> {
    this.user.preferred_language = locale;
  }

  async endorseRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    const orgName =
      this.user.organizationName ||
      this.user.displayName ||
      this.user.name ||
      'KindLink Community Partner';

    if (!req.endorsedByOrgNames) {
      req.endorsedByOrgNames = [];
    }
    if (!req.endorsedByOrgNames.includes(orgName)) {
      req.endorsedByOrgNames.push(orgName);
    }
    req.endorsementsCount = req.endorsedByOrgNames.length;
    req.isOrganizationEndorsed = req.endorsementsCount > 0;

    return { success: true };
  }

  async removeEndorsement(requestId: string): Promise<{ success: boolean; error?: string }> {
    const req = this.requests.find((r) => r.id === requestId);
    if (!req) return { success: false, error: 'Request not found' };

    const orgName =
      this.user.organizationName ||
      this.user.displayName ||
      this.user.name ||
      'KindLink Community Partner';

    if (req.endorsedByOrgNames) {
      req.endorsedByOrgNames = req.endorsedByOrgNames.filter((n) => n !== orgName);
      req.endorsementsCount = req.endorsedByOrgNames.length;
      req.isOrganizationEndorsed = req.endorsementsCount > 0;
    }

    return { success: true };
  }
}

export const mockAdapter = new MockDataAdapter();

