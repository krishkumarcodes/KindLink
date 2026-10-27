'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Compass,
  Crosshair,
  MapPin,
  Layers,
  List,
  Plus,
  Minus,
  Search,
  Loader2,
  Phone,
  Navigation,
  ExternalLink,
  X,
  Clock,
  Check,
  ChevronUp,
  ChevronDown,
  Stethoscope,
  Pill,
  Droplet,
  ShoppingBag,
  Home as HomeIcon,
  AlertTriangle,
  History,
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
import { getNearestMedicalFacilities, MedicalFacility, MedicalAmenityType } from '@/lib/geo/hospitals';
import { getRoadRoute, RoadRouteResult } from '@/lib/geo/osrm';
import type { MapLayersState } from './LeafletInnerMap';
import { RequestDetailModal } from '../requests/RequestDetailModal';
import { HelpFlowModal } from '../requests/HelpFlowModal';
import { PrimaryHelpButton, SecondaryButton } from '../requests/ActionButtons';

// Skeleton fallback shimmer while Leaflet bundle and tiles load
function MapLoadingFallback() {
  return (
    <div className="h-full w-full relative flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 select-none">
      <div className="absolute inset-0 map-skeleton-shimmer" />
      <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center max-w-sm rounded-2xl bg-card/85 backdrop-blur-md border border-border shadow-lg">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-teal-500/20 border-t-teal-600" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">Loading Map Engine...</p>
          <p className="text-xs text-muted-foreground">Connecting to OpenFreeMap vector styles</p>
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
  | { type: 'facility'; data: MedicalFacility }
  | { type: 'searched_place'; data: PlaceSearchResult };

type SnapPoint = 'peek' | 'half' | 'full';
type BaseMapMode = 'auto' | 'light' | 'dark' | 'satellite' | 'outdoor';

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

  // Combine nearby requests and user's own active requests
  const allMapRequests = useMemo(() => {
    const map = new Map<string, HelpRequest>();
    requests.forEach((r) => map.set(r.id, r));
    myActiveRequests.forEach((r) => map.set(r.id, r));
    return Array.from(map.values());
  }, [requests, myActiveRequests]);

  // Active item & map state
  const [activeItem, setActiveItem] = useState<ActiveMapItem | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([userCoords.lat, userCoords.lng]);
  const [mapZoom, setMapZoom] = useState(14);
  const [radiusKm, setRadiusKm] = useState(10);
  const [baseMapMode, setBaseMapMode] = useState<BaseMapMode>('auto');
  const [layersMenuOpen, setLayersMenuOpen] = useState(false);
  const [bottomSheetSnap, setBottomSheetSnap] = useState<SnapPoint>('peek');
  const [bottomSheetTab, setBottomSheetTab] = useState<'requests' | 'places'>('requests');
  const [tipDismissed, setTipDismissed] = useState(false);

  // Active filter chip ('all' | 'critical' | 'medical' | 'pharmacies' | 'blood' | 'food' | 'shelter')
  const [activeFilterChip, setActiveFilterChip] = useState<string>('all');

  // Modals state
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [helpFlowOpen, setHelpFlowOpen] = useState(false);

  // Road Routing state (OSRM)
  const [activeRoute, setActiveRoute] = useState<RoadRouteResult | null>(null);
  const [transportTripRoute, setTransportTripRoute] = useState<RoadRouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Medical facilities and layers state
  const [medicalFacilities, setMedicalFacilities] = useState<MedicalFacility[]>([]);
  const [layers, setLayers] = useState<MapLayersState>({
    requests: true,
    hospitals: true,
    clinics: true,
    pharmacies: true,
    bloodBanks: true,
  });

  // Track if MapTiler key is available to show satellite/outdoor options
  const hasMapTilerKey = Boolean(process.env.NEXT_PUBLIC_MAPTILER_API_KEY);

  // 1. Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedLayers = localStorage.getItem('kindlink_map_layers');
      if (savedLayers) setLayers(JSON.parse(savedLayers));

      const savedBaseMap = localStorage.getItem('kindlink_map_basemap') as BaseMapMode;
      if (savedBaseMap) setBaseMapMode(savedBaseMap);

      const savedTip = localStorage.getItem('kindlink_map_tip_dismissed');
      if (savedTip === '1') setTipDismissed(true);

      const savedRecent = localStorage.getItem('kindlink_recent_searches');
      if (savedRecent) setRecentSearches(JSON.parse(savedRecent));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // 2. Fetch medical facilities within geofence radius (cached)
  useEffect(() => {
    let isMounted = true;
    getNearestMedicalFacilities({
      lat: mapCenter[0],
      lng: mapCenter[1],
      radiusMeters: radiusKm * 1000,
      limit: 60,
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

  // 3. Sync user coords changes
  useEffect(() => {
    setMapCenter([userCoords.lat, userCoords.lng]);
  }, [userCoords.lat, userCoords.lng]);

  // 4. Handle Deep Links: /map?request=ID&route=1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const reqParam = urlParams.get('request') || selectedRequestId;
    const routeParam = urlParams.get('route') === '1';

    if (reqParam && allMapRequests.length > 0) {
      const found = allMapRequests.find((r) => r.id === reqParam);
      if (found) {
        setActiveItem({ type: 'request', data: found });
        setMapCenter([found.latitude, found.longitude]);
        setMapZoom(15);
        if (routeParam) {
          handleCalculateDirections(travelMode, { lat: found.latitude, lng: found.longitude });
        }
      }
    }
  }, [allMapRequests, selectedRequestId]);

  // 5. Place & Request Search (Debounced 300ms)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const places = await searchPlaces(trimmed, {
          biasLat: userCoords.lat,
          biasLng: userCoords.lng,
          type: 'autocomplete',
        });
        setSearchResults(places);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, userCoords.lat, userCoords.lng]);

  // Matching requests from map requests based on search query
  const matchingRequests = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return allMapRequests.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        r.locationName.toLowerCase().includes(q)
    ).slice(0, 4);
  }, [searchQuery, allMapRequests]);

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

  // Road Routing calculation using OSRM
  const handleCalculateDirections = async (
    mode: TravelMode = travelMode,
    destinationCoords?: { lat: number; lng: number }
  ) => {
    let destLat = 0;
    let destLng = 0;

    if (destinationCoords) {
      destLat = destinationCoords.lat;
      destLng = destinationCoords.lng;
    } else if (activeItem) {
      const d = activeItem.data as any;
      destLat = d.latitude ?? d.lat ?? 0;
      destLng = d.longitude ?? d.lng ?? d.lon ?? 0;
    } else {
      return;
    }

    setLoadingRoute(true);
    try {
      const origin = { lat: userCoords.lat, lng: userCoords.lng };
      const result = await getRoadRoute(origin, { lat: destLat, lng: destLng }, mode);
      setActiveRoute(result);
      setTransportTripRoute(null);
      if (result.isFallback || result.source === 'straight-line') {
        toast.info(result.formattedText, {
          description: 'Road routing estimate displayed.',
        });
      } else {
        toast.success(
          `Route: ${result.distanceKm} km (~${result.durationMinutes} min via ${result.sourceProvider || 'road'})`
        );
      }
    } catch {
      toast.error('Could not compute road route');
    } finally {
      setLoadingRoute(false);
    }
  };

  // Clear current active route
  const handleClearRoute = () => {
    setActiveRoute(null);
    setTransportTripRoute(null);
  };

  // Browser Geolocation
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported by this browser');
      return;
    }

    toast.info('Acquiring GPS location...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isLive: true,
        };
        setMapCenter([coords.lat, coords.lng]);
        setMapZoom(15);
        try {
          const geo = await reverseGeocode(coords.lat, coords.lng);
          setUserCoords(coords, geo.shortLabel);
          toast.success(`Centered on your location: ${geo.shortLabel}`);
        } catch {
          setUserCoords(coords);
          toast.success('Centered on your GPS location');
        }
      },
      () => {
        toast.warning('GPS permission unavailable. Please set your area.');
        const fallbackLabel = userAreaName || 'Set your area';
        setUserCoords(
          { lat: userCoords.lat || ASANSOL_CENTER.lat, lng: userCoords.lng || ASANSOL_CENTER.lng, isLive: false },
          fallbackLabel
        );
        setMapCenter([userCoords.lat || ASANSOL_CENTER.lat, userCoords.lng || ASANSOL_CENTER.lng]);
      },
      { timeout: 10000 }
    );
  };

  // Select place from search
  const handleSelectSearchedPlace = (place: PlaceSearchResult) => {
    setMapCenter([place.lat, place.lng]);
    setMapZoom(15);
    setActiveItem({ type: 'searched_place', data: place });
    setSearchDropdownOpen(false);
    setSearchQuery('');

    // Save in recent searches
    try {
      const updated = [place.name, ...recentSearches.filter((s) => s !== place.name)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('kindlink_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  // Select request from pin or list
  const handleSelectRequest = (req: HelpRequest) => {
    setActiveItem({ type: 'request', data: req });
    setSelectedRequestId(req.id);
    setActiveRoute(null);
    setTransportTripRoute(null);
    setMapCenter([req.latitude, req.longitude]);
    if (bottomSheetSnap === 'peek') setBottomSheetSnap('half');
  };

  // Select facility from pin or list
  const handleSelectFacility = (fac: MedicalFacility) => {
    setActiveItem({ type: 'facility', data: fac });
    setActiveRoute(null);
    setTransportTripRoute(null);
    setMapCenter([fac.latitude, fac.longitude]);
    if (bottomSheetSnap === 'peek') setBottomSheetSnap('half');
  };

  // Filter requests based on active filter chip and layer toggles
  const filteredRequests = useMemo(() => {
    if (!layers.requests) return [];
    return allMapRequests.filter((req) => {
      if (activeFilterChip === 'all') return true;
      if (activeFilterChip === 'critical') return req.urgency === 'critical';
      if (activeFilterChip === 'food') return req.category.toLowerCase().includes('food');
      if (activeFilterChip === 'shelter') return req.category.toLowerCase().includes('shelter');
      if (activeFilterChip === 'medical') {
        const cat = req.category.toLowerCase();
        return cat.includes('medic') || cat.includes('blood') || cat.includes('hospital');
      }
      return true;
    });
  }, [allMapRequests, layers.requests, activeFilterChip]);

  // Filter facilities based on active filter chip and layer toggles
  const filteredFacilities = useMemo(() => {
    return medicalFacilities.filter((fac) => {
      if (activeFilterChip === 'all') {
        if (fac.type === 'hospital') return layers.hospitals;
        if (fac.type === 'clinic') return layers.clinics ?? layers.hospitals;
        if (fac.type === 'pharmacy') return layers.pharmacies;
        if (fac.type === 'blood_bank') return layers.bloodBanks;
        return true;
      }
      if (activeFilterChip === 'medical') {
        return (fac.type === 'hospital' || fac.type === 'clinic') && (layers.hospitals || layers.clinics);
      }
      if (activeFilterChip === 'pharmacies') {
        return fac.type === 'pharmacy' && layers.pharmacies;
      }
      if (activeFilterChip === 'blood') {
        return fac.type === 'blood_bank' && layers.bloodBanks;
      }
      return false;
    });
  }, [medicalFacilities, layers, activeFilterChip]);

  // Counts for filter chips
  const criticalCount = useMemo(
    () => allMapRequests.filter((r) => r.urgency === 'critical').length,
    [allMapRequests]
  );
  const medicalCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'hospital' || f.type === 'clinic').length,
    [medicalFacilities]
  );
  const pharmacyCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'pharmacy').length,
    [medicalFacilities]
  );
  const bloodCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'blood_bank').length,
    [medicalFacilities]
  );
  const foodCount = useMemo(
    () => allMapRequests.filter((r) => r.category.toLowerCase().includes('food')).length,
    [allMapRequests]
  );
  const shelterCount = useMemo(
    () => allMapRequests.filter((r) => r.category.toLowerCase().includes('shelter')).length,
    [allMapRequests]
  );

  // Toggle layer and save
  const toggleLayer = (key: keyof MapLayersState) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('kindlink_map_layers', JSON.stringify(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  // Change base map mode and save
  const handleSelectBaseMap = (mode: BaseMapMode) => {
    setBaseMapMode(mode);
    try {
      localStorage.setItem('kindlink_map_basemap', mode);
    } catch {
      // Ignore storage error
    }
  };

  // Dismiss tip
  const handleDismissTip = () => {
    setTipDismissed(true);
    try {
      localStorage.setItem('kindlink_map_tip_dismissed', '1');
    } catch {
      // Ignore storage error
    }
  };

  return (
    <div className="relative flex-1 w-full h-[calc(100dvh-4rem)] overflow-hidden flex flex-col md:flex-row bg-slate-100 dark:bg-slate-950">
      {/* =========================================================================
          LEFT SIDE PANEL (Desktop & Tablet >= 768px: 380px wide)
          ========================================================================= */}
      <div className="hidden md:flex flex-col w-[380px] shrink-0 border-r border-border bg-card h-full z-20 shadow-md">
        {/* Panel Header */}
        <div className="p-4 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Nearby Aid &amp; Places</h2>
            <span className="text-xs font-semibold text-muted-foreground">
              {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} ·{' '}
              {filteredFacilities.length} {filteredFacilities.length === 1 ? 'place' : 'places'}
            </span>
          </div>

          {/* Tabs: Requests vs Places */}
          <div className="grid grid-cols-2 p-1 bg-muted rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setBottomSheetTab('requests')}
              className={`py-1.5 rounded-lg transition-all ${
                bottomSheetTab === 'requests'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Requests ({filteredRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setBottomSheetTab('places')}
              className={`py-1.5 rounded-lg transition-all ${
                bottomSheetTab === 'places'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Places ({filteredFacilities.length})
            </button>
          </div>
        </div>

        {/* Panel Content List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {bottomSheetTab === 'requests' ? (
            filteredRequests.length > 0 ? (
              filteredRequests.map((req) => {
                const isSelected = activeItem?.type === 'request' && activeItem.data.id === req.id;
                const isOwner = isRequestOwner(req, userProfile);
                return (
                  <div
                    key={req.id}
                    onClick={() => handleSelectRequest(req)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            req.urgency === 'critical'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : req.urgency === 'high'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                              : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                          }`}
                        >
                          {req.urgency}
                        </span>
                        {isOwner && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                            ★ You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground">
                        {req.distanceKm} km
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-foreground line-clamp-1">{req.title}</h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {req.locationName}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">No requests match this filter</p>
                <p>Try switching filter chips or extending the search radius.</p>
              </div>
            )
          ) : filteredFacilities.length > 0 ? (
            filteredFacilities.map((fac) => {
              const isSelected = activeItem?.type === 'facility' && activeItem.data.id === fac.id;
              return (
                <div
                  key={fac.id}
                  onClick={() => handleSelectFacility(fac)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20'
                      : 'border-border bg-card hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-muted text-foreground">
                      {fac.type.replace('_', ' ')}
                    </span>
                    {fac.emergency && (
                      <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded">
                        24/7 ER
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">{fac.name}</h4>
                  {fac.address && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {fac.address}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No places found in this area</p>
              <p>Turn on healthcare layers or select a different area.</p>
            </div>
          )}
        </div>

        {/* Selected Pin Details in Desktop Left Panel */}
        {activeItem && (
          <div className="p-4 border-t border-border bg-muted/30 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-foreground line-clamp-1">
                  {activeItem.type === 'request'
                    ? activeItem.data.title
                    : activeItem.type === 'facility'
                    ? activeItem.data.name
                    : activeItem.data.name}
                </h4>
                <p className="text-[11px] text-muted-foreground line-clamp-1">
                  {activeItem.type === 'request'
                    ? activeItem.data.locationName
                    : activeItem.type === 'facility'
                    ? activeItem.data.address || 'Medical Facility'
                    : activeItem.data.displayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveItem(null);
                  handleClearRoute();
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                aria-label="Deselect item"
              >
                <X className="w-4 h-4 notranslate" />
              </button>
            </div>

            {/* Travel route summary if active */}
            {activeRoute && (
              <div className="p-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold flex items-center justify-between">
                <span>Route Distance:</span>
                <span className="font-mono font-bold">{activeRoute.formattedText}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCalculateDirections(travelMode)}
                disabled={loadingRoute}
                className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition flex items-center justify-center gap-1.5"
              >
                {loadingRoute ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin notranslate" />
                ) : (
                  <Navigation className="w-3.5 h-3.5 notranslate" />
                )}
                <span>Directions</span>
              </button>

              {activeItem.type === 'request' ? (
                isRequestOwner(activeItem.data, userProfile) ? (
                  <SecondaryButton
                    size="card"
                    variant="outline"
                    onClick={() => setDetailModalOpen(true)}
                  >
                    Manage
                  </SecondaryButton>
                ) : (
                  <PrimaryHelpButton
                    category={activeItem.data.category || 'equipment'}
                    size="card"
                    label="Help"
                    onClick={() => setHelpFlowOpen(true)}
                  />
                )
              ) : activeItem.type === 'facility' && activeItem.data.phone ? (
                <a
                  href={`tel:${activeItem.data.phone.replace(/[^0-9+]/g, '')}`}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 notranslate" />
                  <span>Call</span>
                </a>
              ) : (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${(activeItem.data as any).latitude ?? (activeItem.data as any).lat ?? 0},${(activeItem.data as any).longitude ?? (activeItem.data as any).lng ?? (activeItem.data as any).lon ?? 0}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 notranslate" />
                  <span>Maps</span>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MAP CANVAS CONTAINER (Takes full viewport on mobile, flex-1 on desktop)
          ========================================================================= */}
      <div className="relative flex-1 h-full w-full overflow-hidden">
        {/* LEAFLET INNER MAP */}
        <LeafletInnerMap
          center={mapCenter}
          zoom={mapZoom}
          requests={filteredRequests}
          medicalFacilities={filteredFacilities}
          userProfile={userProfile}
          radiusMeters={radiusKm * 1000}
          selectedRequest={activeItem?.type === 'request' ? activeItem.data : null}
          selectedFacility={activeItem?.type === 'facility' ? activeItem.data : null}
          onSelectRequest={handleSelectRequest}
          onSelectFacility={handleSelectFacility}
          layers={layers}
          activeRoute={activeRoute}
          transportTripRoute={transportTripRoute}
          baseMapMode={baseMapMode}
        />

        {/* =====================================================================
            1. TOP FLOATING SEARCH BAR (48px height, modern Google Maps quality)
            ===================================================================== */}
        <div
          ref={searchContainerRef}
          className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-30 pointer-events-auto"
        >
          <div className="relative flex items-center h-12 w-full bg-card/95 dark:bg-card/95 backdrop-blur-md rounded-2xl border border-border shadow-md px-3.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="w-5 h-5 text-muted-foreground shrink-0 notranslate mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchDropdownOpen(true)}
              placeholder="Search places, addresses, or requests"
              className="w-full bg-transparent text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0 notranslate ml-2" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setSearchDropdownOpen(false);
                }}
                className="p-1 text-muted-foreground hover:text-foreground rounded-full"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4 notranslate" />
              </button>
            ) : null}
          </div>

          {/* Search Dropdown (Suggestions & Recent Searches) */}
          {searchDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-2xl shadow-xl overflow-hidden z-40 max-h-72 overflow-y-auto animate-in fade-in duration-150 p-1.5 space-y-1">
              {/* Live Place Results */}
              {searchResults.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 block">
                    Places &amp; Addresses
                  </span>
                  {searchResults.map((place) => (
                    <button
                      key={place.placeId}
                      type="button"
                      onClick={() => handleSelectSearchedPlace(place)}
                      className="w-full text-left p-2 rounded-xl hover:bg-muted transition flex items-center gap-2.5 text-xs"
                    >
                      <MapPin className="w-4 h-4 text-primary shrink-0 notranslate" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-foreground block truncate">{place.name}</span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {place.displayName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Matching Aid Requests */}
              {matchingRequests.length > 0 && (
                <div className="pt-1 border-t border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 block">
                    Matching Requests
                  </span>
                  {matchingRequests.map((req) => (
                    <button
                      key={req.id}
                      type="button"
                      onClick={() => {
                        handleSelectRequest(req);
                        setSearchDropdownOpen(false);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-2 rounded-xl hover:bg-muted transition flex items-center gap-2.5 text-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-foreground block truncate">{req.title}</span>
                        <span className="text-[11px] text-muted-foreground block truncate">
                          {req.category} · {req.locationName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Searches (when query is empty) */}
              {searchQuery.trim().length === 0 && recentSearches.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1 block">
                    Recent Searches
                  </span>
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setSearchQuery(term)}
                      className="w-full text-left p-2 rounded-xl hover:bg-muted transition flex items-center gap-2.5 text-xs text-foreground"
                    >
                      <History className="w-3.5 h-3.5 text-muted-foreground shrink-0 notranslate" />
                      <span className="truncate">{term}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Empty state when searching with no results */}
              {searchQuery.trim().length >= 2 &&
                !isSearching &&
                searchResults.length === 0 &&
                matchingRequests.length === 0 && (
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No matching places or requests found.
                  </div>
                )}
            </div>
          )}
        </div>

        {/* =====================================================================
            2. FILTER CHIPS ROW (36px, Doubles as Legend with Live Counts)
            ===================================================================== */}
        <div className="absolute top-[68px] left-3 right-16 sm:left-4 sm:right-24 z-20 pointer-events-auto flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {/* All Chip */}
          <button
            type="button"
            onClick={() => setActiveFilterChip('all')}
            className={`h-9 px-3.5 text-xs font-bold rounded-xl border shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              activeFilterChip === 'all'
                ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
                : 'bg-card/90 backdrop-blur-md text-foreground border-border hover:bg-muted'
            }`}
          >
            <Layers className="w-3.5 h-3.5 notranslate" />
            <span>All ({allMapRequests.length + medicalFacilities.length})</span>
          </button>

          {/* Critical Requests Chip */}
          <button
            type="button"
            onClick={() => setActiveFilterChip(activeFilterChip === 'critical' ? 'all' : 'critical')}
            className={`h-9 px-3 text-xs font-bold rounded-xl border shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              activeFilterChip === 'critical'
                ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/20'
                : 'bg-card/90 backdrop-blur-md text-foreground border-border hover:bg-muted'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>Critical ({criticalCount})</span>
          </button>

          {/* Medical Facilities Chip (Hospitals & Clinics) */}
          <button
            type="button"
            onClick={() => setActiveFilterChip(activeFilterChip === 'medical' ? 'all' : 'medical')}
            className={`h-9 px-3 text-xs font-bold rounded-xl border shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              activeFilterChip === 'medical'
                ? 'bg-blue-600 text-white border-blue-700 shadow-blue-600/20'
                : 'bg-card/90 backdrop-blur-md text-foreground border-border hover:bg-muted'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5 text-blue-500 shrink-0 notranslate" />
            <span>Medical ({medicalCount})</span>
          </button>

          {/* Pharmacies Chip */}
          <button
            type="button"
            onClick={() => setActiveFilterChip(activeFilterChip === 'pharmacies' ? 'all' : 'pharmacies')}
            className={`h-9 px-3 text-xs font-bold rounded-xl border shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              activeFilterChip === 'pharmacies'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-600/20'
                : 'bg-card/90 backdrop-blur-md text-foreground border-border hover:bg-muted'
            }`}
          >
            <Pill className="w-3.5 h-3.5 text-emerald-500 shrink-0 notranslate" />
            <span>Pharmacies ({pharmacyCount})</span>
          </button>

          {/* Blood Banks Chip */}
          <button
            type="button"
            onClick={() => setActiveFilterChip(activeFilterChip === 'blood' ? 'all' : 'blood')}
            className={`h-9 px-3 text-xs font-bold rounded-xl border shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              activeFilterChip === 'blood'
                ? 'bg-red-800 text-white border-red-900 shadow-red-800/20'
                : 'bg-card/90 backdrop-blur-md text-foreground border-border hover:bg-muted'
            }`}
          >
            <Droplet className="w-3.5 h-3.5 text-red-600 shrink-0 notranslate" />
            <span>Blood Banks ({bloodCount})</span>
          </button>

          {/* Food & Groceries Chip */}
          <button
            type="button"
            onClick={() => setActiveFilterChip(activeFilterChip === 'food' ? 'all' : 'food')}
            className={`h-9 px-3 text-xs font-bold rounded-xl border shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              activeFilterChip === 'food'
                ? 'bg-amber-600 text-white border-amber-700 shadow-amber-600/20'
                : 'bg-card/90 backdrop-blur-md text-foreground border-border hover:bg-muted'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-amber-500 shrink-0 notranslate" />
            <span>Food ({foodCount})</span>
          </button>

          {/* Shelter Chip */}
          <button
            type="button"
            onClick={() => setActiveFilterChip(activeFilterChip === 'shelter' ? 'all' : 'shelter')}
            className={`h-9 px-3 text-xs font-bold rounded-xl border shadow-xs transition-all whitespace-nowrap flex items-center gap-1.5 touch-target ${
              activeFilterChip === 'shelter'
                ? 'bg-teal-600 text-white border-teal-700 shadow-teal-600/20'
                : 'bg-card/90 backdrop-blur-md text-foreground border-border hover:bg-muted'
            }`}
          >
            <HomeIcon className="w-3.5 h-3.5 text-teal-500 shrink-0 notranslate" />
            <span>Shelter ({shelterCount})</span>
          </button>
        </div>

        {/* =====================================================================
            3. RIGHT-SIDE 44PX ROUND CONTROL GROUP (Below chips, above bottom sheet)
            ===================================================================== */}
        <div className="absolute top-28 right-3 sm:right-4 z-20 flex flex-col items-center gap-2 pointer-events-auto">
          {/* Locate Me (GPS Follow) */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-11 h-11 rounded-full bg-card/95 dark:bg-card/95 backdrop-blur-md border border-border text-foreground shadow-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Locate me (GPS)"
            aria-label="Locate me"
          >
            <Crosshair className="w-5 h-5 text-primary notranslate" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
            className="w-11 h-11 rounded-full bg-card/95 dark:bg-card/95 backdrop-blur-md border border-border text-foreground shadow-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5 notranslate" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.max(8, z - 1))}
            className="w-11 h-11 rounded-full bg-card/95 dark:bg-card/95 backdrop-blur-md border border-border text-foreground shadow-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5 notranslate" />
          </button>

          {/* Reset North / Compass */}
          <button
            type="button"
            onClick={() => {
              setMapCenter([userCoords.lat, userCoords.lng]);
              setMapZoom(14);
              toast.info('Map view reset to your area');
            }}
            className="w-11 h-11 rounded-full bg-card/95 dark:bg-card/95 backdrop-blur-md border border-border text-foreground shadow-md flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Reset North & view"
            aria-label="Reset North"
          >
            <Compass className="w-5 h-5 notranslate" />
          </button>

          {/* Layers Menu Button */}
          <button
            type="button"
            onClick={() => setLayersMenuOpen((open) => !open)}
            className={`w-11 h-11 rounded-full border shadow-md flex items-center justify-center active:scale-95 transition-all touch-target ${
              layersMenuOpen
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card/95 dark:bg-card/95 backdrop-blur-md border-border text-foreground hover:bg-muted'
            }`}
            title="Map Layers & Overlays"
            aria-label="Layers"
            aria-expanded={layersMenuOpen}
          >
            <Layers className="w-5 h-5 notranslate" />
          </button>
        </div>

        {/* =====================================================================
            4. LAYERS MENU (Popover / Sheet)
            ===================================================================== */}
        {layersMenuOpen && (
          <div className="absolute top-28 right-16 z-30 pointer-events-auto w-72 max-w-[calc(100vw-5rem)] rounded-2xl bg-card border border-border shadow-2xl p-4 text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-bold text-sm text-foreground">Map Layers</span>
              <button
                type="button"
                onClick={() => setLayersMenuOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                aria-label="Close layers menu"
              >
                <X className="w-4 h-4 notranslate" />
              </button>
            </div>

            {/* Base Map Options */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Base Map Style
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['auto', 'light', 'dark'] as BaseMapMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleSelectBaseMap(mode)}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition text-left flex items-center justify-between ${
                      baseMapMode === mode
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <span className="capitalize">{mode}</span>
                    {baseMapMode === mode && <Check className="w-3.5 h-3.5 notranslate" />}
                  </button>
                ))}

                {/* Satellite Option (Only if MapTiler Key is available) */}
                {hasMapTilerKey && (
                  <button
                    type="button"
                    onClick={() => handleSelectBaseMap('satellite')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition text-left flex items-center justify-between ${
                      baseMapMode === 'satellite'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <span>Satellite</span>
                    {baseMapMode === 'satellite' && <Check className="w-3.5 h-3.5 notranslate" />}
                  </button>
                )}

                {/* Outdoor Option (Only if MapTiler Key is available) */}
                {hasMapTilerKey && (
                  <button
                    type="button"
                    onClick={() => handleSelectBaseMap('outdoor')}
                    className={`py-1.5 px-2.5 rounded-xl text-xs font-semibold border transition text-left flex items-center justify-between ${
                      baseMapMode === 'outdoor'
                        ? 'bg-primary/10 text-primary border-primary'
                        : 'bg-muted/50 text-foreground border-border hover:bg-muted'
                    }`}
                  >
                    <span>Outdoor</span>
                    {baseMapMode === 'outdoor' && <Check className="w-3.5 h-3.5 notranslate" />}
                  </button>
                )}
              </div>
            </div>

            {/* Overlays Toggles */}
            <div className="space-y-2 pt-2 border-t border-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Overlays
              </span>
              <div className="space-y-1.5">
                {[
                  { key: 'requests', label: 'Aid Requests', count: allMapRequests.length },
                  { key: 'hospitals', label: 'Hospitals', count: medicalCount },
                  { key: 'clinics', label: 'Clinics', count: medicalFacilities.filter((f) => f.type === 'clinic').length },
                  { key: 'pharmacies', label: 'Pharmacies', count: pharmacyCount },
                  { key: 'bloodBanks', label: 'Blood Banks', count: bloodCount },
                ].map(({ key, label, count }) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-muted cursor-pointer"
                  >
                    <span className="text-xs font-medium text-foreground">
                      {label} ({count})
                    </span>
                    <input
                      type="checkbox"
                      checked={layers[key as keyof MapLayersState] ?? true}
                      onChange={() => toggleLayer(key as keyof MapLayersState)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            5. DISMISSIBLE TIP (Shown once, stored in localStorage)
            ===================================================================== */}
        {!tipDismissed && (
          <div className="absolute top-[114px] left-3 right-16 sm:left-4 sm:right-auto sm:max-w-md z-20 pointer-events-auto">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-card/90 backdrop-blur-md border border-border shadow-md text-xs text-foreground animate-in fade-in">
              <span className="truncate">
                💡 Tap any pin to preview details and calculate live road directions.
              </span>
              <button
                type="button"
                onClick={handleDismissTip}
                className="p-1 text-muted-foreground hover:text-foreground shrink-0 rounded-md"
                aria-label="Dismiss tip"
              >
                <X className="w-3.5 h-3.5 notranslate" />
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            6. PLACE SEARCH RESULT CARD (When a place from search is selected)
            ===================================================================== */}
        {activeItem?.type === 'searched_place' && (
          <div className="absolute bottom-24 sm:bottom-6 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-30 pointer-events-auto">
            <div className="bg-card border border-border rounded-2xl p-4 shadow-xl space-y-3 animate-in slide-in-from-bottom">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground line-clamp-1">
                    {activeItem.data.name}
                  </h4>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                    {activeItem.data.displayName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveItem(null)}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg"
                >
                  <X className="w-4 h-4 notranslate" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUserCoords(
                      { lat: activeItem.data.lat, lng: activeItem.data.lng, isLive: false },
                      activeItem.data.name
                    );
                    toast.success(`Location set to ${activeItem.data.name}`);
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition"
                >
                  Set as my location
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCalculateDirections(travelMode, {
                      lat: activeItem.data.lat,
                      lng: activeItem.data.lng,
                    })
                  }
                  className="py-1.5 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition"
                >
                  Directions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            7. MOBILE DRAGGABLE BOTTOM SHEET (Phones only: < 768px)
               Never hidden behind tab bar: positioned above calc(safe-area + 64px)
            ===================================================================== */}
        <div
          className={`md:hidden absolute left-0 right-0 z-30 bg-card border-t border-border shadow-2xl rounded-t-3xl transition-all duration-300 pointer-events-auto flex flex-col ${
            bottomSheetSnap === 'peek'
              ? 'h-[88px] bottom-[calc(env(safe-area-inset-bottom,0px)+64px)]'
              : bottomSheetSnap === 'half'
              ? 'h-[46vh] bottom-[calc(env(safe-area-inset-bottom,0px)+64px)]'
              : 'h-[82vh] bottom-[calc(env(safe-area-inset-bottom,0px)+64px)]'
          }`}
        >
          {/* Drag Handle & Summary Row */}
          <div
            onClick={() =>
              setBottomSheetSnap((snap) =>
                snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek'
              )
            }
            className="w-full pt-2.5 pb-2 px-4 cursor-pointer flex flex-col items-center select-none"
          >
            <div className="w-10 h-1.5 rounded-full bg-muted-foreground/30 mb-2" />
            <div className="w-full flex items-center justify-between text-xs">
              <span className="font-bold text-foreground">
                {filteredRequests.length} {filteredRequests.length === 1 ? 'request' : 'requests'} ·{' '}
                {filteredFacilities.length} {filteredFacilities.length === 1 ? 'place' : 'places'}
              </span>
              <div className="flex items-center gap-1 text-muted-foreground font-semibold">
                <span>{bottomSheetSnap === 'peek' ? 'Swipe up' : 'Swipe down'}</span>
                {bottomSheetSnap === 'peek' ? (
                  <ChevronUp className="w-4 h-4 notranslate" />
                ) : (
                  <ChevronDown className="w-4 h-4 notranslate" />
                )}
              </div>
            </div>
          </div>

          {/* Active Item Preview (Shown inside sheet when an item is selected) */}
          {activeItem && activeItem.type !== 'searched_place' && (
            <div className="px-4 py-2 border-t border-border bg-muted/40 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-foreground line-clamp-1">
                    {activeItem.type === 'request' ? activeItem.data.title : activeItem.data.name}
                  </h4>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">
                    {activeItem.type === 'request'
                      ? activeItem.data.locationName
                      : activeItem.data.address || 'Medical Facility'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveItem(null);
                    handleClearRoute();
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4 notranslate" />
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCalculateDirections(travelMode)}
                  disabled={loadingRoute}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition flex items-center justify-center gap-1.5"
                >
                  {loadingRoute ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin notranslate" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5 notranslate" />
                  )}
                  <span>Directions</span>
                </button>

                {activeItem.type === 'request' ? (
                  isRequestOwner(activeItem.data, userProfile) ? (
                    <SecondaryButton
                      size="card"
                      variant="outline"
                      onClick={() => setDetailModalOpen(true)}
                    >
                      Manage
                    </SecondaryButton>
                  ) : (
                    <PrimaryHelpButton
                      category={activeItem.data.category || 'equipment'}
                      size="card"
                      label="Help"
                      onClick={() => setHelpFlowOpen(true)}
                    />
                  )
                ) : activeItem.type === 'facility' && activeItem.data.phone ? (
                  <a
                    href={`tel:${activeItem.data.phone.replace(/[^0-9+]/g, '')}`}
                    className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1"
                  >
                    <Phone className="w-3.5 h-3.5 notranslate" />
                    <span>Call</span>
                  </a>
                ) : null}
              </div>
            </div>
          )}

          {/* Expanded List View (visible when half or full snap) */}
          {bottomSheetSnap !== 'peek' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Sheet Tabs */}
              <div className="px-4 py-2 border-b border-border">
                <div className="grid grid-cols-2 p-1 bg-muted rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setBottomSheetTab('requests')}
                    className={`py-1 rounded-lg transition-all ${
                      bottomSheetTab === 'requests'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Requests ({filteredRequests.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setBottomSheetTab('places')}
                    className={`py-1 rounded-lg transition-all ${
                      bottomSheetTab === 'places'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground'
                    }`}
                  >
                    Places ({filteredFacilities.length})
                  </button>
                </div>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {bottomSheetTab === 'requests' ? (
                  filteredRequests.map((req) => (
                    <div
                      key={req.id}
                      onClick={() => handleSelectRequest(req)}
                      className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground line-clamp-1">{req.title}</span>
                        <span className="text-[11px] font-semibold text-muted-foreground shrink-0 ml-2">
                          {req.distanceKm} km
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                        {req.locationName}
                      </p>
                    </div>
                  ))
                ) : (
                  filteredFacilities.map((fac) => (
                    <div
                      key={fac.id}
                      onClick={() => handleSelectFacility(fac)}
                      className="p-2.5 rounded-xl border border-border bg-card hover:bg-muted/50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground line-clamp-1">{fac.name}</span>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-muted">
                          {fac.type.replace('_', ' ')}
                        </span>
                      </div>
                      {fac.address && (
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {fac.address}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          FULL DETAIL MODAL (Opens full request sheet)
          ========================================================================= */}
      <RequestDetailModal
        request={activeItem?.type === 'request' ? activeItem.data : null}
        open={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
      />

      {/* =========================================================================
          HELP FLOW MODAL ("I can help")
          ========================================================================= */}
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

export default MapView;
