'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import {
  Compass,
  Crosshair,
  MapPin,
  Clock,
  AlertTriangle,
  X,
  Layers,
  List,
  Plus,
  Minus,
  RotateCcw,
  Search,
  Loader2,
  Move,
  Phone,
  Navigation,
  ExternalLink,
  HeartHandshake,
  ArrowRight,
  Footprints,
  Bike,
  Car,
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpRequest, TravelMode } from '@/lib/data/types';
import { isRequestOwner } from '@/lib/data/ownership';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';
import { searchPlaces, PlaceSearchResult } from '@/lib/geo/search';
import { reverseGeocode } from '@/lib/geo/reverse-geocode';
import { getNearestMedicalFacilities, MedicalFacility } from '@/lib/geo/hospitals';
import { getRoadRoute, RoadRouteResult } from '@/lib/geo/osrm';
import { MapLayersState } from './LeafletInnerMap';
import { RequestDetailModal } from '../requests/RequestDetailModal';
import { HelpFlowModal } from '../requests/HelpFlowModal';
import { PrimaryHelpButton, SecondaryButton } from '../requests/ActionButtons';

// Immediate fallback component with Switch to List View for slow 2G/3G connections
function MapLoadingFallback() {
  const { setCurrentView } = useKindLinkStore();

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-6 text-center text-slate-600 dark:text-slate-300">
      <div className="flex flex-col items-center gap-4 max-w-sm">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-teal-500/20 border-t-teal-600" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Compass className="h-5 w-5 text-teal-600 dark:text-teal-400 animate-pulse notranslate" />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
            Loading Live Aid &amp; Emergency Map...
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            CARTO themed tiles, OSRM routing &amp; live emergency pins
          </p>
        </div>

        <div className="mt-2 flex flex-col items-center gap-2 w-full">
          <button
            type="button"
            onClick={() => setCurrentView('requests')}
            className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all touch-target"
          >
            <List className="h-4 w-4 notranslate" />
            <span>Switch to List View (Instant 2G/3G)</span>
          </button>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            View active aid requests immediately without waiting for map tiles
          </span>
        </div>
      </div>
    </div>
  );
}

// Dynamically import Leaflet map with SSR disabled
const LeafletInnerMap = dynamic(() => import('./LeafletInnerMap'), {
  ssr: false,
  loading: () => <MapLoadingFallback />,
});

type ActiveMapItem =
  | { type: 'request'; data: HelpRequest }
  | { type: 'facility'; data: MedicalFacility };

export function MapView() {
  const {
    requests,
    myActiveRequests,
    userProfile,
    userCoords,
    userAreaName,
    setUserCoords,
    selectedRequestId,
    setSelectedRequestId,
    setCurrentView,
    travelMode,
    setTravelMode,
    cancelRequest,
    completeRequest,
  } = useKindLinkStore();

  // Combine nearby requests and user's own active requests so both show on the map
  const allMapRequests = useMemo(() => {
    const map = new Map<string, HelpRequest>();
    requests.forEach((r) => map.set(r.id, r));
    myActiveRequests.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [requests, myActiveRequests]);

  // Active selection state
  const [activeItem, setActiveItem] = useState<ActiveMapItem | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [mapCenter, setMapCenter] = useState<[number, number]>([userCoords.lat, userCoords.lng]);
  const [mapZoom, setMapZoom] = useState(13);

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [helpFlowOpen, setHelpFlowOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false);

  // Road Routing state (OSRM)
  const [activeRoute, setActiveRoute] = useState<RoadRouteResult | null>(null);
  const [transportTripRoute, setTransportTripRoute] = useState<RoadRouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [transportRouteMode, setTransportRouteMode] = useState<'to_pickup' | 'trip'>('to_pickup');

  // Address search state (Proxy debounced 300ms)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
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
    clinics: true,
    pharmacies: true,
    bloodBanks: true,
  });

  // Sync user location changes to map center
  useEffect(() => {
    setMapCenter([userCoords.lat, userCoords.lng]);
    setDraggablePos([userCoords.lat, userCoords.lng]);
  }, [userCoords.lat, userCoords.lng]);

  // Auto-select request if selectedRequestId is set in store
  useEffect(() => {
    if (selectedRequestId) {
      const match = allMapRequests.find((r) => r.id === selectedRequestId);
      if (match) {
        setActiveItem({ type: 'request', data: match });
        setMapCenter([match.latitude, match.longitude]);
      }
    }
  }, [selectedRequestId, allMapRequests]);

  // Debounced Place & Address Search (300ms, triggers after 3 chars, user location biased)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 3) {
      setSearchResults([]);
      setSearchError(null);
      setSearchDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setSearchError(null);
      try {
        const results = await searchPlaces(trimmed, {
          biasLat: userCoords.lat,
          biasLng: userCoords.lng,
          type: 'autocomplete',
        });
        setSearchResults(results);
        setSearchDropdownOpen(true);
      } catch (err: unknown) {
        const msg = (err as Error)?.message || '';
        if (msg.includes('busy')) {
          setSearchError('Search is busy. Try again in a minute.');
        } else {
          setSearchError(null);
        }
        setSearchResults([]);
        setSearchDropdownOpen(true);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, userCoords.lat, userCoords.lng]);

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

  // Fetch medical facilities within geofence radius
  useEffect(() => {
    let isMounted = true;
    getNearestMedicalFacilities({
      lat: mapCenter[0],
      lng: mapCenter[1],
      radiusMeters: radiusKm * 1000,
      limit: 50,
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

  // Counts breakdown for honest radar status and filter chips
  const hospitalCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'hospital').length,
    [medicalFacilities]
  );
  const clinicCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'clinic').length,
    [medicalFacilities]
  );
  const pharmacyCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'pharmacy').length,
    [medicalFacilities]
  );
  const bloodBankCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'blood_bank').length,
    [medicalFacilities]
  );

  const visibleFacilities = useMemo(() => {
    return medicalFacilities.filter((f) => {
      if (f.type === 'hospital') return layers.hospitals;
      if (f.type === 'clinic') return layers.clinics ?? layers.hospitals;
      if (f.type === 'pharmacy') return layers.pharmacies;
      if (f.type === 'blood_bank') return layers.bloodBanks;
      return true;
    });
  }, [medicalFacilities, layers]);

  const visibleRequests = useMemo(() => {
    if (!layers.requests) return [];
    return requests;
  }, [requests, layers.requests]);

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
        description: 'Centering on default hub.',
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
      () => {
        toast.warning('GPS permission denied or unavailable', {
          description: 'Centering on Asansol Community Hub.',
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

  // Selection handlers
  const handleSelectRequest = (req: HelpRequest) => {
    setActiveItem({ type: 'request', data: req });
    setSelectedRequestId(req.id);
    setActiveRoute(null);
    setTransportTripRoute(null);
  };

  const handleSelectFacility = (fac: MedicalFacility) => {
    setActiveItem({ type: 'facility', data: fac });
    setActiveRoute(null);
    setTransportTripRoute(null);
  };

  // Road Routing calculation using OSRM
  const handleCalculateDirections = async (mode: TravelMode = travelMode) => {
    if (!activeItem) return;

    setLoadingRoute(true);
    try {
      const origin = { lat: userCoords.lat, lng: userCoords.lng };
      let destLat = 0;
      let destLng = 0;

      if (activeItem.type === 'request') {
        destLat = activeItem.data.latitude;
        destLng = activeItem.data.longitude;
      } else {
        destLat = activeItem.data.latitude;
        destLng = activeItem.data.longitude;
      }

      const result = await getRoadRoute(origin, { lat: destLat, lng: destLng }, mode);
      setActiveRoute(result);
      setTransportTripRoute(null);
      setTransportRouteMode('to_pickup');
      if (result.isFallback || result.source === 'straight-line') {
        toast.info(result.formattedText, {
          description: 'Road routing degraded; estimated straight-line distance displayed.',
        });
      } else {
        toast.success(
          `Route calculated: ${result.distanceKm} km (~${result.durationMinutes} min via ${result.sourceProvider || 'road'})`
        );
      }
    } catch {
      toast.error('Could not compute road route');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Transport Request "From here to there" Trip Route (Pickup to Dropoff)
  const handleCalculateTransportTrip = async (
    req: HelpRequest,
    mode: TravelMode = travelMode
  ) => {
    const pickupLat = req.pickupLat ?? req.latitude;
    const pickupLng = req.pickupLng ?? req.longitude;
    const dropLat = req.dropLat ?? 23.7012; // HLG Memorial Hospital fallback
    const dropLng = req.dropLng ?? 86.9554;

    setLoadingRoute(true);
    try {
      const result = await getRoadRoute(
        { lat: pickupLat, lng: pickupLng },
        { lat: dropLat, lng: dropLng },
        mode
      );
      setTransportTripRoute(result);
      setActiveRoute(null);
      setTransportRouteMode('trip');
      if (result.isFallback || result.source === 'straight-line') {
        toast.info(result.formattedText, {
          description: 'Road routing degraded; estimated straight-line distance displayed.',
        });
      } else {
        toast.success(
          `Trip Route (Pickup → Dropoff): ${result.distanceKm} km (~${result.durationMinutes} min)`
        );
      }
    } catch {
      toast.error('Could not compute transport trip route');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Clear current active route
  const handleClearRoute = () => {
    setActiveRoute(null);
    setTransportTripRoute(null);
    toast.info('Route navigation line cleared');
  };

  // Toggle individual layer
  const toggleLayer = (key: keyof MapLayersState) => {
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Cycle geofence radius
  const cycleRadius = () => {
    const radii = [3, 5, 10, 25];
    const currentIndex = radii.indexOf(radiusKm);
    const nextRadius = radii[(currentIndex + 1) % radii.length];
    setRadiusKm(nextRadius);
    toast.info(`Geofence radius set to ${nextRadius} km`);
  };

  // Total pins in view
  const totalPinsCount = visibleRequests.length + visibleFacilities.length;
  const currentAreaLabel = userAreaName || 'Asansol Region';

  return (
    <div className="relative flex-1 w-full h-[calc(100dvh-4rem)] overflow-hidden flex flex-col md:flex-row bg-slate-100 dark:bg-slate-950">
      {/* MAP CANVAS (Takes full area on mobile, flex-1 on desktop) */}
      <div className="relative flex-1 h-full w-full">
        <LeafletInnerMap
          center={mapCenter}
          zoom={mapZoom}
          requests={requests}
          radiusMeters={radiusKm * 1000}
          selectedRequest={activeItem?.type === 'request' ? activeItem.data : null}
          selectedFacility={activeItem?.type === 'facility' ? activeItem.data : null}
          onSelectRequest={handleSelectRequest}
          onSelectFacility={handleSelectFacility}
          draggableMode={draggableMode}
          draggablePosition={draggablePos}
          onDraggablePositionChange={handleDraggableChange}
          medicalFacilities={medicalFacilities}
          layers={layers}
          activeRoute={activeRoute}
          transportTripRoute={transportTripRoute}
        />

        {/* 1. TOP BAR: Honest Radar Status, Search Bar & List View Toggle */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pointer-events-none">
          {/* Left: Honest Radar Badge (Real data counts) */}
          <div className="pointer-events-auto flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3.5 py-2.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 shadow-md text-xs font-bold text-slate-900 dark:text-slate-100">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-600" />
              </span>
              <Compass className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 notranslate" />
              <span>{currentAreaLabel}:</span>
              <span className="text-teal-700 dark:text-teal-300 font-extrabold">
                {visibleRequests.length} {visibleRequests.length === 1 ? 'request' : 'requests'}
              </span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-slate-700 dark:text-slate-300 font-semibold">
                {visibleFacilities.length} {visibleFacilities.length === 1 ? 'place' : 'places'}
              </span>
            </div>
          </div>

          {/* Center: Nominatim Place & Address Search (Debounced 300ms) */}
          <div
            ref={searchContainerRef}
            className="pointer-events-auto relative w-full sm:max-w-xs md:max-w-sm"
          >
            <div className="relative flex items-center bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-300 dark:border-slate-700 shadow-md px-3 py-2 focus-within:border-teal-600 dark:focus-within:border-teal-400 transition-all min-h-[44px]">
              <Search className="h-4 w-4 text-slate-500 dark:text-slate-400 shrink-0 notranslate" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setSearchDropdownOpen(true);
                }}
                placeholder="Search area, landmark or street..."
                className="w-full bg-transparent px-2 text-xs font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none"
              />
              {isSearching ? (
                <Loader2 className="h-4 w-4 text-teal-600 animate-spin shrink-0 notranslate" />
              ) : searchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSearchResults([]);
                    setSearchDropdownOpen(false);
                  }}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  aria-label="Clear search query"
                >
                  <X className="h-4 w-4 notranslate" />
                </button>
              ) : null}
            </div>

            {/* Search Suggestions Dropdown */}
            {searchDropdownOpen && (searchResults.length > 0 || searchError || (searchQuery.trim().length >= 3 && !isSearching)) && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 rounded-xl border-2 border-slate-300 dark:border-slate-700 shadow-2xl overflow-hidden z-40 max-h-60 overflow-y-auto animate-in fade-in duration-150">
                {searchResults.length > 0 ? (
                  <div className="p-1.5 space-y-1">
                    {searchResults.map((item) => (
                      <button
                        key={item.placeId}
                        type="button"
                        onClick={() => handleSelectPlace(item)}
                        className="w-full text-left p-2.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-start gap-2.5 text-xs group"
                      >
                        <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform notranslate" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                              {item.name}
                            </span>
                            {item.isFallback && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0 font-medium">
                                Local Hub
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-600 dark:text-slate-400 block truncate">
                            {item.displayName}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : searchError ? (
                  <div className="p-3 text-center text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50/50 dark:bg-amber-950/20">
                    {searchError}
                  </div>
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                    No places found. Try another query or drop a pin.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: Instant Switch to List View */}
          <div className="pointer-events-auto flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setCurrentView('requests')}
              className="min-h-[44px] flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-300 dark:border-slate-700 shadow-md text-xs font-bold text-slate-900 dark:text-slate-100 transition-all active:scale-95 touch-target"
              title="Immediate Switch to List View"
            >
              <List className="h-4 w-4 text-teal-600 dark:text-teal-400 notranslate" />
              <span>List View</span>
            </button>
          </div>
        </div>

        {/* 2. FILTER CHIPS ROW: Below Search Bar */}
        <div className="absolute top-16 left-3 right-3 sm:right-20 z-20 pointer-events-auto flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {/* Toggle All Requests */}
          <button
            type="button"
            onClick={() => toggleLayer('requests')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border-2 shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              layers.requests
                ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/25 ring-2 ring-rose-400/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            <span>Aid Requests ({requests.length})</span>
          </button>

          {/* Toggle Hospitals */}
          <button
            type="button"
            onClick={() => toggleLayer('hospitals')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border-2 shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              layers.hospitals
                ? 'bg-red-600 text-white border-red-700 shadow-red-600/25 ring-2 ring-red-400/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black">H</span>
            <span>Hospitals ({hospitalCount})</span>
          </button>

          {/* Toggle Clinics */}
          <button
            type="button"
            onClick={() => toggleLayer('clinics')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border-2 shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              layers.clinics
                ? 'bg-blue-600 text-white border-blue-700 shadow-blue-600/25 ring-2 ring-blue-400/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black">C</span>
            <span>Clinics ({clinicCount})</span>
          </button>

          {/* Toggle Pharmacies */}
          <button
            type="button"
            onClick={() => toggleLayer('pharmacies')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border-2 shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              layers.pharmacies
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/25 ring-2 ring-emerald-400/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="font-mono font-black">Rx</span>
            <span>Pharmacies ({pharmacyCount})</span>
          </button>

          {/* Toggle Blood Banks */}
          <button
            type="button"
            onClick={() => toggleLayer('bloodBanks')}
            className={`min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border-2 shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              layers.bloodBanks
                ? 'bg-red-900 text-white border-red-950 shadow-red-900/25 ring-2 ring-red-500/30'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>🩸</span>
            <span>Blood Banks ({bloodBankCount})</span>
          </button>

          {/* Geofence Radius Cycle Chip */}
          <button
            type="button"
            onClick={cycleRadius}
            className="min-h-[44px] px-3.5 py-2 text-xs font-bold rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shadow-md transition-all whitespace-nowrap flex items-center gap-1.5 touch-target"
            title="Click to cycle geofence radius"
          >
            <span className="text-teal-600 dark:text-teal-400">⭕</span>
            <span>Radius: {radiusKm} km</span>
          </button>
        </div>

        {/* 3. RIGHT-SIDE CONTROL STACK: 44px min touch targets, WCAG AA solid contrast */}
        <div className="absolute top-28 right-3 z-20 flex flex-col items-center gap-2 pointer-events-auto">
          {/* Reset North / Re-center */}
          <button
            type="button"
            onClick={() => {
              setMapCenter([userCoords.lat, userCoords.lng]);
              setMapZoom(13);
              toast.info('Re-centered to your location hub');
            }}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-target"
            title="Reset North & Re-center"
            aria-label="Reset North & Re-center"
          >
            <RotateCcw className="h-4 w-4 notranslate" />
          </button>

          {/* Locate Me (GPS) */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-target"
            title="Locate Me (GPS)"
            aria-label="Locate Me (GPS)"
          >
            <Crosshair className="h-4 w-4 text-teal-600 dark:text-teal-400 notranslate" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setMapZoom((prev) => Math.min(18, prev + 1))}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-target"
            title="Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="h-4 w-4 notranslate" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setMapZoom((prev) => Math.max(10, prev - 1))}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 shadow-md flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all touch-target"
            title="Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="h-4 w-4 notranslate" />
          </button>

          {/* Draggable Pin Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              const nextMode = !draggableMode;
              setDraggableMode(nextMode);
              if (nextMode) {
                toast.info('Draggable Pin Mode Active', {
                  description: 'Drag the orange pin to set your location.',
                });
              } else {
                toast.success('Location Pin Saved');
              }
            }}
            className={`min-h-[44px] min-w-[44px] rounded-xl border-2 shadow-md flex items-center justify-center transition-all touch-target ${
              draggableMode
                ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-400/40'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Toggle Draggable Pin Mode"
            aria-label="Toggle Draggable Pin Mode"
          >
            <Move className="h-4 w-4 notranslate" />
          </button>

          {/* Map Legend & Symbols Toggle */}
          <button
            type="button"
            onClick={() => setLegendOpen(!legendOpen)}
            className={`min-h-[44px] min-w-[44px] rounded-xl border-2 shadow-md flex items-center justify-center transition-all touch-target ${
              legendOpen
                ? 'bg-teal-600 text-white border-teal-700 ring-2 ring-teal-400/40'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
            title="Pins Legend & Symbols"
            aria-label="Pins Legend & Symbols"
          >
            <Layers className="h-4 w-4 notranslate" />
          </button>
        </div>

        {/* 4. DRAGGABLE PIN ACTIVE BANNER */}
        {draggableMode && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 pointer-events-auto px-4 py-2.5 rounded-xl bg-amber-500 text-white border-2 border-amber-600 shadow-xl flex items-center gap-3 text-xs font-bold animate-in fade-in duration-150">
            <Move className="h-4 w-4 animate-bounce notranslate" />
            <span>Drag the orange pin on the map to set your location coordinates</span>
            <button
              type="button"
              onClick={() => setDraggableMode(false)}
              className="px-3 py-1 rounded-lg bg-black/30 hover:bg-black/45 text-white text-[11px] font-black transition"
            >
              Done
            </button>
          </div>
        )}

        {/* 5. LEGEND & SYMBOLS MODAL / POPOVER */}
        {legendOpen && (
          <div className="absolute top-28 right-16 z-30 pointer-events-auto w-72 max-w-[calc(100vw-5rem)] rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 shadow-2xl p-4 text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                Pins Legend &amp; Symbols
              </span>
              <button
                type="button"
                onClick={() => setLegendOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                aria-label="Close legend"
              >
                <X className="h-4 w-4 notranslate" />
              </button>
            </div>

            {/* Requests by Urgency */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Aid Requests (By Urgency)
              </span>
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#DC2626]" />
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Critical Urgency (Immediate Aid)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#EA580C]" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  High Urgency (&lt; 2 hrs)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#D97706]" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Medium Urgency (&lt; 24 hrs)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-[#475569]" />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Low Urgency (Flexible Aid)
                </span>
              </div>
            </div>

            {/* Medical Facilities */}
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Healthcare Facilities
              </span>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#DC2626] text-white font-black font-mono text-[10px] flex items-center justify-center">
                  H
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Hospital (24/7 Emergency Care)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#2563EB] text-white font-black font-mono text-[10px] flex items-center justify-center">
                  C
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Clinic &amp; Health Center
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#059669] text-white font-black font-mono text-[10px] flex items-center justify-center">
                  Rx
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Pharmacy &amp; Chemist
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#991B1B] text-white text-[11px] flex items-center justify-center">
                  🩸
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Blood Bank
                </span>
              </div>
            </div>

            {/* Pin Clustering Explanation */}
            <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
                Pin Clusters
              </span>
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-teal-600 text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white shadow-xs">
                  4
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 m-0">
                  Markers close together group into clusters. Tap any cluster to zoom in and expand
                  individual pins.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 6. BOTTOM PREVIEW CARD / HINT: Kept strictly above the mobile Tab Bar and floating + button */}
        {/* Mobile Tab Bar height is ~68px, raised + button is ~76px. bottom-24 (96px) leaves ample safe zone */}
        <div className="absolute bottom-24 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md sm:bottom-6 z-30 pointer-events-none">
          {activeItem ? (
            <div className="pointer-events-auto rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-4 shadow-2xl text-slate-900 dark:text-slate-100 animate-in slide-in-from-bottom duration-200">
              {/* Header: Title, Category/Urgency & Close */}
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activeItem.type === 'request' ? (
                      <>
                        <span
                          className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            activeItem.data.urgency === 'critical'
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                              : activeItem.data.urgency === 'high'
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800'
                          }`}
                        >
                          {activeItem.data.urgency}
                        </span>
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                          {activeItem.data.category}
                        </span>
                        {activeItem.data.verified && (
                          <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                            ✓ Verified
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="inline-block text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                          {activeItem.data.type.replace('_', ' ')}
                        </span>
                        {activeItem.data.emergency && (
                          <span className="text-[9px] font-extrabold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded-full border border-rose-300 dark:border-rose-800">
                            24/7 ER
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {activeItem.type === 'request' ? activeItem.data.title : activeItem.data.name}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1 m-0">
                    📍{' '}
                    {activeItem.type === 'request'
                      ? activeItem.data.locationName
                      : activeItem.data.address || 'Asansol Hub'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(null);
                    handleClearRoute();
                  }}
                  className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 p-1 rounded-lg"
                  aria-label="Close preview card"
                >
                  <X className="h-4 w-4 notranslate" />
                </button>
              </div>

              {/* Active OSRM Route Info & Mode Switcher */}
              {(activeRoute || transportTripRoute) && (
                <div className="mt-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="h-4 w-4 text-blue-600 dark:text-blue-400 notranslate" />
                      <span>
                        {(transportTripRoute || activeRoute)?.source === 'osrm'
                          ? 'Live OSRM Road Route'
                          : 'Direct Line'}
                      </span>
                    </span>
                    <span className="font-mono text-teal-700 dark:text-teal-300 font-extrabold">
                      {(transportTripRoute || activeRoute)?.formattedText}
                    </span>
                  </div>

                  {/* Travel Mode Switcher */}
                  <div className="flex items-center justify-between gap-1 pt-1">
                    <div className="flex items-center gap-1">
                      {(['walking', 'bike', 'car'] as TravelMode[]).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => {
                            setTravelMode(mode);
                            if (transportRouteMode === 'trip' && activeItem.type === 'request') {
                              handleCalculateTransportTrip(activeItem.data, mode);
                            } else {
                              handleCalculateDirections(mode);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition ${
                            travelMode === mode
                              ? 'bg-blue-600 text-white border-blue-700'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                          }`}
                        >
                          {mode === 'walking' && <Footprints className="h-3 w-3 notranslate" />}
                          {mode === 'bike' && <Bike className="h-3 w-3 notranslate" />}
                          {mode === 'car' && <Car className="h-3 w-3 notranslate" />}
                          <span className="capitalize">{mode}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={handleClearRoute}
                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}

              {/* Transport "From here to there" Route Toggles */}
              {activeItem.type === 'request' && activeItem.data.category === 'transport' && (
                <div className="mt-3 p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex items-center justify-between gap-1.5 text-xs">
                  <span className="font-bold text-purple-900 dark:text-purple-200">
                    Transport Route:
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleCalculateDirections(travelMode)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                        transportRouteMode === 'to_pickup' && activeRoute
                          ? 'bg-purple-700 text-white border-purple-800'
                          : 'bg-white dark:bg-slate-900 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                      }`}
                    >
                      User → Pickup
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCalculateTransportTrip(activeItem.data, travelMode)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                        transportRouteMode === 'trip' && transportTripRoute
                          ? 'bg-purple-700 text-white border-purple-800'
                          : 'bg-white dark:bg-slate-900 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                      }`}
                    >
                      Pickup → Dropoff
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons Row: Min 44px touch targets */}
              <div className="mt-3.5 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 flex-wrap">
                {/* 1. Directions Button (OSRM road route calculation) */}
                <button
                  type="button"
                  onClick={() => handleCalculateDirections(travelMode)}
                  disabled={loadingRoute}
                  className="min-h-[44px] flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md active:scale-95 transition-all touch-target"
                >
                  {loadingRoute ? (
                    <Loader2 className="h-4 w-4 animate-spin notranslate" />
                  ) : (
                    <Navigation className="h-4 w-4 notranslate" />
                  )}
                  <span>Directions</span>
                </button>

                {/* 2. Call Button (if phone exists) */}
                {((activeItem.type === 'request' && activeItem.data.phone) ||
                  (activeItem.type === 'facility' && activeItem.data.phone)) && (
                  <a
                    href={`tel:${
                      activeItem.type === 'request'
                        ? activeItem.data.phone.replace(/[^0-9+]/g, '')
                        : activeItem.data.phone?.replace(/[^0-9+]/g, '')
                    }`}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1.5 active:scale-95 transition-all touch-target"
                    title="Call directly"
                  >
                    <Phone className="h-4 w-4 notranslate" />
                    <span className="hidden sm:inline">Call</span>
                  </a>
                )}

                {/* 3. Open in External Maps fallback */}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${
                    activeItem.type === 'request'
                      ? `${activeItem.data.latitude},${activeItem.data.longitude}`
                      : `${activeItem.data.latitude},${activeItem.data.longitude}`
                  }`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-300 dark:border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition-all touch-target"
                  title="Open in Google Maps"
                >
                  <ExternalLink className="h-3.5 w-3.5 notranslate" />
                  <span className="hidden sm:inline">Maps</span>
                </a>

                {/* 4. Request Specific: "I Can Help" & "View Details" */}
                {activeItem.type === 'request' && (
                  <>
                    <PrimaryHelpButton
                      category={activeItem.data.category || 'equipment'}
                      size="card"
                      label="I can help"
                      onClick={() => setHelpFlowOpen(true)}
                    />
                    <SecondaryButton
                      size="card"
                      variant="outline"
                      onClick={() => setDetailModalOpen(true)}
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3.5 w-3.5 notranslate ml-1" />
                    </SecondaryButton>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Bottom Hint: Kept strictly above the bottom tab bar */
            <div className="pointer-events-auto rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 p-2.5 text-center shadow-lg">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                Tap any colored pin or cluster to preview details &amp; live OSRM directions
              </span>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP SIDE PANEL (Right on desktop screens) */}
      <div className="hidden md:flex flex-col w-96 border-l-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 h-full p-4 overflow-y-auto">
        <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Nearby Aid Requests
            </h2>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
              {visibleRequests.length} active
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Select any request to preview and draw real road navigation
          </p>
        </div>

        <div className="mt-3 space-y-3 flex-1 overflow-y-auto pr-1">
          {visibleRequests.map((req) => {
            const isSelected = activeItem?.type === 'request' && activeItem.data.id === req.id;
            return (
              <div
                key={req.id}
                onClick={() => handleSelectRequest(req)}
                className={`p-3.5 rounded-2xl border-2 transition cursor-pointer text-left ${
                  isSelected
                    ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40 shadow-md ring-2 ring-teal-500/20'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        req.urgency === 'critical'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                          : req.urgency === 'high'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                      }`}
                    >
                      {req.urgency}
                    </span>
                    {!req.verified && (
                      <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded">
                        Approx Area
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    {req.distanceKm} km away
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {req.title}
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-1">
                  {req.locationName}
                </p>
                <div className="mt-2.5 flex items-center justify-between text-[11px]">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRequest(req);
                      handleCalculateDirections(travelMode);
                    }}
                    className="font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    <Navigation className="h-3 w-3 notranslate" />
                    <span>Route</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRequest(req);
                      setDetailModalOpen(true);
                    }}
                    className="font-bold text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Details →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full Detail Modal */}
      <RequestDetailModal
        request={activeItem?.type === 'request' ? activeItem.data : null}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />

      {/* Help Flow Modal (I can help) */}
      <HelpFlowModal
        request={activeItem?.type === 'request' ? activeItem.data : null}
        open={helpFlowOpen}
        onClose={() => setHelpFlowOpen(false)}
        onHelpSubmitted={() => {
          setHelpFlowOpen(false);
          toast.success('Your offer of help has been sent to the requester!');
        }}
      />
    </div>
  );
}
