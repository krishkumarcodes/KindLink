'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpRequest } from '@/lib/data/types';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';
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
    setUserCoords,
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

  useEffect(() => {
    setMapCenter([userCoords.lat, userCoords.lng]);
  }, [userCoords.lat, userCoords.lng]);

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
      (pos) => {
        const newCoords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isLive: true,
        };
        setUserCoords(newCoords);
        setMapCenter([newCoords.lat, newCoords.lng]);
        setMapZoom(14);
        toast.success('Location updated via GPS!', {
          description: 'Calculated new distances for all community aid markers.',
        });
      },
      (err) => {
        toast.warning('GPS permission denied or unavailable', {
          description: 'Centering on Asansol Engineering College (23.6889° N, 86.9661° E).',
        });
        setUserCoords({
          lat: ASANSOL_CENTER.lat,
          lng: ASANSOL_CENTER.lng,
          isLive: false,
        });
        setMapCenter([ASANSOL_CENTER.lat, ASANSOL_CENTER.lng]);
      },
      { timeout: 10000 }
    );
  };

  const handleMarkerSelect = (req: HelpRequest) => {
    setActiveRequest(req);
    setSelectedRequestId(req.id);
    setMobileSheetOpen(true);
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
        />

        {/* Floating Top Controls (Search & Locate Me) */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2">
          <div className="pointer-events-auto flex items-center gap-2 bg-card/85 dark:bg-card/75 backdrop-blur-xl px-3.5 py-2 rounded-2xl border border-border shadow-lg text-xs font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500" />
            </span>
            <Compass className="h-4 w-4 text-primary notranslate" />
            <span className="text-foreground">Asansol Volunteer Radar</span>
            <span className="hidden sm:inline text-muted-foreground font-normal">
              ({requests.length} active pins)
            </span>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            <button
              onClick={() => setCurrentView('requests')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card/85 dark:bg-card/75 hover:bg-card border border-border hover:border-teal-500/40 shadow-lg text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 active:scale-95 touch-target backdrop-blur-xl"
              title="Switch to List View"
            >
              <List className="h-4 w-4 text-primary notranslate" />
              <span className="hidden sm:inline">List View</span>
            </button>

            <button
              onClick={handleLocateMe}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card/85 dark:bg-card/75 hover:bg-card border border-border hover:border-teal-500/40 shadow-lg text-xs font-bold text-foreground transition-all hover:-translate-y-0.5 active:scale-95 touch-target backdrop-blur-xl"
              title="Locate me using GPS"
            >
              <Crosshair className="h-4 w-4 text-primary notranslate" />
              <span className="hidden sm:inline">Locate Me</span>
            </button>
          </div>
        </div>

        {/* Floating Right Map Controls (Re-center, Zoom In/Out, Layer / Radius) */}
        <div className="absolute top-16 right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center p-1.5 rounded-2xl bg-card/85 dark:bg-card/75 backdrop-blur-xl border border-border shadow-xl space-y-1">
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
              title="Radar Distance Radius Layer"
            >
              <Layers className="h-4 w-4 notranslate" />
            </button>
          </div>

          {/* Layer Radius Popover */}
          {layerMenuOpen && (
            <div className="pointer-events-auto p-3 rounded-2xl bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-border shadow-2xl space-y-2 text-xs w-44 animate-in fade-in zoom-in-95 duration-150">
              <div className="font-bold text-foreground flex items-center justify-between pb-1 border-b border-border">
                <span>Geofence Radius</span>
                <span className="text-primary font-mono">{radiusKm} km</span>
              </div>
              <div className="space-y-1">
                {[3, 5, 10, 25].map((km) => (
                  <button
                    key={km}
                    onClick={() => {
                      setRadiusKm(km);
                      setLayerMenuOpen(false);
                      toast.success(`Search radius updated to ${km} km`);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl transition flex items-center justify-between ${
                      radiusKm === km
                        ? 'bg-primary/10 text-primary font-bold'
                        : 'hover:bg-muted text-foreground'
                    }`}
                  >
                    <span>{km} km circle</span>
                    {radiusKm === km && <span>✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Floating Bottom Right Legend */}
        <div className="hidden sm:flex absolute bottom-6 right-6 z-20 flex-col gap-1.5 p-3.5 rounded-2xl bg-card/85 dark:bg-card/75 border border-border/80 shadow-xl backdrop-blur-xl text-[11px]">
          <span className="font-bold text-foreground mb-0.5">Urgency Pins</span>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-urgency-critical" />
            <span className="text-muted-foreground">Critical (Blood/Ambulance)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-urgency-high" />
            <span className="text-muted-foreground">High (Wheelchair/Oxygen)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-urgency-medium" />
            <span className="text-muted-foreground">Medium (Elderly/Medicine)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-urgency-low" />
            <span className="text-muted-foreground">Low (Books/Study)</span>
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
                  <span className="text-[11px] font-bold text-primary flex items-center gap-0.5">
                    <Atom className="h-3 w-3 notranslate" />
                    <span>Score {req.helpGravityScore}</span>
                  </span>
                </div>
                <h4 className="text-xs font-bold text-foreground line-clamp-1">{req.title}</h4>
                <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">
                  {req.locationName}
                </p>
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
                <span
                  className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mb-1 ${
                    activeRequest.urgency === 'critical'
                      ? 'bg-urgency-critical/10 text-urgency-critical'
                      : 'bg-primary/10 text-primary'
                  }`}
                >
                  {activeRequest.urgency} • Score {activeRequest.helpGravityScore}
                </span>
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
