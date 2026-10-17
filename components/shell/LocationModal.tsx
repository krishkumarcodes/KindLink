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
  RefreshCw,
  Loader2,
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
      // Search home area to resolve coordinates
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

  // Live GPS locate action
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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLocating) onClose();
      }}
    >
      <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-card/98 dark:bg-slate-950/98 border-t sm:border border-border/80 shadow-[0_20px_60px_rgba(0,0,0,0.35)] text-card-foreground flex flex-col max-h-[90vh] sm:max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Sticky Header: "Your location" and current area name */}
        <div className="p-4 sm:p-5 pb-3 sm:pb-3.5 border-b border-border/80 bg-card/90 dark:bg-slate-950/90 shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <MapPin className="h-5 w-5 notranslate" />
              </div>
              <div className="min-w-0">
                <h2
                  id="location-dialog-title"
                  className="text-base sm:text-lg font-black text-foreground truncate"
                >
                  Your location
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                  <span className="truncate">
                    Current: <strong className="text-primary font-bold">{userAreaName}</strong>
                  </span>
                  {userCoords.isLive && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      GPS {accuracy ? `±${accuracy}m` : 'Live'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLocating}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target transition-colors"
              aria-label="Close location selector"
            >
              <X className="h-5 w-5 notranslate" />
            </button>
          </div>

          {/* Segmented Control: "Search", "Drop pin", "Saved" - Single row guaranteed at 360px */}
          <div className="grid grid-cols-3 gap-1 p-1 mt-3 bg-muted/60 dark:bg-slate-900/60 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('search')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all min-w-0 truncate touch-target ${
                activeTab === 'search'
                  ? 'bg-card dark:bg-slate-800 text-foreground shadow-xs ring-1 ring-border/50'
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
                  ? 'bg-card dark:bg-slate-800 text-foreground shadow-xs ring-1 ring-border/50'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Compass className="h-3.5 w-3.5 shrink-0 notranslate" />
              <span className="truncate">Drop pin</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('saved')}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all min-w-0 truncate touch-target ${
                activeTab === 'saved'
                  ? 'bg-card dark:bg-slate-800 text-foreground shadow-xs ring-1 ring-border/50'
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

        {/* TAB 1: Search & Live Location */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden p-4 sm:p-5 pt-3">
            {/* Top Action Row: "Use my live location" and "Use my home area" */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3 shrink-0">
              {/* Use my live location */}
              <button
                type="button"
                onClick={handleGpsLocate}
                disabled={isLocating}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/25 active:scale-[0.98] transition-all min-h-[44px] touch-target disabled:opacity-60"
              >
                {isLocating ? (
                  <Loader2 className="h-4 w-4 animate-spin notranslate" />
                ) : (
                  <Crosshair className="h-4 w-4 shrink-0 notranslate" />
                )}
                <span className="truncate">
                  {isLocating
                    ? 'Acquiring GPS...'
                    : userCoords.isLive
                    ? `Update live location (${accuracy ? `±${accuracy}m` : 'Active'})`
                    : 'Use my live location'}
                </span>
              </button>

              {/* Use my home area (reads from profile) */}
              {profileHomeArea ? (
                <button
                  type="button"
                  onClick={handleUseHomeArea}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-bold text-xs sm:text-sm transition-all min-h-[44px] touch-target active:scale-[0.98] truncate"
                  title={`Use home area: ${profileHomeArea}`}
                >
                  <Home className="h-4 w-4 text-primary shrink-0 notranslate" />
                  <span className="truncate">Use my home area ({profileHomeArea})</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border border-dashed border-border/80 bg-muted/30 text-muted-foreground font-medium text-xs sm:text-sm min-h-[44px] cursor-not-allowed opacity-75"
                  title="Configure your home area in Profile Settings"
                >
                  <Home className="h-4 w-4 text-muted-foreground shrink-0 notranslate" />
                  <span className="truncate">Use home area (Not set in profile)</span>
                </button>
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

            {/* Address Search Form */}
            <div className="relative pb-2 shrink-0">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground notranslate pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area, landmark or city"
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[44px] transition-all shadow-inner"
              />
              {isSearching ? (
                <div className="absolute right-3.5 top-3.5 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin notranslate" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchError(null);
                  }}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground touch-target"
                  aria-label="Clear search input"
                >
                  <X className="h-4 w-4 notranslate" />
                </button>
              ) : null}
            </div>

            {/* Search Results OR (Recent Places + Nearby Places + Fallback Cities) */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 my-1">
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
                      className="flex w-full items-center justify-between p-3 rounded-2xl border border-border/80 bg-card/70 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-primary/40 text-left transition-all touch-target"
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
                    <div className="text-center py-6 px-4 rounded-2xl bg-muted/40 border border-border/80">
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
                /* Empty Search Query: Show Recent Places, Nearby Places, and Fallback Cities */
                <div className="space-y-4">
                  {/* 1. Recent Places (from localStorage) */}
                  {recentPlaces.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Recent places
                        </span>
                        <button
                          type="button"
                          onClick={handleClearRecent}
                          className="text-[10px] text-muted-foreground hover:text-foreground font-semibold"
                        >
                          Clear
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5">
                        {recentPlaces.map((rec) => (
                          <button
                            key={rec.id}
                            type="button"
                            onClick={() => handleSelectRecentPlace(rec)}
                            className="flex items-center justify-between p-2.5 rounded-2xl border border-border/70 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 text-left transition-all touch-target"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
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

                  {/* 2. Nearby Places (from existing places service for current coordinates) */}
                  {nearbyPlaces.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Nearby Places &amp; Landmarks
                        </span>
                        {isLoadingNearby && (
                          <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {nearbyPlaces.map((nb) => (
                          <button
                            key={nb.id}
                            type="button"
                            onClick={() => handleSelectNearbyPlace(nb)}
                            className="flex items-center justify-between p-2.5 rounded-2xl border border-border/70 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 text-left transition-all touch-target"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                {nb.category.includes('health') || nb.category.includes('hospital') ? (
                                  <Stethoscope className="h-3.5 w-3.5 notranslate" />
                                ) : (
                                  <Building2 className="h-3.5 w-3.5 notranslate" />
                                )}
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
                    </div>
                  )}

                  {/* 3. Fallback City List: Kolkata, Asansol, Durgapur, Dhanbad, Ranchi, Patna, Delhi, Mumbai */}
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
                                : 'border-border/80 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 text-foreground'
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

        {/* TAB 2: Drop Pin */}
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
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 shadow-md">
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

            {/* Confirm Pin Button ("Use this location") */}
            <div className="pt-3 shrink-0">
              <button
                type="button"
                onClick={handleConfirmPinLocation}
                disabled={isGeocodingPin}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-teal-600/30 transition-all min-h-[44px] touch-target active:scale-[0.98] disabled:opacity-60"
              >
                <Check className="h-4 w-4 notranslate" />
                <span className="truncate">Use this location: {pinAreaName}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Saved Places (Local & Database Sync) */}
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

            {/* List of Saved Places (Synchronized with localStorage & DB) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
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
                    className="flex items-center justify-between p-3 rounded-2xl border border-border/80 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 transition-all"
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

        {/* Search Radius Slider (Snap Values: 1, 2, 5, 10, 25, 50 km) */}
        <div className="px-4 sm:px-5 pt-3 pb-2.5 border-t border-border/80 bg-card/60 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold text-foreground mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary notranslate" />
              <span>Search radius:</span>
            </span>
            <span className="font-extrabold text-primary text-sm">{filterRadius} km</span>
          </div>

          {/* Stepped slider snapping directly to: 1, 2, 5, 10, 25, 50 km */}
          <input
            type="range"
            min={0}
            max={SNAP_RADII.length - 1}
            step={1}
            value={currentSnapIndex}
            onChange={handleRadiusSliderChange}
            className="w-full accent-primary h-2 bg-muted dark:bg-slate-800 rounded-lg cursor-pointer"
            aria-label="Search radius snap slider"
          />

          {/* Simple Labels: 1 km (Nearby), 25 km (City), 50 km (Wide) */}
          <div className="flex justify-between text-[10px] text-muted-foreground font-medium mt-1">
            <span>1 km (Nearby)</span>
            <span>25 km (City)</span>
            <span>50 km (Wide)</span>
          </div>
        </div>

        {/* Sticky Footer: "Updates your feed, map and distances." & Close button */}
        <div className="p-3 sm:p-4 border-t border-border/80 bg-card/90 dark:bg-slate-950/90 shrink-0 flex items-center justify-between gap-3 text-xs">
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
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalTree, document.body) : null;
}
