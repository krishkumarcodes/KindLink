'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Crosshair,
  RotateCcw,
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
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from '@/lib/location/LocationProvider';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { LocationSearchResult } from '@/lib/location/types';
import { searchAddressNominatim, SUGGESTED_AREAS } from '@/lib/location/search';
import { reverseGeocode } from '@/lib/geo/reverse-geocode';
import { PinDropMap } from '@/components/location/PinDropMap';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';

interface LocationModalProps {
  open: boolean;
  onClose: () => void;
}

type ModalTab = 'search' | 'map' | 'saved';

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
    resetToDefaultHub,
    savePlace,
    updateSavedPlace,
    removeSavedPlace,
  } = useLocation();

  const { filterRadius, setFilterRadius } = useKindLinkStore();

  const [activeTab, setActiveTab] = useState<ModalTab>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPermissionGuide, setShowPermissionGuide] = useState(false);

  // Pin drop state
  const [pinLat, setPinLat] = useState<number>(userCoords.lat || ASANSOL_CENTER.lat);
  const [pinLng, setPinLng] = useState<number>(userCoords.lng || ASANSOL_CENTER.lng);
  const [pinAreaName, setPinAreaName] = useState<string>(userAreaName || 'Asansol Region');
  const [isGeocodingPin, setIsGeocodingPin] = useState(false);

  // Saved place management
  const [showAddSavedPlace, setShowAddSavedPlace] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState<string | null>(null);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<'home' | 'work' | 'campus' | 'custom'>('home');

  const searchAbortRef = useRef<AbortController | null>(null);
  const pinGeocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync pin coordinates with current location when opening modal
  useEffect(() => {
    if (open) {
      setPinLat(userCoords.lat || ASANSOL_CENTER.lat);
      setPinLng(userCoords.lng || ASANSOL_CENTER.lng);
      setPinAreaName(userAreaName || 'Asansol Region');
    }
  }, [open, userCoords.lat, userCoords.lng, userAreaName]);

  // Debounced Nominatim address search with caching
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }

    const abortController = new AbortController();
    searchAbortRef.current = abortController;
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchAddressNominatim(trimmed, abortController.signal);
        setSearchResults(results);
      } catch (err: unknown) {
        if ((err as Error)?.name !== 'AbortError') {
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchQuery]);

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

  // Confirm pin location
  const handleConfirmPinLocation = async () => {
    await setLocation({ lat: pinLat, lng: pinLng, isLive: false }, pinAreaName);
    toast.success(`Location set to ${pinAreaName}!`, {
      description: 'Mutual aid requests and distances updated.',
    });
    onClose();
  };

  // Select a search result
  const handleSelectSearchResult = async (result: LocationSearchResult) => {
    await setLocation({ lat: result.lat, lng: result.lng, isLive: false }, result.shortLabel);
    toast.success(`Location set to ${result.shortLabel}!`);
    setSearchQuery('');
    setSearchResults([]);
    onClose();
  };

  // Select a saved place
  const handleSelectSavedPlace = async (place: { lat: number; lng: number; name: string }) => {
    await setLocation({ lat: place.lat, lng: place.lng, isLive: false }, place.name);
    toast.success(`Location set to ${place.name}!`);
    onClose();
  };

  // Save or rename a place
  const handleSavePlace = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaceName.trim() || userAreaName;

    if (editingPlaceId) {
      updateSavedPlace(editingPlaceId, { name, type: newPlaceType });
      setEditingPlaceId(null);
    } else {
      savePlace({
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
      toast.success(`Locked to live GPS: ${result.areaName}`, {
        description: 'Tracking your location in real time.',
      });
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-dialog-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full sm:max-w-lg rounded-t-[32px] sm:rounded-3xl bg-card dark:bg-slate-950 border-t sm:border border-border/80 dark:border-slate-800/80 p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.4)] text-card-foreground max-h-[88vh] sm:max-h-[92vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
        {/* Mobile Drag Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-3 shrink-0" />

        {/* Sticky Header with Title and Current Area */}
        <div className="flex items-center justify-between pb-3 border-b border-border/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <MapPin className="h-5 w-5 notranslate" />
            </div>
            <div className="min-w-0">
              <h2
                id="location-dialog-title"
                className="text-base sm:text-lg font-bold text-foreground truncate"
              >
                Your location
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <span className="truncate">
                  Current: <strong className="text-primary font-semibold">{userAreaName}</strong>
                </span>
                {userCoords.isLive && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
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
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target transition-colors"
            aria-label="Close location selector"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Tab Navigation - Single Line Guaranteed with Perfect Horizontal Alignment */}
        <div className="grid grid-cols-3 gap-1 p-1 my-3 bg-muted/60 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="h-3.5 w-3.5 shrink-0 notranslate" />
            <span>Search</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="h-3.5 w-3.5 shrink-0 notranslate" />
            <span>Drop pin</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === 'saved'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5 shrink-0 notranslate" />
            <span>Saved {savedPlaces.length > 0 ? `(${savedPlaces.length})` : ''}</span>
          </button>
        </div>

        {/* TAB 1: Search */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Live GPS & Default Area Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3 shrink-0">
              <button
                type="button"
                onClick={handleGpsLocate}
                disabled={isLocating}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-600/25 active:scale-[0.98] transition-all min-h-[44px] touch-target disabled:opacity-60"
              >
                {isLocating ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin notranslate" />
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

              <button
                type="button"
                onClick={() => {
                  resetToDefaultHub();
                  toast.success('Location set to default area (Kalyanpur, Asansol)');
                  onClose();
                }}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/80 text-foreground font-semibold text-xs sm:text-sm transition-all min-h-[44px] touch-target active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4 text-primary shrink-0 notranslate" />
                <span>Use default area</span>
              </button>
            </div>

            {/* Permission Denied Friendly Explanation Banner */}
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
                      <strong>Chrome / Edge:</strong> Tap the lock or tune icon in the address
                      bar &rarr; Permissions &rarr; Location &rarr; Allow, then refresh.
                    </p>
                    <p>
                      <strong>Safari (iOS):</strong> Tap &lsquo;aA&rsquo; in the address bar &rarr;
                      Website Settings &rarr; Location &rarr; Allow.
                    </p>
                    <p>
                      <strong>Android:</strong> Tap browser settings &rarr; Site Settings &rarr;
                      Location &rarr; Allow KindLink.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Address Search Form - Short non-truncating placeholder */}
            <div className="relative pb-2 shrink-0">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground notranslate pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search area or address"
                className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-border/80 bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary min-h-[44px] transition-all"
              />
              {isSearching ? (
                <div className="absolute right-3.5 top-3.5 h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin notranslate" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 notranslate" />
                </button>
              ) : null}
            </div>

            {/* Results or Suggested Areas */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {searchQuery.trim().length >= 2 ? (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                    Search Results ({searchResults.length})
                  </div>
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

                  {searchResults.length === 0 && !isSearching && (
                    <div className="text-center py-6 px-4 rounded-2xl bg-muted/40 border border-border/80">
                      <p className="text-xs text-muted-foreground mb-3">
                        No matches found online for &ldquo;{searchQuery}&rdquo;.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setLocation(userCoords, searchQuery.trim());
                          toast.success(`Location label set to "${searchQuery.trim()}"`);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold shadow-sm"
                      >
                        Use &ldquo;{searchQuery.trim()}&rdquo; as area name
                      </button>
                    </div>
                  )}

                  <div className="text-[10px] text-muted-foreground/70 text-center pt-2">
                    Data &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">OpenStreetMap contributors</a>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                    Suggested Areas
                  </div>
                  {SUGGESTED_AREAS.map((area) => {
                    const isSelected =
                      userAreaName.toLowerCase().includes(area.name.toLowerCase().split(',')[0]);

                    const getAreaIcon = () => {
                      switch (area.type) {
                        case 'campus':
                          return <GraduationCap className="h-4 w-4 notranslate" />;
                        case 'hospital':
                          return <Building2 className="h-4 w-4 notranslate" />;
                        case 'residential':
                          return <Home className="h-4 w-4 notranslate" />;
                        default:
                          return <MapPin className="h-4 w-4 notranslate" />;
                      }
                    };

                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => {
                          setLocation({ lat: area.lat, lng: area.lng, isLive: false }, area.name);
                          toast.success(`Location set to ${area.name}!`);
                          onClose();
                        }}
                        className={`flex w-full items-center justify-between p-3 rounded-2xl border text-left transition-all touch-target ${
                          isSelected
                            ? 'border-primary/60 bg-primary/10 text-foreground ring-1 ring-primary/40'
                            : 'border-border/80 bg-card/60 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-border text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {getAreaIcon()}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold truncate">
                              {area.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {area.label}
                            </div>
                          </div>
                        </div>
                        {isSelected ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-primary shrink-0">
                            <Check className="h-3.5 w-3.5 notranslate" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                            Select
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Drop Pin */}
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="relative flex-1 min-h-[220px] rounded-2xl overflow-hidden border border-border/80">
              <PinDropMap
                lat={pinLat}
                lng={pinLng}
                onPositionChange={handlePinMoved}
                className="h-full w-full"
              />

              {/* Reverse Geocoding Status Chip */}
              <div className="absolute top-2 left-2 right-2 z-10">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 shadow-md">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MapPin className="h-3.5 w-3.5 notranslate" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold truncate text-foreground">
                      {isGeocodingPin ? 'Identifying area...' : pinAreaName}
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
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-sm shadow-md shadow-teal-600/30 transition-all min-h-[44px] touch-target active:scale-[0.98]"
              >
                <Check className="h-4 w-4 notranslate" />
                <span>Confirm location: {pinAreaName}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Saved Places (Real User Data Only) */}
        {activeTab === 'saved' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Add Saved Place Trigger or Form */}
            {!showAddSavedPlace ? (
              <div className="pb-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddSavedPlace(true)}
                  className="w-full flex items-center justify-center gap-2 p-2.5 rounded-2xl border border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs transition-colors min-h-[44px] touch-target"
                >
                  <Plus className="h-4 w-4 notranslate" />
                  <span>Save current area ({userAreaName})</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleSavePlace} className="p-3 mb-3 rounded-2xl bg-muted/40 border border-border/80 shrink-0 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">
                    {editingPlaceId ? 'Rename Saved Place' : 'Save New Place'}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddSavedPlace(false);
                      setEditingPlaceId(null);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  value={newPlaceName}
                  onChange={(e) => setNewPlaceName(e.target.value)}
                  placeholder="e.g. Home, Office, Hostel"
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[38px]"
                  required
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newPlaceType}
                    onChange={(e) => setNewPlaceType(e.target.value as 'home' | 'work' | 'campus' | 'custom')}
                    className="flex-1 px-3 py-1.5 rounded-xl border border-border bg-background text-xs text-foreground min-h-[36px]"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work</option>
                    <option value="campus">Campus</option>
                    <option value="custom">Other</option>
                  </select>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors min-h-[36px]"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}

            {/* List of Saved Places (Strictly Real Data) */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-1">
              {savedPlaces.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl bg-muted/20 border border-dashed border-border/80">
                  <Bookmark className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2 notranslate" />
                  <p className="text-xs font-semibold text-foreground">No saved places yet</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Save your Home, Work, or Hostel for fast 1-tap switching.
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
                      className="flex items-center gap-3 min-w-0 pr-2 text-left flex-1"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {place.type === 'home' ? (
                          <Home className="h-4 w-4 notranslate" />
                        ) : place.type === 'work' ? (
                          <Briefcase className="h-4 w-4 notranslate" />
                        ) : place.type === 'campus' ? (
                          <GraduationCap className="h-4 w-4 notranslate" />
                        ) : (
                          <Bookmark className="h-4 w-4 notranslate" />
                        )}
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
                          setNewPlaceType(place.type);
                          setShowAddSavedPlace(true);
                        }}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                        aria-label={`Rename ${place.name}`}
                        title="Rename"
                      >
                        <Edit2 className="h-3.5 w-3.5 notranslate" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSavedPlace(place.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
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

        {/* Search Radius Slider (1 to 50 km) */}
        <div className="pt-3 pb-2 border-t border-border/80 shrink-0">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-primary notranslate" />
              <span>Search radius:</span>
            </span>
            <span className="font-bold text-primary">{filterRadius} km</span>
          </div>
          <input
            type="range"
            min={1}
            max={50}
            step={1}
            value={filterRadius}
            onChange={(e) => setFilterRadius(Number(e.target.value))}
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
            aria-label="Mutual aid search radius slider"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
            <span>1 km (Hyperlocal)</span>
            <span>25 km (City)</span>
            <span>50 km (Regional)</span>
          </div>
        </div>

        {/* Sticky Footer Info & Close Action */}
        <div className="pt-2.5 border-t border-border/80 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1 text-[11px] truncate">
            <Navigation className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
            <span className="truncate">Updates feed, radar &amp; distances live</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors shadow-xs touch-target"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
