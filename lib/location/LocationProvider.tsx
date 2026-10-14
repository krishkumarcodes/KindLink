'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';
import { reverseGeocode } from '@/lib/geo/reverse-geocode';
import {
  UserCoordinates,
  GeolocationPermissionState,
  SavedPlace,
  LocationContextValue,
} from './types';

const LAST_LOCATION_STORAGE_KEY = 'kindlink_last_known_location';
const SAVED_PLACES_STORAGE_KEY = 'kindlink_saved_places';

const DEFAULT_COORDINATES: UserCoordinates = {
  lat: ASANSOL_CENTER.lat,
  lng: ASANSOL_CENTER.lng,
  isLive: false,
};

const DEFAULT_AREA_NAME = 'Kalyanpur, Asansol';

const INITIAL_SAVED_PLACES: SavedPlace[] = [];


function geoDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  // Local state initialized with defaults; will hydrate from localStorage on mount
  const [userCoords, setUserCoordsState] = useState<UserCoordinates>(DEFAULT_COORDINATES);
  const [userAreaName, setUserAreaNameState] = useState<string>(DEFAULT_AREA_NAME);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<GeolocationPermissionState>('unknown');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [isWatching, setIsWatching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>(INITIAL_SAVED_PLACES);

  // Refs for tracking and throttling
  const watchIdRef = useRef<number | null>(null);
  const lastReportedPosRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const wasWatchingBeforeHiddenRef = useRef<boolean>(false);
  const isWatchingRef = useRef<boolean>(false);
  isWatchingRef.current = isWatching;

  // Persist last known location to localStorage
  const persistLastLocation = useCallback(
    (coords: UserCoordinates, areaName: string, acc: number | null) => {
      if (typeof window === 'undefined') return;
      try {
        localStorage.setItem(
          LAST_LOCATION_STORAGE_KEY,
          JSON.stringify({
            coords,
            areaName,
            accuracy: acc,
            timestamp: Date.now(),
          })
        );
      } catch {
        // Ignore quota errors
      }
    },
    []
  );

  // Synchronize with zustand store
  const syncWithStore = useCallback(
    (coords: UserCoordinates, areaName?: string) => {
      const store = useKindLinkStore.getState();
      store.setUserCoords(coords, areaName);
    },
    []
  );

  // 1. Initial hydration on mount from localStorage (without auto-requesting GPS)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load saved places (and purge any legacy fake hard-coded places)
    try {
      const rawPlaces = localStorage.getItem(SAVED_PLACES_STORAGE_KEY);
      if (rawPlaces) {
        const parsed = JSON.parse(rawPlaces);
        if (Array.isArray(parsed)) {
          const userOnly = parsed.filter(
            (p: SavedPlace) =>
              p &&
              p.id &&
              !['sp-campus', 'sp-hospital', 'sp-ushagram'].includes(p.id) &&
              !p.id.startsWith('fake-')
          );
          setSavedPlaces(userOnly);
          localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(userOnly));
        }
      }
    } catch {
      // Ignore
    }

    // Load last known location for instant app boot
    try {
      const rawLoc = localStorage.getItem(LAST_LOCATION_STORAGE_KEY);
      if (rawLoc) {
        const parsed = JSON.parse(rawLoc);
        if (parsed.coords?.lat && parsed.coords?.lng) {
          setUserCoordsState(parsed.coords);
          if (parsed.areaName) {
            setUserAreaNameState(parsed.areaName);
          }
          if (typeof parsed.accuracy === 'number') {
            setAccuracy(parsed.accuracy);
          }
          syncWithStore(parsed.coords, parsed.areaName);
        }
      } else {
        // Sync default coords to store
        syncWithStore(DEFAULT_COORDINATES, DEFAULT_AREA_NAME);
      }
    } catch {
      syncWithStore(DEFAULT_COORDINATES, DEFAULT_AREA_NAME);
    }

    // Inspect permission status non-intrusively without asking or triggering dialog
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          setPermissionStatus(permission.state as GeolocationPermissionState);
          permission.onchange = () => {
            setPermissionStatus(permission.state as GeolocationPermissionState);
          };
        })
        .catch(() => {
          setPermissionStatus('unknown');
        });
    } else if (!navigator.geolocation) {
      setPermissionStatus('unavailable');
    }
  }, [syncWithStore]);

  // Synchronize store updates back to LocationProvider if store was updated externally
  useEffect(() => {
    const unsub = useKindLinkStore.subscribe((state) => {
      setUserCoordsState((prevCoords) => {
        if (
          prevCoords.lat !== state.userCoords.lat ||
          prevCoords.lng !== state.userCoords.lng ||
          prevCoords.isLive !== state.userCoords.isLive
        ) {
          return state.userCoords;
        }
        return prevCoords;
      });

      setUserAreaNameState((prevArea) => {
        if (state.userAreaName && prevArea !== state.userAreaName) {
          return state.userAreaName;
        }
        return prevArea;
      });
    });

    return () => unsub();
  }, []);

  // Set explicit location (e.g. from search, preset, or pin drop)
  const setLocation = useCallback(
    async (
      coords: { lat: number; lng: number; isLive?: boolean },
      explicitAreaName?: string
    ) => {
      const newCoords: UserCoordinates = {
        lat: Number(coords.lat.toFixed(5)),
        lng: Number(coords.lng.toFixed(5)),
        isLive: Boolean(coords.isLive),
      };

      let areaName = explicitAreaName;
      if (!areaName) {
        try {
          const geocoded = await reverseGeocode(newCoords.lat, newCoords.lng);
          areaName = geocoded.shortLabel;
        } catch {
          areaName = `${newCoords.lat.toFixed(2)}°N, ${newCoords.lng.toFixed(2)}°E`;
        }
      }

      setUserCoordsState(newCoords);
      setUserAreaNameState(areaName);
      setAccuracy(null);
      setError(null);

      persistLastLocation(newCoords, areaName, null);
      syncWithStore(newCoords, areaName);
    },
    [persistLastLocation, syncWithStore]
  );

  // Set area name only
  const setAreaNameOnly = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setUserAreaNameState(trimmed);
      useKindLinkStore.getState().setUserAreaName(trimmed);
      persistLastLocation(userCoords, trimmed, accuracy);
    },
    [userCoords, accuracy, persistLastLocation]
  );

  // Reset to default AEC hub
  const resetToDefaultHub = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsWatching(false);
    }
    setUserCoordsState(DEFAULT_COORDINATES);
    setUserAreaNameState(DEFAULT_AREA_NAME);
    setAccuracy(null);
    setError(null);
    persistLastLocation(DEFAULT_COORDINATES, DEFAULT_AREA_NAME, null);
    syncWithStore(DEFAULT_COORDINATES, DEFAULT_AREA_NAME);
  }, [persistLastLocation, syncWithStore]);

  // Stop live watching
  const stopLiveTracking = useCallback(() => {
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsWatching(false);
    lastReportedPosRef.current = null;
  }, []);

  // Throttled position updater callback used by watcher
  const handleWatchedPosition = useCallback(
    async (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy: rawAcc } = pos.coords;
      const now = Date.now();
      const last = lastReportedPosRef.current;
      const roundedAcc = rawAcc ? Math.round(rawAcc) : null;

      // Throttle condition: skip if move is under ~25m AND less than 15s elapsed
      if (last) {
        const distKm = geoDistanceKm(last.lat, last.lng, latitude, longitude);
        const elapsedMs = now - last.timestamp;
        if (distKm < 0.025 && elapsedMs < 15000) {
          // Update accuracy if better, but skip store notification
          if (roundedAcc !== null) setAccuracy(roundedAcc);
          return;
        }
      }

      lastReportedPosRef.current = { lat: latitude, lng: longitude, timestamp: now };
      setAccuracy(roundedAcc);

      const newCoords: UserCoordinates = {
        lat: Number(latitude.toFixed(5)),
        lng: Number(longitude.toFixed(5)),
        isLive: true,
      };

      try {
        const geocoded = await reverseGeocode(newCoords.lat, newCoords.lng);
        const areaName = geocoded.shortLabel;
        setUserCoordsState(newCoords);
        setUserAreaNameState(areaName);
        setError(null);
        persistLastLocation(newCoords, areaName, roundedAcc);
        syncWithStore(newCoords, areaName);
      } catch {
        const areaName = `GPS (${newCoords.lat.toFixed(3)}°N, ${newCoords.lng.toFixed(3)}°E)`;
        setUserCoordsState(newCoords);
        setUserAreaNameState(areaName);
        setError(null);
        persistLastLocation(newCoords, areaName, roundedAcc);
        syncWithStore(newCoords, areaName);
      }
    },
    [persistLastLocation, syncWithStore]
  );

  // Start live tracking watchPosition
  const startLiveTracking = useCallback(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      setPermissionStatus('unavailable');
      return;
    }

    // Clear existing watch if any
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsWatching(true);
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPermissionStatus('granted');
        handleWatchedPosition(pos);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionStatus('denied');
          setError('Location permission denied.');
          stopLiveTracking();
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError('GPS signal temporarily unavailable.');
        } else if (err.code === err.TIMEOUT) {
          setError('Location request timed out.');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 15000,
      }
    );

    watchIdRef.current = watchId;
  }, [handleWatchedPosition, stopLiveTracking]);

  // Pause watchPosition when document is hidden (battery/data conservation) and resume when visible
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (watchIdRef.current !== null && navigator.geolocation) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
          wasWatchingBeforeHiddenRef.current = true;
        }
      } else if (document.visibilityState === 'visible') {
        if (wasWatchingBeforeHiddenRef.current && isWatchingRef.current) {
          wasWatchingBeforeHiddenRef.current = false;
          startLiveTracking();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [startLiveTracking]);

  // Request live location on explicit user action (e.g. tap)
  const requestLiveLocation = useCallback(async (): Promise<{
    lat: number;
    lng: number;
    areaName: string;
  } | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser', {
        description: 'You can search or select an area manually.',
      });
      setPermissionStatus('unavailable');
      return null;
    }

    if (navigator.vibrate) {
      navigator.vibrate(20);
    }

    setIsLocating(true);
    setError(null);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          setIsLocating(false);
          setPermissionStatus('granted');

          const { latitude, longitude, accuracy: rawAcc } = pos.coords;
          const roundedAcc = rawAcc ? Math.round(rawAcc) : null;
          setAccuracy(roundedAcc);

          const coords: UserCoordinates = {
            lat: Number(latitude.toFixed(5)),
            lng: Number(longitude.toFixed(5)),
            isLive: true,
          };

          lastReportedPosRef.current = {
            lat: coords.lat,
            lng: coords.lng,
            timestamp: Date.now(),
          };

          let areaName = 'Live GPS Location';
          try {
            const geocoded = await reverseGeocode(coords.lat, coords.lng);
            areaName = geocoded.shortLabel;
          } catch {
            areaName = `GPS (${coords.lat.toFixed(3)}°N, ${coords.lng.toFixed(3)}°E)`;
          }

          setUserCoordsState(coords);
          setUserAreaNameState(areaName);
          persistLastLocation(coords, areaName, roundedAcc);
          syncWithStore(coords, areaName);

          // Automatically begin watching for motion updates
          startLiveTracking();

          if (navigator.vibrate) {
            navigator.vibrate([25, 40, 25]);
          }

          resolve({ lat: coords.lat, lng: coords.lng, areaName });
        },
        (err) => {
          setIsLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            setPermissionStatus('denied');
            setError('Location permission was denied in your browser settings.');
            toast.error('Location permission denied', {
              description: 'You can search an address or select a neighborhood preset.',
            });
          } else {
            setError(err.message || 'Unable to retrieve your location');
            toast.warning('Unable to lock GPS location', {
              description: 'Check location services or pick a landmark manually.',
            });
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    });
  }, [persistLastLocation, startLiveTracking, syncWithStore]);

  // Save place
  const savePlace = useCallback((place: Omit<SavedPlace, 'id'>) => {
    const newPlace: SavedPlace = {
      ...place,
      id: `sp-${Date.now()}`,
      createdAt: Date.now(),
    };
    setSavedPlaces((prev) => {
      const updated = [newPlace, ...prev.filter((p) => p.name !== place.name)];
      try {
        localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
    toast.success(`Saved "${place.name}" to your places!`);
  }, []);

  // Update/rename saved place
  const updateSavedPlace = useCallback(
    (id: string, updates: { name: string; type?: SavedPlace['type'] }) => {
      setSavedPlaces((prev) => {
        const updated = prev.map((p) => {
          if (p.id !== id) return p;
          return {
            ...p,
            name: updates.name.trim() || p.name,
            ...(updates.type ? { type: updates.type } : {}),
          };
        });
        try {
          localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
        } catch {
          // Ignore
        }
        return updated;
      });
      toast.success('Place updated successfully');
    },
    []
  );

  // Remove saved place
  const removeSavedPlace = useCallback((id: string) => {
    setSavedPlaces((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(SAVED_PLACES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
    toast.info('Place removed from saved list');
  }, []);

  const value: LocationContextValue = {
    userCoords,
    userAreaName,
    accuracy,
    permissionStatus,
    isLocating,
    isWatching,
    error,
    savedPlaces,
    requestLiveLocation,
    startLiveTracking,
    stopLiveTracking,
    setLocation,
    setAreaNameOnly,
    resetToDefaultHub,
    savePlace,
    updateSavedPlace,
    removeSavedPlace,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
