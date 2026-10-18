import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  HelpCategory,
  HelpRequest,
  NotificationItem,
  TravelMode,
  UrgencyLevel,
  UserProfile,
  VerificationState,
  RequestLifecycleStatus,
  CommunityLiveStats,
} from '../data/types';
import { ASANSOL_CENTER } from '../data/mock-requests';
import { calculateDistance } from '../data/distance';
import { dataAdapter } from '../data';

export type AppView = 'home' | 'requests' | 'map' | 'new' | 'profile' | 'settings';

export const DEFAULT_USER: UserProfile = {
  id: 'usr-1',
  name: '',
  username: '',
  displayName: '',
  email: '',
  phone: '',
  college: '',
  bio: '',
  avatarUrl: '',
  homeNeighborhood: '',
  languages: ['Bengali', 'Hindi', 'English'],
  emergencyContacts: [],
  visibility: {
    phone: 'members',
    email: 'members',
    organisation: 'members',
    area: 'members',
  },
  visibility_phone: 'members',
  visibility_email: 'members',
  visibility_organisation: 'members',
  visibility_area: 'members',
  bloodGroup: '',
  emergencyPrivacy: {
    sharePhone: false,
    shareBloodGroup: false,
    shareMedicalNote: false,
    medicalNote: '',
  },
  rating: 5.0,
  ratingCount: 0,
  helpsCount: 0,
  requestsCount: 0,
  hoursVolunteered: 0,
  kilometersTraveled: 0,
  verificationState: 'unverified',
  isOrganization: false,
  organizationName: '',
  organizationType: undefined,
  organizationVerified: false,
  organizationRegistrationNumber: '',
  idDocumentName: '',
  idDocumentType: '',
  badges: [],
  emailVerified: false,
  phoneVerified: false,
  createdAt: '',
};

interface KindLinkState {
  requests: HelpRequest[];
  myActiveRequests: HelpRequest[];
  userProfile: UserProfile;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  currentView: AppView;
  selectedRequestId: string | null;
  activeFeedTab: 'urgent' | 'nearest' | 'newest' | 'my_requests';
  filterCategory: HelpCategory | 'all';
  filterUrgency: UrgencyLevel | 'all';
  filterRadius: number; // km
  searchQuery: string;
  travelMode: TravelMode;
  welcomeSeen: boolean;
  userCoords: { lat: number; lng: number; isLive: boolean };
  userAreaName: string;
  hasSimulatedUrgentAlert: boolean;
  isLoadingRequests: boolean;
  liveStats: CommunityLiveStats | null;
  isLoadingStats: boolean;

  // Actions
  setCurrentView: (view: AppView) => void;
  setSelectedRequestId: (id: string | null) => void;
  setActiveFeedTab: (tab: 'urgent' | 'nearest' | 'newest' | 'my_requests') => void;
  setFilterCategory: (cat: HelpCategory | 'all') => void;
  setFilterUrgency: (urg: UrgencyLevel | 'all') => void;
  setFilterRadius: (radius: number) => void;
  setSearchQuery: (query: string) => void;
  setTravelMode: (mode: TravelMode) => void;
  setWelcomeSeen: (seen: boolean) => void;
  setUserCoords: (coords: { lat: number; lng: number; isLive: boolean }, areaName?: string) => void;
  setUserAreaName: (name: string) => void;

  fetchLiveRequests: () => Promise<void>;
  fetchLiveStats: () => Promise<void>;
  fetchLiveProfile: () => Promise<void>;
  fetchLiveNotifications: () => Promise<void>;

  profileActiveTab?: 'overview' | 'activity' | 'badges' | 'impact' | 'verification' | 'settings';
  setProfileActiveTab: (tab: 'overview' | 'activity' | 'badges' | 'impact' | 'verification' | 'settings') => void;

  addRequest: (newReq: Omit<HelpRequest, 'id' | 'createdAt' | 'status' | 'helpersOffered' | 'distanceKm'>) => Promise<void>;
  offerHelp: (requestId: string, message?: string) => Promise<{ success: boolean; error?: string; offerId?: string; code?: string }>;
  withdrawOffer: (offerId: string, requestId: string) => Promise<void>;
  acceptOffer: (offerId: string, requestId: string) => Promise<void>;
  declineOffer: (offerId: string, requestId: string, reason?: string) => Promise<void>;
  cancelRequest: (requestId: string) => Promise<void>;
  completeRequest: (requestId: string) => Promise<void>;
  verifyHandoverPin: (requestId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  updateRequestStatus: (requestId: string, status: RequestLifecycleStatus) => Promise<void>;
  endorseRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  removeEndorsement: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (patch: Partial<UserProfile>) => void;
  addEmergencyContact: (contact: { name: string; phone: string; relationship: string }) => void;
  updateEmergencyContact: (contact: { id: string; name: string; phone: string; relationship: string }) => void;
  removeEmergencyContact: (id: string) => void;
  updateVerificationState: (state: VerificationState, docName?: string, docType?: string) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  dismissNotification: (id: string) => void;
  addNotification: (notif: NotificationItem) => void;
}

export const useKindLinkStore = create<KindLinkState>()(
  persist(
    (set, get) => ({
      // Real database state - starts empty
      requests: [],
      myActiveRequests: [],
      userProfile: DEFAULT_USER,
      notifications: [],
      unreadNotificationCount: 0,
      currentView: 'home',
      selectedRequestId: null,
      activeFeedTab: 'urgent',
      filterCategory: 'all',
      filterUrgency: 'all',
      filterRadius: 20,
      searchQuery: '',
      travelMode: 'bike',
      welcomeSeen: false,
      userCoords: { lat: ASANSOL_CENTER.lat, lng: ASANSOL_CENTER.lng, isLive: false },
      userAreaName: 'Kalyanpur, Asansol',
      hasSimulatedUrgentAlert: false,
      isLoadingRequests: false,
      liveStats: null,
      isLoadingStats: false,

      setCurrentView: (view) => set({ currentView: view }),
      setSelectedRequestId: (id) => set({ selectedRequestId: id }),
      setActiveFeedTab: (tab) => set({ activeFeedTab: tab }),
      setFilterCategory: (cat) => set({ filterCategory: cat }),
      setFilterUrgency: (urg) => set({ filterUrgency: urg }),
      setFilterRadius: (radius) => {
        set({ filterRadius: radius });
        get().fetchLiveRequests();
        get().fetchLiveStats();
      },
      setSearchQuery: (query) => set({ searchQuery: query }),
      setTravelMode: (mode) => set({ travelMode: mode }),
      setWelcomeSeen: (seen) => set({ welcomeSeen: seen }),
      profileActiveTab: undefined,
      setProfileActiveTab: (tab) => set({ profileActiveTab: tab }),

      setUserCoords: (coords, areaName) => {
        set({
          userCoords: coords,
          ...(areaName ? { userAreaName: areaName } : {}),
        });
        get().fetchLiveRequests();
        get().fetchLiveStats();
      },
      setUserAreaName: (name) => set({ userAreaName: name }),

      fetchLiveRequests: async () => {
        const { userCoords, filterRadius, filterCategory, filterUrgency, userProfile } = get();
        set({ isLoadingRequests: true });
        try {
          const [fresh, myActive] = await Promise.all([
            dataAdapter.getRequests({
              lat: userCoords.lat,
              lng: userCoords.lng,
              radiusKm: filterRadius,
              category: filterCategory,
              urgency: filterUrgency,
            }),
            dataAdapter.getMyActiveRequests ? dataAdapter.getMyActiveRequests(userProfile?.id) : Promise.resolve([]),
          ]);
          set({
            requests: fresh || [],
            myActiveRequests: myActive || [],
            isLoadingRequests: false,
          });
        } catch {
          set({ requests: [], myActiveRequests: [], isLoadingRequests: false });
        }
      },

      fetchLiveStats: async () => {
        const { userCoords, filterRadius } = get();
        set({ isLoadingStats: true });
        try {
          const stats = await dataAdapter.getLiveStats({
            lat: userCoords.lat,
            lng: userCoords.lng,
            radiusKm: filterRadius,
          });
          set({ liveStats: stats, isLoadingStats: false });
        } catch {
          set({ isLoadingStats: false });
        }
      },

      fetchLiveProfile: async () => {
        try {
          const profile = await dataAdapter.getCurrentUserProfile();
          if (profile) {
            set({ userProfile: profile });
          }
        } catch {
          // Handled
        }
      },

      fetchLiveNotifications: async () => {
        try {
          const notifs = await dataAdapter.getNotifications();
          if (notifs) {
            set({
              notifications: notifs,
              unreadNotificationCount: notifs.filter((n) => n.unread).length,
            });
          }
        } catch {
          // Handled
        }
      },

      addRequest: async (newReqData) => {
        const { userCoords, fetchLiveRequests, fetchLiveStats } = get();
        try {
          const res = await dataAdapter.createRequest({
            category: newReqData.category,
            title: newReqData.title,
            description: newReqData.description,
            urgency: newReqData.urgency,
            latitude: newReqData.latitude,
            longitude: newReqData.longitude,
            addressText: newReqData.locationName,
            bloodGroup: newReqData.bloodGroup,
            unitsNeeded: newReqData.unitsNeeded,
            hospitalName: newReqData.hospitalName,
            neededByTime: newReqData.neededByTime,
            itemType: newReqData.itemType,
            itemDuration: newReqData.itemDuration,
            elderlyAidType: newReqData.elderlyAidType,
            elderlyDuration: newReqData.elderlyDuration,
            scheduledTime: newReqData.scheduledTime,
            booksClassSubject: newReqData.booksClassSubject,
            bookTitle: newReqData.bookTitle,
            bookCondition: newReqData.bookCondition,
            pickupAddress: newReqData.pickupAddress,
            dropAddress: newReqData.dropAddress,
            passengerCount: newReqData.passengerCount,
            hasLuggage: newReqData.hasLuggage,
            wheelchairAccessible: newReqData.wheelchairAccessible,
            patientAge: newReqData.patientAge,
            contactName: newReqData.contactName,
            contactPhone: newReqData.phone,
            contactRole: newReqData.contactRole,
          });

          if (res.success) {
            await fetchLiveRequests();
            await fetchLiveStats();
            set({
              selectedRequestId: res.id,
              currentView: 'requests',
            });
          }
        } catch {
          // Fallback optimistic local addition
          const dist = calculateDistance(
            userCoords.lat,
            userCoords.lng,
            newReqData.latitude,
            newReqData.longitude
          );

          const newRequest: HelpRequest = {
            ...newReqData,
            id: `req-${Date.now()}`,
            distanceKm: dist,
            createdAt: 'Just now',
            status: 'open',
            helpersOffered: 0,
          };

          set((state) => ({
            requests: [newRequest, ...state.requests],
            selectedRequestId: newRequest.id,
            currentView: 'requests',
          }));
        }
      },

      offerHelp: async (requestId, message) => {
        const { requests, userProfile, fetchLiveStats } = get();
        try {
          const res = await dataAdapter.offerHelp(requestId, message);
          fetchLiveStats();
          if (res && res.success === false) {
            return res;
          }

          const updated = requests.map((req) => {
            if (req.id === requestId) {
              return {
                ...req,
                helpersOffered: (req.helpersOffered || 0) + 1,
                status: (req.status === 'open' ? 'offered' : req.status) as RequestLifecycleStatus,
              };
            }
            return req;
          });

          set({
            requests: updated,
            userProfile: {
              ...userProfile,
              helpsCount: userProfile.helpsCount + 1,
            },
          });
          return res;
        } catch (err: any) {
          return { success: false, error: err.message || 'Failed to submit offer' };
        }
      },

      withdrawOffer: async (offerId, requestId) => {
        const { requests, userProfile, fetchLiveStats } = get();
        try {
          await dataAdapter.withdrawOffer(offerId);
          fetchLiveStats();
        } catch {
          // Handled
        }

        const updated = requests.map((req) => {
          if (req.id === requestId && req.helpersOffered && req.helpersOffered > 0) {
            const count = req.helpersOffered - 1;
            return {
              ...req,
              helpersOffered: count,
              status: (count === 0 && req.status === 'offered' ? 'open' : req.status) as RequestLifecycleStatus,
            };
          }
          return req;
        });

        set({
          requests: updated,
          userProfile: {
            ...userProfile,
            helpsCount: Math.max(0, (userProfile.helpsCount || 1) - 1),
          },
        });
      },

      acceptOffer: async (offerId, requestId) => {
        const { fetchLiveStats, fetchLiveRequests } = get();
        try {
          await dataAdapter.acceptOffer(offerId);
          await fetchLiveStats();
          await fetchLiveRequests();
        } catch {
          // Handled
        }
      },

      declineOffer: async (offerId, requestId, reason) => {
        try {
          await dataAdapter.declineOffer(offerId, reason);
        } catch {
          // Handled
        }
      },

      cancelRequest: async (requestId: string) => {
        try {
          await dataAdapter.cancelRequest(requestId);
          get().fetchLiveRequests();
          get().fetchLiveStats();
        } catch {
          // Handled
        }
      },

      completeRequest: async (requestId: string) => {
        try {
          await dataAdapter.completeRequest(requestId);
          get().fetchLiveRequests();
          get().fetchLiveStats();
        } catch {
          // Handled
        }
      },

      verifyHandoverPin: async (requestId: string, pin: string) => {
        try {
          const res = await dataAdapter.verifyHandoverPin(requestId, pin);
          if (res.success) {
            get().fetchLiveRequests();
            get().fetchLiveStats();
          }
          return res;
        } catch (err: any) {
          return { success: false, error: err?.message || 'Verification failed' };
        }
      },

      updateRequestStatus: async (requestId, status) => {
        const { requests } = get();
        try {
          await dataAdapter.updateRequestStatus(requestId, status);
        } catch {
          // Handled
        }

        const updated = requests.map((req) => {
          if (req.id === requestId) {
            return { ...req, status };
          }
          return req;
        });

        set({ requests: updated });
      },

      endorseRequest: async (requestId: string) => {
        const { userProfile, requests } = get();
        try {
          const res = await dataAdapter.endorseRequest(requestId);
          if (res && res.success === false) {
            return res;
          }

          const orgName =
            userProfile.organizationName ||
            userProfile.displayName ||
            userProfile.name ||
            'Verified Organization';

          const updated = requests.map((req) => {
            if (req.id === requestId) {
              const currentNames = [...(req.endorsedByOrgNames || [])];
              if (!currentNames.includes(orgName)) {
                currentNames.push(orgName);
              }
              return {
                ...req,
                isOrganizationEndorsed: true,
                endorsementsCount: currentNames.length,
                endorsedByOrgNames: currentNames,
              };
            }
            return req;
          });

          set({ requests: updated });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Failed to endorse request' };
        }
      },

      removeEndorsement: async (requestId: string) => {
        const { userProfile, requests } = get();
        try {
          const res = await dataAdapter.removeEndorsement(requestId);
          if (res && res.success === false) {
            return res;
          }

          const orgName =
            userProfile.organizationName ||
            userProfile.displayName ||
            userProfile.name ||
            'Verified Organization';

          const updated = requests.map((req) => {
            if (req.id === requestId) {
              const currentNames = (req.endorsedByOrgNames || []).filter((n) => n !== orgName);
              return {
                ...req,
                isOrganizationEndorsed: currentNames.length > 0,
                endorsementsCount: currentNames.length,
                endorsedByOrgNames: currentNames,
              };
            }
            return req;
          });

          set({ requests: updated });
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || 'Failed to remove endorsement' };
        }
      },

      updateUserProfile: (patch) => {
        const { userProfile } = get();
        set({
          userProfile: { ...userProfile, ...patch },
        });
      },

      addEmergencyContact: (contact) => {
        const { userProfile } = get();
        const newContact = {
          id: `ec-${Date.now()}`,
          ...contact,
        };
        set({
          userProfile: {
            ...userProfile,
            emergencyContacts: [...(userProfile.emergencyContacts || []), newContact],
          },
        });
      },

      updateEmergencyContact: (contact) => {
        const { userProfile } = get();
        set({
          userProfile: {
            ...userProfile,
            emergencyContacts: (userProfile.emergencyContacts || []).map((c) =>
              c.id === contact.id ? { ...c, ...contact } : c
            ),
          },
        });
      },

      removeEmergencyContact: (id) => {
        const { userProfile } = get();
        set({
          userProfile: {
            ...userProfile,
            emergencyContacts: (userProfile.emergencyContacts || []).filter((c) => c.id !== id),
          },
        });
      },

      updateVerificationState: (state, docName, docType) => {
        const { userProfile } = get();
        const existingBadges = userProfile.badges || [];
        const hasVerifiedBadge = existingBadges.includes('Verified');
        const nextBadges =
          state === 'verified' && !hasVerifiedBadge
            ? [...existingBadges, 'Verified']
            : existingBadges;

        set({
          userProfile: {
            ...userProfile,
            verificationState: state,
            ...(docName ? { idDocumentName: docName } : {}),
            ...(docType ? { idDocumentType: docType } : {}),
            badges: nextBadges,
          },
        });
      },

      markNotificationRead: async (id) => {
        const { notifications } = get();
        try {
          await dataAdapter.markNotificationRead(id);
        } catch {}
        const updated = notifications.map((n) => (n.id === id ? { ...n, unread: false } : n));
        set({
          notifications: updated,
          unreadNotificationCount: updated.filter((n) => n.unread).length,
        });
      },

      markAllNotificationsRead: async () => {
        const { notifications } = get();
        try {
          await dataAdapter.markAllNotificationsRead();
        } catch {}
        set({
          notifications: notifications.map((n) => ({ ...n, unread: false })),
          unreadNotificationCount: 0,
        });
      },

      dismissNotification: (id) => {
        const { notifications } = get();
        const updated = notifications.filter((n) => n.id !== id);
        set({
          notifications: updated,
          unreadNotificationCount: updated.filter((n) => n.unread).length,
        });
      },

      addNotification: (notif) => {
        const { notifications } = get();
        const updated = [notif, ...notifications];
        set({
          notifications: updated,
          unreadNotificationCount: updated.filter((n) => n.unread).length,
        });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('kindlink:new-notification', { detail: { id: notif.id } })
          );
        }
      },
    }),
    {
      name: 'kindlink-storage',
      version: 3,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState: any, version: number) => {
        const persistedNotifs = persistedState?.notifications || [];
        const isOldMock =
          persistedState?.userProfile?.name === 'Rahul Sen' ||
          persistedState?.userProfile?.name === 'Community Member';

        if (version < 3 || isOldMock) {
          return {
            ...persistedState,
            requests: version < 2 ? [] : persistedState?.requests || [],
            liveStats: version < 2 ? null : persistedState?.liveStats || null,
            unreadNotificationCount: persistedNotifs.filter((n: any) => n.unread).length,
            userProfile: isOldMock
              ? DEFAULT_USER
              : persistedState?.userProfile || DEFAULT_USER,
          };
        }
        return {
          ...persistedState,
          unreadNotificationCount: persistedNotifs.filter((n: any) => n.unread).length,
        };
      },
    }
  )
);
