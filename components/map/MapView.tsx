'use client';

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import {
  Compass,
  Crosshair,
  MapPin,
  Clock,
  AlertTriangle,
  Atom,
  ChevronUp,
  X,
  Layers,
  Sparkles,
  List,
  Plus,
  Minus,
  RotateCcw,
  Search,
  Loader2,
  Hospital,
  ShieldCheck,
  ShieldAlert,
  Move,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpRequest } from '@/lib/data/types';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';
import { searchPlaces, PlaceSearchResult } from '@/lib/geo/search';
import { reverseGeocode } from '@/lib/geo/reverse-geocode';
import { getNearestMedicalFacilities, MedicalFacility } from '@/lib/geo/hospitals';
import { MapLayersState } from './LeafletInnerMap';
import { RequestDetailModal } from '../requests/RequestDetailModal';

// Immediate fallback component with Switch to List View for slow 2G/3G connections
function MapLoadingFallback() {
  const { setCurrentView } = useKindLinkStore();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-card/95 backdrop-blur-md p-6 text-center text-muted-foreground">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-500" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Compass className="h-5 w-5 text-teal-600 dark:text-teal-400 animate-pulse notranslate" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-bold text-foreground block">
            Loading Live Asansol Aid Map...
          </span>
          <p className="text-xs text-muted-foreground">
            PostGIS spatial pins &amp; neighborhood geofencing
          </p>
        </div>

        <div className="mt-2 flex flex-col items-center gap-2 w-full">
          <button
            onClick={() => setCurrentView('requests')}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-teal-900/30 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 touch-target"
          >
            <List className="h-4 w-4 notranslate" />
            <span>Switch to List View (Instant 2G/3G)</span>
          </button>
          <span className="text-[11px] text-muted-foreground">
            View active aid requests immediately without waiting for map tiles
          </span>
        </div>
      </div>
    </div>
  );
}

// Dynamically import Leaflet map with SSR disabled to prevent window is undefined errors
const LeafletInnerMap = dynamic(() => import('./LeafletInnerMap'), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

export function MapView() {
  const {
    requests,
    userCoords,
    userAreaName,
    setUserCoords,
    setUserAreaName,
    selectedRequestId,
    setSelectedRequestId,
    setCurrentView,
  } = useKindLinkStore();

  const [activeRequest, setActiveRequest] = useState<HelpRequest | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
  const [mapCenter, setMapCenter] = useState<[number, number]>([userCoords.lat, userCoords.lng]);
  const [mapZoom, setMapZoom] = useState(13);
  const [layerMenuOpen, setLayerMenuOpen] = useState(false);

  // Address search state (Nominatim debounced)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Draggable Pin Mode state
  const [draggableMode, setDraggableMode] = useState(false);
  const [draggablePos, setDraggablePos] = useState<[number, number]>([
    userCoords.lat,
    userCoords.lng,
  ]);

  // Medical facilities and layers state
  const [medicalFacilities, setMedicalFacilities] = useState<MedicalFacility[]>([]);
  const [layers, setLayers] = useState<MapLayersState>({
    requests: true,
    hospitals: true,
    pharmacies: true,
    bloodBanks: true,
  });

  useEffect(() => {
    setMapCenter([userCoords.lat, userCoords.lng]);
    setDraggablePos([userCoords.lat, userCoords.lng]);
  }, [userCoords.lat, userCoords.lng]);

  // Debounced Place & Address Search (300ms)
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchPlaces(searchQuery);
        setSearchResults(results);
        setSearchDropdownOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setSearchDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch medical amenities within view radius
  useEffect(() => {
    let isMounted = true;
    getNearestMedicalFacilities({
      lat: mapCenter[0],
      lng: mapCenter[1],
      radiusMeters: radiusKm * 1000,
      limit: 30,
    })
      .then((facilities) => {
        if (isMounted) setMedicalFacilities(facilities);
      })
      .catch(() => {
        if (isMounted) setMedicalFacilities([]);
      });

    return () => {
      isMounted = false;
    };
  }, [mapCenter, radiusKm]);

  // Select place from search suggestions
  const handleSelectPlace = async (place: PlaceSearchResult) => {
    setMapCenter([place.lat, place.lng]);
    setMapZoom(15);
    setDraggablePos([place.lat, place.lng]);
    setUserCoords({ lat: place.lat, lng: place.lng, isLive: false }, place.name);
    setSearchDropdownOpen(false);
    setSearchQuery(place.name);
    toast.success(`Location set: ${place.name}`, {
      description: place.displayName,
    });
  };

  // Handle pin repositioning in Draggable Mode
  const handleDraggableChange = async (newPos: [number, number]) => {
    setDraggablePos(newPos);
    setMapCenter(newPos);
    try {
      const geocoded = await reverseGeocode(newPos[0], newPos[1]);
      setUserCoords({ lat: newPos[0], lng: newPos[1], isLive: false }, geocoded.shortLabel);
      toast.info(`Pin updated to ${geocoded.shortLabel}`, {
        description: `${newPos[0].toFixed(4)}° N, ${newPos[1].toFixed(4)}° E`,
      });
    } catch {
      setUserCoords({ lat: newPos[0], lng: newPos[1], isLive: false });
    }
  };

  // Browser Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by this browser', {
        description: 'Defaulting to Asansol Engineering College hub.',
      });
      return;
    }

    toast.info('Acquiring GPS location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isLive: true,
        };
        setMapCenter([newCoords.lat, newCoords.lng]);
        setDraggablePos([newCoords.lat, newCoords.lng]);
        setMapZoom(14);
        try {
          const geo = await reverseGeocode(newCoords.lat, newCoords.lng);
          setUserCoords(newCoords, geo.shortLabel);
          toast.success(`Location updated via GPS: ${geo.shortLabel}`);
        } catch {
          setUserCoords(newCoords);
          toast.success('Location updated via GPS!');
        }
      },
      (err) => {
        toast.warning('GPS permission denied or unavailable', {
          description: 'Centering on Asansol Engineering College (23.6889° N, 86.9661° E).',
        });
        setUserCoords(
          {
            lat: ASANSOL_CENTER.lat,
            lng: ASANSOL_CENTER.lng,
            isLive: false,
          },
          ASANSOL_CENTER.name
        );
        setMapCenter([ASANSOL_CENTER.lat, ASANSOL_CENTER.lng]);
        setDraggablePos([ASANSOL_CENTER.lat, ASANSOL_CENTER.lng]);
      },
      { timeout: 10000 }
    );
  };

  const handleMarkerSelect = (req: HelpRequest) => {
    setActiveRequest(req);
    setSelectedRequestId(req.id);
    setMobileSheetOpen(true);
  };

  // Toggle individual layer
  const toggleLayer = (key: keyof MapLayersState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative flex-1 w-full h-[calc(100dvh-4rem)] overflow-hidden flex flex-col md:flex-row bg-background">
      {/* MAP CANVAS (Takes full area on mobile, flex-1 on desktop) */}
      <div className="relative flex-1 h-full w-full">
        <LeafletInnerMap
          center={mapCenter}
          zoom={mapZoom}
          requests={requests}
          radiusMeters={radiusKm * 1000}
          selectedRequest={activeRequest}
          onSelectRequest={handleMarkerSelect}
          draggableMode={draggableMode}
          draggablePosition={draggablePos}
          onDraggablePositionChange={handleDraggableChange}
          medicalFacilities={medicalFacilities}
          layers={layers}
        />

        {/* Floating Top Header: Radar Status & Action Controls */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
          {/* Left: Volunteer Radar & Neighborhood Badge */}
          <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-card/90 dark:bg-card/80 backdrop-blur-xl px-3 py-2 rounded-2xl border border-border shadow-lg text-xs font-bold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
              </span>
              <Compass className="h-4 w-4 text-primary notranslate" />
              <span className="text-foreground">Asansol Radar</span>
              <span className="text-muted-foreground font-normal">
                ({requests.length} pins)
              </span>
            </div>

            {userAreaName && (
              <div className="hidden lg:flex items-center gap-1.5 bg-card/85 dark:bg-card/75 backdrop-blur-xl px-3 py-2 rounded-2xl border border-border shadow-lg text-xs font-semibold text-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary notranslate" />
                <span className="truncate max-w-[150px]">{userAreaName}</span>
              </div>
            )}
          </div>

          {/* Center: Nominatim Place & Address Search (Debounced 300ms) */}
          <div
            ref={searchContainerRef}
            className="pointer-events-auto relative w-full sm:max-w-xs md:max-w-sm"
          >
            <div className="relative flex items-center bg-card/95 dark:bg-card/90 backdrop-blur-xl rounded-2xl border border-border shadow-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
              <Search className="h-4 w-4 text-muted-foreground shrink-0 notranslate" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setSearchDropdownOpen(true);
                }}
                placeholder="Search area, landmark or street..."
                className="w-full bg-transparent px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {isSearching ? (
                <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin shrink-0 notranslate" />
              ) : searchQuery ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchDropdownOpen(false);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5 notranslate" />
                </button>
              ) : null}
            </div>

            {/* Search Suggestions Dropdown */}
            {searchDropdownOpen && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-card/98 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden z-30 max-h-60 overflow-y-auto animate-in fade-in duration-150">
                <div className="p-1.5 space-y-1">
                  {searchResults.map((item) => (
                    <button
                      key={item.placeId}
                      onClick={() => handleSelectPlace(item)}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-muted/70 transition flex items-start gap-2.5 text-xs group"
                    >
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform notranslate" />
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-foreground block truncate">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {item.displayName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Instant Switch to List View & Map Tools */}
          <div className="pointer-events-auto flex items-center gap-1.5 self-end sm:self-auto">
            {/* Immediate Switch to List View Button */}
            <button
              onClick={() => setCurrentView('requests')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card/90 dark:bg-card/80 hover:bg-card border border-border hover:border-teal-500/40 shadow-lg text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 active:scale-95 touch-target backdrop-blur-xl"
              title="Immediate Switch to List View (Fast 2G/3G)"
            >
              <List className="h-4 w-4 text-primary notranslate" />
              <span>List View</span>
            </button>

            {/* Draggable Pin Mode Toggle */}
            <button
              onClick={() => {
                const nextMode = !draggableMode;
                setDraggableMode(nextMode);
                if (nextMode) {
                  toast.info('Draggable Pin Mode Active', {
                    description: 'Drag the orange pin to set your location coordinates.',
                  });
                } else {
                  toast.success('Location Pin Saved');
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border shadow-lg text-xs font-bold transition-all hover:-translate-y-0.5 active:scale-95 touch-target backdrop-blur-xl ${
                draggableMode
                  ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/25 ring-2 ring-amber-400/30'
                  : 'bg-card/90 dark:bg-card/80 hover:bg-card border border-border text-foreground'
              }`}
              title="Toggle draggable pin to pick location"
            >
              <Move className="h-4 w-4 notranslate" />
              <span className="hidden sm:inline">
                {draggableMode ? 'Editing Pin' : 'Pick Pin'}
              </span>
            </button>

            {/* Locate Me GPS Button */}
            <button
              onClick={handleLocateMe}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card/90 dark:bg-card/80 hover:bg-card border border-border hover:border-teal-500/40 shadow-lg text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 active:scale-95 touch-target backdrop-blur-xl"
              title="Locate me using GPS"
            >
              <Crosshair className="h-4 w-4 text-primary notranslate" />
              <span className="hidden sm:inline">Locate</span>
            </button>
          </div>
        </div>

        {/* Draggable Pin Active Banner */}
        {draggableMode && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto px-4 py-2 rounded-2xl bg-amber-500/95 text-white backdrop-blur-xl border border-amber-400 shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-150">
            <Move className="h-4 w-4 animate-bounce notranslate" />
            <span>Drag the orange pin on the map to set your location</span>
            <button
              onClick={() => setDraggableMode(false)}
              className="px-2.5 py-1 rounded-xl bg-black/25 hover:bg-black/40 text-white text-[11px] font-extrabold transition"
            >
              Done
            </button>
          </div>
        )}

        {/* Floating Right Map Controls (Re-center, Zoom In/Out, Layer / Radius) */}
        <div className="absolute top-20 right-3 z-20 flex flex-col items-end gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center p-1.5 rounded-2xl bg-card/90 dark:bg-card/80 backdrop-blur-xl border border-border shadow-xl space-y-1">
            {/* Re-center button */}
            <button
              onClick={() => {
                setMapCenter([userCoords.lat, userCoords.lng]);
                setMapZoom(13);
                toast.info('Re-centered to your location');
              }}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground hover:bg-primary/10 hover:text-primary active:scale-90 transition-all touch-target"
              title="Re-center map"
            >
              <RotateCcw className="h-4 w-4 notranslate" />
            </button>

            {/* Zoom In */}
            <button
              onClick={() => setMapZoom((prev) => Math.min(18, prev + 1))}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground hover:bg-primary/10 hover:text-primary active:scale-90 transition-all touch-target"
              title="Zoom In"
            >
              <Plus className="h-4 w-4 notranslate" />
            </button>

            {/* Zoom Out */}
            <button
              onClick={() => setMapZoom((prev) => Math.max(10, prev - 1))}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-foreground hover:bg-primary/10 hover:text-primary active:scale-90 transition-all touch-target"
              title="Zoom Out"
            >
              <Minus className="h-4 w-4 notranslate" />
            </button>

            {/* Layer / Radius controls toggle */}
            <button
              onClick={() => setLayerMenuOpen(!layerMenuOpen)}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-all touch-target ${
                layerMenuOpen
                  ? 'bg-primary text-white shadow-soft'
                  : 'text-foreground hover:bg-primary/10 hover:text-primary'
              }`}
              title="Radar Layers & Geofence"
            >
              <Layers className="h-4 w-4 notranslate" />
            </button>
          </div>

          {/* Layer & Radius Filter Popover */}
          {layerMenuOpen && (
            <div className="pointer-events-auto p-3.5 rounded-2xl bg-card/98 dark:bg-card/95 backdrop-blur-xl border border-border shadow-2xl space-y-3 text-xs w-52 animate-in fade-in zoom-in-95 duration-150">
              {/* Map Layers Toggles */}
              <div className="space-y-1.5 pb-2 border-b border-border">
                <span className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground block">
                  Map Layers
                </span>

                <button
                  onClick={() => toggleLayer('requests')}
                  className="w-full text-left py-1 px-1.5 rounded-lg flex items-center justify-between hover:bg-muted transition"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-rose-500" />
                    <span>Aid Requests</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {layers.requests ? '✓' : '—'}
                  </span>
                </button>

                <button
                  onClick={() => toggleLayer('hospitals')}
                  className="w-full text-left py-1 px-1.5 rounded-lg flex items-center justify-between hover:bg-muted transition"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-red-600" />
                    <span>Hospitals &amp; Clinics</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {layers.hospitals ? '✓' : '—'}
                  </span>
                </button>

                <button
                  onClick={() => toggleLayer('pharmacies')}
                  className="w-full text-left py-1 px-1.5 rounded-lg flex items-center justify-between hover:bg-muted transition"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>Pharmacies</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {layers.pharmacies ? '✓' : '—'}
                  </span>
                </button>

                <button
                  onClick={() => toggleLayer('bloodBanks')}
                  className="w-full text-left py-1 px-1.5 rounded-lg flex items-center justify-between hover:bg-muted transition"
                >
                  <span className="flex items-center gap-1.5 font-semibold text-foreground">
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    <span>Blood Banks</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {layers.bloodBanks ? '✓' : '—'}
                  </span>
                </button>
              </div>

              {/* Geofence Radius Selector */}
              <div className="space-y-1.5">
                <div className="font-extrabold text-[11px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Geofence Radius</span>
                  <span className="text-primary font-mono">{radiusKm} km</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[3, 5, 10, 25].map((km) => (
                    <button
                      key={km}
                      onClick={() => {
                        setRadiusKm(km);
                        toast.success(`Radius updated to ${km} km`);
                      }}
                      className={`text-center py-1.5 px-2 rounded-xl text-xs transition ${
                        radiusKm === km
                          ? 'bg-primary text-white font-bold shadow-xs'
                          : 'bg-muted/60 hover:bg-muted text-foreground'
                      }`}
                    >
                      {km} km
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating Bottom Right Legend */}
        <div className="hidden sm:flex absolute bottom-6 right-6 z-20 flex-col gap-1.5 p-3 rounded-2xl bg-card/90 dark:bg-card/80 border border-border shadow-xl backdrop-blur-xl text-[11px]">
          <span className="font-bold text-foreground mb-0.5">Pins Legend</span>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-urgency-critical" />
            <span className="text-muted-foreground">Critical Aid</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-rose-600" />
            <span className="text-muted-foreground">Hospital (24/7 ER)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-emerald-600" />
            <span className="text-muted-foreground">Pharmacy</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-600" />
            <span className="text-muted-foreground">Blood Bank</span>
          </div>
        </div>
      </div>

      {/* DESKTOP SIDE PANEL (Right on desktop) */}
      <div className="hidden md:flex flex-col w-96 border-l border-border bg-card h-full p-4 overflow-y-auto">
        <div className="pb-3 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Nearby Aid Requests</h2>
          <p className="text-xs text-muted-foreground">Click any marker or card to inspect details</p>
        </div>

        <div className="mt-3 space-y-3 flex-1 overflow-y-auto">
          {requests.map((req) => {
            const isSelected = activeRequest?.id === req.id;
            return (
              <div
                key={req.id}
                onClick={() => handleMarkerSelect(req)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm'
                    : 'border-border bg-background hover:bg-muted/70'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        req.urgency === 'critical'
                          ? 'bg-urgency-critical/10 text-urgency-critical'
                          : req.urgency === 'high'
                          ? 'bg-urgency-high/10 text-urgency-high'
                          : 'bg-urgency-medium/10 text-urgency-medium'
                      }`}
                    >
                      {req.urgency}
                    </span>
                    {!req.verified && (
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        Approx Area
                      </span>
                    )}
                  </div>
                </div>
                <h4 className="text-xs font-bold text-foreground line-clamp-1">{req.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                  {req.locationName}
                </p>
                {!req.verified && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    🔒 Exact coordinates hidden for privacy until matched.
                  </p>
                )}
                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{req.distanceKm} km away</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveRequest(req);
                      setDetailModalOpen(true);
                    }}
                    className="font-bold text-primary hover:underline"
                  >
                    Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MOBILE DRAGGABLE BOTTOM SHEET PREVIEW (Below 640px) */}
      <div className="md:hidden absolute bottom-16 left-0 right-0 z-30 p-3 pointer-events-none">
        {activeRequest ? (
          <div className="pointer-events-auto rounded-3xl bg-card border border-border p-4 shadow-xl text-card-foreground animate-in slide-in-from-bottom duration-200">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      activeRequest.urgency === 'critical'
                        ? 'bg-urgency-critical/10 text-urgency-critical'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {activeRequest.urgency}
                  </span>
                  {!activeRequest.verified && (
                    <span className="text-[9px] font-bold text-amber-700 bg-amber-500/15 px-1.5 py-0.5 rounded">
                      Approx Area
                    </span>
                  )}
                </div>
                <h4 className="text-sm font-bold text-foreground line-clamp-1">
                  {activeRequest.title}
                </h4>
              </div>
              <button
                onClick={() => setActiveRequest(null)}
                className="text-muted-foreground p-1 hover:bg-muted rounded-lg"
              >
                <X className="h-4 w-4 notranslate" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {activeRequest.description}
            </p>

            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                📍 {activeRequest.distanceKm} km away
              </span>
              <button
                onClick={() => setDetailModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-soft touch-target"
              >
                View Full Details
              </button>
            </div>
          </div>
        ) : (
          <div className="pointer-events-auto rounded-2xl bg-card/95 backdrop-blur-md border border-border p-3 text-center shadow-lg">
            <span className="text-xs text-muted-foreground font-medium">
              Tap any colored pin on the map to preview request
            </span>
          </div>
        )}
      </div>

      {/* Full Detail Modal */}
      <RequestDetailModal
        request={activeRequest}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />
    </div>
  );
}
