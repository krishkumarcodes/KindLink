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
import { calculateHaversineDistance, calculateHelpGravity } from '../data/physics';
import { dataAdapter } from '../data';

export type AppView = 'home' | 'requests' | 'map' | 'new' | 'physics' | 'profile' | 'settings';

export const DEFAULT_USER: UserProfile = {
  id: 'usr-1',
  name: '',
  username: '',
  displayName: '',
  email: '',
  phone: '',
  college: '',
  avatarUrl: '',
  homeNeighborhood: '',
  languages: ['Bengali', 'Hindi', 'English'],
  emergencyContacts: [],
  rating: 5.0,
  ratingCount: 0,
  helpsCount: 0,
  requestsCount: 0,
  hoursVolunteered: 0,
  kilometersTraveled: 0,
  verificationState: 'unverified',
  idDocumentName: '',
  idDocumentType: '',
  badges: [],
  emailVerified: false,
  phoneVerified: false,
};

interface KindLinkState {
  requests: HelpRequest[];
  userProfile: UserProfile;
  notifications: NotificationItem[];
  unreadNotificationCount: number;
  currentView: AppView;
  selectedRequestId: string | null;
  activeFeedTab: 'urgent' | 'nearest' | 'newest';
  filterCategory: HelpCategory | 'all';
  filterUrgency: UrgencyLevel | 'all';
  filterRadius: number; // km
  searchQuery: string;
  travelMode: TravelMode;
  welcomeSeen: boolean;
  userCoords: { lat: number; lng: number; isLive: boolean };
  userAreaName: string;
  hasSimulatedUrgentAlert: boolean;
  sensorCalibration: { x: number; y: number; z: number; calibrated: boolean };
  isLoadingRequests: boolean;
  liveStats: CommunityLiveStats | null;
  isLoadingStats: boolean;

  // Actions
  setCurrentView: (view: AppView) => void;
  setSelectedRequestId: (id: string | null) => void;
  setActiveFeedTab: (tab: 'urgent' | 'nearest' | 'newest') => void;
  setFilterCategory: (cat: HelpCategory | 'all') => void;
  setFilterUrgency: (urg: UrgencyLevel | 'all') => void;
  setFilterRadius: (radius: number) => void;
  setSearchQuery: (query: string) => void;
  setTravelMode: (mode: TravelMode) => void;
  setWelcomeSeen: (seen: boolean) => void;
  setUserCoords: (coords: { lat: number; lng: number; isLive: boolean }, areaName?: string) => void;
  setUserAreaName: (name: string) => void;
  setSensorCalibration: (cal: { x: number; y: number; z: number; calibrated: boolean }) => void;

  fetchLiveRequests: () => Promise<void>;
  fetchLiveStats: () => Promise<void>;
  fetchLiveProfile: () => Promise<void>;
  fetchLiveNotifications: () => Promise<void>;

  addRequest: (newReq: Omit<HelpRequest, 'id' | 'createdAt' | 'helpGravityScore' | 'status' | 'helpersOffered' | 'distanceKm'>) => Promise<void>;
  offerHelp: (requestId: string, message?: string) => Promise<void>;
  updateRequestStatus: (requestId: string, status: RequestLifecycleStatus) => Promise<void>;
  updateUserProfile: (patch: Partial<UserProfile>) => void;
  addEmergencyContact: (contact: { name: string; phone: string; relationship: string }) => void;
  removeEmergencyContact: (id: string) => void;
  updateVerificationState: (state: VerificationState, docName?: string, docType?: string) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addNotification: (notif: NotificationItem) => void;
}

export const useKindLinkStore = create<KindLinkState>()(
  persist(
    (set, get) => ({
      // Real database state - starts empty
      requests: [],
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
      sensorCalibration: { x: 0, y: 0, z: 0, calibrated: false },
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
      setSensorCalibration: (cal) => set({ sensorCalibration: cal }),

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
        const { userCoords, filterRadius, filterCategory, filterUrgency } = get();
        set({ isLoadingRequests: true });
        try {
          const fresh = await dataAdapter.getRequests({
            lat: userCoords.lat,
            lng: userCoords.lng,
            radiusKm: filterRadius,
            category: filterCategory,
            urgency: filterUrgency,
          });
          set({ requests: fresh || [], isLoadingRequests: false });
        } catch {
          set({ requests: [], isLoadingRequests: false });
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
          const dist = calculateHaversineDistance(
            userCoords.lat,
            userCoords.lng,
            newReqData.latitude,
            newReqData.longitude
          );
          const gravityScore = calculateHelpGravity(
            newReqData.category,
            newReqData.waitingMinutes || 1,
            dist
          );

          const newRequest: HelpRequest = {
            ...newReqData,
            id: `req-${Date.now()}`,
            distanceKm: dist,
            createdAt: 'Just now',
            helpGravityScore: gravityScore,
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
          await dataAdapter.offerHelp(requestId, message);
          fetchLiveStats();
        } catch {
          // Handled
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

      addNotification: (notif) => {
        const { notifications } = get();
        const updated = [notif, ...notifications];
        set({
          notifications: updated,
          unreadNotificationCount: updated.filter((n) => n.unread).length,
        });
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
