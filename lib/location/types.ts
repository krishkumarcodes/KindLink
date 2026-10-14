export interface UserCoordinates {
  lat: number;
  lng: number;
  isLive: boolean;
}

export type GeolocationPermissionState =
  | 'prompt'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'unknown';

export interface SavedPlace {
  id: string;
  name: string;
  label: string;
  lat: number;
  lng: number;
  type: 'home' | 'work' | 'campus' | 'custom';
  createdAt?: number;
}

export interface LocationSearchResult {
  id: string;
  displayName: string;
  shortLabel: string;
  lat: number;
  lng: number;
  type?: string;
}

export interface LocationContextValue {
  userCoords: UserCoordinates;
  userAreaName: string;
  accuracy: number | null; // In meters, e.g. 15
  permissionStatus: GeolocationPermissionState;
  isLocating: boolean;
  isWatching: boolean;
  error: string | null;
  savedPlaces: SavedPlace[];
  requestLiveLocation: () => Promise<{ lat: number; lng: number; areaName: string } | null>;
  startLiveTracking: () => void;
  stopLiveTracking: () => void;
  setLocation: (
    coords: { lat: number; lng: number; isLive?: boolean },
    areaName?: string
  ) => Promise<void>;
  setAreaNameOnly: (name: string) => void;
  resetToDefaultHub: () => void;
  savePlace: (place: Omit<SavedPlace, 'id'>) => void;
  removeSavedPlace: (id: string) => void;
}
