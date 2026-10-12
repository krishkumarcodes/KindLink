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
} from '../data/types';
import {
  ASANSOL_CENTER,
  INITIAL_NOTIFICATIONS,
  INITIAL_REQUESTS,
  MOCK_USER,
} from '../data/mock-requests';
import { calculateHaversineDistance, calculateHelpGravity } from '../data/physics';
import { dataAdapter } from '../data';

export type AppView = 'home' | 'requests' | 'map' | 'new' | 'physics' | 'profile' | 'settings';

interface KindLinkState {
  requests: HelpRequest[];
  userProfile: UserProfile;
  notifications: NotificationItem[];
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
  hasSimulatedUrgentAlert: boolean;
  sensorCalibration: { x: number; y: number; z: number; calibrated: boolean };
  isLoadingRequests: boolean;

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
  setUserCoords: (coords: { lat: number; lng: number; isLive: boolean }) => void;
  setSensorCalibration: (cal: { x: number; y: number; z: number; calibrated: boolean }) => void;

  fetchLiveRequests: () => Promise<void>;
  fetchLiveProfile: () => Promise<void>;
  fetchLiveNotifications: () => Promise<void>;

  addRequest: (newReq: Omit<HelpRequest, 'id' | 'createdAt' | 'helpGravityScore' | 'status' | 'helpersOffered' | 'distanceKm'>) => Promise<void>;
  offerHelp: (requestId: string) => Promise<void>;
  updateVerificationState: (state: VerificationState, docName?: string) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  addNotification: (notif: NotificationItem) => void;
}

export const useKindLinkStore = create<KindLinkState>()(
  persist(
    (set, get) => ({
      requests: INITIAL_REQUESTS,
      userProfile: MOCK_USER,
      notifications: INITIAL_NOTIFICATIONS,
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
      hasSimulatedUrgentAlert: false,
      sensorCalibration: { x: 0, y: 0, z: 0, calibrated: false },
      isLoadingRequests: false,

      setCurrentView: (view) => set({ currentView: view }),
      setSelectedRequestId: (id) => set({ selectedRequestId: id }),
      setActiveFeedTab: (tab) => set({ activeFeedTab: tab }),
      setFilterCategory: (cat) => set({ filterCategory: cat }),
      setFilterUrgency: (urg) => set({ filterUrgency: urg }),
      setFilterRadius: (radius) => set({ filterRadius: radius }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setTravelMode: (mode) => set({ travelMode: mode }),
      setWelcomeSeen: (seen) => set({ welcomeSeen: seen }),
      setSensorCalibration: (cal) => set({ sensorCalibration: cal }),

      setUserCoords: (coords) => {
        set({ userCoords: coords });
        get().fetchLiveRequests();
      },

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
          if (fresh && fresh.length > 0) {
            set({ requests: fresh, isLoadingRequests: false });
          } else {
            set({ isLoadingRequests: false });
          }
        } catch {
          set({ isLoadingRequests: false });
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
          if (notifs && notifs.length > 0) {
            set({ notifications: notifs });
          }
        } catch {
          // Handled
        }
      },

      addRequest: async (newReqData) => {
        const { userCoords, fetchLiveRequests } = get();
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
            itemType: newReqData.itemType,
            itemDuration: newReqData.itemDuration,
            patientAge: newReqData.patientAge,
          });

          if (res.success) {
            await fetchLiveRequests();
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

      offerHelp: async (requestId) => {
        const { requests, userProfile } = get();
        try {
          await dataAdapter.offerHelp(requestId);
        } catch {
          // Handled
        }

        const updated = requests.map((req) => {
          if (req.id === requestId) {
            return {
              ...req,
              helpersOffered: (req.helpersOffered || 0) + 1,
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

      updateVerificationState: (state, docName) => {
        const { userProfile } = get();
        set({
          userProfile: {
            ...userProfile,
            verificationState: state,
            ...(docName ? { idDocumentName: docName } : {}),
          },
        });
      },

      markNotificationRead: async (id) => {
        const { notifications } = get();
        try {
          await dataAdapter.markNotificationRead(id);
        } catch {}
        set({
          notifications: notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        });
      },

      markAllNotificationsRead: async () => {
        const { notifications } = get();
        try {
          await dataAdapter.markAllNotificationsRead();
        } catch {}
        set({
          notifications: notifications.map((n) => ({ ...n, unread: false })),
        });
      },

      addNotification: (notif) => {
        const { notifications } = get();
        set({
          notifications: [notif, ...notifications],
        });
      },
    }),
    {
      name: 'kindlink-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
