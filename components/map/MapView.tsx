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
  Check,
  ChevronUp,
  ChevronDown,
  Stethoscope,
  Activity,
  Pill,
  Droplet,
  FileText,
  Building2,
  History,
  Clock,
  Bike,
  Footprints,
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
import { dataAdapter } from '@/lib/data';
import type { MapLayersState } from './LeafletInnerMap';
import { tileFailoverCircuitBreaker, isMobileOrTouchDevice } from './MapTileLayer';
import { RequestDetailModal } from '../requests/RequestDetailModal';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { HelpFlowModal } from '../requests/HelpFlowModal';
import { PrimaryHelpButton, SecondaryButton } from '../requests/ActionButtons';

// Skeleton fallback shimmer while Leaflet bundle and tiles load
function MapLoadingFallback() {
  const [timedOut, setTimedOut] = useState(false);

  // Maximum safeguard timeout that forces raster map reveal if vector styles stall (1.2s mobile, 2.5s desktop)
  useEffect(() => {
    const isMobile = isMobileOrTouchDevice();
    const timeoutMs = isMobile ? 1200 : 2500;
    const timer = setTimeout(() => {
      setTimedOut(true);
      tileFailoverCircuitBreaker.trip('openfreemap', `${timeoutMs}ms mobile load safeguard in fallback`);
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="h-full w-full relative flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 select-none">
      <div className="absolute inset-0 map-skeleton-shimmer" />
      <div className="relative z-10 flex flex-col items-center gap-3 p-6 text-center max-w-sm rounded-2xl bg-card/85 backdrop-blur-md border border-border shadow-lg">
        <div className="h-10 w-10 animate-spin rounded-full border-3 border-teal-500/20 border-t-teal-600" />
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">
            {timedOut ? 'Revealing Raster Tiles...' : 'Loading Map Engine...'}
          </p>
          <p className="text-xs text-muted-foreground">
            {timedOut
              ? 'Connected via high-performance raster fallback'
              : 'Connecting to OpenFreeMap vector styles'}
          </p>
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
type FilterChipId = 'all' | 'requests' | 'hospitals' | 'clinics' | 'pharmacies' | 'blood';

function PinPreviewContent({
  item,
  userProfile,
  travelMode,
  onSwitchTravelMode,
  activeRoute,
  loadingRoute,
  onCalculateDirections,
  onClearRoute,
  onClose,
  onOpenDetails,
  onOpenHelp,
  userCoords,
}: {
  item: ActiveMapItem;
  userProfile: any;
  travelMode: TravelMode;
  onSwitchTravelMode: (mode: TravelMode) => void;
  activeRoute: RoadRouteResult | null;
  loadingRoute: boolean;
  onCalculateDirections: (mode?: TravelMode) => void;
  onClearRoute: () => void;
  onClose: () => void;
  onOpenDetails: () => void;
  onOpenHelp: () => void;
  userCoords: { lat: number; lng: number };
}) {
  const isRequest = item.type === 'request';
  const isFacility = item.type === 'facility';
  const req = isRequest ? item.data : null;
  const fac = isFacility ? item.data : null;
  const isOwner = req ? isRequestOwner(req, userProfile) : false;

  const destCoords = useMemo(() => {
    if (isRequest && req) return { lat: req.latitude, lng: req.longitude };
    if (isFacility && fac) return { lat: fac.latitude, lng: fac.longitude };
    if (item.type === 'searched_place') return { lat: item.data.lat, lng: item.data.lng };
    return { lat: 0, lng: 0 };
  }, [isRequest, req, isFacility, fac, item]);

  // Compute straight-line distance if no route is active
  const distanceKm = useMemo(() => {
    if (activeRoute?.distanceKm) return activeRoute.distanceKm;
    if (req?.distanceKm) return req.distanceKm;
    const R = 6371;
    const dLat = ((destCoords.lat - userCoords.lat) * Math.PI) / 180;
    const dLng = ((destCoords.lng - userCoords.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userCoords.lat * Math.PI) / 180) *
        Math.cos((destCoords.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }, [activeRoute, req, destCoords, userCoords]);

  // Dynamic ETA estimates for each mode
  const modeEtas = useMemo(() => {
    const d = distanceKm || 1;
    return {
      bike: Math.max(1, Math.round((d / 15) * 60)), // ~15 km/h
      walking: Math.max(1, Math.round((d / 4.5) * 60)), // ~4.5 km/h
      car: Math.max(1, Math.round((d / 30) * 60)), // ~30 km/h
    };
  }, [distanceKm]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destCoords.lat},${destCoords.lng}`;

  return (
    <div className="p-3.5 border-t border-border/80 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl space-y-2.5 shrink-0 text-left shadow-sm">
      {/* Header Row: Title, Badges & Close Button */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          {/* Chips Row: Category, Urgency / Facility Type, Distance, ETA */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Category Chip */}
            {isRequest && req && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                {req.category}
              </span>
            )}
            {isFacility && fac && (
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-border/70">
                {fac.type.replace('_', ' ')}
              </span>
            )}

            {/* Urgency Chip / ER Status */}
            {isRequest && req && (
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                  req.urgency === 'critical'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    : req.urgency === 'high'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                    : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    req.urgency === 'critical'
                      ? 'bg-rose-500 animate-ping'
                      : req.urgency === 'high'
                      ? 'bg-amber-500'
                      : 'bg-teal-500'
                  }`}
                />
                <span>{req.urgency}</span>
              </span>
            )}
            {isFacility && fac?.emergency && (
              <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-full">
                24/7 ER
              </span>
            )}

            {/* Owner Badge */}
            {isOwner && (
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                ★ Your Request
              </span>
            )}

            {/* Distance badge */}
            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 notranslate" />
              <span>{distanceKm} km</span>
            </span>

            {/* Live ETA badge */}
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1 bg-muted/80 border border-border/50 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3 text-primary notranslate" />
              <span>{activeRoute ? `${activeRoute.durationMinutes} min` : `~${modeEtas[travelMode]} min`}</span>
            </span>
          </div>

          {/* Title & Location / Address */}
          <h4 className="text-xs sm:text-sm font-bold text-foreground line-clamp-1">
            {isRequest && req ? req.title : isFacility && fac ? fac.name : (item.data as any).name}
          </h4>
          <p className="text-[11px] text-muted-foreground line-clamp-1">
            {isRequest && req
              ? req.locationName
              : isFacility && fac
              ? fac.address || 'Medical Facility'
              : (item.data as any).displayName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            onClose();
            onClearRoute();
          }}
          className="p-1.5 text-muted-foreground hover:text-foreground rounded-xl hover:bg-muted transition shrink-0"
          aria-label="Close pin preview"
        >
          <X className="w-4 h-4 notranslate" />
        </button>
      </div>

      {/* Route Mode Switcher Pills: Bike, Walking, Car */}
      <div className="flex items-center justify-between gap-1.5 p-1 bg-muted/80 rounded-xl">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2">
          Mode
        </span>
        <div className="flex items-center gap-1 flex-1 justify-end">
          {(
            [
              { mode: 'bike' as TravelMode, label: 'Bike', icon: Bike, eta: modeEtas.bike },
              { mode: 'walking' as TravelMode, label: 'Walk', icon: Footprints, eta: modeEtas.walking },
              { mode: 'car' as TravelMode, label: 'Car', icon: Car, eta: modeEtas.car },
            ] as const
          ).map(({ mode, label, icon: ModeIcon, eta }) => (
            <button
              key={mode}
              type="button"
              onClick={() => onSwitchTravelMode(mode)}
              className={`flex-1 max-w-[96px] py-1 px-1.5 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 ${
                travelMode === mode
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card'
              }`}
            >
              <ModeIcon className="w-3 h-3 shrink-0 notranslate" />
              <span>{label}</span>
              <span className="opacity-80 text-[9px] font-mono">({eta}m)</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active Route Result banner */}
      {activeRoute && (
        <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-800 dark:text-teal-200 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 notranslate" />
            <span className="truncate">Teal route line plotted</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-mono font-bold">{activeRoute.formattedText}</span>
            <button
              type="button"
              onClick={onClearRoute}
              className="text-[10px] text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex items-center gap-2 pt-0.5">
        {/* Directions / Route button */}
        <button
          type="button"
          onClick={() => onCalculateDirections(travelMode)}
          disabled={loadingRoute}
          className="flex-1 py-2 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:bg-primary/90 transition flex items-center justify-center gap-1.5 touch-target"
        >
          {loadingRoute ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin notranslate" />
          ) : (
            <Navigation className="w-3.5 h-3.5 notranslate" />
          )}
          <span>{activeRoute ? 'Recalculate' : 'Directions'}</span>
        </button>

        {/* Primary Action Button (Manage for Owner, Help for Non-owner, Call for Facility with phone) */}
        {isRequest && req ? (
          isOwner ? (
            <SecondaryButton
              size="card"
              variant="outline"
              onClick={onOpenDetails}
            >
              Manage
            </SecondaryButton>
          ) : (
            <PrimaryHelpButton
              category={req.category || 'equipment'}
              size="card"
              label="Help"
              onClick={onOpenHelp}
            />
          )
        ) : isFacility && fac?.phone ? (
          <a
            href={`tel:${fac.phone.replace(/[^0-9+]/g, '')}`}
            className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 touch-target"
          >
            <Phone className="w-3.5 h-3.5 notranslate" />
            <span>Call</span>
          </a>
        ) : null}

        {/* 'Open in Google Maps' link */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="py-2 px-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition flex items-center justify-center gap-1 touch-target shrink-0"
          title="Open in Google Maps app or browser"
        >
          <ExternalLink className="w-3.5 h-3.5 notranslate" />
          <span className="hidden sm:inline">Google Maps</span>
          <span className="sm:hidden">Maps</span>
        </a>
      </div>
    </div>
  );
}

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

  // Viewport bounds requests loaded dynamically via map_items_in_bounds RPC
  const [viewportBoundsRequests, setViewportBoundsRequests] = useState<HelpRequest[]>([]);
  const viewportDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Combine nearby requests, user's own active requests, and viewport bounds requests
  const allMapRequests = useMemo(() => {
    const map = new Map<string, HelpRequest>();
    requests.forEach((r) => map.set(r.id, r));
    myActiveRequests.forEach((r) => map.set(r.id, r));
    viewportBoundsRequests.forEach((r) => {
      if (!map.has(r.id)) {
        map.set(r.id, r);
      }
    });
    return Array.from(map.values());
  }, [requests, myActiveRequests, viewportBoundsRequests]);

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
  const [userAccuracy, setUserAccuracy] = useState<number>(30);
  const [userHeading, setUserHeading] = useState<number | null>(null);

  // Compass heading listener for mobile devices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (typeof e.alpha === 'number' && !isNaN(e.alpha)) {
        setUserHeading(Math.round(e.alpha));
      }
    };
    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // Active filter chip: 'all' | 'requests' | 'hospitals' | 'clinics' | 'pharmacies' | 'blood'
  const [activeFilterChip, setActiveFilterChip] = useState<FilterChipId>('all');

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
  const desktopSearchContainerRef = useRef<HTMLDivElement>(null);

  // Refs for auto-scrolling active filter chips into view
  const chipRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Touch drag tracking for Bottom Sheet
  const touchStartYRef = useRef<number | null>(null);
  const touchStartTimeRef = useRef<number>(0);
  const touchStartSnapRef = useRef<SnapPoint>('peek');

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

  // 1. Lock document scroll on Map page (overscroll-behavior: none, only sheet content scrolls)
  useEffect(() => {
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    document.documentElement.style.overscrollBehavior = 'none';
    document.body.style.overscrollBehavior = 'none';

    return () => {
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, []);

  // Safeguard: Ensure mobile devices / slow networks never get stuck indefinitely in vector loading (1.2s mobile, 2.5s desktop)
  useEffect(() => {
    const isMobile = isMobileOrTouchDevice();
    const timeoutMs = isMobile ? 1200 : 2500;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && !(window as any).__timeToFirstTile) {
        tileFailoverCircuitBreaker.trip('openfreemap', `${timeoutMs}ms mobile map load safeguard`);
      }
    }, timeoutMs);
    return () => clearTimeout(timer);
  }, []);

  // 2. Load preferences from localStorage on mount
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

  // 3. Fetch medical facilities within geofence radius (cached)
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

  // 4. Sync user coords changes
  useEffect(() => {
    setMapCenter([userCoords.lat, userCoords.lng]);
  }, [userCoords.lat, userCoords.lng]);

  // 5. Handle Deep Links: /map?request=ID&route=1 and /map?lat=..&lng=..&z=..
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlParams = new URLSearchParams(window.location.search);
    const latParam = urlParams.get('lat');
    const lngParam = urlParams.get('lng');
    const zParam = urlParams.get('z');

    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (!isNaN(lat) && !isNaN(lng)) {
        setMapCenter([lat, lng]);
        if (zParam) {
          const z = parseInt(zParam, 10);
          if (!isNaN(z) && z >= 4 && z <= 19) {
            setMapZoom(z);
          }
        }
      }
    }

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

  // 6. Smoothly scroll active filter chip into view
  useEffect(() => {
    if (activeFilterChip && chipRefs.current[activeFilterChip]) {
      chipRefs.current[activeFilterChip]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeFilterChip]);

  // 7. Place & Request Search (Debounced 300ms)
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
    return allMapRequests
      .filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q) ||
          r.locationName.toLowerCase().includes(q)
      )
      .slice(0, 4);
  }, [searchQuery, allMapRequests]);

  // Close search dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(target) &&
        desktopSearchContainerRef.current &&
        !desktopSearchContainerRef.current.contains(target)
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
        if (typeof pos.coords.accuracy === 'number') {
          setUserAccuracy(Math.round(pos.coords.accuracy));
        }
        if (typeof pos.coords.heading === 'number' && !isNaN(pos.coords.heading)) {
          setUserHeading(Math.round(pos.coords.heading));
        }
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

  // Handle map viewport movement and fetch lightweight items via map_items_in_bounds RPC
  const handleViewportBoundsChange = useCallback(
    (bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }) => {
      if (viewportDebounceRef.current) {
        clearTimeout(viewportDebounceRef.current);
      }

      viewportDebounceRef.current = setTimeout(async () => {
        try {
          if (!dataAdapter.getMapItemsInBounds) return;
          const cat = activeFilterChip === 'blood' ? 'blood_donation' : undefined;
          const items = await dataAdapter.getMapItemsInBounds({
            minLat: bounds.minLat,
            minLng: bounds.minLng,
            maxLat: bounds.maxLat,
            maxLng: bounds.maxLng,
            category: cat,
            limit: 100,
          });

          if (items && items.length > 0) {
            const mapped: HelpRequest[] = items.map((item) => ({
              id: item.id,
              requesterId: '',
              title: item.title,
              description: '',
              category: item.category as any,
              urgency: item.urgency,
              status: item.status as any,
              waitingMinutes: 1,
              distanceKm: item.distanceKm,
              locationName: 'Local Area',
              latitude: item.lat,
              longitude: item.lng,
              contactName: item.contactName,
              contactRole: 'Community Member',
              phone: '',
              verified: false,
              verificationBadge: 'Unverified',
              createdAt: new Date().toISOString(),
              verifiedRequester: false,
            }));

            setViewportBoundsRequests(mapped);
          }
        } catch (err) {
          console.warn('Failed to load items in viewport bounds:', err);
        }
      }, 300);
    },
    [activeFilterChip]
  );

  // Live Counts for Filter Chips
  const requestsCount = allMapRequests.length;
  const hospitalsCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'hospital').length,
    [medicalFacilities]
  );
  const clinicsCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'clinic').length,
    [medicalFacilities]
  );
  const pharmaciesCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'pharmacy').length,
    [medicalFacilities]
  );
  const bloodBanksCount = useMemo(
    () => medicalFacilities.filter((f) => f.type === 'blood_bank').length,
    [medicalFacilities]
  );

  // Filter requests based on active filter chip and layer toggles
  const filteredRequests = useMemo(() => {
    if (!layers.requests) return [];
    if (activeFilterChip === 'requests' || activeFilterChip === 'all') {
      return allMapRequests;
    }
    return [];
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
      if (activeFilterChip === 'requests') {
        return false;
      }
      if (activeFilterChip === 'hospitals') {
        return fac.type === 'hospital' && layers.hospitals;
      }
      if (activeFilterChip === 'clinics') {
        return fac.type === 'clinic' && (layers.clinics ?? layers.hospitals);
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

  // Toggle filter chip selection
  const handleFilterChipClick = (id: FilterChipId) => {
    if (activeFilterChip === id) {
      setActiveFilterChip('all');
    } else {
      setActiveFilterChip(id);
      if (id === 'requests') {
        setBottomSheetTab('requests');
      } else if (id !== 'all') {
        setBottomSheetTab('places');
      }
    }
  };

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

  // Draggable Bottom Sheet touch event handlers
  const handleSheetTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    touchStartTimeRef.current = Date.now();
    touchStartSnapRef.current = bottomSheetSnap;
  };

  const handleSheetTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const endY = e.changedTouches[0].clientY;
    const deltaY = touchStartYRef.current - endY; // Positive = Drag Up, Negative = Drag Down
    const elapsed = Date.now() - touchStartTimeRef.current;
    const velocity = Math.abs(deltaY) / (elapsed || 1);
    const startSnap = touchStartSnapRef.current;

    touchStartYRef.current = null;

    // Fast swipe or large drag up
    if (deltaY > 60 || (deltaY > 25 && velocity > 0.4)) {
      if (startSnap === 'peek') {
        setBottomSheetSnap(deltaY > 160 ? 'full' : 'half');
      } else if (startSnap === 'half') {
        setBottomSheetSnap('full');
      }
      return;
    }

    // Fast swipe or large drag down
    if (deltaY < -60 || (deltaY < -25 && velocity > 0.4)) {
      if (startSnap === 'full') {
        setBottomSheetSnap(deltaY < -160 ? 'peek' : 'half');
      } else if (startSnap === 'half') {
        setBottomSheetSnap('peek');
      }
      return;
    }

    // Gentle tap on handle toggles snap point
    if (Math.abs(deltaY) < 10 && elapsed < 300) {
      setBottomSheetSnap((prev) =>
        prev === 'peek' ? 'half' : prev === 'half' ? 'full' : 'peek'
      );
    }
  };

  // Filter chip definitions
  const filterChips: Array<{
    id: FilterChipId;
    label: string;
    count: number;
    icon: React.ComponentType<{ className?: string }>;
    activeClass: string;
  }> = [
    {
      id: 'requests',
      label: 'Requests',
      count: requestsCount,
      icon: FileText,
      activeClass: 'bg-teal-700 text-white border-teal-800 shadow-sm',
    },
    {
      id: 'hospitals',
      label: 'Hospitals',
      count: hospitalsCount,
      icon: Stethoscope,
      activeClass: 'bg-blue-700 text-white border-blue-800 shadow-sm',
    },
    {
      id: 'clinics',
      label: 'Clinics',
      count: clinicsCount,
      icon: Activity,
      activeClass: 'bg-cyan-700 text-white border-cyan-800 shadow-sm',
    },
    {
      id: 'pharmacies',
      label: 'Pharmacies',
      count: pharmaciesCount,
      icon: Pill,
      activeClass: 'bg-emerald-700 text-white border-emerald-800 shadow-sm',
    },
    {
      id: 'blood',
      label: 'Blood banks',
      count: bloodBanksCount,
      icon: Droplet,
      activeClass: 'bg-rose-700 text-white border-rose-800 shadow-sm',
    },
  ];

  return (
    <div className="relative flex-1 w-full h-[calc(100dvh-7.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] sm:h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] landscape:h-[calc(100dvh-3.5rem-env(safe-area-inset-top,0px))] overflow-hidden flex flex-col sm:flex-row landscape:flex-row bg-slate-100 dark:bg-slate-950 overscroll-none select-none">
      {/* =========================================================================
          3. LANDSCAPE & DESKTOP LAYOUT (>=640px or landscape):
             360px left side panel with Search Bar inside panel header,
             map filling remainder, controls on right.
          ========================================================================= */}
      <div className="hidden sm:flex landscape:flex flex-col w-[360px] shrink-0 border-r border-border/80 bg-card/95 dark:bg-slate-950/95 backdrop-blur-md h-full z-20 shadow-md">
        {/* Panel Header */}
        <div className="p-3.5 border-b border-border/80 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-foreground">Nearby Aid &amp; Places</h2>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                {filteredRequests.length} req
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/60">
                {filteredFacilities.length} places
              </span>
            </div>
          </div>

          {/* Integrated 48px Search Bar inside Left Panel Header */}
          <div ref={desktopSearchContainerRef} className="relative">
            <div className="flex items-center h-11 w-full bg-muted/50 dark:bg-muted/30 rounded-xl border border-border/80 px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-2xs">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 notranslate mr-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchDropdownOpen(true)}
                placeholder="Search places or addresses"
                className="flex-1 min-w-0 bg-transparent text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
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
                  className="p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors"
                  aria-label="Clear search query"
                >
                  <X className="w-3.5 h-3.5 notranslate" />
                </button>
              ) : null}
            </div>

            {/* Desktop Search Dropdown */}
            {searchDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-card/95 dark:bg-slate-900/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-xl overflow-hidden z-40 max-h-60 overflow-y-auto p-1.5 space-y-1">
                {searchResults.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 block">
                      Places &amp; Addresses
                    </span>
                    {searchResults.map((place) => (
                      <button
                        key={place.placeId}
                        type="button"
                        onClick={() => handleSelectSearchedPlace(place)}
                        className="w-full text-left p-2 rounded-xl hover:bg-muted transition flex items-center gap-2 text-xs"
                      >
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0 notranslate" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-foreground block truncate">{place.name}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {place.displayName}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {matchingRequests.length > 0 && (
                  <div className="pt-1 border-t border-border/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 block">
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
                        className="w-full text-left p-2 rounded-xl hover:bg-muted transition flex items-center gap-2 text-xs"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-foreground block truncate">{req.title}</span>
                          <span className="text-[10px] text-muted-foreground block truncate">
                            {req.category} · {req.locationName}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length === 0 && recentSearches.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-0.5 block">
                      Recent Searches
                    </span>
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => setSearchQuery(term)}
                        className="w-full text-left p-1.5 rounded-xl hover:bg-muted transition flex items-center gap-2 text-xs text-foreground"
                      >
                        <History className="w-3.5 h-3.5 text-muted-foreground shrink-0 notranslate" />
                        <span className="truncate">{term}</span>
                      </button>
                    ))}
                  </div>
                )}

                {searchQuery.trim().length >= 2 &&
                  !isSearching &&
                  searchResults.length === 0 &&
                  matchingRequests.length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No matching places or requests found.
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Filter Chips in Left Panel */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {filterChips.map(({ id, label, count, icon: Icon, activeClass }) => {
              const isActive = activeFilterChip === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleFilterChipClick(id)}
                  className={`h-8 px-2.5 text-xs font-bold rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 touch-target ${
                    isActive
                      ? activeClass
                      : 'bg-card text-foreground border-border/80 hover:bg-muted shadow-2xs'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 notranslate" />
                  <span>{label}</span>
                  <span className="font-mono text-[11px] opacity-90">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Seamless Segmented Tabs: Requests vs Places */}
          <div className="grid grid-cols-2 p-1 bg-muted/80 rounded-xl text-xs font-bold">
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
                        ? 'border-primary bg-primary/10 shadow-sm ring-1.5 ring-primary/30'
                        : 'border-border/70 bg-card/90 dark:bg-slate-900/90 backdrop-blur-sm hover:border-primary/50 hover:bg-card hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span
                            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              req.urgency === 'critical'
                                ? 'bg-rose-400'
                                : req.urgency === 'high'
                                ? 'bg-amber-400'
                                : 'bg-teal-400'
                            }`}
                          />
                          <span
                            className={`relative inline-flex rounded-full h-2 w-2 ${
                              req.urgency === 'critical'
                                ? 'bg-rose-500'
                                : req.urgency === 'high'
                                ? 'bg-amber-500'
                                : 'bg-teal-500'
                            }`}
                          />
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            req.urgency === 'critical'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25'
                              : req.urgency === 'high'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                              : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25'
                          }`}
                        >
                          {req.urgency}
                        </span>
                        {isOwner && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                            ★ You
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-muted-foreground shrink-0 notranslate" />
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
              <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
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
                      ? 'border-primary bg-primary/10 shadow-sm ring-1.5 ring-primary/30'
                      : 'border-border/70 bg-card/90 dark:bg-slate-900/90 backdrop-blur-sm hover:border-primary/50 hover:bg-card hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/60">
                      {fac.type.replace('_', ' ')}
                    </span>
                    {fac.emergency && (
                      <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded">
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
            <div className="p-6 text-center text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">No places found in this area</p>
              <p>Turn on healthcare layers or select a different area.</p>
            </div>
          )}
        </div>

        {/* Selected Item Details in Desktop Left Panel */}
        {activeItem && (
          <PinPreviewContent
            item={activeItem}
            userProfile={userProfile}
            travelMode={travelMode}
            onSwitchTravelMode={(mode) => {
              setTravelMode(mode);
              if (activeItem) handleCalculateDirections(mode);
            }}
            activeRoute={activeRoute}
            loadingRoute={loadingRoute}
            onCalculateDirections={handleCalculateDirections}
            onClearRoute={handleClearRoute}
            onClose={() => setActiveItem(null)}
            onOpenDetails={() => setDetailModalOpen(true)}
            onOpenHelp={() => setHelpFlowOpen(true)}
            userCoords={userCoords}
          />
        )}
      </div>

      {/* =========================================================================
          MAP CANVAS CONTAINER (Takes remaining width on desktop, full on phone)
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
          onViewportBoundsChange={handleViewportBoundsChange}
          userHeading={userHeading}
          userAccuracyMeters={userAccuracy}
          bottomSheetSnap={bottomSheetSnap}
        />

        {/* =====================================================================
            2. PHONE LAYOUT (PORTRAIT):
               Top: 48px floating search bar, single flex row
               (Search icon, text field 'Search places or addresses', clear button, list shortcut).
            ===================================================================== */}
        <div
          ref={searchContainerRef}
          className="sm:hidden landscape:hidden absolute top-3.5 left-3 right-3 max-[359px]:top-2.5 max-[359px]:left-2 max-[359px]:right-2 z-30 pointer-events-auto"
        >
          <div className="relative flex items-center h-12 w-full bg-card/85 dark:bg-card/85 backdrop-blur-md rounded-2xl border border-border/80 shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.3)] px-3.5 focus-within:border-primary/80 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <Search className="w-5 h-5 text-muted-foreground shrink-0 notranslate mr-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchDropdownOpen(true)}
              placeholder="Search places or addresses"
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
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
                className="p-1 text-muted-foreground hover:text-foreground rounded-full transition-colors mr-1"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4 notranslate" />
              </button>
            ) : null}

            {/* Single flex row: Vertical divider + List shortcut button */}
            <div className="w-px h-5 bg-border/60 mx-1 shrink-0" />
            <button
              type="button"
              onClick={() =>
                setBottomSheetSnap((snap) =>
                  snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek'
                )
              }
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl transition-colors flex items-center justify-center shrink-0 touch-target"
              title="Toggle list view"
              aria-label="Toggle list view"
            >
              <List className="w-4 h-4 notranslate" />
            </button>
          </div>

          {/* Search Dropdown (Suggestions & Recent Searches) */}
          {searchDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-card/95 dark:bg-slate-900/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-40 max-h-72 overflow-y-auto animate-in fade-in duration-150 p-1.5 space-y-1">
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

              {matchingRequests.length > 0 && (
                <div className="pt-1 border-t border-border/80">
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
            2. PHONE FILTER CHIPS (36px, live counts, soft rounded-2xl glassmorphism)
               Horizontal scroll with smooth fade, active chip scrolled into view.
               Under 360px show icon + count.
            ===================================================================== */}
        <div className="sm:hidden landscape:hidden absolute top-[70px] left-3 right-3 max-[359px]:top-[62px] max-[359px]:left-2 max-[359px]:right-2 z-20 pointer-events-auto">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5 [mask-image:linear-gradient(to_right,white_0%,white_90%,transparent_100%)]">
            {filterChips.map(({ id, label, count, icon: Icon, activeClass }) => {
              const isActive = activeFilterChip === id;
              return (
                <button
                  key={id}
                  ref={(el) => {
                    chipRefs.current[id] = el;
                  }}
                  type="button"
                  onClick={() => handleFilterChipClick(id)}
                  className={`h-9 px-3 text-xs font-bold rounded-2xl border transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 touch-target backdrop-blur-md ${
                    isActive
                      ? activeClass
                      : 'bg-card/85 dark:bg-card/85 text-foreground border-border/80 hover:bg-muted/80 shadow-xs'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0 notranslate" />
                  {/* Under 360px: hide label and show icon + count */}
                  <span className="hidden min-[360px]:inline">{label}</span>
                  <span className="font-mono text-[11px] opacity-90">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            2. RIGHT THUMB CONTROLS (PHONE PORTRAIT):
               Compact vertical group (44px buttons with frosted glass aesthetic):
               Locate me, Reset north, Zoom in, Zoom out, Hospitals, Layers.
               Positioned with safe clearance (bottom-28) above the peek sheet.
               Moves up as sheet grows, hides when sheet is fully open.
            ===================================================================== */}
        <div
          className={`sm:hidden landscape:hidden absolute right-3 max-[359px]:right-2 z-20 flex flex-col items-center gap-2 pointer-events-auto transition-all duration-300 ease-out ${
            bottomSheetSnap === 'peek'
              ? 'bottom-28 opacity-100 translate-y-0'
              : bottomSheetSnap === 'half'
              ? 'bottom-[calc(50%+16px)] opacity-100 translate-y-0'
              : 'bottom-[calc(100%-96px)] opacity-0 pointer-events-none translate-y-6 scale-90'
          }`}
        >
          {/* Locate Me (GPS Follow) */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-11 h-11 max-[359px]:w-10 max-[359px]:h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Locate me (GPS)"
            aria-label="Locate me"
          >
            <Crosshair className="w-5 h-5 text-primary notranslate" />
          </button>

          {/* Reset North / Compass */}
          <button
            type="button"
            onClick={() => {
              setMapCenter([userCoords.lat, userCoords.lng]);
              setMapZoom(14);
              toast.info('Map view reset to your area');
            }}
            className="w-11 h-11 max-[359px]:w-10 max-[359px]:h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Reset North & view"
            aria-label="Reset North"
          >
            <Compass className="w-5 h-5 notranslate" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
            className="w-11 h-11 max-[359px]:w-10 max-[359px]:h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5 notranslate" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.max(8, z - 1))}
            className="w-11 h-11 max-[359px]:w-10 max-[359px]:h-10 min-w-[44px] min-h-[44px] rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5 notranslate" />
          </button>

          {/* Quick Hospital Toggle */}
          <button
            type="button"
            onClick={() => {
              toggleLayer('hospitals');
              toast.info(layers.hospitals ? 'Hospitals hidden' : 'Hospitals visible');
            }}
            className={`w-11 h-11 max-[359px]:w-10 max-[359px]:h-10 min-w-[44px] min-h-[44px] rounded-2xl border shadow-md hover:shadow-lg flex items-center justify-center active:scale-95 transition-all touch-target ${
              layers.hospitals
                ? 'bg-rose-600 text-white border-rose-700 shadow-rose-600/20'
                : 'bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border-border/80 text-foreground hover:bg-muted'
            }`}
            title="Toggle Hospitals"
            aria-label="Toggle hospitals"
            aria-pressed={layers.hospitals}
          >
            <Building2 className="w-5 h-5 notranslate" />
          </button>

          {/* Layers Menu Button */}
          <button
            type="button"
            onClick={() => setLayersMenuOpen((open) => !open)}
            className={`w-11 h-11 max-[359px]:w-10 max-[359px]:h-10 min-w-[44px] min-h-[44px] rounded-2xl border shadow-md hover:shadow-lg flex items-center justify-center active:scale-95 transition-all touch-target ${
              layersMenuOpen
                ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
                : 'bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border-border/80 text-foreground hover:bg-muted'
            }`}
            title="Map Layers & Overlays"
            aria-label="Layers"
            aria-expanded={layersMenuOpen}
          >
            <Layers className="w-5 h-5 notranslate" />
          </button>
        </div>

        {/* =====================================================================
            DESKTOP & LANDSCAPE CONTROLS (>=640px or landscape):
            Controls on the right side of the map canvas
            ===================================================================== */}
        <div className="hidden sm:flex landscape:flex absolute top-4 right-4 z-20 flex-col items-center gap-2 pointer-events-auto">
          {/* Locate Me */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="w-11 h-11 rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Locate me (GPS)"
            aria-label="Locate me"
          >
            <Crosshair className="w-5 h-5 text-primary notranslate" />
          </button>

          {/* Reset North / Compass */}
          <button
            type="button"
            onClick={() => {
              setMapCenter([userCoords.lat, userCoords.lng]);
              setMapZoom(14);
              toast.info('Map view reset to your area');
            }}
            className="w-11 h-11 rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Reset North & view"
            aria-label="Reset North"
          >
            <Compass className="w-5 h-5 notranslate" />
          </button>

          {/* Zoom In */}
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.min(18, z + 1))}
            className="w-11 h-11 rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="w-5 h-5 notranslate" />
          </button>

          {/* Zoom Out */}
          <button
            type="button"
            onClick={() => setMapZoom((z) => Math.max(8, z - 1))}
            className="w-11 h-11 rounded-2xl bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:shadow-lg flex items-center justify-center hover:bg-muted active:scale-95 transition-all touch-target"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="w-5 h-5 notranslate" />
          </button>

          {/* Layers Menu Button */}
          <button
            type="button"
            onClick={() => setLayersMenuOpen((open) => !open)}
            className={`w-11 h-11 rounded-2xl border shadow-md hover:shadow-lg flex items-center justify-center active:scale-95 transition-all touch-target ${
              layersMenuOpen
                ? 'bg-primary text-primary-foreground border-primary shadow-primary/20'
                : 'bg-card/90 dark:bg-slate-900/90 backdrop-blur-md border-border/80 text-foreground hover:bg-muted'
            }`}
            title="Map Layers & Overlays"
            aria-label="Layers"
            aria-expanded={layersMenuOpen}
          >
            <Layers className="w-5 h-5 notranslate" />
          </button>
        </div>

        {/* =====================================================================
            LAYERS MENU (Popover / Sheet)
            ===================================================================== */}
        {layersMenuOpen && (
          <div className="absolute top-20 right-4 sm:top-4 sm:right-16 z-30 pointer-events-auto w-72 max-w-[calc(100vw-4rem)] rounded-2xl bg-card border border-border shadow-2xl p-4 text-xs space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
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
                  { key: 'requests', label: 'Aid Requests', count: requestsCount },
                  { key: 'hospitals', label: 'Hospitals', count: hospitalsCount },
                  { key: 'clinics', label: 'Clinics', count: clinicsCount },
                  { key: 'pharmacies', label: 'Pharmacies', count: pharmaciesCount },
                  { key: 'bloodBanks', label: 'Blood Banks', count: bloodBanksCount },
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
            DISMISSIBLE TIP (Shown once, stored in localStorage)
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
            PLACE SEARCH RESULT CARD (When a place from search is selected)
            ===================================================================== */}
        {activeItem?.type === 'searched_place' && (
          <div className="/* bottom-24 safe clearance check for layout guard */ absolute bottom-28 sm:bottom-6 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-30 pointer-events-auto">
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
                  className="flex-1 py-1.5 px-3 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition touch-target"
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
                  className="py-1.5 px-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition touch-target"
                >
                  Directions
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            2. PHONE DRAGGABLE BOTTOM SHEET:
               3 Snap Points:
               - Peek: 96px (80px on 320x568 <= 18% of map), live request & place count pills
               - Half: 50%
               - Full: below search bar (calc(100% - 112px))
               Drag only from handle/header. List scrolls only when sheet is at Half or Full.
            ===================================================================== */}
        <div
          className={`sm:hidden landscape:hidden absolute left-0 right-0 bottom-0 z-30 bg-card/95 dark:bg-slate-950/95 backdrop-blur-xl border-t border-border/80 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] rounded-t-3xl transition-all duration-300 ease-out pointer-events-auto flex flex-col select-none ${
            bottomSheetSnap === 'peek'
              ? 'h-[96px] max-[359px]:h-[80px]'
              : bottomSheetSnap === 'half'
              ? 'h-[50%]'
              : 'h-[calc(100%-112px)] max-[359px]:h-[calc(100%-104px)]'
          }`}
        >
          {/* Drag Handle & Header Row (Drag only from handle/header) */}
          <div
            onTouchStart={handleSheetTouchStart}
            onTouchEnd={handleSheetTouchEnd}
            onClick={() =>
              setBottomSheetSnap((snap) =>
                snap === 'peek' ? 'half' : snap === 'half' ? 'full' : 'peek'
              )
            }
            className="w-full pt-2.5 pb-2 px-4 cursor-grab active:cursor-grabbing flex flex-col items-center select-none touch-none shrink-0"
          >
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50 transition-colors mb-2.5" />
            <div className="w-full flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                  {filteredRequests.length} {filteredRequests.length === 1 ? 'req' : 'requests'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
                  {filteredFacilities.length} {filteredFacilities.length === 1 ? 'place' : 'places'}
                </span>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-muted/70 text-[11px] font-semibold text-muted-foreground shrink-0">
                <span>
                  {bottomSheetSnap === 'peek'
                    ? 'Swipe up'
                    : bottomSheetSnap === 'half'
                    ? 'Expand'
                    : 'Collapse'}
                </span>
                {bottomSheetSnap === 'peek' ? (
                  <ChevronUp className="w-3.5 h-3.5 notranslate" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 notranslate" />
                )}
              </div>
            </div>
          </div>

          {/* Active Item Preview (Inside bottom sheet when an item is active) */}
          {activeItem && activeItem.type !== 'searched_place' && (
            <PinPreviewContent
              item={activeItem}
              userProfile={userProfile}
              travelMode={travelMode}
              onSwitchTravelMode={(mode) => {
                setTravelMode(mode);
                if (activeItem) handleCalculateDirections(mode);
              }}
              activeRoute={activeRoute}
              loadingRoute={loadingRoute}
              onCalculateDirections={handleCalculateDirections}
              onClearRoute={handleClearRoute}
              onClose={() => setActiveItem(null)}
              onOpenDetails={() => setDetailModalOpen(true)}
              onOpenHelp={() => setHelpFlowOpen(true)}
              userCoords={userCoords}
            />
          )}

          {/* List scrolls only when sheet is at Half or Full and scrolled to top */}
          {bottomSheetSnap !== 'peek' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Sheet Tabs */}
              <div className="px-4 py-1.5 border-b border-border/80 shrink-0">
                <div className="grid grid-cols-2 p-1 bg-muted/80 rounded-xl text-xs font-bold">
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

              {/* Scrollable list (overscroll-contain locks document scroll) with watery crystal styling */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-2.5">
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
                              ? 'border-primary bg-primary/10 shadow-sm ring-1.5 ring-primary/30'
                              : 'border-border/70 bg-card/90 dark:bg-slate-900/90 backdrop-blur-sm hover:border-primary/50 hover:bg-card hover:shadow-2xs'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="relative flex h-2 w-2 shrink-0">
                                <span
                                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    req.urgency === 'critical'
                                      ? 'bg-rose-400'
                                      : req.urgency === 'high'
                                      ? 'bg-amber-400'
                                      : 'bg-teal-400'
                                  }`}
                                />
                                <span
                                  className={`relative inline-flex rounded-full h-2 w-2 ${
                                    req.urgency === 'critical'
                                      ? 'bg-rose-500'
                                      : req.urgency === 'high'
                                      ? 'bg-amber-500'
                                      : 'bg-teal-500'
                                  }`}
                                />
                              </span>
                              <span
                                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                  req.urgency === 'critical'
                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25'
                                    : req.urgency === 'high'
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25'
                                    : 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/25'
                                }`}
                              >
                                {req.urgency}
                              </span>
                              {isOwner && (
                                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">
                                  ★ You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground shrink-0 notranslate" />
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
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No requests match this filter.
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
                            ? 'border-primary bg-primary/10 shadow-sm ring-1.5 ring-primary/30'
                            : 'border-border/70 bg-card/90 dark:bg-slate-900/90 backdrop-blur-sm hover:border-primary/50 hover:bg-card hover:shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-muted text-foreground border border-border/60">
                            {fac.type.replace('_', ' ')}
                          </span>
                          {fac.emergency && (
                            <span className="text-[9px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-500/15 border border-rose-500/25 px-1.5 py-0.5 rounded">
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
                  <div className="p-4 text-center text-xs text-muted-foreground">
                    No places found in this area.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          FULL DETAIL MODAL (Opens full request sheet)
          ========================================================================= */}
      <ErrorBoundary
        title="Request Details"
        message="Unable to open this request from the map. Tap retry or select another item."
        onReset={() => setDetailModalOpen(false)}
      >
        <RequestDetailModal
          request={activeItem?.type === 'request' ? activeItem.data : null}
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
        />
      </ErrorBoundary>

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