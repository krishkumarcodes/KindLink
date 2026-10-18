import { DataAdapter, CreateRequestInput, TransitLocation } from './adapter';
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
import { createClient } from '../supabase/client';
import { ASANSOL_CENTER } from './mock-requests';

class SupabaseDataAdapter implements DataAdapter {
  private getSupabase() {
    return createClient();
  }

  async getRequests(options?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
    category?: HelpCategory | 'all';
    urgency?: UrgencyLevel | 'all';
  }): Promise<HelpRequest[]> {
    const supabase = this.getSupabase();
    const lat = options?.lat ?? ASANSOL_CENTER.lat;
    const lng = options?.lng ?? ASANSOL_CENTER.lng;
    const radius = options?.radiusKm ?? 50.0;
    const cat = options?.category && options.category !== 'all' ? options.category : null;

    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.rpc('nearby_requests', {
      lat,
      lng,
      radius_km: radius,
      filter_cat: cat === 'elderly' ? 'elderly_help' : cat,
      page_limit: 100,
      page_offset: 0,
      p_user_id: user?.id || null,
    });

    if (error || !data) {
      console.warn('Fallback to empty requests on Supabase RPC error:', error?.message);
      return [];
    }

    return (data as any[]).map((r) => this.mapDbRowToHelpRequest(r));
  }

  private mapDbRowToHelpRequest(r: any): HelpRequest {
    const details = r.details || {};
    const category = (r.category === 'elderly_help' ? 'elderly' : r.category) as HelpCategory;
    let latitude = r.latitude;
    let longitude = r.longitude;
    if ((latitude === undefined || longitude === undefined) && typeof r.location === 'string') {
      const match = r.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
      if (match) {
        longitude = parseFloat(match[1]);
        latitude = parseFloat(match[2]);
      }
    }

    return {
      id: r.id,
      requesterId: r.requester_id,
      title: r.title,
      description: r.description,
      category,
      urgency: r.urgency as UrgencyLevel,
      waitingMinutes: r.waiting_minutes ?? Math.max(1, Math.round((Date.now() - new Date(r.created_at).getTime()) / 60000)),
      distanceKm: r.distance_km ?? 0,
      locationName: r.address_text || 'Local Area',
      latitude: latitude ?? 23.6889,
      longitude: longitude ?? 86.9661,
      contactName: details.contact_name || 'Community Volunteer',
      contactRole: details.contact_role || 'Requester',
      phone: details.contact_phone || 'Protected until match',
      bloodGroup: details.blood_group,
      unitsNeeded: details.units_needed,
      hospitalName: details.hospital_name,
      neededByTime: details.needed_by_time,
      itemType: details.item_type,
      itemDuration: details.item_duration,
      elderlyAidType: details.elderly_aid_type,
      elderlyDuration: details.elderly_duration,
      scheduledTime: details.scheduled_time,
      booksClassSubject: details.books_class_subject,
      bookTitle: details.book_title,
      bookCondition: details.book_condition,
      pickupAddress: details.pickup_address,
      dropAddress: details.drop_address,
      passengerCount: details.passenger_count,
      hasLuggage: details.has_luggage,
      wheelchairAccessible: details.wheelchair_accessible,
      patientAge: details.patient_age,
      verified: true,
      verificationBadge: 'Verified Need',
      createdAt: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: r.status as RequestLifecycleStatus,
      helpersOffered: Number(r.offer_count ?? r.helpers_offered ?? 0),
      acceptedHelperId: r.accepted_helper_id,
    };
  }

  async getMyActiveRequests(userId?: string): Promise<HelpRequest[]> {
    const supabase = this.getSupabase();
    let targetUserId = userId;
    if (!targetUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      targetUserId = user?.id;
    }
    if (!targetUserId) return [];

    const { data, error } = await supabase.rpc('get_my_active_requests', {
      p_user_id: targetUserId,
    });

    if (!error && data) {
      return (data as any[]).map((r) => this.mapDbRowToHelpRequest(r));
    }

    const { data: rows } = await supabase
      .from('requests')
      .select('*')
      .eq('requester_id', targetUserId)
      .not('status', 'in', '("completed","cancelled")')
      .order('created_at', { ascending: false });

    if (!rows) return [];
    return (rows as any[]).map((r) => this.mapDbRowToHelpRequest(r));
  }

  async createRequest(req: CreateRequestInput): Promise<{ success: boolean; id: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be signed in to post a help request.');
    }

    const details: Record<string, any> = {};
    if (req.bloodGroup) details.blood_group = req.bloodGroup;
    if (req.unitsNeeded) details.units_needed = req.unitsNeeded;
    if (req.hospitalName) details.hospital_name = req.hospitalName;
    if (req.neededByTime) details.needed_by_time = req.neededByTime;
    if (req.itemType) details.item_type = req.itemType;
    if (req.itemDuration) details.item_duration = req.itemDuration;
    if (req.elderlyAidType) details.elderly_aid_type = req.elderlyAidType;
    if (req.elderlyDuration) details.elderly_duration = req.elderlyDuration;
    if (req.scheduledTime) details.scheduled_time = req.scheduledTime;
    if (req.booksClassSubject) details.books_class_subject = req.booksClassSubject;
    if (req.bookTitle) details.book_title = req.bookTitle;
    if (req.bookCondition) details.book_condition = req.bookCondition;
    if (req.pickupAddress) details.pickup_address = req.pickupAddress;
    if (req.dropAddress) details.drop_address = req.dropAddress;
    if (req.passengerCount) details.passenger_count = req.passengerCount;
    if (req.hasLuggage !== undefined) details.has_luggage = req.hasLuggage;
    if (req.wheelchairAccessible !== undefined) details.wheelchair_accessible = req.wheelchairAccessible;
    if (req.patientAge) details.patient_age = req.patientAge;
    if (req.contactName) details.contact_name = req.contactName;
    if (req.contactPhone) details.contact_phone = req.contactPhone;
    if (req.contactRole) details.contact_role = req.contactRole;

    const dbCategory = req.category === 'elderly' ? 'elderly_help' : req.category;

    const { data, error } = await supabase
      .from('requests')
      .insert({
        requester_id: user.id,
        category: dbCategory,
        title: req.title,
        description: req.description,
        urgency: req.urgency,
        location: `POINT(${req.longitude} ${req.latitude})`,
        address_text: req.addressText,
        details,
        status: 'open',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create request');
    }

    return { success: true, id: data.id };
  }

  async getOffers(requestId: string): Promise<VolunteerOffer[]> {
    const supabase = this.getSupabase();
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        request_id,
        helper_id,
        message,
        status,
        created_at,
        profiles:helper_id (
          display_name,
          username,
          phone,
          rating_average,
          verification_status
        )
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return (data as any[]).map((o) => {
      const profile = Array.isArray(o.profiles) ? o.profiles[0] : o.profiles;
      return {
        id: o.id,
        requestId: o.request_id,
        helperId: o.helper_id,
        helperName: profile?.display_name || profile?.username || 'Verified Helper',
        helperPhone: profile?.phone,
        helperRating: Number(profile?.rating_average) || 5.0,
        helperVerification: profile?.verification_status || 'verified',
        helperDistanceKm: 1.2,
        helperEtaMinutes: 8,
        message: o.message || 'I am ready to help!',
        status: o.status,
        createdAt: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    });
  }

  async canOfferHelp(
    requestId: string,
    userId?: string
  ): Promise<{ allowed: boolean; reason?: 'own_request' | 'not_verified' | 'already_offered' | 'request_closed' | 'ok' | string }> {
    const supabase = this.getSupabase();
    let effectiveUserId = userId;
    if (!effectiveUserId) {
      const { data: { user } } = await supabase.auth.getUser();
      effectiveUserId = user?.id;
    }
    if (!effectiveUserId) {
      return { allowed: false, reason: 'not_authenticated' };
    }

    const { data: rpcRes, error: rpcErr } = await supabase.rpc('can_offer_help', {
      p_request_id: requestId,
      p_user_id: effectiveUserId,
    });

    if (!rpcErr && rpcRes) {
      return {
        allowed: rpcRes === 'ok',
        reason: rpcRes as any,
      };
    }

    const { data: req } = await supabase
      .from('requests')
      .select('requester_id, status')
      .eq('id', requestId)
      .single();

    if (!req) return { allowed: false, reason: 'not_found' };

    if (effectiveUserId && req.requester_id === effectiveUserId) {
      return { allowed: false, reason: 'own_request' };
    }

    if (req.status !== 'open') {
      return { allowed: false, reason: 'request_closed' };
    }

    return { allowed: true, reason: 'ok' };
  }

  async offerHelp(requestId: string, message?: string): Promise<{ success: boolean; error?: string; code?: string; offerId?: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Please sign in to offer help.' };
    }

    const eligibility = await this.canOfferHelp(requestId, user.id);
    if (!eligibility.allowed) {
      if (eligibility.reason === 'own_request') {
        return { success: false, error: 'You cannot offer help on your own request.', code: 'own_request' };
      }
      if (eligibility.reason === 'not_verified') {
        return { success: false, error: 'Identity verification is required before offering volunteer assistance.', code: 'not_verified' };
      }
      if (eligibility.reason === 'already_offered') {
        return { success: false, error: 'You already have an active offer on this request.', code: 'already_offered' };
      }
      if (eligibility.reason === 'request_closed') {
        return { success: false, error: 'This request is no longer open for offers.', code: 'request_closed' };
      }
    }

    const { data: inserted, error } = await supabase.from('offers').insert({
      request_id: requestId,
      helper_id: user.id,
      message: message || 'I am ready to help!',
      status: 'pending',
    }).select('id').single();

    if (error) {
      const isOwn =
        error.message?.toLowerCase().includes('own request') ||
        error.code === 'P0001' ||
        error.code === '42501';
      return {
        success: false,
        error: isOwn ? 'You cannot offer help on your own request.' : error.message,
        code: isOwn ? 'own_request' : undefined,
      };
    }

    return { success: true, offerId: inserted?.id };
  }

  async acceptOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error: rpcError } = await supabase.rpc('accept_offer', { target_offer_id: offerId });
    if (!rpcError) {
      return { success: true };
    }

    const { data: offer } = await supabase
      .from('offers')
      .select('request_id, helper_id')
      .eq('id', offerId)
      .single();

    if (offer) {
      await supabase.from('offers').update({ status: 'accepted' }).eq('id', offerId);
      await supabase
        .from('offers')
        .update({ status: 'declined' })
        .eq('request_id', offer.request_id)
        .neq('id', offerId)
        .eq('status', 'pending');
      await supabase
        .from('requests')
        .update({
          status: 'accepted',
          accepted_helper_id: offer.helper_id,
          accepted_at: new Date().toISOString(),
        })
        .eq('id', offer.request_id);
      return { success: true };
    }

    return { success: false, error: rpcError.message };
  }

  async declineOffer(offerId: string, _reason?: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error } = await supabase
      .from('offers')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', offerId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async withdrawOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error } = await supabase
      .from('offers')
      .update({ status: 'withdrawn', updated_at: new Date().toISOString() })
      .eq('id', offerId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async completeRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error: rpcError } = await supabase.rpc('complete_request', { target_request_id: requestId });
    if (!rpcError) {
      return { success: true };
    }
    const { error } = await supabase
      .from('requests')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async cancelRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error: rpcError } = await supabase.rpc('cancel_request', { target_request_id: requestId });
    if (!rpcError) {
      return { success: true };
    }
    const { error } = await supabase
      .from('requests')
      .update({ status: 'cancelled' })
      .eq('id', requestId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async updateRequestStatus(
    requestId: string,
    status: RequestLifecycleStatus
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const updateData: Record<string, any> = { status };
    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'accepted') {
      updateData.accepted_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', requestId);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async updateTransitLocation(
    requestId: string,
    lat: number,
    lng: number,
    heading = 0,
    speed = 0
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required' };

    const { error } = await supabase.from('active_transit_locations').upsert({
      request_id: requestId,
      helper_id: user.id,
      location: `POINT(${lng} ${lat})`,
      heading,
      speed,
      updated_at: new Date().toISOString(),
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async getTransitLocation(requestId: string): Promise<TransitLocation | null> {
    const supabase = this.getSupabase();
    const { data, error } = await supabase
      .from('active_transit_locations')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();

    if (error || !data) return null;

    let lat = 23.6845;
    let lng = 86.9742;
    if (typeof data.location === 'string' && data.location.includes('POINT')) {
      const match = data.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    } else if (data.latitude && data.longitude) {
      lat = data.latitude;
      lng = data.longitude;
    }

    return {
      lat,
      lng,
      heading: data.heading,
      speed: data.speed,
      updatedAt: data.updated_at,
    };
  }

  async getNearbyVerifiedHelpersCount(lat: number, lng: number, radiusKm = 10): Promise<number> {
    const supabase = this.getSupabase();
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');
      if (!error && typeof count === 'number' && count > 0) {
        return count;
      }
    } catch {
      // Fallback
    }
    return 14;
  }


  async getContact(requestId: string): Promise<{ name: string; phone: string; relationship: string } | null> {
    const supabase = this.getSupabase();
    const { data, error } = await supabase.rpc('get_contact', { req_id: requestId });

    if (error || !data || data.length === 0) {
      return null;
    }

    const first = data[0];
    return {
      name: first.counterpart_name,
      phone: first.counterpart_phone,
      relationship: first.user_relationship,
    };
  }

  async getPublicStats(): Promise<{
    openRequests: number;
    verifiedHelpers: number;
    completedRequests: number;
    totalVolunteers: number;
  }> {
    const supabase = this.getSupabase();
    const { data, error } = await supabase.rpc('public_stats');

    if (error || !data) {
      return {
        openRequests: 14,
        verifiedHelpers: 120,
        completedRequests: 85,
        totalVolunteers: 210,
      };
    }

    return {
      openRequests: data.open_requests || 0,
      verifiedHelpers: data.verified_helpers || 0,
      completedRequests: data.completed_requests || 0,
      totalVolunteers: data.total_volunteers || 0,
    };
  }

  async getLiveStats(options?: {
    lat?: number;
    lng?: number;
    radiusKm?: number;
  }): Promise<CommunityLiveStats> {
    const lat = options?.lat ?? ASANSOL_CENTER.lat;
    const lng = options?.lng ?? ASANSOL_CENTER.lng;
    const radius = options?.radiusKm ?? 25.0;

    // 1. Try calling the API route /api/stats/live
    try {
      if (typeof window !== 'undefined') {
        const res = await fetch(`/api/stats/live?lat=${lat}&lng=${lng}&radiusKm=${radius}`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.helpers !== undefined || (json.success && json.data)) {
            const d = json.data || {};
            const trustVal =
              json.satisfaction_pct !== undefined
                ? json.satisfaction_pct
                : d.trustMatchPercentage ?? d.trustMatchPercent ?? null;
            return {
              helpersNearby: json.helpers ?? d.helpersNearby ?? 0,
              avgResponseMinutes:
                json.avg_response_min !== undefined ? json.avg_response_min : (d.avgResponseMinutes ?? null),
              actsOfHelp: json.requests_completed ?? d.actsOfHelp ?? 0,
              trustMatchPercentage: trustVal,
              trustMatchPercent: trustVal,
              activeRequests: json.active_requests ?? d.activeRequests ?? 0,
              updatedAt: new Date().toISOString(),
            };
          }
        }
      }
    } catch {
      // Fall through to direct RPC
    }

    // 2. Direct Supabase RPC
    try {
      const supabase = this.getSupabase();
      let rpcRes = await supabase.rpc('live_stats', {
        p_lat: lat,
        p_lng: lng,
        p_radius_km: radius,
      } as any);

      if (rpcRes.error) {
        rpcRes = await supabase.rpc('live_stats', {
          lat,
          lng,
          radius_km: radius,
        } as any);
      }

      const data: any = rpcRes.data;
      const error = rpcRes.error;

      if (!error && data) {
        const trustVal =
          data.trust_match_percentage !== null && data.trust_match_percentage !== undefined
            ? Number(data.trust_match_percentage)
            : data.trust_match_percent !== null && data.trust_match_percent !== undefined
            ? Number(data.trust_match_percent)
            : data.satisfaction_pct !== null && data.satisfaction_pct !== undefined
            ? Number(data.satisfaction_pct)
            : null;
        const respMin =
          data.avg_response_minutes !== null && data.avg_response_minutes !== undefined
            ? Number(data.avg_response_minutes)
            : data.avg_response_min !== null && data.avg_response_min !== undefined
            ? Number(data.avg_response_min)
            : null;
        return {
          helpersNearby: Number(data.helpers_nearby ?? data.helpers ?? 0),
          avgResponseMinutes: respMin,
          actsOfHelp: Number(data.acts_of_help ?? data.requests_completed ?? 0),
          trustMatchPercentage: trustVal,
          trustMatchPercent: trustVal,
          activeRequests: Number(data.active_requests ?? 0),
          updatedAt: new Date().toISOString(),
        };
      }
    } catch {
      // Fall through
    }

    return {
      helpersNearby: 0,
      avgResponseMinutes: null,
      actsOfHelp: 0,
      trustMatchPercentage: null,
      trustMatchPercent: null,
      updatedAt: new Date().toISOString(),
    };
  }

  async getCurrentUserProfile(): Promise<UserProfile | null> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile) return null;

    return {
      id: profile.id,
      name: profile.display_name || profile.username,
      displayName: profile.display_name || profile.username,
      username: profile.username,
      email: user.email || profile.email || '',
      phone: profile.phone || '',
      college: profile.college || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatar_url || '',
      homeNeighborhood: profile.home_neighborhood || '',
      languages: profile.languages || ['Bengali', 'Hindi', 'English'],
      emergencyContacts: profile.emergency_contacts || [],
      rating: Number(profile.rating_average) || 5.0,
      ratingCount: profile.rating_count || 0,
      helpsCount: profile.rating_count || 0,
      requestsCount: 0,
      verificationState: profile.verification_status || 'unverified',
      badges: profile.verification_status === 'verified' ? ['Identity Verified'] : [],
      createdAt: profile.created_at || user.created_at || '',
    };
  }

  async uploadVerificationDoc(phone: string, file: File): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Sign in required' };
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${user.id}/${Date.now()}_id.${fileExt}`;

    // 1. Upload to private bucket
    const { error: uploadError } = await supabase.storage
      .from('verification-docs')
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      return { success: false, error: uploadError.message };
    }

    // 2. Submit verification request record
    const { error: insertError } = await supabase
      .from('verification_requests')
      .insert({
        user_id: user.id,
        phone,
        id_document_path: filePath,
        status: 'pending',
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // 3. Update profile phone & status
    await supabase
      .from('profiles')
      .update({
        phone,
        verification_status: 'pending',
      })
      .eq('id', user.id);

    return { success: true };
  }

  async getNotifications(): Promise<NotificationItem[]> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return [];

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];

    return data.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.body,
      timeAgo: new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: new Date(n.created_at).getTime(),
      unread: !n.is_read,
      urgency: 'high',
      requestId: n.request_id,
    }));
  }

  async markNotificationRead(id: string): Promise<void> {
    const supabase = this.getSupabase();
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  }

  async markAllNotificationsRead(): Promise<void> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id);
  }

  async submitRating(requestId: string, rateeId: string, stars: number, comment?: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required' };

    const { error } = await supabase.from('ratings').insert({
      request_id: requestId,
      rater_id: user.id,
      ratee_id: rateeId,
      stars,
      comment: comment || null,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async submitReport(requestId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sign in required' };

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      request_id: requestId,
      reason,
      status: 'pending',
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
  }

  async submitSos(
    lat: number,
    lng: number,
    addressText?: string,
    details?: { notes?: string; category?: HelpCategory }
  ): Promise<{ success: boolean; token?: string; event?: SosEvent; requestId?: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    const token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sos_${Date.now()}`;
    const { data, error } = await supabase.from('sos_events').insert({
      user_id: user.id,
      token,
      location: `POINT(${lng} ${lat})`,
      address_text: addressText || 'Asansol Region',
      status: 'active',
    }).select().maybeSingle();

    if (error) {
      return { success: false };
    }

    // Create a CRITICAL urgency emergency request in requests table
    let requestId: string | undefined;
    try {
      const reqRes = await this.createRequest({
        category: details?.category || 'transport',
        title: '🚨 CRITICAL EMERGENCY SOS BEACON',
        description: details?.notes
          ? `Emergency SOS broadcast: ${details.notes}`
          : `High-priority SOS beacon triggered in ${addressText || 'Asansol Region'}. Immediate community assistance requested.`,
        urgency: 'critical',
        latitude: lat,
        longitude: lng,
        addressText: addressText || 'Asansol Region',
      });
      if (reqRes?.success) {
        requestId = reqRes.id;
      }
    } catch {
      // Non-blocking fallback
    }

    // Broadcast emergency beacon on Realtime channel
    try {
      const channel = supabase.channel('kindlink-realtime-channel');
      await channel.send({
        type: 'broadcast',
        event: 'emergency_sos',
        payload: {
          token,
          lat,
          lng,
          addressText: addressText || 'Asansol Region',
          requestId,
          timestamp: Date.now(),
        },
      });
    } catch {
      // Realtime broadcast best-effort
    }

    return {
      success: true,
      token,
      requestId,
      event: data
        ? {
            id: data.id,
            userId: data.user_id,
            token: data.token || token,
            latitude: lat,
            longitude: lng,
            addressText: data.address_text || addressText || 'Asansol Region',
            status: 'active',
            createdAt: data.created_at || new Date().toISOString(),
            expiresAt: data.expires_at || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
            notes: details?.notes,
            requestId,
          }
        : undefined,
    };
  }

  async getSosByToken(token: string): Promise<SosEvent | null> {
    const supabase = this.getSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);

    const query = supabase.from('sos_events').select('*, profiles(name, phone)');
    const { data, error } = isUuid
      ? await query.or(`token.eq.${token},id.eq.${token}`).maybeSingle()
      : await query.eq('id', token).maybeSingle();

    if (error || !data) {
      return null;
    }

    let lat = ASANSOL_CENTER.lat;
    let lng = ASANSOL_CENTER.lng;
    if (typeof data.location === 'string' && data.location.includes('POINT')) {
      const match = data.location.match(/POINT\(([^ ]+)\s+([^)]+)\)/);
      if (match) {
        lng = parseFloat(match[1]);
        lat = parseFloat(match[2]);
      }
    }

    return {
      id: data.id,
      userId: data.user_id,
      token: data.token || data.id,
      latitude: lat,
      longitude: lng,
      addressText: data.address_text || 'Asansol Region',
      status: data.status,
      createdAt: data.created_at,
      expiresAt: data.expires_at || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      userName: data.profiles?.name || 'KindLink Citizen',
      userPhone: data.profiles?.phone || '',
    };
  }

  async resolveSos(token: string): Promise<{ success: boolean }> {
    const supabase = this.getSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
    const query = supabase
      .from('sos_events')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() });

    const { error } = isUuid
      ? await query.or(`token.eq.${token},id.eq.${token}`)
      : await query.eq('id', token);

    try {
      const channel = supabase.channel('kindlink-realtime-channel');
      await channel.send({
        type: 'broadcast',
        event: 'emergency_sos_resolved',
        payload: { token, timestamp: Date.now() },
      });
    } catch {}

    return { success: !error };
  }

  async updateSosDetails(token: string, notes: string): Promise<{ success: boolean }> {
    const supabase = this.getSupabase();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
    const query = supabase
      .from('sos_events')
      .update({ address_text: notes });

    const { error } = isUuid
      ? await query.or(`token.eq.${token},id.eq.${token}`)
      : await query.eq('id', token);

    return { success: !error };
  }

  async updatePreferredLanguage(locale: string): Promise<void> {
    try {
      const supabase = this.getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('profiles')
        .update({ preferred_language: locale })
        .eq('id', user.id);
    } catch {
      // Ignored if offline or unauthenticated
    }
  }
}

export const supabaseAdapter = new SupabaseDataAdapter();
