'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useKindLinkStore } from '@/lib/store/useKindLinkStore';
import { HelpRequest } from '@/lib/data/types';
import { ASANSOL_CENTER } from '@/lib/data/mock-requests';
import { RequestDetailModal } from '../requests/RequestDetailModal';

// Dynamically import Leaflet map with SSR disabled to prevent window is undefined errors
const LeafletInnerMap = dynamic(() => import('./LeafletInnerMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-card text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <span className="text-xs font-semibold">Loading Live Map...</span>
      </div>
    </div>
  ),
});

export function MapView() {
  const { requests, userCoords, setUserCoords, selectedRequestId, setSelectedRequestId } =
    useKindLinkStore();

  const [activeRequest, setActiveRequest] = useState<HelpRequest | null>(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);

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
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          isLive: true,
        });
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
          center={[userCoords.lat, userCoords.lng]}
          zoom={13}
          requests={requests}
          radiusMeters={radiusKm * 1000}
          selectedRequest={activeRequest}
          onSelectRequest={handleMarkerSelect}
        />

        {/* Floating Top Controls (Search & Locate Me) */}
        <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 bg-card/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-border shadow-soft text-xs font-bold">
            <Compass className="h-4 w-4 text-primary notranslate" />
            <span className="text-foreground">Asansol Volunteer Radar</span>
            <span className="hidden sm:inline text-muted-foreground font-normal">
              ({requests.length} active pins)
            </span>
          </div>

          <button
            onClick={handleLocateMe}
            className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card/90 hover:bg-card border border-border shadow-soft text-xs font-bold text-foreground transition active:scale-95 touch-target"
            title="Locate me using GPS"
          >
            <Crosshair className="h-4 w-4 text-primary notranslate" />
            <span className="hidden sm:inline">Locate Me</span>
          </button>
        </div>

        {/* Floating Bottom Right Legend */}
        <div className="hidden sm:flex absolute bottom-6 right-6 z-20 flex-col gap-1.5 p-3 rounded-2xl bg-card/95 border border-border shadow-soft backdrop-blur-md text-[11px]">
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
