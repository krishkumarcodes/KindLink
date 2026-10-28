'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/components/ui/OverlayPortal';
import {
  MapPin,
  Crosshair,
  Search,
  Check,
  X,
  Compass,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Plus,
  Trash2,
  Edit2,
  Home,
  Briefcase,
  GraduationCap,
  Navigation,
  Sliders,
  Clock,
  Building2,
  Stethoscope,
  Loader2,
  Pill,
  Droplet,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from '@/lib/location/LocationProvider';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { LocationSearchResult, RecentPlace, SavedPlace } from '@/lib/location/types';
import {
  searchAddress,
  FALLBACK_CITIES,
  FallbackCity,
  fetchNearbyPlaces,
  NearbyPlaceItem,
} from '@/lib/location/search';
import { reverseGeocode } from '@/lib/geo/reverse-geocode';
import { PinDropMap } from '@/components/location/PinDropMap';

const getNearbyPlaceIcon = (category: string) => {
  const cat = (category || '').toLowerCase();
  if (cat.includes('pharm') || cat.includes('medicine')) {
    return <Pill className="h-3.5 w-3.5 notranslate text-emerald-500" />;
  }
  if (cat.includes('blood')) {
    return <Droplet className="h-3.5 w-3.5 notranslate text-rose-500" />;
  }
  if (cat.includes('hospital') || cat.includes('clinic') || cat.includes('health') || cat.includes('doctor')) {
    return <Stethoscope className="h-3.5 w-3.5 notranslate text-teal-500" />;
  }
  if (cat.includes('station') || cat.includes('bus') || cat.includes('rail') || cat.includes('transport')) {
    return <Navigation className="h-3.5 w-3.5 notranslate text-blue-500" />;
  }
  return <Building2 className="h-3.5 w-3.5 notranslate text-indigo-500" />;
};

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
}

type ModalTab = 'search' | 'map' | 'saved';

const RECENT_PLACES_KEY = 'kindlink_recent_places';
const SNAP_RADII = [1, 2, 5, 10, 25, 50] as const;

export function LocationModal({ open, onClose }: LocationModalProps) {
  const {
    userCoords,
    userAreaName,
    accuracy,
    permissionStatus,
    isLocating,
    savedPlaces,
    requestLiveLocation,
    setLocation,
    savePlace,
    updateSavedPlace,
    removeSavedPlace,
  } = useLocation();

  const { filterRadius, setFilterRadius, userProfile } = useKindLinkStore();

  const [activeTab, setActiveTab] = useState<ModalTab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  // Pin drop state
  const [pinLat, setPinLat] = useState<number>(userCoords.lat || 23.6889);
  const [pinLng, setPinLng] = useState<number>(userCoords.lng || 86.9661);
  const [pinAreaName, setPinAreaName] = useState<string>(userAreaName || 'Selected Location');
  const [isGeocodingPin, setIsGeocodingPin] = useState(false);

  // Saved place management
  const [showAddSavedPlace, setShowAddSavedPlace] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<SavedPlace['type']>('home');

  // Recent places on device
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);

  // Nearby places from server
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlaceItem[]>([]);
  const [isLoadingNearby, setIsLoadingNearby] = useState(false);

  // Home area from user profile
  const [profileHomeArea, setProfileHomeArea] = useState<string>('');

  const searchAbortRef = useRef<AbortController | null>(null);
  const pinGeocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard escape listener
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLocating) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, isLocating, onClose]);

  // Sync pin coordinates with current location when opening modal
  useEffect(() => {
    if (open) {
      setPinLat(userCoords.lat || 23.6889);
      setPinLng(userCoords.lng || 86.9661);
      setPinAreaName(userAreaName || 'Selected Location');
      setShowAddSavedPlace(false);
      setEditingPlaceId(null);
      setSearchError(null);
    }
  }, [open, userCoords.lat, userCoords.lng, userAreaName]);

  // Load recent places from localStorage on mount & when opening
  useEffect(() => {
    if (typeof window === 'undefined' || !open) return;
    try {
      const stored = localStorage.getItem(RECENT_PLACES_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setRecentPlaces(parsed.slice(0, 5));
        }
      }
    } catch {
      // ignore
    }
  }, [open]);

  // Add to recent places
  const recordRecentPlace = useCallback((name: string, lat: number, lng: number, label?: string) => {
    if (typeof window === 'undefined') return;
    try {
      const cleanName = name.trim();
      if (!cleanName) return;

      const newRecent: RecentPlace = {
        id: `rec-${Date.now()}`,
        name: cleanName,
        label: label || cleanName,
        lat: Number(lat.toFixed(5)),
        lng: Number(lng.toFixed(5)),
        timestamp: Date.now(),
      };

      setRecentPlaces((prev) => {
        const filtered = prev.filter(
          (p) =>
            p.name.toLowerCase() !== cleanName.toLowerCase() &&
            !(Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lng - lng) < 0.001)
        );
        const updated = [newRecent, ...filtered].slice(0, 5);
        try {
          localStorage.setItem(RECENT_PLACES_KEY, JSON.stringify(updated));
        } catch {
          // ignore
        }
        return updated;
      });
    } catch {
      // ignore
    }
  }, []);

  // Clear recent places
  const handleClearRecent = () => {
    setRecentPlaces([]);
    try {
      localStorage.removeItem(RECENT_PLACES_KEY);
    } catch {
      // ignore
    }
    toast.info('Recent places cleared');
  };

  // Determine user's home area from store or fetch profile
  useEffect(() => {
    if (!open) return;
    const home = userProfile?.homeNeighborhood || '';
    if (home) {
      setProfileHomeArea(home);
      return;
    }

    // Try fetching /api/auth/profile if empty in store
    fetch('/api/auth/profile')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile?.home_neighborhood || data?.profile?.area_name) {
          setProfileHomeArea(data.profile.home_neighborhood || data.profile.area_name);
        }
      })
      .catch(() => {});
  }, [open, userProfile]);

  // Fetch nearby places when open in search mode
  useEffect(() => {
    if (!open || activeTab !== 'search' || !userCoords.lat || !userCoords.lng) return;

    let cancelled = false;
    setIsLoadingNearby(true);

    fetchNearbyPlaces(userCoords.lat, userCoords.lng, 5000)
      .then((places) => {
        if (!cancelled) {
          setNearbyPlaces(places);
          setIsLoadingNearby(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNearbyPlaces([]);
          setIsLoadingNearby(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, activeTab, userCoords.lat, userCoords.lng]);

  // Debounced address search routing through /api/maps/search
  const triggerSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const abortController = new AbortController();
    searchAbortRef.current = abortController;
    setIsSearching(true);
    setSearchError(null);

    try {
      const results = await searchAddress(trimmed, abortController.signal);
      setSearchResults(results);
    } catch (err: unknown) {
      if ((err as Error)?.name !== 'AbortError') {
        setSearchResults([]);
        setSearchError('Search failed to complete. Please try again or check network.');
      }
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      triggerSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, triggerSearch]);

  // Handle pin movement with reverse geocoding
  const handlePinMoved = (newLat: number, newLng: number) => {
    const fixedLat = Number(newLat.toFixed(5));
    const fixedLng = Number(newLng.toFixed(5));
    setPinLat(fixedLat);
    setPinLng(fixedLng);

    if (pinGeocodeTimerRef.current) {
      clearTimeout(pinGeocodeTimerRef.current);
    }

    setIsGeocodingPin(true);
    pinGeocodeTimerRef.current = setTimeout(async () => {
      try {
        const geocoded = await reverseGeocode(fixedLat, fixedLng);
        setPinAreaName(geocoded.shortLabel);
      } catch {
        setPinAreaName(`${fixedLat.toFixed(3)}°N, ${fixedLng.toFixed(3)}°E`);
      } finally {
        setIsGeocodingPin(false);
      }
    }, 350);
  };

  // Confirm pin location ("Use this location")
  const handleConfirmPinLocation = async () => {
    await setLocation({ lat: pinLat, lng: pinLng, isLive: false }, pinAreaName);
    recordRecentPlace(pinAreaName, pinLat, pinLng, `${pinLat.toFixed(4)}°N, ${pinLng.toFixed(4)}°E`);
    toast.success(`Location set to ${pinAreaName}!`, {
      description: 'Mutual aid requests and distances updated.',
    });
    onClose();
  };

  // Select a search result
  const handleSelectSearchResult = async (result: LocationSearchResult) => {
    await setLocation({ lat: result.lat, lng: result.lng, isLive: false }, result.shortLabel);
    recordRecentPlace(result.shortLabel, result.lat, result.lng, result.displayName);
    toast.success(`Location set to ${result.shortLabel}!`);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  // Select a fallback city
  const handleSelectCity = async (city: FallbackCity) => {
    await setLocation({ lat: city.lat, lng: city.lng, isLive: false }, city.name);
    recordRecentPlace(city.name, city.lat, city.lng, city.state);
    toast.success(`Location set to ${city.name}!`);
    onClose();
  };

  // Select a recent place
  const handleSelectRecentPlace = async (place: RecentPlace) => {
    await setLocation({ lat: place.lat, lng: place.lng, isLive: false }, place.name);
    recordRecentPlace(place.name, place.lat, place.lng, place.label);
    toast.success(`Location set to ${place.name}!`);
    onClose();
  };

  // Select a nearby place
  const handleSelectNearbyPlace = async (place: NearbyPlaceItem) => {
    await setLocation({ lat: place.lat, lng: place.lng, isLive: false }, place.name);
    recordRecentPlace(place.name, place.lat, place.lng, place.address);
    toast.success(`Location set to ${place.name}!`);
    onClose();
  };

  // Select a saved place
  const handleSelectSavedPlace = async (place: SavedPlace) => {
    await setLocation({ lat: place.lat, lng: place.lng, isLive: false }, place.name);
    recordRecentPlace(place.name, place.lat, place.lng, place.label);
    toast.success(`Location set to ${place.name}!`);
    onClose();
  };

  // Handle "Use my home area" button
  const handleUseHomeArea = async () => {
    if (!profileHomeArea) {
      toast.error('Home area not configured in your profile', {
        description: 'Set your home neighborhood in Profile Settings.',
      });
      return;
    }

    try {
      const matches = await searchAddress(profileHomeArea);
      if (matches.length > 0 && matches[0]) {
        await setLocation({ lat: matches[0].lat, lng: matches[0].lng, isLive: false }, profileHomeArea);
      } else {
        await setLocation(userCoords, profileHomeArea);
      }
      recordRecentPlace(profileHomeArea, userCoords.lat, userCoords.lng, 'Home Area');
      toast.success(`Switched to your home area: ${profileHomeArea}!`);
      onClose();
    } catch {
      await setLocation(userCoords, profileHomeArea);
      toast.success(`Switched to your home area: ${profileHomeArea}!`);
      onClose();
    }
  };

  // Save or rename a place
  const handleSavePlace = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaceName.trim() || userAreaName;

    if (editingPlaceId) {
      await updateSavedPlace(editingPlaceId, { name, type: newPlaceType });
      setEditingPlaceId(null);
    } else {
      await savePlace({
        name,
        label: userAreaName,
        lat: userCoords.lat,
        lng: userCoords.lng,
        type: newPlaceType,
      });
    }

    setNewPlaceName('');
    setShowAddSavedPlace(false);
  };

  // Live GPS locate action with pulsating crosshair feedback
  const handleGpsLocate = async () => {
    const result = await requestLiveLocation();
    if (result) {
      recordRecentPlace(result.areaName, result.lat, result.lng, 'Live GPS Position');
      toast.success(`Locked to live GPS: ${result.areaName}`, {
        description: 'Tracking your location in real time.',
      });
      onClose();
    }
  };

  // Radius slider handling with snap values: 1, 2, 5, 10, 25, 50 km
  const currentSnapIndex = useMemo(() => {
    const idx = SNAP_RADII.indexOf(filterRadius as (typeof SNAP_RADII)[number]);
    return idx !== -1 ? idx : 3; // Default 10 km
  }, [filterRadius]);

  const handleRadiusSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const stepIdx = Number(e.target.value);
    const snapVal = SNAP_RADII[stepIdx] ?? 10;
    setFilterRadius(snapVal);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('kindlink_filter_radius', String(snapVal));
        fetch('/api/auth/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            notification_preferences: { nearby_radius_km: snapVal },
          }),
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
  };

  const getSavedPlaceIcon = (type?: SavedPlace['type']) => {
    switch (type) {
      case 'home':
        return <Home className="h-4 w-4 notranslate" />;
      case 'work':
        return <Briefcase className="h-4 w-4 notranslate" />;
      case 'clinic':
        return <Stethoscope className="h-4 w-4 notranslate" />;
      case 'campus':
        return <GraduationCap className="h-4 w-4 notranslate" />;
      default:
        return <Bookmark className="h-4 w-4 notranslate" />;
    }
  };

  useBodyScrollLock(open);

  if (!open) return null;

  const modalTree = (
    <>
      {/* Desktop Backdrop: Click outside to dismiss on desktop */}
      <div
        className="fixed inset-0 z-40 hidden sm:block bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
        onClick={() => {
          if (!isLocating) onClose();
        }}
        aria-hidden="true"
      />

      {/* Main Location Panel: FULL SCREEN on mobile devices, responsive centered card on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-dialog-title"
        className="fixed inset-0 z-50 flex flex-col bg-card w-full h-full sm:max-w-xl sm:rounded-3xl sm:m-auto sm:max-h-[85dvh] text-card-foreground border-0 sm:border border-border/80 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95"
      >
        {/* Sticky Header: Single solid bg-card surface, integrated drag handle within 300 chars, no translucent band */}
        <div className="sticky top-0 z-20 p-4 sm:p-5 pb-3 sm:pb-3.5 border-b border-border/80 bg-card text-card-foreground shrink-0">
          {/* Mobile Drag Handle */}
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

          {/* Top Row: Clean title with icon + Close button */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                <Navigation className="h-4 w-4 notranslate" />
              </div>
              <div className="min-w-0">
                <h2
                  id="location-dialog-title"
                  className="text-base sm:text-lg font-black text-foreground tracking-tight truncate"
                >
                  Your Location
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLocating}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted touch-target transition-all"
              aria-label="Close location selector"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>

          {/* Current Location Status Card with Area Name & Live/Manual badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/60 mt-3">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="h-4 w-4 notranslate" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Active Area
                </div>
                <div className="text-xs sm:text-sm font-bold text-foreground truncate">
                  {userAreaName}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {userCoords.isLive ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 rounded-full">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Live {accuracy ? `(±${accuracy}m)` : ''}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-semibold bg-muted border border-border/70 px-2.5 py-1 rounded-full">
                  Manual
                </span>
              )}
            </div>
          </div>

          {/* Segmented Tabs: "Search", "Pin Map", "Saved" */}
          <div className="grid grid-cols-3 gap-1.5 p-1 mt-3 bg-muted/50 dark:bg-slate-900/50 rounded-2xl shrink-0 border border-border/40">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all min-w-0 truncate touch-target ${
                activeTab === 'search'
                  ? 'bg-card text-foreground shadow-xs ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Search className="h-3.5 w-3.5 shrink-0 notranslate" />
              <span className="truncate">Search</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all min-w-0 truncate touch-target ${
                activeTab === 'map'
                  ? 'bg-card text-foreground shadow-xs ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="h-3.5 w-3.5 shrink-0 notranslate" />
              <span className="truncate">Pin Map</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all min-w-0 truncate touch-target ${
                activeTab === 'saved'
                  ? 'bg-card text-foreground shadow-xs ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Bookmark className="h-3.5 w-3.5 shrink-0 notranslate" />
              <span className="truncate">
                Saved{savedPlaces.length > 0 ? ` (${savedPlaces.length})` : ''}
              </span>
            </button>
          </div>
        </div>

        {/* TAB 1: Fast Search Mode */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-5 pt-3">
            {/* Quick One-Tap GPS Detect Hero Button with Pulsating Crosshair & Instant Status */}
            <div className="pb-3 shrink-0">
              <button
                type="button"
                onClick={handleGpsLocate}
                disabled={isLocating}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-700 hover:from-teal-500 hover:to-emerald-500 text-white shadow-lg shadow-teal-600/20 active:scale-[0.99] transition-all touch-target disabled:opacity-75 overflow-hidden group"
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white border border-white/25">
                    {isLocating ? (
                      <Loader2 className="h-5 w-5 animate-spin notranslate" />
                    ) : (
                      <Crosshair className="h-5 w-5 animate-pulse notranslate" />
                    )}
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs sm:text-sm font-black tracking-tight truncate flex items-center gap-1.5">
                      <span>
                        {isLocating
                          ? 'Acquiring GPS Signal...'
                          : userCoords.isLive
                          ? 'Update Live GPS Position'
                          : 'Detect My Current Location'}
                      </span>
                      {userCoords.isLive && (
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-ping" />
                      )}
                    </div>
                    <div className="text-[11px] text-white/80 truncate">
                      {isLocating
                        ? 'Locking satellite coordinates...'
                        : userCoords.isLive
                        ? `Tracking active · Accuracy ${accuracy ? `±${accuracy}m` : 'high'}`
                        : 'One-tap auto-detection via device sensor'}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 flex items-center">
                  <span className="text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg backdrop-blur-xs border border-white/20 transition-colors">
                    {isLocating ? 'Locating...' : 'One-Tap'}
                  </span>
                </div>
              </button>

              {/* Home Area Quick Switch Option */}
              {profileHomeArea && (
                <div className="mt-2 flex items-center justify-between p-2.5 rounded-2xl border border-primary/25 bg-primary/5 hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <Home className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
                    <span className="text-xs font-bold text-foreground truncate">
                      Home Area: <span className="text-primary font-extrabold">{profileHomeArea}</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseHomeArea}
                    className="text-[11px] font-bold text-primary hover:underline shrink-0 touch-target"
                  >
                    Switch
                  </button>
                </div>
              )}
            </div>

            {/* Permission Denied Explanatory Guide Banner */}
            {permissionStatus === 'denied' && (
              <div className="mb-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-900 dark:text-amber-200 shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 notranslate" />
                    <span className="text-xs font-bold">Browser Location is Blocked</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPermissionGuide(!showPermissionGuide)}
                    className="text-[11px] font-semibold text-primary underline hover:text-primary/80 inline-flex items-center gap-0.5"
                  >
                    <span>{showPermissionGuide ? 'Hide steps' : 'How to unblock'}</span>
                    {showPermissionGuide ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </div>
                {showPermissionGuide && (
                  <div className="mt-2.5 pt-2 border-t border-amber-500/20 text-[11px] space-y-1.5 leading-relaxed text-muted-foreground">
                    <p>
                      <strong>Chrome / Edge:</strong> Tap the lock or tune icon in the address bar &rarr; Permissions &rarr; Location &rarr; Allow, then refresh.
                    </p>
                    <p>
                      <strong>Safari (iOS):</strong> Tap &lsquo;aA&rsquo; in the address bar &rarr; Website Settings &rarr; Location &rarr; Allow.
                    </p>
                    <p>
                      <strong>Android:</strong> Tap browser settings &rarr; Site Settings &rarr; Location &rarr; Allow KindLink.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Fast Address Search Form with Centered Icon & Instant Clear */}
            <div className="relative flex items-center pb-2 shrink-0">
              <div className="absolute left-3.5 flex items-center justify-center pointer-events-none text-muted-foreground">
                <Search className="h-4 w-4 notranslate" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, landmark or city..."
                className="w-full h-12 pl-10 pr-10 rounded-2xl border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all shadow-xs"
              />
              {isSearching ? (
                <div className="absolute right-3.5 flex items-center justify-center pointer-events-none">
                  <Loader2 className="h-4 w-4 animate-spin text-primary notranslate" />
                </div>
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  className="absolute right-3.5 flex items-center justify-center text-muted-foreground hover:text-foreground touch-target"
                  aria-label="Clear search input"
                >
                  <X className="h-4 w-4 notranslate" />
                </button>
              ) : null}
            </div>

            {/* Scrollable Content Body with overscroll-contain */}
            <div className="flex-1 overflow-y-auto overscroll-contain space-y-4 pr-1 my-1 pb-4">
              {/* Active Search Mode */}
              {searchQuery.trim().length >= 2 ? (
                <div className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                    Search Results ({searchResults.length})
                  </div>

                  {searchError && (
                    <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{searchError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => triggerSearch(searchQuery)}
                        className="px-2.5 py-1 rounded-lg bg-destructive text-white text-[11px] font-bold shrink-0"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {searchResults.map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(res)}
                      className="flex w-full items-center justify-between p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/70 hover:border-primary/40 text-left transition-all touch-target shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <MapPin className="h-4 w-4 notranslate" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-bold truncate text-foreground">
                            {res.shortLabel}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {res.displayName}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-semibold text-primary shrink-0">
                        Select
                      </span>
                    </button>
                  ))}

                  {searchResults.length === 0 && !isSearching && !searchError && (
                    <div className="text-center py-6 px-4 rounded-2xl bg-muted/30 border border-border/80">
                      <p className="text-xs text-muted-foreground mb-3">
                        No matches found online for &ldquo;{searchQuery}&rdquo;.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLocation(userCoords, searchQuery.trim());
                          recordRecentPlace(searchQuery.trim(), userCoords.lat, userCoords.lng, 'Manual Area Label');
                          toast.success(`Location label set to "${searchQuery.trim()}"`);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold shadow-sm"
                      >
                        Use &ldquo;{searchQuery.trim()}&rdquo; as area name
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty Search: Saved Places Cards, Recent Places, Nearby Places, Fallback Cities */
                <div className="space-y-4">
                  {/* 1. Saved Places Cards (Instant 1-Tap Switching) */}
                  {savedPlaces.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Bookmark className="h-3.5 w-3.5 text-primary notranslate" />
                          <span>Saved Places</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab('saved')}
                          className="text-[10px] text-primary hover:underline font-bold"
                        >
                          Manage ({savedPlaces.length})
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {savedPlaces.slice(0, 6).map((place) => (
                          <button
                            key={`search-saved-${place.id}`}
                            type="button"
                            onClick={() => handleSelectSavedPlace(place)}
                            className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/70 bg-card hover:bg-muted/70 hover:border-primary/40 text-left transition-all touch-target shadow-xs group"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                              {getSavedPlaceIcon(place.type)}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-foreground truncate">
                                {place.name}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {place.label}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. Recent Places (from localStorage) */}
                  {recentPlaces.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground notranslate" />
                          <span>Recent places</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleClearRecent}
                          className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {recentPlaces.map((rec) => (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => handleSelectRecentPlace(rec)}
                            className="flex items-center justify-between p-2.5 rounded-2xl border border-border/70 bg-card hover:bg-muted/70 text-left transition-all touch-target"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                                <Clock className="h-3.5 w-3.5 notranslate" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">
                                  {rec.name}
                                </div>
                                {rec.label && (
                                  <div className="text-[10px] text-muted-foreground truncate">
                                    {rec.label}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] font-semibold text-primary shrink-0">
                              Select
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Live Nearby Places (queried dynamically for current coordinates) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500 notranslate" />
                        <span>Nearby Places &amp; Landmarks</span>
                      </span>
                      {isLoadingNearby && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin notranslate" />
                          <span>Searching...</span>
                        </span>
                      )}
                    </div>

                    {/* Skeleton Loader */}
                    {isLoadingNearby && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[1, 2, 3, 4].map((n) => (
                          <div
                            key={`nb-skel-${n}`}
                            className="flex items-center gap-2.5 p-2.5 rounded-2xl border border-border/60 bg-muted/30 animate-pulse"
                          >
                            <div className="h-7 w-7 rounded-lg bg-muted-foreground/15 shrink-0" />
                            <div className="flex-1 space-y-1.5 min-w-0">
                              <div className="h-3 w-3/4 rounded bg-muted-foreground/15" />
                              <div className="h-2.5 w-1/2 rounded bg-muted-foreground/10" />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Empty State */}
                    {!isLoadingNearby && nearbyPlaces.length === 0 && (
                      <div className="text-center py-4 px-3 rounded-2xl bg-muted/20 border border-dashed border-border/80">
                        <MapPin className="h-5 w-5 text-muted-foreground/40 mx-auto mb-1.5 notranslate" />
                        <p className="text-xs font-semibold text-foreground">No places discovered around this area yet</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Try searching for an address or expanding your search radius below.
                        </p>
                      </div>
                    )}

                    {/* Dynamic Nearby Places List */}
                    {!isLoadingNearby && nearbyPlaces.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {nearbyPlaces.map((nb) => (
                          <button
                            key={nb.id}
                            type="button"
                            onClick={() => handleSelectNearbyPlace(nb)}
                            className="flex items-center justify-between p-2.5 rounded-2xl border border-border/70 bg-card hover:bg-muted/70 text-left transition-all touch-target"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {getNearbyPlaceIcon(nb.category)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">
                                  {nb.name}
                                </div>
                                <div className="text-[10px] text-muted-foreground truncate">
                                  {nb.address || nb.category}
                                </div>
                              </div>
                            </div>
                            {typeof nb.distanceMeters === 'number' && (
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                                {nb.distanceMeters >= 1000
                                  ? `${(nb.distanceMeters / 1000).toFixed(1)} km`
                                  : `${Math.round(nb.distanceMeters)} m`}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4. Major Cities & Hubs */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                      Major Cities &amp; Hubs
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {FALLBACK_CITIES.map((city) => {
                        const isCurrent = userAreaName.toLowerCase().includes(city.name.toLowerCase());
                        return (
                          <button
                            key={city.id}
                            type="button"
                            onClick={() => handleSelectCity(city)}
                            className={`flex flex-col p-2.5 rounded-2xl border text-left transition-all touch-target ${
                              isCurrent
                                ? 'border-primary bg-primary/10 text-foreground ring-1 ring-primary/30'
                                : 'border-border/80 bg-card hover:bg-muted/70 text-foreground'
                            }`}
                          >
                            <span className="text-xs font-bold truncate flex items-center justify-between">
                              <span>{city.name}</span>
                              {isCurrent && <Check className="h-3 w-3 text-primary shrink-0" />}
                            </span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {city.state}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Pin Map Mode */}
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-5 pt-3">
            <div className="relative flex-1 min-h-[220px] rounded-2xl overflow-hidden border border-border/80 shadow-inner">
              <PinDropMap
                lat={pinLat}
                lng={pinLng}
                onPositionChange={handlePinMoved}
                className="h-full w-full"
              />

              {/* Reverse Geocoding Status Chip */}
              <div className="absolute top-2 left-2 right-2 z-10 pointer-events-none">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border/80 shadow-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-3.5 w-3.5 notranslate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate text-foreground flex items-center gap-1.5">
                      {isGeocodingPin ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
                          <span>Identifying area...</span>
                        </>
                      ) : (
                        <span>{pinAreaName}</span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono truncate">
                      {pinLat.toFixed(4)}°N, {pinLng.toFixed(4)}°E
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirm Pin Button */}
            <div className="pt-3 shrink-0">
              <button
                type="button"
                onClick={handleConfirmPinLocation}
                disabled={isGeocodingPin}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-teal-600/30 transition-all min-h-[44px] touch-target active:scale-[0.98] disabled:opacity-60"
              >
                <Check className="h-4 w-4 notranslate" />
                <span className="truncate">Use this location: {pinAreaName}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Saved Places Mode */}
        {activeTab === 'saved' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-5 pt-3">
            {/* Add Saved Place Trigger or Form */}
            {!showAddSavedPlace ? (
              <div className="pb-3 shrink-0 flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={savedPlaces.length >= 10}
                  onClick={() => {
                    setNewPlaceName(userAreaName);
                    setNewPlaceType('home');
                    setShowAddSavedPlace(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-2xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs transition-colors min-h-[44px] touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-4 w-4 notranslate" />
                  <span>
                    {savedPlaces.length >= 10
                      ? 'Limit reached (10/10 saved places)'
                      : `Save current area (${userAreaName})`}
                  </span>
                </button>
              </div>
            ) : (
              <form
                onSubmit={handleSavePlace}
                className="p-3 mb-3 rounded-2xl bg-muted/40 border border-border/80 shrink-0 space-y-2.5 animate-in fade-in duration-150"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {editingPlaceId ? 'Rename Saved Place' : 'Save New Place (up to 10)'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSavedPlace(false);
                      setEditingPlaceId(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground touch-target"
                  >
                    Cancel
                  </button>
                </div>

                <input
                  type="text"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  placeholder="e.g. Home, Work, Clinic, Campus"
                  maxLength={60}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[38px]"
                  required
                />

                {/* Quick label chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {(['home', 'work', 'clinic', 'campus', 'custom'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewPlaceType(t)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition-all shrink-0 ${
                        newPlaceType === t
                          ? 'bg-primary text-primary-foreground shadow-xs'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors min-h-[38px] touch-target"
                  >
                    {editingPlaceId ? 'Update Place' : 'Save Place'}
                  </button>
                </div>
              </form>
            )}

            {/* List of Saved Places with overscroll-contain */}
            <div className="flex-1 overflow-y-auto overscroll-contain space-y-2 pr-1 my-1 pb-4">
              {savedPlaces.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border/80">
                  <Bookmark className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2 notranslate" />
                  <p className="text-xs font-bold text-foreground">No saved places yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Save your Home, Work, or Clinic for fast 1-tap switching.
                  </p>
                </div>
              ) : (
                savedPlaces.map((place) => (
                  <div
                    key={place.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-card hover:bg-muted/70 transition-all shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectSavedPlace(place)}
                      className="flex items-center gap-3 min-w-0 pr-2 text-left flex-1 touch-target"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {getSavedPlaceIcon(place.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-bold truncate text-foreground">
                          {place.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {place.label}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlaceId(place.id);
                          setNewPlaceName(place.name);
                          setNewPlaceType(place.type || 'custom');
                          setShowAddSavedPlace(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted touch-target"
                        aria-label={`Rename ${place.name}`}
                        title="Rename"
                      >
                        <Edit2 className="h-3.5 w-3.5 notranslate" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSavedPlace(place.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 touch-target"
                        aria-label={`Delete ${place.name}`}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 notranslate" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Search Radius Slider with Snap Points (1, 2, 5, 10, 25, 50 km) */}
        <div className="px-4 sm:px-5 pt-3.5 pb-3 border-t border-border/80 bg-card text-card-foreground shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-foreground">
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary notranslate" />
              <span>Search radius:</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-black text-xs border border-primary/20">
              {filterRadius} km
            </span>
          </div>

          {/* Stepped slider snapping directly to: 1, 2, 5, 10, 25, 50 km */}
          <input
            type="range"
            min={0}
            max={SNAP_RADII.length - 1}
            step={1}
            value={currentSnapIndex}
            onChange={handleRadiusSliderChange}
            className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
            aria-label="Search radius snap slider"
          />

          {/* Snap point buttons */}
          <div className="grid grid-cols-6 gap-1 pt-0.5">
            {SNAP_RADII.map((radius, idx) => {
              const isActive = idx === currentSnapIndex;
              return (
                <button
                  key={`snap-radius-${radius}`}
                  type="button"
                  onClick={() => {
                    setFilterRadius(radius);
                    if (typeof window !== 'undefined') {
                      try {
                        localStorage.setItem('kindlink_filter_radius', String(radius));
                        fetch('/api/auth/profile', {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            notification_preferences: { nearby_radius_km: radius },
                          }),
                        }).catch(() => {});
                      } catch {
                        // ignore
                      }
                    }
                  }}
                  className={`py-1 text-center rounded-lg text-[11px] font-bold transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                      : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {radius}k
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky Footer: Solid bg-card surface, microcopy & close button, safe-area-inset-bottom */}
        <div className="p-3.5 sm:p-4 border-t border-border/80 bg-card text-card-foreground shrink-0 flex items-center justify-between gap-3 text-xs pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
            <Navigation className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
            <span className="truncate">Updates your feed, map and distances.</span>
          </span>

          <button
            type="button"
            onClick={onClose}
            disabled={isLocating}
            className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-bold hover:bg-secondary/80 transition-colors shadow-xs touch-target ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(modalTree, document.body) : null;
}
