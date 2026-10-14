'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Crosshair,
  RotateCcw,
  Search,
  Check,
  X,
  Building2,
  Navigation,
  Compass,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Bookmark,
  Plus,
  Trash2,
  Home,
  Briefcase,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from '@/lib/location/LocationProvider';
import { LocationSearchResult } from '@/lib/location/types';
import { searchAddressNominatim } from '@/lib/location/search';
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
    isWatching,
    savedPlaces,
    requestLiveLocation,
    setLocation,
    resetToDefaultHub,
    savePlace,
    removeSavedPlace,
  } = useLocation();

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

  // Add saved place state
  const [showAddSavedPlace, setShowAddSavedPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceType, setNewPlaceType] = useState<'home' | 'work' | 'campus' | 'custom'>('home');

  const searchAbortRef = useRef<AbortController | null>(null);
  const pinGeocodeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep pin coordinates in sync with current location when opening modal
  useEffect(() => {
    if (open) {
      setPinLat(userCoords.lat || ASANSOL_CENTER.lat);
      setPinLng(userCoords.lng || ASANSOL_CENTER.lng);
      setPinAreaName(userAreaName || 'Asansol Region');
    }
  }, [open, userCoords.lat, userCoords.lng, userAreaName]);

  // Debounced Nominatim address search
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
    }, 320);

    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [searchQuery]);

  // Reverse geocode when pin moves
  const handlePinPositionChange = (lat: number, lng: number) => {
    const fixedLat = Number(lat.toFixed(5));
    const fixedLng = Number(lng.toFixed(5));
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
    }, 400);
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

  // Save current location as a place
  const handleSaveCurrentPlace = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPlaceName.trim() || userAreaName;
    savePlace({
      name,
      label: userAreaName,
      lat: userCoords.lat,
      lng: userCoords.lng,
      type: newPlaceType,
    });
    setNewPlaceName('');
    setShowAddSavedPlace(false);
  };

  // Live GPS locate action
  const handleGpsLocate = async () => {
    const result = await requestLiveLocation();
    if (result) {
      toast.success(`Locked to live GPS: ${result.areaName}`, {
        description: 'Now tracking your location in real time.',
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-3xl bg-card/95 dark:bg-slate-950/95 border border-border/80 dark:border-slate-800/80 p-4 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.3)] text-card-foreground max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-border/80 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
              <MapPin className="h-5 w-5 notranslate" />
            </div>
            <div className="min-w-0">
              <h2
                id="location-dialog-title"
                className="text-base sm:text-lg font-bold text-foreground truncate"
              >
                Change Area &amp; Location
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
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted touch-target transition-colors"
            aria-label="Close location selector"
          >
            <X className="h-5 w-5 notranslate" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 gap-1 p-1 my-3 bg-muted/60 rounded-2xl shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'search'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="h-3.5 w-3.5 notranslate" />
            <span>Search &amp; GPS</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('map')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'map'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Compass className="h-3.5 w-3.5 notranslate" />
            <span>Drop Pin</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('saved')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'saved'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bookmark className="h-3.5 w-3.5 notranslate" />
            <span>Saved ({savedPlaces.length})</span>
          </button>
        </div>

        {/* TAB 1: Search & GPS */}
        {activeTab === 'search' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* GPS Quick Action Row */}
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
                <span>
                  {isLocating
                    ? 'Acquiring GPS...'
                    : userCoords.isLive
                    ? `Update GPS (${accuracy ? `±${accuracy}m` : 'Active'})`
                    : 'Use My Live GPS'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetToDefaultHub();
                  toast.success('Reset to Asansol Engineering College Hub');
                  onClose();
                }}
                className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-2xl border border-border/80 bg-background/80 hover:bg-muted/80 text-foreground font-semibold text-xs sm:text-sm transition-all min-h-[44px] touch-target active:scale-[0.98]"
              >
                <RotateCcw className="h-4 w-4 text-primary shrink-0 notranslate" />
                <span>Reset to AEC Hub</span>
              </button>
            </div>

            {/* Permission Denied Assistance Banner */}
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

            {/* Address Search Form */}
            <div className="relative pb-2 shrink-0">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground notranslate pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search address, neighborhood or landmark..."
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

            {/* Results or Neighborhood Presets List */}
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
                </>
              ) : (
                <>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1 pb-1">
                    Popular Asansol Neighborhoods &amp; Hubs
                  </div>
                  {savedPlaces.map((place) => {
                    const isSelected =
                      userAreaName === place.name ||
                      (Math.abs(userCoords.lat - place.lat) < 0.002 &&
                        Math.abs(userCoords.lng - place.lng) < 0.002);

                    return (
                      <button
                        key={place.id}
                        type="button"
                        onClick={() => handleSelectSavedPlace(place)}
                        className={`flex w-full items-center justify-between p-3 rounded-2xl border text-left transition-all duration-150 touch-target ${
                          isSelected
                            ? 'border-primary bg-primary/10 dark:bg-teal-500/15 text-foreground font-semibold ring-2 ring-primary/25 shadow-xs'
                            : 'border-border/80 bg-card/70 dark:bg-slate-900/40 hover:bg-muted/70 hover:border-primary/40 text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                              isSelected
                                ? 'bg-gradient-to-tr from-teal-600 to-emerald-500 text-white shadow-sm'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <Building2 className="h-4 w-4 notranslate" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-bold truncate text-foreground">
                              {place.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {place.label}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary shrink-0 notranslate stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Drop Pin on Map */}
        {activeTab === 'map' && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            <div className="shrink-0 flex items-center justify-between px-1">
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Interactive Pin Placement
                </span>
                <span className="text-[11px] text-muted-foreground">
                  Tap anywhere on the map or drag the marker to your precise spot
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  handlePinPositionChange(ASANSOL_CENTER.lat, ASANSOL_CENTER.lng);
                }}
                className="text-[11px] text-primary font-semibold hover:underline"
              >
                Center Asansol
              </button>
            </div>

            {/* Embedded interactive pin map */}
            <div className="flex-1 min-h-[220px]">
              <PinDropMap
                lat={pinLat}
                lng={pinLng}
                onPositionChange={handlePinPositionChange}
                className="h-full w-full min-h-[220px]"
              />
            </div>

            {/* Selected Location Card */}
            <div className="p-3.5 rounded-2xl bg-muted/50 border border-border/80 flex items-center justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-foreground truncate">
                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0 notranslate" />
                  <span className="truncate">{pinAreaName}</span>
                  {isGeocodingPin && (
                    <span className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin notranslate inline-block shrink-0" />
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Lat: {pinLat.toFixed(4)}, Lng: {pinLng.toFixed(4)}
                </div>
              </div>
              <button
                type="button"
                onClick={handleConfirmPinLocation}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 active:scale-95 transition-all shrink-0 touch-target"
              >
                Confirm Location
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: Saved Places */}
        {activeTab === 'saved' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden space-y-3">
            <div className="flex items-center justify-between shrink-0 px-1">
              <div>
                <span className="text-xs font-bold text-foreground block">Preset &amp; Saved Places</span>
                <span className="text-[11px] text-muted-foreground">
                  Quick one-tap shortcuts to your frequent communities
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSavedPlace(!showAddSavedPlace)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition-colors touch-target"
              >
                <Plus className="h-3.5 w-3.5 notranslate" />
                <span>Save Current</span>
              </button>
            </div>

            {/* Add Current Location Form */}
            {showAddSavedPlace && (
              <form
                onSubmit={handleSaveCurrentPlace}
                className="p-3.5 rounded-2xl bg-muted/60 border border-border/80 space-y-3 shrink-0"
              >
                <div className="text-xs font-bold text-foreground">
                  Save &ldquo;{userAreaName}&rdquo; to your places
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={newPlaceName}
                    onChange={(e) => setNewPlaceName(e.target.value)}
                    placeholder="Custom place name (e.g. My Hostel)"
                    className="px-3 py-2 rounded-xl border border-border/80 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <select
                    value={newPlaceType}
                    onChange={(e) =>
                      setNewPlaceType(e.target.value as 'home' | 'work' | 'campus' | 'custom')
                    }
                    className="px-3 py-2 rounded-xl border border-border/80 bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="home">Home</option>
                    <option value="work">Work / Office</option>
                    <option value="campus">Campus / College</option>
                    <option value="custom">Other Custom</option>
                  </select>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddSavedPlace(false)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary/90"
                  >
                    Save Place
                  </button>
                </div>
              </form>
            )}

            {/* Saved Places List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {savedPlaces.map((place) => {
                const isSelected =
                  userAreaName === place.name ||
                  (Math.abs(userCoords.lat - place.lat) < 0.002 &&
                    Math.abs(userCoords.lng - place.lng) < 0.002);

                const getIcon = () => {
                  switch (place.type) {
                    case 'home':
                      return <Home className="h-4 w-4 notranslate" />;
                    case 'work':
                      return <Briefcase className="h-4 w-4 notranslate" />;
                    case 'campus':
                      return <GraduationCap className="h-4 w-4 notranslate" />;
                    default:
                      return <Building2 className="h-4 w-4 notranslate" />;
                  }
                };

                return (
                  <div
                    key={place.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                        : 'border-border/80 bg-card/70 hover:bg-muted/70 hover:border-primary/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectSavedPlace(place)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {getIcon()}
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

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-primary notranslate stroke-[2.5]" />
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSelectSavedPlace(place)}
                          className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold"
                        >
                          Use
                        </button>
                      )}
                      {place.id.startsWith('sp-') &&
                        !['sp-campus', 'sp-hospital', 'sp-ushagram'].includes(place.id) && (
                          <button
                            type="button"
                            onClick={() => removeSavedPlace(place.id)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                            aria-label={`Delete ${place.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5 notranslate" />
                          </button>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer info note */}
        <div className="pt-3 border-t border-border/80 shrink-0 flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5 text-[11px]">
            <Navigation className="h-3.5 w-3.5 text-primary notranslate shrink-0" />
            <span>Hyperlocal radius: 1km &ndash; 25km</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground text-xs font-semibold hover:bg-secondary/80 transition-colors shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
