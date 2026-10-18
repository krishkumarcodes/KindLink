'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Maximize2, ExternalLink, X } from 'lucide-react';
import { MapTileLayer } from './MapTileLayer';
import { UrgencyLevel } from '@/lib/data/types';

export interface RequestRouteMiniMapProps {
  origin: [number, number];
  destination: [number, number];
  routeCoordinates: [number, number][];
  isStraightLine: boolean;
  urgency: UrgencyLevel;
  category?: string;
  destinationLabel: string;
  startLabel?: string;
  className?: string;
}

/**
 * Controller to handle container size invalidation & route bounds fitting.
 * Solves the flat light-grey box bug caused by 0x0 container size when sheets
 * mount or animate in.
 */
function RouteBoundsController({
  origin,
  destination,
  routeCoordinates,
}: {
  origin: [number, number];
  destination: [number, number];
  routeCoordinates: [number, number][];
}) {
  const map = useMap();

  const fitBoundsSafely = useCallback(() => {
    try {
      const points: [number, number][] =
        routeCoordinates && routeCoordinates.length > 1
          ? routeCoordinates
          : [origin, destination];

      const bounds = L.latLngBounds(points);
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [30, 30],
          maxZoom: 15,
          animate: false,
        });
      }
    } catch {
      // Ignore bounds errors
    }
  }, [map, origin, destination, routeCoordinates]);

  useEffect(() => {
    map.invalidateSize();
    fitBoundsSafely();

    // Trigger on multiple animation milestones (50ms, 150ms, 300ms, 600ms)
    const timers = [
      setTimeout(() => {
        map.invalidateSize();
        fitBoundsSafely();
      }, 50),
      setTimeout(() => {
        map.invalidateSize();
        fitBoundsSafely();
      }, 150),
      setTimeout(() => {
        map.invalidateSize();
        fitBoundsSafely();
      }, 300),
      setTimeout(() => {
        map.invalidateSize();
        fitBoundsSafely();
      }, 600),
    ];

    // Watch container resizing via ResizeObserver
    let observer: ResizeObserver | null = null;
    const container = map.getContainer();
    if (typeof ResizeObserver !== 'undefined' && container) {
      observer = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          map.invalidateSize();
          fitBoundsSafely();
        }
      });
      observer.observe(container);
      if (container.parentElement) {
        observer.observe(container.parentElement);
      }
    }

    const handleWindowResize = () => {
      map.invalidateSize();
      fitBoundsSafely();
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      timers.forEach(clearTimeout);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, [map, fitBoundsSafely]);

  return null;
}

/**
 * Start marker (blue dot "You")
 */
function createStartPin() {
  const html = `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #2563EB;
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(37,99,235,0.6);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <div style="width: 7px; height: 7px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'mini-map-pin-you',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

/**
 * Destination marker (pin in category colour)
 */
function createDestPin(color: string, label: string) {
  const html = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      background: ${color};
      border: 2.5px solid #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(0,0,0,0.45);
      cursor: pointer;
      transform: translate(-50%, -50%);
    ">
      <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: `mini-map-pin-dest`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

/**
 * Get category pin color with urgency fallback
 */
function getCategoryPinColor(category?: string, urgency?: UrgencyLevel): string {
  const cat = (category || '').toLowerCase();
  if (cat === 'blood') return '#DC2626'; // Red
  if (cat === 'transport') return '#F59E0B'; // Amber
  if (cat === 'equipment') return '#0D9488'; // Teal
  if (cat === 'elderly') return '#3B82F6'; // Blue
  if (cat === 'books') return '#10B981'; // Emerald

  if (urgency === 'critical') return '#DC2626';
  if (urgency === 'high') return '#EA580C';
  if (urgency === 'medium') return '#D97706';
  return '#0D9488';
}

export default function RequestRouteMiniMap({
  origin,
  destination,
  routeCoordinates,
  isStraightLine,
  urgency,
  category,
  destinationLabel,
  startLabel = 'You',
  className = '',
}: RequestRouteMiniMapProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const destColor = getCategoryPinColor(category, urgency);
  const userIcon = createStartPin();
  const destIcon = createDestPin(destColor, destinationLabel);

  const polylineCoords: [number, number][] =
    routeCoordinates && routeCoordinates.length > 0
      ? routeCoordinates
      : [origin, destination];

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}`;

  // Close full screen on Escape key
  useEffect(() => {
    if (!isFullScreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen]);

  return (
    <>
      <div
        ref={containerRef}
        className={`relative w-full h-44 rounded-2xl overflow-hidden border border-border shadow-xs notranslate bg-muted/20 ${className}`}
      >
        <MapContainer
          center={origin}
          zoom={13}
          scrollWheelZoom={false}
          dragging={true}
          zoomControl={false}
          attributionControl={false}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <MapTileLayer />
          <RouteBoundsController
            origin={origin}
            destination={destination}
            routeCoordinates={polylineCoords}
          />

          {/* Start marker (blue dot "You") */}
          <Marker position={origin} icon={userIcon}>
            <Popup>
              <span className="text-[11px] font-bold">{startLabel}</span>
            </Popup>
          </Marker>

          {/* Destination marker (pin in category colour) */}
          <Marker position={destination} icon={destIcon}>
            <Popup>
              <span className="text-[11px] font-bold">{destinationLabel}</span>
            </Popup>
          </Marker>

          {/* Route line:
              - Road route: bright teal (6px) with subtle dark casing outline (8px) for high contrast on any map style
              - Straight-line estimate: dashed orange
          */}
          {!isStraightLine ? (
            <>
              {/* Subtle outline casing */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#042F2E',
                  weight: 8,
                  opacity: 0.7,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
              {/* Main bright teal route line */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#0D9488',
                  weight: 6,
                  opacity: 0.95,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            </>
          ) : (
            <>
              {/* Subtle casing for straight line */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#431407',
                  weight: 7,
                  opacity: 0.45,
                  dashArray: '8, 8',
                }}
              />
              {/* Dashed orange line for straight-line estimate */}
              <Polyline
                positions={polylineCoords}
                pathOptions={{
                  color: '#F97316',
                  weight: 5,
                  opacity: 0.95,
                  dashArray: '8, 8',
                }}
              />
            </>
          )}
        </MapContainer>

        {/* Top-left: At most one status chip (Solid background, high contrast) */}
        <div className="absolute top-2.5 left-2.5 z-[400] pointer-events-auto">
          {!isStraightLine ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-black/95 text-white border border-white/20 text-[10px] font-bold shadow-md select-none">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Road route</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-black/95 text-amber-300 border border-amber-500/35 text-[10px] font-bold shadow-md select-none">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0 animate-pulse" />
              <span>Backup map</span>
            </div>
          )}
        </div>

        {/* Top-right: Action buttons (Full screen & Open in Google Maps) */}
        <div className="absolute top-2.5 right-2.5 z-[400] flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => setIsFullScreen(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-black/95 hover:bg-slate-800 text-white border border-white/20 text-[10px] font-bold shadow-md transition-all active:scale-95 touch-target select-none"
            title="Expand to full screen"
          >
            <Maximize2 className="h-3 w-3 notranslate" />
            <span className="hidden sm:inline">Full screen</span>
          </button>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-900/95 dark:bg-black/95 hover:bg-slate-800 text-white border border-white/20 text-[10px] font-bold shadow-md transition-all active:scale-95 touch-target select-none"
            title="Open directions in Google Maps"
          >
            <ExternalLink className="h-3 w-3 notranslate" />
            <span>Google Maps</span>
          </a>
        </div>
      </div>

      {/* Full Screen Map Dialog */}
      {isFullScreen && (
        <div className="fixed inset-0 z-80 flex flex-col bg-black/85 backdrop-blur-md p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="w-full h-full max-w-5xl mx-auto rounded-3xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-4 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: destColor }}
                />
                <h3 className="text-sm sm:text-base font-bold text-foreground">
                  Navigation: {destinationLabel}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold transition hover:bg-primary/90"
                >
                  <ExternalLink className="h-3.5 w-3.5 notranslate" />
                  <span>Open in Google Maps</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsFullScreen(false)}
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition"
                  aria-label="Close full screen map"
                >
                  <X className="h-5 w-5 notranslate" />
                </button>
              </div>
            </div>

            {/* Expanded Map View */}
            <div className="relative flex-1 w-full">
              <MapContainer
                center={origin}
                zoom={14}
                scrollWheelZoom={true}
                dragging={true}
                zoomControl={true}
                attributionControl={false}
                className="h-full w-full"
                style={{ height: '100%', width: '100%' }}
              >
                <MapTileLayer />
                <RouteBoundsController
                  origin={origin}
                  destination={destination}
                  routeCoordinates={polylineCoords}
                />

                <Marker position={origin} icon={userIcon}>
                  <Popup>
                    <span className="text-xs font-bold">{startLabel}</span>
                  </Popup>
                </Marker>

                <Marker position={destination} icon={destIcon}>
                  <Popup>
                    <span className="text-xs font-bold">{destinationLabel}</span>
                  </Popup>
                </Marker>

                {!isStraightLine ? (
                  <>
                    <Polyline
                      positions={polylineCoords}
                      pathOptions={{
                        color: '#042F2E',
                        weight: 9,
                        opacity: 0.7,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                    <Polyline
                      positions={polylineCoords}
                      pathOptions={{
                        color: '#0D9488',
                        weight: 6,
                        opacity: 0.95,
                        lineCap: 'round',
                        lineJoin: 'round',
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Polyline
                      positions={polylineCoords}
                      pathOptions={{
                        color: '#431407',
                        weight: 7,
                        opacity: 0.45,
                        dashArray: '8, 8',
                      }}
                    />
                    <Polyline
                      positions={polylineCoords}
                      pathOptions={{
                        color: '#F97316',
                        weight: 5,
                        opacity: 0.95,
                        dashArray: '8, 8',
                      }}
                    />
                  </>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
