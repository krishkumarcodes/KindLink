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

  addRequest: (newReq: Omit<HelpRequest, 'id' | 'createdAt' | 'helpGravityScore' | 'status' | 'helpersOffered' | 'distanceKm'>) => void;
  offerHelp: (requestId: string) => void;
  updateVerificationState: (state: VerificationState, docName?: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
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
        const { requests } = get();
        // Recalculate distances and gravity scores with new coords
        const updated = requests.map((req) => {
          const dist = calculateHaversineDistance(
            coords.lat,
            coords.lng,
            req.latitude,
            req.longitude
          );
          const gravityScore = calculateHelpGravity(req.category, req.waitingMinutes, dist);
          return {
            ...req,
            distanceKm: dist,
            helpGravityScore: gravityScore,
          };
        });
        set({ userCoords: coords, requests: updated });
      },

      addRequest: (newReqData) => {
        const { userCoords, requests } = get();
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

        set({
          requests: [newRequest, ...requests],
          selectedRequestId: newRequest.id,
          currentView: 'requests',
        });
      },

      offerHelp: (requestId) => {
        const { requests, userProfile } = get();
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

      markNotificationRead: (id) => {
        const { notifications } = get();
        set({
          notifications: notifications.map((n) => (n.id === id ? { ...n, unread: false } : n)),
        });
      },

      markAllNotificationsRead: () => {
        const { notifications } = get();
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
