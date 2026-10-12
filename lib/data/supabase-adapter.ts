import { DataAdapter } from './adapter';
import { HelpRequest, UserProfile, NotificationItem, HelpCategory, UrgencyLevel } from './types';
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

    const { data, error } = await supabase.rpc('nearby_requests', {
      lat,
      lng,
      radius_km: radius,
      filter_cat: cat,
      page_limit: 100,
      page_offset: 0,
    });

    if (error || !data) {
      console.warn('Fallback to empty requests on Supabase RPC error:', error?.message);
      return [];
    }

    return (data as any[]).map((r) => {
      const details = r.details || {};
      return {
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category as HelpCategory,
        urgency: r.urgency as UrgencyLevel,
        waitingMinutes: r.waiting_minutes,
        distanceKm: r.distance_km,
        locationName: r.address_text,
        latitude: r.latitude,
        longitude: r.longitude,
        contactName: 'Community Volunteer',
        contactRole: 'Requester',
        phone: 'Protected until match',
        bloodGroup: details.blood_group,
        unitsNeeded: details.units_needed,
        itemType: details.item_type,
        itemDuration: details.item_duration,
        patientAge: details.patient_age,
        verified: true,
        verificationBadge: 'Verified Need',
        createdAt: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        helpGravityScore: r.help_gravity_score,
        status: r.status,
        helpersOffered: 0,
      };
    });
  }

  async createRequest(req: {
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
  }): Promise<{ success: boolean; id: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('You must be signed in to post a help request.');
    }

    const details: Record<string, any> = {};
    if (req.bloodGroup) details.blood_group = req.bloodGroup;
    if (req.unitsNeeded) details.units_needed = req.unitsNeeded;
    if (req.itemType) details.item_type = req.itemType;
    if (req.itemDuration) details.item_duration = req.itemDuration;
    if (req.patientAge) details.patient_age = req.patientAge;

    const { data, error } = await supabase
      .from('requests')
      .insert({
        requester_id: user.id,
        category: req.category,
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

  async offerHelp(requestId: string, message?: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Please sign in to offer help.' };
    }

    const { error } = await supabase.from('offers').insert({
      request_id: requestId,
      helper_id: user.id,
      message: message || 'I am ready to help!',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  }

  async acceptOffer(offerId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error } = await supabase.rpc('accept_offer', { target_offer_id: offerId });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async completeRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error } = await supabase.rpc('complete_request', { target_request_id: requestId });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  }

  async cancelRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = this.getSupabase();
    const { error } = await supabase.rpc('cancel_request', { target_request_id: requestId });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
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
      email: user.email || '',
      phone: profile.phone || '',
      college: 'Asansol Engineering College',
      rating: Number(profile.rating_average) || 5.0,
      helpsCount: profile.rating_count || 0,
      requestsCount: 0,
      verificationState: profile.verification_status,
      badges: profile.verification_status === 'verified' ? ['Identity Verified', 'Local Guardian'] : ['Volunteer'],
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

  async submitSos(lat: number, lng: number): Promise<{ success: boolean }> {
    const supabase = this.getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false };

    await supabase.from('sos_events').insert({
      user_id: user.id,
      location: `POINT(${lng} ${lat})`,
      status: 'active',
    });

    return { success: true };
  }
}

export const supabaseAdapter = new SupabaseDataAdapter();
